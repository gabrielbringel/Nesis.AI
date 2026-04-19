from __future__ import annotations

from pydantic import BaseModel, Field

from motor.models.alert import Alert
from motor.models.medication import Medication


class PipelineResult(BaseModel):
    """Resultado final da análise completa do prontuário."""

    input_text: str
    medications_found: list[Medication] = Field(default_factory=list)
    alerts: list[Alert] = Field(default_factory=list)
    unresolved_drugs: list[str] = Field(default_factory=list)
    processing_time_ms: float = 0.0
    pipeline_version: str = "0.1.0"
