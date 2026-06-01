from datetime import datetime
from bson import ObjectId
from database.connection import db
from serializers import serialize_mongo


def _normalize_id(identifier: str):
    try:
        return ObjectId(identifier)
    except Exception:
        return identifier


async def apply_leave(request: dict):
    leave_doc = {
        "employee_id": request["employee_id"],
        "leave_type": request["leave_type"],
        "start_date": request["start_date"],
        "end_date": request["end_date"],
        "reason": request["reason"],
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.leave_requests.insert_one(leave_doc)
    leave_doc["id"] = str(result.inserted_id)
    return serialize_mongo(leave_doc)


async def update_leave_status(leave_id: str, status: str):
    query = {"_id": _normalize_id(leave_id)}
    await db.leave_requests.update_one(query, {"$set": {"status": status}})
    return serialize_mongo(await db.leave_requests.find_one(query))


async def leave_history(employee_id: str = None):
    query = {"employee_id": employee_id} if employee_id else {}
    cursor = db.leave_requests.find(query).sort("created_at", -1)
    return [serialize_mongo(item) async for item in cursor]
