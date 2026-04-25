"""Schemas Pydantic v2 para o endpoint /api/v1/analyze.

Espelham o payload enviado pela extensão Chrome (dados scrapeados do prontuário)
e a resposta agregada do motor de IA com os alertas classificados por severidade.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Severidade = Literal["GRAVE", "MODERADO", "LEVE"]


class Medicacao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str
    dose: str
    frequencia: str
    via: str


class Paciente(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str
    idade: int = Field(ge=0, le=130)
    alergias: list[str] = Field(default_factory=list)


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    paciente: Paciente
    medicacoes: list[Medicacao]


class Alerta(BaseModel):
    severidade: Severidade
    descricao: str
    medicamentos_envolvidos: list[str]
    recomendacao: str


class AnalyzeResponse(BaseModel):
    alertas: list[Alerta]
    total_grave: int
    total_moderado: int
    total_leve: int
