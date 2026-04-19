"""Testes de ponta-a-ponta do pipeline."""

from __future__ import annotations

from motor.pipeline import MedicationPipeline


def test_pipeline_detects_warfarin_aspirin_interaction():
    pipeline = MedicationPipeline()
    result = pipeline.analyze(
        "Paciente em uso de Warfarina 5mg e Aspirina 100mg 1x ao dia"
    )
    assert result.medications_found, "deveria extrair medicamentos"
    assert any(a.severity == "GRAVE" for a in result.alerts), \
        f"esperava alerta GRAVE, obteve {[a.severity for a in result.alerts]}"
    assert any("R001" in a.rule_ids for a in result.alerts)


def test_pipeline_single_drug_produces_no_alert():
    pipeline = MedicationPipeline()
    result = pipeline.analyze("Paracetamol 500mg 6/6h")
    assert result.alerts == []


def test_pipeline_empty_text_returns_empty_result():
    pipeline = MedicationPipeline()
    result = pipeline.analyze("")
    assert result.medications_found == []
    assert result.alerts == []
    assert result.unresolved_drugs == []


def test_pipeline_whitespace_only_text_returns_empty_result():
    pipeline = MedicationPipeline()
    result = pipeline.analyze("   \n   ")
    assert result.medications_found == []
    assert result.alerts == []


def test_pipeline_alerts_sorted_by_score_desc():
    pipeline = MedicationPipeline()
    result = pipeline.analyze(
        "Paciente em uso de Warfarina 5mg, Aspirina 100mg e Ibuprofeno 400mg"
    )
    scores = [a.final_score for a in result.alerts]
    assert scores == sorted(scores, reverse=True)


def test_pipeline_records_processing_time():
    pipeline = MedicationPipeline()
    result = pipeline.analyze("Warfarina 5mg e Aspirina 100mg")
    assert result.processing_time_ms >= 0.0
    assert result.pipeline_version
