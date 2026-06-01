import os
import bcrypt
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from database.connection import db
from serializers import serialize_mongo

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET", "supersecretkey123")
if os.getenv("APP_MODE", "development").lower() == "production" and SECRET_KEY == "supersecretkey123":
    raise RuntimeError("JWT_SECRET must be configured in production.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ROLE_ALIASES = {
    "administrator": "super_admin",
    "super admin": "super_admin",
    "super_admin": "super_admin",
    "super-admin": "super_admin",
    "admin": "super_admin",
    "executive": "super_admin",
    "senior manager": "senior_manager",
    "senior_manager": "senior_manager",
    "senior-manager": "senior_manager",
    "manager": "senior_manager",
    "lead": "senior_manager",
    "hr manager": "hr_recruiter",
    "hr_admin": "hr_recruiter",
    "hr recruiter": "hr_recruiter",
    "hr_recruiter": "hr_recruiter",
    "hr-recruiter": "hr_recruiter",
    "recruiter": "hr_recruiter",
    "hr": "hr_recruiter",
    "employee": "employee",
    "staff": "employee",
    "candidate": "candidate",
    "applicant": "candidate",
}

ROLE_PERMISSIONS = {
    "super_admin": {
        "dashboard:super_admin",
        "employees:manage",
        "employees:read",
        "roles:manage",
        "permissions:manage",
        "organization:manage",
        "users:manage",
        "departments:manage",
        "payroll:manage",
        "attendance:all",
        "attendance:own",
        "leave:analytics",
        "leave:approve",
        "leave:own",
        "analytics:workforce",
        "analytics:all",
        "analytics:team",
        "analytics:recruiting",
        "audit:read",
        "security:manage",
        "system:manage",
        "notifications:manage",
        "notifications:read",
        "projects:manage",
        "projects:own",
        "candidates:manage",
        "ats:manage",
        "ai:screen",
        "interviews:manage",
        "interviews:own",
        "jobs:manage",
        "offers:manage",
        "budget:manage",
        "workforce:plan",
        "performance:manage",
        "performance:team",
        "performance:own",
        "goals:team",
        "goals:own",
        "resources:allocate",
        "training:manage",
        "training:own",
        "onboarding:manage",
        "profile:own",
        "ai:candidate",
        "resume:own",
        "career:own",
        "applications:own",
        "jobs:saved",
        "jobs:match",
    },
    "senior_manager": {
        "dashboard:senior_manager",
        "team:manage",
        "workforce:plan",
        "performance:team",
        "performance:manage",
        "goals:team",
        "resources:allocate",
        "budget:manage",
        "leave:approve",
        "analytics:team",
        "hiring_requests:create",
        "projects:manage",
        "projects:own",
        "notifications:manage",
        "notifications:read",
        "attendance:team",
        "employees:read",
        "applications:own",
    },
    "hr_recruiter": {
        "dashboard:hr_recruiter",
        "jobs:manage",
        "candidates:manage",
        "interviews:manage",
        "ats:manage",
        "ai:screen",
        "offers:manage",
        "training:manage",
        "onboarding:manage",
        "analytics:recruiting",
        "notifications:manage",
        "notifications:read",
        "resume:own",
        "applications:own",
        "onboarding:own",
    },
    "employee": {
        "dashboard:employee",
        "attendance:own",
        "leave:own",
        "payroll:own",
        "performance:own",
        "goals:own",
        "training:own",
        "projects:own",
        "announcements:read",
        "notifications:read",
        "profile:own",
        "career:own",
        "resume:own",
        "applications:own",
    },
    "candidate": {
        "dashboard:candidate",
        "resume:own",
        "ai:candidate",
        "applications:own",
        "jobs:saved",
        "jobs:match",
        "interviews:own",
        "career:own",
        "notifications:read",
        "profile:own",
    },
}


def normalize_role(role: str) -> str:
    value = str(role or "").strip().lower()
    return ROLE_ALIASES.get(value, value or "employee")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return serialize_mongo(user)


def require_role(*allowed_roles):
    async def role_checker(user: dict = Depends(get_current_user)):
        normalized_role = normalize_role(user.get("role", ""))
        normalized_allowed = {normalize_role(role) for role in allowed_roles}
        if normalized_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user
    return role_checker


def has_permission(role: str, permission: str) -> bool:
    if not permission:
        return True
    return permission in ROLE_PERMISSIONS.get(normalize_role(role), set())


def require_permission(permission: str):
    async def permission_checker(user: dict = Depends(get_current_user)):
        if not has_permission(user.get("role", ""), permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user
    return permission_checker


def user_role(user: dict) -> str:
    return normalize_role(user.get("role", "employee"))


def assert_role(user: dict, *allowed_roles):
    normalized_role = user_role(user)
    normalized_allowed = {normalize_role(role) for role in allowed_roles}
    if normalized_role not in normalized_allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user
