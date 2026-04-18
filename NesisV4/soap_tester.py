# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════════╗
║   INTERCEPT CDSS — SOAP Parser + Test Harness                   ║
║   Aceita prontuários no formato SOAP e alimenta o pipeline       ║
╚══════════════════════════════════════════════════════════════════╝

Como usar:
  1. Cole prontuários SOAP na lista CASOS_DE_TESTE abaixo (ou via stdin)
  2. Execute:  python soap_tester.py
  3. O sistema extrai S/O/A/P, exames, prescrições e roda o CDSS
"""

import re
import sys
import json
import textwrap
from dataclasses import dataclass, field
from typing import Optional

# ── Garante UTF-8 no terminal Windows ───────────────────────────────
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── Importa o pipeline principal ────────────────────────────────────
sys.path.insert(0, r"C:\Users\Ricardo\Downloads")
from intercept_cdss import InterceptCDSS


# ══════════════════════════════════════════════════════════════════
# DATACLASS: resultado do parse SOAP
# ══════════════════════════════════════════════════════════════════

@dataclass
class SOAPData:
    """Dados estruturados extraídos de um prontuário SOAP."""
    sections: dict          = field(default_factory=dict)
    exames: dict            = field(default_factory=dict)
    dados_vitais: dict      = field(default_factory=dict)
    nova_prescricao: str    = ""
    outras_prescricoes: list = field(default_factory=list)
    medicamentos_em_uso: list = field(default_factory=list)
    condicoes: list         = field(default_factory=list)
    avisos_parse: list      = field(default_factory=list)
    texto_completo: str     = ""


# ══════════════════════════════════════════════════════════════════
# SOAP PARSER
# ══════════════════════════════════════════════════════════════════

class SOAPParser:
    """
    Divide prontuário SOAP em seções e extrai dados estruturados.

    Formatos de cabeçalho suportados (case-insensitive):
      S: / Subjetivo: / S - Subjetivo:
      O: / Objetivo:  / Exame Físico:
      A: / Avaliação: / Diagnóstico:
      P: / Plano:     / Conduta:
    """

    # Regex para detectar início de cada seção
    _HDR = {
        'S': r'(?im)^\s*(?:S\.?\s*[-—]?\s*)?(?:subjetiv[oa]|subjective)\s*[:\-—]|^\s*S\s*[:\-—]',
        'O': r'(?im)^\s*(?:O\.?\s*[-—]?\s*)?(?:objetiv[oa]|objective|exame\s+f[íi]sico|dados\s+objetivos)\s*[:\-—]|^\s*O\s*[:\-—]',
        'A': r'(?im)^\s*(?:A\.?\s*[-—]?\s*)?(?:avalia[cç][aã]o|assessment|diagn[oó]stico[s]?)\s*[:\-—]|^\s*A\s*[:\-—]',
        'P': r'(?im)^\s*(?:P\.?\s*[-—]?\s*)?(?:plano|plan|conduta|prescri[cç][aã]o)\s*[:\-—]|^\s*P\s*[:\-—]',
    }

    # Exames laboratoriais: chave -> lista de padrões regex
    _LABS = {
        'potassio':   [r'pot[áa]ssio\s*[=:\-]?\s*([\d]+[,.][\d]+)',
                       r'\bK\+?\s*[=:\-]?\s*([\d]+[,.][\d]+)'],
        'creatinina': [r'creatinina\s*[=:\-]?\s*([\d]+[,.][\d]+)',
                       r'\bCr\.?\s*[=:\-]?\s*([\d]+[,.][\d]+)'],
        'sodio':      [r's[oó]dio\s*[=:\-]?\s*([\d]+(?:[,.][\d]+)?)',
                       r'\bNa\+?\s*[=:\-]?\s*([\d]+(?:[,.][\d]+)?)'],
        'inr':        [r'\bINR\s*[=:\-]?\s*([\d]+[,.][\d]+)',
                       r'\bRNI\s*[=:\-]?\s*([\d]+[,.][\d]+)'],
        'hemoglobina':[r'hemoglobina\s*[=:\-]?\s*([\d]+[,.][\d]+)',
                       r'\bHb\.?\s*[=:\-]?\s*([\d]+[,.][\d]+)'],
        'glicemia':   [r'glicemia\s*[=:\-]?\s*([\d]+(?:[,.][\d]+)?)',
                       r'glicose\s*[=:\-]?\s*([\d]+(?:[,.][\d]+)?)'],
        'hba1c':      [r'HbA1c\s*[=:\-]?\s*([\d]+[,.][\d]+)',
                       r'hemoglobina\s+glicada\s*[=:\-]?\s*([\d]+[,.][\d]+)'],
        'tfg':        [r'\bTFG\s*[=:\-]?\s*([\d]+(?:[,.][\d]+)?)',
                       r'filtra[cç][aã]o\s+glomerular\s*[=:\-]?\s*([\d]+)'],
        'pcr':        [r'\bPCR\s*[=:\-]?\s*([\d]+[,.][\d]+)'],
        'tsh':        [r'\bTSH\s*[=:\-]?\s*([\d]+[,.][\d]+)'],
        'ureia':      [r'ur[eé]ia\s*[=:\-]?\s*([\d]+(?:[,.][\d]+)?)'],
    }

    # Sinais vitais
    _VITAIS = {
        'pa_sistolica':  r'(?:PA|press[aã]o\s+arterial)\s*[=:\-]?\s*(\d{2,3})\s*/\s*\d{2,3}',
        'pa_diastolica': r'(?:PA|press[aã]o\s+arterial)\s*[=:\-]?\s*\d{2,3}\s*/\s*(\d{2,3})',
        'fc':            r'(?:FC|freq[uü][eê]ncia\s+card[ií]aca|pulso)\s*[=:\-]?\s*(\d{2,3})\s*(?:bpm)?',
        'spo2':          r'(?:SpO2?|satura[cç][aã]o)\s*[=:\-]?\s*(\d{2,3})\s*%',
        'temperatura':   r'(?:Tax?\.?|temp(?:eratura)?)\s*[=:\-]?\s*(3[5-9][,.][\d]|4[01][,.][\d])',
        'peso':          r'(?:peso)\s*[=:\-]?\s*([\d]{2,3}(?:[,.][\d]+)?)\s*kg',
        'imc':           r'(?:IMC)\s*[=:\-]?\s*([\d]{2}[,.][\d])',
    }

    # Verbos que introduzem nova prescrição na seção P
    _VERBOS_PRESCRICAO = (
        r'(?:prescrever?|prescrit[oa]|iniciar|iniciando|introduzir|'
        r'adicionar|acrescentar|solicitar|administrar)\s+'
        r'([a-záéíóúãõâêîôûàèìòùç]{4,}(?:\s+[a-záéíóúãõâêîôûàèìòùç]+)?)'
    )

    # Padrões para medicamentos em uso (seção S)
    _MEDS_EM_USO = (
        r'(?:em\s+uso|usa\s+|faz\s+uso\s+de|utiliza\s+|tomando?\s+|'
        r'medicamentos?\s+(?:em\s+)?uso\s*[:\-]?|em\s+uso\s*[:\-]?)'
        r'\s*([^.\n;]{5,80})'
    )

    # ── helpers ─────────────────────────────────────────────────────

    def _split_sections(self, texto: str) -> dict:
        """Localiza cabeçalhos SOAP e divide o texto em seções."""
        posicoes = {}
        for sec, pat in self._HDR.items():
            m = re.search(pat, texto)
            if m:
                posicoes[sec] = m.start()

        if not posicoes:
            return {'COMPLETO': texto}

        ordenadas = sorted(posicoes.items(), key=lambda x: x[1])
        sections = {}
        for i, (sec, ini) in enumerate(ordenadas):
            fim = ordenadas[i + 1][1] if i + 1 < len(ordenadas) else len(texto)
            conteudo = texto[ini:fim]
            # Remove o próprio cabeçalho
            conteudo = re.sub(self._HDR[sec], '', conteudo, count=1).strip()
            sections[sec] = conteudo
        return sections

    def _extrair_float(self, texto: str, padroes: list) -> Optional[float]:
        for pat in padroes:
            m = re.search(pat, texto, re.IGNORECASE)
            if m:
                try:
                    return float(m.group(1).replace(',', '.'))
                except ValueError:
                    pass
        return None

    def _extrair_labs(self, texto_o: str) -> dict:
        return {k: self._extrair_float(texto_o, pats) for k, pats in self._LABS.items()}

    def _extrair_vitais(self, texto_o: str) -> dict:
        vitais = {}
        for nome, pat in self._VITAIS.items():
            m = re.search(pat, texto_o, re.IGNORECASE)
            if m:
                try:
                    vitais[nome] = float(m.group(1).replace(',', '.'))
                except ValueError:
                    pass
        return vitais

    def _extrair_prescricoes(self, texto_p: str) -> tuple:
        """Retorna (principal, [adicionais]) da seção P."""
        encontradas = []

        # Verbo + fármaco
        for m in re.finditer(self._VERBOS_PRESCRICAO, texto_p, re.IGNORECASE):
            farm = m.group(1).strip().lower()
            if farm not in encontradas:
                encontradas.append(farm)

        # Linhas com marcadores: "- ibuprofeno 400mg" / "1. ibuprofeno"
        for linha in texto_p.splitlines():
            m = re.match(
                r'^\s*[-•*\d.]+\s+([a-záéíóúãõâêîôûàèìòùç]{4,})',
                linha.strip(), re.IGNORECASE
            )
            if m:
                farm = m.group(1).strip().lower()
                if farm not in encontradas:
                    encontradas.append(farm)

        return (encontradas[0] if encontradas else "",
                encontradas[1:] if len(encontradas) > 1 else [])

    def _extrair_meds_uso(self, texto_s: str) -> list:
        meds = []
        for m in re.finditer(self._MEDS_EM_USO, texto_s, re.IGNORECASE):
            trecho = m.group(1)
            for item in re.split(r'[,;]|\se\s', trecho):
                wm = re.match(r'\s*([a-záéíóúãõâêîôûàèìòùç]{4,})', item.strip(), re.IGNORECASE)
                if wm:
                    med = wm.group(1).lower()
                    if med not in meds:
                        meds.append(med)
        return meds

    def _extrair_condicoes(self, texto_a: str) -> list:
        conds = []
        for linha in texto_a.splitlines():
            linha = re.sub(r'^[-•*\d.]+\s*', '', linha.strip())
            linha = re.sub(r'\([A-Z]\d{2}[\d.]*\)', '', linha).strip()
            if len(linha) > 4:
                conds.append(linha.lower())
        return conds or ([texto_a.strip().lower()] if texto_a.strip() else [])

    # ── ponto de entrada ────────────────────────────────────────────

    def parse(self, soap_text: str) -> SOAPData:
        data = SOAPData(texto_completo=soap_text)
        avisos = []

        data.sections = self._split_sections(soap_text)

        texto_o = data.sections.get('O', '')
        if texto_o:
            data.exames      = self._extrair_labs(texto_o)
            data.dados_vitais = self._extrair_vitais(texto_o)
        else:
            avisos.append("[AVISO] Secao O nao encontrada — exames nao extraidos")
            data.exames = {k: None for k in self._LABS}

        texto_p = data.sections.get('P', '')
        if texto_p:
            data.nova_prescricao, data.outras_prescricoes = self._extrair_prescricoes(texto_p)
            if not data.nova_prescricao:
                avisos.append("[AVISO] Nova prescricao nao identificada na secao P")
        else:
            avisos.append("[AVISO] Secao P nao encontrada")

        texto_s = data.sections.get('S', '') + ' ' + data.sections.get('A', '')
        data.medicamentos_em_uso = self._extrair_meds_uso(texto_s)

        texto_a = data.sections.get('A', '')
        data.condicoes = self._extrair_condicoes(texto_a) if texto_a else []

        data.avisos_parse = avisos
        return data


# ══════════════════════════════════════════════════════════════════
# RUNNER: une SOAPParser + InterceptCDSS
# ══════════════════════════════════════════════════════════════════

class SOAPCDSSRunner:
    def __init__(self):
        self._parser = SOAPParser()
        self._cdss   = InterceptCDSS()

    def run(self, soap_text: str, caso_id: str = "") -> dict:
        soap = self._parser.parse(soap_text)

        # Garante chaves mínimas que o pipeline espera
        exames = {
            'potassio':   soap.exames.get('potassio'),
            'creatinina': soap.exames.get('creatinina'),
            'inr':        soap.exames.get('inr'),
        }
        # Adiciona o resto dos exames extraídos
        exames.update({k: v for k, v in soap.exames.items() if k not in exames})

        resultado = self._cdss.analyze(
            texto_prontuario=soap_text,
            exames=exames,
            nova_prescricao=soap.nova_prescricao or "INDEFINIDO",
        )
        resultado['_soap'] = {
            'caso_id':           caso_id,
            'secoes_detectadas': list(soap.sections.keys()),
            'exames_extraidos':  soap.exames,
            'dados_vitais':      soap.dados_vitais,
            'nova_prescricao':   soap.nova_prescricao,
            'outras_prescricoes': soap.outras_prescricoes,
            'meds_em_uso':       soap.medicamentos_em_uso,
            'condicoes':         soap.condicoes,
            'avisos_parse':      soap.avisos_parse,
        }
        return resultado

    def imprimir(self, r: dict) -> None:
        soap = r['_soap']
        W = 70

        print("=" * W)
        print(f"  CASO: {soap['caso_id']}")
        print(f"  Secoes detectadas : {soap['secoes_detectadas']}")
        print(f"  Nova prescricao   : {soap['nova_prescricao'] or '[nao detectada]'}")
        if soap['outras_prescricoes']:
            print(f"  Outras prescr.    : {soap['outras_prescricoes']}")
        print(f"  Meds em uso       : {soap['meds_em_uso'] or '[nenhum detectado]'}")
        print(f"  Condicoes (A)     : {soap['condicoes']}")
        print("-" * W)

        print("  EXAMES EXTRAIDOS:")
        for k, v in soap['exames_extraidos'].items():
            if v is not None:
                print(f"    {k:<15}: {v}")

        if soap['dados_vitais']:
            print("  SINAIS VITAIS:")
            for k, v in soap['dados_vitais'].items():
                print(f"    {k:<15}: {v}")

        if soap['avisos_parse']:
            print("  AVISOS DE PARSE:")
            for av in soap['avisos_parse']:
                print(f"    {av}")

        print("-" * W)
        status = r['status_decisao']
        score  = r['risco']['score']
        icone  = {'LIBERADO': '[OK]', 'ALERTA': '[!]', 'BLOQUEADO': '[X]'}.get(status, '[?]')
        print(f"  {icone}  DECISAO: {status}  |  SCORE: {score}/10")
        print("-" * W)

        print(f"  ALERTAS ({len(r['alertas'])}):")
        for i, al in enumerate(r['alertas'], 1):
            print(f"    [{i}] [{al['gravidade']}] {al['descricao']}")
            print(f"         Acao: {al['acao']}")

        if 'justificativa_ia' in r:
            print()
            print("  JUSTIFICATIVA IA:")
            for linha in r['justificativa_ia'].splitlines():
                for sub in textwrap.wrap(linha, width=W - 4) or ['']:
                    print(f"    {sub}")

        print("=" * W)
        print()


# ══════════════════════════════════════════════════════════════════
# CASOS DE TESTE — cole prontuários SOAP aqui
# ══════════════════════════════════════════════════════════════════

CASOS_DE_TESTE = [

    # ── CASO 1: clássico AINE + BRA ─────────────────────────────────
    {
        "id": "CASO-01 | AINE + BRA + Hipercalemia",
        "soap": """
