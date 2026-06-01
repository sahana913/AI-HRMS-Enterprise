from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from database.connection import db
from middleware.auth import require_permission

router = APIRouter()


def serialize_admin(doc: dict) -> dict:
    if not doc:
        return doc
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    if "_id" in result:
        result["id"] = result["_id"]
    return result


def object_id_or_404(value: str, label: str):
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return ObjectId(value)


async def write_audit(user: dict, action: str, resource: str, status: str = "success", metadata: dict = None):
    await db.audit_logs.insert_one({
        "action": action,
        "event": action,
        "actor": user.get("email", "system"),
        "resource": resource,
        "scope": resource,
        "status": status,
        "risk": "Medium" if action.lower().startswith(("delete", "update", "permission", "role")) else "Low",
        "ip": "system",
        "metadata": metadata or {},
        "timestamp": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    })


def permission_category(key: str) -> str:
    category = str(key or "system").split(":", 1)[0]
    aliases = {
        "dashboard": "system",
        "employees": "roles",
        "roles": "roles",
        "permissions": "permissions",
        "departments": "departments",
        "payroll": "payroll",
        "audit": "audit",
        "security": "security",
        "system": "system",
    }
    return aliases.get(category, category)


@router.get("/roles")
async def get_roles(user: dict = Depends(require_permission("roles:manage"))):
    roles = await db.roles.find().sort("name", 1).to_list(100)
    return [serialize_admin(role) for role in roles]


