from pydantic import BaseModel
from typing import List, Optional


class JobCreate(BaseModel):
    job_title: str
    required_skills: List[str]
    description: str


class JobOut(JobCreate):
    id: str
    status: Optional[str] = "open"