S: Paciente masculino, 62 anos, portador de hipertensão arterial sistêmica (HAS).
   Queixa de dor em joelho direito há 3 dias. Nega alergia a medicamentos.
   Em uso: losartana 50mg 1x/dia.

O: PA: 148/92 mmHg. FC: 76 bpm. Peso: 88 kg.
   Exames recentes: potássio = 5.5 mEq/L, creatinina = 1.1 mg/dL.

A: - Hipertensão arterial sistêmica (I10)
   - Gonalgia direita — provável gonartrose

P: - Iniciar ibuprofeno 600mg 8/8h por 5 dias
   - Manter losartana 50mg
   - Retorno em 7 dias
""",
    },

    # ── CASO 2: Duplo bloqueio SRAA (contraindicado) ─────────────────
    {
        "id": "CASO-02 | Duplo Bloqueio SRAA (BRA + IECA)",
        "soap": """
S: Paciente feminino, 55 anos. HAS e insuficiência cardíaca (ICC).
   Em uso: enalapril 10mg 2x/dia, furosemida 40mg 1x/dia.
   Refere edema em MMII progressivo.

O: PA: 162/98 mmHg. FC: 88 bpm. SpO2: 96%.
   Creatinina = 1.4 mg/dL. Potássio = 4.8 mEq/L.

