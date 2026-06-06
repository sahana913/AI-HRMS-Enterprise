# AI-HRMS Pro

AI-HRMS Pro is an AI-powered Human Resource Management System for recruitment, employee operations, and workforce analytics. It combines ATS resume screening, AI resume ranking, candidate pipeline management, employee records, attendance, leave, payroll, interviews, role-based dashboards, and MongoDB-backed reporting in one platform.

## Key Features

- ATS Resume Screening
- AI Resume Ranking
- Candidate Pipeline Management
- Employee Management
- Attendance and Leave Management
- Payroll Management
- Interview Scheduling and Assistance
- Resume Builder and AI Resume Optimization
- Workforce Analytics and Executive Dashboards
- AI HR Chatbot and Voice Screening
- Role-Based Access Control
- Notifications and Alerts
- MongoDB / MongoDB Atlas Integration
- Cloud Deployment support for Render and Vercel

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Recharts, Framer Motion
- Backend: FastAPI, Uvicorn, JWT authentication, Motor async MongoDB driver
- Database: MongoDB local or MongoDB Atlas
- AI/NLP: Gemini-compatible AI, Sentence Transformers, SpaCy, scikit-learn, lexical fallback matching
- Deployment: Render for backend, Vercel for frontend

## Project Structure

```text
AI-HRMS-PRO/
|-- backend/              FastAPI API, routers, services, AI module, MongoDB connection
|-- frontend/             React + Vite frontend
|-- scripts/              PowerShell scripts for local development and demo data
|-- START_COMMANDS.md     Quick local startup commands
|-- DEPLOYMENT.md         Deployment notes
`-- README.md
```

## Prerequisites

Install these before running the project:

- Python 3.10 or newer
- Node.js 18 or newer
- npm
- MongoDB Community Server, or a MongoDB Atlas cluster
- Git

Recommended for Windows:

- PowerShell 7 or Windows PowerShell
- Visual Studio Build Tools if Python AI packages need local compilation

## 1. Clone The Repository

```powershell
git clone https://github.com/sahana913/AI-HRMS-Enterprise.git
cd AI-HRMS-Enterprise
```

If you already have the project folder, open PowerShell inside the project root.

## 2. Backend Setup

Create and activate a Python virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install backend requirements:

```powershell
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
```

Install the SpaCy English model:

```powershell
python -m spacy download en_core_web_sm
```

## 3. Backend Environment Variables

Create `backend\.env` from the example file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Update `backend\.env`:

```env
APP_MODE=development
DEV_MOCK_ANALYTICS=false
AI_LOCAL_FILES_ONLY=true
MONGO_URI=mongodb://localhost:27017/hrms_pro
JWT_SECRET=replace-with-a-long-secure-secret
ACCESS_TOKEN_EXPIRE_MINUTES=60
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
RESEND_API_KEY=
SMTP_EMAIL=
SMTP_PASSWORD=
```

For MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/hrms_pro?retryWrites=true&w=majority
```

Important: never commit real secrets, passwords, API keys, or production database URLs.

## 4. Frontend Setup

Install frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

The development frontend proxies API calls to the backend. By default, it uses:

```text
http://127.0.0.1:5002
```

For deployed frontend environments such as Vercel, set:

```env
VITE_API_URL=https://your-render-backend-url.onrender.com
```

## 5. Run The Project Locally

### Option A: Start Everything Automatically

From the project root:

```powershell
.\scripts\start-dev.ps1
```

This opens separate terminals for MongoDB, backend, and frontend.

Local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://127.0.0.1:5002
```

### Option B: Start Manually

Terminal 1 - MongoDB:

```powershell
.\scripts\start-mongodb-dev.ps1
```

Terminal 2 - Backend:

```powershell
.\.venv\Scripts\Activate.ps1
.\scripts\start-backend-dev.ps1
```

Terminal 3 - Frontend:

```powershell
.\scripts\start-frontend-dev.ps1
```

## 6. Seed Demo Data

Use this optional command to create demo users and sample HR data:

```powershell
.\.venv\Scripts\python.exe scripts\seed-ai-demo-data.py
```

Demo password for all seeded users:

```text
Demo@12345
```

Demo accounts:

- `demo-super@aihrms.local` - Super Admin
- `demo-management@aihrms.local` - Management Admin
- `demo-manager@aihrms.local` - Senior Manager
- `demo-hr@aihrms.local` - HR Recruiter
- `demo-employee@aihrms.local` - Employee
- `demo-candidate@aihrms.local` - Candidate

## 7. Build Checks

Backend syntax check:

```powershell
python -m compileall backend
```

Frontend production build:

```powershell
cd frontend
npm run build
cd ..
```

## 8. Deployment Overview

### Backend On Render

Use these settings:

- Root directory: `backend`
- Runtime: Python
- Build command: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
- Start command: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`

Set these Render environment variables:

```env
APP_MODE=production
MONGO_URI=<your MongoDB Atlas URI>
JWT_SECRET=<strong production secret>
ACCESS_TOKEN_EXPIRE_MINUTES=60
GEMINI_API_KEY=<optional>
GEMINI_MODEL=gemini-flash-latest
CORS_ORIGINS=https://your-vercel-domain.vercel.app
RESEND_API_KEY=<optional>
SMTP_EMAIL=<optional>
SMTP_PASSWORD=<optional>
```

### Frontend On Vercel

Use these settings:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Set this Vercel environment variable:

```env
VITE_API_URL=https://your-render-backend-url.onrender.com
```

## Main API Areas

- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Employees: `/api/employees`
- Attendance: `/api/attendance`
- Leave: `/api/leave`
- Interviews: `/api/interviews`
- Candidates: `/api/candidates`
- ATS and resume files: `/api/ats/*`, `/api/resume-files/*`
- Resume builder: `/api/resumes`
- Analytics: `/api/analytics/summary`, `/api/bi/dashboard`, `/api/v2/analytics`
- AI modules: `/api/ai/*`, `/api/chatbot/message`, `/api/voice/*`
- RBAC: `/api/rbac/*`

## Troubleshooting

If the backend cannot connect to MongoDB:

- Confirm MongoDB is running locally on port `27017`, or verify your MongoDB Atlas URI.
- Check that Atlas network access allows your IP address.
- Check `backend\.env` has the correct `MONGO_URI`.

If the frontend cannot reach the backend:

- Confirm the backend is running at `http://127.0.0.1:5002`.
- Confirm `VITE_API_TARGET` for local proxy or `VITE_API_URL` for deployed frontend.
- Check CORS settings in `CORS_ORIGINS` for deployed environments.

If AI packages are slow on first run:

- Sentence Transformer and SpaCy models may load slowly the first time.
- Keep `AI_LOCAL_FILES_ONLY=true` if you want local-only AI model behavior.
- Add `GEMINI_API_KEY` only when external AI features are required.

## Notes For Companies

- Use MongoDB Atlas for production database hosting.
- Use a strong `JWT_SECRET` in production.
- Keep production secrets in Render/Vercel environment settings, not in GitHub.
- Run the build checks before deployment.
- Review role permissions before giving admin or HR access to real users.
