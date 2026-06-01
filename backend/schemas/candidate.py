from pydantic import BaseModel, EmailStr
from typing import List, Optional


class CandidateCreate(BaseModel):
    candidate_name: str
    email: EmailStr
    skills: List[str]
    resume_score: float
    ai_recommendation: str
    status: str = "pending"
    job_id: Optional[str]


class CandidateOut(CandidateCreate):
    id: str


class ResumeUploadResponse(BaseModel):
    score: float
    summary: str
    decision: str
