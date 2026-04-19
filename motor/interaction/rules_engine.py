"""Motor de regras clínicas hardcoded baseado em evidência.

Cada regra verifica um par de medicamentos (ou uma única medicação + contexto
do paciente) e retorna uma `RuleViolation` quando ativada.

As regras aqui implementadas cobrem cenários que ML não resolve bem:
dose máxima, duplicidade de classe, ajuste renal, contraindicação gestacional,
via de administração inadequada e combinações terapêuticas de alto risco.
"""

from __future__ import annotations

from typing import Optional

from motor.models.alert import RuleViolation
from motor.models.medication import Medication


_ANTICOAGULANTS = {"warfarina", "varfarina", "heparina", "enoxaparina", "rivaroxabana",
                   "apixabana", "dabigatrana", "edoxabana"}
_ANTIAGGREGANTS = {"aspirina", "aas", "acido acetilsalicilico", "ácido acetilsalicílico",
                   "clopidogrel", "ticagrelor", "prasugrel", "ticlopidina"}

_OPIOIDS = {"morfina", "codeina", "codeína", "tramadol", "oxicodona", "fentanil",
            "metadona", "hidromorfona", "meperidina", "petidina"}

_MAOIS = {"selegilina", "tranilcipromina", "fenelzina", "moclobemida", "iproniazida",
          "isocarboxazida"}
_SEROTONERGIC_ANTIDEPRESSANTS = {
    "fluoxetina", "sertralina", "paroxetina", "citalopram", "escitalopram",
    "venlafaxina", "duloxetina", "amitriptilina", "clomipramina", "imipramina",
    "nortriptilina", "trazodona",
}

_NSAIDS = {"ibuprofeno", "naproxeno", "diclofenaco", "cetoprofeno", "nimesulida",
           "piroxicam", "meloxicam", "celecoxibe", "etoricoxibe", "indometacina",
           "aspirina", "aas", "acido acetilsalicilico"}

_SYSTEMIC_CORTICOSTEROIDS = {"prednisona", "prednisolona", "dexametasona",
                              "metilprednisolona", "hidrocortisona", "betametasona"}

_IECA = {"enalapril", "captopril", "lisinopril", "ramipril", "perindopril",
         "benazepril", "fosinopril"}
_BRA = {"losartana", "losartan", "valsartana", "olmesartana", "candesartana",
        "irbesartana", "telmisartana"}

_METHOTREXATE = {"metotrexato", "methotrexate"}

# Fármacos que exigem ajuste por função renal
_RENAL_ADJUST = {"metformina", "ciprofloxacino", "ciprofloxacina", "digoxina",
                 "vancomicina", "gentamicina", "amicacina"}

# Doses máximas diárias (em mg, via oral padrão)
_MAX_DAILY_DOSE_MG: dict[str, float] = {
    "paracetamol": 4000.0,
    "ibuprofeno": 2400.0,
    "aspirina": 4000.0,
    "aas": 4000.0,
    "acido acetilsalicilico": 4000.0,
}

# Vias aceitas por fármaco (quando a via é crítica)
_APPROPRIATE_ROUTES: dict[str, set[str]] = {
    # Vancomicina oral só serve para C. difficile local — para infecção sistêmica precisa IV
    "vancomicina": {"IV"},
}


def _name_key(med: Medication) -> str:
    return (med.normalized_name or med.raw_name or "").strip().lower()


def _atc_prefix(med: Medication, digits: int) -> Optional[str]:
    if not med.atc_code:
        return None
    code = med.atc_code.strip().upper()
    if len(code) < digits:
        return None
    return code[:digits]


