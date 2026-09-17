"""Pipeline step 1: normalize medication names to DCB with Gemini."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.motor.prompts import (
    NORMALIZATION_SYSTEM_PROMPT,
    NORMALIZATION_USER_TEMPLATE,
)


logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _llm() -> ChatGoogleGenerativeAI:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Define it in .env before starting the engine."
        )
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.0,
    )


def _strip_code_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[: -3]
    return cleaned.strip()


async def normalize(medicacoes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize the medication list to DCB nomenclature.

    If the LLM returns invalid JSON, the original list is returned unchanged
    so the pipeline can still proceed to verification.
    """
    if not medicacoes:
        return []

    prompt = NORMALIZATION_USER_TEMPLATE.format(
        medicacoes_json=json.dumps(medicacoes, ensure_ascii=False, indent=2)
    )
    messages = [
        SystemMessage(content=NORMALIZATION_SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ]

    try:
        response = await _llm().ainvoke(messages)
    except Exception:  # noqa: BLE001 — call failed → return the original list
        logger.exception("Gemini call (normalization) failed.")
        return medicacoes

    raw = _strip_code_fence(str(response.content))
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("Invalid JSON in normalization: %s", raw)
        return medicacoes

    normalizadas = parsed.get("medicacoes")
    if not isinstance(normalizadas, list):
        logger.error("Normalization response has no 'medicacoes' key: %s", raw)
        return medicacoes
    return normalizadas
