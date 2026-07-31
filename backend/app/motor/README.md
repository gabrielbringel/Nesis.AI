# AI Engine

NesisAI's clinical analysis pipeline accepts the Portuguese-keyed `{ paciente, medicacoes }` payload and returns clinical alerts classified by severity.

`DCB` refers to *Denominações Comuns Brasileiras* (Brazilian Common Denominations), Brazil's official standard for pharmaceutical substance names.

## Pipeline

```text
patient + medications
          |
          v
normalize()       Gemini maps brand names to DCB substance names
          |
          v
search_context()  pgvector retrieves the four most similar entries
          |
          v
verify()          Gemini analyzes the prescription with the retrieved context
          |
          v
alerts            severity, description, recommendation, source, and drugs involved
```

Failure behavior is intentionally defensive:

- If normalization fails or Gemini returns invalid normalization JSON, the original medication list continues to verification.
- If vector retrieval is unavailable, verification continues without retrieved documents and asks the model to use its clinical knowledge.
- If verification raises an exception, the top-level pipeline logs the error and returns an empty alert list.
- If verification returns invalid JSON, it returns an empty alert list.

An empty list therefore means either “no alerts” or “analysis failed.” The current API contract does not distinguish those outcomes.

## Files

| File | Responsibility |
|---|---|
| `pipeline.py` | Orchestrates `normalize()` followed by `verify()` |
| `normalizer.py` | Normalizes free-text medication data to DCB names |
| `verifier.py` | Retrieves context and generates alerts |
| `vectorstore.py` | Configures langchain-postgres and runs similarity search |
| `embeddings.py` | Implements LangChain's embedding interface with `google-genai` |
| `prompts.py` | Portuguese normalization and verification prompts |

## Models and SDKs

- **LLM**: configured by `GEMINI_MODEL`; `.env.example` selects `gemini-2.5-flash`
- **Embeddings**: fixed in code as `models/gemini-embedding-001`
- **Chat integration**: `langchain-google-genai`
- **Embedding SDK**: `google-genai`

The current code does not read `GEMINI_EMBEDDING_MODEL`, even though that variable appears in `.env.example`.

## Vector Store

- Collection: `nesis_knowledge_base`
- Storage: PostgreSQL + pgvector through `langchain-postgres`
- Connection: `PGVECTOR_URL`
- Retrieval depth: four documents per analysis
- Ingestion: `backend/scripts/ingest_knowledge.py`

The vector store uses synchronous psycopg calls. Similarity searches run through `asyncio.to_thread()` to avoid blocking FastAPI's event loop.

Use the Compose hostname `postgres` from inside Docker and `localhost` from a host process.

## Contract

```python
async def analyze(payload: dict[str, Any]) -> list[dict[str, Any]]:
    ...
```

Each valid alert must use one of the Portuguese severity values `GRAVE`, `MODERADO`, or `LEVE`. The service layer then validates each item against `app.prescriptions.schemas.Alerta`.

Expected alert fields:

```text
severidade
titulo
descricao
fonte
medicamentos_envolvidos
recomendacao
```

## Out-of-Scope Legacy Components

Do not reintroduce components removed from v1:

- BioBERTpt
- ChemicalX or RDKit
- Neo4j
- Celery or Redis
- MLflow

Do not import the deprecated `google.generativeai` SDK for embeddings.
