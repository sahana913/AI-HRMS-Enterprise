# Start Commands

Run these commands from PowerShell.

## Option 0: Start Everything Automatically

```powershell
cd D:\AI-HRMS-PRO
.\scripts\start-dev.ps1
```

This opens separate PowerShell windows for MongoDB, backend, and frontend.

## Option 1: Start Everything Manually

Terminal 1 - MongoDB:

```powershell
cd D:\AI-HRMS-PRO
.\scripts\start-mongodb-dev.ps1
```

Keep this terminal open.

Terminal 2 - Backend:

```powershell
cd D:\AI-HRMS-PRO
.\.venv\Scripts\Activate.ps1
.\scripts\start-backend-dev.ps1
```

Keep this terminal open.

Terminal 3 - Frontend:

```powershell
cd D:\AI-HRMS-PRO
.\scripts\start-frontend-dev.ps1
```

Open the frontend in your browser:

```text
http://localhost:5173
```

Backend API runs here:

```text
http://127.0.0.1:5000
```

## Option 2: If You Are Already Inside Backend Folder

```powershell
cd D:\AI-HRMS-PRO\backend
..\scripts\start-backend-dev.ps1
```

## Useful Checks

Check MongoDB port:

```powershell
netstat -ano | findstr :27017
```

Check backend port:

```powershell
netstat -ano | findstr :5000
```

Check frontend port:

```powershell
netstat -ano | findstr :5173
```

## Manual MongoDB Command

Use this only if the script does not work:

```powershell
mongod --dbpath D:\AI-HRMS-PRO\mongodb_runtime_data --port 27017
```
