$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root "frontend"

$portRows = netstat -ano -p tcp | Select-String ":5173\s+.*LISTENING"
foreach ($row in $portRows) {
  $parts = ($row.ToString() -split "\s+") | Where-Object { $_ }
  $processId = $parts[-1]
  if ($processId -and $processId -ne "0") {
    Write-Host "Stopping existing Vite process on port 5173 (PID $processId)"
    Stop-Process -Id ([int]$processId) -Force -ErrorAction SilentlyContinue
  }
}

Set-Location $frontend
if (-not $env:VITE_API_TARGET) {
  $env:VITE_API_TARGET = "http://127.0.0.1:5002"
}
npm run dev
