"""Scoring ensemble entre DrugBank, ChemicalX e regras clínicas."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from motor.models.alert import Alert, RuleViolation
from motor.models.medication import Medication


_GRAVE_THRESHOLD = 0.70
_MODERADA_THRESHOLD = 0.40


class RiskScorer:
    """Combina os três sinais de risco e produz um `Alert`."""

    def __init__(
        self,
        drugbank_weight: Optional[float] = None,
        chemicalx_weight: Optional[float] = None,
        rules_weight: Optional[float] = None,
    ) -> None:
        w_db = drugbank_weight if drugbank_weight is not None else _env_float("DRUGBANK_WEIGHT", 0.40)
        w_cx = chemicalx_weight if chemicalx_weight is not None else _env_float("CHEMICALX_WEIGHT", 0.30)
        w_rl = rules_weight if rules_weight is not None else _env_float("RULES_WEIGHT", 0.30)
        total = w_db + w_cx + w_rl
        if total <= 0:
            raise ValueError("Pesos do scorer não podem somar 0")
        # normaliza para 1.0
        self._weights = {
            "drugbank": w_db / total,
            "chemicalx": w_cx / total,
            "rules": w_rl / total,
        }

    @property
    def weights(self) -> dict[str, float]:
        return dict(self._weights)

    def score(
        self,
        med1: Medication,
        med2: Medication,
        drugbank_result: dict,
        chemicalx_result: dict,
        rule_violations: list[RuleViolation],
    ) -> Optional[Alert]:
        """Retorna um Alert consolidado ou None se nada relevante foi detectado."""
        db_score = float(drugbank_result.get("score", 0.0)) if drugbank_result.get("found") else None
        cx_score = (
            float(chemicalx_result.get("probability", 0.0))
            if chemicalx_result.get("available")
            else None
        )
        rules_score = (
            max((v.severity_score for v in rule_violations), default=0.0)
            if rule_violations
            else None
        )

        available: dict[str, float] = {}
        if db_score is not None:
            available["drugbank"] = db_score
        if cx_score is not None:
            available["chemicalx"] = cx_score
        if rules_score is not None and rules_score > 0:
            available["rules"] = rules_score

        if not available:
            return None

        # redistribui pesos proporcionalmente entre fontes disponíveis
        total_weight = sum(self._weights[src] for src in available)
        if total_weight <= 0:
            return None
        adjusted = {src: self._weights[src] / total_weight for src in available}
        final_score = sum(adjusted[src] * available[src] for src in available)

        severity = _score_to_severity(final_score)

        mechanism = _pick_mechanism(drugbank_result, rule_violations)
        recommendation = _pick_recommendation(drugbank_result, rule_violations)
        evidence = _build_evidence(available, drugbank_result, chemicalx_result, rule_violations)

        component_scores = {
            "drugbank": db_score if db_score is not None else 0.0,
            "chemicalx": cx_score if cx_score is not None else 0.0,
            "rules": rules_score if rules_score is not None else 0.0,
        }

        return Alert(
            drug_pair=(_display_name(med1), _display_name(med2)),
            severity=severity,
            final_score=round(final_score, 4),
            component_scores=component_scores,
            mechanism=mechanism,
            recommendation=recommendation,
            evidence=evidence,
            rule_ids=[v.rule_id for v in rule_violations],
            timestamp=datetime.now(timezone.utc),
        )


def _env_float(key: str, default: float) -> float:
    raw = os.getenv(key)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _score_to_severity(score: float) -> str:
    if score >= _GRAVE_THRESHOLD:
        return "GRAVE"
    if score >= _MODERADA_THRESHOLD:
        return "MODERADA"
    return "LEVE"


def _display_name(med: Medication) -> str:
    return (med.normalized_name or med.raw_name).strip()


def _pick_mechanism(drugbank_result: dict, rules: list[RuleViolation]) -> str:
    mech = drugbank_result.get("mechanism") if drugbank_result.get("found") else None
    if mech:
        return str(mech)
    if rules:
        return rules[0].mechanism
    return "Mecanismo não determinado pelas fontes disponíveis."


def _pick_recommendation(drugbank_result: dict, rules: list[RuleViolation]) -> str:
    if rules:
        return rules[0].recommendation
    if drugbank_result.get("found"):
        return "Revisar a associação e avaliar alternativa terapêutica quando possível."
    return "Confirmar indicação clínica e monitorar o paciente."


def _build_evidence(
    available: dict[str, float],
    drugbank_result: dict,
    chemicalx_result: dict,
    rules: list[RuleViolation],
) -> list[dict]:
    out: list[dict] = []
    if "drugbank" in available and available["drugbank"] > 0.3:
        out.append(
            {
                "source": drugbank_result.get("source") or "DrugBank/OpenFDA",
                "text": drugbank_result.get("evidence") or drugbank_result.get("mechanism") or "",
                "reference": "Neo4j interaction graph",
                "score": available["drugbank"],
            }
        )
    if "chemicalx" in available and available["chemicalx"] > 0.3:
        out.append(
            {
                "source": "ChemicalX (EPGCNDS)",
                "text": f"Probabilidade prevista: {available['chemicalx']:.2f}",
                "reference": chemicalx_result.get("class", "LOW"),
                "score": available["chemicalx"],
            }
        )
    if "rules" in available and available["rules"] > 0.3:
        for rule in rules:
            if rule.severity_score > 0.3:
                out.append(
                    {
                        "source": "Regras clínicas",
                        "text": rule.mechanism,
                        "reference": rule.rule_id,
                        "score": rule.severity_score,
                    }
                )
    return out
