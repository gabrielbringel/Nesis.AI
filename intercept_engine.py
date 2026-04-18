"""
INTERCEPT CDSS — Motor de Decisão Clínica v2.2 (BioBERTpt Focus)
=================================================================
Camadas:
  1. PharmacologicalMapper    → fármaco → classe ATC via JSON + fuzzy match
  2. ClinicalContextExtractor → extrai condições clínicas do texto livre
  3. RulesEngine              → 30 regras determinísticas (ANVISA/SBC/FDA)
  4. RecommendationEngine     → alternativas terapêuticas contextualizadas
  5. InterceptCDSS            → orquestrador principal
"""

import json
import re
from difflib import get_close_matches
from pathlib import Path

_BASE = Path(__file__).parent
RULES_PATH = _BASE / "intercept_rules.json"
DRUGS_PATH = _BASE / "intercept_drugs.json"


# ─── 1. PHARMACOLOGICAL MAPPER ────────────────────────────────────────────────
class PharmacologicalMapper:
    """Mapeia nome de fármaco → classe ATC com fuzzy match para typos."""

    def __init__(self, drugs_path: Path = DRUGS_PATH):
        with open(drugs_path, encoding="utf-8") as f:
            data = json.load(f)
        self._drug_map: dict = data["medicamentos"]
        self._all_names = list(self._drug_map.keys())

    def get_class(self, nome: str) -> str | None:
        key = nome.strip().lower()
        if key in self._drug_map:
            return self._drug_map[key]["classe"]
        matches = get_close_matches(key, self._all_names, n=1, cutoff=0.82)
        return self._drug_map[matches[0]]["classe"] if matches else None

    def normalize(self, nome: str) -> str:
        key = nome.strip().lower()
        if key in self._drug_map:
            return key
        matches = get_close_matches(key, self._all_names, n=1, cutoff=0.82)
        return matches[0] if matches else key

    def get_apresentacao(self, nome: str) -> str:
        key = self.normalize(nome)
        return self._drug_map.get(key, {}).get("apresentacao", "")


# ─── 2. CLINICAL CONTEXT EXTRACTOR ───────────────────────────────────────────
class ClinicalContextExtractor:
    """Extrai condições clínicas do texto por keyword matching."""

    def __init__(self, drugs_path: Path = DRUGS_PATH):
        with open(drugs_path, encoding="utf-8") as f:
            data = json.load(f)
        self._cond_map: dict = data["condicoes_clinicas"]
        self._sorted_keys = sorted(self._cond_map.keys(), key=len, reverse=True)

    def extract_conditions(self, texto: str) -> list[str]:
        texto_lower = texto.lower()
        found: set[str] = set()
        for kw in self._sorted_keys:
            if kw in texto_lower:
                found.add(self._cond_map[kw])
        return list(found)

    def extract_drugs_from_text(self, texto: str, mapper: PharmacologicalMapper) -> list[dict]:
        """Fallback: extrai candidatos a fármacos por regex + dicionário."""
        candidatos = re.findall(r'\b[a-záàâãéèêíïóôõöúüçñ]{4,}\b', texto.lower())
        medicamentos: list[dict] = []
        vistos: set[str] = set()
        for cand in candidatos:
            classe = mapper.get_class(cand)
            if classe and cand not in vistos:
                vistos.add(cand)
                medicamentos.append({
                    "farmaco": mapper.normalize(cand),
                    "classe": classe,
                    "fonte_extracao": "dicionario"
                })
        return medicamentos


