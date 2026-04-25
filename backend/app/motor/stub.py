"""Stub determinístico do motor de IA.

Ignora o payload e retorna sempre os mesmos três alertas — um de cada severidade —
com medicamentos brasileiros comuns no SUS. Substituir por integração LLM + RAG real
nas próximas iterações sem mudar a assinatura de `analyze`.
"""

from __future__ import annotations

from typing import Any


_MOCK_ALERTAS: list[dict[str, Any]] = [
    {
        "severidade": "GRAVE",
        "descricao": (
            "Paciente com alergia registrada a Dipirona. "
            "Prescrição contém Dipirona Sódica 500mg."
        ),
        "medicamentos_envolvidos": ["Dipirona Sódica"],
        "recomendacao": "Suspender imediatamente e substituir por Paracetamol 750mg.",
    },
    {
        "severidade": "MODERADO",
        "descricao": (
            "Interação entre Enalapril e Espironolactona pode causar hipercalemia."
        ),
        "medicamentos_envolvidos": ["Enalapril", "Espironolactona"],
        "recomendacao": "Monitorar níveis de potássio sérico semanalmente.",
    },
    {
        "severidade": "LEVE",
        "descricao": (
            "Ibuprofeno e AAS prescritos simultaneamente — duplicidade de "
            "anti-inflamatório."
        ),
        "medicamentos_envolvidos": ["Ibuprofeno", "AAS"],
        "recomendacao": "Avaliar necessidade de ambos ou substituir por monoterapia.",
    },
]


async def analyze(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Retorna alertas mockados ignorando o payload.

    Mantém assinatura `async` para que a integração real (LLM + RAG)
    plugue sem alterar o service que a consome.
    """
    return [dict(alerta) for alerta in _MOCK_ALERTAS]
