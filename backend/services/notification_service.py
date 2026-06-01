from datetime import datetime
from database.connection import db
from serializers import serialize_mongo


async def list_notifications(limit: int = 10):
    cursor = db.notifications.find().sort("created_at", -1).limit(limit)
    return [serialize_mongo(notification) async for notification in cursor]


async def create_notification(message: str, type: str = "info"):
    notification = {
        "message": message,
        "type": type,
        "created_at": datetime.utcnow().isoformat()
    }
    result = await db.notifications.insert_one(notification)
    notification["id"] = str(result.inserted_id)
    return serialize_mongo(notification)
