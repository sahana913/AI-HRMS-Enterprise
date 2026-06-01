$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$python = Join-Path $root ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
  $python = "python"
}

$env:APP_MODE = "production"
$env:DEV_MOCK_ANALYTICS = "false"
$env:AI_LOCAL_FILES_ONLY = "true"
Set-Location $backend
& $python -m uvicorn main:app --host 0.0.0.0 --port 5000 --workers 1
