"""Orquestrador do motor de IA: normalização → verificação RAG.

Mantém a assinatura `async def analyze(payload: dict) -> list[dict]`
para preservar contrato com `app.prescriptions.service`.
"""

from __future__ import annotations

from typing import Any

from app.motor.normalizer import normalize
from app.motor.verifier import verify


async def analyze(payload: dict[str, Any]) -> list[dict[str, Any]]:
    paciente = payload.get("paciente") or {}
    medicacoes_raw = payload.get("medicacoes") or []

    medicacoes_normalizadas = await normalize(medicacoes_raw)
    alertas = await verify(paciente, medicacoes_normalizadas)
    return alertas
