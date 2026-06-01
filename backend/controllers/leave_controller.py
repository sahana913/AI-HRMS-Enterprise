from services.leave_service import apply_leave, update_leave_status, leave_history


async def create_leave(payload: dict):
    return await apply_leave(payload)


async def approve_leave(leave_id: str, status: str):
    return await update_leave_status(leave_id, status)


async def get_leave_records(employee_id: str = None):
    return await leave_history(employee_id)
