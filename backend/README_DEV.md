# Nesis — Backend Development Guide

This guide covers running the backend directly on the host. The recommended demo workflow uses Docker; see [`README_DOCKER.md`](README_DOCKER.md).

## Prerequisites

- Python 3.11+
- PostgreSQL 16 with pgvector if you want local RAG retrieval, or the PostgreSQL service from `docker-compose.yml`
- A Google AI Studio API key

## Environment Setup

### macOS and Linux

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

cp .env.example .env
# Set GEMINI_API_KEY, DATABASE_URL, and PGVECTOR_URL in .env
```

### Windows PowerShell

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Use the commands above on Windows; obsolete SQLite setup scripts have been removed.

## Environment Variables

For a backend process running on the host:

```env
DATABASE_URL=postgresql+asyncpg://nesis:nesis@localhost:5432/nesis
PGVECTOR_URL=postgresql+psycopg://nesis:nesis@localhost:5432/nesis
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.5-flash
APP_ENV=development
```

The two database URLs use different drivers:

- `DATABASE_URL` uses `asyncpg` for the application database and Alembic.
- `PGVECTOR_URL` uses synchronous `psycopg`; vector searches are moved to a worker thread so they do not block FastAPI's event loop.

When code runs inside Docker, replace the database host `localhost` with the Compose service name `postgres`.


## Database Migrations

Migration files live in `alembic/versions/`.

```bash
alembic upgrade head
alembic current
alembic revision -m "describe the change"
alembic downgrade -1
```

The Docker image runs `alembic upgrade head` automatically at startup.

## Start the API

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API: `http://localhost:8000`
- OpenAPI UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

## Populate the Knowledge Base

With pgvector reachable through `PGVECTOR_URL`:

```bash
python scripts/ingest_knowledge.py
```

The script embeds 41 entries in small batches and stores them in the `nesis_knowledge_base` collection.

## Tests

```bash
pytest
pytest tests/test_prescriptions.py -v
pytest -k "test_name"
```

Tests use pytest-asyncio and HTTPX with a simulated AI engine configured in [`tests/conftest.py`](tests/conftest.py). They verify the API contract without PostgreSQL, Gemini credentials, or external requests. They do not evaluate clinical accuracy.

## Application Structure

```text
app/
├── main.py                # FastAPI application, CORS, and error handlers
├── config.py              # pydantic-settings configuration
├── database.py            # Shared SQLAlchemy declarative base
├── common.py              # Shared utilities
├── models.py              # ORM models
├── motor/                 # Gemini + RAG pipeline
└── prescriptions/
    ├── router.py          # POST /api/v1/analyze
    ├── service.py         # Pipeline invocation and severity totals
    ├── schemas.py         # Pydantic v2 request/response models
    └── models.py
```

## Logs

`app/main.py` configures the root log level as `INFO`. To confirm a successful RAG lookup, look for:

```text
RAG retrieved N documents for: ...
```

## Troubleshooting

**`GEMINI_API_KEY is not set`**

Set `GEMINI_API_KEY` in `backend/.env` before starting the process.

**`PGVECTOR_URL` fails with host `postgres`**

The backend is running outside Docker. Use `localhost` as the hostname.

**`langchain_pg_embedding` does not exist after migrations**

The table is created by langchain-postgres during vector-store initialization. Run `python scripts/ingest_knowledge.py`.

**An import references `google.generativeai`**

The project uses the newer `google-genai` package for embeddings. Do not introduce the deprecated SDK.
