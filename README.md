# AI-HRMS Platform

A modern AI-powered HR Management System built with React, Tailwind, FastAPI, MongoDB, and Hugging Face AI.

## Architecture

- Frontend: React + Vite + Tailwind CSS + Framer Motion + React Router + Recharts
- Backend: FastAPI + JWT auth + MongoDB (Motor) + AI Resume Screening
- AI Layer: Gemini-compatible content optimization, lazy Sentence Transformer (`all-MiniLM-L6-v2`) scoring when cached, SpaCy NLP, and lexical fallback matching
- Database: MongoDB collections for users, employees, candidates, attendance, leave, interviews, notifications, and analytics.

## Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
python -m spacy download en_core_web_sm
python main.py
```

The backend runs on `http://localhost:5000`.

### Environment

Update `backend/.env` with your MongoDB URI and JWT secret:

```env
MONGO_URI=mongodb://localhost:27017/hrms_pro
JWT_SECRET=your_jwt_secret_key_123
ACCESS_TOKEN_EXPIRE_MINUTES=60
GEMINI_API_KEY=your_api_key_here
```

## Available APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/ai/upload-resume`
- `GET /api/ai/shortlisted`
- `GET /api/candidates`
- `GET /api/analytics/summary`
- `GET /api/resumes`
- `POST /api/resumes`
- `GET /api/resumes/{resume_id}`
- `PUT /api/resumes/{resume_id}`
- `DELETE /api/resumes/{resume_id}`
- `POST /api/resumes/{resume_id}/duplicate`
- `POST /api/resumes/parse`
- `POST /api/resumes/ai/optimize`
- `GET /api/public/resumes/{share_id}`
- `GET /api/employees`
- `POST /api/employees/add`
- `PUT /api/employees/update/{id}`
- `DELETE /api/employees/delete/{id}`
- `POST /api/attendance/checkin`
- `POST /api/attendance/checkout`
- `GET /api/attendance/history/{employee_id}`
- `POST /api/leave/apply`
- `PUT /api/leave/approve/{leave_id}`
- `GET /api/leave/history`
- `POST /api/interviews/schedule`
- `GET /api/interviews/list`

## Notes

- The frontend uses JWT persisted in `localStorage`.
- Protected routes require authentication and role-based access for admin/HR flows.
- The resume builder supports CRUD, duplication, upload parsing, profile images, auto-save, live preview, public links, and AI-assisted rewriting.
- The AI screening module extracts resume text, computes embeddings when the local model is available, and falls back to lexical matching when the model cache or network is unavailable.
- MongoDB collections are created automatically when the backend writes data.

## Project Structure

- `frontend/`: Vite React application with pages, components, context, and services.
- `backend/`: FastAPI backend with routers, controllers, services, middleware, AI module, and MongoDB connection.

## Recommended Next Steps

- Seed the database with admin/HR users.
- Add production-ready deployment settings for MongoDB Atlas and secure secrets.
- Add email notifications and real-time socket updates for interview events.
