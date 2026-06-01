from fastapi import APIRouter, Depends, HTTPException, status
from controllers.employee_controller import get_employees, create_employee, edit_employee, remove_employee
from middleware.auth import require_permission

router = APIRouter()


@router.get("/")
async def employees(user: dict = Depends(require_permission("employees:read"))):
    return await get_employees()


@router.post("/add")
async def add_employee(payload: dict, user: dict = Depends(require_permission("employees:manage"))):
    return await create_employee(payload)


@router.put("/update/{employee_id}")
async def update_employee(employee_id: str, payload: dict, user: dict = Depends(require_permission("employees:manage"))):
    employee = await edit_employee(employee_id, payload)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


@router.delete("/delete/{employee_id}")
async def delete_employee(employee_id: str, user: dict = Depends(require_permission("employees:manage"))):
    return await remove_employee(employee_id)
