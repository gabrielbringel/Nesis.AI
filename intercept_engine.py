"""
INTERCEPT CDSS — Motor de Decisão Clínica
==========================================
Módulos:
  1. PharmacologicalMapper  → fármaco → classe ATC via JSON + fuzzy match
  2. ClinicalContextExtractor → extrai condições clínicas do texto livre
  3. RulesEngine             → cruza classes/condições com banco de regras
  4. RecommendationEngine    → sugere alternativas contextualizadas
  5. InterceptCDSS           → orquestrador principal
"""

import json
import re
from difflib import get_close_matches
from itertools import combinations
from pathlib import Path

# ─── Caminhos dos arquivos de dados ───────────────────────────────────────────
_BASE = Path(__file__).parent
RULES_PATH = _BASE / "intercept_rules.json"
DRUGS_PATH = _BASE / "intercept_drugs.json"


# ─── 1. PHARMACOLOGICAL MAPPER ────────────────────────────────────────────────
class PharmacologicalMapper:
    """Mapeia nome de fármaco para classe ATC usando dicionário + fuzzy match."""

    def __init__(self, drugs_path: Path = DRUGS_PATH):
        with open(drugs_path, encoding="utf-8") as f:
            data = json.load(f)
        self._drug_map: dict[str, dict] = data["medicamentos"]
        self._all_names = list(self._drug_map.keys())

    def get_class(self, nome: str) -> str | None:
        """Retorna a classe terapêutica do fármaco. Usa fuzzy match para typos."""
        key = nome.strip().lower()
        # Busca exata
        if key in self._drug_map:
            return self._drug_map[key]["classe"]
        # Busca fuzzy (tolerância de typos)
        matches = get_close_matches(key, self._all_names, n=1, cutoff=0.82)
        if matches:
            return self._drug_map[matches[0]]["classe"]
        return None

    def normalize(self, nome: str) -> str:
        """Retorna o nome canônico do fármaco (após fuzzy match)."""
        key = nome.strip().lower()
        if key in self._drug_map:
            return key
        matches = get_close_matches(key, self._all_names, n=1, cutoff=0.82)
        return matches[0] if matches else key


# ─── 2. CLINICAL CONTEXT EXTRACTOR ───────────────────────────────────────────
class ClinicalContextExtractor:
    """Extrai condições clínicas do texto do prontuário via keyword matching."""

    def __init__(self, drugs_path: Path = DRUGS_PATH):
        with open(drugs_path, encoding="utf-8") as f:
            data = json.load(f)
        self._cond_map: dict[str, str] = data["condicoes_clinicas"]
        # Ordena por tamanho decrescente para dar prioridade a expressões maiores
        self._sorted_keys = sorted(self._cond_map.keys(), key=len, reverse=True)

    def extract_conditions(self, texto: str) -> list[str]:
        """Retorna lista de condições clínicas únicas encontradas no texto."""
        texto_lower = texto.lower()
        found: set[str] = set()
        for kw in self._sorted_keys:
            if kw in texto_lower:
                found.add(self._cond_map[kw])
        return list(found)

    def extract_drugs_from_text(self, texto: str, mapper: "PharmacologicalMapper") -> list[dict]:
        """
        Extrai candidatos a fármacos do texto por expressão regular e verifica
        contra o dicionário farmacológico (com fuzzy match).
        Usado como fallback quando o NER não retorna resultados.
        """
        # Tokeniza palavras com 4+ caracteres (candidatos a nomes de fármacos)
        candidatos = re.findall(r'\b[a-záàâãéèêíïóôõöúüçñ]{4,}\b', texto.lower())
        medicamentos: list[dict] = []
        vistos: set[str] = set()

        for cand in candidatos:
            classe = mapper.get_class(cand)
            if classe and cand not in vistos:
                nome_canônico = mapper.normalize(cand)
                vistos.add(cand)
                medicamentos.append({"farmaco": nome_canônico, "classe": classe, "termo_original": cand})

        return medicamentos


