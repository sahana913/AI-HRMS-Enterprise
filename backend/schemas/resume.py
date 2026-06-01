from pydantic import BaseModel


class ResumeMeta(BaseModel):
    candidate_id: str
    file_name: str
    extracted_text: str
    uploaded_at: str
