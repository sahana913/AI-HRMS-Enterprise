from database.connection import db
from middleware.auth import get_password_hash, normalize_role, verify_password, create_access_token
from datetime import datetime
from pymongo.errors import DuplicateKeyError
from serializers import serialize_mongo


def normalize_email(email: str) -> str:
    return email.strip().lower()


async def get_user_by_email(email: str):
    return await db.users.find_one({"email": normalize_email(email)})


async def register_user(name: str, email: str, password: str, role: str = "employee"):
    email = normalize_email(email)
    role = normalize_role(role)
    existing = await get_user_by_email(email)
    if existing:
        return None
    
    # Validate password
    if not validate_password(password):
        return None
    
    user = {
        "name": name.strip(),
        "email": email,
        "password": get_password_hash(password),
        "role": role,
        "created_at": datetime.utcnow().isoformat()
    }
    try:
        result = await db.users.insert_one(user)
    except DuplicateKeyError:
        return None
    user["id"] = str(result.inserted_id)
    return serialize_mongo(user)


async def authenticate_user(email: str, password: str):
    user = await get_user_by_email(normalize_email(email))
    if not user or not verify_password(password, user["password"]):
        return None
    return user


def build_token_response(user: dict):
    role = normalize_role(user.get("role", "hr"))
    token = create_access_token({"sub": user["email"], "role": role})
    user_id = str(user.get("id") or user.get("_id") or user.get("email"))
    username = user.get("username") or user.get("name") or user.get("email")
    profile_image = user.get("profileImage") or user.get("profile_image") or user.get("avatar") or ""
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "userId": user_id, "username": username, "name": user["name"], "email": user["email"], "role": role, "profileImage": profile_image},
    }


def validate_password(password: str) -> bool:
    """Validate password meets minimum requirements"""
    if len(password) < 8:
        return False
    if not any(c.isupper() for c in password):
        return False
    if not any(c.islower() for c in password):
        return False
    if not any(c.isdigit() for c in password):
        return False
    return True

