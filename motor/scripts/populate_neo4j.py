"""Importa interações DrugBank + OpenFDA para o Neo4j.

Uso:
    python -m motor.scripts.populate_neo4j --drugbank path/to/drugbank.xml \\
        --openfda path/to/openfda.json

O script espera um XML do DrugBank no formato oficial e um JSON do OpenFDA
com interações medicamentosas. Em produção, este script é executado uma vez
por release (ou via job agendado) para manter o grafo atualizado.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Iterable, Optional

logger = logging.getLogger("populate_neo4j")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _connect():
    try:
        from neo4j import GraphDatabase  # type: ignore
    except ImportError as exc:
        raise SystemExit("neo4j driver não instalado. Rode: pip install neo4j") from exc

    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "")
    return GraphDatabase.driver(uri, auth=(user, password))


def _ensure_constraints(driver) -> None:
    with driver.session() as session:
        session.run(
            "CREATE CONSTRAINT drug_rxnorm IF NOT EXISTS "
            "FOR (d:Drug) REQUIRE d.rxnorm_id IS UNIQUE"
        )


def _upsert_interaction(
    driver,
    rxnorm_1: int,
    rxnorm_2: int,
    severity: str,
    mechanism: str,
    evidence: str,
    source: str,
) -> None:
    query = """
    MERGE (d1:Drug {rxnorm_id: $id1})
    MERGE (d2:Drug {rxnorm_id: $id2})
    MERGE (d1)-[i:INTERACTS_WITH]->(d2)
    SET i.severity = $severity,
        i.mechanism = $mechanism,
        i.evidence = $evidence,
        i.source = $source
    """
    with driver.session() as session:
        session.run(
            query,
            id1=int(rxnorm_1),
            id2=int(rxnorm_2),
            severity=severity,
            mechanism=mechanism,
            evidence=evidence,
            source=source,
        )


def _iter_drugbank(xml_path: Path) -> Iterable[dict]:
    """Itera interações do DrugBank.

    O parser assume o namespace oficial do DrugBank. Ajuste conforme a versão
    do dump utilizado.
    """
    ns = {"db": "http://www.drugbank.ca"}
    tree = ET.parse(xml_path)
    root = tree.getroot()
    for drug in root.findall("db:drug", ns):
        rxnorm = _extract_rxnorm(drug, ns)
        if rxnorm is None:
            continue
        interactions = drug.find("db:drug-interactions", ns)
        if interactions is None:
            continue
        for inter in interactions.findall("db:drug-interaction", ns):
            partner_name = _text(inter.find("db:name", ns))
            description = _text(inter.find("db:description", ns))
            partner_rxnorm = _rxnorm_from_partner(partner_name)
            if partner_rxnorm is None:
                continue
            severity = _classify_severity(description or "")
            yield {
                "rxnorm_1": rxnorm,
                "rxnorm_2": partner_rxnorm,
                "severity": severity,
                "mechanism": description or "",
                "evidence": description or "",
                "source": "DrugBank",
            }


def _extract_rxnorm(drug_elem, ns) -> Optional[int]:
    ids = drug_elem.find("db:external-identifiers", ns)
    if ids is None:
        return None
    for ext in ids.findall("db:external-identifier", ns):
        resource = _text(ext.find("db:resource", ns))
        if resource and resource.lower() == "rxcui":
            value = _text(ext.find("db:identifier", ns))
            if value and value.isdigit():
                return int(value)
    return None


def _rxnorm_from_partner(name: Optional[str]) -> Optional[int]:
    # Em produção: resolver via RxNorm API ou tabela local.
    # Aqui é deixado como stub — retorne None para pular pares não resolvidos.
    return None


def _classify_severity(description: str) -> str:
    desc = description.lower()
    if any(t in desc for t in ("major", "severe", "grave", "contraindicated")):
        return "GRAVE"
    if any(t in desc for t in ("moderate", "moderada")):
        return "MODERADA"
    if any(t in desc for t in ("minor", "leve")):
        return "LEVE"
    return "UNKNOWN"


def _iter_openfda(json_path: Path) -> Iterable[dict]:
    with json_path.open(encoding="utf-8") as fh:
        data = json.load(fh)
    for row in data.get("results", []):
        rx1 = row.get("rxnorm_id_1")
        rx2 = row.get("rxnorm_id_2")
        if rx1 is None or rx2 is None:
            continue
        yield {
            "rxnorm_1": int(rx1),
            "rxnorm_2": int(rx2),
            "severity": str(row.get("severity", "UNKNOWN")).upper(),
            "mechanism": row.get("mechanism", ""),
            "evidence": row.get("evidence", ""),
            "source": "OpenFDA",
        }


def _text(elem) -> Optional[str]:
    if elem is None:
        return None
    return (elem.text or "").strip() or None


def main() -> int:
    parser = argparse.ArgumentParser(description="Popula Neo4j com interações DDI.")
    parser.add_argument("--drugbank", type=Path, help="Caminho para drugbank.xml")
    parser.add_argument("--openfda", type=Path, help="Caminho para openfda.json")
    args = parser.parse_args()

    if not args.drugbank and not args.openfda:
        parser.error("forneça ao menos --drugbank ou --openfda")

    driver = _connect()
    try:
        _ensure_constraints(driver)
        count = 0
        if args.drugbank:
            for inter in _iter_drugbank(args.drugbank):
                _upsert_interaction(driver, **inter)
                count += 1
                if count % 500 == 0:
                    logger.info("importadas %d interações…", count)
        if args.openfda:
            for inter in _iter_openfda(args.openfda):
                _upsert_interaction(driver, **inter)
                count += 1
        logger.info("concluído: %d interações persistidas", count)
    finally:
        driver.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
