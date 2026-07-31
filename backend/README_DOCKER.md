# NesisAI — Docker Guide

This is the recommended workflow for running the backend and its databases during development and demos.

## Prerequisites

- Docker with Docker Compose
- `backend/.env`, copied from `.env.example`, with a valid `GEMINI_API_KEY`

## Services

`docker-compose.yml` defines two services:

| Service | Image | Host port | Purpose |
|---|---|---:|---|
| `postgres` | `pgvector/pgvector:pg16` | `5432` | PostgreSQL 16 with the pgvector extension |
| `backend` | Local `Dockerfile` build | `8000` | FastAPI served by Uvicorn |

The pgvector image is required because the standard `postgres:16` image does not include the vector extension.

## Persistent Data

PostgreSQL data is stored in the Docker-managed named volume `pgdata`:

```yaml
volumes:
  pgdata:
```

The project intentionally avoids host bind mounts. As a consequence, source changes require rebuilding the backend image.

## Commands

Run these commands from `backend/`:

```bash
# Build and start in the foreground
docker compose up --build

# Start existing images in the background
docker compose up -d

# Follow logs
docker compose logs -f backend
docker compose logs -f postgres

# Stop services but retain database data
docker compose down

# Rebuild the backend after source or dependency changes
docker compose build backend
docker compose up -d backend

# Restart a service without rebuilding it
docker compose restart backend
```

The following command deletes the Compose-managed database volume and all of its data:

```bash
docker compose down -v
```

## Backend Startup

The backend container performs these operations in order:

1. `alembic upgrade head`
2. `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

The `depends_on` health condition waits for PostgreSQL's `pg_isready` check before starting the backend.

Because application source is copied into the image and is not bind-mounted, Uvicorn's `--reload` option only observes files already inside the container. Rebuild the image to apply host-side edits.

## Service Access

- API: `http://localhost:8000`
- OpenAPI UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`
- PostgreSQL from the host: `localhost:5432`

The default database name, user, and password are all `nesis`. Override them in `.env` when needed.

Inside the Compose network, both connection URLs use `postgres` as the hostname:

```env
DATABASE_URL=postgresql+asyncpg://nesis:nesis@postgres:5432/nesis
PGVECTOR_URL=postgresql+psycopg://nesis:nesis@postgres:5432/nesis
```

## Populate the Knowledge Base

With both services running:

```bash
docker compose exec backend python scripts/ingest_knowledge.py
```

Validate the stored embeddings:

```bash
docker compose exec postgres \
  psql -U nesis -d nesis \
  -c "SELECT COUNT(*) FROM langchain_pg_embedding;"
```

The expected count is 41 after the first complete ingestion.

## Open a PostgreSQL Shell

```bash
docker compose exec postgres psql -U nesis -d nesis
```

Useful queries:

```sql
\dt
SELECT COUNT(*) FROM langchain_pg_embedding;
SELECT version();
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## Reset the Local Database

This permanently removes the local Compose database and then recreates it:

```bash
docker compose down -v
docker compose up --build
docker compose exec backend python scripts/ingest_knowledge.py
```

## Troubleshooting

**`extension "vector" is not available`**

Confirm that `docker-compose.yml` uses `pgvector/pgvector:pg16`.

**The backend cannot connect to PostgreSQL**

Inspect `docker compose logs postgres`, confirm the health check passes, and verify that container-side URLs use the hostname `postgres`.

**A dependency change has no effect**

Run `docker compose build backend`, then recreate the backend service.

**A source change has no effect**

Rebuild the backend image. The current Compose configuration does not mount host source into the container.

**The embedding table is missing**

Run the ingestion command. langchain-postgres creates its internal tables when the vector store initializes.
