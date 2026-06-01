from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from database.connection import db
from middleware.auth import get_current_user, has_permission, require_permission, user_role
from serializers import serialize_mongo

router = APIRouter()


VALID_STAGES = {
    "Applied",
    "Screening",
    "Shortlisted",
    "Interview Scheduled",
    "Interviewed",
    "Selected",
    "Rejected",
}


@router.get("")
@router.get("/")
async def list_candidates(user: dict = Depends(get_current_user)):
    role = user_role(user)
    if role == "employee":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    query = {} if has_permission(role, "candidates:manage") else {"email": user.get("email")}
    cursor = db.candidates.find(query).sort("created_at", -1)
    return [serialize_mongo(candidate) async for candidate in cursor]


@router.get("/shortlisted")
async def shortlisted_candidates(user: dict = Depends(require_permission("candidates:manage"))):
    cursor = db.candidates.find({"ai_recommendation": "Selected"}).sort("created_at", -1)
    return [serialize_mongo(candidate) async for candidate in cursor]


@router.patch("/{candidate_id}/stage")
async def update_candidate_stage(candidate_id: str, payload: dict, user: dict = Depends(require_permission("candidates:manage"))):
    stage = payload.get("stage")
    if stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail="Invalid candidate stage")
    if not ObjectId.is_valid(candidate_id):
        raise HTTPException(status_code=404, detail="Candidate not found")

    status_map = {
        "Applied": "applied",
        "Screening": "screening",
        "Shortlisted": "shortlisted",
        "Interview Scheduled": "interview_scheduled",
        "Interviewed": "interviewed",
        "Selected": "selected",
        "Rejected": "rejected",
    }
    update_doc = {
        "stage": stage,
        "status": status_map[stage],
        "updated_at": datetime.utcnow().isoformat(),
    }
    result = await db.candidates.update_one({"_id": ObjectId(candidate_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return serialize_mongo(await db.candidates.find_one({"_id": ObjectId(candidate_id)}))
