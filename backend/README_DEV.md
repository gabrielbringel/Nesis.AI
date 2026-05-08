# NesisAI — Backend Dev Guide

Guia de desenvolvimento do backend sem Docker (venv local). Para o fluxo padrão com Docker, ver [`README_DOCKER.md`](./README_DOCKER.md).

## Pré-requisitos

- Python 3.11+
- PostgreSQL 16 com extensão `pgvector` (se quiser RAG localmente — ou usar o Postgres do Docker)
- API key do Google Gemini

## Setup do ambiente

### macOS / Linux

```bash
cd backend

python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

cp .env.example .env
# Editar .env: GEMINI_API_KEY e PGVECTOR_URL
```

### Windows (PowerShell)

```powershell
cd backend
.\scripts\start.ps1
```

O script `start.ps1` cuida de venv, dependências, migrações e startup do servidor.

## Variáveis de ambiente

`PGVECTOR_URL` precisa apontar para o host certo:

- Postgres rodando localmente: `postgresql+psycopg://nesis:nesis@localhost:5432/nesis`
- Postgres do `docker-compose` (acessado a partir do host): `postgresql+psycopg://nesis:nesis@localhost:5432/nesis`
- Backend rodando dentro do Docker (chamando o serviço `postgres`): `postgresql+psycopg://nesis:nesis@postgres:5432/nesis`

Demais variáveis estão em [`.env.example`](./.env.example).

## Migrações

Migrações Alembic ficam em `alembic/versions/`. Rodar manualmente:

```bash
alembic upgrade head        # aplica todas
alembic revision -m "msg"   # cria nova revisão
alembic downgrade -1        # reverte uma
alembic current             # mostra revisão atual
```

No fluxo Docker, `alembic upgrade head` roda automaticamente no `CMD` do `Dockerfile`.

## Iniciar o servidor

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## Popular a base de conhecimento (RAG)

Com o pgvector acessível via `PGVECTOR_URL`:

```bash
python scripts/ingest_knowledge.py
```

O script faz upsert pelo `id` da entrada — re-rodar atualiza embeddings sem duplicar.

## Verificar ambiente

```bash
python scripts/check_env.py
```

Valida dependências, banco e variáveis críticas.

## Testes

```bash
pytest                      # roda todos
pytest tests/test_prescriptions.py -v
pytest -k "nome_do_teste"
```

Configuração em `tests/conftest.py`. Suíte usa `pytest-asyncio` + `httpx`.

## Estrutura do app

```
app/
├── main.py                # FastAPI entrypoint, CORS, error handlers
├── config.py              # Settings (pydantic-settings)
├── database.py            # SQLAlchemy async setup
├── common.py              # Utilitários compartilhados
├── models.py              # ORM models
├── motor/                 # Pipeline de IA (ver app/motor/README.md)
└── prescriptions/         # Domínio prescrições
    ├── router.py          # POST /api/v1/analyze
    ├── service.py         # Lógica de negócio
    ├── schemas.py         # Pydantic v2
    └── models.py
```

## Logs

`app/main.py` configura `logging.basicConfig(level=INFO)` antes de qualquer logger ser instanciado, para que os `logger.info()` do motor apareçam.

Para confirmar que o RAG está consultando o pgvector, procurar nos logs:

```
RAG recuperou N documentos para a query: ...
```

## Troubleshooting

**`google.generativeai` aparece em algum import** — usar somente `google-genai`. A biblioteca antiga é deprecated e está banida no projeto.

**`PGVECTOR_URL` falhando com host `postgres`** — você está rodando fora do Docker. Trocar para `localhost`.

**Migração aplica mas tabela `langchain_pg_embedding` não existe** — ela é criada pelo `langchain-postgres` na primeira ingestão; rodar `python scripts/ingest_knowledge.py`.

**Bind mount falhando no macOS com "Operation not permitted"** — o `docker-compose.yml` usa named volume (`pgdata`) justamente para evitar isso. Não trocar por bind mount.