# ─── 3. RULES ENGINE ──────────────────────────────────────────────────────────
class RulesEngine:
    """Motor determinístico: 30 regras baseadas em ANVISA/SBC/SBD/FDA."""

    _SEVERITY_ORDER = {"CRITICA": 4, "ALTA": 3, "MODERADA_A_ALTA": 2, "MODERADA": 1}

    def __init__(self, rules_path: Path = RULES_PATH):
        with open(rules_path, encoding="utf-8") as f:
            self._rules: list[dict] = json.load(f)

    def check(self, medicamentos: list[dict], condicoes: list[str]) -> list[dict]:
        alertas: list[dict] = []
        classes_presentes = {m["classe"] for m in medicamentos}

        for regra in self._rules:
            a, b = regra["item_A"], regra["item_B"]

            if regra["tipo_regra"] == "INTERACAO":
                if a in classes_presentes and b in classes_presentes:
                    fa = [m["farmaco"] for m in medicamentos if m["classe"] == a]
                    fb = [m["farmaco"] for m in medicamentos if m["classe"] == b]
                    alertas.append(self._build_alert(regra, fa, fb))

            elif regra["tipo_regra"] == "CONTRAINDICACAO":
                if a in condicoes and b in classes_presentes:
                    fb = [m["farmaco"] for m in medicamentos if m["classe"] == b]
                    alertas.append(self._build_alert(regra, [a], fb, contraindicacao=True))

        alertas.sort(key=lambda x: self._SEVERITY_ORDER.get(x["gravidade"], 0), reverse=True)
        return alertas

    @staticmethod
    def _build_alert(regra: dict, itens_a: list, itens_b: list,
                     contraindicacao: bool = False) -> dict:
        if contraindicacao:
            conflito = (f"Condição [{itens_a[0]}] × "
                        f"Fármaco [{', '.join(itens_b).upper()}] ({regra['item_B']})")
        else:
            conflito = (f"{', '.join(itens_a).upper()} ({regra['item_A']}) × "
                        f"{', '.join(itens_b).upper()} ({regra['item_B']})")
        return {
            "id_regra": regra["id_regra"],
            "tipo": regra["tipo_regra"],
            "conflito": conflito,
            "gravidade": regra["gravidade"],
            "alerta": regra["alerta"],
            "acao_sugerida": regra["acao_sugerida"],
            "alternativas": regra.get("alternativas", []),
            "fonte": regra["fonte"],
        }


# ─── 4. RECOMMENDATION ENGINE (determinístico) ────────────────────────────────
class RecommendationEngine:
    """Gera texto de recomendação estruturado a partir dos alertas."""

    _EMOJI = {"CRITICA": "🔴", "ALTA": "🟠", "MODERADA_A_ALTA": "🟡", "MODERADA": "🟡"}

    def generate(self, alertas: list[dict], medicamentos: list[dict],
                 condicoes: list[str]) -> str:
        if not alertas:
            return (
                "✅ **Nenhuma interação ou contraindicação detectada.**\n"
                "A prescrição está alinhada com as diretrizes clínicas para este perfil."
            )

        linhas = [f"## 📋 PARECER CLÍNICO — INTERCEPT CDSS\n",
                  f"**{len(alertas)} alerta(s) detectado(s).** Revisão obrigatória antes de prosseguir.\n"]

        for i, a in enumerate(alertas, 1):
            emoji = self._EMOJI.get(a["gravidade"], "⚪")
            linhas += [
                f"---\n### Alerta {i} — {emoji} {a['gravidade']}",
                f"**Regra:** `{a['id_regra']}` ({a['tipo']})",
                f"**Conflito:** {a['conflito']}",
                f"\n**⚠️ Por que este paciente NÃO pode usar esse medicamento:**",
                f"> {a['alerta']}\n",
                f"**🔬 Fonte (ANVISA/Diretrizes):** *{a['fonte']}*\n",
                f"**✅ Conduta Recomendada:**\n{a['acao_sugerida']}\n",
            ]
            if a["alternativas"]:
                linhas.append("**💊 Alternativas Terapêuticas Seguras:**")
                for alt in a["alternativas"]:
                    linhas.append(f"  - {alt}")
                linhas.append("")

        if condicoes:
            linhas += [
                "---",
                f"**🧑‍⚕️ Condições do Paciente Consideradas:** {', '.join(condicoes)}",
                "*As alternativas foram selecionadas levando em conta o perfil clínico completo.*\n"
            ]

        linhas += [
            "---",
            "> ⚠️ **INTERCEPT CDSS:** Este parecer é de suporte à decisão médica. "
            "A responsabilidade clínica final é sempre do médico.\n"
        ]
        return "\n".join(linhas)


