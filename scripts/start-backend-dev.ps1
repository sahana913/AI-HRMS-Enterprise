$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$python = Join-Path $root ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
  $python = "python"
}

$portRows = netstat -ano -p tcp | Select-String ":5000\s+.*LISTENING"
foreach ($row in $portRows) {
  $parts = ($row.ToString() -split "\s+") | Where-Object { $_ }
  $pid = $parts[-1]
  if ($pid -and $pid -ne "0") {
    Write-Host "Stopping existing backend process on port 5000 (PID $pid)"
    Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue
  }
}

$env:APP_MODE = "development"
$env:DEV_MOCK_ANALYTICS = "false"
$env:AI_LOCAL_FILES_ONLY = "true"
$env:PYTHONDONTWRITEBYTECODE = "1"
Set-Location $backend
$uvicornArgs = @(
  "-B",
  "-m",
  "uvicorn",
  "main:app",
  "--host",
  "127.0.0.1",
  "--port",
  "5000",
  "--reload",
  "--reload-dir",
  ".",
  "--reload-exclude=__pycache__/*",
  "--reload-exclude=uploads/*",
  "--reload-exclude=*.log",
  "--reload-exclude=*.pyc",
  "--reload-exclude=../frontend/*",
  "--reload-exclude=../mongodb_data/*"
)
& $python @uvicornArgs
