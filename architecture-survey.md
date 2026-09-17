# Factual survey — Nesis

Repo at `/Users/bringel/Documents/Coding/Nesis`, branch `bringel` (HEAD), last commit `39a7162` from 2026-07-31.

Every claim below cites a file and line. Where the code provides no evidence, it says **not found** explicitly.

> This is a snapshot from that commit. Some details (for example, the test count and the missing `pytest.ini`) have changed since.

---

## Stack

**Languages and versions**

| Item | Value | Evidence |
|---|---|---|
| Python | 3.11-slim (base image) | `backend/Dockerfile:1` |
| TypeScript | ^5.4.5 | `frontend/package.json:25` |
| React | ^18.3.1 | `frontend/package.json:14-15` |
| Vite | ^8.0.10 | `frontend/package.json:26` |
| Tailwind | ^3.4.4 | `frontend/package.json:24` |
| Chrome manifest | v3, extension v0.3.0 | `frontend/public/manifest.json:2,4` |

There is no `pyproject.toml`, `setup.cfg`, or `tox.ini` — **not found**. Python dependencies live only in `backend/requirements.txt` (18 lines), all pinned with `>=`, with no lockfile.

**Backend / ASGI**

- FastAPI `>=0.111.0` (`requirements.txt:1`), instantiated in `backend/app/main.py:28`.
- ASGI server: **uvicorn[standard] >=0.29.0** (`requirements.txt:2`), run as `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` (`Dockerfile:15` and `docker-compose.yml:36-37`). `--reload` is also on in the container command.
- CORS middleware with `allow_origins=["*"]` (`main.py:41-46`).
- 3 registered exception handlers (`main.py:67-94`).

**Database / ORM / migrations**

- SQLAlchemy 2.0 async + asyncpg (`requirements.txt:3-4`), `create_async_engine` in `backend/app/database.py:28`. Tests use SQLite/aiosqlite (`database.py:19-27`).
- **1 migration**, `backend/alembic/versions/0001_initial.py`. It creates `CREATE EXTENSION IF NOT EXISTS vector` (line 24) and **1 table** — `analises` (analyses), with 4 columns: `id` (UUID PK), `created_at` (timestamptz, default `now()`), `payload` (JSONB), `resposta` (response, JSONB) (lines 26-37).
- Single core ORM entity: `Analise` (`backend/app/prescriptions/models.py:17-21`). `app/models.py` exports only that.
- The `langchain_pg_collection` / `langchain_pg_embedding` tables **are not in the migrations** — langchain-postgres creates them at runtime (`backend/app/motor/vectorstore.py:4-6`).
- **The `analises` table is never written.** `service.py:6-8` states that persistence is disabled, and the flow makes no session/commit call (`service.py:19-29`).

**Extension frontend**

React 18 + TypeScript, built with Vite (`tsc && vite build`, `package.json:8-9`), with `base: './'` required for the extension (`vite.config.ts:10`). Not vanilla JS. 30 `.tsx` files + 13 `.ts` files in `frontend/src`. State lives in hooks + two localStorage stores (`stores/historyStore.ts`, `stores/settingsStore.ts`) — no Redux/Zustand in the dependencies.

**Infrastructure**

- `docker-compose.yml`: **2 services** — `postgres` (image `pgvector/pgvector:pg16`, `pg_isready` healthcheck, named volume `pgdata`) and `backend` (local build, `depends_on: service_healthy`, port 8000). Bind mount commented out on lines 33-34.
- **CI/CD: not found** — no `.github/`, GitLab CI, or other runner.
- **IaC: not found** — no `.tf`, `fly.toml`, `render.yaml`, `vercel.json`, or `Procfile`.
- **Cloud provider config: not found.** The only external service is the Gemini API.
- Support scripts: 3 `.ps1` files in `backend/scripts/` (Windows) + `check_env.py`.

---

## RAG pipeline

**Vector store**: PGVector via `langchain-postgres >=0.0.12`, collection `nesis_knowledge_base` (`vectorstore.py:38,56-61`). **Synchronous psycopg** driver, with the search wrapped in `asyncio.to_thread` so it does not block the event loop (`vectorstore.py:79`) — the rationale (asyncpg breaks on multi-statement prepared statements) is documented in `vectorstore.py:8-14`. Retrieval: `similarity_search`, `k=4` (`verifier.py:26`, `vectorstore.py:68`). Index type (HNSW/IVFFlat) and distance metric: **not found** — they use langchain-postgres defaults; nothing is declared in code.

**Embedding**: `models/gemini-embedding-001` (`embeddings.py:26`), custom `GeminiEmbeddings` class implementing LangChain's `Embeddings` interface on top of the `google-genai` SDK (`embeddings.py:18-19,29`). It uses distinct `task_type` values: `RETRIEVAL_DOCUMENT` for ingestion and `RETRIEVAL_QUERY` for queries (`embeddings.py:46,54`). **Dimensionality: not found** — no `output_dimensionality`, `embedding_length`, or dimension count appears anywhere in the repo.

