"""Orquestrador principal do motor de interações medicamentosas."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from itertools import combinations
from typing import Optional

from motor.extractor import NERExtractor, extract_dose, extract_frequency, extract_route
from motor.interaction import ChemicalXPredictor, ClinicalRulesEngine, DrugBankChecker
from motor.models import Alert, Medication, PipelineResult
from motor.normalizer import DrugNormalizer
from motor.scorer import RiskScorer

logger = logging.getLogger(__name__)

_SEVERITY_RANK = {"LEVE": 1, "MODERADA": 2, "GRAVE": 3}


class MedicationPipeline:
    """Pipeline completo: extração → normalização → sinais → scoring → alertas."""

    def __init__(
        self,
        ner_extractor: Optional[NERExtractor] = None,
        normalizer: Optional[DrugNormalizer] = None,
        drugbank_checker: Optional[DrugBankChecker] = None,
        chemicalx_predictor: Optional[ChemicalXPredictor] = None,
        rules_engine: Optional[ClinicalRulesEngine] = None,
        scorer: Optional[RiskScorer] = None,
        version: Optional[str] = None,
        min_severity: Optional[str] = None,
    ) -> None:
        self.extractor = ner_extractor or NERExtractor()
        self.normalizer = normalizer or DrugNormalizer()
        self.drugbank = drugbank_checker or DrugBankChecker()
        self.chemicalx = chemicalx_predictor or ChemicalXPredictor()
        self.rules = rules_engine or ClinicalRulesEngine()
        self.scorer = scorer or RiskScorer()
        self._version = version or os.getenv("PIPELINE_VERSION", "0.1.0")
        self._min_severity = (min_severity or os.getenv("MIN_SEVERITY_TO_ALERT", "MODERADA")).upper()

    def analyze(self, text: str, context: Optional[dict] = None) -> PipelineResult:
        """Analisa o texto do prontuário e retorna o resultado estruturado."""
        context = context or {}
        start = time.perf_counter()

        if not text or not text.strip():
            return PipelineResult(
                input_text=text or "",
                processing_time_ms=0.0,
                pipeline_version=self._version,
            )

        entities = self.extractor.extract(text)
        medications, unresolved = self._build_medications(text, entities)

        alerts = asyncio.run(self._score_pairs(medications, context))
        alerts = self._filter_alerts(alerts)
        alerts.sort(key=lambda a: a.final_score, reverse=True)

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        return PipelineResult(
            input_text=text,
            medications_found=medications,
            alerts=alerts,
            unresolved_drugs=unresolved,
            processing_time_ms=round(elapsed_ms, 3),
            pipeline_version=self._version,
        )

    # ── Pipeline interno ────────────────────────────────────────────────────
    def _build_medications(
        self, text: str, entities: list[dict]
    ) -> tuple[list[Medication], list[str]]:
        medications: list[Medication] = []
        unresolved: list[str] = []
        seen: set[str] = set()

        for ent in entities:
            raw_name = str(ent.get("word", "")).strip()
            if not raw_name:
                continue
            key = raw_name.lower()
            if key in seen:
                continue
            seen.add(key)

            confidence = float(ent.get("score", 0.5))
            med = self.normalizer.normalize(raw_name, confidence=confidence)
            dose_value, dose_unit = extract_dose(text, raw_name)
            med.dose_value = dose_value
            med.dose_unit = dose_unit
            med.frequency = extract_frequency(text, raw_name)
            med.route = extract_route(text, raw_name)

            if med.normalization_source == "unknown":
                unresolved.append(raw_name)

            medications.append(med)

        return medications, unresolved

    async def _score_pairs(
        self, medications: list[Medication], context: dict
    ) -> list[Alert]:
        alerts: list[Alert] = []
        if len(medications) < 2:
            return alerts

        pair_tasks = []
        for m1, m2 in combinations(medications, 2):
            pair_tasks.append(self._analyze_pair(m1, m2, context))
        results = await asyncio.gather(*pair_tasks)
        for alert in results:
            if alert is not None:
                alerts.append(alert)
        return alerts

    async def _analyze_pair(
        self, m1: Medication, m2: Medication, context: dict
    ) -> Optional[Alert]:
        drugbank_task = asyncio.to_thread(
            self.drugbank.check, m1.rxnorm_id, m2.rxnorm_id
        )
        chemicalx_task = asyncio.to_thread(
            self.chemicalx.predict, m1.smiles, m2.smiles
        )
        rules_task = asyncio.to_thread(self.rules.check, m1, m2, context)

        drugbank_result, chemicalx_result, rule_violations = await asyncio.gather(
            drugbank_task, chemicalx_task, rules_task
        )
        return self.scorer.score(
            m1, m2, drugbank_result, chemicalx_result, rule_violations
        )

    def _filter_alerts(self, alerts: list[Alert]) -> list[Alert]:
        threshold = _SEVERITY_RANK.get(self._min_severity, 2)
        return [a for a in alerts if _SEVERITY_RANK.get(a.severity, 0) >= threshold]
