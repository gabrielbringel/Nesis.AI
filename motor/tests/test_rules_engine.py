"""Testes do motor de regras clínicas."""

from __future__ import annotations

from motor.interaction import ClinicalRulesEngine
from motor.models import Medication


def _med(name: str, **kwargs) -> Medication:
    return Medication(
        raw_name=name,
        normalized_name=kwargs.pop("normalized_name", name.lower()),
        **kwargs,
    )


def test_r001_anticoagulant_plus_antiaggregant():
    engine = ClinicalRulesEngine()
    warfarin = _med("Warfarina")
    aspirin = _med("Aspirina")
    violations = engine.check(warfarin, aspirin)
    ids = [v.rule_id for v in violations]
    assert "R001" in ids


def test_r002_paracetamol_above_max_dose():
    engine = ClinicalRulesEngine()
    paracetamol = _med("Paracetamol", dose_value=5000.0, dose_unit="mg", frequency="dia")
    other = _med("Dipirona")
    violations = engine.check(paracetamol, other)
    assert any(v.rule_id == "R002" for v in violations)


def test_r003_duplicate_therapeutic_class():
    engine = ClinicalRulesEngine()
    atenolol = _med("Atenolol", atc_code="C07AB03")
    metoprolol = _med("Metoprolol", atc_code="C07AB02")
    violations = engine.check(atenolol, metoprolol)
    assert any(v.rule_id == "R003" for v in violations)


def test_r004_metformin_without_renal_function():
    engine = ClinicalRulesEngine()
    metformin = _med("Metformina")
    other = _med("Paracetamol", dose_value=500.0, dose_unit="mg")
    violations = engine.check(metformin, other, context={})
    assert any(v.rule_id == "R004" for v in violations)


def test_r004_skipped_when_renal_function_provided():
    engine = ClinicalRulesEngine()
    metformin = _med("Metformina")
    other = _med("Paracetamol", dose_value=500.0, dose_unit="mg")
    violations = engine.check(metformin, other, context={"patient_renal_function": 90})
    assert not any(v.rule_id == "R004" for v in violations)


def test_r005_ieca_in_pregnant_patient():
    engine = ClinicalRulesEngine()
    enalapril = _med("Enalapril")
    other = _med("Paracetamol", dose_value=500.0, dose_unit="mg")
    violations = engine.check(enalapril, other, context={"patient_pregnant": True})
    assert any(v.rule_id == "R005" for v in violations)


def test_r006_two_opioids():
    engine = ClinicalRulesEngine()
    tramadol = _med("Tramadol")
    codeine = _med("Codeina")
    violations = engine.check(tramadol, codeine)
    assert any(v.rule_id == "R006" for v in violations)


def test_r008_methotrexate_plus_nsaid():
    engine = ClinicalRulesEngine()
    mtx = _med("Metotrexato")
    ibuprofen = _med("Ibuprofeno")
    violations = engine.check(mtx, ibuprofen)
    assert any(v.rule_id == "R008" for v in violations)


def test_r010_steroid_plus_nsaid():
    engine = ClinicalRulesEngine()
    pred = _med("Prednisona")
    ibuprofen = _med("Ibuprofeno")
    violations = engine.check(pred, ibuprofen)
    assert any(v.rule_id == "R010" for v in violations)


def test_no_violation_for_unrelated_pair():
    engine = ClinicalRulesEngine()
    a = _med("Paracetamol", dose_value=500.0, dose_unit="mg")
    b = _med("Dipirona")
    violations = engine.check(a, b)
    assert violations == []
