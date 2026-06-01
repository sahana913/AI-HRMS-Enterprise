import asyncio
import io
import os
import re
from functools import lru_cache
from typing import List

_model_lock = asyncio.Lock()
_embed_model = None

SKILL_KEYWORDS = [
    "python", "java", "typescript", "react", "node", "sql", "mongodb", "aws",
    "docker", "kubernetes", "leadership", "communication", "analytics",
    "machine learning", "nlp", "cloud", "devops", "jira", "agile",
]


def extract_text_from_resume(file_bytes: bytes, filename: str) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        import PyPDF2

        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if name.endswith(".docx"):
        import docx

        document = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)

    return file_bytes.decode("utf-8", errors="ignore")


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


@lru_cache(maxsize=1)
def get_nlp():
    try:
        import spacy

        return spacy.load("en_core_web_sm", disable=["textcat"])
    except Exception:
        import spacy

        return spacy.blank("en")


def warmup_lightweight_nlp():
    get_nlp()


def extract_skills(text: str) -> List[str]:
    normalized = normalize_text(text)
    found = {skill for skill in SKILL_KEYWORDS if skill in normalized}
    extracted = []

    doc = get_nlp()(text or "")
    for ent in doc.ents:
        if ent.label_ in {"ORG", "PRODUCT", "SKILL"}:
            extracted.append(ent.text.lower())

    extracted.extend(found)
    return sorted(set(extracted))[:12]


def summarize_text(text: str, sentence_count: int = 3) -> str:
    try:
        sentences = [sent.text.strip() for sent in get_nlp()(text or "").sents if sent.text.strip()]
    except ValueError:
        sentences = []

    if not sentences:
        sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", text or "") if part.strip()]
    if len(sentences) <= sentence_count:
        return " ".join(sentences)

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform(sentences)
    centroid = matrix.mean(axis=0)
    scores = cosine_similarity(matrix, centroid.A if hasattr(centroid, "A") else centroid)
    ranked = sorted(range(len(sentences)), key=lambda idx: float(scores[idx][0]), reverse=True)
    return " ".join(sentences[i] for i in ranked[:sentence_count])


async def get_embedding_model():
    global _embed_model
    if _embed_model is not None:
        return _embed_model

    async with _model_lock:
        if _embed_model is not None:
            return _embed_model

        try:
            from sentence_transformers import SentenceTransformer

            _embed_model = await asyncio.to_thread(
                SentenceTransformer,
                os.getenv("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2"),
                local_files_only=os.getenv("AI_LOCAL_FILES_ONLY", "true").lower() != "false",
            )
            return _embed_model
        except Exception as exc:
            print(f"SentenceTransformer unavailable, using lexical scoring: {exc}")
            return None


def lexical_match_score(jd: str, resume_text: str) -> float:
    jd_terms = set(re.findall(r"[a-zA-Z][a-zA-Z+#.-]{2,}", normalize_text(jd)))
    resume_terms = set(re.findall(r"[a-zA-Z][a-zA-Z+#.-]{2,}", normalize_text(resume_text)))
    if not jd_terms or not resume_terms:
        return 0.0
    return round(min(100.0, (len(jd_terms & resume_terms) / len(jd_terms)) * 100), 2)


def extract_keywords(text: str) -> List[str]:
    terms = re.findall(r"[a-zA-Z][a-zA-Z+#.-]{2,}", normalize_text(text))
    stop_words = {
        "and", "the", "with", "for", "from", "that", "this", "will", "are", "you",
        "our", "your", "have", "has", "experience", "candidate", "role", "work",
    }
    counts = {}
    for term in terms:
        if term not in stop_words:
            counts[term] = counts.get(term, 0) + 1
    return [term for term, _ in sorted(counts.items(), key=lambda item: item[1], reverse=True)[:24]]


def extract_contact_details(text: str) -> dict:
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text or "")
    phone_match = re.search(r"(\+?\d[\d\s().-]{7,}\d)", text or "")
    links = re.findall(r"https?://[^\s)]+|(?:linkedin|github)\.com/[^\s)]+", text or "", flags=re.IGNORECASE)
    return {
        "email": email_match.group(0) if email_match else "",
        "phone": phone_match.group(0) if phone_match else "",
        "links": links[:4],
    }


def extract_section_lines(text: str, section_names: List[str], max_items: int = 5) -> List[str]:
    lines = [line.strip(" -\t") for line in (text or "").splitlines() if line.strip()]
    normalized_sections = [name.lower() for name in section_names]
    collected = []
    capture = False
    stop_headers = {
        "experience", "work experience", "employment", "education", "skills",
        "projects", "certifications", "achievements", "awards", "summary",
    }
    for line in lines:
        lowered = line.lower().strip(":")
        if any(name in lowered for name in normalized_sections):
            capture = True
            continue
        if capture and lowered in stop_headers and not any(name in lowered for name in normalized_sections):
            break
        if capture and len(line) > 2:
            collected.append(line[:180])
        if len(collected) >= max_items:
            break
    return collected


