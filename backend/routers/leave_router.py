from fastapi import APIRouter, Depends, HTTPException
from controllers.leave_controller import create_leave, approve_leave, get_leave_records
from middleware.auth import get_current_user, has_permission, require_permission, user_role

router = APIRouter()


def ensure_leave_scope(user: dict, employee_id: str = None):
    role = user_role(user)
    if has_permission(role, "leave:approve") or has_permission(role, "leave:analytics"):
        return
    if not has_permission(role, "leave:own"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if not employee_id:
        return
    allowed_ids = {str(user.get("id") or ""), str(user.get("userId") or ""), str(user.get("email") or "")}
    if str(employee_id) not in allowed_ids:
        raise HTTPException(status_code=403, detail="Employees can only access their own leave records")


@router.post("/apply")
async def apply_leave(payload: dict, user: dict = Depends(get_current_user)):
    ensure_leave_scope(user, payload.get("employee_id"))
    return await create_leave(payload)


@router.put("/approve/{leave_id}")
async def approve_leave_request(leave_id: str, payload: dict, user: dict = Depends(require_permission("leave:approve"))):
    if "status" not in payload:
        raise HTTPException(status_code=400, detail="Missing status field")
    return await approve_leave(leave_id, payload["status"])


@router.get("/history")
async def leave_history(employee_id: str = None, user: dict = Depends(get_current_user)):
    ensure_leave_scope(user, employee_id)
    return await get_leave_records(employee_id)
