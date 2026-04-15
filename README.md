# ИнгосстрахKids

Образовательное веб-приложение про страхование для детей и подростков.  
Проект разработан в рамках хакатона **IT Purple Hack** командой **Kinder Pinqui**.

---

## О проекте

**ИнгосстрахKids** помогает детям и подросткам разобраться в основах страхования в игровом формате:

| Модуль | Описание |
|--------|----------|
| Сценарии | Интерактивные истории с выборами и последствиями |
| Мини-игры | Обучающие игры на понимание страховых ситуаций |
| Словарь | Термины страхования простым языком |
| AI-чат | Подсказки и объяснения от ИИ-ассистента (GigaChat) |
| Лаборатория рисков | ML-классификация бытовых рисков через камеру/фото (TensorFlow.js + COCO-SSD) |
| Профиль | Аватар, альбом достижений, прогресс по темам |
| Таблица лидеров | Рейтинг игроков по очкам |

**Стек:**

- **Frontend:** React 18, Vite, TypeScript, TensorFlow.js, React Router
- **Backend:** FastAPI, PostgreSQL, Redis, Alembic, JWT-аутентификация
- **ML-сервис:** GigaChat API, отдельный контейнер (порт 8001)
- **Инфраструктура:** Docker Compose, Nginx-proxy внутри контейнеров

---

## Ключи (уже вшиты в `.env`)

> Репозиторий закрытый — ключи безопасны. Все `.env` файлы уже заполнены, копировать ничего не нужно.

| Сервис | Ключ | Файл |
|--------|------|------|
| GigaChat | `MDE5ZDY0NjktNmEzYy03ZTc5LTgyZmMtNWNlYTIxZGRiNDhlOmZiY2ZjNTdiLTRjYzMtNGVlMi05Y2JkLTZkODc1NjgzZDAwNg==` | `ml_service/.env` |
| Telegram Bot | `8714093990:AAEghBryl8eVBy6inqWTPfb_z-Jv3h7vK6k` | `backend/.env` |

---

## Быстрый старт

### Что нужно

- **Git**
- **Docker Desktop** (или Docker Engine + Compose v2)
- **Node.js 18+** и **npm**

```bash
git --version
docker compose version
node -v && npm -v
```

### 1. Клонировать репозиторий

```bash
git clone https://git.itpurple.ru/it-purple-hack/Kinder-Pinqui/igs
cd igs/it-purple-hack-lgs
```

### 2. Переменные окружения

Все `.env` файлы уже заполнены и лежат в репозитории — ничего копировать не нужно:

- `backend/.env` — JWT, БД, Redis, токен бота
- `ml_service/.env` — ключ GigaChat
- `frontend/.env` — URL API

По умолчанию API поднимается на порту **8000**. Если порт занят — измените `HOST_API_PORT` в `backend/.env` и `VITE_DEV_API_PORT` / `VITE_API_URL` в `frontend/.env` на тот же порт.

### 3. Запуск одной командой

**macOS / Linux / Windows с WSL:**

```bash
npm run start
```

**Windows (без WSL) — двойной клик или из cmd:**

```
scripts\start-all.bat
```

Скрипт автоматически:

- установит зависимости фронта (`npm install` в `frontend/`);
- поднимет **PostgreSQL, Redis, API** через Docker;
- поднимет **ML-сервис** на порту **8001**;
- запустит **Vite** на **http://localhost:5173**.

**Дополнительные варианты (macOS/Linux/WSL):**

```bash
# Без ML (быстрее, если лаборатория рисков не нужна)
SKIP_ML=1 npm run start

# Повторный запуск: пропуск пересборки + без ML
npm run start:ultrafast

# Пересобрать образы Docker после изменений в Dockerfile
npm run start:build
```

### 4. Проверка

| URL | Что |
|-----|-----|
| http://localhost:5173 | Фронтенд |
| http://localhost:8000/docs | Swagger API |
| http://localhost:8000/health | Health-check |
| http://localhost:8001/docs | ML-сервис |

### 5. Регистрация

На главной странице — вкладки **Вход** / **Регистрация**. После регистрации доступны профиль, игры, лаборатория.

---

## Ручной запуск (пошагово)

### Шаг A — Backend (API + БД + Redis)

```bash
cd backend
docker compose up -d db redis api
```

Дождитесь статуса `healthy` у `db`, `redis`, `api`.

При ошибке `port is already allocated` на порту 8000 или 5432 — освободите порт или задайте другой `HOST_API_PORT` в `backend/.env`.

### Шаг B — ML-сервис (опционально)

```bash
docker compose -f ml_service/docker-compose.yml up -d
```

### Шаг C — Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

### Шаг D — Миграции БД

В Docker-образе API миграции Alembic выполняются автоматически при старте контейнера. При запуске без Docker:

```bash
cd backend
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Важно: первый запуск может быть долгим

| Что происходит | Почему |
|----------------|--------|
| Docker собирает образы | Первая сборка: **5–20+ минут** |
| `npm install` в `frontend` | Установка зависимостей: **1–3 минуты** |
| Первый заход в «Лабораторию рисков» | Загружается TensorFlow.js + модели — страница может висеть **30–60 секунд**, затем оживает |
| Экран «Проверяем вход…» после старта | Ждёт готовности API и БД — до **~20 секунд** |

Не закрывайте вкладку, если белый экран или спиннер — дождитесь ответа API (`/health`).

---

## Структура репозитория

| Путь | Назначение |
|------|------------|
| `frontend/` | React + Vite, игры, профиль, лаборатория, чат |
| `backend/` | FastAPI, пользователи, сценарии, прогресс, загрузка файлов |
| `ml_service/` | ML-сервис — GigaChat, объектная детекция (порт 8001) |
| `scripts/start-all.sh` | Скрипт запуска Docker + Vite |
| `docker-compose.yml` | Корневой Compose (backend + ML) |

---

## Типичные проблемы

| Симптом | Решение |
|---------|---------|
| Долго крутится при первом `docker compose up` | Дождаться окончания build: `docker compose logs -f api` |
| «Проверяем вход…» не исчезает | Убедиться, что API отвечает на `/health`; порт в `frontend/.env` = порту API |
| Не входит / 401 | Проверить email/пароль; после пересоздания БД нужна новая регистрация |
| Лаборатория долго грузится | Нормально при первом открытии — TF.js и модели; подождать |
| Порт занят | `lsof -iTCP:8000 -sTCP:LISTEN`; остановить конкурирующий контейнер или сменить порт |
| AI-чат не отвечает | Проверить `GIGACHAT_AUTH_KEY` в `ml_service/.env` и что ML-сервис поднят |

---

## Полезные ссылки

- Демо-видео: [Google Drive](https://drive.google.com/drive/folders/1Z0EJC2qdfkrz_pH3ktP-DIjArswe_xNE?hl=ru)

---

## Хакатон

Проект подготовлен командой **Kinder Pinqui** в рамках **IT Purple Hack**.
