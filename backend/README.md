# Nesis Backend

API FastAPI + motor de IA com Gemini, RAG via pgvector e fallback determinístico.

## Setup local

```sh
cd backend
cp .env.example .env   # editar GEMINI_API_KEY e ajustar PGVECTOR_URL
docker-compose up -d
```

A API sobe em http://localhost:8000 e a doc Swagger em http://localhost:8000/docs.

## Base de conhecimento (RAG)

A coleção `nesis_knowledge_base` no pgvector é populada a partir de
`backend/data/cardio_knowledge.json` pelo script `scripts/ingest_knowledge.py`.

### Ingerir/atualizar a base

Dentro do container backend (use o nome real do container — `docker ps`):

```sh
docker exec -it backend-backend-1 python scripts/ingest_knowledge.py
```

Localmente (com `PGVECTOR_URL=postgresql+psycopg://nesis:nesis@localhost:5432/nesis`):

```sh
cd backend
python scripts/ingest_knowledge.py
```

O script faz upsert pelo `id` da entrada — re-rodar atualiza embeddings sem duplicar.

### PGVECTOR_URL — host certo para o cenário

- Dentro do Docker: `postgres` (nome do serviço no `docker-compose.yml`)
- Fora do Docker: `localhost`

## Pipeline do motor

1. `normalize()` — Gemini padroniza nomes para DCB
2. `verify()` — Busca k=4 documentos no pgvector e injeta no prompt do Gemini
3. Fallback determinístico (`rules_engine.py`) se o Gemini falhar

## Validação

```sh
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "paciente": {"idade": 65, "alergias": []},
    "medicacoes": [
      {"nome": "Enalapril", "dose": "10mg", "frequencia": "1x/dia", "via": "oral"},
      {"nome": "Espironolactona", "dose": "25mg", "frequencia": "1x/dia", "via": "oral"}
    ]
  }'
```

Nos logs do backend, procurar pela linha `RAG recuperou N documentos para a query: ...`
para confirmar que o pgvector está sendo consultado.
