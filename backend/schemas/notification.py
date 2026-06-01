from pydantic import BaseModel


class NotificationCreate(BaseModel):
    message: str
    type: str


class NotificationOut(NotificationCreate):
    id: str
    created_at: str
