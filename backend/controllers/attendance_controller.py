from services.attendance_service import check_in, check_out, attendance_history


async def handle_check_in(employee_id: str):
    return await check_in(employee_id)


async def handle_check_out(employee_id: str):
    return await check_out(employee_id)


async def get_attendance(employee_id: str):
    return await attendance_history(employee_id)
