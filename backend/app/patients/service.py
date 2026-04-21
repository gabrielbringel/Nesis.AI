"""Regras de negócio de pacientes."""

from __future__ import annotations

import hashlib
import logging
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.patients.models import Patient
from app.patients.schemas import PatientCreate, PatientUpdate

logger = logging.getLogger(__name__)


def hash_cpf(cpf_digits: str) -> str:
    """SHA-256 do CPF já limpo. Nunca armazenamos o CPF em texto claro."""
    return hashlib.sha256(cpf_digits.encode("utf-8")).hexdigest()


async def create_patient(session: AsyncSession, payload: PatientCreate) -> Patient:
    patient = Patient(
        cpf_hash=hash_cpf(payload.cpf),
        full_name=payload.full_name,
        birth_date=payload.birth_date,
        sex=payload.sex,
    )
    session.add(patient)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Paciente já cadastrado"
        )
    await session.refresh(patient)
    logger.info("Paciente criado: %s", patient.id)
    return patient


async def get_patient(session: AsyncSession, patient_id: uuid.UUID) -> Patient:
    patient = (
        await session.execute(select(Patient).where(Patient.id == patient_id))
    ).scalar_one_or_none()
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recurso não encontrado"
        )
    return patient


async def list_patients(
    session: AsyncSession,
    page: int,
    page_size: int,
    name: Optional[str] = None,
) -> tuple[list[Patient], int]:
    stmt = select(Patient)
    count_stmt = select(func.count(Patient.id))

    if name:
        like = f"%{name.lower()}%"
        stmt = stmt.where(func.lower(Patient.full_name).like(like))
        count_stmt = count_stmt.where(func.lower(Patient.full_name).like(like))

    total = (await session.execute(count_stmt)).scalar_one()
    offset = max(page - 1, 0) * page_size
    stmt = stmt.order_by(Patient.created_at.desc()).offset(offset).limit(page_size)
    items = list((await session.execute(stmt)).scalars().all())
    return items, int(total)


async def update_patient(
    session: AsyncSession, patient_id: uuid.UUID, payload: PatientUpdate
) -> Patient:
    patient = await get_patient(session, patient_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(patient, key, value)
    await session.commit()
    await session.refresh(patient)
    return patient
