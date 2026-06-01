from pydantic import BaseModel
from typing import Optional


class AttendanceEntry(BaseModel):
    employee_id: str
    check_in: str
    check_out: Optional[str] = None
    date: str


class AttendanceAction(BaseModel):
    employee_id: str
