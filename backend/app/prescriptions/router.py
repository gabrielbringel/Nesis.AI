"""Rotas de prescrições."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.prescriptions import service
from app.prescriptions.schemas import (
    AlertRead,
    PrescriptionCreate,
    PrescriptionListResponse,
    PrescriptionRead,
)

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


@router.post(
    "/analyze", response_model=PrescriptionRead, status_code=status.HTTP_201_CREATED
)
async def analyze_prescription(
    payload: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
) -> PrescriptionRead:
    prescription = await service.analyze_prescription(db, payload)
    return PrescriptionRead.model_validate(prescription)


@router.get("", response_model=PrescriptionListResponse)
async def list_prescriptions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    patient_id: Optional[uuid.UUID] = Query(default=None),
    severity: Optional[str] = Query(default=None, pattern="^(GRAVE|MODERADA|LEVE)$"),
    status_filter: Optional[str] = Query(
        default=None, alias="status", pattern="^(pending|processing|done|error)$"
    ),
    db: AsyncSession = Depends(get_db),
) -> PrescriptionListResponse:
    items, total = await service.list_prescriptions(
        db,
        page=page,
        page_size=page_size,
        patient_id=patient_id,
        severity=severity,
        status_filter=status_filter,
    )
    return PrescriptionListResponse(
        items=[PrescriptionRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{prescription_id}", response_model=PrescriptionRead)
async def get_prescription(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> PrescriptionRead:
    prescription = await service.get_prescription(db, prescription_id)
    return PrescriptionRead.model_validate(prescription)


@router.get("/{prescription_id}/alerts", response_model=list[AlertRead])
async def list_alerts(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[AlertRead]:
    alerts = await service.list_prescription_alerts(db, prescription_id)
    return [AlertRead.model_validate(a) for a in alerts]
