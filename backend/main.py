import asyncio
import random
import re
import os
import uuid
import hashlib
import hmac
import secrets
import shutil
import io
import time
import zipfile
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path

from bson import ObjectId
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Body, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.responses import FileResponse, PlainTextResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from dotenv import load_dotenv
from pymongo.errors import DuplicateKeyError
from database.connection import close_database, configure_indexes, db
from middleware.auth import get_current_user, get_password_hash, has_permission, user_role, verify_password

# Import Modular Routers
from routers.auth_router import router as auth_router
from routers.employee_router import router as employee_router
from routers.ai_router import router as ai_router
from routers.attendance_router import router as attendance_router
from routers.leave_router import router as leave_router
from routers.interview_router import router as interview_router
from routers.candidate_router import router as candidate_router
from routers.notification_router import router as notification_router
from routers.analytics_router import router as analytics_router
from routers.admin_router import router as admin_router
from routers.projects_router import router as projects_router
from routers.rbac_router import router as rbac_router
from routers.enterprise_router import router as enterprise_router

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
if os.getenv("DEBUG_STARTUP", "false").lower() == "true":
    print("Startup config loaded.")

# Email libraries
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

try:
    import resend
except ImportError:
    resend = None

# --- CONFIGURATION ---
SECRET_KEY = os.getenv("JWT_SECRET", "supersecretkey123")
if os.getenv("APP_MODE", "development").lower() == "production" and SECRET_KEY == "supersecretkey123":
    raise RuntimeError("JWT_SECRET must be configured in production.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
DEV_MODE = os.getenv("APP_MODE", "development").lower() != "production"
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
RESUME_UPLOAD_DIR = UPLOAD_DIR / "resumes"
BULK_STAGING_DIR = UPLOAD_DIR / "bulk_staging"
PROFILE_IMAGE_UPLOAD_DIR = UPLOAD_DIR / "profile_images"
DOCUMENT_UPLOAD_DIR = UPLOAD_DIR / "documents"
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx"}
ALLOWED_BULK_EXTENSIONS = ALLOWED_RESUME_EXTENSIONS | {".zip"}
ALLOWED_RESUME_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
}
MAX_RESUME_FILE_SIZE = int(os.getenv("MAX_RESUME_FILE_SIZE", str(10 * 1024 * 1024)))
MAX_BULK_ARCHIVE_SIZE = int(os.getenv("MAX_BULK_ARCHIVE_SIZE", str(2 * 1024 * 1024 * 1024)))
MAX_BULK_RESUME_COUNT = int(os.getenv("MAX_BULK_RESUME_COUNT", "10000"))
ATS_BATCH_CONCURRENCY = int(os.getenv("ATS_BATCH_CONCURRENCY", "5"))
REALTIME_HEARTBEAT_SECONDS = int(os.getenv("REALTIME_HEARTBEAT_SECONDS", "25"))
DASHBOARD_CACHE_SECONDS = int(os.getenv("DASHBOARD_CACHE_SECONDS", "20"))
_cache = {}
_ats_worker_semaphore = asyncio.Semaphore(max(1, ATS_BATCH_CONCURRENCY))


def cache_get(key: str):
    item = _cache.get(key)
    if not item:
        return None
    expires_at, value = item
    if datetime.utcnow() > expires_at:
        _cache.pop(key, None)
        return None
    return value


def cache_set(key: str, value, ttl_seconds: int = DASHBOARD_CACHE_SECONDS):
    _cache[key] = (datetime.utcnow() + timedelta(seconds=ttl_seconds), value)
    return value


def cache_delete_prefix(prefix: str):
    for key in list(_cache):
        if key.startswith(prefix):
            _cache.pop(key, None)


class RealtimeManager:
    def __init__(self):
        self.connections = {}

    async def connect(self, websocket: WebSocket, user_key: str):
        await websocket.accept()
        self.connections.setdefault(user_key, set()).add(websocket)

    def disconnect(self, websocket: WebSocket, user_key: str):
        sockets = self.connections.get(user_key)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self.connections.pop(user_key, None)

    async def broadcast(self, payload: dict, user_key: str = None):
        targets = []
        if user_key:
            targets.extend(self.connections.get(user_key, set()))
        targets.extend(self.connections.get("*", set()))
        stale = []
        for websocket in targets:
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            for key in list(self.connections):
                self.disconnect(websocket, key)


realtime = RealtimeManager()


def ensure_upload_directories():
    for directory in (UPLOAD_DIR, RESUME_UPLOAD_DIR, BULK_STAGING_DIR, PROFILE_IMAGE_UPLOAD_DIR, DOCUMENT_UPLOAD_DIR):
        os.makedirs(directory, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_upload_directories()
        await configure_indexes()
        print("Database ready.")
    except Exception as e:
        print(f"Database startup warning: {e}")
    # Preload AI model in background — server stays responsive immediately
    try:
        from ai_module.processor import preload_embedding_model
        asyncio.create_task(preload_embedding_model())
        print("[AI] Embedding model preloading in background...")
    except Exception as e:
        print(f"[AI] Model preload skipped: {e}")
    yield
    close_database()


app = FastAPI(title="AI-Powered HRMS Production API", lifespan=lifespan)

# Security Setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# In-memory OTP storage
otp_store = {}

# CORS Configuration
cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
if not cors_origins:
    cors_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^(http://(localhost|127\.0\.0\.1):\d+|https://[a-zA-Z0-9-]+\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Modular Routers
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(employee_router, prefix="/api/employees", tags=["Employees"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI"])
app.include_router(attendance_router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(leave_router, prefix="/api/leave", tags=["Leave"])
app.include_router(interview_router, prefix="/api/interviews", tags=["Interviews"])
app.include_router(candidate_router, prefix="/api/candidates", tags=["Candidates"])
app.include_router(notification_router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(rbac_router, prefix="/api/rbac", tags=["RBAC"])
app.include_router(enterprise_router, prefix="/api/enterprise", tags=["Enterprise CRUD"])

# Coexist with hardcoded analytics summary but mount other analytics if needed
app.include_router(analytics_router, prefix="/api/v2/analytics", tags=["Analytics V2"])

print("FastAPI routes ready. AI models will lazy-load on first AI request.")


async def user_from_token_value(token: str):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        user = await db.users.find_one({"email": email})
        return user
    except JWTError:
        return None


@app.websocket("/api/realtime/ws")
async def realtime_ws(websocket: WebSocket):
    token = websocket.query_params.get("token", "")
    user = await user_from_token_value(token)
    if not user:
        await websocket.close(code=1008)
        return
    user_key = str(user.get("email"))
    await realtime.connect(websocket, user_key)
    try:
        await websocket.send_json({"type": "connected", "scope": "user", "email": user_key})
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_json({"type": "pong", "ts": datetime.utcnow().isoformat()})
    except WebSocketDisconnect:
        realtime.disconnect(websocket, user_key)

# --- UTILS ---

def send_real_email(receiver_email, otp_code):
    """Sends a professional HTML email using Resend or SMTP."""
    html_content = f"""
        <div style=\"font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;\">
            <h2 style=\"color: #2563eb;\">AI-HRMS Verification</h2>
            <p>Welcome! Use the following code to activate your account:</p>
            <div style=\"font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e293b; padding: 10px 0;\">
                {otp_code}
            </div>
            <p style=\"color: #64748b; font-size: 12px;\">This code will expire in 5 minutes.</p>
        </div>
    """
    text_content = f"Your verification code is: {otp_code}\n\nThis code will expire in 5 minutes."

    resend_api_key = os.getenv("RESEND_API_KEY")
    if resend and resend_api_key:
        try:
            resend.api_key = resend_api_key
            resend.Emails.send({
                "from": os.getenv("RESEND_FROM_EMAIL", "HRMS Verification <onboarding@resend.dev>"),
                "to": [receiver_email],
                "subject": f"Your Verification Code: {otp_code}",
                "html": html_content,
                "text": text_content,
            })
            return True
        except Exception as e:
            print(f"Resend API error: {e}")

    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not sender_email or not sender_password:
        print("SMTP credentials not configured. Set SMTP_EMAIL and SMTP_PASSWORD.")
        return False

    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Your Verification Code: {otp_code}"
        message["From"] = sender_email
        message["To"] = receiver_email

        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        message.attach(part1)
        message.attach(part2)

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, receiver_email, message.as_string())

        return True
    except Exception as e:
        print(f"SMTP email error: {e}")
        return False

def validate_password(password: str):
    if len(password) < 8:
        return False, "Password must be 8+ characters."
    if not re.search("[A-Z]", password):
        return False, "Add at least one uppercase letter."
    if not re.search("[0-9]", password):
        return False, "Add at least one number."
    return True, ""

def normalize_email(email: str) -> str:
    return email.strip().lower()

def is_valid_email(email: str) -> bool:
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email))

def generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"

def hash_otp(email: str, otp: str) -> str:
    payload = f"{normalize_email(email)}:{otp}".encode("utf-8")
    return hmac.new(SECRET_KEY.encode("utf-8"), payload, hashlib.sha256).hexdigest()

def cleanup_expired_otps():
    now = datetime.utcnow()
    expired = [email for email, data in otp_store.items() if now > data["expires"]]
    for email in expired:
        del otp_store[email]

def verify_otp_code(email: str, otp: str, consume: bool = False):
    email = normalize_email(email)
    cleanup_expired_otps()
    data = otp_store.get(email)
    if not data:
        return False, "Invalid or expired OTP code."

    if data.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        del otp_store[email]
        return False, "Too many OTP attempts. Please request a new code."

    expected = data["otp_hash"]
    provided = hash_otp(email, otp.strip())
    if not hmac.compare_digest(expected, provided):
        data["attempts"] = data.get("attempts", 0) + 1
        return False, "Invalid or expired OTP code."

    if consume:
        del otp_store[email]
    return True, ""

def get_embedding_model():
    return None

def lexical_match_score(jd: str, resume_text: str) -> float:
    jd_terms = set(re.findall(r"[a-zA-Z][a-zA-Z+#.-]{2,}", jd.lower()))
    resume_terms = set(re.findall(r"[a-zA-Z][a-zA-Z+#.-]{2,}", resume_text.lower()))
    if not jd_terms or not resume_terms:
        return 0.0
    overlap = len(jd_terms & resume_terms)
    return round(min(100.0, (overlap / max(len(jd_terms), 1)) * 100), 2)

def semantic_match_score(jd: str, resume_text: str) -> float:
    model = get_embedding_model()
    if not model:
        return lexical_match_score(jd, resume_text)
    from sentence_transformers import util
    embs = model.encode([jd, resume_text])
    return round(float(util.cos_sim(embs[0], embs[1])) * 100, 2)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- AUTH ROUTES ---

@app.post("/send-otp")
async def send_otp(email: str = Form(...)):
    email = normalize_email(email)
    cleanup_expired_otps()

    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email is already registered.")

    otp = generate_otp_code()
    otp_store[email] = {
        "otp_hash": hash_otp(email, otp),
        "expires": datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES),
        "attempts": 0,
    }
    
    # Send via Resend API
    email_sent = send_real_email(email, otp)
    
    # Print to terminal as a backup
    print(f"\n[AI-HRMS LOG] OTP for {email}: {otp}\n")
    
    if not email_sent:
        return {
            "message": f"OTP generated. Email service unavailable. [DEV ONLY] OTP is: {otp}",
            "status": "fallback",
            "expires_in_minutes": OTP_EXPIRE_MINUTES,
            "otp": otp,
        }
    
    return {
        "message": "OTP sent to your email address",
        "status": "sent",
        "expires_in_minutes": OTP_EXPIRE_MINUTES,
    }

@app.post("/verify-otp")
async def verify_otp(email: str = Form(...), otp: str = Form(...)):
    email = normalize_email(email)
    ok, message = verify_otp_code(email, otp, consume=False)
    if not ok:
        raise HTTPException(status_code=400, detail=message)
    return {"message": "OTP verified successfully", "status": "verified"}

@app.post("/register")
async def register(
    name: str = Form(...), 
    email: str = Form(...), 
    password: str = Form(...),
    otp: str = Form(...)
):
    email = normalize_email(email)
    ok, message = verify_otp_code(email, otp, consume=False)
    if not ok:
        raise HTTPException(status_code=400, detail=message)
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email is already registered.")
    
    valid, msg = validate_password(password)
    if not valid: raise HTTPException(status_code=400, detail=msg)

    hashed_password = get_password_hash(password)
    try:
        await db.users.insert_one({
            "name": name.strip(), 
            "email": email, 
            "password": hashed_password,
            "role": "HR Manager",
            "created_at": datetime.utcnow()
        })
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email is already registered.")
    
    verify_otp_code(email, otp, consume=True)
    return {"message": "Account activated successfully!"}

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    email = normalize_email(form_data.username)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid login details")
    
    token = create_access_token(data={"sub": user["email"]})
    return {
        "access_token": token, 
        "token_type": "bearer",
        "user": {"name": user["name"], "email": user["email"], "role": user.get("role", "HR Manager")}
    }

# --- AI & ANALYTICS ---

def safe_filename_part(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", value or "resume").strip("._-")
    return cleaned[:80] or "resume"


def validate_resume_upload(upload: UploadFile):
    original = upload.filename or ""
    extension = Path(original).suffix.lower()
    if extension not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"{original or 'File'} is not supported. Upload PDF or DOCX resumes only.")
    content_type = (upload.content_type or "").lower()
    if content_type and content_type not in ALLOWED_RESUME_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"{original} has an unsupported content type.")
    blocked = {".exe", ".bat", ".cmd", ".sh", ".js", ".msi", ".dll", ".ps1", ".vbs", ".scr", ".com"}
    if extension in blocked or any(original.lower().endswith(item) for item in blocked):
        raise HTTPException(status_code=400, detail="Executable uploads are not allowed.")


def validate_resume_file_signature(filename: str, file_bytes: bytes):
    extension = Path(filename or "").suffix.lower()
    if extension == ".pdf" and not file_bytes.lstrip()[:5] == b"%PDF-":
        raise HTTPException(status_code=400, detail=f"{filename} is not a valid PDF resume.")
    if extension == ".docx" and not zipfile.is_zipfile(io.BytesIO(file_bytes)):
        raise HTTPException(status_code=400, detail=f"{filename} is not a valid DOCX resume.")


async def save_resume_upload(upload: UploadFile, owner: str) -> dict:
    validate_resume_upload(upload)
    original_filename = upload.filename or "resume"
    file_bytes = await upload.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail=f"{original_filename} is empty.")
    if len(file_bytes) > MAX_RESUME_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"{original_filename} exceeds the maximum resume size.")
    validate_resume_file_signature(original_filename, file_bytes)

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_id = uuid.uuid4().hex[:12]
    extension = Path(original_filename).suffix.lower()
    stem = safe_filename_part(Path(original_filename).stem)
    stored_filename = f"resume_{timestamp}_{unique_id}_{stem}{extension}"
    file_path = RESUME_UPLOAD_DIR / stored_filename

    ensure_upload_directories()
    with open(file_path, "wb") as target:
        shutil.copyfileobj(io.BytesIO(file_bytes), target)

    file_hash = hashlib.sha256(file_bytes).hexdigest()
    duplicate = await db.resume_profiles.find_one({"owner": owner, "file_hash": file_hash}, {"_id": 1, "stored_filename": 1})

    return {
        "original_filename": original_filename,
        "stored_filename": stored_filename,
        "file_path": str(file_path),
        "file_size": len(file_bytes),
        "file_hash": file_hash,
        "file_bytes": file_bytes,
        "duplicate_of": str(duplicate["_id"]) if duplicate else None,
        "is_duplicate": bool(duplicate),
    }


def serialize_resume_profile(doc: dict):
    if not doc:
        return None
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    doc.pop("file_hash", None)
    return doc


def stored_resume_path(doc: dict) -> Path:
    path = Path(doc.get("file_path", ""))
    try:
        resolved = path.resolve()
        base = RESUME_UPLOAD_DIR.resolve()
    except OSError:
        raise HTTPException(status_code=404, detail="Stored file not found")
    if base not in resolved.parents and resolved != base:
        raise HTTPException(status_code=403, detail="Invalid file path")
    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="Stored file not found")
    return resolved


