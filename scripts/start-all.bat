@echo off
setlocal
cd /d "%~dp0.."

where docker >nul 2>&1
if errorlevel 1 (
  echo Install Docker Desktop first.
  exit /b 1
)

if not defined DOCKER_BUILD set DOCKER_BUILD=0
if not defined SKIP_ML set SKIP_ML=0

if "%DOCKER_BUILD%"=="1" (
  echo Starting backend ^(build^)...
  docker compose -f "%cd%\backend\docker-compose.yml" up -d --build
) else (
  echo Starting backend...
  docker compose -f "%cd%\backend\docker-compose.yml" up -d
)

if "%SKIP_ML%"=="1" (
  echo SKIP_ML=1 — ML service skipped.
) else (
  echo Starting ML service...
  if not exist "%cd%\ml_service\.env" copy /y "%cd%\ml_service\.env.example" "%cd%\ml_service\.env" 2>nul
  if "%DOCKER_BUILD%"=="1" (
    docker compose -f "%cd%\ml_service\docker-compose.yml" up -d --build
  ) else (
    docker compose -f "%cd%\ml_service\docker-compose.yml" up -d
  )
)

echo API http://localhost:8000
cd frontend
if not exist .env (
  if exist .env.example copy /y .env.example .env
)
if "%FORCE_NPM_INSTALL%"=="1" (
  call npm install
) else if not exist node_modules (
  echo npm install...
  call npm install
) else (
  echo node_modules exists — skipping npm install. Set FORCE_NPM_INSTALL=1 to reinstall.
)

call npm run dev -- --host 0.0.0.0 --port 5173
