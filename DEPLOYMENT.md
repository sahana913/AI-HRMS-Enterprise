# Complete Deployment Guide

This project has three production parts:

- MongoDB database
- FastAPI backend
- Vite React frontend

Recommended beginner-friendly setup:

- Database: MongoDB Atlas
- Backend: Render Web Service
- Frontend: Vercel Static Site

You can use other hosts, but the commands and environment variables stay mostly the same.

## 0. Before You Start

Make sure the project is pushed to GitHub, GitLab, or Bitbucket. Most deployment platforms deploy directly from a Git repository.

From your local project:

```powershell
cd D:\AI-HRMS-PRO
git status
```

If your latest changes are ready:

```powershell
git add .
git commit -m "Prepare project for deployment"
git push
```

If Git says there is no remote repository, create one on GitHub first, then connect it:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 1. Create MongoDB Atlas Database

1. Go to MongoDB Atlas.
2. Create a free or paid cluster.
3. Create a database user.
4. Save the username and password.
5. Go to Network Access.
6. Add an allowed IP address.

For managed hosts like Render/Railway/Vercel, the IP can change. The easiest setup is:

```text
0.0.0.0/0
```

This allows access from anywhere, so use a strong MongoDB username and password.

7. Go to Database > Connect > Drivers.
8. Copy the connection string.

It will look like this:

```text
mongodb+srv://USER:PASSWORD@cluster-name.mongodb.net/?retryWrites=true&w=majority
```

Change it so it includes the database name:

```text
mongodb+srv://USER:PASSWORD@cluster-name.mongodb.net/hrms_pro?retryWrites=true&w=majority
```

You will use this as `MONGO_URI`.

## 2. Prepare Backend Environment Variables

The backend needs these required variables:

```env
APP_MODE=production
JWT_SECRET=replace-with-a-long-random-secret
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster-name.mongodb.net/hrms_pro?retryWrites=true&w=majority
CORS_ORIGINS=https://your-frontend-domain.com
```

Generate a strong JWT secret locally:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Copy the generated value into `JWT_SECRET`.

Optional variables:

