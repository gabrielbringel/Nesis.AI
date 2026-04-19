"""Mock do motor de IA com contrato idêntico ao `PipelineResult` real.

Retorna cenários determinísticos baseados no conteúdo do texto, para que o
frontend possa ser desenvolvido contra payloads realistas antes da integração
final com `motor/`.
"""

from __future__ import annotations

import re
import time
from typing import Any

_VERSION = "mock-0.1.0"

_KNOWN_DRUGS = (
    ("warfarina", "Warfarina"),
    ("aspirina", "Aspirina"),
    ("aas", "AAS"),
    ("paracetamol", "Paracetamol"),
    ("ibuprofeno", "Ibuprofeno"),
    ("atenolol", "Atenolol"),
    ("metoprolol", "Metoprolol"),
    ("propranolol", "Propranolol"),
    ("dipirona", "Dipirona"),
    ("amoxicilina", "Amoxicilina"),
    ("omeprazol", "Omeprazol"),
    ("losartana", "Losartana"),
    ("enalapril", "Enalapril"),
    ("metformina", "Metformina"),
)

_BETA_BLOCKERS = {"atenolol", "metoprolol", "propranolol"}


def _extract_drugs(text: str) -> list[str]:
    lowered = text.lower()
    found: list[str] = []
    seen: set[str] = set()
    for key, display in _KNOWN_DRUGS:
        if key in lowered and key not in seen:
            seen.add(key)
            found.append(display)
    return found


def _paracetamol_overdose(text: str) -> bool:
    lowered = text.lower()
    if "paracetamol" not in lowered:
        return False
    # captura números próximos de "paracetamol" com unidade g/mg
    window = lowered.split("paracetamol", 1)[1][:120]
    matches = re.findall(r"(\d+[.,]?\d*)\s*(mg|g)\b", window)
    for value, unit in matches:
        try:
            qty = float(value.replace(",", "."))
        except ValueError:
            continue
        mg = qty * 1000 if unit == "g" else qty
        if mg > 4000:
            return True
    return False


def _alert_warfarin_aspirin() -> dict[str, Any]:
    return {
        "drug_pair": ["Warfarina", "Aspirina"],
        "severity": "GRAVE",
        "final_score": 0.879,
        "component_scores": {"drugbank": 0.95, "chemicalx": 0.78, "rules": 0.90},
        "mechanism": "Potencialização do efeito anticoagulante com risco de sangramento",
        "recommendation": (
            "Evitar associação. Se essencial, monitorar INR a cada 3 dias e "
            "avaliar sinais de sangramento."
        ),
        "evidence": [
            {
                "source": "DrugBank",
                "text": "Interação grave documentada",
                "reference": "FDA Drug Interaction Database",
            },
            {
                "source": "Regra Clínica R001",
                "text": "Anticoagulante + antiagregante plaquetário",
                "reference": "Protocolo GRAVE",
            },
        ],
        "rule_ids": ["R001"],
    }


def _alert_paracetamol_overdose() -> dict[str, Any]:
    return {
        "drug_pair": ["Paracetamol", "Dose diária"],
        "severity": "GRAVE",
        "final_score": 0.82,
        "component_scores": {"drugbank": 0.0, "chemicalx": 0.0, "rules": 0.95},
        "mechanism": (
            "Dose diária de paracetamol acima de 4g está associada a "
            "hepatotoxicidade grave, especialmente em pacientes com uso "
            "concomitante de álcool ou desnutrição."
        ),
        "recommendation": (
            "Reduzir para dose máxima de 4g/dia. Considerar analgésico alternativo "
            "se dor refratária."
        ),
        "evidence": [
            {
                "source": "Regra Clínica R002",
                "text": "Dose acima do máximo diário seguro",
                "reference": "Bula Paracetamol / ANVISA",
            }
        ],
        "rule_ids": ["R002"],
    }


def _alert_duplicate_class(drug_a: str, drug_b: str) -> dict[str, Any]:
    return {
        "drug_pair": [drug_a, drug_b],
        "severity": "MODERADA",
        "final_score": 0.55,
        "component_scores": {"drugbank": 0.0, "chemicalx": 0.0, "rules": 0.55},
        "mechanism": (
            "Ambos os fármacos pertencem à mesma classe ATC, caracterizando "
            "duplicidade terapêutica com somatório de efeitos adversos sem "
            "benefício adicional."
        ),
        "recommendation": "Manter apenas um representante da classe e reavaliar a indicação.",
        "evidence": [
            {
                "source": "Regra Clínica R003",
                "text": "Duplicidade terapêutica (mesma classe ATC)",
                "reference": "Protocolo MODERADA",
            }
        ],
        "rule_ids": ["R003"],
    }


def _alert_generic(drug_a: str, drug_b: str) -> dict[str, Any]:
    return {
        "drug_pair": [drug_a, drug_b],
        "severity": "MODERADA",
        "final_score": 0.48,
        "component_scores": {"drugbank": 0.50, "chemicalx": 0.40, "rules": 0.0},
        "mechanism": (
            "Interação farmacocinética moderada identificada em bases externas. "
            "Monitoramento clínico recomendado."
        ),
        "recommendation": "Avaliar sinais de efeitos adversos e considerar ajuste de dose.",
        "evidence": [
            {
                "source": "DrugBank",
                "text": "Interação moderada documentada",
                "reference": "DrugBank DDI database",
            }
        ],
        "rule_ids": [],
    }


def analyze(text: str) -> dict[str, Any]:
    """Simula `motor.pipeline.MedicationPipeline.analyze(text)`.

    Retorna um dicionário com contrato idêntico ao `PipelineResult` real.
    """
    start = time.perf_counter()
    text = text or ""

    drugs = _extract_drugs(text)
    alerts: list[dict[str, Any]] = []

    lowered = text.lower()

    if "warfarina" in lowered and ("aspirina" in lowered or "aas" in lowered):
        alerts.append(_alert_warfarin_aspirin())
    elif _paracetamol_overdose(text):
        alerts.append(_alert_paracetamol_overdose())
    elif len(drugs) >= 2:
        present_beta = [d for d in drugs if d.lower() in _BETA_BLOCKERS]
        if len(present_beta) >= 2:
            alerts.append(_alert_duplicate_class(present_beta[0], present_beta[1]))
        else:
            alerts.append(_alert_generic(drugs[0], drugs[1]))

    elapsed_ms = (time.perf_counter() - start) * 1000.0
    return {
        "medications_found": drugs,
        "alerts": alerts,
        "unresolved_drugs": [],
        "processing_time_ms": round(elapsed_ms, 3),
        "pipeline_version": _VERSION,
    }
