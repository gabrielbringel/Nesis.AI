"""Orquestrador do motor de IA: normalização → verificação RAG (PGVector + LLM).

Fluxo:
  1. normalize() — Gemini padroniza os nomes dos medicamentos para DCB
  2. verify()    — Recupera contexto via PGVector e o Gemini analisa a prescrição
                   com o conhecimento clínico injetado no prompt

Mantém a assinatura `async def analyze(payload: dict) -> list[dict]`
para preservar contrato com `app.prescriptions.service`.
"""

from __future__ import annotations

import logging
from typing import Any

from app.motor.normalizer import normalize
from app.motor.verifier import verify

logger = logging.getLogger(__name__)


async def analyze(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Analisa uma prescrição e retorna lista de alertas clínicos."""
    paciente = payload.get("paciente") or {}
    medicacoes_raw = payload.get("medicacoes") or []

    try:
        medicacoes_normalizadas = await normalize(medicacoes_raw)
        alertas = await verify(paciente, medicacoes_normalizadas)
        return alertas

    except Exception as exc:
        logger.error("LLM falhou (%s). Retornando lista vazia de alertas.", exc)
        return []