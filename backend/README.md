# NesisAI — Backend

API FastAPI que recebe payloads scrapeados pela extensão Chrome e devolve alertas clínicos via motor de IA (Gemini + RAG sobre pgvector).

## Setup

```bash
cd backend
cp .env.example .env   # editar GEMINI_API_KEY
docker compose up --build
```

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

Migrações Alembic rodam automaticamente no startup do container.

## Endpoint principal

```
POST /api/v1/analyze
```

Recebe `{ paciente, medicacoes }` e retorna lista de alertas com `severidade`, `mecanismo`, `recomendacao` e `fonte`.

## Base de conhecimento (RAG)

A coleção `nesis_knowledge_base` no pgvector é populada a partir de `data/cardio_knowledge.json` (41 entradas) pelo script `scripts/ingest_knowledge.py`.

Com o backend em execução:

```bash
docker exec -it backend-backend-1 python scripts/ingest_knowledge.py

# Verificar
docker exec -it backend-postgres-1 psql -U nesis -d nesis -c \
  "SELECT COUNT(*) FROM langchain_pg_embedding;"
```

O script faz upsert pelo `id` da entrada — re-rodar atualiza embeddings sem duplicar.

## PGVECTOR_URL

- Dentro do Docker: host `postgres` (nome do serviço)
- Fora do Docker: host `localhost`

## Estrutura

```
backend/
├── app/
│   ├── main.py            # FastAPI entrypoint
│   ├── config.py          # Settings (pydantic-settings)
│   ├── database.py        # SQLAlchemy async
│   ├── motor/             # Pipeline de IA — ver app/motor/README.md
│   └── prescriptions/     # Domínio + router /api/v1/analyze
├── data/
│   └── cardio_knowledge.json
├── scripts/
│   └── ingest_knowledge.py
├── alembic/               # Migrações
├── docker-compose.yml
└── requirements.txt
```

## Stack

- FastAPI + SQLAlchemy 2 (async) + Alembic
- PostgreSQL 16 com extensão pgvector (`pgvector/pgvector:pg16`)
- LangChain + langchain-postgres (vector store)
- Google Gemini 2.5 Flash via `google-genai`
- Docker Compose com named volumes

## Validação rápida

```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "paciente": {
      "nome": "Roberto Ferreira",
      "idade": 65,
      "sexo": "H",
      "peso": "70kg",
      "altura": "170cm",
      "alergias": [],
      "problemas_condicoes": ["Hipertensão", "Insuficiência cardíaca"],
      "med_em_uso": []
    },
    "medicacoes": [
      {"nome": "Enalapril", "dose": "10mg", "frequencia": "1x/dia", "via": "oral"},
      {"nome": "Espironolactona", "dose": "25mg", "frequencia": "1x/dia", "via": "oral"}
    ]
  }'
```

Schema (ver `app/prescriptions/schemas.py`):

- `paciente.nome` (string, **obrigatório**)
- `paciente.idade` (int 0–130, **obrigatório**)
- `paciente.sexo`, `peso`, `altura`, `motivo_consulta`, `objetivo`, `avaliacao` (opcionais)
- `paciente.alergias`, `problemas_condicoes`, `med_em_uso` (listas de string)
- `medicacoes[].nome` (string, **obrigatório**) + `dose`, `frequencia`, `via`, `posologia_completa` (opcionais)

Nos logs, procurar `RAG recuperou N documentos para a query: ...` para confirmar consulta ao pgvector.

Para detalhes de desenvolvimento, ver [`README_DEV.md`](./README_DEV.md).
