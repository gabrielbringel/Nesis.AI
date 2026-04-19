"""Extração de entidades de medicamento via BioBERTpt com fallback em regex."""

from __future__ import annotations

import logging
import os
import re
import unicodedata
from typing import Optional

logger = logging.getLogger(__name__)

_MEDICATION_ENTITY_GROUPS = {"MEDICAMENTO", "DROGUE", "FÁRMACO", "FARMACO", "SUBSTANCIA", "SUBSTÂNCIA"}

# Lista de 50 medicamentos mais comuns do SUS — usada no fallback regex
FALLBACK_DRUG_LIST: tuple[str, ...] = (
    "amoxicilina", "amoxil", "dipirona", "paracetamol", "ibuprofeno", "acido acetilsalicilico",
    "aas", "aspirina", "losartana", "losartan", "enalapril", "captopril", "hidroclorotiazida",
    "furosemida", "anlodipino", "amlodipina", "nifedipino", "atenolol", "propranolol",
    "metoprolol", "carvedilol", "sinvastatina", "atorvastatina", "metformina", "glibenclamida",
    "insulina", "omeprazol", "pantoprazol", "ranitidina", "fluoxetina", "sertralina",
    "amitriptilina", "diazepam", "clonazepam", "levotiroxina", "warfarina", "varfarina",
    "clopidogrel", "heparina", "enoxaparina", "digoxina", "ciprofloxacino", "ciprofloxacina",
    "azitromicina", "cefalexina", "metronidazol", "nimesulida", "diclofenaco", "cetoprofeno",
    "prednisona", "dexametasona", "hidrocortisona", "salbutamol", "budesonida", "fluticasona",
    "tramadol", "codeina", "morfina", "fentanil", "metotrexato", "alopurinol",
    "espironolactona", "vancomicina", "cefazolina", "penicilina",
)


def _strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )


class NERExtractor:
    """Extrator de entidades de medicamento.

    Carrega o modelo BioBERTpt uma única vez. Se `transformers` não estiver
    disponível ou o modelo falhar ao carregar, usa fallback baseado em regex
    com lista fixa de medicamentos comuns do SUS.
    """

    _instance: Optional["NERExtractor"] = None

    def __new__(cls, *args, **kwargs) -> "NERExtractor":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, model_name: Optional[str] = None, device: Optional[int] = None) -> None:
        if getattr(self, "_initialized", False):
            return
        self._model_name = model_name or os.getenv("BIOBERTPT_MODEL", "pucpr/biobertpt-all")
        self._pipeline = None
        self._fallback_mode = False
        self._device = device if device is not None else (0 if _gpu_requested() else -1)
        self._load_model()
        self._fallback_regex = re.compile(
            r"\b(" + "|".join(sorted(FALLBACK_DRUG_LIST, key=len, reverse=True)) + r")\b",
            re.IGNORECASE,
        )
        self._initialized = True

    def _load_model(self) -> None:
        try:
            from transformers import pipeline  # type: ignore

            self._pipeline = pipeline(
                "ner",
                model=self._model_name,
                aggregation_strategy="simple",
                device=self._device,
            )
            logger.info("BioBERTpt carregado (%s)", self._model_name)
        except Exception as exc:  # noqa: BLE001 — qualquer falha ativa fallback
            logger.warning("BioBERTpt indisponível — usando fallback regex: %s", exc)
            self._fallback_mode = True

    def extract(self, text: str) -> list[dict]:
        """Extrai candidatos a medicamento do texto.

        Retorna lista de dicts com chaves: `word`, `score`, `start`, `end`.
        """
        if not text or not text.strip():
            return []
        if self._fallback_mode or self._pipeline is None:
            return self._extract_fallback(text)
        return self._extract_model(text)

    def _extract_model(self, text: str) -> list[dict]:
        try:
            entities = self._pipeline(text)  # type: ignore[operator]
        except Exception as exc:  # noqa: BLE001
            logger.warning("Falha no NER — usando fallback: %s", exc)
            return self._extract_fallback(text)

        results: list[dict] = []
        for ent in entities:
            group = str(ent.get("entity_group", "")).upper()
            group_na = _strip_accents(group)
            if group and group_na not in {_strip_accents(g) for g in _MEDICATION_ENTITY_GROUPS}:
                continue
            word = str(ent.get("word", "")).strip()
            if not word:
                continue
            results.append(
                {
                    "word": word,
                    "score": float(ent.get("score", 0.0)),
                    "start": int(ent.get("start", 0)),
                    "end": int(ent.get("end", 0)),
                }
            )
        if not results:
            # modelo rodou mas não reconheceu nada útil — tenta fallback
            return self._extract_fallback(text)
        return results

    def _extract_fallback(self, text: str) -> list[dict]:
        text_na = _strip_accents(text)
        results: list[dict] = []
        seen: set[str] = set()
        for match in self._fallback_regex.finditer(text_na):
            key = match.group(0).lower()
            if key in seen:
                continue
            seen.add(key)
            results.append(
                {
                    "word": text[match.start() : match.end()],
                    "score": 0.75,  # confiança heurística do fallback
                    "start": match.start(),
                    "end": match.end(),
                }
            )
        return results


def _gpu_requested() -> bool:
    flag = os.getenv("USE_GPU", "false").strip().lower()
    return flag in {"1", "true", "yes"}