```env
ACCESS_TOKEN_EXPIRE_MINUTES=60
GEMINI_API_KEY=your-gemini-key
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=HRMS Verification <your-verified-sender@example.com>
SMTP_EMAIL=your-smtp-email
SMTP_PASSWORD=your-smtp-password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

Use email variables only if you want real OTP emails in production.

## 3. Deploy Backend On Render

1. Open Render.
2. Choose New > Web Service.
3. Connect your Git repository.
4. Select the repository for this project.
5. Use these settings:

```text
Name: ai-hrms-backend
Root Directory: leave empty
Runtime: Python
Build Command: pip install -r backend/requirements.txt && python -m spacy download en_core_web_sm
Start Command: cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1
```

6. Add backend environment variables:

```env
APP_MODE=production
JWT_SECRET=your-generated-secret
MONGO_URI=your-mongodb-atlas-uri
CORS_ORIGINS=https://your-frontend-domain.com
```

At this point you may not know the frontend URL yet. You can temporarily set:

```env
CORS_ORIGINS=http://localhost:5173
```

After the frontend is deployed, come back and replace it with the real frontend URL.

7. Click Deploy.
8. Wait for the build to finish.

When Render finishes, your backend URL will look like:

```text
https://ai-hrms-backend.onrender.com
```

Test the backend:

```text
https://ai-hrms-backend.onrender.com/docs
```

If the `/docs` page opens, the backend is running.

## 4. Deploy Frontend On Vercel

1. Open Vercel.
2. Choose Add New > Project.
3. Import your Git repository.
4. Use these settings:

```text
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```

5. Add frontend environment variable:

```env
VITE_API_URL=https://your-backend-domain.com
```

Example:

```env
VITE_API_URL=https://ai-hrms-backend.onrender.com
```

Do not add a trailing slash.

6. Click Deploy.

When Vercel finishes, your frontend URL will look like:

```text
https://ai-hrms-pro.vercel.app
```

## 5. Update Backend CORS With Frontend URL

Now go back to your backend host and update:

```env
CORS_ORIGINS=https://your-frontend-domain.com
```

Example:

```env
CORS_ORIGINS=https://ai-hrms-pro.vercel.app
```

Redeploy or restart the backend after changing this variable.

If you have multiple frontend URLs, separate them with commas:

```env
CORS_ORIGINS=https://ai-hrms-pro.vercel.app,https://www.yourdomain.com
```

## 6. Configure Frontend Routing

This app uses React Router, so the host must serve `index.html` for direct page visits.

Vercel usually handles Vite apps correctly. If direct URLs like `/login` or `/dashboard` show 404, add this file:

```text
frontend/vercel.json
```

With this content:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Then commit and redeploy.

## 7. Verify Full App

Open the frontend URL:

```text
https://your-frontend-domain.com
```

Check these flows:

1. Register a new account.
2. Login.
3. Open dashboard.
4. Add an employee or candidate.
5. Upload a resume if needed.
6. Refresh the page while logged in.
7. Open the browser DevTools Network tab and confirm API calls go to the backend URL.

Also open:

```text
https://your-backend-domain.com/docs
```

Try one simple endpoint from the docs if needed.

## 8. Common Errors And Fixes

### Backend fails with JWT error

Cause:

```text
JWT_SECRET is missing
```

Fix:

Set `JWT_SECRET` on the backend host and redeploy.

### Frontend cannot call backend

Cause:

```text
CORS_ORIGINS does not include the frontend URL
```

Fix:

Set backend variable:

```env
CORS_ORIGINS=https://your-frontend-domain.com
```

Then restart/redeploy backend.

### Frontend API calls go to the frontend domain instead of backend

Cause:

```text
VITE_API_URL is missing
```

Fix:

Set frontend variable:

```env
VITE_API_URL=https://your-backend-domain.com
```

Then redeploy frontend. Vite environment variables are baked into the build.

### Backend cannot connect to MongoDB

Common causes:

- Wrong MongoDB username/password
- Missing database name in `MONGO_URI`
- Atlas Network Access does not allow the backend host

Fix:

Use a URI like:

```text
mongodb+srv://USER:PASSWORD@cluster-name.mongodb.net/hrms_pro?retryWrites=true&w=majority
```

Then check Atlas Network Access.

### Direct page refresh gives 404

Cause:

The frontend host is not redirecting React Router paths to `index.html`.

Fix:

Add `frontend/vercel.json` from Step 6 and redeploy.

### OTP email does not send

Cause:

No production email provider is configured.

Fix:

Use Resend:

```env
RESEND_API_KEY=your-key
RESEND_FROM_EMAIL=HRMS Verification <your-verified-sender@example.com>
```

Or use SMTP:

```env
SMTP_EMAIL=your-email
SMTP_PASSWORD=your-app-password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

## 9. Local Production Build Check

Before deploying, you can verify frontend build locally:

```powershell
cd D:\AI-HRMS-PRO\frontend
npm run build
```

You can verify backend imports locally:

```powershell
cd D:\AI-HRMS-PRO
$env:APP_MODE="production"
$env:JWT_SECRET="temporary-local-check-secret"
.\.venv\Scripts\python.exe -c "import sys; sys.path.insert(0, 'backend'); import main; print('backend import ok')"
```

## 10. Final Production Checklist

Before sharing the app publicly, confirm:

- MongoDB Atlas connection works.
- Backend `/docs` opens.
- Frontend opens.
- `VITE_API_URL` points to backend.
- `CORS_ORIGINS` points to frontend.
- `JWT_SECRET` is strong and private.
- No real secrets are committed to Git.
- Login/register works.
- Resume upload works.
- Email OTP works, or you are okay with the fallback behavior.

