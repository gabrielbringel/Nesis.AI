"""Pydantic v2 schemas for the /api/v1/analyze endpoint.

They mirror the payload sent by the Chrome extension (data scraped from the
patient record) and the AI engine's aggregated response, with alerts
classified by severity. Field names stay in Portuguese to match the frontend.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Severidade = Literal["GRAVE", "MODERADO", "LEVE"]


class Medicacao(BaseModel):
    model_config = ConfigDict(extra="ignore")

    nome: str
    dose: str = ""
    frequencia: str = ""
    via: str = ""
    posologia_completa: str | None = None


class Paciente(BaseModel):
    model_config = ConfigDict(extra="ignore")

    nome: str
    idade: int = Field(ge=0, le=130)
    alergias: list[str] = Field(default_factory=list)
    sexo: str = "?"
    peso: str | None = None
    altura: str | None = None
    motivo_consulta: str | None = None
    objetivo: str | None = None
    avaliacao: str | None = None
    problemas_condicoes: list[str] = Field(default_factory=list)
    med_em_uso: list[str] = Field(default_factory=list)


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    paciente: Paciente
    medicacoes: list[Medicacao]


class Alerta(BaseModel):
    severidade: Severidade
    titulo: str = Field(default="Alerta Clínico")
    descricao: str
    fonte: str = Field(default="Base de conhecimento")
    medicamentos_envolvidos: list[str]
    recomendacao: str


class AnalyzeResponse(BaseModel):
    alertas: list[Alerta]
    total_grave: int
    total_moderado: int
    total_leve: int
