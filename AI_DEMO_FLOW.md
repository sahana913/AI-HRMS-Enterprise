# AI-HRMS Demo Flow

This flow demonstrates the added AI features without changing existing project behavior.

## Seed Demo Data

```powershell
cd D:\AI-HRMS-PRO
.\.venv\Scripts\python.exe scripts\seed-ai-demo-data.py
```

All seeded records are marked with `demo_seed: true`.

## Demo Users

Password for all demo users:

```text
Demo@12345
```

- `demo-super@aihrms.local` - Super Admin
- `demo-management@aihrms.local` - Management Admin
- `demo-manager@aihrms.local` - Senior Manager
- `demo-hr@aihrms.local` - HR Recruiter
- `demo-employee@aihrms.local` - Employee
- `demo-candidate@aihrms.local` - Candidate

## Recommended Walkthrough

1. Start the project:

```powershell
cd D:\AI-HRMS-PRO
.\scripts\start-dev.ps1
```

2. Open:

```text
http://127.0.0.1:5173
```

3. Login as `demo-hr@aihrms.local`.

4. Show:

- HR dashboard AI differentiators
- ATS Screening dashboard
- Candidate Ranking pipeline
- Video Interviews and Voice AI
- HR Chatbot

5. Login as `demo-management@aihrms.local`.

6. Show:

- Executive analytics
- AI Skill Graph
- Internal Talent Marketplace
- Succession Planning
- Burnout Detection
- Compliance Monitor
- Predictive Payroll Alerts

7. Login as `demo-employee@aihrms.local`.

8. Show:

- Employee dashboard
- HR Chatbot
- Career and learning signals

## What This Proves

- Multi-role login and RBAC
- Core HRMS data: employees, attendance, leave, payroll, interviews, notifications
- AI ATS resume screening and ranking
- AI workforce intelligence layer
- AI performance and attrition-style analytics
- HR chatbot and voice screening flows
- Enterprise dashboard readiness
