from fastapi import APIRouter, Depends, HTTPException
from controllers.attendance_controller import handle_check_in, handle_check_out, get_attendance
from middleware.auth import get_current_user, has_permission, user_role

router = APIRouter()


def ensure_attendance_scope(user: dict, employee_id: str):
    role = user_role(user)
    if has_permission(role, "attendance:all") or has_permission(role, "attendance:team"):
        return
    if not has_permission(role, "attendance:own"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    allowed_ids = {str(user.get("id") or ""), str(user.get("userId") or ""), str(user.get("email") or "")}
    if str(employee_id) not in allowed_ids:
        raise HTTPException(status_code=403, detail="Employees can only access their own attendance")


@router.post("/checkin")
async def check_in(payload: dict, user: dict = Depends(get_current_user)):
    ensure_attendance_scope(user, payload["employee_id"])
    return await handle_check_in(payload["employee_id"])


@router.post("/checkout")
async def check_out(payload: dict, user: dict = Depends(get_current_user)):
    ensure_attendance_scope(user, payload["employee_id"])
    result = await handle_check_out(payload["employee_id"])
    if not result:
        raise HTTPException(status_code=404, detail="No active check-in found")
    return result


@router.get("/history/{employee_id}")
async def attendance_history(employee_id: str, user: dict = Depends(get_current_user)):
    ensure_attendance_scope(user, employee_id)
    return await get_attendance(employee_id)
