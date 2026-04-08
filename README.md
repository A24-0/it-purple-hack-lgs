# IT Purple / СтрахоГид

## Запуск всего проекта

Из корня репозитория:

```bash
npm run start
```

Команда поднимает:
- backend (API + PostgreSQL + Redis + bot) через Docker
- `ml_service` через Docker
- frontend (Vite) на `http://localhost:5173`

Самый быстрый режим повторного запуска (без ML):

```bash
npm run start:ultrafast
```

Запуск без Telegram-бота (если бот тормозит из-за сети/таймаутов):

```bash
npm run start:nobot
```

## Ссылки после запуска

- Frontend: `http://localhost:5173`
- Backend docs: `http://localhost:8000/docs`
- ML docs: `http://localhost:8001/docs`

## Если нужно только фронт

```bash
cd frontend
npm run dev
```

## Если миграции не применены

```bash
cd backend
alembic upgrade head
```

## Нативные приложения

### Desktop (Tauri)

Запуск desktop-версии:

```bash
npm run desktop
```

Сборка установщика:

```bash
npm run desktop:build
```

Требуется:
- Rust (`rustup`)
- на macOS: Xcode Command Line Tools

### Mobile (Capacitor: Android/iOS)

1) Синхронизировать web-сборку с нативными проектами:

```bash
npm run mobile:sync
```

2) Открыть нативный проект:

```bash
npm run mobile:open:android
npm run mobile:open:ios
```

Требуется:
- Android Studio (Android)
- Xcode (iOS, только macOS)

### Важно для API в нативных приложениях

Для телефона/эмулятора не используйте `localhost` в API URL.  
Укажите IP вашего компьютера в `frontend/.env`:

```env
VITE_API_URL=http://<YOUR_LOCAL_IP>:8000
```

После изменения `.env` снова выполните:

```bash
npm run mobile:sync
```

## Telegram Mini App

1) Запустите проект:

```bash
npm run start
```

2) Подготовьте публичный HTTPS URL для фронта (`localhost` Telegram не откроет):
- деплой фронта **или**
- туннель (`ngrok` / `cloudflared`)

3) Укажите URL в `backend/.env`:

```env
WEBAPP_URL=https://<YOUR_HTTPS_URL>
```

4) Перезапустите backend и bot:

```bash
npm run start
```

5) В `@BotFather`:
- открыть настройки бота
- `Menu Button` → `Web App`
- вставить тот же `WEBAPP_URL`

6) Проверка:
- открыть бота в Telegram
- нажать кнопку открытия Mini App
- убедиться, что открывается фронт и работают запросы к API
