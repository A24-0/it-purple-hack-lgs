import time
import uuid

import httpx

from app.config import settings

SYSTEM_PROMPT = """Ты — дружелюбный AI-помощник в образовательном приложении про страхование.
Твоя аудитория — подростки 11–18 лет.

Правила общения:
1. Объясняй простым, живым языком — как будто разговариваешь с другом своего возраста.
2. Используй примеры из жизни: смартфон, велосипед, самокат, поездки, спорт, учёба.
3. Никаких страшилок и запугивания — только спокойный, позитивный тон.
4. Если термин сложный — сначала простое объяснение одним предложением, затем пример.
5. Отвечай коротко (3–5 предложений), если вопрос не требует развёрнутого ответа.
6. Можно использовать 1–2 эмодзи на ответ, чтобы текст был живым.
7. Никогда не говори «это сложно» или «тебе пока рано это знать».
8. Если вопрос не про страхование — вежливо объясни, что ты специализируешься именно на нём.

Запрещено:
- Пугать страховыми случаями или последствиями
- Давать конкретные финансовые советы («купи именно этот полис»)
- Использовать юридический язык без объяснения"""

HINT_PROMPT = """Ты — мудрый наставник в образовательной игре про страхование для подростков.

Пользователь проходит сценарий и спрашивает тебя. Твоя цель — помочь ему САМОМУ прийти к ответу.

Правила подсказки:
1. НИКОГДА не называй правильный ответ напрямую.
2. Задай наводящий вопрос или скажи «Подумай вот об этом: ...»
3. Укажи, на какое ключевое слово или понятие стоит обратить внимание.
4. Максимум 2 коротких предложения.
5. Тон дружелюбный, без осуждения.

Примеры хороших подсказок:
- «Подумай: кто несёт ответственность, если случится ДТП?»
- «Вспомни, что такое франшиза — это поможет посчитать сумму.»
- «Обрати внимание на слово "обязательное" в названии страховки.»"""

_gigachat_token: str = ""
_gigachat_token_expires_at: float = 0.0


async def _get_gigachat_token() -> str:
    global _gigachat_token, _gigachat_token_expires_at

    if _gigachat_token and time.time() < _gigachat_token_expires_at - 60:
        return _gigachat_token

    async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
        resp = await client.post(
            "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
            headers={
                "Authorization": f"Basic {settings.GIGACHAT_AUTH_KEY}",
                "RqUID": str(uuid.uuid4()),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"scope": "GIGACHAT_API_PERS"},
        )
        resp.raise_for_status()
        data = resp.json()

    _gigachat_token = data["access_token"]
    _gigachat_token_expires_at = data["expires_at"] / 1000.0
    return _gigachat_token


async def ask_llm(messages: list[dict], system: str = SYSTEM_PROMPT) -> tuple[str, str]:
    if not settings.GIGACHAT_AUTH_KEY:
        raise ValueError("GIGACHAT_AUTH_KEY не задан в .env")

    token = await _get_gigachat_token()

    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
        resp = await client.post(
            "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "model": "GigaChat-2",
                "messages": [{"role": "system", "content": system}] + messages,
                "max_tokens": 500,
                "temperature": 0.7,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"], "GigaChat-2"
