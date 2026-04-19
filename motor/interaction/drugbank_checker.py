"""Consulta de interações conhecidas via grafo Neo4j (DrugBank + OpenFDA).

Se o Neo4j não estiver disponível, o checker retorna `{"found": False}`
silenciosamente e o pipeline segue apenas com as fontes disponíveis.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_SEVERITY_TO_SCORE: dict[str, float] = {
    "GRAVE": 0.95,
    "MODERADA": 0.60,
    "LEVE": 0.25,
    "UNKNOWN": 0.10,
}


class DrugBankChecker:
    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
    ) -> None:
        self._uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self._user = user or os.getenv("NEO4J_USER", "neo4j")
        self._password = password or os.getenv("NEO4J_PASSWORD", "")
        self._driver = None
        self._available = self._connect()

    def _connect(self) -> bool:
        try:
            from neo4j import GraphDatabase  # type: ignore

            self._driver = GraphDatabase.driver(
                self._uri, auth=(self._user, self._password)
            )
            # verificação leve de conectividade
            with self._driver.session() as session:
                session.run("RETURN 1").consume()
            return True
        except Exception as exc:  # noqa: BLE001
            logger.warning("Neo4j indisponível — DrugBank checker em modo offline: %s", exc)
            self._driver = None
            return False

    def close(self) -> None:
        if self._driver is not None:
            try:
                self._driver.close()
            except Exception:  # noqa: BLE001
                pass
            self._driver = None

    def check(self, rxnorm_id_1: Optional[int], rxnorm_id_2: Optional[int]) -> dict:
        """Consulta a interação entre dois rxnorm IDs.

        Retorna dict com:
          - `found`: bool
          - `severity`: "GRAVE" | "MODERADA" | "LEVE" | "UNKNOWN"
          - `score`: float (0–1)
          - `mechanism`, `evidence`, `source`: opcionais
        """
        if not self._available or self._driver is None:
            return {"found": False, "severity": "UNKNOWN", "score": 0.0}
        if rxnorm_id_1 is None or rxnorm_id_2 is None:
            return {"found": False, "severity": "UNKNOWN", "score": 0.0}

        query = """
        MATCH (d1:Drug)-[i:INTERACTS_WITH]->(d2:Drug)
        WHERE d1.rxnorm_id = $id1 AND d2.rxnorm_id = $id2
        RETURN i.severity AS severity, i.mechanism AS mechanism,
               i.evidence AS evidence, i.source AS source
        LIMIT 1
        """
        try:
            with self._driver.session() as session:
                record = session.run(
                    query, id1=int(rxnorm_id_1), id2=int(rxnorm_id_2)
                ).single()
                if record is None:
                    record = session.run(
                        query, id1=int(rxnorm_id_2), id2=int(rxnorm_id_1)
                    ).single()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Erro consultando Neo4j: %s", exc)
            return {"found": False, "severity": "UNKNOWN", "score": 0.0}

        if record is None:
            return {"found": False, "severity": "UNKNOWN", "score": 0.0}

        severity = (record.get("severity") or "UNKNOWN").upper()
        return {
            "found": True,
            "severity": severity,
            "score": _SEVERITY_TO_SCORE.get(severity, 0.10),
            "mechanism": record.get("mechanism") or "",
            "evidence": record.get("evidence") or "",
            "source": record.get("source") or "DrugBank/OpenFDA",
        }

    @staticmethod
    def severity_to_score(severity: str) -> float:
        return _SEVERITY_TO_SCORE.get(severity.upper(), 0.10)
