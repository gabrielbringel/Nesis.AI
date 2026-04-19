"""Cliente HTTP para PubChem. Obtém SMILES a partir do nome padronizado do fármaco.

IMPORTANTE: apenas o nome do fármaco isolado é enviado — nunca dados do paciente.
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

_BASE_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
_TIMEOUT_SECONDS = 3.0


class PubChemClient:
    def __init__(self, base_url: str = _BASE_URL, timeout: float = _TIMEOUT_SECONDS) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._cache: dict[str, Optional[str]] = {}

    def search(self, name: str) -> Optional[str]:
        """Retorna o IsomericSMILES do fármaco ou None."""
        if not name or not name.strip():
            return None
        key = name.strip().lower()
        if key in self._cache:
            return self._cache[key]

        try:
            import httpx  # type: ignore
        except ImportError:
            logger.warning("httpx não disponível — PubChem client desabilitado")
            self._cache[key] = None
            return None

        url = f"{self._base_url}/compound/name/{name}/property/IsomericSMILES/JSON"
        try:
            with httpx.Client(timeout=self._timeout) as client:
                resp = client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.debug("PubChem search falhou para %s: %s", name, exc)
            self._cache[key] = None
            return None

        try:
            properties = data.get("PropertyTable", {}).get("Properties", []) or []
            if properties:
                smiles = properties[0].get("IsomericSMILES")
                if isinstance(smiles, str) and smiles.strip():
                    self._cache[key] = smiles.strip()
                    return self._cache[key]
        except (AttributeError, TypeError):
            pass

        self._cache[key] = None
        return None
