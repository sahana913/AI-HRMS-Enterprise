from fastapi import APIRouter, Depends
from services.notification_service import list_notifications, create_notification
from middleware.auth import get_current_user, require_permission

router = APIRouter()


@router.get("/")
async def notifications(user: dict = Depends(get_current_user)):
    return await list_notifications()


@router.post("/create")
async def create_alert(payload: dict, user: dict = Depends(require_permission("notifications:manage"))):
    return await create_notification(payload.get("message", "New notification"), payload.get("type", "info"))