def parse_datetime_value(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            return None
    return None


def numeric(value, default=0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def NumberLike(value, default=0):
    return numeric(value, default)


def normalize_pipeline_stage(value: str) -> str:
    normalized = str(value or "").strip().lower().replace("_", " ")
    mapping = {
        "applied": "Applied",
        "screening": "ATS Screened",
        "ats screened": "ATS Screened",
        "shortlisted": "Shortlisted",
        "interview scheduled": "Interview Scheduled",
        "interviewed": "Technical Round",
        "technical": "Technical Round",
        "technical round": "Technical Round",
        "hr": "HR Round",
        "hr round": "HR Round",
        "selected": "Selected",
        "rejected": "Rejected",
        "pending": "Applied",
        "pending review": "ATS Screened",
    }
    return mapping.get(normalized, "Applied")


async def log_candidate_analytics_event(owner: str, event: str, **metadata):
    if not owner:
        return
    await db.analytics.insert_one({
        "owner": owner,
        "candidate_email": owner,
        "scope": "candidate",
        "event": event,
        **{key: value for key, value in metadata.items() if value is not None},
        "created_at": now_iso(),
    })


async def collect_candidate_dashboard(owner: str) -> dict:
    pipeline_stages = [
        "Applied",
        "ATS Screened",
        "Shortlisted",
        "Interview Scheduled",
        "Technical Round",
        "HR Round",
        "Selected",
        "Rejected",
    ]
    colors = ["#2563EB", "#0891B2", "#7C3AED", "#0D9488", "#F59E0B", "#EC4899", "#059669", "#E11D48"]

    candidate_query = {"email": owner}
    candidates = [doc async for doc in db.candidates.find(candidate_query).sort("created_at", -1).limit(100)]
    candidate_ids = [str(doc.get("_id")) for doc in candidates]
    application_ids = [doc.get("application_id") for doc in candidates if doc.get("application_id")]

    resume_query = {"owner": owner}
    resumes = [doc async for doc in db.resume_profiles.find(resume_query).sort("upload_timestamp", -1).limit(100)]
    builder_resumes = [doc async for doc in db.resumes.find({"owner": owner}).sort("updated_at", -1).limit(100)]
    resume_ids = [str(doc.get("_id")) for doc in resumes]

    app_query = {
        "$or": [
            {"hr": owner},
            {"owner": owner},
            {"candidate_email": owner},
            {"email": owner},
            {"candidate_id": {"$in": candidate_ids}},
            {"_id": {"$in": [ObjectId(item) for item in application_ids if ObjectId.is_valid(str(item))]}},
        ]
    }
    applications = [doc async for doc in db.applications.find(app_query).sort("date", -1).limit(200)]

    report_query = {
        "$or": [
            {"hr": owner},
            {"owner": owner},
            {"resume_profile_id": {"$in": resume_ids}},
            {"candidate_id": {"$in": candidate_ids}},
            {"application_id": {"$in": [str(doc.get("_id")) for doc in applications]}},
        ]
    }
    ats_reports = [doc async for doc in db.ats_reports.find(report_query).sort("created_at", -1).limit(100)]
    latest_report = ats_reports[0] if ats_reports else {}
    latest_resume = resumes[0] if resumes else {}

    interview_query = {
        "$or": [
            {"candidate_id": {"$in": candidate_ids}},
            {"candidate_email": owner},
            {"email": owner},
            {"owner": owner},
        ]
    }
    interviews = [doc async for doc in db.interviews.find(interview_query).sort("interview_date", 1).limit(100)]

    saved_query = {"$or": [{"owner": owner}, {"user_email": owner}, {"email": owner}, {"candidate_email": owner}]}
    saved_jobs = [doc async for doc in db.saved_jobs.find(saved_query).sort("created_at", -1).limit(100)]
    saved_job_ids = {str(doc.get("job_id") or doc.get("jobId") or "") for doc in saved_jobs}
    applied_job_ids = {str(doc.get("job_id") or doc.get("jobId") or "") for doc in applications}

    candidate_skills = set()
    for source in [latest_resume, *resumes, *candidates]:
        skills = source.get("extracted_skills") or source.get("skills") or []
        if isinstance(skills, str):
            skills = [item.strip() for item in skills.split(",")]
        candidate_skills.update(str(item).lower() for item in skills if item)

    latest_scores = latest_report.get("scores", {}) if latest_report else {}
    latest_ats_score = numeric(latest_resume.get("ats_score"), numeric(latest_scores.get("ats"), 0))
    semantic_score = numeric(latest_resume.get("semantic_score"), numeric(latest_scores.get("semantic"), 0))
    keyword_match = numeric(latest_resume.get("keyword_match"), numeric(latest_scores.get("keyword_match"), 0))
    missing_keywords = latest_report.get("missing_keywords") or latest_resume.get("missing_skills") or []
    matched_keywords = latest_report.get("matched_keywords") or []
    suggestions = latest_report.get("suggestions") or []

    pipeline_counts = {stage: 0 for stage in pipeline_stages}
    for app in applications:
        stage = normalize_pipeline_stage(app.get("stage") or app.get("status"))
        pipeline_counts[stage] += 1

    pipeline = [
        {"name": stage, "value": pipeline_counts[stage], "fill": colors[index]}
        for index, stage in enumerate(pipeline_stages)
    ]

    upcoming = []
    completed = 0
    now = datetime.utcnow()
    for item in interviews:
        interview_dt = parse_datetime_value(item.get("interview_date") or item.get("created_at"))
        status = str(item.get("status") or "").lower()
        if status in {"completed", "feedback_submitted"} or (interview_dt and interview_dt < now):
            completed += 1
        else:
            upcoming.append(item)

    job_cursor = db.jobs.find({"status": {"$in": ["open", "Open", "active", "Active", "published", "Published"]}}).sort("created_at", -1).limit(100)
    job_matches = []
    async for job in job_cursor:
        raw_skills = job.get("skills") or job.get("required_skills") or job.get("technologies") or []
        if isinstance(raw_skills, str):
            raw_skills = [item.strip() for item in re.split(r"[,|]", raw_skills)]
        job_skills = {str(item).lower() for item in raw_skills if item}
        overlap = len(candidate_skills & job_skills)
        skill_base = len(job_skills) or max(len(candidate_skills), 1)
        skill_score = round((overlap / skill_base) * 100, 1) if skill_base else 0
        match_score = round((skill_score * 0.55) + (latest_ats_score * 0.25) + (semantic_score * 0.2), 1)
        probability = round(min(99, (match_score * 0.72) + (keyword_match * 0.18) + (10 if str(job.get("_id")) in saved_job_ids else 0)), 1)
        if match_score > 0:
            job_matches.append({
                "id": str(job.get("_id")),
                "role": job.get("title") or job.get("role") or job.get("name") or "Open role",
                "department": job.get("department", ""),
                "location": job.get("location", ""),
                "match": match_score,
                "probability": probability,
                "matched_skills": sorted(candidate_skills & job_skills),
                "missing_skills": sorted(job_skills - candidate_skills)[:8],
                "saved": str(job.get("_id")) in saved_job_ids,
                "applied": str(job.get("_id")) in applied_job_ids,
            })
    job_matches.sort(key=lambda item: item["match"], reverse=True)

    activity_sources = []
    def add_activity(collection_name, docs, date_keys):
        for doc in docs:
            for key in date_keys:
                parsed = parse_datetime_value(doc.get(key))
                if parsed:
                    activity_sources.append((collection_name, parsed.date().isoformat()))
                    break

    add_activity("applications", applications, ["date", "created_at", "updated_at"])
    add_activity("resumes", resumes, ["upload_timestamp", "updated_at"])
    add_activity("resume_builder", builder_resumes, ["updated_at", "created_at"])
    add_activity("ats_scans", ats_reports, ["created_at"])
    add_activity("interviews", interviews, ["interview_date", "created_at"])
    analytics_docs = [doc async for doc in db.analytics.find({"$or": [{"owner": owner}, {"email": owner}, {"candidate_email": owner}]}).sort("created_at", -1).limit(200)]
    add_activity("analytics", analytics_docs, ["created_at"])

    today = datetime.utcnow().date()
    heatmap = []
    for offset in range(29, -1, -1):
        day = today - timedelta(days=offset)
        day_key = day.isoformat()
        count = sum(1 for _, activity_day in activity_sources if activity_day == day_key)
        heatmap.append({"date": day_key, "count": count})
    weekly_activity = {}
    monthly_activity = {}
    for _, activity_day in activity_sources:
        parsed_day = parse_datetime_value(activity_day)
        if not parsed_day:
            continue
        week_key = f"{parsed_day.isocalendar().year}-W{parsed_day.isocalendar().week:02d}"
        month_key = parsed_day.strftime("%Y-%m")
        weekly_activity[week_key] = weekly_activity.get(week_key, 0) + 1
        monthly_activity[month_key] = monthly_activity.get(month_key, 0) + 1

    profile_strength = round(min(100, (latest_ats_score * 0.45) + (keyword_match * 0.25) + (min(len(candidate_skills), 12) / 12 * 20) + (10 if latest_resume.get("contact_details") else 0)), 1)
    recruiter_visibility = round(min(100, (latest_ats_score * 0.5) + (len(applications) * 6) + (len(saved_jobs) * 3) + (len(upcoming) * 5)), 1)
    market_competitiveness = round(min(100, (profile_strength * 0.45) + (semantic_score * 0.25) + ((job_matches[0]["match"] if job_matches else 0) * 0.3)), 1)
    hiring_probability = round(min(99, (recruiter_visibility * 0.35) + (market_competitiveness * 0.4) + (keyword_match * 0.25)), 1)

    recommendations = []
    if missing_keywords:
        recommendations.append(f"Add evidence for missing keywords: {', '.join(missing_keywords[:4])}.")
    if latest_ats_score and latest_ats_score < 75:
        recommendations.append("Improve ATS formatting and quantify role impact before applying to more jobs.")
    if not applications:
        recommendations.append("Submit applications to activate pipeline analytics and recruiter visibility tracking.")
    if not upcoming and applications:
        recommendations.append("Use interview prep once recruiters move an application into interview stages.")

    notifications = await db.notifications.count_documents({"$or": [{"owner": owner}, {"email": owner}, {"user_email": owner}], "read": {"$ne": True}})

    return {
        "stats": {
            "ats_score": round(latest_ats_score, 1),
            "job_matches": len(job_matches),
            "saved_jobs": len(saved_jobs),
            "upcoming_interviews": len(upcoming),
            "completed_interviews": completed,
            "applications": len(applications),
            "resumes": len(resumes) + len(builder_resumes),
            "notifications": notifications,
        },
        "ats": {
            "score": round(latest_ats_score, 1),
            "semantic_score": round(semantic_score, 1),
            "keyword_match": round(keyword_match, 1),
            "matched_skills": sorted(candidate_skills)[:16],
            "matched_keywords": matched_keywords[:16],
            "missing_keywords": missing_keywords[:16],
            "resume_strength": profile_strength,
            "recruiter_visibility": recruiter_visibility,
            "improvement_tips": suggestions[:8],
            "latest_resume": serialize_resume_profile(latest_resume) if latest_resume else None,
        },
        "pipeline": pipeline,
        "job_matches": job_matches[:12],
        "interviews": {
            "upcoming": [serialize_mongo_like(item) for item in upcoming[:6]],
            "completed": completed,
            "feedback_pending": sum(1 for item in interviews if not item.get("feedback") and str(item.get("status", "")).lower() not in {"cancelled"}),
        },
        "heatmap": heatmap,
        "activity_summary": {
            "daily": heatmap,
            "weekly": [{"period": key, "count": value} for key, value in sorted(weekly_activity.items())],
            "monthly": [{"period": key, "count": value} for key, value in sorted(monthly_activity.items())],
        },
        "ai_analytics": {
            "hiring_probability": hiring_probability,
            "profile_strength": profile_strength,
            "market_competitiveness": market_competitiveness,
            "recruiter_attention": recruiter_visibility,
            "skill_gap_count": len(missing_keywords),
            "career_recommendations": recommendations,
        },
    }


def serialize_mongo_like(doc: dict):
    output = dict(doc)
    if "_id" in output:
        output["id"] = str(output.pop("_id"))
    return output


class QueuedResumeUpload:
    def __init__(self, filename: str, file_bytes: bytes, content_type: str = "application/octet-stream"):
        self.filename = filename
        self.content_type = content_type
        self._file_bytes = file_bytes

    async def read(self):
        return self._file_bytes


class QueuedResumeFileUpload:
    def __init__(self, filename: str, file_path: str, content_type: str = "application/octet-stream"):
        self.filename = filename
        self.content_type = content_type
        self.file_path = file_path

    async def read(self):
        with open(self.file_path, "rb") as source:
            return source.read()


def bulk_content_type(filename: str) -> str:
    extension = Path(filename or "").suffix.lower()
    if extension == ".pdf":
        return "application/pdf"
    if extension == ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return "application/octet-stream"


def stage_batch_resume(batch_id: str, index: int, filename: str, source) -> str:
    ensure_upload_directories()
    safe_name = safe_filename_part(Path(filename or f"resume-{index}").stem)
    extension = Path(filename or "").suffix.lower()
    batch_dir = BULK_STAGING_DIR / safe_filename_part(batch_id)
    os.makedirs(batch_dir, exist_ok=True)
    staged_path = batch_dir / f"{index:06d}_{uuid.uuid4().hex[:10]}_{safe_name}{extension}"
    with open(staged_path, "wb") as target:
        shutil.copyfileobj(source, target)
    return str(staged_path)


def cleanup_staged_resume(file_path: str):
    if not file_path:
        return
    try:
        resolved = Path(file_path).resolve()
        base = BULK_STAGING_DIR.resolve()
        if base in resolved.parents and resolved.is_file():
            resolved.unlink(missing_ok=True)
            parent = resolved.parent
            if parent != base and not any(parent.iterdir()):
                parent.rmdir()
    except OSError:
        return


async def expand_bulk_resume_uploads(files: list[UploadFile], batch_id: str) -> list[dict]:
    expanded = []
    item_index = 0
    for upload in files:
        filename = upload.filename or "resume"
        extension = Path(filename).suffix.lower()
        if extension not in ALLOWED_BULK_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"{filename} is not supported. Upload PDF, DOCX, or ZIP files.")
        file_bytes = await upload.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail=f"{filename} is empty.")
        if extension == ".zip":
            if len(file_bytes) > MAX_BULK_ARCHIVE_SIZE:
                raise HTTPException(status_code=413, detail=f"{filename} exceeds the maximum ZIP upload size.")
            try:
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
                    for member in archive.infolist():
                        if member.is_dir():
                            continue
                        inner_name = Path(member.filename).name
                        inner_extension = Path(inner_name).suffix.lower()
                        if inner_extension not in ALLOWED_RESUME_EXTENSIONS:
                            continue
                        if member.file_size > MAX_RESUME_FILE_SIZE:
                            expanded.append({
                                "filename": inner_name,
                                "status": "failed",
                                "error": f"{inner_name} exceeds the maximum resume size.",
                            })
                            continue
                        item_index += 1
                        if item_index > MAX_BULK_RESUME_COUNT:
                            raise HTTPException(status_code=413, detail=f"Batch exceeds the maximum of {MAX_BULK_RESUME_COUNT} resumes.")
                        with archive.open(member) as source:
                            expanded.append({
                                "filename": inner_name,
                                "content_type": bulk_content_type(inner_name),
                                "file_path": stage_batch_resume(batch_id, item_index, inner_name, source),
                                "source_archive": filename,
                            })
            except zipfile.BadZipFile:
                raise HTTPException(status_code=400, detail=f"{filename} is not a valid ZIP archive.")
            continue
        item_index += 1
        if item_index > MAX_BULK_RESUME_COUNT:
            raise HTTPException(status_code=413, detail=f"Batch exceeds the maximum of {MAX_BULK_RESUME_COUNT} resumes.")
        expanded.append({
            "filename": filename,
            "content_type": upload.content_type or bulk_content_type(filename),
            "file_path": stage_batch_resume(batch_id, item_index, filename, io.BytesIO(file_bytes)),
            "source_archive": None,
        })
    return expanded


async def summarize_batch_counts(batch_id: str, total: int) -> dict:
    completed_items = [
        doc async for doc in db.ats_batch_items.find(
            {"batch_id": batch_id, "status": "completed"},
            {"decision": 1, "candidate_status": 1, "ats_score": 1},
        )
    ]
    failed = await db.ats_batch_items.count_documents({"batch_id": batch_id, "status": "failed"})
    queued = await db.ats_batch_items.count_documents({"batch_id": batch_id, "status": "queued"})
    processing_count = await db.ats_batch_items.count_documents({"batch_id": batch_id, "status": "processing"})
    processing = queued + processing_count
    shortlisted = sum(1 for item in completed_items if item.get("decision") in {"Selected", "Shortlist", "Shortlisted"} or item.get("candidate_status") == "shortlisted")
    rejected = sum(1 for item in completed_items if item.get("decision") == "Rejected" or item.get("candidate_status") == "rejected")
    review = max(0, len(completed_items) - shortlisted - rejected)
    interview_ready = sum(1 for item in completed_items if numeric(item.get("ats_score")) >= 75 and item.get("decision") != "Rejected")
    return {
        "total": total,
        "total_uploaded": total,
        "processed": len(completed_items),
        "completed": len(completed_items),
        "processing": processing,
        "failed": failed,
        "shortlisted": shortlisted,
        "review": review,
        "rejected": rejected,
        "interview_ready": interview_ready,
        "pending": max(0, total - len(completed_items) - failed),
        "processing_progress": round(((len(completed_items) + failed) / total) * 100, 1) if total else 0,
    }


