# Motor de IA

Pipeline de análise clínica do NesisAI. Recebe `{ paciente, medicacoes }` e retorna lista de alertas classificados por severidade.

## Fluxo

```
payload (paciente + medicacoes)
        │
        ▼
normalize()    ─┐  Gemini padroniza nomes comerciais → DCB
                │
                ▼
verify()       ─┐  Busca k=4 docs no pgvector via RAG
                │  Gemini analisa prescrição com contexto injetado
                ▼
[alertas]         severidade + mecanismo + recomendação + fonte
```

Em caso de falha do LLM, o pipeline degrada graciosamente devolvendo lista vazia em vez de quebrar a UI (ver `pipeline.py`).

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `pipeline.py` | Orquestrador `analyze()` — chama normalize → verify |
| `normalizer.py` | LLM normaliza texto livre da prescrição para DCB |
| `verifier.py` | Recupera contexto do pgvector e gera alertas via LLM |
| `vectorstore.py` | Cliente pgvector via `langchain-postgres` |
| `embeddings.py` | `GeminiEmbeddings` — wrapper sobre `google-genai` |
| `prompts.py` | System prompts de normalização e verificação |

## Modelos

- **LLM**: `gemini-2.5-flash` (configurável via `GEMINI_MODEL`)
- **Embeddings**: `models/gemini-embedding-001` (configurável via `GEMINI_EMBEDDING_MODEL`)
- **SDK**: `google-genai` (a `google.generativeai` deprecated **não** é usada)

## Vector store

- Coleção: `nesis_knowledge_base`
- Backend: pgvector via `langchain-postgres`
- Conexão: `PGVECTOR_URL` (host `postgres` no Docker, `localhost` fora)
- População: `backend/scripts/ingest_knowledge.py` faz upsert pelo `id` da entrada

## Contrato

```python
async def analyze(payload: dict) -> list[dict]:
    """payload = { 'paciente': {...}, 'medicacoes': [...] }
       retorno  = [ { severidade, mecanismo, recomendacao, fonte, ... } ]
    """
```

Mantido estável para preservar contrato com `app.prescriptions.service`.

## Não usar

- `google.generativeai` (biblioteca deprecated)
- BioBERTpt, ChemicalX/RDKit, Neo4j, Celery/Redis, MLflow — todos descartados na v2
