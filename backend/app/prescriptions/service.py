"""Regras de negócio de prescrições."""

from __future__ import annotations

import logging
import uuid
import sys
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
#Processo para encontrar o Motor
root_path = Path(__file__).resolve().parents[3]
if str(root_path) not in sys.path:
    sys.path.insert(0,str(root_path))



from motor.pipeline import MedicationPipeline
from fastapi.concurrency import run_in_threadpool
from app.patients.models import Patient
from app.prescriptions.models import Alert, Prescription
from app.prescriptions.schemas import PrescriptionCreate

logger = logging.getLogger(__name__)

motor_real = MedicationPipeline(min_severity="LEVE")

async def analyze_prescription(
    session: AsyncSession, payload: PrescriptionCreate
) -> Prescription:
    # 1. Valida se o paciente existe
    await _ensure_patient_exists(session, payload.patient_id)

    # 2. Cria a prescrição no banco com status 'processing'
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
        # 2. Execução do motor real (IA)
        raw_result = await run_in_threadpool(motor_real.analyze, payload.raw_text)
        print("\n" + "="*50)
        print("RESPOSTA CRUA DO MOTOR:", raw_result)
        print("="*50 + "\n")

        # 3. Conversão à prova de balas: Transformamos o objeto Pydantic/Python em um dict
        if hasattr(raw_result, "model_dump"):
            result_data = raw_result.model_dump() # Para Pydantic v2
        elif hasattr(raw_result, "dict"):
            result_data = raw_result.dict()       # Para Pydantic v1
        else:
            # Garante que virou dict, independente de como a IA devolveu
            result_data = vars(raw_result) if hasattr(raw_result, "__dict__") else raw_result

        # Agora podemos usar o .get() com total segurança!
        alerts_list = result_data.get("alerts", [])
        proc_time = result_data.get("processing_time_ms", 0.0)
        p_version = result_data.get("version", "1.0.0")

        # 4. Atualização da prescrição
        prescription.status = "done"
        prescription.processing_time_ms = proc_time
        prescription.pipeline_version = p_version

        # 5. Mapeamento e salvamento dos alertas
        for alert_data in alerts_list:
            pair = alert_data.get("drug_pair", ["", ""])
            
            alert = Alert(
                prescription_id=prescription.id,
                drug_pair_1=alert_data.get("drug_pair_1") or (pair[0] if pair else ""),
                drug_pair_2=alert_data.get("drug_pair_2") or (pair[1] if len(pair) > 1 else ""),
                severity=alert_data.get("severity", "MODERADA"),
                final_score=float(alert_data.get("final_score", 0.0)),
                mechanism=alert_data.get("mechanism", ""),
                recommendation=alert_data.get("recommendation", ""),
                evidence=alert_data.get("evidence", []),
                rule_ids=alert_data.get("rule_ids", []),
                component_scores=alert_data.get("component_scores", {}),
            )
            session.add(alert)

        await session.commit()

        logger.info(
            "Prescrição %s analisada com sucesso: %.1fms — %d alertas",
            prescription.id, proc_time, len(alerts_list)
        )

    except Exception as exc:
        logger.exception("Erro crítico no processamento da prescrição: %s", exc)
        prescription.status = "error"
        await session.commit()
        # É importante manter o HTTP Exception aqui para o servidor saber que falhou
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro no motor de IA: {str(exc)}",
        )

    # 7. Comita tudo de uma vez e retorna os dados atualizados
    await session.commit()
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