# ─── 5. INTERCEPT CDSS — ORQUESTRADOR ─────────────────────────────────────────
class InterceptCDSS:
    """Ponto de entrada principal. Orquestra todas as camadas."""

    def __init__(self, ner_pipeline=None):
        self.mapper = PharmacologicalMapper()
        self.extractor = ClinicalContextExtractor()
        self.rules = RulesEngine()
        self.recommender = RecommendationEngine()
        self.ner = ner_pipeline

    def analisar_prontuario(self, texto: str) -> dict:
        medicamentos = self._extrair_medicamentos(texto)
        condicoes = self.extractor.extract_conditions(texto)
        alertas = self.rules.check(medicamentos, condicoes)
        recomendacao = self.recommender.generate(alertas, medicamentos, condicoes)

        return {
            "medicamentos_identificados": medicamentos,
            "condicoes_clinicas": condicoes,
            "alertas": alertas,
            "total_alertas": len(alertas),
            "ha_alerta_critico": any(a["gravidade"] == "CRITICA" for a in alertas),
            "recomendacao": recomendacao,
        }

    def _extrair_medicamentos(self, texto: str) -> list[dict]:
        medicamentos = []

        # Camada 1: BioBERTpt NER
        if self.ner is not None:
            try:
                entidades = self.ner(texto)
                for ent in entidades:
                    termo = ent["word"].strip().lower()
                    classe = self.mapper.get_class(termo)
                    if classe:
                        medicamentos.append({
                            "farmaco": self.mapper.normalize(termo),
                            "classe": classe,
                            "fonte_extracao": "biobertpt",
                            "score_ner": round(ent.get("score", 0), 4)
                        })
            except Exception as e:
                print(f"⚠️ NER erro: {e}")

        # Camada 2: Dicionário + fuzzy (complementa ou substitui o NER)
        existentes = {m["farmaco"] for m in medicamentos}
        for m in self.extractor.extract_drugs_from_text(texto, self.mapper):
            if m["farmaco"] not in existentes:
                medicamentos.append(m)

        return medicamentos


# ─── DISPLAY HELPER ───────────────────────────────────────────────────────────
def display_resultado(resultado: dict):
    """Exibe resultado formatado e detalhado no Jupyter."""
    sep = "=" * 65

    print(sep)
    print("  INTERCEPT CDSS — Análise de Prontuário")
    print(sep)

    # Medicamentos
    meds = resultado["medicamentos_identificados"]
    print(f"\n💊 MEDICAMENTOS IDENTIFICADOS ({len(meds)}):")
    if meds:
        for m in meds:
            fonte = m.get("fonte_extracao", "?")
            score = f" [NER score: {m['score_ner']}]" if "score_ner" in m else ""
            print(f"   • {m['farmaco'].upper()} → Classe: {m['classe']}"
                  f"  |  via: {fonte}{score}")
    else:
        print("   ⚠️ Nenhum medicamento identificado no texto.")

    # Condições
    conds = resultado["condicoes_clinicas"]
    print(f"\n🏥 CONDIÇÕES CLÍNICAS ({len(conds)}):")
    if conds:
        for c in conds:
            print(f"   • {c}")
    else:
        print("   (nenhuma condição mapeada no texto)")

    # Status
    print(f"\n🚨 ALERTAS DISPARADOS: {resultado['total_alertas']}")
    if resultado["ha_alerta_critico"]:
        print("   ⛔ PRESCRIÇÃO BLOQUEADA — Há alerta(s) de gravidade CRÍTICA")
    elif resultado["total_alertas"] > 0:
        print("   ⚠️  REVISÃO OBRIGATÓRIA antes de liberar a prescrição")
    else:
        print("   ✅ Nenhuma interação detectada — Prescrição liberada")

    # Recomendação
    print(f"\n{sep}")
    print("  PARECER E RECOMENDAÇÕES")
    print(sep)
    print(resultado["recomendacao"])
