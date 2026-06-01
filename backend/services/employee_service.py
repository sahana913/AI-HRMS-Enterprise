from datetime import datetime
from bson import ObjectId
from database.connection import db
from serializers import serialize_mongo


async def list_employees():
    cursor = db.employees.find().sort("joining_date", -1)
    return [serialize_mongo(employee) async for employee in cursor]


async def add_employee(data: dict):
    employee = {
        "name": data["name"],
        "email": data["email"],
        "department": data["department"],
        "designation": data["designation"],
        "joining_date": data["joining_date"],
        "status": data.get("status", "active"),
        "attendance": [],
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.employees.insert_one(employee)
    employee["id"] = str(result.inserted_id)
    return serialize_mongo(employee)


def _normalize_id(identifier: str):
    try:
        return ObjectId(identifier)
    except Exception:
        return identifier


async def update_employee(employee_id: str, changes: dict):
    query = {"_id": _normalize_id(employee_id)}
    await db.employees.update_one(query, {"$set": changes})
    return serialize_mongo(await db.employees.find_one(query))


async def delete_employee(employee_id: str):
    query = {"_id": _normalize_id(employee_id)}
    await db.employees.delete_one(query)
    return {"deleted": True}
