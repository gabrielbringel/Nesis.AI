"""Testes do scorer ensemble."""

from __future__ import annotations

import pytest

from motor.models import Medication, RuleViolation
from motor.scorer import RiskScorer


@pytest.fixture
def meds():
    return (
        Medication(raw_name="Warfarina", normalized_name="warfarina"),
        Medication(raw_name="Aspirina", normalized_name="aspirina"),
    )


def _rule(score: float = 0.9, rule_id: str = "R001") -> RuleViolation:
    return RuleViolation(
        rule_id=rule_id,
        name="teste",
        severity_score=score,
        mechanism="mech",
        recommendation="rec",
    )


def test_score_grave_when_all_sources_high(meds):
    scorer = RiskScorer(drugbank_weight=0.4, chemicalx_weight=0.3, rules_weight=0.3)
    alert = scorer.score(
        meds[0],
        meds[1],
        drugbank_result={"found": True, "severity": "GRAVE", "score": 0.95},
        chemicalx_result={"available": True, "probability": 0.78, "class": "HIGH"},
        rule_violations=[_rule(0.90)],
    )
    assert alert is not None
    assert alert.severity == "GRAVE"
    assert alert.final_score >= 0.70


def test_score_redistributes_when_only_rules_available(meds):
    scorer = RiskScorer(drugbank_weight=0.4, chemicalx_weight=0.3, rules_weight=0.3)
    alert = scorer.score(
        meds[0],
        meds[1],
        drugbank_result={"found": False, "score": 0.0},
        chemicalx_result={"available": False, "probability": 0.0},
        rule_violations=[_rule(0.9)],
    )
    assert alert is not None
    # com apenas regras, o score final deve igualar o score da regra
    assert alert.final_score == pytest.approx(0.9, abs=1e-3)


def test_score_leve_when_below_threshold(meds):
    scorer = RiskScorer()
    alert = scorer.score(
        meds[0],
        meds[1],
        drugbank_result={"found": True, "severity": "LEVE", "score": 0.20},
        chemicalx_result={"available": True, "probability": 0.15},
        rule_violations=[_rule(0.25)],
    )
    assert alert is not None
    assert alert.severity == "LEVE"
    assert alert.final_score < 0.40


def test_score_returns_none_when_no_signals(meds):
    scorer = RiskScorer()
    alert = scorer.score(
        meds[0],
        meds[1],
        drugbank_result={"found": False},
        chemicalx_result={"available": False},
        rule_violations=[],
    )
    assert alert is None


def test_weights_are_normalized():
    scorer = RiskScorer(drugbank_weight=2, chemicalx_weight=1, rules_weight=1)
    total = sum(scorer.weights.values())
    assert total == pytest.approx(1.0)
