import json
import logging
from datetime import date

from app.services.llm_client import ask_llm

logger = logging.getLogger(__name__)

# Topics rotate daily based on ordinal day index
TOPICS = [
    "ОСАГО",
    "КАСКО",
    "страховая премия и франшиза",
    "ОМС и ДМС",
    "страховой случай и страховая выплата",
    "страховая сумма и убыток",
    "страхователь, страховщик и выгодоприобретатель",
]

QUIZ_PROMPT = """Ты генерируешь обучающий квиз по страхованию для подростков 11–18 лет.

Сгенерируй один вопрос по теме: {topic}

Требования:
- Вопрос понятный, без сложного юридического языка
- Ровно 4 варианта ответа, один правильный
- Краткое объяснение правильного ответа (1–2 предложения)

Ответь СТРОГО в формате JSON, без лишнего текста:
{{
  "question": "текст вопроса",
  "choices": [
    {{"text": "вариант 1", "is_correct": false}},
    {{"text": "вариант 2", "is_correct": true}},
    {{"text": "вариант 3", "is_correct": false}},
    {{"text": "вариант 4", "is_correct": false}}
  ],
  "explanation": "объяснение правильного ответа",
  "category": "{topic}"
}}"""

_daily_cache: dict[date, dict] = {}


def _get_today_topic() -> str:
    day_index = date.today().toordinal() % len(TOPICS)
    return TOPICS[day_index]


def _parse_quiz(raw: str) -> dict:
    """Strips markdown code fences GigaChat sometimes wraps around JSON."""
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    return json.loads(raw)


async def get_daily_quiz() -> dict:
    """Returns today's quiz, generating via GigaChat on first request of the day."""
    today = date.today()
    if today in _daily_cache:
        return _daily_cache[today]

    topic = _get_today_topic()
    prompt = QUIZ_PROMPT.format(topic=topic)

    reply, _ = await ask_llm(
        [{"role": "user", "content": prompt}],
        system="Ты генератор учебных квизов. Отвечай только валидным JSON без пояснений.",
    )

    try:
        quiz = _parse_quiz(reply)
    except (json.JSONDecodeError, KeyError) as exc:
        logger.error("Quiz parse failed: %s\nRaw: %s", exc, reply)
        quiz = _fallback_quiz(topic)

    quiz["date"] = today.isoformat()
    _daily_cache[today] = quiz

    # Evict stale cache entries
    for old_date in list(_daily_cache.keys()):
        if old_date != today:
            del _daily_cache[old_date]

    return quiz


async def generate_quiz(topic: str) -> dict:
    """Generates a quiz on any given topic, used for testing and admin."""
    prompt = QUIZ_PROMPT.format(topic=topic)
    reply, _ = await ask_llm(
        [{"role": "user", "content": prompt}],
        system="Ты генератор учебных квизов. Отвечай только валидным JSON без пояснений.",
    )
    try:
        return _parse_quiz(reply)
    except (json.JSONDecodeError, KeyError) as exc:
        logger.error("Quiz parse failed: %s\nRaw: %s", exc, reply)
        return _fallback_quiz(topic)


def _fallback_quiz(topic: str) -> dict:
    """Fallback quiz when GigaChat returns invalid JSON."""
    return {
        "question": f"Что из перечисленного относится к теме «{topic}»?",
        "choices": [
            {"text": "Страховая премия — это штраф", "is_correct": False},
            {"text": "Страховая премия — это плата за страховку", "is_correct": True},
            {"text": "Страховая премия — это выплата при ущербе", "is_correct": False},
            {"text": "Страховая премия — это скидка на полис", "is_correct": False},
        ],
        "explanation": "Страховая премия — деньги, которые ты платишь страховой компании за защиту.",
        "category": topic,
    }