async def refresh_ats_batch(batch_id: str, item_limit: int = 250):
    batch = await db.ats_batches.find_one({"batch_id": batch_id})
    if not batch:
        return None
    items = []
    projection = {"file_bytes": 0, "file_path": 0}
    async for doc in db.ats_batch_items.find({"batch_id": batch_id}, projection).sort("index", 1).limit(item_limit):
        items.append(serialize_mongo_like(doc))
    total = int(batch.get("total") or 0)
    summary = await summarize_batch_counts(batch_id, total)
    status = "completed" if summary["processed"] + summary["failed"] >= summary["total"] else "processing"
    if summary["failed"] and not summary["processed"] and summary["failed"] >= summary["total"]:
        status = "failed"
    update = {**summary, "status": status, "updated_at": now_iso()}
    if status in {"completed", "failed"}:
        update["completed_at"] = batch.get("completed_at") or now_iso()
    await db.ats_batches.update_one({"batch_id": batch_id}, {"$set": update})
    batch.update(update)
    ranking = [
        serialize_mongo_like(doc)
        async for doc in db.ats_batch_items.find({"batch_id": batch_id, "status": "completed"}, projection).sort("ats_score", -1).limit(item_limit)
    ]
    return {"batch": serialize_mongo_like(batch), "items": items, **summary, "results": items, "ranking": ranking}


async def process_batch_item(batch_id: str, item_id, jd: str, user_snapshot: dict):
    started = time.perf_counter()
    item = await db.ats_batch_items.find_one({"_id": item_id})
    if not item:
        return
    async with _ats_worker_semaphore:
        await db.ats_batch_items.update_one({"_id": item_id}, {"$set": {"status": "processing", "parsing_status": "queued", "started_at": now_iso(), "updated_at": now_iso()}})
        try:
            if item.get("file_path"):
                upload = QueuedResumeFileUpload(item["filename"], item["file_path"], item.get("content_type") or bulk_content_type(item["filename"]))
            else:
                upload = QueuedResumeUpload(item["filename"], item["file_bytes"], item.get("content_type") or bulk_content_type(item["filename"]))
            result = await process_stored_resume(jd, upload, user_snapshot)
            score = NumberLike(result.get("ats", {}).get("ats_score") or result.get("score") or 0)
            candidate_status = "shortlisted" if result.get("decision") in {"Selected", "Shortlist", "Shortlisted"} else "rejected" if result.get("decision") == "Rejected" else "review"
            interview_ready = score >= 75 and result.get("decision") != "Rejected"
            update = {
                "status": "completed",
                "parsing_status": result.get("resume_file", {}).get("parsing_status", "completed"),
                "score": result.get("score", 0),
                "ats_score": score,
                "decision": result.get("decision"),
                "candidate_status": candidate_status,
                "skills": result.get("skills", []),
                "summary": result.get("summary", ""),
                "ats": result.get("ats", {}),
                "resume_file": result.get("resume_file", {}),
                "candidate_id": result.get("resume_file", {}).get("candidate_id"),
                "interview_ready": interview_ready,
                "duration_seconds": round(time.perf_counter() - started, 2),
                "completed_at": now_iso(),
                "updated_at": now_iso(),
            }
            await db.ats_batch_items.update_one({"_id": item_id}, {"$set": update, "$unset": {"file_bytes": "", "file_path": ""}})
            inc = {"processed": 1, "pending": -1}
            if candidate_status == "shortlisted":
                inc["shortlisted"] = 1
            elif candidate_status == "rejected":
                inc["rejected"] = 1
            else:
                inc["review"] = 1
            if interview_ready:
                inc["interview_ready"] = 1
            await db.ats_batches.update_one({"batch_id": batch_id}, {"$inc": inc, "$set": {"status": "processing", "updated_at": now_iso()}})
        except Exception as exc:
            await db.ats_batch_items.update_one(
                {"_id": item_id},
                {"$set": {"status": "failed", "parsing_status": "failed", "error": str(exc) if DEV_MODE else "AI Processing Error", "duration_seconds": round(time.perf_counter() - started, 2), "updated_at": now_iso()}, "$unset": {"file_bytes": "", "file_path": ""}},
            )
            await db.ats_batches.update_one({"batch_id": batch_id}, {"$inc": {"failed": 1, "pending": -1}, "$set": {"status": "processing", "updated_at": now_iso()}})
        finally:
            cleanup_staged_resume(item.get("file_path"))
        batch = await db.ats_batches.find_one({"batch_id": batch_id}, {"total": 1, "processed": 1, "failed": 1, "completed_at": 1})
        if batch and numeric(batch.get("processed")) + numeric(batch.get("failed")) >= numeric(batch.get("total")):
            final_status = "failed" if numeric(batch.get("failed")) and not numeric(batch.get("processed")) else "completed"
            await db.ats_batches.update_one({"batch_id": batch_id}, {"$set": {"status": final_status, "completed_at": batch.get("completed_at") or now_iso(), "updated_at": now_iso()}})
        cache_delete_prefix("ats:")
        cache_delete_prefix("bi:")
        cache_delete_prefix("summary:")


async def run_ats_batch(batch_id: str, jd: str, user_snapshot: dict):
    await db.ats_batches.update_one({"batch_id": batch_id}, {"$set": {"status": "processing", "started_at": now_iso(), "updated_at": now_iso()}})
    items = [doc async for doc in db.ats_batch_items.find({"batch_id": batch_id, "status": "queued"}).sort("index", 1)]
    tasks = [asyncio.create_task(process_batch_item(batch_id, item["_id"], jd, user_snapshot)) for item in items]
    if tasks:
        await asyncio.gather(*tasks)
    summary = await refresh_ats_batch(batch_id)
    await db.analytics.insert_one({
        "scope": "ats",
        "owner": user_snapshot.get("email"),
        "event": "batch_screening_completed",
        "batch_id": batch_id,
        "total": summary.get("total", 0) if summary else 0,
        "processed": summary.get("processed", 0) if summary else 0,
        "shortlisted": summary.get("shortlisted", 0) if summary else 0,
        "rejected": summary.get("rejected", 0) if summary else 0,
        "interview_ready": summary.get("interview_ready", 0) if summary else 0,
        "created_at": now_iso(),
    })


