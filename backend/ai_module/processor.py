import asyncio
import io
import os
import re
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from typing import List, Optional

# ── Model state ──────────────────────────────────────────────────────────────
_embed_model = None
_model_ready = False
_model_loading = False
_model_lock = asyncio.Lock()
_thread_pool = ThreadPoolExecutor(max_workers=2)

SKILL_KEYWORDS = [
    "python", "java", "javascript", "typescript", "react", "angular", "vue",
    "node", "nodejs", "fastapi", "django", "flask", "sql", "mongodb", "postgresql",
    "mysql", "redis", "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "git", "ci/cd", "devops", "linux", "rest", "graphql", "microservices",
    "machine learning", "deep learning", "nlp", "tensorflow", "pytorch", "pandas",
    "numpy", "scikit-learn", "data analysis", "power bi", "tableau", "excel",
    "leadership", "communication", "agile", "scrum", "jira", "project management",
    "recruiting", "hris", "ats", "payroll", "hr", "analytics", "cloud",
]

# ── Text extraction ───────────────────────────────────────────────────────────

def extract_text_from_resume(file_bytes: bytes, filename: str) -> str:
    name = (filename or "").lower()
    try:
        if name.endswith(".pdf"):
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        if name.endswith(".docx"):
            import docx
            document = docx.Document(io.BytesIO(file_bytes))
            return "\n".join(p.text for p in document.paragraphs)
    except Exception as exc:
        print(f"[AI] Text extraction warning for {filename}: {exc}")
    return file_bytes.decode("utf-8", errors="ignore")


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


# ── NLP (spaCy) ───────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_nlp():
    try:
        import spacy
        return spacy.load("en_core_web_sm", disable=["textcat", "parser"])
    except Exception:
        try:
            import spacy
            return spacy.blank("en")
        except Exception:
            return None


# ── Skill extraction ──────────────────────────────────────────────────────────

def extract_skills(text: str) -> List[str]:
    normalized = normalize_text(text)
    found = {skill for skill in SKILL_KEYWORDS if skill in normalized}

    nlp = get_nlp()
    if nlp:
        try:
            doc = nlp(text[:5000] or "")
            for ent in doc.ents:
                if ent.label_ in {"ORG", "PRODUCT", "SKILL"}:
                    found.add(ent.text.lower().strip())
        except Exception:
            pass

    return sorted(found)[:16]


# ── Summarization (fast, no TF-IDF) ──────────────────────────────────────────

def summarize_text(text: str, sentence_count: int = 3) -> str:
    """Fast extractive summary — picks first N meaningful sentences."""
    if not text:
        return ""
    # Split on sentence boundaries
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 30]
    if not sentences:
        sentences = [line.strip() for line in text.splitlines() if len(line.strip()) > 30]
    return " ".join(sentences[:sentence_count])


# ── Embedding model (lazy, background-loaded) ─────────────────────────────────

def _load_model_sync() -> Optional[object]:
    """Runs in a thread. Tries local cache first, then download."""
    model_name = os.getenv("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2")
    try:
        from sentence_transformers import SentenceTransformer
        # Try local cache first (fast, no network)
        try:
            model = SentenceTransformer(model_name, local_files_only=True)
            print(f"[AI] SentenceTransformer loaded from local cache: {model_name}")
            return model
        except Exception:
            pass
        # Fall back to download only if explicitly allowed
        if os.getenv("AI_ALLOW_DOWNLOAD", "true").lower() == "true":
            model = SentenceTransformer(model_name, local_files_only=False)
            print(f"[AI] SentenceTransformer downloaded: {model_name}")
            return model
    except Exception as exc:
        print(f"[AI] SentenceTransformer unavailable, using lexical scoring: {exc}")
    return None


async def preload_embedding_model():
    """Call this at startup — loads model in background, doesn't block."""
    global _embed_model, _model_ready, _model_loading
    if _model_ready or _model_loading:
        return
    _model_loading = True
    loop = asyncio.get_event_loop()
    try:
        model = await loop.run_in_executor(_thread_pool, _load_model_sync)
        _embed_model = model
        _model_ready = True
    except Exception as exc:
        print(f"[AI] Model preload failed: {exc}")
        _model_ready = True  # mark done so we don't retry on every request
    finally:
        _model_loading = False


async def get_embedding_model():
    """Returns model if ready, None if not (never blocks a request)."""
    global _embed_model, _model_ready, _model_loading
    if _model_ready:
        return _embed_model
    # If still loading, wait up to 3 seconds then fall back to lexical
    if _model_loading:
        for _ in range(6):
            await asyncio.sleep(0.5)
            if _model_ready:
                return _embed_model
    return None


# ── Scoring ───────────────────────────────────────────────────────────────────