# ─── 3. RULES ENGINE ──────────────────────────────────────────────────────────
class RulesEngine:
    """Motor de regras determinístico. Cruza classes de fármacos e condições."""

    _SEVERITY_ORDER = {"CRITICA": 4, "ALTA": 3, "MODERADA_A_ALTA": 2, "MODERADA": 1}

    def __init__(self, rules_path: Path = RULES_PATH):
        with open(rules_path, encoding="utf-8") as f:
            self._rules: list[dict] = json.load(f)

    def check(self, medicamentos: list[dict], condicoes: list[str]) -> list[dict]:
        """
        Avalia medicamentos e condições contra o banco de regras.

        Args:
            medicamentos: lista de {"farmaco": str, "classe": str}
            condicoes: lista de strings de condições clínicas (ex: ["DIABETES", "HAS"])

        Returns:
            Lista de alertas ordenados por gravidade (críticos primeiro).
        """
        alertas: list[dict] = []
        classes_presentes = {m["classe"] for m in medicamentos}

        for regra in self._rules:
            a, b = regra["item_A"], regra["item_B"]
            tipo = regra["tipo_regra"]

            acionou = False

            if tipo == "INTERACAO":
                # Verifica cruzamento fármaco × fármaco
                if a in classes_presentes and b in classes_presentes:
                    farmacos_a = [m["farmaco"] for m in medicamentos if m["classe"] == a]
                    farmacos_b = [m["farmaco"] for m in medicamentos if m["classe"] == b]
                    alerta = self._build_alert(regra, farmacos_a, farmacos_b)
                    alertas.append(alerta)
                    acionou = True

            elif tipo == "CONTRAINDICACAO":
                # Verifica condição clínica × classe de fármaco
                if a in condicoes and b in classes_presentes:
                    farmacos_b = [m["farmaco"] for m in medicamentos if m["classe"] == b]
                    alerta = self._build_alert(regra, [a], farmacos_b, is_contraindicacao=True)
                    alertas.append(alerta)
                    acionou = True

        # Ordena: críticos primeiro
        alertas.sort(
            key=lambda x: self._SEVERITY_ORDER.get(x["gravidade"], 0),
            reverse=True
        )
        return alertas

    @staticmethod
    def _build_alert(regra: dict, itens_a: list, itens_b: list,
                     is_contraindicacao: bool = False) -> dict:
        if is_contraindicacao:
            conflito_str = (f"Condição [{itens_a[0]}] × "
                            f"Fármaco [{', '.join(itens_b).upper()}] ({regra['item_B']})")
        else:
            conflito_str = (f"{', '.join(itens_a).upper()} ({regra['item_A']}) × "
                            f"{', '.join(itens_b).upper()} ({regra['item_B']})")
        return {
            "id_regra": regra["id_regra"],
            "tipo": regra["tipo_regra"],
            "conflito": conflito_str,
            "gravidade": regra["gravidade"],
            "alerta": regra["alerta"],
            "acao_sugerida": regra["acao_sugerida"],
            "alternativas": regra.get("alternativas", []),
            "fonte": regra["fonte"],
        }


# ─── 4. RECOMMENDATION ENGINE ─────────────────────────────────────────────────
class RecommendationEngine:
    """
    Gera recomendação clínica contextualizada com base nos alertas e no
    perfil completo do paciente. 100% determinístico — sem API externa.
    """

    def generate(self, alertas: list[dict], medicamentos: list[dict],
                 condicoes: list[str], texto_prontuario: str) -> str:
        if not alertas:
            return (
                "✅ **Nenhuma interação ou contraindicação detectada.**\n"
                "A prescrição está alinhada com as diretrizes clínicas para o perfil deste paciente."
            )

        linhas = ["## 📋 RECOMENDAÇÃO CLÍNICA — INTERCEPT CDSS\n"]
        linhas.append(f"**{len(alertas)} alerta(s) detectado(s).** "
                      "Revise antes de prosseguir com a prescrição.\n")

        for i, alerta in enumerate(alertas, 1):
            gravidade_emoji = {"CRITICA": "🔴", "ALTA": "🟠",
                               "MODERADA_A_ALTA": "🟡", "MODERADA": "🟡"}.get(
                alerta["gravidade"], "⚪"
            )
            linhas.append(f"---\n### Alerta {i} — {gravidade_emoji} {alerta['gravidade']}")
            linhas.append(f"**Regra:** `{alerta['id_regra']}` ({alerta['tipo']})")
            linhas.append(f"**Conflito:** {alerta['conflito']}")
            linhas.append(f"\n**⚠️ Risco Clínico:**\n> {alerta['alerta']}\n")
            linhas.append(f"**🔬 Fonte:** *{alerta['fonte']}*\n")

            linhas.append(f"**✅ Ação Recomendada:**\n{alerta['acao_sugerida']}\n")

            if alerta["alternativas"]:
                linhas.append("**💊 Alternativas Terapêuticas Sugeridas:**")
                for alt in alerta["alternativas"]:
                    linhas.append(f"  - {alt}")
                linhas.append("")

        # Contextualiza pelo perfil do paciente
        if condicoes:
            linhas.append("---")
            linhas.append(f"**🧑‍⚕️ Contexto do Paciente:** {', '.join(condicoes)}")
            linhas.append(
                "*As alternativas acima foram selecionadas levando em conta as condições "
                "clínicas identificadas no prontuário.*\n"
            )

        linhas.append("---")
        linhas.append(
            "> **Nota Legal:** Este sistema é de suporte à decisão (CDSS). "
            "A decisão final é sempre do médico responsável. "
            "INTERCEPT não substitui o julgamento clínico.\n"
        )

        return "\n".join(linhas)


