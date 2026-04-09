param(
  [switch]$SkipMl
)

$ErrorActionPreference = "Continue"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendCompose = Join-Path $root "backend/docker-compose.yml"
$mlCompose = Join-Path $root "ml_service/docker-compose.yml"

Write-Host "Project root: $root"

function Stop-FrontendPort {
  param([int]$Port)
  try {
    $items = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    foreach ($item in $items) {
      if ($item.OwningProcess -and $item.OwningProcess -ne 0) {
        Write-Host "Stopping process on port $Port (PID=$($item.OwningProcess))"
        Stop-Process -Id $item.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {
    # Fallback for environments where Get-NetTCPConnection is unavailable
    try {
      $netstat = & "C:\Windows\System32\netstat.exe" -aon | Select-String ":$Port"
      foreach ($line in $netstat) {
        $parts = ($line -split '\s+') | Where-Object { $_ -ne "" }
        $pid = $parts[-1]
        if ($pid -match '^\d+$') {
          Write-Host "Stopping process on port $Port (PID=$pid)"
          taskkill /PID $pid /F | Out-Null
        }
      }
    } catch {}
  }
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host "Stopping backend containers..."
  docker compose -f "$backendCompose" down

  if (-not $SkipMl) {
    Write-Host "Stopping ML container..."
    docker compose -f "$mlCompose" down
  } else {
    Write-Host "SKIP: ML service stop"
  }
} else {
  Write-Warning "Docker CLI not found. Skipping docker compose down."
}

Write-Host "Stopping frontend dev servers on ports 5173 and 5174..."
Stop-FrontendPort -Port 5173
Stop-FrontendPort -Port 5174

Write-Host "Done."
