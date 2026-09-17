"""Endpoint de análise de prescrições."""

from fastapi import APIRouter

from app.prescriptions.schemas import AnalyzeRequest, AnalyzeResponse
from app.prescriptions.service import analisar

router = APIRouter(tags=["analyze"])


@router.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Valida os dados extraídos e retorna os alertas, sem persistir a análise."""
    return await analisar(payload)
