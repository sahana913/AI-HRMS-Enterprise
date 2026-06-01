$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dbPath = Join-Path $root "mongodb_runtime_data"

if (-not (Test-Path $dbPath)) {
  New-Item -ItemType Directory -Path $dbPath | Out-Null
}

mongod --dbpath $dbPath --port 27017
