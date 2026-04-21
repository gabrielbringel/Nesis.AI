"""Regras de negócio de prescrições."""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.motor import mock_pipeline
from app.patients.models import Patient
from app.prescriptions.models import Alert, Prescription
from app.prescriptions.schemas import PrescriptionCreate

logger = logging.getLogger(__name__)


async def analyze_prescription(
    session: AsyncSession, payload: PrescriptionCreate
) -> Prescription:
    await _ensure_patient_exists(session, payload.patient_id)

    prescription = Prescription(
        patient_id=payload.patient_id,
        raw_text=payload.raw_text,
        input_type=payload.input_type,
        status="processing",
    )
    session.add(prescription)
    await session.commit()
    await session.refresh(prescription)

    try:
        result = mock_pipeline.analyze(payload.raw_text)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Falha no pipeline: %s", exc)
        prescription.status = "error"
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno. Tente novamente.",
        )

    for alert_data in result.get("alerts", []):
        pair = alert_data.get("drug_pair") or ["", ""]
        alert = Alert(
            prescription_id=prescription.id,
            drug_pair_1=str(pair[0]) if len(pair) > 0 else "",
            drug_pair_2=str(pair[1]) if len(pair) > 1 else "",
            severity=alert_data.get("severity", "LEVE"),
            final_score=float(alert_data.get("final_score", 0.0)),
            mechanism=alert_data.get("mechanism", ""),
            recommendation=alert_data.get("recommendation", ""),
            evidence=alert_data.get("evidence", []),
            rule_ids=alert_data.get("rule_ids", []),
            component_scores=alert_data.get("component_scores", {}),
        )
        session.add(alert)

    prescription.status = "done"
    prescription.processing_time_ms = float(result.get("processing_time_ms", 0.0))
    prescription.pipeline_version = result.get("pipeline_version")
    await session.commit()
    logger.info(
        "Prescrição %s analisada em %.1fms — %d alertas",
        prescription.id,
        prescription.processing_time_ms or 0.0,
        len(result.get("alerts", [])),
    )

    return await _reload_with_alerts(session, prescription.id)


async def get_prescription(
    session: AsyncSession, prescription_id: uuid.UUID
) -> Prescription:
    prescription = await _reload_with_alerts(session, prescription_id)
    if prescription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recurso não encontrado"
        )
    return prescription


async def list_prescriptions(
    session: AsyncSession,
    *,
    page: int,
    page_size: int,
    patient_id: Optional[uuid.UUID] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> tuple[list[Prescription], int]:
    stmt = select(Prescription).options(selectinload(Prescription.alerts))
    count_stmt = select(func.count(func.distinct(Prescription.id)))

    if patient_id:
        stmt = stmt.where(Prescription.patient_id == patient_id)
        count_stmt = count_stmt.where(Prescription.patient_id == patient_id)

    if status_filter:
        stmt = stmt.where(Prescription.status == status_filter)
        count_stmt = count_stmt.where(Prescription.status == status_filter)

    if severity:
        subq = select(Alert.prescription_id).where(Alert.severity == severity)
        stmt = stmt.where(Prescription.id.in_(subq))
        count_stmt = count_stmt.where(Prescription.id.in_(subq))

    total = (await session.execute(count_stmt)).scalar_one()
    offset = max(page - 1, 0) * page_size
    stmt = stmt.order_by(Prescription.created_at.desc()).offset(offset).limit(page_size)
    items = list((await session.execute(stmt)).scalars().unique().all())
    return items, int(total)


async def list_prescription_alerts(
    session: AsyncSession, prescription_id: uuid.UUID
) -> list[Alert]:
    prescription = await get_prescription(session, prescription_id)
    stmt = (
        select(Alert)
        .where(Alert.prescription_id == prescription.id)
        .order_by(Alert.final_score.desc())
    )
    return list((await session.execute(stmt)).scalars().all())


async def _ensure_patient_exists(
    session: AsyncSession, patient_id: uuid.UUID
) -> None:
    patient = (
        await session.execute(select(Patient).where(Patient.id == patient_id))
    ).scalar_one_or_none()
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recurso não encontrado"
        )


async def _reload_with_alerts(
    session: AsyncSession, prescription_id: uuid.UUID
) -> Optional[Prescription]:
    stmt = (
        select(Prescription)
        .where(Prescription.id == prescription_id)
        .options(selectinload(Prescription.alerts))
    )
    return (await session.execute(stmt)).scalar_one_or_none()
