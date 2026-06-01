from datetime import datetime
from pymongo import ReturnDocument
from database.connection import db
from serializers import serialize_mongo


async def check_in(employee_id: str):
    record = {
        "employee_id": employee_id,
        "check_in": datetime.utcnow().isoformat(),
        "check_out": None,
        "date": datetime.utcnow().date().isoformat(),
    }
    result = await db.attendance.insert_one(record)
    record["id"] = str(result.inserted_id)
    return serialize_mongo(record)


async def check_out(employee_id: str):
    today = datetime.utcnow().date().isoformat()
    result = await db.attendance.find_one_and_update(
        {"employee_id": employee_id, "date": today, "check_out": None},
        {"$set": {"check_out": datetime.utcnow().isoformat()}},
        return_document=ReturnDocument.AFTER,
    )
    return serialize_mongo(result)


async def attendance_history(employee_id: str):
    cursor = db.attendance.find({"employee_id": employee_id}).sort("date", -1)
    return [serialize_mongo(entry) async for entry in cursor]
