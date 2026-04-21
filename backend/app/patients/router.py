"""Rotas de pacientes."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.patients import service
from app.patients.schemas import (
    PatientCreate,
    PatientListResponse,
    PatientRead,
    PatientUpdate,
)

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
async def create_patient(
    payload: PatientCreate,
    db: AsyncSession = Depends(get_db),
) -> PatientRead:
    patient = await service.create_patient(db, payload)
    return PatientRead.model_validate(patient)


@router.get("", response_model=PatientListResponse)
async def list_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    name: Optional[str] = Query(default=None, min_length=1, max_length=255),
    db: AsyncSession = Depends(get_db),
) -> PatientListResponse:
    items, total = await service.list_patients(
        db, page=page, page_size=page_size, name=name
    )
    return PatientListResponse(
        items=[PatientRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{patient_id}", response_model=PatientRead)
async def get_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> PatientRead:
    patient = await service.get_patient(db, patient_id)
    return PatientRead.model_validate(patient)


@router.patch("/{patient_id}", response_model=PatientRead)
async def update_patient(
    patient_id: uuid.UUID,
    payload: PatientUpdate,
    db: AsyncSession = Depends(get_db),
) -> PatientRead:
    patient = await service.update_patient(db, patient_id, payload)
    return PatientRead.model_validate(patient)
