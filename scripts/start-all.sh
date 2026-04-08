#!/usr/bin/env bash
# Запуск backend (Docker) + ML (Docker) + Vite (локально)
# Использование: из корня репозитория: bash scripts/start-all.sh
#
# По умолчанию БЕЗ пересборки образов Docker (быстро). Образы пересобираются,
# если их ещё нет, или если задать DOCKER_BUILD=1.
#
#   DOCKER_BUILD=1     — docker compose up --build (после смены Dockerfile)
#   SKIP_ML=1          — не поднимать ML на :8001 (быстрее, если ИИ не нужен)
#   SKIP_BOT=1         — не поднимать Telegram-бот (избежать таймаутов к Telegram API)
#   FORCE_NPM_INSTALL=1 — всегда npm install (после смены зависимостей)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker &>/dev/null; then
  echo "Нужен Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

# macOS + внешний диск: AppleDouble (._имя) — Docker BuildKit падает на xattr
if [[ "$(uname -s)" == "Darwin" ]]; then
  echo "==> Удаляю служебные ._ файлы macOS в backend/ml_service…"
  find "$ROOT/backend" "$ROOT/ml_service" -name '._*' -delete 2>/dev/null || true
fi

DOCKER_BUILD="${DOCKER_BUILD:-0}"
SKIP_ML="${SKIP_ML:-0}"
SKIP_BOT="${SKIP_BOT:-0}"
FORCE_NPM_INSTALL="${FORCE_NPM_INSTALL:-0}"
QUICK_REUSE="${QUICK_REUSE:-1}"

COMPOSE_UP=(up -d)
if [[ "$DOCKER_BUILD" == "1" ]]; then
  COMPOSE_UP+=(--build)
fi

cd "$ROOT/frontend"
if [ ! -f .env ]; then
  cp -n .env.example .env 2>/dev/null || echo "VITE_API_URL=http://localhost:8000" > .env
fi

frontend_running=0
if command -v lsof >/dev/null 2>&1 && lsof -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
  frontend_running=1
  echo "==> Порт 5173 уже занят: фронтенд уже запущен, пропускаю npm install/dev."
fi

need_npm=0
LOCK_HASH_FILE=".deps-lock.sha256"
CURRENT_LOCK_HASH=""
if [[ -f package-lock.json ]]; then
  CURRENT_LOCK_HASH="$(shasum -a 256 package-lock.json | awk '{print $1}')"
fi
if [[ "$FORCE_NPM_INSTALL" == "1" ]]; then
  need_npm=1
elif [[ ! -d node_modules ]]; then
  need_npm=1
elif [[ -n "$CURRENT_LOCK_HASH" ]] && [[ ! -f "$LOCK_HASH_FILE" ]]; then
  need_npm=1
elif [[ -n "$CURRENT_LOCK_HASH" ]] && [[ "$(cat "$LOCK_HASH_FILE" 2>/dev/null || true)" != "$CURRENT_LOCK_HASH" ]]; then
  need_npm=1
fi

if [[ "$frontend_running" != "1" && "$need_npm" == "1" ]]; then
  echo "==> npm install (один раз или после смены зависимостей)…"
  npm install
  if [[ -n "$CURRENT_LOCK_HASH" ]]; then
    echo "$CURRENT_LOCK_HASH" > "$LOCK_HASH_FILE"
  fi
elif [[ "$frontend_running" != "1" ]]; then
  echo "==> node_modules актуален — пропускаю npm install (FORCE_NPM_INSTALL=1 чтобы принудительно)."
fi

backend_all_running=0
if [[ "$QUICK_REUSE" == "1" ]]; then
  backend_running_services="$(docker compose -f "$ROOT/backend/docker-compose.yml" ps --services --status running 2>/dev/null || true)"
  if [[ "$backend_running_services" == *$'db'* ]] && [[ "$backend_running_services" == *$'redis'* ]] && [[ "$backend_running_services" == *$'api'* ]] && [[ "$SKIP_BOT" == "1" || "$backend_running_services" == *$'bot'* ]]; then
    backend_all_running=1
    if [[ "$SKIP_BOT" == "1" ]]; then
      echo "==> Backend уже запущен (db/redis/api, bot пропущен) — пропускаю docker compose up."
    else
      echo "==> Backend уже запущен (db/redis/api/bot) — пропускаю docker compose up."
    fi
  fi
fi

if [[ "$backend_all_running" != "1" ]]; then
  if [[ "$SKIP_BOT" == "1" ]]; then
    echo "==> Поднимаю backend без bot (Postgres, Redis, API)…"
    docker compose -f "$ROOT/backend/docker-compose.yml" "${COMPOSE_UP[@]}" db redis api
  else
    echo "==> Поднимаю backend (Postgres, Redis, API, bot)…"
    docker compose -f "$ROOT/backend/docker-compose.yml" "${COMPOSE_UP[@]}"
  fi
fi

if [[ "$SKIP_ML" != "1" ]]; then
  ml_running=0
  if [[ "$QUICK_REUSE" == "1" ]]; then
    ml_running_services="$(docker compose -f "$ROOT/ml_service/docker-compose.yml" ps --services --status running 2>/dev/null || true)"
    if [[ "$ml_running_services" == *$'ml_service'* ]]; then
      ml_running=1
      echo "==> ML-сервис уже запущен — пропускаю docker compose up."
    fi
  fi
  if [ ! -f "$ROOT/ml_service/.env" ]; then
    cp -n "$ROOT/ml_service/.env.example" "$ROOT/ml_service/.env" 2>/dev/null || touch "$ROOT/ml_service/.env"
  fi
  if [[ "$ml_running" != "1" ]]; then
    echo "==> Поднимаю ML-сервис на :8001…"
    docker compose -f "$ROOT/ml_service/docker-compose.yml" "${COMPOSE_UP[@]}"
  fi
else
  echo "==> SKIP_ML=1 — ML-сервис не запускаю."
fi

if [[ "$SKIP_ML" == "1" ]]; then
  echo "==> Backend: http://localhost:8000/docs  (ML не запущен — SKIP_ML=1)"
else
  echo "==> Backend: http://localhost:8000/docs  ML: http://localhost:8001/docs"
fi
if [[ "$SKIP_BOT" == "1" ]]; then
  echo "==> Bot отключен (SKIP_BOT=1)."
fi
echo "==> Запускаю веб (Vite). С телефона: http://<IP>:5173"
echo ""

if [[ "$frontend_running" == "1" ]]; then
  echo "==> Открой: http://localhost:5173  API: http://localhost:8000/docs  ML: http://localhost:8001/docs"
  exit 0
fi

exec npm run dev -- --host 0.0.0.0 --port 5173
