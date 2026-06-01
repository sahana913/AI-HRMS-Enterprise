from pydantic import BaseModel


class InterviewCreate(BaseModel):
    candidate_id: str
    interviewer: str
    interview_date: str
    mode: str
    status: str = "scheduled"


class InterviewOut(InterviewCreate):
    id: str