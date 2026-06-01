from pydantic import BaseModel, Field
from typing import Optional, List


class EmployeeBase(BaseModel):
    name: str
    email: str
    department: str
    designation: str
    joining_date: str
    status: str = "active"


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    name: Optional[str]
    email: Optional[str]
    department: Optional[str]
    designation: Optional[str]
    status: Optional[str]


class EmployeeOut(EmployeeBase):
    id: str = Field(..., alias="_id")
    attendance: List[dict] = []
