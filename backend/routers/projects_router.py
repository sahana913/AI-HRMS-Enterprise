from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from database.connection import db
from middleware.auth import get_current_user, has_permission, user_role

router = APIRouter()

KANBAN_COLUMNS = [
    {"id": "backlog", "title": "Backlog"},
    {"id": "in_progress", "title": "In Progress"},
    {"id": "review", "title": "Review"},
    {"id": "done", "title": "Done"},
]


def ensure_project_scope(user: dict):
    if has_permission(user.get("role", ""), "projects:manage"):
        return
    if has_permission(user.get("role", ""), "projects:own"):
        return
    raise HTTPException(status_code=403, detail="Insufficient permissions")


def serialize_project(doc: dict) -> dict:
    if not doc:
        return doc
    result = dict(doc)
    if "_id" in result:
        result["_id"] = str(result["_id"])
        result["id"] = result.get("id") or result["_id"]
    for key in ("created_at", "updated_at"):
        if isinstance(result.get(key), datetime):
            result[key] = result[key].isoformat()
    return result


async def project_tasks_for(user: dict):
    role = user_role(user)
    query = {"owner": user.get("email")} if role == "employee" else {}
    tasks = [serialize_project(task) async for task in db.project_tasks.find(query).sort("created_at", -1)]
    return tasks


@router.get("/board")
async def get_project_board(user: dict = Depends(get_current_user)):
    ensure_project_scope(user)
    tasks = await project_tasks_for(user)
    open_tasks = sum(1 for task in tasks if task.get("status") != "Done")
    completed = sum(1 for task in tasks if task.get("status") == "Done")
    progress = round((completed / len(tasks)) * 100) if tasks else 0
    return {
        "columns": KANBAN_COLUMNS,
        "tasks": tasks,
        "summary": {"open_tasks": open_tasks, "sprints": await db.project_sprints.count_documents({}), "progress": progress},
    }


@router.get("/sprints")
async def get_sprints(user: dict = Depends(get_current_user)):
    ensure_project_scope(user)
    await project_tasks_for(user)
    sprints = [serialize_project(sprint) async for sprint in db.project_sprints.find({}).sort("created_at", -1)]
    return sprints


@router.post("/sprints")
async def create_sprint(payload: dict, user: dict = Depends(get_current_user)):
    ensure_project_scope(user)
    sprint = {
        "name": payload.get("name", "Untitled sprint"),
        "status": payload.get("status", "Planning"),
        "progress": int(payload.get("progress", 0) or 0),
        "start_date": payload.get("start_date") or datetime.utcnow().date().isoformat(),
        "end_date": payload.get("end_date") or datetime.utcnow().date().isoformat(),
        "tasks": int(payload.get("tasks", 0) or 0),
        "completed": int(payload.get("completed", 0) or 0),
        "created_by": user.get("email"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.project_sprints.insert_one(sprint)
    return serialize_project(await db.project_sprints.find_one({"_id": result.inserted_id}))


@router.put("/sprints/{sprint_id}")
async def update_sprint(sprint_id: str, payload: dict, user: dict = Depends(get_current_user)):
    ensure_project_scope(user)
    from bson import ObjectId
    if ObjectId.is_valid(sprint_id):
        update_doc = {key: value for key, value in payload.items() if key in {"name", "status", "progress", "start_date", "end_date", "tasks", "completed"}}
        update_doc["updated_at"] = datetime.utcnow()
        result = await db.project_sprints.update_one({"_id": ObjectId(sprint_id)}, {"$set": update_doc})
        if result.matched_count:
            return serialize_project(await db.project_sprints.find_one({"_id": ObjectId(sprint_id)}))
    raise HTTPException(status_code=404, detail="Sprint not found")


@router.delete("/sprints/{sprint_id}")
async def delete_sprint(sprint_id: str, user: dict = Depends(get_current_user)):
    ensure_project_scope(user)
    from bson import ObjectId
    if not ObjectId.is_valid(sprint_id):
        raise HTTPException(status_code=404, detail="Sprint not found")
    result = await db.project_sprints.delete_one({"_id": ObjectId(sprint_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return {"message": "Sprint deleted"}


@router.get("/tasks")
async def get_tasks(user: dict = Depends(get_current_user)):
    ensure_project_scope(user)
    return await project_tasks_for(user)


@router.post("/tasks")
async def create_task(payload: dict, user: dict = Depends(get_current_user)):
    ensure_project_scope(user)
    task = {
        "title": payload.get("title", "Untitled task"),
        "status": payload.get("status", "Backlog"),
        "owner": payload.get("owner") or user.get("email") or "current@company.com",
        "priority": payload.get("priority", "Medium"),
        "due_date": payload.get("due_date") or datetime.utcnow().date().isoformat(),
        "created_by": user.get("email"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.project_tasks.insert_one(task)
    return serialize_project(await db.project_tasks.find_one({"_id": result.inserted_id}))


@router.put("/tasks/{task_id}")
async def update_task(task_id: str, payload: dict, user: dict = Depends(get_current_user)):
    ensure_project_scope(user)
    from bson import ObjectId
    if ObjectId.is_valid(task_id):
        update_doc = {key: value for key, value in payload.items() if key in {"title", "status", "owner", "priority", "due_date"}}
        update_doc["updated_at"] = datetime.utcnow()
        result = await db.project_tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_doc})
        if result.matched_count:
            return serialize_project(await db.project_tasks.find_one({"_id": ObjectId(task_id)}))
    raise HTTPException(status_code=404, detail="Task not found")


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    ensure_project_scope(user)
    from bson import ObjectId
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    result = await db.project_tasks.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}