**Chunking: none.** The repository has no text splitter (zero occurrences of `TextSplitter`, `chunk_size`, `chunk_overlap`). Each JSON entry becomes **1 whole Document**, with `page_content` built from a 4-field template — title + mechanism + consequence + recommendation (`scripts/ingest_knowledge.py:69-73`). So: **41 documents = 41 indexed chunks**.

**LLM**: `gemini-2.5-flash` (actual value in `backend/.env`; the code default is `gemini-2.0-flash`, `config.py:24`). Called through `ChatGoogleGenerativeAI.ainvoke` from `langchain-google-genai`, as two singleton instances with different temperatures: **0.0** for normalization (`normalizer.py:33`) and **0.1** for verification (`verifier.py:39`). Two sequential LLM calls per analysis (`pipeline.py:29-30`). Both steps parse JSON after manually stripping code fences and degrade without raising when the JSON is invalid (`normalizer.py:37-43,70-79`; `verifier.py:139-159`).

**Knowledge base size**: 41 entries in `backend/data/cardio_knowledge.json`, unique IDs, 9 fields per entry. Ingestion runs in batches of 5 with `sleep(2)` to avoid 429s (`ingest_knowledge.py:123-129`), using `add_documents(ids=...)` for idempotent upserts.

- By type: interaction 16, contraindication 8, older-adult adjustment 8, renal adjustment 5, overdose 4.
- By severity in the JSON: GRAVE 18, MODERADO 18, LEVE 5.
- **24 distinct source strings** — but they are free text, with unnormalized semantic duplicates (`PCDT Antitrombóticos` and `PCDT Antitrombóticos MS`; `Diretriz SBC`, `Diretriz SBC de IC`, `Diretriz SBC sobre Antiagregantes`). Counting real entities, there are ~15-18. Most frequent: Micromedex (5), UpToDate (5), Diretriz Brasileira de Hipertensão 2020 (3), Bula Profissional (3), Beers Criteria 2023 (3).

Two orphaned artifacts: `backend/app/motor/banco_conhecimento_sus.json` (32 entries, 13 KB) and `backend/app/motor/vetores_db/` (4 `.bin` files, 172 KB, Chroma index layout) are versioned, but **no code references them**.

**Traceability to the source**: implemented through the prompt, not code. Each entry's `fonte` (source) goes into the Document `metadata` (`ingest_knowledge.py:80`), is rendered in a `[id] tipo=... | severidade=... | medicamentos=... | fonte=...` header above each retrieved passage (`verifier.py:93-100`), and the system prompt tells the model to copy `fonte=` from the most specific document into the alert's `fonte` field, or to fill in `"Conhecimento geral do modelo"` (general model knowledge) when the context does not cover the case (`prompts.py:69-80`). **There is no programmatic check** that the returned `fonte` matches a document that was actually retrieved — the schema only applies a `"Base de conhecimento"` default (`schemas.py:54`).

**Severity — 100% model, no rules.** The LLM picks the level from the textual definitions in `prompts.py:61-67`. The only code logic is a membership filter on `{GRAVE, MODERADO, LEVE}` that drops alerts with any other severity (`verifier.py:25,159,162-166`). The severity stored in the knowledge base JSON travels only as text in the prompt — it neither overrides nor constrains the output. It is not hybrid: **there is no rules engine in the code**. The docstring in `app/motor/Teste.py:4` mentions a "deterministic fallback (Rules Engine)", but it does not exist in `pipeline.py` — on an exception, the pipeline returns an empty list (`pipeline.py:33-35`).

---

## Chrome extension

**Permissions** (`manifest.json:6`): `sidePanel`, `tabs`, `scripting`, `storage` — 4.

**host_permissions** (lines 7-14): 6 patterns — `https://*.esusaps.gov.br/*`, `https://*.saude.gov.br/*`, `http://*/lista-atendimento/atendimento*`, `http://localhost/*`, `http://localhost:8080/*`, `http://127.0.0.1/*`.

**e-SUS integration**: the manifest declares no `content_scripts` — **not found**. Injection is on demand, via `chrome.scripting.executeScript({ target: { tabId }, func: scrapeESUSData })` triggered from the side panel (`hooks/useSidebar.ts:316-319`), gated on the URL by the regex `/lista-atendimento\/atendimento/` (`useSidebar.ts:12,310`). There is no e-SUS API: this is **DOM scraping with absolute XPaths**, in `frontend/src/scraper/esus-scraper.ts` (226 lines). About 13 XPaths are hardcoded for name, age, sex, weight, height, allergies, SOAP (S/O/A), problems, current medications, and the prescription list (lines 66-77, 106-137, 159). There are two degradation levels: an alternative XPath based on a legacy ID (lines 170-177) and a heuristic fallback that scans `div/p/span/h4/h5/li` for text containing a dose unit, using the regex `\b(mg|ml|mcg|g|comprimidos?|gotas?|ui|cps|cápsulas?|ampolas?|frascos?)\b` (lines 184-204). The service worker (`public/background.js`, 20 lines) only calls `setPanelBehavior({ openPanelOnActionClick: true })`; its URL patterns are marked PLACEHOLDER (lines 3-5).

