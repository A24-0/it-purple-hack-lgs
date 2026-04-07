import re

from app.data.terms import TERMS


def _normalize(text: str) -> str:
    return re.sub(r"[^\w\s]", " ", text.lower())


def find_term(question: str) -> str | None:
    normalized = _normalize(question)

    for term_name, data in TERMS.items():
        if _normalize(term_name) in normalized:
            return _format_answer(term_name, data)

        for keyword in data["keywords"]:
            if _normalize(keyword) in normalized:
                return _format_answer(term_name, data)

    return None


def _format_answer(term_name: str, data: dict) -> str:
    return (
        f"**{term_name.capitalize()}** — {data['definition']}\n\n"
        f"Пример: {data['example']}"
    )


def list_all_terms() -> list[str]:
    return list(TERMS.keys())
