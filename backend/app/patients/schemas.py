"""Schemas Pydantic do módulo de pacientes."""

from __future__ import annotations

import re
import uuid
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

Sex = Literal["M", "F", "outro"]


def _clean_cpf(raw: str) -> str:
    return re.sub(r"\D", "", raw or "")


class PatientCreate(BaseModel):
    cpf: str = Field(min_length=11, max_length=14)
    full_name: str = Field(min_length=1, max_length=255)
    birth_date: date
    sex: Sex

    @field_validator("cpf")
    @classmethod
    def _validate_cpf(cls, value: str) -> str:
        digits = _clean_cpf(value)
        if len(digits) != 11 or len(set(digits)) == 1:
            raise ValueError("CPF inválido")
        return digits


class PatientUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    birth_date: Optional[date] = None
    sex: Optional[Sex] = None


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cpf_hash: str
    full_name: str
    birth_date: date
    sex: Sex
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PatientListResponse(BaseModel):
    items: list[PatientRead]
    total: int
    page: int
    page_size: int