class ClinicalRulesEngine:
    """Engine determinístico de regras clínicas."""

    def check(
        self,
        med1: Medication,
        med2: Medication,
        context: Optional[dict] = None,
    ) -> list[RuleViolation]:
        """Verifica todas as regras entre med1 e med2.

        `context` pode conter: patient_age, patient_pregnant, patient_renal_function,
        patient_weight. Regras usam isso quando relevante.
        """
        context = context or {}
        violations: list[RuleViolation] = []

        violations.extend(self._rule_single(med1, context))
        # não duplica regras single para o mesmo fármaco; checa med2 só se diferente
        if _name_key(med2) != _name_key(med1):
            violations.extend(self._rule_single(med2, context))

        violations.extend(self._rule_pairwise(med1, med2, context))
        return violations

    def check_single(
        self, med: Medication, context: Optional[dict] = None
    ) -> list[RuleViolation]:
        """Regras que dependem de uma única medicação + contexto."""
        return self._rule_single(med, context or {})

    # ── Regras por par ──────────────────────────────────────────────────────
    def _rule_pairwise(
        self, m1: Medication, m2: Medication, context: dict
    ) -> list[RuleViolation]:
        out: list[RuleViolation] = []
        n1, n2 = _name_key(m1), _name_key(m2)
        pair = {n1, n2}

        # R001 — Anticoagulante + antiagregante
        if (pair & _ANTICOAGULANTS and pair & _ANTIAGGREGANTS
                and not (pair <= _ANTICOAGULANTS or pair <= _ANTIAGGREGANTS)):
            out.append(
                RuleViolation(
                    rule_id="R001",
                    name="Anticoagulante + antiagregante plaquetário",
                    severity_score=0.90,
                    mechanism=(
                        "Associação de anticoagulante com antiagregante plaquetário "
                        "potencializa o risco de sangramento clinicamente significativo "
                        "(gastrointestinal, intracraniano)."
                    ),
                    recommendation=(
                        "Evitar a combinação salvo indicação formal (ex.: SCA + FA "
                        "com critérios restritos). Se mantida, considerar gastroproteção, "
                        "menor tempo possível e monitorização rigorosa."
                    ),
                )
            )

        # R003 — Duplicidade terapêutica (mesma classe ATC de 3 dígitos)
        atc1, atc2 = _atc_prefix(m1, 3), _atc_prefix(m2, 3)
        if atc1 and atc2 and atc1 == atc2 and n1 != n2:
            out.append(
                RuleViolation(
                    rule_id="R003",
                    name="Duplicidade terapêutica (mesma classe ATC)",
                    severity_score=0.55,
                    mechanism=(
                        f"Os dois fármacos pertencem à mesma classe ATC ({atc1}), "
                        "caracterizando duplicidade terapêutica sem benefício adicional "
                        "e com acúmulo de efeitos adversos."
                    ),
                    recommendation=(
                        "Manter apenas um representante da classe e reavaliar a indicação "
                        "clínica do outro."
                    ),
                )
            )

        # R006 — Dois opioides simultâneos
        if n1 in _OPIOIDS and n2 in _OPIOIDS and n1 != n2:
            out.append(
                RuleViolation(
                    rule_id="R006",
                    name="Dois opioides simultâneos",
                    severity_score=0.85,
                    mechanism=(
                        "Somatório de depressão respiratória, sedação e risco de overdose; "
                        "a combinação raramente é justificável fora de cuidados paliativos."
                    ),
                    recommendation=(
                        "Reduzir para um único opioide em dose equianalgésica; se dor "
                        "refratária, considerar adjuvantes não-opioides antes de associar."
                    ),
                )
            )

        # R007 — IMAO + antidepressivo serotoninérgico
        if (pair & _MAOIS and pair & _SEROTONERGIC_ANTIDEPRESSANTS):
            out.append(
                RuleViolation(
                    rule_id="R007",
                    name="IMAO + antidepressivo serotoninérgico",
                    severity_score=0.95,
                    mechanism=(
                        "Risco de síndrome serotoninérgica (hipertermia, rigidez, "
                        "instabilidade autonômica) pela inibição simultânea da recaptação "
                        "e do catabolismo da serotonina."
                    ),
                    recommendation=(
                        "Combinação contraindicada. Respeitar washout de 14 dias após "
                        "IMAO (5 semanas para fluoxetina) antes de iniciar outro agente."
                    ),
                )
            )

        # R008 — Metotrexato + AINEs
        if (pair & _METHOTREXATE and pair & _NSAIDS):
            out.append(
                RuleViolation(
                    rule_id="R008",
                    name="Metotrexato + AINE",
                    severity_score=0.85,
                    mechanism=(
                        "AINEs reduzem a depuração renal do metotrexato, elevando níveis "
                        "séricos e risco de toxicidade (mielossupressão, hepatotoxicidade, "
                        "nefrotoxicidade)."
                    ),
                    recommendation=(
                        "Evitar AINEs em pacientes em uso de metotrexato em dose alta. "
                        "Em doses baixas reumatológicas, monitorar hemograma, função renal "
                        "e hepática se a associação for inevitável."
                    ),
                )
            )

        # R010 — Corticoide sistêmico + AINE
        if (pair & _SYSTEMIC_CORTICOSTEROIDS and pair & _NSAIDS):
            out.append(
                RuleViolation(
                    rule_id="R010",
                    name="Corticosteroide sistêmico + AINE",
                    severity_score=0.55,
                    mechanism=(
                        "Sinergia na injúria da mucosa gastroduodenal, elevando o risco "
                        "de úlcera péptica e sangramento digestivo alto."
                    ),
                    recommendation=(
                        "Evitar a combinação; se inevitável, associar inibidor de bomba "
                        "de prótons pelo menor tempo possível."
                    ),
                )
            )

        return out

    # ── Regras por medicação isolada ───────────────────────────────────────
    def _rule_single(self, med: Medication, context: dict) -> list[RuleViolation]:
        out: list[RuleViolation] = []
        name = _name_key(med)
        if not name:
            return out

        # R002 — Dose acima do máximo diário
        max_mg = _MAX_DAILY_DOSE_MG.get(name)
        if max_mg is not None and med.dose_value is not None:
            dose_mg = _to_mg(med.dose_value, med.dose_unit)
            daily_mg = dose_mg * _doses_per_day(med.frequency) if dose_mg is not None else None
            # para paracetamol 5000 (dose única reportada), a comparação direta já dispara
            if dose_mg is not None and (dose_mg > max_mg
                                        or (daily_mg is not None and daily_mg > max_mg)):
                out.append(
                    RuleViolation(
                        rule_id="R002",
                        name="Dose acima do máximo diário",
                        severity_score=0.90,
                        mechanism=(
                            f"A dose prescrita ({med.dose_value} {med.dose_unit}) excede "
                            f"o limite diário seguro de {max_mg:g} mg para {name}, "
                            "aumentando o risco de toxicidade (hepatotoxicidade, "
                            "injúria renal, sangramento gastrointestinal)."
                        ),
                        recommendation=(
                            "Rever a prescrição e ajustar para dose dentro do limite "
                            "terapêutico recomendado pelas bulas e diretrizes."
                        ),
                    )
                )

        # R004 — Fármaco com necessidade de ajuste renal sem TFG
        if name in _RENAL_ADJUST and context.get("patient_renal_function") is None:
            out.append(
                RuleViolation(
                    rule_id="R004",
                    name="Ajuste renal necessário sem informação de TFG",
                    severity_score=0.85,
                    mechanism=(
                        f"{name.capitalize()} exige ajuste de dose conforme função renal. "
                        "Sem TFG estimada, há risco de acúmulo e toxicidade ou de "
                        "subdosagem terapêutica."
                    ),
                    recommendation=(
                        "Solicitar creatinina sérica e estimar TFG (CKD-EPI) antes de "
                        "prescrever ou ajustar a dose."
                    ),
                )
            )

        # R005 — IECA ou BRA em gestante
        if context.get("patient_pregnant") and (name in _IECA or name in _BRA):
            out.append(
                RuleViolation(
                    rule_id="R005",
                    name="IECA/BRA em gestante",
                    severity_score=0.95,
                    mechanism=(
                        "IECAs e BRAs atravessam a placenta e causam oligoâmnio, "
                        "insuficiência renal fetal e malformações, especialmente no "
                        "segundo e terceiro trimestres."
                    ),
                    recommendation=(
                        "Contraindicado na gestação. Substituir por metildopa, "
                        "nifedipino de liberação prolongada ou hidralazina."
                    ),
                )
            )

        # R009 — Via inadequada
        allowed = _APPROPRIATE_ROUTES.get(name)
        if allowed and med.route and med.route not in allowed:
            out.append(
                RuleViolation(
                    rule_id="R009",
                    name="Via de administração inadequada",
                    severity_score=0.55,
                    mechanism=(
                        f"{name.capitalize()} por via {med.route} não atinge níveis "
                        "sistêmicos adequados para tratamento de infecção sistêmica."
                    ),
                    recommendation=(
                        f"Utilizar via {', '.join(sorted(allowed))} conforme indicação "
                        "clínica."
                    ),
                )
            )

        return out


def _to_mg(value: float, unit: Optional[str]) -> Optional[float]:
    if unit is None:
        return value  # assume já está em mg
    unit = unit.lower()
    if unit == "mg":
        return value
    if unit == "g":
        return value * 1000.0
    if unit == "mcg":
        return value / 1000.0
    return None


def _doses_per_day(frequency: Optional[str]) -> float:
    if frequency is None:
        return 1.0
    freq = frequency.strip().lower()
    if freq in {"dia", "1x", "dose unica", "dose única", "sos"}:
        return 1.0
    if freq.endswith("h"):
        try:
            hours = float(freq[:-1])
            if hours > 0:
                return 24.0 / hours
        except ValueError:
            return 1.0
    if freq == "semana":
        return 1.0 / 7.0
    return 1.0
