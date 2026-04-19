from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

NormalizationSource = Literal["rxnorm", "drugbank", "anvisa", "fuzzy", "unknown"]


class Medication(BaseModel):
    """Representa um medicamento extraído e normalizado a partir do prontuário."""

    raw_name: str
    normalized_name: Optional[str] = None
    rxnorm_id: Optional[int] = None
    smiles: Optional[str] = None
    atc_code: Optional[str] = None
    dose_value: Optional[float] = None
    dose_unit: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    normalization_source: NormalizationSource = "unknown"

    def identifier(self) -> str:
        """Identificador estável usado em logs e chaves de cache."""
        return self.normalized_name or self.raw_name
