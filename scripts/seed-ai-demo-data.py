import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from database.connection import close_database, configure_indexes, db
from middleware.auth import get_password_hash


PASSWORD = "Demo@12345"
NOW = datetime.utcnow()


def iso(days_back=0):
    return (NOW - timedelta(days=days_back)).isoformat()


async def upsert_user(name, email, role):
    await db.users.update_one(
        {"email": email},
        {
            "$set": {
                "name": name,
                "role": role,
                "status": "active",
                "demo_seed": True,
                "updated_at": iso(),
            },
            "$setOnInsert": {
                "email": email,
                "password": get_password_hash(PASSWORD),
                "created_at": NOW,
            },
        },
        upsert=True,
    )


async def upsert_many(collection, key_field, rows):
    for row in rows:
        row = {**row, "demo_seed": True, "updated_at": iso()}
        await collection.update_one(
            {key_field: row[key_field]},
            {"$set": row},
            upsert=True,
        )


async def seed():
    await configure_indexes()

    users = [
        ("Demo Super Admin", "demo-super@aihrms.local", "super_admin"),
        ("Demo Management Admin", "demo-management@aihrms.local", "management_admin"),
        ("Demo Senior Manager", "demo-manager@aihrms.local", "senior_manager"),
        ("Demo HR Recruiter", "demo-hr@aihrms.local", "hr_recruiter"),
        ("Demo Employee", "demo-employee@aihrms.local", "employee"),
        ("Demo Candidate", "demo-candidate@aihrms.local", "candidate"),
    ]
    for user in users:
        await upsert_user(*user)

    employees = [
        {"employee_id": "DEMO-E001", "name": "Aarav Mehta", "email": "aarav.demo@aihrms.local", "department": "Engineering", "position": "Senior Backend Engineer", "status": "Active", "skills": ["Python", "FastAPI", "MongoDB", "Docker", "AWS"], "performance": 91, "hire_date": "2024-01-15"},
        {"employee_id": "DEMO-E002", "name": "Priya Nair", "email": "priya.demo@aihrms.local", "department": "Product", "position": "Product Manager", "status": "Active", "skills": ["Analytics", "Leadership", "Agile", "SQL", "Communication"], "performance": 88, "hire_date": "2023-08-21"},
        {"employee_id": "DEMO-E003", "name": "Rohan Sen", "email": "rohan.demo@aihrms.local", "department": "People Ops", "position": "HR Business Partner", "status": "Active", "skills": ["Recruiting", "HRIS", "ATS", "Communication", "Analytics"], "performance": 84, "hire_date": "2023-03-10"},
        {"employee_id": "DEMO-E004", "name": "Neha Rao", "email": "neha.demo@aihrms.local", "department": "Engineering", "position": "Frontend Engineer", "status": "Active", "skills": ["React", "TypeScript", "JavaScript", "UI", "Testing"], "performance": 79, "hire_date": "2024-05-02"},
        {"employee_id": "DEMO-E005", "name": "Kabir Khan", "email": "kabir.demo@aihrms.local", "department": "Data", "position": "ML Engineer", "status": "Active", "skills": ["Machine Learning", "Python", "NLP", "Scikit-Learn", "AWS"], "performance": 86, "hire_date": "2022-11-18"},
    ]
    await upsert_many(db.employees, "employee_id", employees)

    jobs = [
        {"job_id": "DEMO-J001", "title": "AI Full Stack Engineer", "department": "Engineering", "status": "Open", "skills": ["Python", "FastAPI", "React", "MongoDB", "Docker", "AWS"], "openings": 3, "created_at": iso(12)},
        {"job_id": "DEMO-J002", "title": "People Analytics Lead", "department": "People Ops", "status": "Open", "skills": ["Analytics", "Power BI", "HRIS", "Leadership"], "openings": 1, "created_at": iso(8)},
    ]
    await upsert_many(db.jobs, "job_id", jobs)

    candidates = [
        {"candidate_key": "DEMO-C001", "candidate_name": "John Doe", "email": "john.candidate@demo.local", "skills": ["Python", "FastAPI", "React", "MongoDB", "AWS"], "resume_score": 94, "education_match": 82, "industry_fit": 76, "ai_recommendation": "Selected", "status": "screening", "stage": "Shortlisted", "source": "resume_screening", "hr": "demo-hr@aihrms.local", "summary": "Strong full-stack AI platform candidate with relevant backend and frontend delivery.", "created_at": iso(5)},
        {"candidate_key": "DEMO-C002", "candidate_name": "Sarah Smith", "email": "sarah.candidate@demo.local", "skills": ["React", "TypeScript", "Docker", "Analytics"], "resume_score": 86, "education_match": 74, "industry_fit": 68, "ai_recommendation": "Shortlist", "status": "screening", "stage": "Screening", "source": "LinkedIn", "hr": "demo-hr@aihrms.local", "summary": "Frontend-heavy candidate with useful analytics exposure.", "created_at": iso(4)},
        {"candidate_key": "DEMO-C003", "candidate_name": "Rahul Kumar", "email": "rahul.candidate@demo.local", "skills": ["Python", "Machine Learning", "NLP", "Scikit-Learn"], "resume_score": 78, "education_match": 88, "industry_fit": 72, "ai_recommendation": "Review", "status": "screening", "stage": "Applied", "source": "Referral", "hr": "demo-hr@aihrms.local", "summary": "ML candidate worth review for AI screening and NLP features.", "created_at": iso(3)},
    ]
    await upsert_many(db.candidates, "candidate_key", candidates)

    resume_profiles = [
        {"profile_key": "DEMO-R001", "owner": "demo-hr@aihrms.local", "candidate_name": "John Doe", "original_filename": "john-doe-demo.pdf", "ats_score": 94, "semantic_score": 91, "keyword_match": 88, "skill_match_score": 96, "experience_match_score": 90, "education_match": 82, "industry_fit": 76, "missing_skills": ["Kubernetes"], "extracted_skills": ["Python", "FastAPI", "React", "MongoDB", "Docker", "AWS"], "status": "shortlisted", "parsing_status": "completed", "upload_timestamp": iso(5), "updated_at": iso(5)},
        {"profile_key": "DEMO-R002", "owner": "demo-hr@aihrms.local", "candidate_name": "Sarah Smith", "original_filename": "sarah-smith-demo.docx", "ats_score": 86, "semantic_score": 83, "keyword_match": 81, "skill_match_score": 84, "experience_match_score": 79, "education_match": 74, "industry_fit": 68, "missing_skills": ["FastAPI", "AWS"], "extracted_skills": ["React", "TypeScript", "Docker", "Analytics"], "status": "pending_review", "parsing_status": "completed", "upload_timestamp": iso(4), "updated_at": iso(4)},
        {"profile_key": "DEMO-R003", "owner": "demo-hr@aihrms.local", "candidate_name": "Rahul Kumar", "original_filename": "rahul-kumar-demo.pdf", "ats_score": 78, "semantic_score": 80, "keyword_match": 72, "skill_match_score": 76, "experience_match_score": 70, "education_match": 88, "industry_fit": 72, "missing_skills": ["React", "Docker", "AWS"], "extracted_skills": ["Python", "Machine Learning", "NLP", "Scikit-Learn"], "status": "pending_review", "parsing_status": "completed", "upload_timestamp": iso(3), "updated_at": iso(3)},
    ]
    await upsert_many(db.resume_profiles, "profile_key", resume_profiles)

    ats_reports = [
        {"report_key": "DEMO-A001", "owner": "demo-hr@aihrms.local", "hr": "demo-hr@aihrms.local", "candidate": "John Doe", "candidate_email": "john.candidate@demo.local", "scores": {"ats": 94, "semantic": 91, "keyword_match": 88, "skills_match": 96, "experience_match": 90, "education_match": 82, "industry_fit": 76}, "missing_keywords": ["Kubernetes"], "matched_keywords": ["Python", "FastAPI", "React"], "created_at": iso(5)},
        {"report_key": "DEMO-A002", "owner": "demo-hr@aihrms.local", "hr": "demo-hr@aihrms.local", "candidate": "Sarah Smith", "candidate_email": "sarah.candidate@demo.local", "scores": {"ats": 86, "semantic": 83, "keyword_match": 81, "skills_match": 84, "experience_match": 79, "education_match": 74, "industry_fit": 68}, "missing_keywords": ["FastAPI", "AWS"], "matched_keywords": ["React", "Docker"], "created_at": iso(4)},
    ]
    await upsert_many(db.ats_reports, "report_key", ats_reports)

    await upsert_many(db.attendance, "attendance_key", [
        {"attendance_key": "DEMO-ATT-1", "employee_id": "DEMO-E001", "email": "aarav.demo@aihrms.local", "date": NOW.date().isoformat(), "status": "Present", "hours": 8, "created_at": iso()},
        {"attendance_key": "DEMO-ATT-2", "employee_id": "DEMO-E004", "email": "neha.demo@aihrms.local", "date": NOW.date().isoformat(), "status": "Present", "hours": 7.5, "created_at": iso()},
    ])

    await upsert_many(db.leave_requests, "leave_key", [
        {"leave_key": "DEMO-L001", "employee_id": "DEMO-E004", "employee_name": "Neha Rao", "status": "Pending", "leave_type": "Sick Leave", "days": 2, "created_at": iso(2)},
        {"leave_key": "DEMO-L002", "employee_id": "DEMO-E002", "employee_name": "Priya Nair", "status": "Approved", "leave_type": "Annual Leave", "days": 3, "created_at": iso(14)},
    ])

    await upsert_many(db.payroll, "period", [
        {"period": NOW.strftime("%Y-%m"), "monthly_cost": 725000, "headcount": 5, "avg_salary": 145000, "created_at": iso(1)}
    ])

    await upsert_many(db.interviews, "interview_key", [
        {"interview_key": "DEMO-I001", "candidate_id": "DEMO-C001", "candidate_name": "John Doe", "candidate_email": "john.candidate@demo.local", "round": "Technical Round", "mode": "Video", "status": "Scheduled", "interview_date": (NOW + timedelta(days=2)).isoformat(), "created_at": iso(1)}
    ])

    await upsert_many(db.project_tasks, "task_key", [
        {"task_key": "DEMO-T001", "title": "Ship AI skill graph dashboard", "owner": "demo-employee@aihrms.local", "status": "Done", "created_at": iso(9)},
        {"task_key": "DEMO-T002", "title": "Review burnout-risk alerts", "owner": "demo-manager@aihrms.local", "status": "In Progress", "created_at": iso(3)},
    ])

    await upsert_many(db.goals, "goal_key", [
        {"goal_key": "DEMO-G001", "owner": "demo-manager@aihrms.local", "title": "Improve hiring cycle time", "status": "Done", "created_at": iso(20)},
        {"goal_key": "DEMO-G002", "owner": "demo-employee@aihrms.local", "title": "Complete AI HRMS onboarding", "status": "In Progress", "created_at": iso(7)},
    ])

    await upsert_many(db.training_courses, "course_key", [
        {"course_key": "DEMO-TR001", "owner": "demo-employee@aihrms.local", "title": "Responsible AI for HR", "category": "AI", "status": "Completed", "created_at": iso(11)},
        {"course_key": "DEMO-TR002", "owner": "demo-employee@aihrms.local", "title": "Advanced People Analytics", "category": "Analytics", "status": "In Progress", "created_at": iso(6)},
    ])

    await upsert_many(db.security_alerts, "alert_key", [
        {"alert_key": "DEMO-S001", "title": "Demo permission review", "severity": "medium", "status": "open", "created_at": iso(2)}
    ])

    await upsert_many(db.notifications, "notification_key", [
        {"notification_key": "DEMO-N001", "owner": "demo-hr@aihrms.local", "title": "AI shortlist ready", "message": "3 candidates ranked for AI Full Stack Engineer.", "read": False, "created_at": iso(1)}
    ])

    print("AI-HRMS demo data seeded.")
    print(f"Demo password for all demo users: {PASSWORD}")
    print("Demo users:")
    for _, email, role in users:
        print(f"- {email} ({role})")


if __name__ == "__main__":
    try:
        asyncio.run(seed())
    finally:
        close_database()
