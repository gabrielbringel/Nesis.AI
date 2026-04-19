"""Orquestrador de normalização: RxNorm → ANVISA local → PubChem (SMILES)."""

from __future__ import annotations

import logging
from typing import Optional

from motor.models.medication import Medication
from motor.normalizer.local_anvisa_db import LocalAnvisaDB
from motor.normalizer.pubchem_client import PubChemClient
from motor.normalizer.rxnorm_client import RxNormClient

logger = logging.getLogger(__name__)


class DrugNormalizer:
    """Tenta normalizar o nome de um fármaco para identificadores padronizados.

    Ordem de resolução:
      1. RxNorm (se online)
      2. ANVISA local (exato → fuzzy)
      3. PubChem (apenas para preencher SMILES de um rxnorm_id já conhecido)
      4. Fallback: normalization_source="unknown" e registra em unresolved_drugs
    """

    def __init__(
        self,
        rxnorm_client: Optional[RxNormClient] = None,
        anvisa_db: Optional[LocalAnvisaDB] = None,
        pubchem_client: Optional[PubChemClient] = None,
    ) -> None:
        self._rxnorm = rxnorm_client or RxNormClient()
        self._anvisa = anvisa_db or LocalAnvisaDB()
        self._pubchem = pubchem_client or PubChemClient()

    def normalize(self, raw_name: str, confidence: float = 1.0) -> Medication:
        med = Medication(raw_name=raw_name, confidence=confidence)
        if not raw_name or not raw_name.strip():
            return med

        # 1) RxNorm
        rxnorm_result = self._rxnorm.search(raw_name)
        if rxnorm_result and rxnorm_result.get("rxnorm_id"):
            med.rxnorm_id = int(rxnorm_result["rxnorm_id"])
            med.atc_code = rxnorm_result.get("atc_code")
            med.normalization_source = "rxnorm"
            # tenta enriquecer com ANVISA para obter nome padronizado e SMILES
            anvisa_record, _ = self._anvisa.search(raw_name)
            if anvisa_record:
                med.normalized_name = anvisa_record.get("principio_ativo") or med.normalized_name
                med.smiles = med.smiles or anvisa_record.get("smiles")
                med.atc_code = med.atc_code or anvisa_record.get("atc_code")
            if not med.normalized_name:
                med.normalized_name = raw_name.strip().lower()
            if not med.smiles:
                med.smiles = self._pubchem.search(med.normalized_name or raw_name)
            return med

        # 2) ANVISA local
        anvisa_record, match_type = self._anvisa.search(raw_name)
        if anvisa_record:
            med.normalized_name = anvisa_record.get("principio_ativo")
            med.rxnorm_id = anvisa_record.get("rxnorm_id")
            med.smiles = anvisa_record.get("smiles")
            med.atc_code = anvisa_record.get("atc_code")
            med.normalization_source = "anvisa" if match_type == "anvisa" else "fuzzy"
            if not med.smiles and med.normalized_name:
                med.smiles = self._pubchem.search(med.normalized_name)
            return med

        # 3) Nada resolveu
        med.normalization_source = "unknown"
        return med
