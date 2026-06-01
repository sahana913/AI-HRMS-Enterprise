from pydantic import BaseModel
from typing import Optional


class LeaveRequestCreate(BaseModel):
    employee_id: str
    leave_type: str
    start_date: str
    end_date: str
    reason: str


class LeaveRequestUpdate(BaseModel):
    status: str
    approver_notes: Optional[str] = None
