from fastapi import APIRouter, Depends
from database.connection import db
from middleware.auth import get_current_user, has_permission, user_role

router = APIRouter()


@router.get("/summary")
async def analytics_summary(user: dict = Depends(get_current_user)):
    role = user_role(user)
    employee_count = await db.employees.count_documents({})
    can_view_all_candidates = has_permission(role, "candidates:manage")
    can_view_workforce = has_permission(role, "analytics:workforce")
    can_view_team = has_permission(role, "analytics:team")
    candidate_query = {} if can_view_all_candidates else {"email": user.get("email")}
    candidate_count = await db.candidates.count_documents(candidate_query) if role != "employee" else 0
    shortlisted_count = await db.candidates.count_documents({**candidate_query, "ai_recommendation": "Selected"}) if role != "employee" else 0
    interview_count = await db.interviews.count_documents({}) if has_permission(role, "interviews:manage") else 0
    attendance_scope = has_permission(role, "attendance:all") or has_permission(role, "attendance:team") or has_permission(role, "attendance:own")
    attendance_today = await db.attendance.count_documents({"date": __import__("datetime").datetime.utcnow().date().isoformat()}) if attendance_scope else 0
    return {
        "employees": employee_count if can_view_workforce or can_view_team or has_permission(role, "employees:read") else 0,
        "candidates": candidate_count,
        "shortlisted": shortlisted_count,
        "interviews": interview_count,
        "attendance_today": attendance_today,
        "role": role,
        "analytics_scope": "workforce" if can_view_workforce else "team" if can_view_team else "recruiting" if can_view_all_candidates else "personal",
    }
