import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConfigurationError

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/hrms_pro")
client = AsyncIOMotorClient(
    MONGO_URI,
    maxPoolSize=int(os.getenv("MONGO_MAX_POOL_SIZE", "20")),
    minPoolSize=int(os.getenv("MONGO_MIN_POOL_SIZE", "0")),
    serverSelectionTimeoutMS=int(os.getenv("MONGO_SERVER_SELECTION_TIMEOUT_MS", "3000")),
    connectTimeoutMS=int(os.getenv("MONGO_CONNECT_TIMEOUT_MS", "3000")),
    uuidRepresentation="standard",
)
try:
    db = client.get_default_database()
except ConfigurationError:
    db = client.hrms_pro


async def configure_indexes():
    await client.admin.command("ping")
    await db.users.create_index("email", unique=True)
    await db.users.create_index([("role", 1), ("created_at", -1)])
    await db.roles.create_index("name", unique=True)
    await db.permissions.create_index("key", unique=True)
    await db.organization_units.create_index([("type", 1), ("name", 1)])
    await db.system_settings.create_index("key", unique=True)
    await db.employees.create_index("email", unique=True, sparse=True)
    await db.departments.create_index([("name", 1), ("status", 1)])
    await db.candidates.create_index([("created_at", -1)])
    await db.candidates.create_index([("email", 1), ("created_at", -1)])
    await db.jobs.create_index([("status", 1), ("created_at", -1)])
    await db.teams.create_index([("manager_email", 1), ("created_at", -1)])
    await db.workforce_plans.create_index([("department", 1), ("period", -1)])
    await db.performance_reviews.create_index([("employee", 1), ("cycle", -1)])
    await db.resource_allocations.create_index([("employee", 1), ("start_date", -1)])
    await db.budgets.create_index([("department", 1), ("period", -1)])
    await db.offers.create_index([("candidate", 1), ("created_at", -1)])
    await db.employee_profiles.create_index([("email", 1)], unique=True, sparse=True)
    await db.attendance_corrections.create_index([("owner", 1), ("date", -1)])
    await db.leave_balances.create_index([("owner", 1), ("leave_type", 1)])
    await db.payslips.create_index([("owner", 1), ("period", -1)])
    await db.goals.create_index([("owner", 1), ("status", 1), ("due_date", -1)])
    await db.training_courses.create_index([("category", 1), ("status", 1)])
    await db.interviews.create_index([("interview_date", -1)])
    await db.interviews.create_index([("candidate_id", 1), ("interview_date", -1)])
    await db.interviews.create_index([("status", 1), ("interview_date", -1)])
    await db.onboarding.create_index([("employee_email", 1), ("created_at", -1)])
    await db.onboarding.create_index([("status", 1), ("start_date", -1)])
    await db.onboarding_documents.create_index([("workflow_id", 1), ("created_at", -1)])
    await db.analytics.create_index([("scope", 1), ("created_at", -1)])
    await db.analytics.create_index([("owner", 1), ("created_at", -1)])
    await db.analytics.create_index([("event", 1), ("created_at", -1)])
    await db.notifications.create_index([("created_at", -1)])
    await db.leave_requests.create_index([("employee_id", 1), ("created_at", -1)])
    await db.attendance.create_index([("employee_id", 1), ("date", -1)])
    await db.resumes.create_index([("owner", 1), ("updated_at", -1)])
    await db.resumes.create_index("share_id", unique=True, sparse=True)
    await db.ats_reports.create_index([("hr", 1), ("created_at", -1)])
    await db.ats_reports.create_index([("owner", 1), ("created_at", -1)])
    await db.ats_reports.create_index([("candidate_email", 1), ("created_at", -1)])
    await db.resume_profiles.create_index([("owner", 1), ("updated_at", -1)])
    await db.resume_profiles.create_index([("file_hash", 1), ("owner", 1)])
    await db.resume_profiles.create_index([("candidate_id", 1)])
    await db.resume_profiles.create_index([("ats_score", -1), ("updated_at", -1)])
    await db.resume_profiles.create_index([("job_id", 1), ("ats_score", -1)])
    await db.resume_profiles.create_index([("extracted_skills", 1)])
    await db.resume_profiles.create_index([("owner", 1), ("status", 1), ("ats_score", -1)])
    await db.resume_profiles.create_index([("parsing_status", 1), ("upload_timestamp", -1)])
    await db.ats_batches.create_index([("owner", 1), ("created_at", -1)])
    await db.ats_batches.create_index([("status", 1), ("updated_at", -1)])
    await db.ats_batch_items.create_index([("batch_id", 1), ("index", 1)])
    await db.ats_batch_items.create_index([("batch_id", 1), ("status", 1)])
    await db.ats_batch_items.create_index([("owner", 1), ("created_at", -1)])
    await db.resume_templates.create_index("slug", unique=True, sparse=True)
    await db.resume_versions.create_index([("resume_id", 1), ("created_at", -1)])
    await db.resume_versions.create_index([("file_hash", 1), ("created_at", -1)])
    await db.applications.create_index([("hr", 1), ("date", -1)])
    await db.applications.create_index([("candidate_email", 1), ("created_at", -1)])
    await db.saved_jobs.create_index([("owner", 1), ("created_at", -1)])
    await db.saved_jobs.create_index([("owner", 1), ("job_id", 1)])
    await db.saved_jobs.create_index([("user_email", 1), ("created_at", -1)])
    await db.ai_suggestions.create_index([("owner", 1), ("created_at", -1)])
    await db.project_tasks.create_index([("owner", 1), ("status", 1), ("created_at", -1)])
    await db.project_tasks.create_index([("created_by", 1), ("created_at", -1)])
    await db.project_sprints.create_index([("status", 1), ("created_at", -1)])
    await db.payroll.create_index([("period", -1)], unique=True)
    await db.audit_logs.create_index([("timestamp", -1)])
    await db.activity_logs.create_index([("actor", 1), ("created_at", -1)])
    await db.activity_logs.create_index([("resource", 1), ("created_at", -1)])
    await db.security_alerts.create_index([("status", 1), ("severity", 1), ("created_at", -1)])
    await db.interview_transcripts.create_index([("owner", 1), ("created_at", -1)])
    await seed_role_permissions()


async def seed_role_permissions():
    permission_groups = {
        "super_admin": [
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
        ],
        "senior_manager": [
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
        ],
        "hr_recruiter": [
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
        ],
        "employee": [
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
        ],
        "candidate": [
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
        ],
    }
    all_permissions = sorted({permission for permissions in permission_groups.values() for permission in permissions})
    for permission in all_permissions:
        await db.permissions.update_one(
            {"key": permission},
            {"$setOnInsert": {"key": permission, "description": permission.replace(":", " ")}},
            upsert=True,
        )
    for role, permissions in permission_groups.items():
        await db.roles.update_one(
            {"name": role},
            {"$set": {"name": role, "permissions": permissions}},
            upsert=True,
        )


def close_database():
    client.close()
