"""Endpoints de análise de prescrições."""

from __future__ import annotations

from fastapi import APIRouter, Request
import logging

from app.prescriptions.schemas import AnalyzeRequest, AnalyzeResponse
from app.prescriptions.service import analisar

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analyze"])

@router.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(request: Request) -> AnalyzeResponse:
    """Recebe os dados scrapeados pela extensão Chrome e devolve alertas.

    Por ora a persistência está desligada — apenas dispara o motor (stub) e
    retorna a resposta agregada por severidade.
    """
    raw_payload = await request.json()
    
    logger.info("=== PAYLOAD RECEBIDO DO SCRAPER ===")
    import json
    logger.info(json.dumps(raw_payload, indent=2, ensure_ascii=False))
    logger.info("===================================")
    
    from pydantic import ValidationError
    from fastapi import HTTPException
    
    try:
        payload = AnalyzeRequest.model_validate(raw_payload)
    except ValidationError as e:
        logger.error(f"Erro de validação no payload:\n{e}")
        raise HTTPException(status_code=422, detail=e.errors())
        
    return await analisar(payload)
