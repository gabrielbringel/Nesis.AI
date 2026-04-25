"""Etapa 2 do pipeline: verificação clínica via RAG (PGVector) + Gemini."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.motor.prompts import (
    VERIFICATION_SYSTEM_PROMPT,
    VERIFICATION_USER_TEMPLATE,
)
from app.motor.vectorstore import search_context


logger = logging.getLogger(__name__)


_VALID_SEVERITIES = {"GRAVE", "MODERADO", "LEVE"}


@lru_cache(maxsize=1)
def _llm() -> ChatGoogleGenerativeAI:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY não configurada — defina no .env antes de subir o motor."
        )
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.1,
    )


def _strip_code_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[: -3]
    return cleaned.strip()


def _build_query(
    paciente: dict[str, Any], medicacoes: list[dict[str, Any]]
) -> str:
    nomes = ", ".join(m.get("nome", "") for m in medicacoes)
    alergias = ", ".join(paciente.get("alergias", []) or []) or "nenhuma"
    return (
        f"Paciente {paciente.get('idade', '?')} anos, "
        f"alergias: {alergias}. Medicações: {nomes}."
    )


async def verify(
    paciente: dict[str, Any], medicacoes: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Gera alertas clínicos a partir do paciente e medicações normalizadas.

    Recupera contexto da base vetorial e injeta no prompt. Quando a base está
    vazia ou indisponível, o LLM cai para o conhecimento do próprio modelo.
    """
    query = _build_query(paciente, medicacoes)
    contexto_docs = await search_context(query, k=4)
    contexto_rag = (
        "\n\n---\n\n".join(contexto_docs)
        if contexto_docs
        else "(base de conhecimento vazia — usar conhecimento clínico do modelo)"
    )

    alergias = paciente.get("alergias") or []
    prompt = VERIFICATION_USER_TEMPLATE.format(
        paciente_nome=paciente.get("nome", ""),
        paciente_idade=paciente.get("idade", ""),
        paciente_alergias=", ".join(alergias) if alergias else "nenhuma",
        medicacoes_json=json.dumps(medicacoes, ensure_ascii=False, indent=2),
        contexto_rag=contexto_rag,
    )
    messages = [
        SystemMessage(content=VERIFICATION_SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ]

    try:
        response = await _llm().ainvoke(messages)
    except Exception:  # noqa: BLE001
        logger.exception("Chamada ao Gemini (verificação) falhou.")
        return []

    raw = _strip_code_fence(str(response.content))
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("JSON inválido na verificação: %s", raw)
        return []

    alertas = parsed.get("alertas")
    if not isinstance(alertas, list):
        logger.error("Resposta de verificação sem chave 'alertas': %s", raw)
        return []

    return [a for a in alertas if _is_valid_alerta(a)]


def _is_valid_alerta(alerta: Any) -> bool:
    if not isinstance(alerta, dict):
        return False
    severidade = alerta.get("severidade")
    return severidade in _VALID_SEVERITIES
