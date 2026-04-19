"""Rotas de prescrições."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_audit
from app.database import get_db
from app.dependencies import require_role
from app.prescriptions import service
from app.prescriptions.schemas import (
    AlertRead,
    PrescriptionCreate,
    PrescriptionListResponse,
    PrescriptionRead,
)
from app.users.models import User

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

_clinical = require_role("medico", "farmaceutico", "admin")


@router.post(
    "/analyze", response_model=PrescriptionRead, status_code=status.HTTP_201_CREATED
)
async def analyze_prescription(
    payload: PrescriptionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_clinical),
) -> PrescriptionRead:
    prescription = await service.analyze_prescription(db, payload, current_user)
    await record_audit(
        db,
        user=current_user,
        action="analyze_prescription",
        resource_type="prescription",
        resource_id=prescription.id,
        request=request,
    )
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
    current_user: User = Depends(_clinical),
) -> PrescriptionListResponse:
    items, total = await service.list_prescriptions(
        db,
        current_user,
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
    current_user: User = Depends(_clinical),
) -> PrescriptionRead:
    prescription = await service.get_prescription(db, prescription_id, current_user)
    return PrescriptionRead.model_validate(prescription)


@router.get("/{prescription_id}/alerts", response_model=list[AlertRead])
async def list_alerts(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_clinical),
) -> list[AlertRead]:
    alerts = await service.list_prescription_alerts(db, prescription_id, current_user)
    return [AlertRead.model_validate(a) for a in alerts]