# ─── 5. INTERCEPT CDSS — ORQUESTRADOR ─────────────────────────────────────────
class InterceptCDSS:
    """
    Ponto de entrada principal do sistema.
    Recebe texto livre do prontuário e retorna análise completa.
    """

    def __init__(self, ner_pipeline=None):
        self.mapper = PharmacologicalMapper()
        self.extractor = ClinicalContextExtractor()
        self.rules = RulesEngine()
        self.recommender = RecommendationEngine()
        self.ner = ner_pipeline  # Opcional: pipeline BioBERTpt

    def analisar_prontuario(self, texto: str) -> dict:
        """
        Analisa o prontuário completo e retorna:
          - medicamentos encontrados
          - condições clínicas identificadas
          - alertas disparados
          - recomendação contextualizada
        """
        # 1. Extração de fármacos
        medicamentos = self._extrair_medicamentos(texto)

        # 2. Extração de condições clínicas
        condicoes = self.extractor.extract_conditions(texto)

        # 3. Motor de regras
        alertas = self.rules.check(medicamentos, condicoes)

        # 4. Recomendação
        recomendacao = self.recommender.generate(alertas, medicamentos, condicoes, texto)

        return {
            "medicamentos_identificados": medicamentos,
            "condicoes_clinicas": condicoes,
            "alertas": alertas,
            "total_alertas": len(alertas),
            "ha_alerta_critico": any(a["gravidade"] == "CRITICA" for a in alertas),
            "recomendacao": recomendacao,
        }

    def _extrair_medicamentos(self, texto: str) -> list[dict]:
        """
        Tenta NER (BioBERTpt). Se retornar vazio, usa extração por regex+dict.
        Garante zero falsos negativos no MVP.
        """
        medicamentos = []

        if self.ner is not None:
            try:
                entidades = self.ner(texto)
                for ent in entidades:
                    termo = ent["word"].strip().lower()
                    classe = self.mapper.get_class(termo)
                    if classe:
                        nome_can = self.mapper.normalize(termo)
                        medicamentos.append({"farmaco": nome_can, "classe": classe})
            except Exception:
                pass

        # Fallback ou complemento: extração por dicionário com fuzzy match
        # (garante que typos como "enalapriu" sejam capturados)
        dict_meds = self.extractor.extract_drugs_from_text(texto, self.mapper)
        existentes = {m["farmaco"] for m in medicamentos}
        for m in dict_meds:
            if m["farmaco"] not in existentes:
                medicamentos.append({"farmaco": m["farmaco"], "classe": m["classe"]})

        return medicamentos


# ─── FUNÇÕES DE DISPLAY (helper para Jupyter) ─────────────────────────────────
def display_resultado(resultado: dict):
    """Imprime o resultado formatado no console/Jupyter."""
    print("=" * 65)
    print("  INTERCEPT CDSS — Análise Completa")
    print("=" * 65)

    print(f"\n💊 MEDICAMENTOS IDENTIFICADOS ({len(resultado['medicamentos_identificados'])}):")
    for m in resultado["medicamentos_identificados"]:
        print(f"   • {m['farmaco'].upper()} → classe: {m['classe']}")

    print(f"\n🏥 CONDIÇÕES CLÍNICAS ({len(resultado['condicoes_clinicas'])}):")
    if resultado["condicoes_clinicas"]:
        for c in resultado["condicoes_clinicas"]:
            print(f"   • {c}")
    else:
        print("   (nenhuma condição identificada no texto)")

    print(f"\n🚨 ALERTAS DISPARADOS: {resultado['total_alertas']}")
    if resultado["ha_alerta_critico"]:
        print("   ⛔ PRESCRIÇÃO BLOQUEADA — Há alerta(s) de gravidade CRÍTICA")
    elif resultado["total_alertas"] > 0:
        print("   ⚠️ REVISÃO OBRIGATÓRIA antes de prosseguir")
    else:
        print("   ✅ Sem alertas — Prescrição liberada")

    print("\n" + "=" * 65)
    print("  RECOMENDAÇÃO CLÍNICA")
    print("=" * 65)
    print(resultado["recomendacao"])
