"""Testes do normalizador de fármacos."""

from __future__ import annotations

from motor.normalizer import DrugNormalizer


def test_normalizes_known_drug_via_anvisa():
    normalizer = DrugNormalizer()
    med = normalizer.normalize("Warfarina")
    assert med.rxnorm_id is not None
    assert med.smiles is not None
    assert med.normalization_source in {"anvisa", "rxnorm"}


def test_resolves_commercial_name_via_anvisa():
    normalizer = DrugNormalizer()
    med = normalizer.normalize("Amoxil")
    assert med.normalized_name == "amoxicilina"
    assert med.rxnorm_id == 723


def test_returns_unknown_for_nonexistent_drug():
    normalizer = DrugNormalizer()
    med = normalizer.normalize("xyz123abc")
    assert med.normalization_source == "unknown"
    assert med.rxnorm_id is None


def test_fuzzy_match_tolerates_small_typo():
    normalizer = DrugNormalizer()
    med = normalizer.normalize("Amoxicilna")  # faltando uma letra
    assert med.normalization_source in {"anvisa", "fuzzy"}
    assert med.normalized_name == "amoxicilina"
