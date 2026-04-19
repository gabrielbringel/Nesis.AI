"""Cliente HTTP para a RxNorm REST API com cache em memória."""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

_BASE_URL = "https://rxnav.nlm.nih.gov/REST"
_TIMEOUT_SECONDS = 3.0


class RxNormClient:
    """Cliente para RxNorm. Nunca envia dados do paciente — apenas o nome do fármaco."""

    def __init__(self, base_url: str = _BASE_URL, timeout: float = _TIMEOUT_SECONDS) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._cache: dict[str, Optional[dict]] = {}

    def search(self, name: str) -> Optional[dict]:
        """Retorna dict com `rxnorm_id` e `atc_code` (ou None)."""
        if not name or not name.strip():
            return None
        key = name.strip().lower()
        if key in self._cache:
            return self._cache[key]

        try:
            import httpx  # type: ignore
        except ImportError:
            logger.warning("httpx não disponível — RxNorm client desabilitado")
            self._cache[key] = None
            return None

        rxcui = self._fetch_rxcui(httpx, name)
        if rxcui is None:
            self._cache[key] = None
            return None

        atc_code = self._fetch_atc(httpx, rxcui)
        result = {"rxnorm_id": rxcui, "atc_code": atc_code}
        self._cache[key] = result
        return result

    def _fetch_rxcui(self, httpx, name: str) -> Optional[int]:
        url = f"{self._base_url}/drugs.json"
        try:
            with httpx.Client(timeout=self._timeout) as client:
                resp = client.get(url, params={"name": name})
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.debug("RxNorm search falhou para %s: %s", name, exc)
            return None

        try:
            groups = data.get("drugGroup", {}).get("conceptGroup", []) or []
            for group in groups:
                for concept in group.get("conceptProperties", []) or []:
                    rxcui = concept.get("rxcui")
                    if rxcui and str(rxcui).isdigit():
                        return int(rxcui)
        except (AttributeError, TypeError):
            return None
        return None

    def _fetch_atc(self, httpx, rxcui: int) -> Optional[str]:
        url = f"{self._base_url}/rxcui/{rxcui}/property.json"
        try:
            with httpx.Client(timeout=self._timeout) as client:
                resp = client.get(url, params={"propName": "ATC"})
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.debug("RxNorm ATC lookup falhou para rxcui=%s: %s", rxcui, exc)
            return None

        try:
            props = data.get("propConceptGroup", {}).get("propConcept", []) or []
            for prop in props:
                if prop.get("propName", "").upper() == "ATC":
                    return str(prop.get("propValue"))
        except (AttributeError, TypeError):
            return None
        return None