**PII — no PII removal anywhere in the code.** A search for `anonim|pii|mask|redact|sanitiz|despersonaliz|cpf|cns` across `frontend/src`, `backend/app`, and `backend/scripts`: **zero occurrences**. Specifically:

- The patient's name is scraped (`esus-scraper.ts:79`), enters the payload as `paciente.nome` (`useSidebar.ts:113`), and is sent to `POST /api/v1/analyze`.
- The backend accepts and validates it as a required field (`schemas.py:29`) and logs it in full with `logger.info(json.dumps(raw_payload...))` (`router.py:26-29`).
- It is persisted in `localStorage` in the sidebar history (`useSidebar.ts:210-217` → `historyStore.ts:29`).
- **The only omission is in the LLM prompt**: `_serializar_paciente` builds the clinical block without the name, and the docstring justifies this as redundancy/bias — not privacy (`verifier.py:65-82`). The `verifier` does not anonymize weight/height either; only the name is left out.

The code has no definition of PII. No field is marked sensitive, and none is filtered before sending.

---

## Code scope

**Lines by language** (files tracked by `git ls-files`, binaries excluded):

| Language | Lines | Files |
|---|---:|---:|
| TSX (React) | 2,385 | 30 |
| TypeScript | 1,657 | 13 |
| Python | 1,428 | 23 |
| Markdown | 1,010 | 7 |
| JSON (data/config) | 796 | 5 |
| CSS | 246 | 1 |
| PowerShell | 136 | 3 |
| JavaScript | 34 | 3 |
| YAML / INI / other | ~135 | 8 |
| **Total excluding HTML and lockfile** | **~7,900** | |

HTML adds 2,513 lines, but **2,494 of them are `pitch/nesis_pitch.html`** (the presentation deck, not the product); `frontend/index.html` has 18 lines. `package-lock.json` (3,076 lines) is excluded. Actual source code: **4,021 lines** in `frontend/src` (TS+TSX) and **1,425 lines** of Python in `backend/`.

**Endpoints: 3.** `GET /` (`main.py:51`), `GET /health` (`main.py:60`), `POST /api/v1/analyze` (`prescriptions/router.py:17`). No other router is included.

**Tests: 5 cases, 1 file** — `backend/tests/test_prescriptions.py` (67 lines) + `conftest.py` (68 lines) with in-memory SQLite fixtures and `ASGITransport`. **Coverage: not found** — no `pytest-cov` in `requirements.txt`, no `.coveragerc`, and no report. Two verifiable points worth knowing before citing the tests on a résumé:

1. There is no `pytest.ini`/`pyproject.toml`, so `asyncio_mode` is not configured, and the `async def` tests without a decorator rely on pytest-asyncio's auto mode.
2. The assertions are hardcoded against the stub version of the engine — `len(body["alertas"]) == 3` and `total_grave == 1` (lines 39, 46-48) — while the current `service.py` calls the real Gemini engine, whose output is nondeterministic.

The suite was not run for this survey.

**Git**: 484 commits across all refs (458 on HEAD `bringel`, 363 on `main`), from 2026-03-27 to 2026-07-31, 7 branches (`main`, `bringel`, `bringelFront`, `Ricardo`, `marco`, `yasmin`). **5 author identities, 4 people** — you appear under 3 identities (`Gabriel Bringel <gbringelgoncalves@gmail.com>` 353, `bringel <gbringelgoncalves@gmail.com>` 45, `Gabriel Bringel <84107653+gabrielbringel@...>` 31).

**Your commits: 429 of 484 = 88.6%.** On `main` only: **317 of 363 = 87.3%**. The rest: Ricardo Bezerra 48, Marco Gadelha 7.

---

## Latency

**The repository contains no latency measurement.** A search for `latenc|time.time|perf_counter|elapsed|duration|benchmark|timeit|performance.now|p95|tempo de resposta` across `backend/app`, `backend/scripts`, `backend/tests`, `frontend/src`, `frontend/public`, and the 7 Markdown files: **zero occurrences**. There is no FastAPI timing middleware, no duration logging, no performance test, and no benchmark.

The only uses of time in the code are non-instrumental: `time.sleep(2)` as an ingestion rate limit (`ingest_knowledge.py:129`) and the cosmetic timers for the sidebar bullet animation — a `baseInterval` of 650-1000 ms and a `maxTotalMs = 10000` cap (`useSidebar.ts:264-267`), which are UI values chosen up front, **not measurements**. Any latency figure on a résumé would have to be measured now, not taken from this repo.

---

## Résumé note

Two numbers that hold up on their own in an interview: **88.6% of 484 commits** and the **2-LLM-call pipeline with k=4 retrieval over 41 documents**.

Avoid claiming anything without measuring it first: latency, test coverage, or "clinical validation" — severity and source citations are produced by the model, and code-level validation is limited to an enum filter.
