"""Pipeline step 2: clinical verification with RAG (PGVector) + Gemini."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any

from langchain_core.documents import Document
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
_RAG_K = 4


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
        temperature=0.1,
    )


def _strip_code_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
    return cleaned.strip()


def _build_query(
    paciente: dict[str, Any], medicacoes: list[dict[str, Any]]
) -> str:
    nomes = ", ".join(m.get("nome", "") for m in medicacoes)
    alergias = ", ".join(paciente.get("alergias", []) or []) or "nenhuma"
    problemas = ", ".join(paciente.get("problemas_condicoes", []) or []) or "nenhum"
    return (
        f"Paciente {paciente.get('idade', '?')} anos, sexo {paciente.get('sexo', '?')}, "
        f"alergias: {alergias}. Comorbidades: {problemas}. "
        f"Medicações: {nomes}."
    )


def _serializar_paciente(paciente: dict[str, Any]) -> str:
    """Build the patient's clinical data block for the prompt, without the name.

    The name travels in the payload (used locally only for display in the
    sidebar), but it is redundant in the LLM prompt and could bias the answer.
    The block itself stays in Portuguese to match the prompt.
    """
    alergias = paciente.get("alergias") or []
    problemas = paciente.get("problemas_condicoes") or []
    return "\n".join([
        f"- Idade: {paciente.get('idade', '?')} anos",
        f"- Sexo: {paciente.get('sexo', '?')}",
        f"- Peso: {paciente.get('peso') or 'não informado'}",
        f"- Altura: {paciente.get('altura') or 'não informado'}",
        f"- Alergias declaradas: {', '.join(alergias) if alergias else 'nenhuma'}",
        f"- Problemas/condições: {', '.join(problemas) if problemas else 'nenhum'}",
        f"- Motivo da consulta: {paciente.get('motivo_consulta') or 'não informado'}",
        f"- Avaliação clínica: {paciente.get('avaliacao') or 'não informada'}",
    ])


def _formatar_contexto(docs: list[Document]) -> str:
    """Join page_content and metadata into a readable block for the prompt."""
    if not docs:
        return "(base de conhecimento vazia — usar conhecimento clínico do modelo)"

    blocos: list[str] = []
    for d in docs:
        meta = d.metadata or {}
        cabecalho = (
            f"[{meta.get('id', '?')}] "
            f"tipo={meta.get('tipo', '?')} | "
            f"severidade={meta.get('severidade', '?')} | "
            f"medicamentos={meta.get('medicamentos', '?')} | "
            f"fonte={meta.get('fonte', '?')}"
        )
        blocos.append(f"{cabecalho}\n{d.page_content}")
    return "\n\n---\n\n".join(blocos)


async def verify(
    paciente: dict[str, Any],
    medicacoes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Generate clinical alerts from the patient and normalized medications.

    Retrieves the k documents most similar to the query from the vector store
    (PGVector) and injects them into the Gemini prompt. When the store is empty
    or unavailable, the LLM falls back to its own clinical knowledge.
    """
    query = _build_query(paciente, medicacoes)
    docs = await search_context(query, k=_RAG_K)
    contexto_rag = _formatar_contexto(docs)

    # Without context, send a default note so the LLM knows retrieval returned nothing
    contexto_final = contexto_rag if contexto_rag.strip() else (
        "(base de conhecimento SUS indisponível — usar conhecimento clínico do modelo)"
    )

    prompt = VERIFICATION_USER_TEMPLATE.format(
        paciente_dados=_serializar_paciente(paciente),
        medicacoes_json=json.dumps(medicacoes, ensure_ascii=False, indent=2),
        contexto_rag=contexto_final,
    )
    messages = [
        SystemMessage(content=VERIFICATION_SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ]

    try:
        response = await _llm().ainvoke(messages)
    except Exception:
        logger.exception("Gemini call (verification) failed.")
        raise

    raw = _strip_code_fence(str(response.content))
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("Invalid JSON in verification: %s", raw)
        return []

    # Gemini sometimes returns a bare list [...] and sometimes {"alertas": [...]}.
    if isinstance(parsed, list):
        alertas = parsed
    elif isinstance(parsed, dict):
        alertas = parsed.get("alertas", [])
    else:
        logger.error("Unexpected verification response format: %s", raw)
        return []

    if not isinstance(alertas, list):
        logger.error("'alertas' field is not a list: %s", raw)
        return []

    return [a for a in alertas if _is_valid_alerta(a)]


def _is_valid_alerta(alerta: Any) -> bool:
    if not isinstance(alerta, dict):
        return False
    severidade = alerta.get("severidade")
    return severidade in _VALID_SEVERITIES
