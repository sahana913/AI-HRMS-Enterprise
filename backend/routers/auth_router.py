from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError
from schemas.auth import UserCreate, Token
from controllers.auth_controller import register, login
from middleware.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()


@router.post("/register", response_model=dict)
async def register_user(user: UserCreate):
    try:
        created = await register(user.name, user.email, user.password, user.role)
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not available. Start MongoDB and retry.")
    except PyMongoError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database error during registration.")

    if created is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered or invalid password")
    return created


@router.post("/login")
async def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        token_data = await login(form_data.username, form_data.password)
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not available. Start MongoDB and retry.")
    except PyMongoError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database error during login.")

    if token_data is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return token_data



@router.get("/me")
async def get_profile(user: dict = Depends(get_current_user)):
    user_id = str(user.get("id") or user.get("_id") or "")
    username = user.get("username") or user.get("name") or user.get("email")
    profile_image = user.get("profileImage") or user.get("profile_image") or user.get("avatar") or ""
    return {
        "id": user_id,
        "userId": user_id,
        "username": username,
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "employee"),
        "profileImage": profile_image,
    }
