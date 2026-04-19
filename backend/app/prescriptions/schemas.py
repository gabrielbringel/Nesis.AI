"""Schemas Pydantic do módulo de prescrições."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

InputType = Literal["text", "xml", "pdf"]
Severity = Literal["GRAVE", "MODERADA", "LEVE"]
Status = Literal["pending", "processing", "done", "error"]


class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    prescription_id: uuid.UUID
    drug_pair_1: str
    drug_pair_2: str
    severity: Severity
    final_score: float
    mechanism: str
    recommendation: str
    evidence: list[dict]
    rule_ids: list[str]
    component_scores: dict[str, float]
    created_at: datetime


class PrescriptionCreate(BaseModel):
    patient_id: uuid.UUID
    raw_text: str = Field(min_length=1)
    input_type: InputType = "text"


class PrescriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    created_by: uuid.UUID
    raw_text: str
    input_type: InputType
    status: Status
    processing_time_ms: Optional[float] = None
    pipeline_version: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    alerts: list[AlertRead] = Field(default_factory=list)


class PrescriptionListResponse(BaseModel):
    items: list[PrescriptionRead]
    total: int
    page: int
    page_size: int