def lexical_match_score(jd: str, resume_text: str) -> float:
    jd_terms = set(re.findall(r"[a-zA-Z][a-zA-Z+#.\-]{2,}", normalize_text(jd)))
    resume_terms = set(re.findall(r"[a-zA-Z][a-zA-Z+#.\-]{2,}", normalize_text(resume_text)))
    if not jd_terms or not resume_terms:
        return 0.0
    overlap = len(jd_terms & resume_terms)
    return round(min(100.0, (overlap / len(jd_terms)) * 100), 2)


async def calculate_match_score(jd: str, resume_text: str) -> float:
    model = await get_embedding_model()
    if not model:
        return lexical_match_score(jd, resume_text)

    try:
        from sentence_transformers import util
        loop = asyncio.get_event_loop()

        # Encode both in parallel using thread pool
        jd_trimmed = jd[:2000]
        resume_trimmed = resume_text[:4000]

        jd_vec, resume_vec = await asyncio.gather(
            loop.run_in_executor(_thread_pool, lambda: model.encode(jd_trimmed, convert_to_tensor=True)),
            loop.run_in_executor(_thread_pool, lambda: model.encode(resume_trimmed, convert_to_tensor=True)),
        )
        similarity = util.cos_sim(jd_vec, resume_vec).item()
        return round(max(min(float(similarity), 1.0), 0.0) * 100, 2)
    except Exception as exc:
        print(f"[AI] Semantic scoring failed, using lexical: {exc}")
        return lexical_match_score(jd, resume_text)


# ── Keyword extraction ────────────────────────────────────────────────────────

def extract_keywords(text: str) -> List[str]:
    terms = re.findall(r"[a-zA-Z][a-zA-Z+#.\-]{2,}", normalize_text(text))
    stop_words = {
        "and", "the", "with", "for", "from", "that", "this", "will", "are", "you",
        "our", "your", "have", "has", "experience", "candidate", "role", "work",
        "able", "must", "good", "strong", "team", "also", "well", "etc",
    }
    counts: dict = {}
    for term in terms:
        if term not in stop_words and len(term) > 2:
            counts[term] = counts.get(term, 0) + 1
    return [t for t, _ in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:24]]


def extract_contact_details(text: str) -> dict:
    email = re.search(r"[\w.\-]+@[\w.\-]+\.\w+", text or "")
    phone = re.search(r"(\+?\d[\d\s().\-]{7,}\d)", text or "")
    links = re.findall(r"https?://[^\s)]+|(?:linkedin|github)\.com/[^\s)]+", text or "", flags=re.IGNORECASE)
    return {
        "email": email.group(0) if email else "",
        "phone": phone.group(0) if phone else "",
        "links": links[:4],
    }


def extract_name_from_text(text: str) -> str:
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    for line in lines[:10]:
        lower = line.lower()
        if any(keyword in lower for keyword in ["resume", "experience", "education", "skills", "summary", "profile", "contact", "linkedin", "github"]):
            continue
        if re.search(r"[A-Z][a-z]+", line) and len(line.split()) <= 5 and "@" not in line and not re.search(r"\d", line):
            return line.strip()
    return ""


def extract_location(text: str) -> str:
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    for line in lines[:15]:
        if re.search(r"\b(location|based in|city|state|country|remote)\b", line, flags=re.IGNORECASE):
            cleaned = re.sub(r".*?(location|based in)[:\-]?\s*", "", line, flags=re.IGNORECASE).strip()
            if cleaned:
                return cleaned[:80]
    matches = re.findall(r"\b([A-Z][a-z]+(?:[,\-\s]+[A-Z][a-z]+){0,2})\b", text or "")
    for candidate in matches:
        if any(keyword.lower() in candidate.lower() for keyword in ["city", "state", "county", "district"]):
            return candidate.strip()
    return ""


def extract_languages(text: str) -> List[str]:
    language_terms = [
        "English", "Spanish", "French", "German", "Hindi", "Mandarin", "Japanese",
        "Korean", "Arabic", "Portuguese", "Russian", "Italian", "Urdu", "Tamil", "Telugu",
        "Gujarati", "Bengali", "Malay", "Vietnamese", "Turkish", "Hebrew",
    ]
    normalized = normalize_text(text)
    found = [term for term in language_terms if re.search(rf"\b{re.escape(term.lower())}\b", normalized)]
    return sorted(found)[:8]


def extract_section_lines(text: str, section_names: List[str], max_items: int = 5) -> List[str]:
    lines = [line.strip(" -\t") for line in (text or "").splitlines() if line.strip()]
    normalized_sections = [n.lower() for n in section_names]
    collected, capture = [], False
    stop_headers = {
        "experience", "work experience", "employment", "education", "skills",
        "projects", "certifications", "achievements", "awards", "summary",
    }
    for line in lines:
        lowered = line.lower().strip(":")
        if any(n in lowered for n in normalized_sections):
            capture = True
            continue
        if capture and lowered in stop_headers and not any(n in lowered for n in normalized_sections):
            break
        if capture and len(line) > 2:
            collected.append(line[:180])
        if len(collected) >= max_items:
            break
    return collected


