"""Etapa 2 do pipeline: verificação clínica via RAG (PGVector) + Gemini."""

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


def _formatar_contexto(docs: list[Document]) -> str:
    """Concatena page_content + metadata num bloco legível para o prompt."""
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
    """Gera alertas clínicos a partir do paciente e medicações normalizadas.

    Recupera contexto da base vetorial (PGVector) com os k documentos mais
    similares à consulta e injeta no prompt do Gemini. Quando a base está
    vazia ou indisponível, o LLM cai no próprio conhecimento clínico.
    """
    query = _build_query(paciente, medicacoes)
    docs = await search_context(query, k=_RAG_K)
    contexto_rag = _formatar_contexto(docs)


    # Se não vier contexto, usa mensagem padrão para o LLM não ficar sem informação
#6048758c376255e4eb71f062ed45ffdb53afffeb
    contexto_final = contexto_rag if contexto_rag.strip() else (
        "(base de conhecimento SUS indisponível — usar conhecimento clínico do modelo)"
    )
    alergias = paciente.get("alergias") or []
#a293a7c227596e2a0f57fce221237b2b7ba00a25
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
    except Exception:
        logger.exception("Chamada ao Gemini (verificação) falhou.")
        raise

    raw = _strip_code_fence(str(response.content))
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("JSON inválido na verificação: %s", raw)
        return []

    # Gemini às vezes devolve lista direta [...], outras vezes {"alertas": [...]}.
    if isinstance(parsed, list):
        alertas = parsed
    elif isinstance(parsed, dict):
        alertas = parsed.get("alertas", [])
    else:
        logger.error("Resposta de verificação em formato inesperado: %s", raw)
        return []

    if not isinstance(alertas, list):
        logger.error("Campo 'alertas' não é lista: %s", raw)
        return []

    return [a for a in alertas if _is_valid_alerta(a)]


def _is_valid_alerta(alerta: Any) -> bool:
    if not isinstance(alerta, dict):
        return False
    severidade = alerta.get("severidade")
    return severidade in _VALID_SEVERITIES