async def process_stored_resume(jd: str, upload: UploadFile, user: dict) -> dict:
    if not (
        has_permission(user.get("role", ""), "ai:screen")
        or has_permission(user.get("role", ""), "ai:candidate")
        or has_permission(user.get("role", ""), "resume:own")
    ):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    from ai_module.processor import (
        build_ats_report,
        calculate_match_score,
        extract_skills,
        extract_text_from_resume,
        get_candidate_summary,
        generate_recommendation,
    )

    owner = current_user_email(user)
    role = user_role(user)
    stored_file = await save_resume_upload(upload, owner)
    upload_time = now_iso()
    profile_doc = {
        "candidate_id": None,
        "owner": owner,
        "uploaded_by": owner,
        "original_filename": stored_file["original_filename"],
        "stored_filename": stored_file["stored_filename"],
        "file_path": stored_file["file_path"],
        "file_size": stored_file["file_size"],
        "upload_timestamp": upload_time,
        "updated_at": upload_time,
        "file_hash": stored_file["file_hash"],
        "duplicate_of": stored_file["duplicate_of"],
        "is_duplicate": stored_file["is_duplicate"],
        "extracted_text": "",
        "extracted_skills": [],
        "extracted_education": [],
        "extracted_experience": [],
        "ats_score": 0,
        "semantic_score": 0,
        "keyword_match": 0,
        "missing_skills": [],
        "ai_summary": "",
        "ai_recommendation": "",
        "status": "pending_review",
        "parsing_status": "stored",
    }
    profile_result = await db.resume_profiles.insert_one(profile_doc)
    profile_id = str(profile_result.inserted_id)

    try:
        await db.resume_profiles.update_one({"_id": profile_result.inserted_id}, {"$set": {"parsing_status": "extracting_text", "updated_at": now_iso()}})
        text = extract_text_from_resume(stored_file["file_bytes"], stored_file["original_filename"])

        await db.resume_profiles.update_one({"_id": profile_result.inserted_id}, {"$set": {"parsing_status": "ai_analysis", "extracted_text": text[:60000], "updated_at": now_iso()}})
        score = await calculate_match_score(jd, text)
        skills = extract_skills(text)
        summary = get_candidate_summary(jd, text)
        decision = generate_recommendation(score)
        ats = build_ats_report(jd, text, score, skills)
        structured = ats.get("structured", {})
        status = "shortlisted" if decision in {"Selected", "Shortlist"} else "rejected" if decision == "Rejected" else "pending_review"

        application = None
        if has_permission(role, "candidates:manage"):
            application_doc = {
                "candidate": stored_file["original_filename"],
                "score": score,
                "ats_score": ats["ats_score"],
                "skills": skills,
                "hr": owner,
                "resume_profile_id": profile_id,
                "status": status,
                "stage": "ATS Screened",
                "source": "resume_screening",
                "date": datetime.utcnow(),
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
            application = await db.applications.insert_one(application_doc)
        candidate_doc = {
            "candidate_name": stored_file["original_filename"].rsplit(".", 1)[0],
            "email": owner,
            "skills": skills,
            "resume_score": ats["ats_score"],
            "education_match": ats.get("education_match", 0.0),
            "industry_fit": ats.get("industry_fit", 0.0),
            "ai_recommendation": decision,
            "status": "selected" if decision == "Selected" else "screening",
            "stage": "Selected" if decision == "Selected" else "Screening",
            "source": "resume_screening",
            "application_id": str(application.inserted_id) if application else None,
            "resume_profile_id": profile_id,
            "resume_file_path": stored_file["file_path"],
            "resume_download_url": f"/api/resume-files/{profile_id}/download",
            "hr": owner,
            "summary": summary,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        candidate = await db.candidates.insert_one(candidate_doc)
        candidate_id = str(candidate.inserted_id)

        report_doc = {
            "application_id": str(application.inserted_id) if application else None,
            "owner": owner,
            "candidate_email": owner,
            "candidate_id": candidate_id,
            "resume_profile_id": profile_id,
            "candidate": stored_file["original_filename"],
            "hr": owner,
            "job_description_keywords": ats["keyword_optimization"],
            "missing_keywords": ats["missing_keywords"],
            "matched_keywords": ats["matched_keywords"],
            "scores": {
                "semantic": score,
                "ats": ats["ats_score"],
                "keyword_match": ats["keyword_match"],
                "skills_match": ats["skills_match"],
                "experience_match": ats["experience_match"],
                "education_match": ats.get("education_match", 0.0),
                "industry_fit": ats.get("industry_fit", 0.0),
                "completeness": ats["completeness_score"],
            },
            "structured": structured,
            "suggestions": ats["suggestions"],
            "created_at": now_iso(),
        }
        await db.ats_reports.insert_one(report_doc)

        update_doc = {
            "candidate_id": candidate_id,
            "application_id": str(application.inserted_id) if application else None,
            "extracted_text": text[:60000],
            "extracted_skills": skills,
            "extracted_education": structured.get("education", []),
            "extracted_experience": structured.get("experience", []),
            "extracted_certifications": structured.get("certifications", []),
            "extracted_projects": structured.get("projects", []),
            "contact_details": structured.get("contact", {}),
            "ats_score": ats["ats_score"],
            "semantic_score": score,
            "keyword_match": ats["keyword_match"],
            "education_match": ats.get("education_match", 0.0),
            "industry_fit": ats.get("industry_fit", 0.0),
            "skill_match_score": ats["skills_match"],
            "experience_match_score": ats["experience_match"],
            "missing_skills": ats["missing_keywords"],
            "ai_summary": summary,
            "ai_recommendation": decision,
            "status": status,
            "parsing_status": "completed",
            "updated_at": now_iso(),
        }
        await db.resume_profiles.update_one({"_id": profile_result.inserted_id}, {"$set": update_doc})
        await db.resume_versions.insert_one({
            "resume_id": profile_id,
            "candidate_id": candidate_id,
            "version": 1,
            "version_type": "original_upload",
            "original_filename": stored_file["original_filename"],
            "stored_filename": stored_file["stored_filename"],
            "file_path": stored_file["file_path"],
            "file_size": stored_file["file_size"],
            "file_hash": stored_file["file_hash"],
            "created_by": owner,
            "created_at": now_iso(),
            "notes": "Original HR resume upload processed through AI screening.",
        })
        await log_candidate_analytics_event(owner, "ats_scan_completed", resume_profile_id=profile_id, candidate_id=candidate_id)

        return {
            "score": score,
            "skills": skills,
            "summary": summary,
            "decision": decision,
            "ats": ats,
            "resume_file": {
                "id": profile_id,
                "candidate_id": candidate_id,
                "original_filename": stored_file["original_filename"],
                "stored_filename": stored_file["stored_filename"],
                "file_size": stored_file["file_size"],
                "is_duplicate": stored_file["is_duplicate"],
                "duplicate_of": stored_file["duplicate_of"],
                "download_url": f"/api/resume-files/{profile_id}/download",
                "preview_url": f"/api/resume-files/{profile_id}/preview",
                "parsing_status": "completed",
            },
        }
    except Exception:
        await db.resume_profiles.update_one(
            {"_id": profile_result.inserted_id},
            {"$set": {"parsing_status": "failed", "status": "failed", "updated_at": now_iso()}},
        )
        raise

@app.get("/api/ai/status")
async def ai_status():
    from ai_module.processor import _model_ready, _model_loading, _embed_model
    return {
        "model_ready": _model_ready,
        "model_loading": _model_loading,
        "model_loaded": _embed_model is not None,
        "scoring_mode": "semantic" if _embed_model is not None else "lexical",
        "model_name": os.getenv("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2"),
    }


@app.get("/api/analytics/summary")
async def get_summary(user: dict = Depends(get_current_user)):
    role = user_role(user)
    cache_key = f"summary:{role}:{current_user_email(user)}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    today = datetime.utcnow().date().isoformat()
    can_manage_candidates = has_permission(role, "candidates:manage")
    can_read_employees = has_permission(role, "employees:read") or has_permission(role, "employees:manage")
    candidate_query = {} if can_manage_candidates else {"email": user.get("email")}
    employees = await db.employees.count_documents({}) if can_read_employees else 0
    candidates = await db.candidates.count_documents(candidate_query) if role != "employee" else 0
    shortlisted = await db.candidates.count_documents({**candidate_query, "ai_recommendation": "Selected"}) if role != "employee" else 0
    interviews = await db.interviews.count_documents({}) if has_permission(role, "interviews:manage") else 0
    attendance_today = await db.attendance.count_documents({"date": today}) if (
        has_permission(role, "attendance:all") or has_permission(role, "attendance:team") or has_permission(role, "attendance:own")
    ) else 0
    resume_owner = current_user_email(user)
    builder_resumes = await db.resumes.count_documents({"owner": resume_owner})
    stored_resumes = await db.resume_profiles.count_documents({} if can_manage_candidates else {"owner": resume_owner})
    reports_query = {} if can_manage_candidates else {"hr": user.get("email")}
    latest_reports = db.ats_reports.find(reports_query, {"scores.ats": 1}).sort("created_at", -1).limit(25)
    ats_scores = [doc.get("scores", {}).get("ats", 0) async for doc in latest_reports]
    return cache_set(cache_key, {
        "employees": employees,
        "candidates": candidates,
        "shortlisted": shortlisted,
        "interviews": interviews,
        "attendance_today": attendance_today,
        "ats_average": round(sum(ats_scores) / len(ats_scores), 1) if ats_scores else 0,
        "resume_profiles": builder_resumes + stored_resumes,
    })


@app.get("/api/bi/dashboard")
async def business_intelligence_dashboard(user: dict = Depends(get_current_user)):
    role = user_role(user)
    owner = current_user_email(user)
    cache_key = f"bi:{role}:{owner}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    can_see_company = has_permission(role, "analytics:workforce") or has_permission(role, "analytics:all")
    can_see_recruiting = has_permission(role, "analytics:recruiting") or has_permission(role, "candidates:manage")
    candidate_query = {} if can_see_recruiting or can_see_company else {"email": owner}
    employee_query = {} if can_see_company or has_permission(role, "employees:read") else {"email": owner}

    employees = await db.employees.count_documents(employee_query if employee_query != {"email": owner} else employee_query)
    candidates = await db.candidates.count_documents(candidate_query)
    shortlisted = await db.candidates.count_documents({**candidate_query, "ai_recommendation": {"$in": ["Selected", "Shortlist"]}})
    rejected = await db.candidates.count_documents({**candidate_query, "$or": [{"ai_recommendation": "Rejected"}, {"status": "rejected"}, {"stage": "Rejected"}]})
    interviews = await db.interviews.count_documents({} if can_see_recruiting or can_see_company else {"candidate_email": owner})
    attendance_total = await db.attendance.count_documents({})
    leave_total = await db.leave_requests.count_documents({})
    roles_count = await db.roles.count_documents({})
    audit_events = await db.audit_logs.count_documents({}) + await db.activity_logs.count_documents({})
    security_alerts = await db.security_alerts.count_documents({"status": {"$ne": "resolved"}})
    blocked_alerts = await db.security_alerts.count_documents({"severity": {"$in": ["high", "critical"]}, "status": {"$ne": "resolved"}})
    report_exports = await db.activity_logs.count_documents({"action": {"$regex": "export", "$options": "i"}})
    payroll = await db.payroll.find_one({}, sort=[("period", -1), ("created_at", -1)]) or {}
    departments = await db.departments.find({}).sort("name", 1).to_list(100)
    since_30 = datetime.utcnow() - timedelta(days=30)
    active_employees = await db.employees.count_documents({**employee_query, "status": {"$regex": "^active$", "$options": "i"}})
    if employees and active_employees == 0:
        active_employees = employees
    new_hires = await db.employees.count_documents({
        **employee_query,
        "$or": [
            {"created_at": {"$gte": since_30.isoformat()}},
            {"created_at": {"$gte": since_30}},
            {"hire_date": {"$gte": since_30.date().isoformat()}},
            {"joining_date": {"$gte": since_30.date().isoformat()}},
        ],
    })

    ats_cursor = db.ats_reports.find({} if can_see_recruiting or can_see_company else {"owner": owner}, {"scores": 1, "created_at": 1}).sort("created_at", -1).limit(500)
    ats_scores = [numeric(doc.get("scores", {}).get("ats")) async for doc in ats_cursor]
    avg_ats = round(sum(ats_scores) / len(ats_scores), 1) if ats_scores else 0
    ats_query = {} if can_see_recruiting or can_see_company else {"owner": owner}

    hiring_trends = await monthly_counts(db.candidates, "created_at", 6, candidate_query)
    recruitment_trends = await monthly_counts(db.ats_reports, "created_at", 6, {} if can_see_recruiting or can_see_company else {"owner": owner})
    attendance_trends = await monthly_counts(db.attendance, "created_at", 6, {})
    payroll_trends = await monthly_counts(db.payroll, "created_at", 6, {})
    project_trends = await monthly_counts(db.project_tasks, "created_at", 6, {})
    goal_total = await db.goals.count_documents({} if has_permission(role, "goals:team") or can_see_company else {"owner": owner})
    goal_done = await db.goals.count_documents({**({} if has_permission(role, "goals:team") or can_see_company else {"owner": owner}), "status": {"$in": ["Done", "Completed", "complete", "done"]}})
    task_total = await db.project_tasks.count_documents({})
    task_done = await db.project_tasks.count_documents({"status": {"$in": ["Done", "Completed", "done", "complete"]}})
    learning_total = await db.training_courses.count_documents({} if has_permission(role, "training:manage") else {"owner": owner})
    learning_done = await db.training_courses.count_documents({**({} if has_permission(role, "training:manage") else {"owner": owner}), "status": {"$in": ["Completed", "Done", "complete", "done"]}})
    source_pipeline = [
        {"$match": candidate_query},
        {"$group": {"_id": {"$ifNull": ["$source", "Direct"]}, "candidates": {"$sum": 1}}},
        {"$sort": {"candidates": -1}},
        {"$limit": 8},
    ]
    source_analytics = []
    async for item in db.candidates.aggregate(source_pipeline):
        source = item.get("_id") or "Direct"
        count = int(item.get("candidates") or 0)
        shortlisted_for_source = await db.candidates.count_documents({
            **candidate_query,
            "source": source,
            "ai_recommendation": {"$in": ["Selected", "Shortlist"]},
        })
        source_analytics.append({
            "source": source,
            "candidates": count,
            "conversion": round((shortlisted_for_source / count) * 100, 1) if count else 0,
        })
    recruiter_pipeline = [
        {"$match": candidate_query},
        {"$group": {"_id": {"$ifNull": ["$hr", {"$ifNull": ["$owner", "Unassigned"]}]}, "candidates": {"$sum": 1}, "shortlisted": {"$sum": {"$cond": [{"$in": ["$ai_recommendation", ["Selected", "Shortlist"]]}, 1, 0]}}}},
        {"$sort": {"shortlisted": -1}},
        {"$limit": 10},
    ]
    recruiter_performance = []
    async for item in db.candidates.aggregate(recruiter_pipeline):
        total = int(item.get("candidates") or 0)
        wins = int(item.get("shortlisted") or 0)
        recruiter_performance.append({
            "recruiter": item.get("_id") or "Unassigned",
            "candidates": total,
            "shortlisted": wins,
            "conversion": round((wins / total) * 100, 1) if total else 0,
        })
    department_performance = [
        {
            "department": item.get("name", "Department"),
            "headcount": item.get("employees", item.get("headcount", 0)),
            "budget": item.get("budget", 0),
            "performance": item.get("performance", 0),
        }
        for item in departments
    ]
    department_distribution = await bi_department_distribution(employee_query)
    attrition_risk = max(0, min(100, round((leave_total / max(employees, 1)) * 8 + rejected / max(candidates, 1) * 20, 1))) if employees or candidates else 0
    offers_total = await db.offers.count_documents({}) + await db.applications.count_documents({"$or": [{"stage": {"$regex": "offer", "$options": "i"}}, {"status": {"$regex": "offer|accepted", "$options": "i"}}]})
    offers_accepted = await db.offers.count_documents({"status": {"$regex": "accepted", "$options": "i"}}) + await db.applications.count_documents({"status": {"$regex": "accepted", "$options": "i"}})
    offer_acceptance_rate = round((offers_accepted / offers_total) * 100, 1) if offers_total else 0
    time_to_hire_values = []
    async for candidate in db.candidates.find(candidate_query, {"created_at": 1, "updated_at": 1, "interview_date": 1}).limit(300):
        start = parse_datetime_value(candidate.get("created_at"))
        end = parse_datetime_value(candidate.get("interview_date")) or parse_datetime_value(candidate.get("updated_at"))
        if start and end and end >= start:
            time_to_hire_values.append((end - start).days)
    time_to_hire = round(sum(time_to_hire_values) / len(time_to_hire_values), 1) if time_to_hire_values else 0
    hiring_funnel = [
        {"stage": "Applied", "count": candidates},
        {"stage": "ATS Screening", "count": await db.resume_profiles.count_documents(ats_query)},
        {"stage": "Shortlisted", "count": shortlisted},
        {"stage": "Interview Scheduled", "count": interviews},
        {"stage": "Offer", "count": offers_total},
        {"stage": "Accepted", "count": offers_accepted},
    ]
    workforce_forecast = {
        "current_headcount": employees,
        "projected_headcount": employees + max(0, shortlisted - rejected),
        "hiring_demand": candidates,
        "attrition_risk": attrition_risk,
        "next_30_days": max(0, employees + new_hires - round((attrition_risk / 100) * max(employees, 1))),
    }
    skill_counts = {}
    employee_skill_counts = {}
    async for doc in db.employees.find(employee_query, {"skills": 1, "department": 1, "position": 1, "name": 1, "email": 1}).limit(1000):
        raw_skills = doc.get("skills") or []
        if isinstance(raw_skills, str):
            raw_skills = re.split(r"[,|]", raw_skills)
        for skill in raw_skills:
            label = str(skill or "").strip().title()
            if label:
                employee_skill_counts[label] = employee_skill_counts.get(label, 0) + 1
                skill_counts[label] = skill_counts.get(label, 0) + 1
    candidate_skill_counts = {}
    async for doc in db.resume_profiles.find(ats_query, {"extracted_skills": 1, "skills": 1, "missing_skills": 1}).limit(1000):
        raw_skills = doc.get("extracted_skills") or doc.get("skills") or []
        if isinstance(raw_skills, str):
            raw_skills = re.split(r"[,|]", raw_skills)
        for skill in raw_skills:
            label = str(skill or "").strip().title()
            if label:
                candidate_skill_counts[label] = candidate_skill_counts.get(label, 0) + 1
                skill_counts[label] = skill_counts.get(label, 0) + 1

    missing_skill_counts = {}
    async for doc in db.resume_profiles.find(ats_query, {"missing_skills": 1}).limit(1000):
        for skill in doc.get("missing_skills") or []:
            label = str(skill or "").strip().title()
            if label:
                missing_skill_counts[label] = missing_skill_counts.get(label, 0) + 1

    skill_graph = [
        {
            "skill": skill,
            "employees": employee_skill_counts.get(skill, 0),
            "candidates": candidate_skill_counts.get(skill, 0),
            "demand": missing_skill_counts.get(skill, 0),
            "coverage": round((employee_skill_counts.get(skill, 0) / max(missing_skill_counts.get(skill, 0), 1)) * 100, 1),
        }
        for skill in sorted(skill_counts, key=lambda item: skill_counts[item], reverse=True)[:14]
    ]
    skill_gap_radar = [
        {"skill": skill, "gap": count, "urgency": "High" if count >= 5 else "Medium" if count >= 2 else "Low"}
        for skill, count in sorted(missing_skill_counts.items(), key=lambda item: item[1], reverse=True)[:10]
    ]

    demanded = {item["skill"].lower() for item in skill_gap_radar[:6]}
    internal_matches = []
    async for employee in db.employees.find(employee_query, {"name": 1, "email": 1, "department": 1, "position": 1, "skills": 1, "performance": 1}).limit(300):
        raw_skills = employee.get("skills") or []
        if isinstance(raw_skills, str):
            raw_skills = re.split(r"[,|]", raw_skills)
        normalized_skills = {str(skill).strip().lower() for skill in raw_skills if str(skill).strip()}
        matched = sorted(demanded & normalized_skills)
        if matched:
            internal_matches.append({
                "employee": employee.get("name") or employee.get("email") or "Employee",
                "department": employee.get("department") or "Unassigned",
                "role": employee.get("position") or employee.get("role") or "Employee",
                "matched_skills": [item.title() for item in matched[:5]],
                "mobility_score": min(100, 58 + len(matched) * 9 + numeric(employee.get("performance")) * 0.2),
                "recommendation": "Consider for internal role match or stretch assignment",
            })
    internal_matches = sorted(internal_matches, key=lambda item: item["mobility_score"], reverse=True)[:8]

    succession_candidates = []
    async for employee in db.employees.find(employee_query, {"name": 1, "department": 1, "position": 1, "performance": 1, "skills": 1}).limit(300):
        raw_skills = employee.get("skills") or []
        skill_count = len(raw_skills if isinstance(raw_skills, list) else [s for s in re.split(r"[,|]", str(raw_skills)) if s.strip()])
        readiness = min(100, 52 + skill_count * 4 + numeric(employee.get("performance")) * 0.35)
        if readiness >= 65:
            succession_candidates.append({
                "employee": employee.get("name") or "Employee",
                "department": employee.get("department") or "Unassigned",
                "current_role": employee.get("position") or employee.get("role") or "Employee",
                "readiness": round(readiness, 1),
                "next_role": "Team Lead" if readiness < 82 else "Department Manager",
            })
    succession_candidates = sorted(succession_candidates, key=lambda item: item["readiness"], reverse=True)[:8]

    burnout_score = max(0, min(100, round((leave_total / max(employees, 1)) * 6 + (attendance_total / max(employees, 1)) * 0.3 + attrition_risk * 0.45, 1))) if employees else 0
    compliance_alerts = [
        {"area": "Profile completion", "severity": "Medium", "count": await db.employees.count_documents({**employee_query, "$or": [{"email": {"$exists": False}}, {"department": {"$exists": False}}]})},
        {"area": "Security alerts", "severity": "High" if blocked_alerts else "Low", "count": security_alerts},
        {"area": "Pending leave approvals", "severity": "Medium", "count": await db.leave_requests.count_documents({"status": {"$regex": "pending", "$options": "i"}})},
    ]
    payroll_headcount = numeric(payroll.get("headcount"), employees)
    payroll_cost = numeric(payroll.get("monthly_cost"))
    payroll_anomalies = []
    if payroll_cost and payroll_headcount and payroll_cost / max(payroll_headcount, 1) > 250000:
        payroll_anomalies.append({"type": "High average payroll cost", "severity": "Review", "value": round(payroll_cost / payroll_headcount, 1)})
    if payroll_headcount and employees and abs(payroll_headcount - employees) > max(3, employees * 0.1):
        payroll_anomalies.append({"type": "Payroll headcount mismatch", "severity": "High", "value": abs(payroll_headcount - employees)})
    if not payroll_anomalies:
        payroll_anomalies.append({"type": "No major payroll anomaly", "severity": "Low", "value": 0})

    hr_copilot = {
        "priority_actions": [
            f"Close top skill gap: {skill_gap_radar[0]['skill']}." if skill_gap_radar else "Build a skill graph by screening resumes and adding employee skills.",
            f"Review attrition and burnout risk at {max(attrition_risk, burnout_score)}%." if attrition_risk or burnout_score else "Attrition and burnout signals are currently low.",
            f"Move {shortlisted} shortlisted candidates toward interviews." if shortlisted else "Run AI resume screening to create a shortlist.",
        ],
        "policy_questions": ["Leave balance and approval rules", "Payroll anomaly explanation", "Promotion readiness criteria"],
        "automation_opportunities": [
            "Auto-create interview question packs from JD and resume.",
            "Recommend internal employees before external sourcing.",
            "Notify HR when compliance or payroll signals need review.",
        ],
    }
    return cache_set(cache_key, {
        "kpis": {
            "employees": employees,
            "active_employees": active_employees,
            "new_hires": new_hires,
            "candidates": candidates,
            "shortlisted": shortlisted,
            "rejected": rejected,
            "interviews": interviews,
            "attendance_records": attendance_total,
            "leave_requests": leave_total,
            "monthly_payroll": payroll.get("monthly_cost", 0),
            "payroll_costs": payroll.get("monthly_cost", 0),
            "average_ats": avg_ats,
            "attrition_rate": attrition_risk,
            "offer_acceptance_rate": offer_acceptance_rate,
            "time_to_hire": time_to_hire,
            "goal_completion": round((goal_done / goal_total) * 100, 1) if goal_total else 0,
            "team_productivity": round((task_done / task_total) * 100, 1) if task_total else 0,
            "learning_progress": round((learning_done / learning_total) * 100, 1) if learning_total else 0,
            "roles": roles_count,
            "audit_events": audit_events,
            "security_alerts": security_alerts,
            "blocked_alerts": blocked_alerts,
            "report_exports": report_exports,
        },
        "hiring_analytics": {"trends": hiring_trends, "funnel": hiring_funnel, "shortlisted": shortlisted, "rejected": rejected, "interview_ready": await db.resume_profiles.count_documents({"ats_score": {"$gte": 75}}), "offer_acceptance_rate": offer_acceptance_rate, "time_to_hire": time_to_hire},
        "recruitment_trends": recruitment_trends,
        "source_analytics": source_analytics,
        "recruiter_performance": recruiter_performance,
        "ats_distribution": await bi_ats_distribution(ats_query),
        "attendance_analytics": attendance_trends,
        "payroll_analytics": payroll_trends,
        "project_trends": project_trends,
        "department_performance": department_performance,
        "department_distribution": department_distribution,
        "attrition_analysis": {"risk_score": attrition_risk, "leave_requests": leave_total, "signals": []},
        "skill_graph": skill_graph,
        "skill_gap_radar": skill_gap_radar,
        "internal_talent_marketplace": internal_matches,
        "succession_planning": succession_candidates,
        "burnout_risk": {"score": burnout_score, "level": "High" if burnout_score >= 70 else "Medium" if burnout_score >= 40 else "Low", "signals": ["leave load", "attendance density", "attrition risk"]},
        "compliance_monitor": compliance_alerts,
        "payroll_anomalies": payroll_anomalies,
        "hr_copilot": hr_copilot,
        "manager_analytics": {"team_productivity": round((task_done / task_total) * 100, 1) if task_total else 0, "goal_completion": round((goal_done / goal_total) * 100, 1) if goal_total else 0, "attendance_trends": attendance_trends, "performance_trends": project_trends},
        "employee_analytics": {"personal_kpis": {"attendance": attendance_total, "goals": goal_total, "learning": learning_total}, "attendance_trends": attendance_trends, "learning_progress": round((learning_done / learning_total) * 100, 1) if learning_total else 0},
        "heatmap": await bi_activity_heatmap({} if can_see_company or can_see_recruiting else {"owner": owner}),
        "workforce_forecasting": workforce_forecast,
    })


@app.get("/api/bi/drilldown/{section}")
async def bi_drilldown(section: str, limit: int = Query(50, ge=1, le=200), user: dict = Depends(get_current_user)):
    role = user_role(user)
    owner = current_user_email(user)
    can_see_company = has_permission(role, "analytics:workforce") or has_permission(role, "analytics:all")
    can_see_recruiting = has_permission(role, "analytics:recruiting") or has_permission(role, "candidates:manage")
    section = section.lower().strip()
    if section == "employees":
        query = {} if can_see_company or has_permission(role, "employees:read") else {"email": owner}
        cursor = db.employees.find(query, {"name": 1, "email": 1, "department": 1, "status": 1, "created_at": 1}).sort("created_at", -1).limit(limit)
    elif section in {"hiring", "candidates", "recruiting"}:
        if not (can_see_recruiting or can_see_company):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        cursor = db.candidates.find({}, {"name": 1, "email": 1, "source": 1, "ai_recommendation": 1, "resume_score": 1, "created_at": 1}).sort("created_at", -1).limit(limit)
    elif section in {"ats", "screening"}:
        query = {} if can_see_recruiting or can_see_company else {"owner": owner}
        cursor = db.resume_profiles.find(query, {"candidate_name": 1, "candidate_email": 1, "ats_score": 1, "status": 1, "skills": 1, "created_at": 1}).sort("ats_score", -1).limit(limit)
    elif section == "payroll":
        if not has_permission(role, "payroll:manage"):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        cursor = db.payroll.find({}, {"period": 1, "monthly_cost": 1, "headcount": 1, "avg_salary": 1, "created_at": 1}).sort("period", -1).limit(limit)
    elif section in {"attendance", "employee"}:
        query = {} if can_see_company or has_permission(role, "attendance:team") else {"email": owner}
        cursor = db.attendance.find(query).sort("created_at", -1).limit(limit)
    else:
        raise HTTPException(status_code=404, detail="Unknown BI drilldown section")
    rows = [serialize_mongo_like(doc) async for doc in cursor]
    await write_activity_log(user, f"BI Drilldown: {section}", "analytics", metadata={"rows": len(rows)})
    return {"section": section, "rows": rows}


@app.get("/api/bi/export")
async def bi_export(format: str = Query("excel", pattern="^(pdf|excel)$"), section: str = Query("summary"), user: dict = Depends(get_current_user)):
    dashboard = await business_intelligence_dashboard(user)
    rows = []
    if section == "departments":
        rows = dashboard.get("department_distribution", [])
    elif section == "hiring":
        rows = dashboard.get("hiring_analytics", {}).get("funnel", [])
    elif section == "ats":
        rows = dashboard.get("ats_distribution", [])
    elif section == "recruiters":
        rows = dashboard.get("recruiter_performance", [])
    else:
        rows = [{"metric": key, "value": value} for key, value in dashboard.get("kpis", {}).items()]
    await db.activity_logs.insert_one({
        "actor": current_user_email(user),
        "action": f"Export BI {format.upper()}",
        "resource": "analytics",
        "metadata": {"section": section, "rows": len(rows)},
        "created_at": now_iso(),
    })
    cache_delete_prefix("bi:")
    if format == "pdf":
        return Response(
            content=build_bi_pdf_bytes(f"AI-HRMS BI Export - {section}", rows),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="hrms-bi-{section}.pdf"'},
        )
    headers = list(rows[0].keys()) if rows else ["metric", "value"]
    html_rows = "".join(
        "<tr>" + "".join(f"<td>{str(row.get(header, ''))}</td>" for header in headers) + "</tr>"
        for row in rows
    )
    html = f"<table><thead><tr>{''.join(f'<th>{header}</th>' for header in headers)}</tr></thead><tbody>{html_rows}</tbody></table>"
    return Response(
        content=html,
        media_type="application/vnd.ms-excel",
        headers={"Content-Disposition": f'attachment; filename="hrms-bi-{section}.xls"'},
    )


@app.get("/api/ats/dashboard")
async def ats_dashboard(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    role = user_role(user)
    owner = current_user_email(user)
    if not (has_permission(role, "ats:manage") or has_permission(role, "ai:screen") or has_permission(role, "ai:candidate")):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    cache_key = f"ats:{role}:{owner}:{page}:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    query = {} if has_permission(role, "candidates:manage") or has_permission(role, "ats:manage") else {"owner": owner}
    skip = (page - 1) * limit
    total = await db.resume_profiles.count_documents(query)
    completed = await db.resume_profiles.count_documents({**query, "parsing_status": "completed"})
    failed = await db.resume_profiles.count_documents({**query, "parsing_status": "failed"})
    shortlisted = await db.resume_profiles.count_documents({**query, "status": "shortlisted"})
    rejected = await db.resume_profiles.count_documents({**query, "status": "rejected"})
    interview_ready = await db.resume_profiles.count_documents({**query, "ats_score": {"$gte": 75}, "status": {"$ne": "rejected"}})
    cursor = db.resume_profiles.find(query).sort("ats_score", -1).skip(skip).limit(limit)
    profiles = []
    rank = skip + 1
    async for doc in cursor:
        item = serialize_resume_profile(doc)
        item["rank"] = rank
        item["interview_ready"] = numeric(item.get("ats_score")) >= 75 and item.get("status") != "rejected"
        profiles.append(item)
        rank += 1
    avg_cursor = db.resume_profiles.find(query, {"ats_score": 1})
    scores = [numeric(doc.get("ats_score")) async for doc in avg_cursor]
    score_distribution = [
        {"range": "0-49", "count": sum(1 for score in scores if score < 50)},
        {"range": "50-69", "count": sum(1 for score in scores if 50 <= score < 70)},
        {"range": "70-84", "count": sum(1 for score in scores if 70 <= score < 85)},
        {"range": "85-100", "count": sum(1 for score in scores if score >= 85)},
    ]
    skill_counts = {}
    source_counts = {}
    exp_values = []
    async for doc in db.resume_profiles.find(query, {"extracted_skills": 1, "skills": 1, "source": 1, "experience_years": 1}):
        raw_skills = doc.get("extracted_skills") or doc.get("skills") or []
        if isinstance(raw_skills, str):
            raw_skills = [item.strip() for item in re.split(r"[,|]", raw_skills)]
        for skill in raw_skills:
            label = str(skill or "").strip()
            if label:
                skill_counts[label.title()] = skill_counts.get(label.title(), 0) + 1
        source = doc.get("source") or "Direct Upload"
        source_counts[source] = source_counts.get(source, 0) + 1
        if doc.get("experience_years") is not None:
            exp_values.append(numeric(doc.get("experience_years")))
    applied = await db.applications.count_documents({} if query == {} else {"candidate_email": owner})
    ats_screening = total
    interview_scope = {} if query == {} else {"candidate_email": owner}
    technical_round = await db.interviews.count_documents({**interview_scope, "round": {"$regex": "technical", "$options": "i"}})
    hr_round = await db.interviews.count_documents({**interview_scope, "round": {"$regex": "hr", "$options": "i"}})
    selected = await db.candidates.count_documents({"ai_recommendation": {"$in": ["Selected", "Shortlist"]}}) if query == {} else shortlisted
    top_missing = {}
    async for doc in db.resume_profiles.find(query, {"missing_skills": 1}):
        for skill in doc.get("missing_skills") or []:
            label = str(skill or "").strip()
            if label:
                top_missing[label.title()] = top_missing.get(label.title(), 0) + 1
    return cache_set(cache_key, {
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit if limit else 0},
        "totals": {
            "uploaded": total,
            "processing_progress": round((completed + failed) / total * 100, 1) if total else 0,
            "completed": completed,
            "failed": failed,
            "shortlisted": shortlisted,
            "rejected": rejected,
            "interview_ready": interview_ready,
            "average_ats": round(sum(scores) / len(scores), 1) if scores else 0,
        },
        "candidates": profiles,
        "charts": {
            "score_distribution": score_distribution,
            "skill_distribution": [{"skill": key, "count": value} for key, value in sorted(skill_counts.items(), key=lambda item: item[1], reverse=True)[:12]],
            "source_analytics": [{"source": key, "count": value} for key, value in sorted(source_counts.items(), key=lambda item: item[1], reverse=True)[:8]],
            "hiring_funnel": [
                {"stage": "Applied", "count": applied},
                {"stage": "ATS Screening", "count": ats_screening},
                {"stage": "Shortlisted", "count": shortlisted},
                {"stage": "Interview Scheduled", "count": interview_ready},
                {"stage": "Technical Round", "count": technical_round},
                {"stage": "HR Round", "count": hr_round},
                {"stage": "Selected", "count": selected},
            ],
        },
        "insights": {
            "above_80": sum(1 for score in scores if score >= 80),
            "top_missing_skill": max(top_missing.items(), key=lambda item: item[1])[0] if top_missing else "",
            "interview_ready": interview_ready,
            "average_experience": round(sum(exp_values) / len(exp_values), 1) if exp_values else 0,
        },
    }, ttl_seconds=10)


@app.post("/api/ats/extract-requirements")
async def ats_extract_requirements(payload: dict = Body(default={}), user: dict = Depends(get_current_user)):
    if not (has_permission(user.get("role", ""), "ai:screen") or has_permission(user.get("role", ""), "ats:manage")):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    content = payload.get("job_description") or payload.get("jd") or ""
    known_skills = [
        "React", "Python", "MongoDB", "AWS", "Docker", "Node.js", "JavaScript", "TypeScript",
        "FastAPI", "Django", "SQL", "PostgreSQL", "Kubernetes", "Redis", "Machine Learning",
        "Data Analysis", "Excel", "Power BI", "Tableau", "Recruiting", "HRIS", "ATS",
    ]
    found = [skill for skill in known_skills if re.search(rf"\b{re.escape(skill)}\b", content, re.IGNORECASE)]
    years_match = re.search(r"(\d+)\+?\s*(?:years|yrs)", content, re.IGNORECASE)
    certifications = re.findall(r"\b(?:AWS|Azure|GCP|SHRM|PHR|PMP|Scrum|CISSP|CPA)[\w\s-]*\b", content, re.IGNORECASE)
    education = re.findall(r"\b(?:Bachelor'?s|Master'?s|MBA|B\.?Tech|M\.?Tech|Degree|Diploma)\b[^.,;\n]*", content, re.IGNORECASE)
    return {
        "skills": sorted(set(found)),
        "experience": f"{years_match.group(1)}+ years" if years_match else "",
        "certifications": sorted({item.strip() for item in certifications})[:8],
        "education": sorted({item.strip() for item in education})[:5],
        "analysis": await generate_resume_ai("skills", content, ""),
    }


AI_MODULES = [
    {"id": "resume_screening", "name": "AI Resume Screening", "permission": "ai:screen"},
    {"id": "resume_enhancement", "name": "AI Resume Enhancement", "permission": "resume:own"},
    {"id": "candidate_ranking", "name": "AI Candidate Ranking", "permission": "ats:manage"},
    {"id": "job_matching", "name": "AI Job Matching", "permission": "jobs:match"},
    {"id": "interview_questions", "name": "AI Interview Question Generator", "permission": "interviews:manage"},
    {"id": "career_assistant", "name": "AI Career Assistant", "permission": "career:own"},
    {"id": "skill_gap", "name": "AI Skill Gap Analysis", "permission": "career:own"},
    {"id": "workforce_forecast", "name": "AI Workforce Forecasting", "permission": "analytics:workforce"},
    {"id": "attrition_prediction", "name": "AI Attrition Prediction", "permission": "analytics:workforce"},
    {"id": "performance_prediction", "name": "AI Performance Prediction", "permission": "performance:team"},
    {"id": "skill_graph", "name": "AI Skill Graph", "permission": "analytics:workforce"},
    {"id": "internal_talent_marketplace", "name": "Internal Talent Marketplace", "permission": "analytics:workforce"},
    {"id": "succession_planning", "name": "AI Succession Planning", "permission": "analytics:workforce"},
    {"id": "burnout_detection", "name": "AI Burnout Detection", "permission": "analytics:workforce"},
    {"id": "compliance_monitor", "name": "Smart Compliance Monitor", "permission": "analytics:workforce"},
    {"id": "payroll_anomaly", "name": "Predictive Payroll Alerts", "permission": "analytics:workforce"},
    {"id": "hr_copilot", "name": "AI HR Copilot", "permission": "analytics:workforce"},
]


@app.get("/api/ai/modules")
async def list_ai_modules(user: dict = Depends(get_current_user)):
    role = user_role(user)
    return [{**module, "enabled": has_permission(role, module["permission"])} for module in AI_MODULES]


@app.post("/api/ai/modules/{module_id}")
async def run_ai_module(module_id: str, payload: dict = Body(default={}), user: dict = Depends(get_current_user)):
    module = next((item for item in AI_MODULES if item["id"] == module_id), None)
    if not module:
        raise HTTPException(status_code=404, detail="AI module not found")
    if not has_permission(user.get("role", ""), module["permission"]):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    owner = current_user_email(user)
    content = payload.get("content") or payload.get("resume") or ""
    job_description = payload.get("job_description") or payload.get("jd") or ""

    if module_id == "candidate_ranking":
        candidates = [serialize_mongo_like(doc) async for doc in db.candidates.find({}).sort("resume_score", -1).limit(25)]
        result = {"ranking": candidates}
    elif module_id == "job_matching":
        analytics = await collect_candidate_dashboard(owner)
        result = {"job_matches": analytics.get("job_matches", []), "ai_analytics": analytics.get("ai_analytics", {})}
    elif module_id == "workforce_forecast":
        result = (await business_intelligence_dashboard(user)).get("workforce_forecasting", {})
    elif module_id == "attrition_prediction":
        result = (await business_intelligence_dashboard(user)).get("attrition_analysis", {})
    elif module_id == "performance_prediction":
        tasks = await db.project_tasks.count_documents({})
        done = await db.project_tasks.count_documents({"status": "Done"})
        result = {
            "prediction": round(done / max(tasks, 1) * 100, 1),
            "tasks": tasks,
            "completed": done,
            "forecast": "Stable" if not tasks or done / max(tasks, 1) >= 0.65 else "At risk",
        }
    elif module_id in {"skill_graph", "internal_talent_marketplace", "succession_planning", "burnout_detection", "compliance_monitor", "payroll_anomaly", "hr_copilot"}:
        dashboard = await business_intelligence_dashboard(user)
        mapping = {
            "skill_graph": {"skill_graph": dashboard.get("skill_graph", []), "skill_gap_radar": dashboard.get("skill_gap_radar", [])},
            "internal_talent_marketplace": {"matches": dashboard.get("internal_talent_marketplace", [])},
            "succession_planning": {"bench": dashboard.get("succession_planning", [])},
            "burnout_detection": dashboard.get("burnout_risk", {}),
            "compliance_monitor": {"alerts": dashboard.get("compliance_monitor", [])},
            "payroll_anomaly": {"alerts": dashboard.get("payroll_anomalies", [])},
            "hr_copilot": dashboard.get("hr_copilot", {}),
        }
        result = mapping[module_id]
    elif module_id == "interview_questions":
        prompt = f"Generate interview questions for: {job_description or content}"
        questions = [line for line in (await generate_resume_ai("interview", prompt, job_description)).splitlines() if line.strip()]
        technical_assessment = [
            "Role-specific practical task based on the job description.",
            "System/design or workflow explanation with tradeoff analysis.",
            "Debugging or case-study round scored against accuracy, clarity, and impact.",
        ]
        rubric = [
            {"area": "Technical depth", "weight": 35},
            {"area": "Problem solving", "weight": 25},
            {"area": "Communication", "weight": 20},
            {"area": "Role alignment", "weight": 20},
        ]
        score = min(100, max(45, len(content.split()) * 2 + len(job_description.split())))
        result = {
            "questions": questions,
            "technical_assessment": technical_assessment,
            "candidate_evaluation": {
                "score": score,
                "strengths": ["Relevant signal found in supplied transcript/resume"] if content else [],
                "risks": ["Limited candidate evidence supplied"] if not content else [],
            },
            "hiring_recommendation": "Proceed to technical round" if score >= 70 else "Recruiter review required",
            "evaluation_rubric": rubric,
        }
    elif module_id == "skill_gap":
        skill_text = await generate_resume_ai("skills", content, job_description)
        result = {
            "analysis": skill_text,
            "skill_gaps": [line.strip("- ").strip() for line in skill_text.splitlines() if line.strip()][:8],
        }
    elif module_id == "career_assistant":
        recommendation = await generate_resume_ai("career", content, job_description)
        result = {
            "recommendations": recommendation,
            "job_matching": (await collect_candidate_dashboard(owner)).get("job_matches", []),
            "career_roadmap": [
                {"phase": "30 days", "action": "Improve resume evidence and role keyword coverage"},
                {"phase": "60 days", "action": "Build one portfolio project around the highest skill gap"},
                {"phase": "90 days", "action": "Apply to matched roles and complete interview preparation"},
            ],
            "learning_recommendations": ["Role-specific certification", "Portfolio project", "Mock interview practice"],
        }
    elif module_id == "resume_enhancement":
        result = {
            "summary": await generate_resume_ai("summary", content, job_description),
            "enhanced": await generate_resume_ai("rewrite", content, job_description),
            "ats_optimization": await generate_resume_ai("score", content, job_description),
            "keyword_recommendations": await generate_resume_ai("keywords", content, job_description),
            "template_recommendations": await generate_resume_ai("template", content, job_description),
        }
    else:
        result = {"message": "Use /api/resume-files/upload for batch resume screening."}

    await db.analytics.insert_one({"scope": "ai", "owner": owner, "event": module_id, "created_at": now_iso()})
    await write_activity_log(user, f"AI Module: {module['name']}", "ai", metadata={"module_id": module_id})
    return {"module": module, "result": result}


@app.post("/api/voice/transcribe")
async def voice_transcribe(payload: dict = Body(default={}), user: dict = Depends(get_current_user)):
    transcript = payload.get("transcript") or payload.get("text") or ""
    if not transcript:
        transcript = "No audio transcription text was supplied by the client."
    doc = {
        "owner": current_user_email(user),
        "type": "transcript",
        "transcript": transcript,
        "created_at": now_iso(),
    }
    result = await db.interview_transcripts.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    await write_activity_log(user, "Voice Transcript Generated", "interview_transcripts")
    return doc


@app.post("/api/voice/screen")
async def voice_screen(payload: dict = Body(default={}), user: dict = Depends(get_current_user)):
    transcript = payload.get("transcript") or payload.get("text") or ""
    score = min(100, max(0, len(transcript.split()) * 2))
    result = {
        "score": score,
        "decision": "Interview-ready" if score >= 60 else "Needs recruiter review",
        "summary": await generate_resume_ai("summary", transcript, payload.get("job_description", "")),
    }
    await db.analytics.insert_one({"scope": "voice", "owner": current_user_email(user), "event": "candidate_voice_screen", "score": score, "created_at": now_iso()})
    return result


@app.post("/api/voice/command")
async def voice_command(payload: dict = Body(default={}), user: dict = Depends(get_current_user)):
    role = user_role(user)
    if not (has_permission(role, "ai:screen") or has_permission(role, "ai:candidate") or has_permission(role, "interviews:manage")):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    command = (payload.get("command") or payload.get("text") or "").strip()
    context = payload.get("context") or ""
    lower = command.lower()
    intent = "general_assistant"
    action = "summarize_context"
    if any(term in lower for term in ["shortlist", "short list"]):
        intent = "candidate_shortlist"
        action = "open_shortlist_workflow"
    elif "schedule" in lower and "interview" in lower:
        intent = "schedule_interview"
        action = "create_interview_follow_up"
    elif any(term in lower for term in ["ats", "screen", "score"]):
        intent = "ats_screening"
        action = "open_ats_workspace"
    elif any(term in lower for term in ["note", "feedback", "summary"]):
        intent = "recruiter_note"
        action = "save_recruiter_note"

    response = await generate_resume_ai("chat", command, context)
    doc = {
        "owner": current_user_email(user),
        "scope": "voice",
        "event": "voice_command",
        "command": command,
        "intent": intent,
        "action": action,
        "response": response,
        "created_at": now_iso(),
    }
    await db.analytics.insert_one(doc)
    await write_activity_log(user, "Voice Command Processed", "voice", metadata={"intent": intent, "action": action})
    return {
        "intent": intent,
        "action": action,
        "response": response,
        "next_steps": [
            "Review the generated recommendation.",
            "Open the matching workspace for final recruiter approval.",
            "Store interview notes or candidate status updates in MongoDB-backed workflows.",
        ],
    }


@app.post("/api/chatbot/message")
async def ai_chatbot(payload: dict = Body(default={}), user: dict = Depends(get_current_user)):
    message = payload.get("message", "")
    response = await generate_resume_ai("chat", message, payload.get("context", ""))
    await db.analytics.insert_one({"scope": "chatbot", "owner": current_user_email(user), "event": "chat_message", "created_at": now_iso()})
    return {"reply": response}


@app.get("/api/candidate/dashboard-analytics")
async def candidate_dashboard_analytics(user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Candidate analytics are available only to candidate users.")
    return await collect_candidate_dashboard(current_user_email(user))


@app.get("/api/candidate/dashboard-stats")
async def candidate_dashboard_stats(user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Candidate stats are available only to candidate users.")
    analytics = await collect_candidate_dashboard(current_user_email(user))
    return analytics.get("stats", {})


@app.get("/api/candidate/ats-analytics")
async def candidate_ats_analytics(user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="ATS analytics are available only to candidate users.")
    analytics = await collect_candidate_dashboard(current_user_email(user))
    return analytics.get("ats", {})


@app.get("/api/candidate/pipeline-analytics")
async def candidate_pipeline_analytics(user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Pipeline analytics are available only to candidate users.")
    analytics = await collect_candidate_dashboard(current_user_email(user))
    return analytics.get("pipeline", [])


@app.get("/api/candidate/activity-heatmap")
async def candidate_activity_heatmap(user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Activity analytics are available only to candidate users.")
    analytics = await collect_candidate_dashboard(current_user_email(user))
    return analytics.get("activity_summary", {"daily": [], "weekly": [], "monthly": []})


@app.get("/api/candidate/application-metrics")
async def candidate_application_metrics(user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Application metrics are available only to candidate users.")
    analytics = await collect_candidate_dashboard(current_user_email(user))
    return {
        "stats": analytics.get("stats", {}),
        "pipeline": analytics.get("pipeline", []),
        "interviews": analytics.get("interviews", {}),
        "job_matches": analytics.get("job_matches", []),
    }


@app.get("/api/candidate/recruiter-activity")
async def candidate_recruiter_activity(user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Recruiter activity is available only to candidate users.")
    owner = current_user_email(user)
    cursor = db.analytics.find({
        "$or": [{"owner": owner}, {"candidate_email": owner}, {"email": owner}],
        "event": {"$in": ["recruiter_view", "profile_view", "resume_view", "application_reviewed"]},
    }).sort("created_at", -1).limit(50)
    events = [serialize_mongo_like(doc) async for doc in cursor]
    return {
        "views": len(events),
        "events": events,
    }


@app.get("/api/candidate/saved-jobs")
async def list_saved_jobs(user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Saved jobs are available only to candidate users.")
    owner = current_user_email(user)
    cursor = db.saved_jobs.find({"$or": [{"owner": owner}, {"user_email": owner}, {"email": owner}]}).sort("created_at", -1)
    return [serialize_mongo_like(doc) async for doc in cursor]


@app.get("/api/candidate/job-matches")
async def list_candidate_job_matches(user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Job matches are available only to candidate users.")
    analytics = await collect_candidate_dashboard(current_user_email(user))
    return {
        "jobs": analytics.get("job_matches", []),
        "stats": analytics.get("stats", {}),
        "ai_analytics": analytics.get("ai_analytics", {}),
    }


@app.post("/api/candidate/saved-jobs")
async def save_candidate_job(payload: dict = Body(...), user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Saved jobs are available only to candidate users.")
    owner = current_user_email(user)
    job_id = str(payload.get("job_id") or payload.get("jobId") or "").strip()
    if not job_id:
        raise HTTPException(status_code=400, detail="job_id is required")
    existing = await db.saved_jobs.find_one({"owner": owner, "job_id": job_id})
    if existing:
        return serialize_mongo_like(existing)
    job_doc = await db.jobs.find_one({"_id": ObjectId(job_id)}) if ObjectId.is_valid(job_id) else None
    saved = {
        "owner": owner,
        "user_email": owner,
        "job_id": job_id,
        "job_title": payload.get("job_title") or (job_doc or {}).get("title") or (job_doc or {}).get("role") or "",
        "company": payload.get("company") or (job_doc or {}).get("company") or "",
        "location": payload.get("location") or (job_doc or {}).get("location") or "",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    result = await db.saved_jobs.insert_one(saved)
    saved["_id"] = result.inserted_id
    await log_candidate_analytics_event(owner, "job_saved", job_id=job_id)
    return serialize_mongo_like(saved)


@app.delete("/api/candidate/saved-jobs/{job_id}")
async def unsave_candidate_job(job_id: str, user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Saved jobs are available only to candidate users.")
    owner = current_user_email(user)
    result = await db.saved_jobs.delete_one({"owner": owner, "job_id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved job not found")
    await log_candidate_analytics_event(owner, "job_unsaved", job_id=job_id)
    return {"message": "Job removed from saved jobs"}


@app.get("/api/candidate/applications")
async def list_candidate_applications(user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Applications are available only to candidate users.")
    owner = current_user_email(user)
    cursor = db.applications.find({"$or": [{"candidate_email": owner}, {"owner": owner}, {"email": owner}, {"hr": owner}]}).sort("created_at", -1)
    return [serialize_mongo_like(doc) async for doc in cursor]


@app.post("/api/candidate/applications")
async def apply_to_candidate_job(payload: dict = Body(...), user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Applications are available only to candidate users.")
    owner = current_user_email(user)
    job_id = str(payload.get("job_id") or payload.get("jobId") or "").strip()
    if not job_id:
        raise HTTPException(status_code=400, detail="job_id is required")
    existing = await db.applications.find_one({"candidate_email": owner, "job_id": job_id, "status": {"$ne": "withdrawn"}})
    if existing:
        return serialize_mongo_like(existing)

    job_doc = await db.jobs.find_one({"_id": ObjectId(job_id)}) if ObjectId.is_valid(job_id) else None
    application = {
        "candidate_email": owner,
        "owner": owner,
        "job_id": job_id,
        "job_title": payload.get("job_title") or (job_doc or {}).get("title") or (job_doc or {}).get("role") or "",
        "company": payload.get("company") or (job_doc or {}).get("company") or "",
        "location": payload.get("location") or (job_doc or {}).get("location") or "",
        "status": "applied",
        "stage": "Applied",
        "source": "candidate_portal",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "date": datetime.utcnow(),
    }
    result = await db.applications.insert_one(application)
    application["_id"] = result.inserted_id
    await log_candidate_analytics_event(owner, "application_submitted", job_id=job_id, application_id=str(result.inserted_id))
    return serialize_mongo_like(application)


@app.post("/api/candidate/applications/{application_id}/withdraw")
async def withdraw_candidate_application(application_id: str, user: dict = Depends(get_current_user)):
    if user_role(user) != "candidate":
        raise HTTPException(status_code=403, detail="Applications are available only to candidate users.")
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=404, detail="Application not found")
    owner = current_user_email(user)
    result = await db.applications.update_one(
        {"_id": ObjectId(application_id), "candidate_email": owner},
        {"$set": {"status": "withdrawn", "stage": "Rejected", "updated_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    await log_candidate_analytics_event(owner, "application_withdrawn", application_id=application_id)
    return serialize_mongo_like(await db.applications.find_one({"_id": ObjectId(application_id)}))

@app.post("/api/ai/screen")
async def screen_resume(
    jd: str = Form(...), 
    resume: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    try:
        return await process_stored_resume(jd, resume, user)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {e}")
        detail = str(e) if DEV_MODE else "AI Processing Error"
        raise HTTPException(status_code=500, detail=detail)


@app.post("/api/resume-files/upload")
@app.post("/api/resumes/upload")
async def upload_resume_batch(
    background_tasks: BackgroundTasks,
    jd: str = Form(""),
    files: list[UploadFile] = File(...),
    user: dict = Depends(get_current_user),
):
    if not (
        has_permission(user.get("role", ""), "ai:screen")
        or has_permission(user.get("role", ""), "ai:candidate")
    ):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if not files:
        raise HTTPException(status_code=400, detail="Upload at least one resume file.")
    batch_id = uuid.uuid4().hex
    owner = current_user_email(user)
    expanded_files = await expand_bulk_resume_uploads(files, batch_id)
    if not expanded_files:
        raise HTTPException(status_code=400, detail="No supported resume files were found.")
    created_at = now_iso()
    queued = []
    failed_seed = []
    for index, item in enumerate(expanded_files, start=1):
        base_doc = {
            "batch_id": batch_id,
            "owner": owner,
            "index": index,
            "filename": item.get("filename") or f"resume-{index}",
            "source_archive": item.get("source_archive"),
            "created_at": created_at,
            "updated_at": created_at,
        }
        if item.get("status") == "failed":
            failed_seed.append({**base_doc, "status": "failed", "parsing_status": "failed", "error": item.get("error", "Invalid resume file.")})
            continue
        queued.append({**base_doc, "status": "queued", "parsing_status": "queued", "content_type": item.get("content_type"), "file_path": item.get("file_path")})
    if queued or failed_seed:
        await db.ats_batch_items.insert_many(queued + failed_seed)
    await db.ats_batches.insert_one({
        "batch_id": batch_id,
        "owner": owner,
        "uploaded_by": owner,
        "job_description": jd[:8000],
        "queues": ["resume_processing_queue", "ai_screening_queue", "candidate_ranking_queue"],
        "worker_concurrency": ATS_BATCH_CONCURRENCY,
        "status": "queued" if queued else "failed",
        "total": len(expanded_files),
        "total_uploaded": len(expanded_files),
        "processed": 0,
        "failed": len(failed_seed),
        "shortlisted": 0,
        "review": 0,
        "rejected": 0,
        "interview_ready": 0,
        "pending": len(queued),
        "created_at": created_at,
        "updated_at": created_at,
    })
    user_snapshot = {"email": owner, "role": user.get("role", ""), "name": user.get("name", owner)}
    if queued:
        background_tasks.add_task(run_ats_batch, batch_id, jd, user_snapshot)
    summary = await refresh_ats_batch(batch_id)
    payload = {
        "batch_id": batch_id,
        "status": "queued" if queued else "failed",
        "message": "Batch accepted for background ATS processing.",
        "queues": ["resume_processing_queue", "ai_screening_queue", "candidate_ranking_queue"],
        **({key: value for key, value in (summary or {}).items() if key not in {"batch", "items", "results", "ranking"}}),
    }
    cache_delete_prefix("ats:")
    cache_delete_prefix("bi:")
    cache_delete_prefix("summary:")
    await write_activity_log(user, "ATS Batch Queued", "ats_batches", metadata={"batch_id": batch_id, "total": len(expanded_files)})
    return payload


@app.get("/api/ats/batches/{batch_id}")
async def get_ats_batch(batch_id: str, user: dict = Depends(get_current_user)):
    role = user_role(user)
    owner = current_user_email(user)
    batch = await db.ats_batches.find_one({"batch_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="ATS batch not found")
    if not has_permission(role, "candidates:manage") and batch.get("owner") != owner:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    summary = await refresh_ats_batch(batch_id)
    if not summary:
        raise HTTPException(status_code=404, detail="ATS batch not found")
    ranked = summary.get("ranking", [])
    for rank, item in enumerate(ranked, start=1):
        item["rank"] = rank
    return summary


@app.get("/api/ats/processing-monitor")
async def ats_processing_monitor(user: dict = Depends(get_current_user)):
    role = user_role(user)
    owner = current_user_email(user)
    if not (has_permission(role, "ats:manage") or has_permission(role, "ai:screen") or has_permission(role, "ai:candidate")):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    query = {} if has_permission(role, "candidates:manage") or has_permission(role, "ats:manage") else {"owner": owner}
    total_batches = await db.ats_batches.count_documents(query)
    queued = await db.ats_batch_items.count_documents({**query, "status": "queued"})
    processing = await db.ats_batch_items.count_documents({**query, "status": "processing"})
    completed = await db.ats_batch_items.count_documents({**query, "status": "completed"})
    failed = await db.ats_batch_items.count_documents({**query, "status": "failed"})
    active_batches = await db.ats_batches.count_documents({**query, "status": {"$in": ["queued", "processing"]}})
    since = datetime.utcnow() - timedelta(minutes=5)
    recent_cursor = db.ats_batch_items.find({**query, "completed_at": {"$gte": since.isoformat()}}, {"duration_seconds": 1})
    recent = [doc async for doc in recent_cursor]
    throughput = round(len(recent) / 5, 1)
    avg_seconds = round(sum(numeric(item.get("duration_seconds")) for item in recent) / len(recent), 2) if recent else 0
    return {
        "queues": {
            "resume_processing_queue": queued + processing,
            "ai_screening_queue": processing,
            "candidate_ranking_queue": max(0, completed - failed),
        },
        "workers": {"configured": ATS_BATCH_CONCURRENCY, "active": min(ATS_BATCH_CONCURRENCY, processing), "active_batches": active_batches},
        "totals": {"batches": total_batches, "queued": queued, "processing": processing, "completed": completed, "failed": failed},
        "throughput_per_minute": throughput,
        "average_screening_seconds": avg_seconds,
        "updated_at": now_iso(),
    }


@app.get("/api/resume-files")
async def list_resume_files(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    paginated: bool = Query(False),
    user: dict = Depends(get_current_user),
):
    role = user_role(user)
    if not (has_permission(role, "ats:manage") or has_permission(role, "ai:screen") or has_permission(role, "ai:candidate")):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    owner = current_user_email(user)
    query = {} if has_permission(role, "candidates:manage") else {"owner": owner}
    cursor = db.resume_profiles.find(query).sort("upload_timestamp", -1).skip((page - 1) * limit).limit(limit)
    items = [serialize_resume_profile(doc) async for doc in cursor]
    if not paginated:
        return items
    total = await db.resume_profiles.count_documents(query)
    return {"items": items, "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}


@app.get("/api/resume-files/{resume_file_id}")
async def get_resume_file(resume_file_id: str, user: dict = Depends(get_current_user)):
    doc = await db.resume_profiles.find_one({"_id": object_id_or_404(resume_file_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Resume file not found")
    if not has_permission(user.get("role", ""), "candidates:manage") and doc.get("owner") != current_user_email(user):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return serialize_resume_profile(doc)


@app.get("/api/resume-files/{resume_file_id}/download")
async def download_resume_file(resume_file_id: str, user: dict = Depends(get_current_user)):
    doc = await db.resume_profiles.find_one({"_id": object_id_or_404(resume_file_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Resume file not found")
    if not has_permission(user.get("role", ""), "candidates:manage") and doc.get("owner") != current_user_email(user):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    path = stored_resume_path(doc)
    media_type = "application/pdf" if path.suffix.lower() == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(path, media_type=media_type, filename=doc.get("original_filename") or path.name)


@app.get("/api/resume-files/{resume_file_id}/preview")
async def preview_resume_file(resume_file_id: str, user: dict = Depends(get_current_user)):
    doc = await db.resume_profiles.find_one({"_id": object_id_or_404(resume_file_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Resume file not found")
    if not has_permission(user.get("role", ""), "candidates:manage") and doc.get("owner") != current_user_email(user):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    path = stored_resume_path(doc)
    if path.suffix.lower() == ".pdf":
        return FileResponse(path, media_type="application/pdf", filename=doc.get("original_filename") or path.name)
    preview_text = doc.get("extracted_text") or "Preview text is not available for this resume."
    return PlainTextResponse(preview_text[:60000])


@app.delete("/api/resume-files/{resume_file_id}")
async def delete_resume_file(resume_file_id: str, user: dict = Depends(get_current_user)):
    doc = await db.resume_profiles.find_one({"_id": object_id_or_404(resume_file_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Resume file not found")
    if not has_permission(user.get("role", ""), "candidates:manage") and doc.get("owner") != current_user_email(user):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    path = Path(doc.get("file_path", ""))
    try:
        resolved = path.resolve()
        base = RESUME_UPLOAD_DIR.resolve()
        if resolved.exists() and (base in resolved.parents or resolved == base):
            resolved.unlink()
    except OSError as exc:
        print(f"Resume file delete warning: {exc}")
    await db.resume_versions.insert_one({
        "resume_id": resume_file_id,
        "candidate_id": doc.get("candidate_id"),
        "version_type": "deleted",
        "original_filename": doc.get("original_filename"),
        "stored_filename": doc.get("stored_filename"),
        "file_path": doc.get("file_path"),
        "created_by": current_user_email(user),
        "created_at": now_iso(),
        "notes": "Physical resume file and metadata deleted.",
    })
    await db.resume_profiles.delete_one({"_id": object_id_or_404(resume_file_id)})
    cache_delete_prefix("ats:")
    cache_delete_prefix("bi:")
    cache_delete_prefix("summary:")
    await write_activity_log(user, "Resume File Deleted", "resume_profiles", metadata={"resume_file_id": resume_file_id})
    return {"message": "Resume file deleted"}


@app.get("/api/resume-files/{resume_file_id}/versions")
async def list_resume_versions(resume_file_id: str, user: dict = Depends(get_current_user)):
    doc = await db.resume_profiles.find_one({"_id": object_id_or_404(resume_file_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Resume file not found")
    if not has_permission(user.get("role", ""), "candidates:manage") and doc.get("owner") != current_user_email(user):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    cursor = db.resume_versions.find({"resume_id": resume_file_id}).sort("created_at", -1)
    versions = []
    async for version in cursor:
        version["id"] = str(version.pop("_id"))
        version.pop("file_hash", None)
        versions.append(version)
    return versions


@app.get("/api/resume-files/{resume_file_id}/ats-report")
async def get_resume_ats_report(resume_file_id: str, user: dict = Depends(get_current_user)):
    doc = await db.resume_profiles.find_one({"_id": object_id_or_404(resume_file_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Resume file not found")
    if not has_permission(user.get("role", ""), "candidates:manage") and doc.get("owner") != current_user_email(user):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    report = await db.ats_reports.find_one({"resume_profile_id": resume_file_id}, sort=[("created_at", -1)])
    if not report:
        raise HTTPException(status_code=404, detail="ATS report not found")
    report["id"] = str(report.pop("_id"))
    return report


@app.get("/api/ats/reports")
async def list_ats_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    paginated: bool = Query(False),
    user: dict = Depends(get_current_user),
):
    role = user_role(user)
    owner = current_user_email(user)
    query = {} if has_permission(role, "candidates:manage") else {"hr": owner}
    cursor = db.ats_reports.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    reports = []
    async for report in cursor:
        report["id"] = str(report.pop("_id"))
        reports.append(report)
    if not paginated:
        return reports
    total = await db.ats_reports.count_documents(query)
    return {"items": reports, "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}


def display_date(value):
    parsed = parse_datetime_value(value)
    if parsed:
        return parsed.date().isoformat()
    return str(value or "")


@app.get("/api/features/{feature_type}")
async def feature_workspace_data(feature_type: str, user: dict = Depends(get_current_user)):
    role = user_role(user)
    owner = current_user_email(user)

    async def employee_rows(limit=50):
        query = {} if has_permission(role, "employees:read") or has_permission(role, "employees:manage") else {"email": owner}
        return [serialize_mongo_like(doc) async for doc in db.employees.find(query).sort("created_at", -1).limit(limit)]

    async def notification_rows(limit=50):
        query = {} if has_permission(role, "announcements:read") and role != "candidate" else {"$or": [{"owner": owner}, {"email": owner}, {"user_email": owner}]}
        return [serialize_mongo_like(doc) async for doc in db.notifications.find(query).sort("created_at", -1).limit(limit)]

    if feature_type == "jobs":
        if not has_permission(role, "jobs:manage"):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        jobs = [serialize_mongo_like(doc) async for doc in db.jobs.find({}).sort("created_at", -1).limit(100)]
        active_statuses = {"open", "active", "published"}
        rows = [{
            "id": item.get("id"),
            "role": item.get("title") or item.get("role") or item.get("name") or "Untitled role",
            "department": item.get("department", ""),
            "location": item.get("location", ""),
            "pipeline": item.get("pipeline") or item.get("applicants_count") or 0,
            "status": item.get("status", "Draft"),
        } for item in jobs]
        return {
            "cards": [
                ["Open jobs", sum(1 for item in jobs if str(item.get("status", "")).lower() in active_statuses)],
                ["Total jobs", len(jobs)],
                ["Departments", len({item.get("department") for item in jobs if item.get("department")})],
                ["Draft roles", sum(1 for item in jobs if str(item.get("status", "")).lower() == "draft")],
            ],
            "rows": rows,
        }

    if feature_type == "offers":
        if not has_permission(role, "offers:manage"):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        offer_query = {"$or": [{"type": "offer"}, {"stage": {"$regex": "offer", "$options": "i"}}, {"status": {"$in": ["offer", "offered", "accepted"]}}]}
        offers = [serialize_mongo_like(doc) async for doc in db.applications.find(offer_query).sort("updated_at", -1).limit(100)]
        rows = [{
            "id": item.get("id"),
            "candidate": item.get("candidate_name") or item.get("candidate") or item.get("candidate_email") or item.get("email", ""),
            "role": item.get("job_title") or item.get("role") or item.get("position", ""),
            "package": item.get("package") or item.get("compensation") or item.get("salary") or "",
            "stage": item.get("stage") or item.get("status", ""),
            "owner": item.get("hr") or item.get("owner", ""),
        } for item in offers]
        return {
            "cards": [
                ["Draft offers", sum(1 for item in offers if str(item.get("status", "")).lower() == "draft")],
                ["Sent", sum(1 for item in offers if str(item.get("stage", "")).lower() in {"sent", "offer sent"} or str(item.get("status", "")).lower() == "offered")],
                ["Accepted", sum(1 for item in offers if str(item.get("status", "")).lower() == "accepted")],
                ["Total offers", len(offers)],
            ],
            "rows": rows,
        }

    if feature_type in {"announcements", "communication"}:
        notes = await notification_rows()
        unread = sum(1 for item in notes if not item.get("read"))
        rows = [{
            "id": item.get("id"),
            "announcement" if feature_type == "announcements" else "thread": item.get("title") or item.get("type") or "Notification",
            "category" if feature_type == "announcements" else "sender": item.get("category") or item.get("sender") or item.get("owner") or "System",
            "owner" if feature_type == "announcements" else "type": item.get("owner") or item.get("type") or "HRMS",
            "status": "Read" if item.get("read") else "Unread",
            "date" if feature_type == "announcements" else "time": display_date(item.get("created_at")),
        } for item in notes]
        return {
            "cards": [["Unread", unread], ["Messages", len(notes)], ["Read", len(notes) - unread], ["Action items", sum(1 for item in notes if item.get("action_required"))]],
            "rows": rows,
        }

    if feature_type == "savedJobs":
        if role != "candidate":
            raise HTTPException(status_code=403, detail="Saved jobs are available only to candidate users.")
        saved = [serialize_mongo_like(doc) async for doc in db.saved_jobs.find({"$or": [{"owner": owner}, {"user_email": owner}, {"email": owner}]}).sort("created_at", -1).limit(100)]
        applications = [serialize_mongo_like(doc) async for doc in db.applications.find({"candidate_email": owner}).sort("created_at", -1).limit(100)]
        applied_ids = {str(item.get("job_id") or "") for item in applications}
        rows = [{
            "id": item.get("id"),
            "role": item.get("job_title") or item.get("role") or "Saved role",
            "company": item.get("company", ""),
            "deadline": item.get("deadline") or "",
            "match": item.get("match") or item.get("match_score") or "",
            "status": "Applied" if str(item.get("job_id") or "") in applied_ids else "Saved",
        } for item in saved]
        return {"cards": [["Saved", len(saved)], ["Applied", sum(1 for item in saved if str(item.get("job_id") or "") in applied_ids)], ["Due soon", sum(1 for item in saved if item.get("deadline"))], ["Withdrawn", sum(1 for item in applications if item.get("status") == "withdrawn")]], "rows": rows}

    if feature_type == "career":
        if not has_permission(role, "career:own"):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        analytics = await collect_candidate_dashboard(owner) if role == "candidate" else {}
        ai = analytics.get("ai_analytics", {})
        ats = analytics.get("ats", {})
        recommendations = ai.get("career_recommendations", [])
        rows = [{
            "id": index + 1,
            "area": "Career readiness",
            "recommendation": item,
            "priority": "High" if index == 0 else "Medium",
            "timeline": "Next 30 days",
            "impact": f"{ai.get('hiring_probability', 0)}% probability",
        } for index, item in enumerate(recommendations)]
        return {
            "cards": [["Readiness", f"{ats.get('resume_strength', 0)}%"], ["Skill gaps", ai.get("skill_gap_count", 0)], ["Job matches", analytics.get("stats", {}).get("job_matches", 0)], ["Hiring probability", f"{ai.get('hiring_probability', 0)}%"]],
            "rows": rows,
        }

    if feature_type == "candidateInterviews":
        if role != "candidate":
            raise HTTPException(status_code=403, detail="Candidate interviews are available only to candidate users.")
        analytics = await collect_candidate_dashboard(owner)
        upcoming = analytics.get("interviews", {}).get("upcoming", [])
        rows = [{
            "id": item.get("id") or index + 1,
            "role": item.get("job_title") or item.get("role") or "Interview",
            "company": item.get("company", ""),
            "round": item.get("round") or item.get("mode", ""),
            "status": item.get("status") or "Scheduled",
            "tip": item.get("feedback") or "Use Voice AI prep before this interview.",
        } for index, item in enumerate(upcoming)]
        return {"cards": [["Scheduled", len(upcoming)], ["Completed", analytics.get("interviews", {}).get("completed", 0)], ["Feedback", analytics.get("interviews", {}).get("feedback_pending", 0)], ["Prep score", f"{analytics.get('ai_analytics', {}).get('hiring_probability', 0)}%"]], "rows": rows}

    if feature_type == "onboarding":
        if not has_permission(role, "onboarding:own") and not has_permission(role, "onboarding:manage"):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        query = {} if has_permission(role, "onboarding:manage") else {"employee_email": owner}
        workflows = [serialize_mongo_like(doc) async for doc in db.onboarding.find(query).sort("created_at", -1).limit(100)]
        rows = [{
            "id": item.get("id"),
            "employee": item.get("employee_name") or item.get("employee_email") or "",
            "role": item.get("role", ""),
            "startDate": item.get("start_date", ""),
            "progress": f"{item.get('profile_completion', 0)}%",
            "owner": item.get("owner", ""),
        } for item in workflows]
        return {
            "cards": [
                ["Workflows", len(workflows)],
                ["Approved", sum(1 for item in workflows if item.get("hr_approved"))],
                ["Documents", sum(int(item.get("documents_submitted") or 0) for item in workflows)],
                ["Completed", sum(1 for item in workflows if str(item.get("status", "")).lower() == "completed")],
            ],
            "rows": rows,
        }

    if feature_type in {"team", "performance"}:
        employees = await employee_rows()
        rows = [{
            "id": item.get("id"),
            "employee" if feature_type == "team" else "person": item.get("name") or item.get("employee_name") or item.get("email", ""),
            "role" if feature_type == "team" else "cycle": item.get("position") or item.get("role") or "Current",
            "capacity" if feature_type == "team" else "score": item.get("capacity") or item.get("performance_score") or 0,
            "performance" if feature_type == "team" else "manager": item.get("performance") or item.get("manager") or "",
            "status": item.get("status", "Active"),
        } for item in employees]
        return {"cards": [["Team size", len(employees)], ["Active", sum(1 for item in employees if str(item.get("status", "active")).lower() == "active")], ["On leave", sum(1 for item in employees if str(item.get("status", "")).lower() == "on leave")], ["Records", len(rows)]], "rows": rows}

    if feature_type in {"goals", "resources", "hiringRequests"}:
        collection = db.project_tasks if feature_type == "goals" else db.departments if feature_type == "resources" else db.hiring_requests
        docs = [serialize_mongo_like(doc) async for doc in collection.find({}).sort("created_at", -1).limit(100)]
        if feature_type == "goals":
            rows = [{"id": item.get("id"), "goal": item.get("title") or item.get("goal") or "Untitled goal", "owner": item.get("owner", ""), "progress": item.get("progress", 0), "due": item.get("due_date", ""), "risk": item.get("priority", "")} for item in docs]
            return {"cards": [["Active goals", len(docs)], ["On track", sum(1 for item in docs if item.get("status") != "Blocked")], ["At risk", sum(1 for item in docs if item.get("priority") == "High")], ["Completed", sum(1 for item in docs if item.get("status") == "Done")]], "rows": rows}
        if feature_type == "resources":
            rows = [{"id": item.get("id"), "team": item.get("name") or item.get("department", ""), "capacity": item.get("headcount") or item.get("employees") or 0, "allocation": item.get("budget", 0), "need": item.get("open_roles") or 0, "status": item.get("status", "Active")} for item in docs]
            return {"cards": [["Departments", len(docs)], ["Headcount", sum(int(item.get("headcount") or item.get("employees") or 0) for item in docs)], ["Open requests", sum(int(item.get("open_roles") or 0) for item in docs)], ["Records", len(rows)]], "rows": rows}
        rows = [{"id": item.get("id"), "role": item.get("role") or item.get("title") or "Hiring request", "team": item.get("team") or item.get("department", ""), "reason": item.get("reason", ""), "priority": item.get("priority", ""), "status": item.get("status", "Pending")} for item in docs]
        return {"cards": [["Requests", len(docs)], ["Approved", sum(1 for item in docs if item.get("status") == "Approved")], ["Pending", sum(1 for item in docs if item.get("status") == "Pending")], ["Forecast need", len(docs)]], "rows": rows}

    return {"cards": [["Records", 0], ["Active", 0], ["Pending", 0], ["Completed", 0]], "rows": []}

# --- RESUME BUILDER ---

def now_iso():
    return datetime.utcnow().isoformat()

def current_user_email(user) -> str:
    if isinstance(user, dict):
        return user.get("email") or user.get("username") or user.get("name") or ""
    return str(user or "")


async def write_activity_log(user: dict, action: str, resource: str, status: str = "success", metadata: dict = None):
    payload = {
        "actor": current_user_email(user),
        "role": user_role(user),
        "action": action,
        "resource": resource,
        "status": status,
        "metadata": metadata or {},
        "created_at": now_iso(),
    }
    await db.activity_logs.insert_one(payload)
    cache_delete_prefix("bi:")
    cache_delete_prefix("summary:")
    await realtime.broadcast({"type": "activity", "payload": payload}, current_user_email(user))
    await realtime.broadcast({"type": "activity", "payload": payload}, "*")


def start_of_month(months_back: int = 0):
    now = datetime.utcnow()
    month = now.month - months_back
    year = now.year
    while month <= 0:
        month += 12
        year -= 1
    return datetime(year, month, 1)


async def monthly_counts(collection, date_field: str, months: int = 6, query: dict = None):
    query = query or {}
    data = []
    for offset in reversed(range(months)):
        start = start_of_month(offset)
        end = start_of_month(offset - 1) if offset > 0 else datetime.utcnow()
        month_query = {
            **query,
            date_field: {"$gte": start.isoformat(), "$lt": end.isoformat()},
        }
        alt_query = {
            **query,
            date_field: {"$gte": start, "$lt": end},
        }
        count = await collection.count_documents(month_query)
        if count == 0:
            count = await collection.count_documents(alt_query)
        data.append({"month": start.strftime("%b"), "count": count})
    return data


async def bi_department_distribution(employee_query: dict):
    distribution = []
    pipeline = [
        {"$match": employee_query},
        {"$group": {"_id": {"$ifNull": ["$department", "Unassigned"]}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    async for item in db.employees.aggregate(pipeline):
        distribution.append({"department": item.get("_id") or "Unassigned", "count": int(item.get("count") or 0)})
    if not distribution:
        async for dept in db.departments.find({}).sort("name", 1).limit(50):
            distribution.append({"department": dept.get("name", "Department"), "count": int(dept.get("employees") or dept.get("headcount") or 0)})
    return distribution


def score_bucket(score):
    value = numeric(score)
    if value >= 90:
        return "90-100"
    if value >= 80:
        return "80-89"
    if value >= 70:
        return "70-79"
    if value >= 60:
        return "60-69"
    return "0-59"


async def bi_ats_distribution(query: dict):
    buckets = {"90-100": 0, "80-89": 0, "70-79": 0, "60-69": 0, "0-59": 0}
    cursor = db.resume_profiles.find(query, {"ats_score": 1, "scores": 1}).limit(1000)
    async for doc in cursor:
        score = doc.get("ats_score") or doc.get("scores", {}).get("ats")
        buckets[score_bucket(score)] += 1
    return [{"range": key, "count": value} for key, value in buckets.items()]


async def bi_activity_heatmap(query: dict):
    heatmap = []
    today = datetime.utcnow().date()
    for offset in range(29, -1, -1):
        day = today - timedelta(days=offset)
        start = datetime.combine(day, datetime.min.time())
        end = start + timedelta(days=1)
        count = await db.analytics.count_documents({
            **query,
            "$or": [
                {"created_at": {"$gte": start.isoformat(), "$lt": end.isoformat()}},
                {"created_at": {"$gte": start, "$lt": end}},
            ],
        })
        heatmap.append({"date": day.isoformat(), "count": count})
    return heatmap


def build_bi_pdf_bytes(title: str, rows: list[dict]) -> bytes:
    lines = [title, f"Generated: {now_iso()}", ""]
    if rows:
        headers = list(rows[0].keys())
        lines.append(" | ".join(headers))
        lines.append("-" * 72)
        for row in rows[:120]:
            lines.append(" | ".join(str(row.get(header, ""))[:80] for header in headers))
    else:
        lines.append("No rows available.")
    text = "\n".join(lines).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    content = f"BT /F1 10 Tf 40 760 Td ({text[:3500].replace(chr(10), ') Tj T* (')}) Tj ET"
    pdf = (
        "%PDF-1.4\n"
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n"
        "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        f"5 0 obj << /Length {len(content.encode('latin-1', errors='ignore'))} >> stream\n{content}\nendstream endobj\n"
        "xref\n0 6\n0000000000 65535 f \ntrailer << /Root 1 0 R /Size 6 >>\nstartxref\n0\n%%EOF"
    )
    return pdf.encode("latin-1", errors="ignore")

def serialize_resume(doc):
    if not doc:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

def object_id_or_404(value: str):
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=404, detail="Resume not found")
    return ObjectId(value)

async def find_owned_resume(resume_id: str, owner: str):
    resume = await db.resumes.find_one({"_id": object_id_or_404(resume_id), "owner": owner})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume

def default_resume_payload(owner: str, payload: dict):
    title = (payload.get("title") or "Untitled Resume").strip()
    personal = payload.get("personal") or {}
    sections = payload.get("sections") or [
        {"id": "summary", "type": "summary", "title": "Professional Summary", "items": [{"text": ""}]},
        {"id": "experience", "type": "experience", "title": "Experience", "items": []},
        {"id": "projects", "type": "projects", "title": "Projects", "items": []},
        {"id": "education", "type": "education", "title": "Education", "items": []},
        {"id": "skills", "type": "skills", "title": "Skills", "items": [{"text": ""}]},
    ]
    timestamp = now_iso()
    return {
        "owner": owner,
        "title": title,
        "target_role": payload.get("target_role", ""),
        "template": payload.get("template", "modern"),
        "theme": payload.get("theme", "cyan"),
        "font": payload.get("font", "Inter"),
        "visibility": payload.get("visibility", "private"),
        "share_id": payload.get("share_id") or uuid.uuid4().hex[:12],
        "personal": {
            "name": personal.get("name", ""),
            "headline": personal.get("headline", ""),
            "email": personal.get("email", owner),
            "phone": personal.get("phone", ""),
            "location": personal.get("location", ""),
            "website": personal.get("website", ""),
            "image": personal.get("image", ""),
        },
        "sections": sections,
        "analytics": payload.get("analytics", {"views": 0, "downloads": 0, "score": 72}),
        "created_at": timestamp,
        "updated_at": timestamp,
    }

def extract_resume_text(file_bytes: bytes, filename: str) -> str:
    if filename.lower().endswith(".pdf"):
        import io
        import PyPDF2

        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if filename.lower().endswith(".docx"):
        import io
        import docx

        document = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    return file_bytes.decode("utf-8", errors="ignore")

def build_parsed_resume(text: str, filename: str, owner: str):
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    phone_match = re.search(r"(\+?\d[\d\s().-]{7,}\d)", text)
    skills = []
    skill_bank = ["python", "react", "fastapi", "mongodb", "sql", "analytics", "leadership", "communication", "ai", "machine learning", "project management"]
    lower_text = text.lower()
    for skill in skill_bank:
        if skill in lower_text:
            skills.append(skill.title())

    return {
        "title": filename.rsplit(".", 1)[0],
        "personal": {
            "name": lines[0] if lines else "",
            "headline": lines[1] if len(lines) > 1 else "",
            "email": email_match.group(0) if email_match else owner,
            "phone": phone_match.group(0) if phone_match else "",
            "location": "",
            "website": "",
            "image": "",
        },
        "sections": [
            {"id": "summary", "type": "summary", "title": "Professional Summary", "items": [{"text": " ".join(lines[:4])[:700]}]},
            {"id": "experience", "type": "experience", "title": "Experience", "items": [{"role": "", "company": "", "period": "", "description": "\n".join(lines[4:14])[:1200]}]},
            {"id": "projects", "type": "projects", "title": "Projects", "items": []},
            {"id": "education", "type": "education", "title": "Education", "items": []},
            {"id": "skills", "type": "skills", "title": "Skills", "items": [{"text": ", ".join(skills)}]},
        ],
        "raw_text": text[:12000],
    }

def local_ai_response(action: str, content: str, job_description: str = ""):
    cleaned = re.sub(r"\s+", " ", content or "").strip()
    jd_cleaned = re.sub(r"\s+", " ", job_description or "").strip()
    if action == "summary":
        return f"Results-driven professional with experience in {cleaned[:140] or 'cross-functional execution'}, known for measurable impact, clear communication, and adaptable problem solving."
    if action == "rewrite":
        return f"Optimized version:\n{cleaned}\n\nAdd measurable outcomes, active verbs, and role-specific keywords from the target job."
    if action == "experience":
        return f"Led high-impact initiatives by translating business needs into structured execution, improving quality, collaboration, and delivery outcomes. Key context: {cleaned[:220]}"
    if action == "skills":
        base = ["Stakeholder Management", "Process Optimization", "Data Analysis", "Project Delivery", "Cross-functional Collaboration"]
        for skill in ["Python", "React", "MongoDB", "AWS", "Docker", "Power BI", "Tableau"]:
            if skill.lower() in f"{cleaned} {jd_cleaned}".lower() and skill not in base:
                base.insert(0, skill)
        return "\n".join(f"- {skill}" for skill in base)
    if action == "keywords":
        words = re.findall(r"\b[A-Za-z][A-Za-z+#.-]{2,}\b", jd_cleaned or cleaned)
        stop = {"and", "the", "for", "with", "you", "are", "our", "will", "this", "that", "from", "have"}
        keywords = []
        for word in words:
            normalized = word.strip(".,;:").title()
            if normalized.lower() not in stop and normalized not in keywords:
                keywords.append(normalized)
        return "\n".join(f"- {keyword}" for keyword in keywords[:16]) or "- Add role-specific tools, methods, certifications, and measurable outcomes."
    if action == "score":
        score = min(95, max(55, len(cleaned.split()) // 8 + 58))
        return f"Resume Score: {score}/100\nStrengths: clear baseline content and role alignment.\nImprove: add quantified achievements, job keywords, and concise outcome-focused bullets."
    if action == "template":
        lower = f"{cleaned} {jd_cleaned}".lower()
        if any(term in lower for term in ["executive", "director", "vp", "head of", "leadership"]):
            recommendation = "Executive"
        elif any(term in lower for term in ["developer", "engineer", "product", "data", "ai", "software"]):
            recommendation = "Modern Tech"
        elif any(term in lower for term in ["ats", "applicant tracking", "recruiter", "keyword"]):
            recommendation = "ATS Optimized"
        else:
            recommendation = "Corporate"
        return f"Recommended template: {recommendation}\nReason: Best fit for the role language, seniority, and ATS readability signals."
    if action == "interview":
        focus = jd_cleaned[:180] or cleaned[:180] or "the target role"
        return "\n".join([
            f"1. Walk me through the most relevant project you have delivered for {focus}.",
            "2. Which technical decision had the highest impact, and how did you validate it?",
            "3. Describe a time you handled ambiguous requirements or competing priorities.",
            "4. What metrics would you use to prove success in this role?",
            "5. Which skill gap would you improve first after joining?",
        ])
    if action == "career":
        return "\n".join([
            "Career roadmap:",
            "30 days: strengthen core role keywords and portfolio evidence.",
            "60 days: close the top skill gap with a practical project or certification.",
            "90 days: apply to matched roles and prepare interview stories tied to measurable outcomes.",
            "Learning recommendations: advanced analytics, stakeholder communication, and role-specific tooling.",
        ])
    if action == "chat":
        return f"Recruiter assistant response: {cleaned[:500] or 'Share a candidate, role, or transcript and I will summarize fit, risks, and next steps.'}"
    if action == "cover_letter":
        return f"Dear Hiring Team,\n\nI am excited to apply for this opportunity. My background aligns with your needs through practical execution, strong communication, and a record of improving outcomes. {job_description[:260]}\n\nSincerely,"
    return f"Optimized version:\n{cleaned}"

async def generate_resume_ai(action: str, content: str, job_description: str = ""):
    gemini_model = None
    if not DEV_MODE:
        try:
            import google.generativeai as genai

            api_key = os.getenv("GEMINI_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                gemini_model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-flash-latest"))
        except Exception as e:
            print(f"Gemini client unavailable: {e}")

    if gemini_model:
        prompt = (
            "You are an expert resume strategist. Return concise, formatted, ATS-friendly output.\n"
            f"Task: {action}\nJob description: {job_description[:2000]}\nResume content: {content[:4000]}"
        )
        try:
            response = gemini_model.generate_content(prompt)
            text = getattr(response, "text", None)
            if text:
                return text
        except Exception as e:
            print(f"Gemini resume helper failed: {e}")
    return local_ai_response(action, content, job_description)

@app.get("/api/resumes")
async def list_resumes(user: dict = Depends(get_current_user)):
    owner = current_user_email(user)
    cursor = db.resumes.find({"owner": owner}).sort("updated_at", -1)
    resumes = []
    async for doc in cursor:
        serialized = serialize_resume(doc)
        serialized["sections_count"] = len(serialized.get("sections", []))
        resumes.append(serialized)
    return resumes

@app.post("/api/resumes")
async def create_resume(payload: dict = Body(default={}), user: dict = Depends(get_current_user)):
    owner = current_user_email(user)
    resume = default_resume_payload(owner, payload)
    result = await db.resumes.insert_one(resume)
    resume["_id"] = result.inserted_id
    await write_activity_log(user, "Resume Created", "resumes", metadata={"resume_id": str(result.inserted_id)})
    return serialize_resume(resume)

@app.post("/api/resumes/ai/optimize")
async def optimize_resume(payload: dict = Body(...), user: dict = Depends(get_current_user)):
    action = payload.get("action", "rewrite")
    content = payload.get("content", "")
    job_description = payload.get("job_description", "")
    result = await generate_resume_ai(action, content, job_description)
    return {"result": result}

@app.post("/api/resumes/parse")
async def parse_resume_upload(resume: UploadFile = File(...), user: dict = Depends(get_current_user)):
    try:
        validate_resume_upload(resume)
        owner = current_user_email(user)
        file_bytes = await resume.read()
        text = extract_resume_text(file_bytes, resume.filename)
        return build_parsed_resume(text, resume.filename, owner)
    except Exception as e:
        print(f"Resume parse error: {e}")
        raise HTTPException(status_code=400, detail="Could not parse resume file.")

@app.get("/api/resumes/{resume_id}")
async def get_resume(resume_id: str, user: dict = Depends(get_current_user)):
    owner = current_user_email(user)
    return serialize_resume(await find_owned_resume(resume_id, owner))

@app.put("/api/resumes/{resume_id}")
async def update_resume(resume_id: str, payload: dict = Body(...), user: dict = Depends(get_current_user)):
    owner = current_user_email(user)
    await find_owned_resume(resume_id, owner)
    allowed = {"title", "target_role", "template", "theme", "font", "visibility", "personal", "sections", "analytics"}
    update_doc = {key: payload[key] for key in allowed if key in payload}
    update_doc["updated_at"] = now_iso()
    await db.resumes.update_one({"_id": object_id_or_404(resume_id), "owner": owner}, {"$set": update_doc})
    cache_delete_prefix("summary:")
    await realtime.broadcast({"type": "resume_updated", "resume_id": resume_id}, owner)
    return serialize_resume(await find_owned_resume(resume_id, owner))

@app.delete("/api/resumes/{resume_id}")
async def delete_resume(resume_id: str, user: dict = Depends(get_current_user)):
    owner = current_user_email(user)
    result = await db.resumes.delete_one({"_id": object_id_or_404(resume_id), "owner": owner})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
    await write_activity_log(user, "Resume Deleted", "resumes", metadata={"resume_id": resume_id})
    return {"message": "Resume deleted"}

@app.post("/api/resumes/{resume_id}/duplicate")
async def duplicate_resume(resume_id: str, user: dict = Depends(get_current_user)):
    owner = current_user_email(user)
    resume = await find_owned_resume(resume_id, owner)
    resume.pop("_id", None)
    resume["title"] = f"{resume.get('title', 'Resume')} Copy"
    resume["share_id"] = uuid.uuid4().hex[:12]
    resume["created_at"] = now_iso()
    resume["updated_at"] = now_iso()
    result = await db.resumes.insert_one(resume)
    resume["_id"] = result.inserted_id
    return serialize_resume(resume)

@app.get("/api/public/resumes/{share_id}")
async def public_resume(share_id: str):
    resume = await db.resumes.find_one({"share_id": share_id, "visibility": "public"})
    if not resume:
        raise HTTPException(status_code=404, detail="Public resume not found")
    await db.resumes.update_one({"_id": resume["_id"]}, {"$inc": {"analytics.views": 1}})
    await log_candidate_analytics_event(
        resume.get("owner"),
        "profile_view",
        resume_id=str(resume.get("_id")),
        share_id=share_id,
    )
    return serialize_resume(resume)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
