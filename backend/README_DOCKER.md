# NesisAI — Docker

Guia para subir o backend e o banco via Docker Compose. É o fluxo recomendado para desenvolvimento e demos.

## Pré-requisitos

- Docker e Docker Compose instalados
- Arquivo `backend/.env` configurado (a partir de `.env.example`) com `GEMINI_API_KEY`

## Serviços

`docker-compose.yml` define dois serviços:

| Serviço | Imagem | Porta | Descrição |
|---|---|---|---|
| `postgres` | `pgvector/pgvector:pg16` | `5432` | PostgreSQL 16 com extensão pgvector já instalada |
| `backend` | build local (`Dockerfile`) | `8000` | API FastAPI com Uvicorn em modo `--reload` |

> **Importante**: a imagem do Postgres é `pgvector/pgvector:pg16`, **não** `postgres:16`. A oficial não traz a extensão.

## Volumes

```yaml
volumes:
  pgdata:    # named volume gerenciado pelo Docker
```

Sempre **named volumes**, nunca bind mounts. Bind mounts (`./postgres-data:/var/lib/postgresql/data`) quebram com `Operation not permitted` em alguns setups de macOS.

## Comandos

```bash
cd backend

# Subir tudo (build + start em foreground)
docker compose up --build

# Em background
docker compose up -d

# Acompanhar logs
docker compose logs -f backend
docker compose logs -f postgres

# Parar (mantém volumes)
docker compose down

# Parar e apagar dados do banco
docker compose down -v

# Rebuild só do backend
docker compose build backend

# Reiniciar um serviço
docker compose restart backend
```

## Startup do backend

O `CMD` do `Dockerfile` executa, em ordem:

1. `alembic upgrade head` — aplica migrações
2. `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

O `depends_on` com `condition: service_healthy` garante que o backend só sobe depois do `pg_isready` do Postgres responder OK.

## Acessar os serviços

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`
- Postgres (do host): `localhost:5432` (user `nesis`, senha `nesis`, db `nesis`)

## Variáveis de ambiente

O `docker-compose.yml` injeta:

```env
DATABASE_URL=postgresql+asyncpg://nesis:nesis@postgres:5432/nesis
PGVECTOR_URL=postgresql+psycopg://nesis:nesis@postgres:5432/nesis
APP_ENV=development
```

Note que dentro dos containers o host do Postgres é `postgres` (nome do serviço), não `localhost`.

`GEMINI_API_KEY`, `GEMINI_MODEL` e `GEMINI_EMBEDDING_MODEL` vêm do `.env` carregado automaticamente pelo Compose.

## Popular a base de conhecimento

Com os containers em execução, o nome do container do backend costuma ser `backend-backend-1` (verificar com `docker ps`):

```bash
docker exec -it backend-backend-1 python scripts/ingest_knowledge.py

# Validar
docker exec -it backend-postgres-1 psql -U nesis -d nesis -c \
  "SELECT COUNT(*) FROM langchain_pg_embedding;"
```

Resultado esperado: `41`.

## Acessar o psql

```bash
docker exec -it backend-postgres-1 psql -U nesis -d nesis
```

Comandos úteis:

```sql
\dt                                          -- listar tabelas
SELECT COUNT(*) FROM langchain_pg_embedding; -- ver embeddings ingeridos
SELECT version();                            -- versão do Postgres
SELECT * FROM pg_extension WHERE extname = 'vector';  -- confirmar pgvector
```

## Limpar e recomeçar

```bash
docker compose down -v        # apaga o volume pgdata
docker compose up --build     # rebuild + start
# Re-ingerir a base de conhecimento depois
```

## Troubleshooting

**`pgvector extension does not exist`** — você está usando a imagem `postgres:16` em vez de `pgvector/pgvector:pg16`. Conferir o `docker-compose.yml`.

**Backend não conecta no Postgres** — o `depends_on.condition: service_healthy` deveria evitar isso. Se acontecer, conferir os logs do `postgres` e o `healthcheck`.

**Mudança no `requirements.txt` não tem efeito** — `docker compose build backend` (ou `--build` no `up`) para refazer a imagem.

**Hot reload não pega mudanças do código** — o `Dockerfile` faz `COPY . .` e o volume bind do código está comentado no `docker-compose.yml`. Para iterar com reload real, descomentar a linha `volumes: - ./:/app` no serviço `backend`.

**Permissão negada no volume `pgdata`** — não trocar por bind mount. Named volume é a escolha correta.
