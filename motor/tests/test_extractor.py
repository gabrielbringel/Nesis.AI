"""Testes do módulo extractor."""

from __future__ import annotations

from motor.extractor import NERExtractor, extract_dose, extract_frequency, extract_route


def test_dose_parser_extracts_mg():
    text = "Paciente em uso de Warfarina 5mg ao dia"
    value, unit = extract_dose(text, "Warfarina")
    assert value == 5.0
    assert unit == "mg"


def test_dose_parser_handles_decimal_grams():
    text = "Amoxicilina 0.5g de 8 em 8 horas"
    value, unit = extract_dose(text, "Amoxicilina")
    assert value == 0.5
    assert unit == "g"


def test_frequency_parser_normalizes():
    text = "AAS 100mg 1x ao dia"
    freq = extract_frequency(text, "AAS")
    assert freq == "dia"


def test_frequency_parser_tid_maps_to_8h():
    text = "Dipirona 500mg TID"
    assert extract_frequency(text, "Dipirona") == "8h"


def test_frequency_parser_every_hours_pattern():
    text = "Amoxicilina 500mg a cada 8 horas"
    assert extract_frequency(text, "Amoxicilina") == "8h"


def test_frequency_parser_slash_pattern():
    text = "Paracetamol 500mg 6/6h"
    assert extract_frequency(text, "Paracetamol") == "6h"


def test_route_parser_oral():
    text = "Amoxicilina 500mg VO de 8/8h"
    assert extract_route(text, "Amoxicilina") == "oral"


def test_route_parser_iv():
    text = "Vancomicina 1g IV de 12/12h"
    assert extract_route(text, "Vancomicina") == "IV"


def test_ner_extractor_finds_common_drug():
    extractor = NERExtractor()
    entities = extractor.extract("Paciente em uso de Warfarina 5mg ao dia")
    assert entities, "deveria extrair pelo menos uma entidade"
    words = [e["word"].lower() for e in entities]
    assert any("warfarina" in w for w in words)


def test_ner_extractor_returns_empty_on_no_drug():
    extractor = NERExtractor()
    assert extractor.extract("Paciente hígido, sem queixas.") == []


def test_ner_extractor_returns_empty_on_empty_text():
    extractor = NERExtractor()
    assert extractor.extract("") == []
    assert extractor.extract("   ") == []
