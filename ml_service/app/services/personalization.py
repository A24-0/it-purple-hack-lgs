from collections import Counter, defaultdict

STEP_TOPIC_MAP: dict[tuple[int, int], str] = {
    (1, 0): "ОСАГО",
    (1, 1): "страховая сумма",
    (1, 2): "ответственность",
    (1, 3): "франшиза",
    (2, 0): "страховой случай",
    (2, 1): "страховая сумма",
    (2, 2): "срок страхования",
    (3, 0): "медицинское страхование",
    (3, 1): "выгодоприобретатель",
}

KEYWORD_TOPIC_MAP: dict[str, list[str]] = {
    "ОСАГО": ["осаго", "автогражданка", "дтп", "авария", "машина"],
    "КАСКО": ["каско", "угон", "своя машина"],
    "медицинское страхование": ["омс", "дмс", "врач", "больница", "здоровье", "лечение"],
    "имущество": ["квартира", "дом", "затопили", "пожар", "кража", "велосипед", "телефон"],
    "базовые понятия": ["полис", "премия", "страховой случай", "выплата", "франшиза"],
    "жизнь и здоровье": ["жизнь", "смерть", "травма", "несчастный случай"],
}

_mistakes: dict[int, list[str]] = defaultdict(list)


def record_mistake(user_id: int, scenario_id: int, step: int, question: str = "") -> str:
    topic = _detect_topic(scenario_id, step, question)
    _mistakes[user_id].append(topic)
    return topic


def get_weak_topics(user_id: int, top_n: int = 3) -> list[tuple[str, int]]:
    mistakes = _mistakes.get(user_id, [])
    if not mistakes:
        return []
    return Counter(mistakes).most_common(top_n)


def get_recommendation(user_id: int) -> str:
    weak = get_weak_topics(user_id)
    if not weak:
        return "Ты отлично справляешься! Попробуй более сложные сценарии. 🎉"

    top_topic, _ = weak[0]

    topic_advice: dict[str, str] = {
        "ОСАГО": "Повтори раздел про ОСАГО — это обязательная страховка, важно знать основы.",
        "КАСКО": "Загляни в раздел про КАСКО: чем оно отличается от ОСАГО?",
        "франшиза": "Попрактикуйся с задачами на франшизу — там нужно чуть посчитать.",
        "страховая сумма": "Повтори, что такое страховая сумма и как она влияет на выплату.",
        "страховой случай": "Разбери примеры: что считается страховым случаем, а что — нет.",
        "срок страхования": "Обрати внимание на сроки: когда начинается и заканчивается защита.",
        "медицинское страхование": "Пройди сценарии про ОМС и ДМС — в жизни это очень пригодится.",
        "имущество": "Попробуй сценарии про страхование квартиры и личных вещей.",
        "базовые понятия": "Зайди в раздел «Словарь терминов» — там всё объяснено просто.",
        "жизнь и здоровье": "Изучи раздел про страхование от несчастных случаев.",
        "выгодоприобретатель": "Вспомни: выгодоприобретатель — это тот, кто получает выплату.",
        "ответственность": "Разбери, кто несёт ответственность при ДТП — это ключ к ОСАГО.",
    }

    advice = topic_advice.get(top_topic, f"Стоит повторить тему «{top_topic}».")

    if len(weak) > 1:
        other_topics = ", ".join(t for t, _ in weak[1:])
        advice += f" Также обрати внимание на: {other_topics}."

    return advice


def get_full_stats(user_id: int) -> dict:
    weak = get_weak_topics(user_id, top_n=10)
    return {
        "total_mistakes": sum(cnt for _, cnt in weak),
        "weak_topics": [{"topic": t, "mistakes": c} for t, c in weak],
        "recommendation": get_recommendation(user_id),
    }


def _detect_topic(scenario_id: int, step: int, question: str) -> str:
    mapped = STEP_TOPIC_MAP.get((scenario_id, step))
    if mapped:
        return mapped

    question_lower = question.lower()
    for topic, keywords in KEYWORD_TOPIC_MAP.items():
        if any(kw in question_lower for kw in keywords):
            return topic

    return "общие знания"
