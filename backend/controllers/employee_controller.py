from services.employee_service import list_employees, add_employee, update_employee, delete_employee


async def get_employees():
    return await list_employees()


async def create_employee(payload: dict):
    return await add_employee(payload)


async def edit_employee(employee_id: str, payload: dict):
    return await update_employee(employee_id, payload)


async def remove_employee(employee_id: str):
    return await delete_employee(employee_id)
