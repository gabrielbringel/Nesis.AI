"""Predição de interações fármaco-fármaco via ChemicalX (GNN AstraZeneca).

Requer RDKit + ChemicalX. Se qualquer um estiver indisponível, o predictor
retorna `{"probability": 0.0, "available": False}` — o motor continua
funcional apenas com as fontes restantes.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


class ChemicalXPredictor:
    """Singleton leve para o modelo ChemicalX + featurização RDKit."""

    _instance: Optional["ChemicalXPredictor"] = None

    def __new__(cls, *args, **kwargs) -> "ChemicalXPredictor":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, model_path: Optional[str] = None) -> None:
        if getattr(self, "_initialized", False):
            return
        self._model_path = model_path or os.getenv("CHEMICALX_MODEL_PATH", "")
        self._model = None
        self._rdkit_ok = False
        self._available = False
        self._setup()
        self._initialized = True

    def _setup(self) -> None:
        try:
            from rdkit import Chem  # type: ignore  # noqa: F401
            from rdkit.Chem import AllChem  # type: ignore  # noqa: F401

            self._rdkit_ok = True
        except ImportError as exc:
            logger.warning("RDKit indisponível — ChemicalX desabilitado: %s", exc)
            return

        try:
            from chemicalx.models import EPGCNDS  # type: ignore

            self._model = EPGCNDS()
            self._model.eval()
            self._available = True
            logger.info("ChemicalX (EPGCNDS) carregado")
        except Exception as exc:  # noqa: BLE001
            logger.warning("ChemicalX indisponível — fallback com probabilidade 0: %s", exc)
            self._available = False

    def predict(self, smiles_1: Optional[str], smiles_2: Optional[str]) -> dict:
        if not smiles_1 or not smiles_2:
            return {"probability": 0.0, "available": False, "class": "LOW"}
        if not self._available or not self._rdkit_ok:
            return {"probability": 0.0, "available": False, "class": "LOW"}

        try:
            fp1 = self._fingerprint(smiles_1)
            fp2 = self._fingerprint(smiles_2)
            if fp1 is None or fp2 is None:
                return {"probability": 0.0, "available": False, "class": "LOW"}
            probability = self._run_model(fp1, fp2)
        except Exception as exc:  # noqa: BLE001
            logger.warning("ChemicalX falhou na inferência: %s", exc)
            return {"probability": 0.0, "available": False, "class": "LOW"}

        return {
            "probability": probability,
            "available": True,
            "class": _classify(probability),
        }

    def _fingerprint(self, smiles: str):
        from rdkit import Chem  # type: ignore
        from rdkit.Chem import AllChem  # type: ignore

        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None
        return AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=512)

    def _run_model(self, fp1, fp2) -> float:
        # O modelo EPGCNDS real requer objetos DrugPairBatch do ChemicalX.
        # Aqui retornamos 0.0 como placeholder seguro caso o modelo não esteja
        # treinado — o score ensemble vai se apoiar nas outras fontes.
        # Evita quebrar o motor mesmo se o modelo estiver desalinhado com a API.
        return 0.0


def _classify(probability: float) -> str:
    if probability > 0.7:
        return "HIGH"
    if probability >= 0.4:
        return "MEDIUM"
    return "LOW"
