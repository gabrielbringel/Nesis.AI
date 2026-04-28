"""Script de teste manual do motor de analise clinica.

Roda o pipeline completo (LLM + RAG) se GEMINI_API_KEY estiver configurada;
caso contrario, usa o fallback deterministico (Rules Engine).

Execucao (a partir de backend/):
    .venv\Scripts\python -m app.motor.Teste
"""

import asyncio
import logging

from app.motor.pipeline import analyze

# Mostra os logs do pipeline no terminal
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")


async def teste_sistema_completo() -> None:
    print("=" * 60)
    print("TESTE DO MOTOR NESIS.AI")
    print("=" * 60)

    payload = {
        "paciente": {
            "nome": "Joao da Silva",
            "idade": 72,
            "alergias": ["Dipirona"],
        },
        "medicacoes": [
            {"nome": "Enalapril",   "dose": "20mg",  "via": "Oral", "frequencia": "12/12h"},
            {"nome": "Ibuprofeno",  "dose": "600mg", "via": "Oral", "frequencia": "8/8h"},
        ],
    }

    print(f"\nPaciente : {payload['paciente']['nome']}, {payload['paciente']['idade']} anos")
    print(f"Alergias : {', '.join(payload['paciente']['alergias'])}")
    print("Medicacoes:")
    for m in payload["medicacoes"]:
        print(f"  - {m['nome']} {m['dose']} ({m['frequencia']}) via {m['via']}")

    print("\n" + "-" * 60)
    print("Iniciando analise...")
    print("-" * 60 + "\n")

    try:
        alertas = await analyze(payload)
    except Exception as exc:
        print(f"[ERRO FATAL] O motor lancou uma excecao inesperada: {exc}")
        raise

    print("\n" + "=" * 60)
    print("RESULTADO DA ANALISE CLINICA")
    print("=" * 60)

    if not alertas:
        print("[OK] Prescricao Segura (nenhum alerta encontrado).")
    else:
        print(f"Total de alertas: {len(alertas)}\n")
        for i, alerta in enumerate(alertas, 1):
            sev = alerta.get("severidade", "?")
            desc = alerta.get("descricao", "?")
            meds = ", ".join(alerta.get("medicamentos_envolvidos", []))
            rec = alerta.get("recomendacao", "?")
            print(f"  [{i}] ALERTA {sev}")
            print(f"       Descricao  : {desc}")
            print(f"       Medicamentos: {meds}")
            print(f"       Recomendacao: {rec}")
            print()

    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(teste_sistema_completo())