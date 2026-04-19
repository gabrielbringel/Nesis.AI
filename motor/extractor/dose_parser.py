"""Funções puras para extrair dose, frequência e via a partir de texto livre."""

from __future__ import annotations

import re
import unicodedata
from typing import Optional

_WINDOW = 80

_DOSE_RE = re.compile(
    r"(\d+[\.,]?\d*)\s*(mg|mcg|g|ml|ui|u|kg)\b",
    re.IGNORECASE,
)

_FREQUENCY_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bdose\s+unica\b", re.IGNORECASE), "dose unica"),
    (re.compile(r"\bsos\b|\bs/n\b|\bse\s+necessario\b", re.IGNORECASE), "SOS"),
    (re.compile(r"\b(1x|uma\s+vez)\s*(ao|por|/)\s*sem", re.IGNORECASE), "semana"),
    (re.compile(r"\b(1x|uma\s+vez)\s*(ao|por|/)\s*dia\b", re.IGNORECASE), "dia"),
    (re.compile(r"\b(2x|duas\s+vezes)\s*(ao|por|/)\s*dia\b|\bbid\b", re.IGNORECASE), "12h"),
    (re.compile(r"\b(3x|tres\s+vezes)\s*(ao|por|/)\s*dia\b|\btid\b", re.IGNORECASE), "8h"),
    (re.compile(r"\b(4x|quatro\s+vezes)\s*(ao|por|/)\s*dia\b|\bqid\b", re.IGNORECASE), "6h"),
    (re.compile(r"\ba\s+cada\s+(\d+)\s*h(oras)?\b", re.IGNORECASE), "cada_h"),
    (re.compile(r"\bde\s+(\d+)\s*/\s*\d+\s*h\b", re.IGNORECASE), "cada_h"),
    (re.compile(r"\bde\s+(\d+)\s+em\s+\d+\s*h(oras)?\b", re.IGNORECASE), "cada_h"),
    (re.compile(r"\b(\d+)/(\d+)\s*h\b", re.IGNORECASE), "slash_h"),
    (re.compile(r"\bq\s*(\d+)\s*h\b", re.IGNORECASE), "cada_h"),
]

_ROUTE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(via\s+oral|vo|oral|por\s+boca)\b", re.IGNORECASE), "oral"),
    (re.compile(r"\b(intravenos[ao]|ev|iv|endovenos[ao])\b", re.IGNORECASE), "IV"),
    (re.compile(r"\b(intramuscular|im)\b", re.IGNORECASE), "IM"),
    (re.compile(r"\b(subcut[âa]ne[ao]|sc)\b", re.IGNORECASE), "SC"),
    (re.compile(r"\b(t[óo]pic[ao]|t[óo]pica)\b", re.IGNORECASE), "tópico"),
    (re.compile(r"\b(inalat[óo]ri[ao]|nebuliza|spray)\b", re.IGNORECASE), "inalatório"),
    (re.compile(r"\b(retal|vr)\b", re.IGNORECASE), "retal"),
]


def _strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )


def _window_around(text: str, drug_name: str, window: int = _WINDOW) -> str:
    """Retorna uma janela de texto em torno da primeira ocorrência do fármaco."""
    if not drug_name:
        return text
    lower = text.lower()
    target = drug_name.lower()
    idx = lower.find(target)
    if idx == -1:
        # tenta sem acentos
        lower_na = _strip_accents(lower)
        target_na = _strip_accents(target)
        idx = lower_na.find(target_na)
        if idx == -1:
            return ""
    start = max(0, idx)
    end = min(len(text), idx + len(drug_name) + window)
    return text[start:end]


def extract_dose(text: str, drug_name: str) -> tuple[Optional[float], Optional[str]]:
    """Extrai valor e unidade da dose na janela em torno do fármaco."""
    segment = _window_around(text, drug_name)
    if not segment:
        return None, None
    match = _DOSE_RE.search(segment)
    if not match:
        return None, None
    raw_value = match.group(1).replace(",", ".")
    try:
        value = float(raw_value)
    except ValueError:
        return None, None
    unit = match.group(2).lower()
    # normaliza "u" → "ui"
    if unit == "u":
        unit = "ui"
    return value, unit


def extract_frequency(text: str, drug_name: str) -> Optional[str]:
    """Extrai frequência normalizada na janela em torno do fármaco."""
    segment = _window_around(text, drug_name)
    if not segment:
        return None
    segment_na = _strip_accents(segment)
    for pattern, label in _FREQUENCY_PATTERNS:
        match = pattern.search(segment_na)
        if not match:
            continue
        if label == "cada_h":
            return f"{match.group(1)}h"
        if label == "slash_h":
            # padrão "8/8h" → 8h
            return f"{match.group(1)}h"
        return label
    return None


def extract_route(text: str, drug_name: str) -> Optional[str]:
    """Extrai via de administração normalizada na janela em torno do fármaco."""
    segment = _window_around(text, drug_name)
    if not segment:
        return None
    segment_na = _strip_accents(segment)
    for pattern, label in _ROUTE_PATTERNS:
        if pattern.search(segment_na):
            return label
    return None
