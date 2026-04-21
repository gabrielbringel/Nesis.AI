"""Utilitários de processamento de texto."""

from __future__ import annotations

import unicodedata

# Mapeamento comum de leetspeak e caracteres parecidos
_LEET_MAP = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "8": "b",
    "@": "a",
    "$": "s",
}


def strip_accents(text: str) -> str:
    """Remove acentos do texto."""
    if not text:
        return text
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )


def sanitize_drug_name(text: str) -> str:
    """Higieniza o nome do medicamento para normalização e extração.
    
    1. Converte para minúsculas.
    2. Remove acentos.
    3. Substitui números usados como letras (leetspeak).
    4. Remove espaços extras.
    """
    if not text:
        return ""
        
    text = text.lower().strip()
    text = strip_accents(text)
    
    # Substitui caracteres do mapa
    sanitized_chars = []
    for char in text:
        sanitized_chars.append(_LEET_MAP.get(char, char))
        
    return "".join(sanitized_chars)
