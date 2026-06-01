from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from database.connection import db
from middleware.auth import get_current_user, get_password_hash, has_permission, user_role
from serializers import serialize_mongo

router = APIRouter()


MODULES = {
    "organization": {"collection": "organization_units", "permission": "organization:manage", "fields": ["name", "type", "leader", "headcount", "location", "status"]},
    "users": {"collection": "users", "permission": "users:manage", "fields": ["name", "email", "role", "status"]},
    "permissions": {"collection": "permissions", "permission": "permissions:manage", "fields": ["key", "name", "category", "description", "status"]},
    "settings": {"collection": "system_settings", "permission": "system:manage", "fields": ["key", "value", "category", "status"]},
    "teams": {"collection": "teams", "permission": "team:manage", "fields": ["name", "manager_email", "department", "members", "status"]},
    "workforce-plans": {"collection": "workforce_plans", "permission": "workforce:plan", "fields": ["title", "department", "period", "headcount_plan", "hiring_need", "status"]},
    "performance-reviews": {"collection": "performance_reviews", "permission": "performance:manage", "fields": ["employee", "manager", "cycle", "score", "feedback", "status"]},
    "resource-allocations": {"collection": "resource_allocations", "permission": "resources:allocate", "fields": ["employee", "project", "allocation_percent", "start_date", "end_date", "status"]},
    "budgets": {"collection": "budgets", "permission": "budget:manage", "fields": ["department", "period", "amount", "spent", "owner", "status"]},
    "jobs": {"collection": "jobs", "permission": "jobs:manage", "fields": ["title", "department", "location", "employment_type", "status", "description"]},
    "offers": {"collection": "offers", "permission": "offers:manage", "fields": ["candidate", "role", "package", "stage", "owner", "status"]},
    "employee-profile": {"collection": "employee_profiles", "permission": "profile:own", "fields": ["name", "email", "phone", "location", "emergency_contact", "status"], "own": True},
    "attendance-corrections": {"collection": "attendance_corrections", "permission": "attendance:own", "fields": ["date", "reason", "requested_in", "requested_out", "status"], "own": True},
    "leave-balances": {"collection": "leave_balances", "permission": "leave:own", "fields": ["leave_type", "available", "used", "pending", "status"], "own": True},
    "payslips": {"collection": "payslips", "permission": "payroll:own", "fields": ["period", "gross", "deductions", "net", "status"], "own": True},
    "goals": {"collection": "goals", "permission": "goals:own", "fields": ["title", "metric", "progress", "due_date", "manager", "status"], "own": True},
    "training": {"collection": "training_courses", "permission": "training:own", "fields": ["title", "category", "duration", "progress", "score", "status"]},
    "notifications": {"collection": "notifications", "permission": "notifications:read", "fields": ["title", "message", "type", "read", "status"], "own": True},
}


def module_config(module: str):
    config = MODULES.get(module)
    if not config:
        raise HTTPException(status_code=404, detail="Enterprise module not found")
    return config


def can_access(user: dict, config: dict, write: bool = False):
    role = user_role(user)
    permission = config["permission"]
    if has_permission(role, permission):
        return
    if permission.endswith(":own") and has_permission(role, permission.replace(":own", ":manage")):
        return
    if write and permission == "notifications:read" and has_permission(role, "notifications:manage"):
        return
    if permission == "goals:own" and has_permission(role, "goals:team"):
        return
    if permission == "performance:manage" and (has_permission(role, "performance:team") or has_permission(role, "performance:own")):
        return
    raise HTTPException(status_code=403, detail="Insufficient permissions")


def scope_query(user: dict, config: dict):
    role = user_role(user)
    if config["permission"] == "goals:own" and has_permission(role, "goals:team"):
        return {}
    if config.get("own") and not has_permission(user_role(user), config["permission"].replace(":own", ":manage")):
        email = user.get("email", "")
        return {"$or": [{"owner": email}, {"email": email}, {"employee_email": email}, {"user_email": email}]}
    return {}


async def audit(user: dict, action: str, module: str, metadata: dict = None):
    await db.audit_logs.insert_one({
        "action": action,
        "event": action,
        "actor": user.get("email", "system"),
        "resource": module,
        "scope": "enterprise",
        "status": "success",
        "risk": "Medium" if action.startswith(("Update", "Delete")) else "Low",
        "metadata": metadata or {},
        "timestamp": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    })


@router.get("/{module}")
async def list_records(module: str, page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200), user: dict = Depends(get_current_user)):
    config = module_config(module)
    can_access(user, config)
    query = scope_query(user, config)
    collection = db[config["collection"]]
    cursor = collection.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    items = [serialize_mongo(item) async for item in cursor]
    total = await collection.count_documents(query)
    return {"items": items, "fields": config["fields"], "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}


@router.post("/{module}")
async def create_record(module: str, payload: dict, user: dict = Depends(get_current_user)):
    config = module_config(module)
    can_access(user, config, write=True)
    doc = {field: payload.get(field, "") for field in config["fields"]}
    doc.update({
        "owner": payload.get("owner") or user.get("email"),
        "created_by": user.get("email"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    if module == "users":
        email = str(doc.get("email") or "").strip().lower()
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        if await db.users.find_one({"email": email}):
            raise HTTPException(status_code=409, detail="User already exists")
        doc["email"] = email
        doc["password"] = get_password_hash(payload.get("password") or "ChangeMe123!")
        doc["status"] = doc.get("status") or "active"
    if module == "permissions" and not doc.get("key"):
        raise HTTPException(status_code=400, detail="Permission key is required")
    result = await db[config["collection"]].insert_one(doc)
    await audit(user, f"Create {module}", module, {"id": str(result.inserted_id)})
    return serialize_mongo(await db[config["collection"]].find_one({"_id": result.inserted_id}))


@router.put("/{module}/{record_id}")
async def update_record(module: str, record_id: str, payload: dict, user: dict = Depends(get_current_user)):
    config = module_config(module)
    can_access(user, config, write=True)
    if not ObjectId.is_valid(record_id):
        raise HTTPException(status_code=404, detail="Record not found")
    update_doc = {field: payload[field] for field in config["fields"] if field in payload}
    if module == "users" and payload.get("password"):
        update_doc["password"] = get_password_hash(payload["password"])
    update_doc["updated_at"] = datetime.utcnow()
    query = {"_id": ObjectId(record_id), **scope_query(user, config)}
    result = await db[config["collection"]].update_one(query, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    await audit(user, f"Update {module}", module, {"id": record_id})
    return serialize_mongo(await db[config["collection"]].find_one({"_id": ObjectId(record_id)}))


@router.delete("/{module}/{record_id}")
async def delete_record(module: str, record_id: str, user: dict = Depends(get_current_user)):
    config = module_config(module)
    can_access(user, config, write=True)
    if not ObjectId.is_valid(record_id):
        raise HTTPException(status_code=404, detail="Record not found")
    query = {"_id": ObjectId(record_id), **scope_query(user, config)}
    result = await db[config["collection"]].delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    await audit(user, f"Delete {module}", module, {"id": record_id})
    return {"message": "Record deleted"}
