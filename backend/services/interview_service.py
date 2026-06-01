from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException
from database.connection import db
from serializers import serialize_mongo


def _meeting_link(payload: dict) -> str:
    supplied = str(payload.get("meeting_link") or "").strip()
    if supplied:
        return supplied
    if str(payload.get("mode", "")).lower() in {"remote", "hybrid", "video"}:
        candidate = str(payload.get("candidate_id", "candidate")).replace(" ", "-")
        return f"https://meet.jit.si/ai-hrms-{candidate}-{int(datetime.utcnow().timestamp())}"
    return ""


async def schedule_interview(payload: dict):
    interview = {
        "candidate_id": payload["candidate_id"],
        "candidate_email": payload.get("candidate_email", ""),
        "interviewer": payload["interviewer"],
        "interview_date": payload["interview_date"],
        "mode": payload["mode"],
        "meeting_link": _meeting_link(payload),
        "round": payload.get("round", "Screening"),
        "evaluation": payload.get("evaluation", {}),
        "feedback": payload.get("feedback", ""),
        "status": payload.get("status", "scheduled"),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    result = await db.interviews.insert_one(interview)
    interview["id"] = str(result.inserted_id)
    return serialize_mongo(interview)


async def list_interviews():
    cursor = db.interviews.find().sort("interview_date", 1)
    return [serialize_mongo(item) async for item in cursor]


async def update_interview(interview_id: str, payload: dict):
    if not ObjectId.is_valid(interview_id):
        raise HTTPException(status_code=404, detail="Interview not found")
    allowed = {"interviewer", "interview_date", "mode", "meeting_link", "round", "status", "feedback", "evaluation"}
    update_doc = {key: payload[key] for key in allowed if key in payload}
    if not update_doc:
        raise HTTPException(status_code=400, detail="No interview fields supplied")
    if "mode" in update_doc and "meeting_link" not in update_doc:
        update_doc["meeting_link"] = _meeting_link({**payload, "candidate_id": payload.get("candidate_id", interview_id)})
    update_doc["updated_at"] = datetime.utcnow().isoformat()
    result = await db.interviews.update_one({"_id": ObjectId(interview_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")
    return serialize_mongo(await db.interviews.find_one({"_id": ObjectId(interview_id)}))