@router.post("/roles")
async def create_role(payload: dict, user: dict = Depends(require_permission("roles:manage"))):
    name = str(payload.get("name", "")).strip()
    if not name:
        raise HTTPException(status_code=400, detail="Role name is required")
    doc = {
        "name": name,
        "description": payload.get("description", ""),
        "permissions": payload.get("permissions", []),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.roles.insert_one(doc)
    await write_audit(user, "Role Created", "Roles", metadata={"role": name})
    return serialize_admin(await db.roles.find_one({"_id": result.inserted_id}))


@router.put("/roles/{role_id}")
async def update_role(role_id: str, payload: dict, user: dict = Depends(require_permission("roles:manage"))):
    update_doc = {
        key: payload[key]
        for key in ("name", "description", "permissions")
        if key in payload
    }
    update_doc["updated_at"] = datetime.utcnow()
    result = await db.roles.update_one({"_id": object_id_or_404(role_id, "Role")}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    await write_audit(user, "Role Updated", "Roles", metadata={"role_id": role_id})
    return serialize_admin(await db.roles.find_one({"_id": object_id_or_404(role_id, "Role")}))


@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, user: dict = Depends(require_permission("roles:manage"))):
    result = await db.roles.delete_one({"_id": object_id_or_404(role_id, "Role")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    await write_audit(user, "Role Deleted", "Roles", metadata={"role_id": role_id})
    return {"message": "Role deleted"}

@router.get("/permissions")
async def get_permissions(user: dict = Depends(require_permission("permissions:manage"))):
    permissions = await db.permissions.find().sort("key", 1).to_list(300)
    return [
        {
            **serialize_admin(permission),
            "name": permission.get("name") or permission.get("key"),
            "category": permission.get("category") or permission_category(permission.get("key")),
            "description": permission.get("description") or str(permission.get("key", "")).replace(":", " "),
        }
        for permission in permissions
    ]

@router.get("/departments")
async def get_departments(user: dict = Depends(require_permission("departments:manage"))):
    departments = await db.departments.find({}).sort("name", 1).to_list(100)
    return [
        serialize_admin({
            **department,
            "head": department.get("head") or department.get("leader", ""),
            "employees": department.get("employees", department.get("headcount", 0)),
            "budget": department.get("budget", 0),
        })
        for department in departments
    ]


@router.post("/departments")
async def create_department(payload: dict, user: dict = Depends(require_permission("departments:manage"))):
    name = str(payload.get("name", "")).strip()
    head = str(payload.get("head") or payload.get("leader") or "").strip()
    if not name or not head:
        raise HTTPException(status_code=400, detail="Department name and head are required")
    doc = {
        "name": name,
        "head": head,
        "leader": head,
        "employees": int(payload.get("employees") or payload.get("headcount") or 0),
        "headcount": int(payload.get("employees") or payload.get("headcount") or 0),
        "budget": int(payload.get("budget") or 0),
        "status": payload.get("status", "Active"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.departments.insert_one(doc)
    await write_audit(user, "Department Created", "Departments", metadata={"department": name})
    return serialize_admin(await db.departments.find_one({"_id": result.inserted_id}))


@router.put("/departments/{department_id}")
async def update_department(department_id: str, payload: dict, user: dict = Depends(require_permission("departments:manage"))):
    update_doc = {}
    for key in ("name", "head", "leader", "status"):
        if key in payload:
            update_doc[key] = payload[key]
    if "head" in update_doc and "leader" not in update_doc:
        update_doc["leader"] = update_doc["head"]
    if "employees" in payload or "headcount" in payload:
        count = int(payload.get("employees") or payload.get("headcount") or 0)
        update_doc["employees"] = count
        update_doc["headcount"] = count
    if "budget" in payload:
        update_doc["budget"] = int(payload.get("budget") or 0)
    update_doc["updated_at"] = datetime.utcnow()
    result = await db.departments.update_one({"_id": object_id_or_404(department_id, "Department")}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")
    await write_audit(user, "Department Updated", "Departments", metadata={"department_id": department_id})
    return serialize_admin(await db.departments.find_one({"_id": object_id_or_404(department_id, "Department")}))


@router.delete("/departments/{department_id}")
async def delete_department(department_id: str, user: dict = Depends(require_permission("departments:manage"))):
    result = await db.departments.delete_one({"_id": object_id_or_404(department_id, "Department")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")
    await write_audit(user, "Department Deleted", "Departments", metadata={"department_id": department_id})
    return {"message": "Department deleted"}

@router.get("/payroll/summary")
async def get_payroll_summary(user: dict = Depends(require_permission("payroll:manage"))):
    headcount = await db.employees.count_documents({})
    active_payroll = await db.payroll.find_one({}, sort=[("period", -1), ("created_at", -1)])
    if active_payroll:
        return serialize_admin(active_payroll)
    return {
        "period": datetime.utcnow().strftime("%Y-%m"),
        "monthly_cost": 0,
        "headcount": headcount,
        "avg_salary": 0,
        "average_salary": 0,
        "forecast_next_month": 0,
        "payroll_health": "0%",
        "tax_liability": 0,
        "benefits_cost": 0,
        "pending_reviews": 0,
    }


@router.post("/payroll/summary")
async def upsert_payroll_summary(payload: dict, user: dict = Depends(require_permission("payroll:manage"))):
    doc = {
        "period": payload.get("period") or datetime.utcnow().strftime("%Y-%m"),
        "monthly_cost": int(payload.get("monthly_cost") or 0),
        "headcount": int(payload.get("headcount") or 0),
        "avg_salary": int(payload.get("avg_salary") or payload.get("average_salary") or 0),
        "average_salary": int(payload.get("avg_salary") or payload.get("average_salary") or 0),
        "forecast_next_month": int(payload.get("forecast_next_month") or 0),
        "payroll_health": payload.get("payroll_health", "92%"),
        "tax_liability": int(payload.get("tax_liability") or 0),
        "benefits_cost": int(payload.get("benefits_cost") or 0),
        "pending_reviews": int(payload.get("pending_reviews") or 0),
        "updated_at": datetime.utcnow(),
    }
    await db.payroll.update_one({"period": doc["period"]}, {"$set": doc, "$setOnInsert": {"created_at": datetime.utcnow()}}, upsert=True)
    await write_audit(user, "Payroll Updated", "Payroll", metadata={"period": doc["period"]})
    return serialize_admin(await db.payroll.find_one({"period": doc["period"]}))

@router.get("/audit-logs")
async def get_audit_logs(user: dict = Depends(require_permission("audit:read"))):
    logs = await db.audit_logs.find({}).sort("timestamp", -1).to_list(50)
    return [
        serialize_admin({
            **log,
            "action": log.get("action") or log.get("event"),
            "resource": log.get("resource") or log.get("scope"),
            "timestamp": log.get("timestamp") or log.get("created_at") or datetime.utcnow(),
            "ip": log.get("ip", "system"),
            "status": log.get("status", "success"),
        })
        for log in logs
    ]

@router.get("/security/alerts")
async def get_security_alerts(user: dict = Depends(require_permission("security:manage"))):
    alerts = await db.security_alerts.find({}).sort("created_at", -1).to_list(50)
    return [
        serialize_admin({
            **alert,
            "title": alert.get("title") or alert.get("type"),
            "description": alert.get("description") or f"{alert.get('type')} from {alert.get('source', 'system')}",
            "severity": str(alert.get("severity", "low")).lower(),
            "status": alert.get("status", "active"),
            "timestamp": alert.get("timestamp") or alert.get("created_at") or datetime.utcnow(),
        })
        for alert in alerts
    ]


@router.patch("/security/alerts/{alert_id}")
async def update_security_alert(alert_id: str, payload: dict, user: dict = Depends(require_permission("security:manage"))):
    update_doc = {key: payload[key] for key in ("status", "severity", "title", "description") if key in payload}
    update_doc["updated_at"] = datetime.utcnow()
    result = await db.security_alerts.update_one({"_id": object_id_or_404(alert_id, "Alert")}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    await write_audit(user, "Security Alert Updated", "Security", metadata={"alert_id": alert_id})
    return serialize_admin(await db.security_alerts.find_one({"_id": object_id_or_404(alert_id, "Alert")}))


@router.get("/onboarding")
async def get_onboarding_workflows(user: dict = Depends(require_permission("onboarding:manage"))):
    workflows = await db.onboarding.find({}).sort("created_at", -1).to_list(100)
    return [serialize_admin(workflow) for workflow in workflows]


@router.post("/onboarding")
async def create_onboarding_workflow(payload: dict, user: dict = Depends(require_permission("onboarding:manage"))):
    employee_name = str(payload.get("employee_name") or "").strip()
    employee_email = str(payload.get("employee_email") or "").strip().lower()
    role = str(payload.get("role") or "").strip()
    if not employee_name or not employee_email or not role:
        raise HTTPException(status_code=400, detail="Employee name, email, and role are required")
    tasks = payload.get("tasks") or [
        {"title": "Profile completion", "status": "pending"},
        {"title": "Document submission", "status": "pending"},
        {"title": "HR approval", "status": "pending"},
        {"title": "Welcome orientation", "status": "pending"},
    ]
    doc = {
        "employee_name": employee_name,
        "employee_email": employee_email,
        "role": role,
        "department": payload.get("department", ""),
        "start_date": payload.get("start_date", ""),
        "owner": payload.get("owner") or user.get("email", "hr"),
        "status": payload.get("status", "pending"),
        "profile_completion": int(payload.get("profile_completion") or 0),
        "documents_submitted": int(payload.get("documents_submitted") or 0),
        "documents_required": int(payload.get("documents_required") or 3),
        "hr_approved": bool(payload.get("hr_approved", False)),
        "welcome_sent": bool(payload.get("welcome_sent", False)),
        "tasks": tasks,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.onboarding.insert_one(doc)
    await write_audit(user, "Onboarding Created", "Onboarding", metadata={"employee_email": employee_email})
    return serialize_admin(await db.onboarding.find_one({"_id": result.inserted_id}))


@router.patch("/onboarding/{workflow_id}")
async def update_onboarding_workflow(workflow_id: str, payload: dict, user: dict = Depends(require_permission("onboarding:manage"))):
    allowed = {
        "employee_name", "employee_email", "role", "department", "start_date", "owner", "status",
        "profile_completion", "documents_submitted", "documents_required", "hr_approved", "welcome_sent", "tasks",
    }
    update_doc = {key: payload[key] for key in allowed if key in payload}
    if "employee_email" in update_doc:
        update_doc["employee_email"] = str(update_doc["employee_email"]).lower()
    if "profile_completion" in update_doc:
        update_doc["profile_completion"] = int(update_doc.get("profile_completion") or 0)
    for key in ("documents_submitted", "documents_required"):
        if key in update_doc:
            update_doc[key] = int(update_doc.get(key) or 0)
    update_doc["updated_at"] = datetime.utcnow()
    result = await db.onboarding.update_one({"_id": object_id_or_404(workflow_id, "Onboarding workflow")}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Onboarding workflow not found")
    await write_audit(user, "Onboarding Updated", "Onboarding", metadata={"workflow_id": workflow_id})
    return serialize_admin(await db.onboarding.find_one({"_id": object_id_or_404(workflow_id, "Onboarding workflow")}))


@router.post("/onboarding/{workflow_id}/documents")
async def add_onboarding_document(workflow_id: str, payload: dict, user: dict = Depends(require_permission("onboarding:manage"))):
    if not ObjectId.is_valid(workflow_id):
        raise HTTPException(status_code=404, detail="Onboarding workflow not found")
    workflow = await db.onboarding.find_one({"_id": ObjectId(workflow_id)})
    if not workflow:
        raise HTTPException(status_code=404, detail="Onboarding workflow not found")
    doc = {
        "workflow_id": workflow_id,
        "name": payload.get("name") or "Document",
        "category": payload.get("category") or "Employment",
        "status": payload.get("status") or "submitted",
        "owner": user.get("email", "hr"),
        "created_at": datetime.utcnow(),
    }
    await db.onboarding_documents.insert_one(doc)
    submitted = await db.onboarding_documents.count_documents({"workflow_id": workflow_id, "status": {"$in": ["submitted", "approved"]}})
    required = int(workflow.get("documents_required") or 3)
    await db.onboarding.update_one(
        {"_id": ObjectId(workflow_id)},
        {"$set": {"documents_submitted": submitted, "profile_completion": min(100, round((submitted / max(required, 1)) * 50) + 25), "updated_at": datetime.utcnow()}},
    )
    await write_audit(user, "Onboarding Document Submitted", "Onboarding", metadata={"workflow_id": workflow_id})
    return serialize_admin(await db.onboarding.find_one({"_id": ObjectId(workflow_id)}))

@router.get("/system/settings")
async def get_system_settings(user: dict = Depends(require_permission("system:manage"))):
    return {
        "environment": "production",
        "version": "2.0.0-enterprise",
        "maintenance": False,
        "auth": {"mfa": True, "password_policy": "strong"},
        "notifications": {"email": True, "sms": False},
    }
