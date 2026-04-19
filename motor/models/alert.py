from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

Severity = Literal["GRAVE", "MODERADA", "LEVE"]


class RuleViolation(BaseModel):
    """Violação de uma regra clínica hardcoded."""

    rule_id: str
    name: str
    severity_score: float = Field(ge=0.0, le=1.0)
    mechanism: str
    recommendation: str


class Alert(BaseModel):
    """Alerta clínico consolidado após o scoring ensemble."""

    drug_pair: tuple[str, str]
    severity: Severity
    final_score: float = Field(ge=0.0, le=1.0)
    component_scores: dict[str, float]
    mechanism: str
    recommendation: str
    evidence: list[dict]
    rule_ids: list[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=_utcnow)
