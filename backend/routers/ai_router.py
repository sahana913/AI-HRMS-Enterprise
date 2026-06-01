import os
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from middleware.auth import get_current_user, has_permission, require_permission, user_role
from controllers.ai_controller import analyze_resume_controller, shortlist_summary

router = APIRouter()


@router.post("/upload-resume")
async def upload_resume(
    jd: str = Form(...),
    resume: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    role = user_role(user)
    if not (has_permission(role, "ai:screen") or has_permission(role, "ai:candidate")):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        content = await resume.read()
        result = await analyze_resume_controller(jd, content, resume.filename, user["email"])
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/shortlisted")
async def get_shortlisted(user: dict = Depends(require_permission("ats:manage"))):
    return await shortlist_summary()


@router.get("/candidate-score")
async def candidate_score():
    return {"message": "Use /upload-resume to analyze candidate resumes"}
