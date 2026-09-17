"""AI engine orchestrator: normalization → RAG verification (PGVector + LLM).

Flow:
  1. normalize() — Gemini standardizes medication names to DCB
  2. verify()    — Retrieves context from PGVector; Gemini reviews the
                   prescription with that clinical knowledge in the prompt

Keeps the `async def analyze(payload: dict) -> list[dict]` signature to
preserve the contract with `app.prescriptions.service`.
"""

from __future__ import annotations

import logging
from typing import Any

from app.motor.normalizer import normalize
from app.motor.verifier import verify

logger = logging.getLogger(__name__)


async def analyze(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Analyze a prescription and return a list of clinical alerts."""
    paciente = payload.get("paciente") or {}
    medicacoes_raw = payload.get("medicacoes") or []

    try:
        medicacoes_normalizadas = await normalize(medicacoes_raw)
        alertas = await verify(paciente, medicacoes_normalizadas)
        return alertas

    except Exception as exc:
        logger.error("LLM failed (%s). Returning an empty alert list.", exc)
        return []