def extract_structured_resume(text: str) -> dict:
    normalized = normalize_text(text)
    years = re.findall(r"\b(?:19|20)\d{2}\b", text or "")
    exp_years = re.findall(r"(\d+)\+?\s*(?:years|yrs)", normalized)
    achievements = [
        line.strip(" -\t")[:180]
        for line in (text or "").splitlines()
        if re.search(r"\b(increased|reduced|improved|led|launched|delivered|saved|grew|built|managed)\b", line, re.IGNORECASE)
    ][:5]
    return {
        "name": extract_name_from_text(text),
        "location": extract_location(text),
        "languages": extract_languages(text),
        "contact": extract_contact_details(text),
        "education": extract_section_lines(text, ["education", "degree", "university"], 5),
        "certifications": extract_section_lines(text, ["certifications", "certificates"], 5),
        "projects": extract_section_lines(text, ["projects"], 5),
        "experience": extract_section_lines(text, ["experience", "work experience", "employment"], 6),
        "achievements": achievements,
        "experience_years": int(exp_years[0]) if exp_years else max(0, len(set(years)) - 1),
    }


def completeness_score(resume_text: str) -> float:
    text = resume_text or ""
    checks = [
        bool(re.search(r"[\w.\-]+@[\w.\-]+\.\w+", text)),
        bool(re.search(r"(\+?\d[\d\s().\-]{7,}\d)", text)),
        any(w in normalize_text(text) for w in ["experience", "employment", "work history"]),
        any(w in normalize_text(text) for w in ["education", "degree", "university"]),
        any(w in normalize_text(text) for w in ["skills", "technologies", "tools"]),
        len(text.split()) >= 180,
    ]
    return round((sum(checks) / len(checks)) * 100, 2)


# ── ATS report ────────────────────────────────────────────────────────────────

def build_ats_report(jd: str, resume_text: str, semantic_score: float, skills: List[str]) -> dict:
    jd_keywords = extract_keywords(jd)
    resume_keywords = set(extract_keywords(resume_text))
    missing = [k for k in jd_keywords if k not in resume_keywords][:10]
    matched = [k for k in jd_keywords if k in resume_keywords]
    skills_match = round((len(matched) / max(len(jd_keywords), 1)) * 100, 2)
    completeness = completeness_score(resume_text)
    structured = extract_structured_resume(resume_text)
    experience_match = min(100, 45 + (structured["experience_years"] * 8) + (len(structured["experience"]) * 5))
    education_terms = set(extract_keywords(" ".join(structured.get("education", []))))
    education_match = round((len(education_terms & set(jd_keywords)) / max(len(jd_keywords), 1)) * 100, 2) if education_terms else 0.0
    industry_keywords = {
        "cloud", "finance", "healthcare", "retail", "manufacturing", "saas", "ecommerce",
        "education", "government", "media", "telecom", "energy", "logistics", "consulting",
    }
    industry_match_count = sum(1 for keyword in industry_keywords if keyword in normalize_text(jd) and keyword in normalize_text(resume_text))
    industry_fit = round(min(100.0, (industry_match_count / max(1, len(industry_keywords))) * 100 * 1.3), 2)
    keyword_match = round((len(matched) / max(len(jd_keywords), 1)) * 100, 2)
    ats_score = round(
        (semantic_score * 0.32) + (skills_match * 0.26) + (experience_match * 0.18) + (education_match * 0.12) + (completeness * 0.12),
        2,
    )

    suggestions = []
    if missing:
        suggestions.append(f"Add evidence for missing keywords: {', '.join(missing[:6])}.")
    if completeness < 75:
        suggestions.append("Strengthen resume completeness: add contact, education, skills, and measurable experience.")
    if semantic_score < 70:
        suggestions.append("Mirror the job description language more closely in your summary and achievement bullets.")
    if len(skills) < 6:
        suggestions.append("Add a dedicated skills section with role-specific tools and competencies.")
    if education_match < 60:
        suggestions.append("Include more education details and degree context to strengthen academic fit.")
    if not suggestions:
        suggestions.append("Resume is well aligned. Add quantified outcomes to improve recruiter confidence.")

    return {
        "ats_score": ats_score,
        "semantic_score": semantic_score,
        "keyword_match": keyword_match,
        "skills_match": skills_match,
        "experience_match": experience_match,
        "education_match": education_match,
        "industry_fit": industry_fit,
        "completeness_score": completeness,
        "missing_keywords": missing,
        "matched_keywords": matched[:12],
        "keyword_optimization": jd_keywords[:12],
        "suggestions": suggestions,
        "structured": structured,
    }


# ── Recommendation ────────────────────────────────────────────────────────────

def generate_recommendation(score: float) -> str:
    if score >= 85:
        return "Shortlisted"
    if score >= 60:
        return "Review"
    return "Rejected"


def get_candidate_summary(jd: str, resume_text: str) -> str:
    return summarize_text(resume_text, sentence_count=4)
