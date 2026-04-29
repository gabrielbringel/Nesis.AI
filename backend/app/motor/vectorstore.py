"""RAG local baseado no banco_conhecimento_sus.json.

Lê o JSON com conhecimento clínico do SUS/ANVISA, filtra os registros
relevantes para os medicamentos presentes na prescrição e devolve um
bloco de texto formatado para injeção no prompt do Gemini.

Não depende de ChromaDB, PGVector ou qualquer banco externo — funciona
100% offline e de forma determinística.
"""

from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)

# Caminho absoluto do JSON — sempre relativo a este arquivo
_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "banco_conhecimento_sus.json")


@lru_cache(maxsize=1)
def _carregar_banco() -> list[dict[str, Any]]:
    """Carrega e cacheia o JSON de conhecimento clínico na memória."""
    try:
        with open(_JSON_PATH, encoding="utf-8") as f:
            dados = json.load(f)
        logger.info("Banco SUS carregado: %d entradas.", len(dados))
        return dados
    except Exception:
        logger.exception("Falha ao carregar banco_conhecimento_sus.json — RAG desativado.")
        return []


def buscar_contexto_sus(medicamentos: list[str]) -> str:
    """Busca no banco SUS os registros relevantes para os medicamentos informados.

    Faz correspondência case-insensitive: se qualquer medicamento da prescrição
    aparecer como `medicamento_alvo` ou como `com_medicamento` em uma interação,
    a entrada inteira é incluída no contexto.

    Retorna uma string formatada pronta para ser injetada no prompt do Gemini,
    ou uma string indicando base vazia caso não haja correspondência.
    """
    banco = _carregar_banco()
    if not banco or not medicamentos:
        return "(base de conhecimento SUS indisponível — usar conhecimento clínico do modelo)"

    nomes_lower = {m.strip().lower() for m in medicamentos if m}

    entradas_relevantes: list[dict[str, Any]] = []
    for entrada in banco:
        alvo = (entrada.get("medicamento_alvo") or "").lower()
        interacoes = entrada.get("interacoes_graves") or []

        # Inclui se o alvo for um dos medicamentos prescritos
        if alvo in nomes_lower:
            entradas_relevantes.append(entrada)
            continue

        # Inclui também se alguma interação envolve um dos medicamentos prescritos
        for inter in interacoes:
            parceiro = (inter.get("com_medicamento") or "").lower()
            if parceiro in nomes_lower:
                entradas_relevantes.append(entrada)
                break

    if not entradas_relevantes:
        return "(nenhum registro encontrado no banco SUS para os medicamentos informados — usar conhecimento clínico do modelo)"

    # Formata como texto estruturado para o prompt
    blocos: list[str] = []
    for entrada in entradas_relevantes:
        alvo = entrada.get("medicamento_alvo", "?")
        fonte = entrada.get("fonte", "SUS/ANVISA")
        contraindicacoes = entrada.get("contraindicacoes") or []
        interacoes = entrada.get("interacoes_graves") or []

        linhas = [f"📋 MEDICAMENTO: {alvo} (Fonte: {fonte})"]

        if contraindicacoes:
            linhas.append("  Contraindicações:")
            for c in contraindicacoes:
                linhas.append(f"    • {c}")

        if interacoes:
            linhas.append("  Interações Graves:")
            for inter in interacoes:
                com = inter.get("com_medicamento", "?")
                efeito = inter.get("efeito", "?")
                linhas.append(f"    ⚠️  Com {com}: {efeito}")

        blocos.append("\n".join(linhas))

    return "\n\n".join(blocos)


# ── Compatibilidade com PGVector (search_context assíncrono) ─────────────────
# Mantido para não quebrar imports existentes, mas delegado ao RAG local.

async def search_context(query: str, k: int = 4) -> list[str]:
    """Stub de compatibilidade — o RAG agora é feito via buscar_contexto_sus()."""
    return []