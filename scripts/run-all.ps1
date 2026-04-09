param(
  [switch]$SkipMl,
  [switch]$NoInstall
)

$ErrorActionPreference = "Stop"

function Ensure-FileFromExample {
  param(
    [string]$TargetPath,
    [string]$ExamplePath
  )

  if (-not (Test-Path $TargetPath)) {
    if (Test-Path $ExamplePath) {
      Copy-Item $ExamplePath $TargetPath
      Write-Host "Created: $TargetPath"
    } else {
      New-Item -ItemType File -Path $TargetPath | Out-Null
      Write-Host "Created empty file: $TargetPath"
    }
  }
}

function Test-PortBusy {
  param([int]$Port)
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $listener.Start()
    $listener.Stop()
    return $false
  } catch {
    return $true
  }
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendCompose = Join-Path $root "backend/docker-compose.yml"
$mlCompose = Join-Path $root "ml_service/docker-compose.yml"
$frontendDir = Join-Path $root "frontend"

Write-Host "Project root: $root"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI not found. Start Docker Desktop and reopen PowerShell."
}

# Prepare env files
Ensure-FileFromExample -TargetPath (Join-Path $root "backend/.env") -ExamplePath (Join-Path $root "backend/.env.example")
Ensure-FileFromExample -TargetPath (Join-Path $root "ml_service/.env") -ExamplePath (Join-Path $root "ml_service/.env.example")
Ensure-FileFromExample -TargetPath (Join-Path $frontendDir ".env") -ExamplePath (Join-Path $frontendDir ".env.example")

Write-Host "Starting backend containers..."
docker compose -f "$backendCompose" up -d db redis api

if (-not $SkipMl) {
  Write-Host "Starting ML container..."
  docker compose -f "$mlCompose" up -d --build
} else {
  Write-Host "SKIP: ML service"
}

Write-Host ""
Write-Host "Backend status:"
docker compose -f "$backendCompose" ps
if (-not $SkipMl) {
  Write-Host ""
  Write-Host "ML status:"
  docker compose -f "$mlCompose" ps
}

Set-Location $frontendDir
if (-not $NoInstall) {
  if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "Installing frontend dependencies..."
    npm install
  } else {
    Write-Host "node_modules exists, skipping npm install. Use without -NoInstall to force install logic."
  }
}

$port = 5173
if (Test-PortBusy -Port 5173) {
  $port = 5174
}
if (Test-PortBusy -Port $port) {
  throw "Both ports 5173 and 5174 are busy. Free one of them and retry."
}

Write-Host ""
Write-Host "Starting frontend on port $port ..."
Write-Host "Frontend: http://localhost:$port"
Write-Host "Backend:  http://localhost:8000/docs"
if (-not $SkipMl) {
  Write-Host "ML:       http://localhost:8001/docs"
}
Write-Host ""

npm run dev -- --host 0.0.0.0 --port $port --strictPort
