from services.ai_service import analyze_resume, list_shortlisted_candidates


async def analyze_resume_controller(jd: str, file_bytes: bytes, filename: str, user_email: str):
    return await analyze_resume(jd, file_bytes, filename, user_email)


async def shortlist_summary():
    return await list_shortlisted_candidates()
