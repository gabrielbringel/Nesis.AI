"""Prescription analysis endpoint."""

from fastapi import APIRouter

from app.prescriptions.schemas import AnalyzeRequest, AnalyzeResponse
from app.prescriptions.service import analisar

router = APIRouter(tags=["analyze"])


@router.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Validate the extracted data and return alerts without persisting the analysis."""
    return await analisar(payload)