A: - Hipertensão arterial sistêmica de difícil controle (I10)
   - Insuficiência cardíaca congestiva (I50.0)
   - Edema de membros inferiores

P: - Acrescentar losartana 50mg para controle pressórico
   - Manter enalapril 10mg e furosemida 40mg
   - Solicitar ecocardiograma
""",
    },

    # ── CASO 3: Anticoagulação + AINE ────────────────────────────────
    {
        "id": "CASO-03 | Warfarina + AINE",
        "soap": """
S: Paciente, 70 anos, portador de fibrilação atrial (FA) crônica.
   Medicações em uso: warfarina 5mg/dia, metoprolol 50mg 2x/dia.
   Queixa de lombalgia intensa há 2 dias. Nega trauma.

O: PA: 130/80 mmHg. FC: 72 bpm (regular).
   INR = 2.8. Creatinina = 0.9 mg/dL. Potássio = 4.2 mEq/L.

A: - Fibrilação atrial crônica (I48)
   - Lombalgia inespecífica (M54.5)

P: - Prescrever diclofenaco 50mg 8/8h por 3 dias para dor lombar
   - Manter anticoagulação — monitorar INR em 5 dias
""",
    },

    # ── CASO 4: LIBERADO (caso negativo / controle) ──────────────────
    {
        "id": "CASO-04 | Prescricao Segura (controle)",
        "soap": """
