# IT Purple / СтрахоГид — монорепозиторий

В **`main`** собраны ветки:

| Папка | Назначение |
|--------|------------|
| `backend/` | FastAPI API, PostgreSQL, Redis, Alembic, **Telegram-бот** |
| `ml_service/` | Python-сервис ИИ (чат, квизы), порт **8001** |
| `frontend/` | React + Vite — **веб** (ПК, планшеты, телефоны в браузере) |

Отдельного мобильного приложения (Flutter) в этих ветках не было; если появится каталог `mobile/` или `app/` — запуск см. раздел «Мобильное приложение».

---

## Что нужно установить

- **Docker Desktop** (или Docker + Compose) — для API, БД, Redis, бота  
- **Python 3.12+** — если запускаете сервисы без Docker  
- **Node.js 20+** и **npm** — для `frontend/`  

---

## Быстрый старт (всё через Docker)

### 1. Backend + БД + Redis + Telegram-бот

```bash
cd backend
cp .env.example .env
# Заполните TELEGRAM_BOT_TOKEN, при необходимости OPENAI_API_KEY, WEBAPP_URL (URL вашего фронта)
docker compose up --build
```

- API: **http://localhost:8000** (документация: `/docs`)  
- БД: `localhost:5432`, Redis: `localhost:6379`  

Бот в контейнере `bot` ходит к API по `http://api:8000`. Для локальной отладки без Docker смотрите `.env.example`.

### 2. ML-сервис (отдельно)

```bash
cd ml_service
cp .env.example .env
# Задайте GIGACHAT_AUTH_KEY или переменные из README сервиса
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Проверка: **http://localhost:8001/docs** (если включён в FastAPI).

Backend ожидает ML по адресу из `ML_SERVICE_URL` в `backend/.env` (по умолчанию `http://localhost:8001`).

### 3. Веб-фронтенд (React)

```bash
cd frontend
npm install
```

Создайте файл **`frontend/.env`** (или `.env.local`):

```env
VITE_API_URL=http://localhost:8000
```

Запуск dev-сервера:

```bash
npm run dev
```

Vite по умолчанию откроет **http://localhost:5173** — откройте в браузере на ПК, планшете или телефоне в той же Wi‑Fi сети (для телефона подставьте IP компьютера вместо `localhost`, например `http://192.168.1.10:5173`).

Сборка для продакшена:

```bash
npm run build
npm run preview
```

Статику из `frontend/dist` можно раздавать через Nginx или любой хостинг; **HTTPS** нужен для некоторых сценариев (Telegram WebApp).

---

## Где что запускается

| Клиент | Как пользоваться |
|--------|-------------------|
| **ПК (Windows/macOS/Linux)** | Браузер → `http://localhost:5173` + API на порту 8000 |
| **Планшет / телефон (браузер)** | Тот же dev-сервер по IP в локальной сети или задеплоенный URL |
| **Telegram-бот** | Контейнер `bot` в `backend/docker-compose`; токен в `.env` |
| **Telegram WebApp / Mini App** | В `backend/.env` укажите `WEBAPP_URL` на HTTPS-адрес вашего фронта (после деплоя) |

---

## Telegram-бот

1. Создайте бота у [@BotFather](https://t.me/BotFather), получите токен.  
2. В `backend/.env`: `TELEGRAM_BOT_TOKEN=...`  
3. `docker compose up` из папки `backend` — поднимется контейнер `bot`.  

`WEBAPP_URL` — публичный URL веб-приложения (после деплоя фронта), чтобы кнопки «открыть приложение» работали.

---

## Полезные команды

```bash
# Только миграции БД (если API уже запущен локально)
cd backend && alembic upgrade head

# Проверка здоровья API
curl http://localhost:8000/health
```

---

## Структура репозитория после слияния

```
backend/          # API + docker-compose + bot
ml_service/       # ML / AI микросервис
frontend/         # React веб-клиент
```

Конфликт слияния **`.gitignore`** разрешён вручную: объединены правила для Node, Python и `ml_service/.env`.

---

## Устранение проблем

- **CORS / сеть**: фронт обращается к API по `VITE_API_URL`; при другом хосте/порте обновите переменную и перезапустите `npm run dev`.  
- **Бот не видит API**: в Docker проверьте `BACKEND_URL=http://api:8000` в compose.  
- **Ошибки macOS `._*` файлов**: в корневом `.gitignore` добавлены `._*`; при копировании на не-Mac диски не коммитьте эти файлы.