def extract_structured_resume(text: str) -> dict:
    normalized = normalize_text(text)
    years = re.findall(r"\b(?:19|20)\d{2}\b", text or "")
    experience_years = re.findall(r"(\d+)\+?\s*(?:years|yrs)", normalized)
    achievements = [
        line.strip(" -\t")[:180]
        for line in (text or "").splitlines()
        if re.search(r"\b(increased|reduced|improved|led|launched|delivered|saved|grew|built|managed)\b", line, re.IGNORECASE)
    ][:5]
    return {
        "contact": extract_contact_details(text),
        "education": extract_section_lines(text, ["education", "degree", "university"], 5),
        "certifications": extract_section_lines(text, ["certifications", "certificates"], 5),
        "projects": extract_section_lines(text, ["projects"], 5),
        "experience": extract_section_lines(text, ["experience", "work experience", "employment"], 6),
        "achievements": achievements,
        "experience_years": int(experience_years[0]) if experience_years else max(0, len(set(years)) - 1),
    }


def completeness_score(resume_text: str) -> float:
    text = resume_text or ""
    checks = [
        bool(re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)),
        bool(re.search(r"(\+?\d[\d\s().-]{7,}\d)", text)),
        any(word in normalize_text(text) for word in ["experience", "employment", "work history"]),
        any(word in normalize_text(text) for word in ["education", "degree", "university"]),
        any(word in normalize_text(text) for word in ["skills", "technologies", "tools"]),
        len(text.split()) >= 180,
    ]
    return round((sum(checks) / len(checks)) * 100, 2)


def build_ats_report(jd: str, resume_text: str, semantic_score: float, skills: List[str]) -> dict:
    jd_keywords = extract_keywords(jd)
    resume_keywords = set(extract_keywords(resume_text))
    missing = [keyword for keyword in jd_keywords if keyword not in resume_keywords][:10]
    matched = [keyword for keyword in jd_keywords if keyword in resume_keywords]
    skills_match = round((len(matched) / max(len(jd_keywords), 1)) * 100, 2)
    completeness = completeness_score(resume_text)
    structured = extract_structured_resume(resume_text)
    experience_match = min(100, 45 + (structured["experience_years"] * 8) + (len(structured["experience"]) * 5))
    keyword_match = round((len(matched) / max(len(jd_keywords), 1)) * 100, 2)
    ats_score = round((semantic_score * 0.38) + (skills_match * 0.26) + (experience_match * 0.18) + (completeness * 0.18), 2)

    suggestions = []
    if missing:
        suggestions.append(f"Add evidence for missing keywords: {', '.join(missing[:6])}.")
    if completeness < 75:
        suggestions.append("Strengthen resume completeness with contact, education, skills, and measurable experience sections.")
    if semantic_score < 70:
        suggestions.append("Mirror the job description language more closely in summary and achievement bullets.")
    if len(skills) < 6:
        suggestions.append("Add a dedicated skills section with role-specific tools and competencies.")
    if not suggestions:
        suggestions.append("Resume is well aligned. Add quantified outcomes to improve recruiter confidence.")

    return {
        "ats_score": ats_score,
        "semantic_score": semantic_score,
        "keyword_match": keyword_match,
        "skills_match": skills_match,
        "experience_match": experience_match,
        "completeness_score": completeness,
        "missing_keywords": missing,
        "matched_keywords": matched[:12],
        "keyword_optimization": jd_keywords[:12],
        "suggestions": suggestions,
        "structured": structured,
    }


async def calculate_match_score(jd: str, resume_text: str) -> float:
    model = await get_embedding_model()
    if not model:
        return lexical_match_score(jd, resume_text)

    from sentence_transformers import util

    jd_vec, resume_vec = await asyncio.to_thread(
        lambda: (
            model.encode(jd, convert_to_tensor=True),
            model.encode(resume_text, convert_to_tensor=True),
        )
    )
    similarity = util.cos_sim(jd_vec, resume_vec).item()
    return round(max(min(similarity, 1.0), 0.0) * 100, 2)


def generate_recommendation(score: float) -> str:
    if score >= 75:
        return "Selected"
    if score >= 50:
        return "Needs Review"
    return "Rejected"


def get_candidate_summary(jd: str, resume_text: str) -> str:
    return summarize_text(resume_text, sentence_count=4)
