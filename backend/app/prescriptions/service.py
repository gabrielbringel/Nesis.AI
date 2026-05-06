"""Regras de negócio da análise de prescrições.

Recebe o payload da extensão, dispara o motor de IA (stub por enquanto)
e devolve a resposta agregada por severidade.

A persistência em `analises` está intencionalmente desligada — a tabela
e a migração existem, mas nada é gravado ainda. Habilitar quando o motor
real (LLM + RAG) estiver pronto.
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
