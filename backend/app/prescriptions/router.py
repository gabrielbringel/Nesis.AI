"""Endpoints de análise de prescrições."""

from __future__ import annotations

from fastapi import APIRouter
import logging

from app.prescriptions.schemas import AnalyzeRequest, AnalyzeResponse
from app.prescriptions.service import analisar

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analyze"])

@router.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Recebe os dados scrapeados pela extensão Chrome e devolve alertas.

    Por ora a persistência está desligada — apenas dispara o motor (stub) e
    retorna a resposta agregada por severidade.
    """
    logger.info("=== PAYLOAD RECEBIDO DO SCRAPER ===")
    logger.info(payload.model_dump_json(indent=2))
    logger.info("===================================")
    return await analisar(payload)
