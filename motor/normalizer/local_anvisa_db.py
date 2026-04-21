"""Lookup local em mapeamento ANVISA → RxNorm + SMILES.

A base é carregada de `motor/data/anvisa_rxnorm_map.csv` uma única vez por sessão.
Busca primeiro exata (case-insensitive), depois fuzzy com `difflib`.
"""

from __future__ import annotations

import csv
import logging
from difflib import get_close_matches
from pathlib import Path
from typing import Optional

from motor.text_utils import sanitize_drug_name

logger = logging.getLogger(__name__)

_DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "anvisa_rxnorm_map.csv"
_FUZZY_CUTOFF = 0.80


class LocalAnvisaDB:
    def __init__(self, csv_path: Optional[Path] = None) -> None:
        self._csv_path = csv_path or _DEFAULT_PATH
        self._by_comercial: dict[str, dict] = {}
        self._by_principio: dict[str, dict] = {}
        self._load()

    def _load(self) -> None:
        if not self._csv_path.exists():
            logger.warning("Arquivo ANVISA não encontrado: %s", self._csv_path)
            return
        with self._csv_path.open(encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                record = self._row_to_record(row)
                if not record:
                    continue
                comercial = sanitize_drug_name(row.get("nome_comercial", ""))
                principio = sanitize_drug_name(row.get("principio_ativo", ""))
                if comercial:
                    self._by_comercial[comercial] = record
                if principio:
                    # não sobrescreve registros idênticos — primeiro vence
                    self._by_principio.setdefault(principio, record)

    def _row_to_record(self, row: dict) -> Optional[dict]:
        principio = row.get("principio_ativo", "").strip()
        if not principio:
            return None
        rxnorm_raw = row.get("rxnorm_id", "").strip()
        try:
            rxnorm_id = int(rxnorm_raw) if rxnorm_raw else None
        except ValueError:
            rxnorm_id = None
        return {
            "nome_comercial": row.get("nome_comercial", "").strip(),
            "principio_ativo": principio,
            "rxnorm_id": rxnorm_id,
            "smiles": (row.get("smiles", "") or "").strip() or None,
            "atc_code": (row.get("atc_code", "") or "").strip() or None,
            "concentracao": (row.get("concentracao", "") or "").strip() or None,
        }

    def search(self, name: str) -> tuple[Optional[dict], Optional[str]]:
        """Busca por nome. Retorna `(record, match_type)`.

        `match_type` ∈ {"anvisa", "fuzzy", None}.
        """
        if not name or not name.strip():
            return None, None
        key = sanitize_drug_name(name)

        exact = self._by_comercial.get(key) or self._by_principio.get(key)
        if exact:
            return exact, "anvisa"

        candidates = list(self._by_comercial.keys()) + list(self._by_principio.keys())
        matches = get_close_matches(key, candidates, n=1, cutoff=_FUZZY_CUTOFF)
        if matches:
            matched_key = matches[0]
            record = self._by_comercial.get(matched_key) or self._by_principio.get(matched_key)
            if record:
                return record, "fuzzy"
        return None, None

    def all_records(self) -> list[dict]:
        seen_ids: set[int] = set()
        out: list[dict] = []
        for record in list(self._by_principio.values()) + list(self._by_comercial.values()):
            uid = id(record)
            if uid in seen_ids:
                continue
            seen_ids.add(uid)
            out.append(record)
        return out