S: Paciente, 40 anos, sem comorbidades conhecidas.
   Sem medicamentos em uso contínuo. Alergia: penicilina.
   Queixa de cefaleia tensional recorrente.

O: PA: 118/74 mmHg. FC: 68 bpm. Peso: 72 kg.
   Potássio = 4.1 mEq/L. Creatinina = 0.8 mg/dL.

A: - Cefaleia tensional episódica (G44.2)

P: - Iniciar paracetamol 750mg se necessário (máx 4x/dia)
   - Orientar hidratação e técnicas de relaxamento
   - Retorno se não houver melhora em 7 dias
""",
    },

]


# ══════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    runner = SOAPCDSSRunner()

    print()
    print("=" * 70)
    print("  INTERCEPT CDSS — SOAP PARSER + TEST HARNESS")
    print(f"  {len(CASOS_DE_TESTE)} caso(s) carregado(s)")
    print("=" * 70)
    print()

    for caso in CASOS_DE_TESTE:
        try:
            resultado = runner.run(caso["soap"], caso_id=caso["id"])
            runner.imprimir(resultado)
        except Exception as e:
            print(f"[ERRO] Caso '{caso['id']}': {e}")
            print()

    # ── Modo interativo: aceita SOAP via stdin ─────────────────────
    if "--interativo" in sys.argv:
        print("=" * 70)
        print("  MODO INTERATIVO — Cole um prontuário SOAP e pressione Ctrl+D (Linux/Mac) ou Ctrl+Z Enter (Windows):")
        print("=" * 70)
        soap_input = sys.stdin.read()
        if soap_input.strip():
            r = runner.run(soap_input, caso_id="INTERATIVO")
            runner.imprimir(r)
