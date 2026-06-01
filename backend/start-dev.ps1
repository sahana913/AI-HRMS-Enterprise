$ErrorActionPreference = "Stop"
$backend = $PSScriptRoot
$root = Split-Path -Parent $backend
$python = Join-Path $root ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
  $python = "python"
}

$portRows = netstat -ano -p tcp | Select-String ":5000\s+.*LISTENING"
foreach ($row in $portRows) {
  $parts = ($row.ToString() -split "\s+") | Where-Object { $_ }
  $processId = $parts[-1]
  if ($processId -and $processId -ne "0") {
    Write-Host "Stopping existing process on backend port 5000 (PID $processId)"
    Stop-Process -Id ([int]$processId) -Force -ErrorAction SilentlyContinue
  }
}

$env:APP_MODE = "development"
$env:DEV_MOCK_ANALYTICS = "false"
$env:AI_LOCAL_FILES_ONLY = "true"
$env:PYTHONDONTWRITEBYTECODE = "1"

Set-Location $backend
& $python -B -m uvicorn main:app --host 127.0.0.1 --port 5000 --reload --reload-dir "." --reload-exclude="__pycache__/*" --reload-exclude="uploads/*" --reload-exclude="*.log" --reload-exclude="*.pyc"
