from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import ROLE_PERMISSIONS, get_current_user, has_permission, normalize_role, user_role

router = APIRouter()

ROLE_API_SCOPES = {
    "super_admin": [
        "/api/admin/*",
        "/api/employees/*",
        "/api/attendance/*",
        "/api/leave/*",
        "/api/projects/*",
        "/api/analytics/summary",
    ],
    "senior_manager": [
        "/api/projects/*",
        "/api/leave/*",
        "/api/employees/team",
        "/api/analytics/summary",
    ],
    "hr_recruiter": [
        "/api/candidates/*",
        "/api/interviews/*",
        "/api/ai/screen",
        "/api/ats/*",
        "/api/analytics/summary",
    ],
    "employee": [
        "/api/attendance/*",
        "/api/leave/*",
        "/api/resumes/*",
        "/api/projects/tasks",
    ],
    "candidate": [
        "/api/candidate/*",
        "/api/resumes/*",
        "/api/resume-files/*",
        "/api/public/resumes/*",
    ],
}

ROLE_DASHBOARDS = {
    "super_admin": "Enterprise Command Center",
    "senior_manager": "Leadership Operating System",
    "hr_recruiter": "Recruiting Command Workspace",
    "employee": "Employee Self-Service Hub",
    "candidate": "Candidate Career Portal",
}

ROLE_ANALYTICS = {
    "super_admin": ["workforce", "attendance", "leave", "payroll", "audit", "security"],
    "senior_manager": ["team_productivity", "team_attendance", "project_progress", "performance"],
    "hr_recruiter": ["open_jobs", "pipeline", "interviews", "time_to_hire", "recruiter_productivity"],
    "employee": ["attendance", "leave_balance", "salary", "performance", "learning"],
    "candidate": ["ats_score", "job_matches", "applications", "interviews", "resume_strength"],
}


def role_payload(role: str):
    normalized = normalize_role(role)
    if normalized not in ROLE_PERMISSIONS:
        raise HTTPException(status_code=404, detail="Role not found")
    return {
        "role": normalized,
        "dashboard": ROLE_DASHBOARDS[normalized],
        "permissions": sorted(ROLE_PERMISSIONS[normalized]),
        "api_scopes": ROLE_API_SCOPES[normalized],
        "analytics": ROLE_ANALYTICS[normalized],
    }


@router.get("/me")
async def get_my_rbac_scope(user: dict = Depends(get_current_user)):
    return role_payload(user_role(user))


@router.get("/roles/{role}/scope")
async def get_role_scope(role: str, user: dict = Depends(get_current_user)):
    if user_role(user) != "super_admin" and normalize_role(role) != user_role(user):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return role_payload(role)


@router.get("/roles/{role}/analytics")
async def get_role_analytics(role: str, user: dict = Depends(get_current_user)):
    requested_role = normalize_role(role)
    if requested_role != user_role(user) and not has_permission(user.get("role", ""), "analytics:all"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return {
        "role": requested_role,
        "dashboards": ROLE_ANALYTICS.get(requested_role, []),
        "prediction_engine": "enabled",
        "refresh_seconds": 30,
    }
