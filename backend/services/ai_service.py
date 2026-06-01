import os
import uuid
import re
import shutil
import io
import hashlib
from datetime import datetime
from pathlib import Path
from database.connection import db
from serializers import serialize_mongo
from ai_module.processor import (
    extract_text_from_resume,
    extract_skills,
    calculate_match_score,
    generate_recommendation,
    get_candidate_summary,
    build_ats_report,
)

BASE_DIR = Path(__file__).resolve().parents[1]
UPLOAD_DIR = BASE_DIR / "uploads"
RESUME_UPLOAD_DIR = UPLOAD_DIR / "resumes"
PROFILE_IMAGE_UPLOAD_DIR = UPLOAD_DIR / "profile_images"
DOCUMENT_UPLOAD_DIR = UPLOAD_DIR / "documents"
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx"}
MAX_RESUME_FILE_SIZE = int(os.getenv("MAX_RESUME_FILE_SIZE", str(10 * 1024 * 1024)))


def ensure_upload_directories():
    for directory in (UPLOAD_DIR, RESUME_UPLOAD_DIR, PROFILE_IMAGE_UPLOAD_DIR, DOCUMENT_UPLOAD_DIR):
        os.makedirs(directory, exist_ok=True)


def safe_filename_part(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", value or "resume").strip("._-")
    return cleaned[:80] or "resume"


async def save_legacy_resume_file(file_bytes: bytes, filename: str, user_email: str):
    ensure_upload_directories()
    extension = Path(filename or "").suffix.lower()
    if extension not in ALLOWED_RESUME_EXTENSIONS:
        raise ValueError("Unsupported resume format. Upload PDF or DOCX resumes only.")
    if not file_bytes:
        raise ValueError("Resume file is empty.")
    if len(file_bytes) > MAX_RESUME_FILE_SIZE:
        raise ValueError("Resume file exceeds the maximum size.")
    if b"\x00" in file_bytes[:2048]:
        raise ValueError("Resume file looks unsafe and was rejected.")

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    stored_filename = f"resume_{timestamp}_{uuid.uuid4().hex[:12]}_{safe_filename_part(Path(filename).stem)}{extension}"
    file_path = RESUME_UPLOAD_DIR / stored_filename
    with open(file_path, "wb") as target:
        shutil.copyfileobj(io.BytesIO(file_bytes), target)

    file_hash = hashlib.sha256(file_bytes).hexdigest()
    duplicate = await db.resume_profiles.find_one({"owner": user_email, "file_hash": file_hash}, {"_id": 1})
    return {
        "original_filename": filename,
        "stored_filename": stored_filename,
        "file_path": str(file_path),
        "file_size": len(file_bytes),
        "file_hash": file_hash,
        "duplicate_of": str(duplicate["_id"]) if duplicate else None,
        "is_duplicate": bool(duplicate),
    }


async def analyze_resume(jd: str, file_bytes: bytes, filename: str, user_email: str):
    stored_file = await save_legacy_resume_file(file_bytes, filename, user_email)
    text = extract_text_from_resume(file_bytes, filename)
    skills = extract_skills(text)
    score = await calculate_match_score(jd, text)
    recommendation = generate_recommendation(score)
    summary = get_candidate_summary(jd, text)
    ats = build_ats_report(jd, text, score, skills)
    structured = ats.get("structured", {})

    candidate_doc = {
        "candidate_name": filename,
        "email": user_email,
        "skills": skills,
        "resume_score": ats["ats_score"],
        "ai_recommendation": recommendation,
        "status": "shortlisted" if recommendation == "Selected" else "pending",
        "resume_file_path": stored_file["file_path"],
        "created_at": datetime.utcnow().isoformat(),
    }
    candidate_result = await db.candidates.insert_one(candidate_doc)
    candidate_doc["id"] = str(candidate_result.inserted_id)
    resume_doc = {
        "candidate_id": str(candidate_result.inserted_id),
        "owner": user_email,
        "uploaded_by": user_email,
        "original_filename": filename,
        "stored_filename": stored_file["stored_filename"],
        "file_path": stored_file["file_path"],
        "upload_timestamp": datetime.utcnow().isoformat(),
        "file_size": stored_file["file_size"],
        "file_hash": stored_file["file_hash"],
        "duplicate_of": stored_file["duplicate_of"],
        "is_duplicate": stored_file["is_duplicate"],
        "extracted_text": text[:12000],
        "extracted_skills": skills,
        "extracted_education": structured.get("education", []),
        "extracted_experience": structured.get("experience", []),
        "ats_score": ats["ats_score"],
        "semantic_score": score,
        "keyword_match": ats["keyword_match"],
        "ai_summary": summary,
        "status": "shortlisted" if recommendation == "Selected" else "pending_review",
        "parsing_status": "completed",
        "updated_at": datetime.utcnow().isoformat(),
    }
    resume_result = await db.resume_profiles.insert_one(resume_doc)
    await db.ats_reports.insert_one({
        "owner": user_email,
        "candidate_email": user_email,
        "candidate_id": str(candidate_result.inserted_id),
        "resume_profile_id": str(resume_result.inserted_id),
        "candidate": filename,
        "hr": user_email,
        "job_description_keywords": ats["keyword_optimization"],
        "missing_keywords": ats["missing_keywords"],
        "matched_keywords": ats["matched_keywords"],
        "scores": {
            "semantic": score,
            "ats": ats["ats_score"],
            "keyword_match": ats["keyword_match"],
            "skills_match": ats["skills_match"],
            "experience_match": ats["experience_match"],
            "completeness": ats["completeness_score"],
        },
        "structured": structured,
        "suggestions": ats["suggestions"],
        "created_at": datetime.utcnow().isoformat(),
    })
    await db.analytics.insert_one({
        "owner": user_email,
        "candidate_email": user_email,
        "scope": "candidate",
        "event": "ats_scan_completed",
        "resume_profile_id": str(resume_result.inserted_id),
        "candidate_id": str(candidate_result.inserted_id),
        "created_at": datetime.utcnow().isoformat(),
    })
    await db.resume_versions.insert_one({
        "resume_id": str(resume_result.inserted_id),
        "candidate_id": str(candidate_result.inserted_id),
        "version": 1,
        "version_type": "original_upload",
        "original_filename": filename,
        "stored_filename": stored_file["stored_filename"],
        "file_path": stored_file["file_path"],
        "file_size": stored_file["file_size"],
        "file_hash": stored_file["file_hash"],
        "created_by": user_email,
        "created_at": datetime.utcnow().isoformat(),
    })

    return {
        "score": score,
        "skills": skills,
        "summary": summary,
        "decision": recommendation,
        "status": candidate_doc["status"],
        "ats": ats,
        "resume_file": {
            "id": str(resume_result.inserted_id),
            "candidate_id": str(candidate_result.inserted_id),
            "original_filename": filename,
            "stored_filename": stored_file["stored_filename"],
            "file_size": stored_file["file_size"],
            "is_duplicate": stored_file["is_duplicate"],
            "duplicate_of": stored_file["duplicate_of"],
            "download_url": f"/api/resume-files/{resume_result.inserted_id}/download",
            "preview_url": f"/api/resume-files/{resume_result.inserted_id}/preview",
            "parsing_status": "completed",
        },
    }


async def list_shortlisted_candidates():
    cursor = db.candidates.find({"ai_recommendation": "Selected"}).sort("created_at", -1)
    return [serialize_mongo(doc) async for doc in cursor]
