"""Orquestrador do motor de IA: normalização → RAG local → verificação LLM → fallback.

Fluxo:
  1. normalize()          — Gemini padroniza os nomes dos medicamentos para DCB
  2. buscar_contexto_sus()— RAG local lê o banco_conhecimento_sus.json e filtra
                           as entradas relevantes para os medicamentos prescritos
  3. verify()             — Gemini analisa a prescrição COM o contexto injetado
  4. [fallback]           — Se o Gemini falhar, o ClinicalRulesEngine hardcoded
                           avalia os pares de medicamentos deterministicamente

Mantém a assinatura `async def analyze(payload: dict) -> list[dict]`
para preservar contrato com `app.prescriptions.service`.
"""

from __future__ import annotations

import logging
from itertools import combinations
from typing import Any

from app.motor.normalizer import normalize
from app.motor.verifier import verify
from app.motor.vectorstore import buscar_contexto_sus
from app.motor.rules_engine import ClinicalRulesEngine, Medication

logger = logging.getLogger(__name__)

# Instância singleton do motor de regras (fallback determinístico)
_motor_regras = ClinicalRulesEngine()


async def analyze(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Analisa uma prescrição e retorna lista de alertas clínicos."""
    paciente = payload.get("paciente") or {}
    medicacoes_raw = payload.get("medicacoes") or []

    try:
        logger.info("Iniciando análise com motor LLM + RAG local...")

        # Etapa 1: Normaliza os nomes para DCB via Gemini
        medicacoes_normalizadas = await normalize(medicacoes_raw)

        # Etapa 2: Busca contexto clínico no banco SUS (RAG local)
        nomes_medicamentos = [
            med.get("nome") for med in medicacoes_normalizadas if med.get("nome")
        ]
        logger.info("Buscando contexto SUS para: %s", nomes_medicamentos)
        contexto_rag = buscar_contexto_sus(nomes_medicamentos)
        logger.debug("Contexto RAG injetado:\n%s", contexto_rag)

        # Etapa 3: Verificação clínica pelo Gemini com o contexto injetado
        alertas = await verify(paciente, medicacoes_normalizadas, contexto_rag)
        return alertas

    except Exception as exc:
        # Etapa 4: Fallback determinístico com o motor de regras local
        logger.error("LLM falhou (%s). Acionando fallback (Rules Engine)...", exc)
        return _fallback_rules_engine(paciente, medicacoes_raw)


def _fallback_rules_engine(
    paciente: dict[str, Any], medicacoes_raw: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Avalia pares de medicamentos com o motor de regras determinístico."""
    alertas: list[dict[str, Any]] = []

    # Regras que dependem de uma única medicação (dose, ajuste renal, gestação, via)
    for med_dict in medicacoes_raw:
        med = _dict_para_medication(med_dict)
        for violacao in _motor_regras.check_single(med, context=paciente):
            alertas.append(_violacao_para_alerta(violacao, [med.raw_name.title()]))

    # Regras que dependem de pares de medicamentos
    if len(medicacoes_raw) >= 2:
        for m1_dict, m2_dict in combinations(medicacoes_raw, 2):
            m1 = _dict_para_medication(m1_dict)
            m2 = _dict_para_medication(m2_dict)
            for violacao in _motor_regras.check(m1, m2, context=paciente):
                alertas.append(
                    _violacao_para_alerta(violacao, [m1.raw_name.title(), m2.raw_name.title()])
                )

    return alertas


def _dict_para_medication(m: dict[str, Any]) -> Medication:
    """Converte um dict de medicação bruto para o objeto Medication do rules_engine."""
    dose_str: str = m.get("dose") or ""
    dose_value, dose_unit = _parse_dose(dose_str)
    return Medication(
        raw_name=m.get("nome") or "",
        normalized_name=(m.get("nome") or "").lower().strip(),
        dose=dose_str,
        dose_value=dose_value,
        dose_unit=dose_unit,
        frequency=m.get("frequencia") or "",
        route=m.get("via") or "",
    )


def _parse_dose(dose_str: str) -> tuple[float | None, str | None]:
    """Tenta extrair o valor numérico e a unidade de uma string de dose (ex: '500mg')."""
    import re
    match = re.match(r"^\s*([\d.,]+)\s*([a-zA-Zμ]+)?", dose_str.strip())
    if not match:
        return None, None
    try:
        value = float(match.group(1).replace(",", "."))
        unit = match.group(2) or "mg"
        return value, unit.lower()
    except ValueError:
        return None, None


def _violacao_para_alerta(violacao: Any, meds_envolvidos: list[str]) -> dict[str, Any]:
    """Converte uma RuleViolation em dict de alerta compatível com o schema."""
    if violacao.severity_score > 0.8:
        severidade = "GRAVE"
    elif violacao.severity_score > 0.4:
        severidade = "MODERADO"
    else:
        severidade = "LEVE"

    return {
        "severidade": severidade,
        "descricao": f"[FALLBACK LOCAL] {violacao.mechanism}",
        "medicamentos_envolvidos": meds_envolvidos,
        "recomendacao": violacao.recommendation,
    }