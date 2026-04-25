"""Endpoints de análise de prescrições."""

from __future__ import annotations

from fastapi import APIRouter

from app.prescriptions.schemas import AnalyzeRequest, AnalyzeResponse
from app.prescriptions.service import analisar

router = APIRouter(prefix="/api/v1", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Recebe os dados scrapeados pela extensão Chrome e devolve alertas.

    Por ora a persistência está desligada — apenas dispara o motor (stub) e
    retorna a resposta agregada por severidade.
    """
    return await analisar(payload)
