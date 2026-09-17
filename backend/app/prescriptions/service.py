"""Invoca o motor de IA e agrega os alertas por severidade.

A persistência em `analises` está desligada; o histórico fica no navegador.
"""

from __future__ import annotations

from collections import Counter

from app.motor import analyze as motor_analyze
from app.prescriptions.schemas import AnalyzeRequest, AnalyzeResponse, Alerta


async def analisar(payload: AnalyzeRequest) -> AnalyzeResponse:
    raw_alertas = await motor_analyze(payload.model_dump())
    alertas = [Alerta.model_validate(a) for a in raw_alertas]

    contagem = Counter(a.severidade for a in alertas)
    return AnalyzeResponse(
        alertas=alertas,
        total_grave=contagem.get("GRAVE", 0),
        total_moderado=contagem.get("MODERADO", 0),
        total_leve=contagem.get("LEVE", 0),
    )
