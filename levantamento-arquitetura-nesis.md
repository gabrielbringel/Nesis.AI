# Levantamento factual — Nesis

Repo em `/Users/bringel/Documents/Coding/Nesis`, branch `bringel` (HEAD), último commit `39a7162` de 2026-07-31.

Cada afirmação abaixo cita arquivo e linha. Onde não há evidência no código, está escrito explicitamente **não encontrado**.

---

## Stack

**Linguagens e versões**

| Item | Valor | Evidência |
|---|---|---|
| Python | 3.11-slim (imagem base) | `backend/Dockerfile:1` |
| TypeScript | ^5.4.5 | `frontend/package.json:25` |
| React | ^18.3.1 | `frontend/package.json:14-15` |
| Vite | ^8.0.10 | `frontend/package.json:26` |
| Tailwind | ^3.4.4 | `frontend/package.json:24` |
| Manifest Chrome | v3, extensão v0.3.0 | `frontend/public/manifest.json:2,4` |

Não há `pyproject.toml`, `setup.cfg` nem `tox.ini` — **não encontrado**. Dependências Python só em `backend/requirements.txt` (18 linhas), todas com `>=`, sem lockfile.

**Backend / ASGI**

- FastAPI `>=0.111.0` (`requirements.txt:1`), instanciado em `backend/app/main.py:28`.
- Servidor ASGI: **uvicorn[standard] >=0.29.0** (`requirements.txt:2`), rodado como `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` (`Dockerfile:15` e `docker-compose.yml:36-37`). O `--reload` está ativo também no comando do container.
- Middleware CORS com `allow_origins=["*"]` (`main.py:41-46`).
- 3 exception handlers registrados (`main.py:67-94`).

**Banco / ORM / migrations**

- SQLAlchemy 2.0 async + asyncpg (`requirements.txt:3-4`), `create_async_engine` em `backend/app/database.py:28`. Testes usam SQLite/aiosqlite (`database.py:19-27`).
- **1 migration**, `backend/alembic/versions/0001_initial.py`. Ela cria: `CREATE EXTENSION IF NOT EXISTS vector` (linha 24) e **1 tabela** — `analises`, com 4 colunas: `id` (Uuid PK), `created_at` (timestamptz, default `now()`), `payload` (JSONB), `resposta` (JSONB) (linhas 26-37).
- Entidade central única no ORM: `Analise` (`backend/app/prescriptions/models.py:17-21`). `app/models.py` exporta só ela.
- As tabelas `langchain_pg_collection` / `langchain_pg_embedding` **não estão nas migrations** — são criadas em runtime pelo langchain-postgres (`backend/app/motor/vectorstore.py:4-6`).
- **A tabela `analises` nunca é escrita.** `service.py:6-8` diz explicitamente que a persistência está desligada, e não há nenhuma chamada de sessão/commit no fluxo (`service.py:19-29`).

**Frontend da extensão**

React 18 + TypeScript, build via Vite (`tsc && vite build`, `package.json:8-9`), `base: './'` obrigatório para extensão (`vite.config.ts:10`). Não é vanilla JS. 30 arquivos `.tsx` + 13 `.ts` em `frontend/src`. Estado em hooks + dois stores de localStorage (`stores/historyStore.ts`, `stores/settingsStore.ts`) — sem Redux/Zustand nas dependências.

**Infra**

- `docker-compose.yml`: **2 serviços** — `postgres` (imagem `pgvector/pgvector:pg16`, healthcheck `pg_isready`, named volume `pgdata`) e `backend` (build local, `depends_on: service_healthy`, porta 8000). Bind mount comentado nas linhas 33-34.
- **CI/CD: não encontrado** — não existe `.github/`, nem GitLab CI, nem outro runner.
- **IaC: não encontrado** — nenhum `.tf`, `fly.toml`, `render.yaml`, `vercel.json`, `Procfile`.
- **Config de provedor cloud: não encontrado.** O único serviço externo é a API do Gemini.
- Scripts de apoio: 3 `.ps1` em `backend/scripts/` (Windows) + `check_env.py`.

---

## Pipeline de RAG

**Vector store**: PGVector via `langchain-postgres >=0.0.12`, coleção `nesis_knowledge_base` (`vectorstore.py:38,56-61`). Driver **psycopg síncrono**, com a busca embrulhada em `asyncio.to_thread` para não bloquear o event loop (`vectorstore.py:79`) — a justificativa (asyncpg quebra com multi-statement em prepared statements) está documentada em `vectorstore.py:8-14`. Recuperação: `similarity_search`, `k=4` (`verifier.py:26`, `vectorstore.py:68`). Tipo de índice (HNSW/IVFFlat) e métrica de distância: **não encontrado** — ficam no default do langchain-postgres, nada é declarado no código.

**Embedding**: `models/gemini-embedding-001` (`embeddings.py:26`), classe custom `GeminiEmbeddings` implementando a interface `Embeddings` do LangChain, sobre o SDK `google-genai` (`embeddings.py:18-19,29`). Usa `task_type` diferenciado: `RETRIEVAL_DOCUMENT` na ingestão e `RETRIEVAL_QUERY` na consulta (`embeddings.py:46,54`). **Dimensionalidade: não encontrado** — nenhum `output_dimensionality`, `embedding_length` ou número de dimensões aparece em qualquer arquivo do repo.

**Chunking: não existe.** Não há nenhum text splitter no repositório (zero ocorrências de `TextSplitter`, `chunk_size`, `chunk_overlap`). Cada entrada do JSON vira **1 Document inteiro**, com `page_content` montado por template de 4 campos — título + mecanismo + consequência + recomendação (`scripts/ingest_knowledge.py:69-73`). Logo: **41 documentos = 41 chunks indexados**.

**LLM**: `gemini-2.5-flash` (valor real em `backend/.env`; o default em código é `gemini-2.0-flash`, `config.py:24`). Chamado via `ChatGoogleGenerativeAI.ainvoke` do `langchain-google-genai`, em duas instâncias singleton com temperaturas distintas: **0.0** na normalização (`normalizer.py:33`) e **0.1** na verificação (`verifier.py:39`). Duas chamadas de LLM por análise, sequenciais (`pipeline.py:29-30`). Ambas as etapas parseiam JSON com strip manual de code fence e degradam sem exceção quando o JSON é inválido (`normalizer.py:37-43,70-79`; `verifier.py:139-159`).

**Tamanho da base**: 41 entradas em `backend/data/cardio_knowledge.json`, IDs únicos, 9 campos por entrada. Ingestão em lotes de 5 com `sleep(2)` para evitar 429 (`ingest_knowledge.py:123-129`), usando `add_documents(ids=...)` para upsert idempotente.

- Por tipo: interação 16, contraindicação 8, ajuste_idoso 8, ajuste_renal 5, superdosagem 4.
- Por severidade no JSON: GRAVE 18, MODERADO 18, LEVE 5.
- **24 strings de fonte distintas** — mas são strings livres, com duplicatas semânticas não normalizadas (`PCDT Antitrombóticos` e `PCDT Antitrombóticos MS`; `Diretriz SBC`, `Diretriz SBC de IC`, `Diretriz SBC sobre Antiagregantes`). Contando entidades reais, ficam ~15-18. As mais frequentes: Micromedex (5), UpToDate (5), Diretriz Brasileira de Hipertensão 2020 (3), Bula Profissional (3), Critérios de Beers 2023 (3).

Dois artefatos órfãos: `backend/app/motor/banco_conhecimento_sus.json` (32 entradas, 13 KB) e `backend/app/motor/vetores_db/` (4 `.bin`, 172 KB, layout de índice Chroma) estão versionados mas **nenhum código os referencia**.

**Rastreabilidade até a fonte**: implementada por prompt, não por código. O `fonte` de cada entrada vai para o `metadata` do Document (`ingest_knowledge.py:80`), é renderizado num cabeçalho `[id] tipo=... | severidade=... | medicamentos=... | fonte=...` acima de cada trecho recuperado (`verifier.py:93-100`), e o system prompt instrui o modelo a copiar o `fonte=` do documento mais específico para o campo `fonte` do alerta, ou preencher `"Conhecimento geral do modelo"` quando o contexto não cobrir o caso (`prompts.py:69-80`). **Não há verificação programática** de que a `fonte` devolvida corresponde a algum documento realmente recuperado — o schema só aplica um default `"Base de conhecimento"` (`schemas.py:54`).

**Severidade — 100% modelo, sem regra.** O LLM escolhe o nível segundo as definições textuais em `prompts.py:61-67`. A única lógica em código é um filtro de pertinência ao conjunto `{GRAVE, MODERADO, LEVE}`, que descarta alertas com severidade fora dele (`verifier.py:25,159,162-166`). A severidade que vem do JSON da base viaja apenas como texto no prompt — não sobrescreve nem restringe a saída. Não é híbrido: **não há rules engine no código**. A docstring de `app/motor/Teste.py:4` menciona um "fallback deterministico (Rules Engine)", mas ele não existe em `pipeline.py` — em caso de exceção o pipeline devolve lista vazia (`pipeline.py:33-35`).

---

## Extensão Chrome

**Permissions** (`manifest.json:6`): `sidePanel`, `tabs`, `scripting`, `storage` — 4.

**host_permissions** (linhas 7-14): 6 padrões — `https://*.esusaps.gov.br/*`, `https://*.saude.gov.br/*`, `http://*/lista-atendimento/atendimento*`, `http://localhost/*`, `http://localhost:8080/*`, `http://127.0.0.1/*`.

**Integração com o eSUS**: não há `content_scripts` declarados no manifest — **não encontrado**. A injeção é sob demanda, via `chrome.scripting.executeScript({ target: { tabId }, func: scrapeESUSData })` disparada do side panel (`hooks/useSidebar.ts:316-319`), com gate de URL por regex `/lista-atendimento\/atendimento/` (`useSidebar.ts:12,310`). Não há API do eSUS: é **DOM scraping por XPath absoluto**, em `frontend/src/scraper/esus-scraper.ts` (226 linhas). São ~13 XPaths hardcoded para nome, idade, sexo, peso, altura, alergias, SOAP (S/O/A), problemas, medicamentos em uso e a lista de prescrições (linhas 66-77, 106-137, 159). Há dois níveis de degradação: XPath alternativo por ID legado (linhas 170-177) e um fallback heurístico que varre `div/p/span/h4/h5/li` procurando texto com unidade de dose por regex `\b(mg|ml|mcg|g|comprimidos?|gotas?|ui|cps|cápsulas?|ampolas?|frascos?)\b` (linhas 184-204). O service worker (`public/background.js`, 20 linhas) só faz `setPanelBehavior({ openPanelOnActionClick: true })`; os padrões de URL nele estão marcados como PLACEHOLDER (linhas 3-5).

**PII — não há remoção de PII em lugar nenhum do código.** Busca por `anonim|pii|mask|redact|sanitiz|despersonaliz|cpf|cns` em todo `frontend/src`, `backend/app` e `backend/scripts`: **zero ocorrências**. Concretamente:

- O nome do paciente é scrapeado (`esus-scraper.ts:79`), entra no payload como `paciente.nome` (`useSidebar.ts:113`) e trafega para `POST /api/v1/analyze`.
- É aceito e validado pelo backend como campo obrigatório (`schemas.py:29`) e logado inteiro em `logger.info(json.dumps(raw_payload...))` (`router.py:26-29`).
- É persistido em `localStorage` no histórico da sidebar (`useSidebar.ts:210-217` → `historyStore.ts:29`).
- **A única omissão é no prompt do LLM**: `_serializar_paciente` monta o bloco clínico sem o nome, e a docstring justifica isso como redundância/viés — não como privacidade (`verifier.py:65-82`). O `verifier` também não recebe peso/altura de forma anonimizada; só o nome fica de fora.

Não há definição de PII no código. Nenhum campo é marcado como sensível, nenhum é filtrado antes do envio.

---

## Escopo do código

**Linhas por linguagem** (arquivos versionados via `git ls-files`, binários excluídos):

| Linguagem | Linhas | Arquivos |
|---|---:|---:|
| TSX (React) | 2.385 | 30 |
| TypeScript | 1.657 | 13 |
| Python | 1.428 | 23 |
| Markdown | 1.010 | 7 |
| JSON (dados/config) | 796 | 5 |
| CSS | 246 | 1 |
| PowerShell | 136 | 3 |
| JavaScript | 34 | 3 |
| YAML / INI / outros | ~135 | 8 |
| **Total sem HTML e lockfile** | **~7.900** | |

HTML soma 2.513 linhas, mas **2.494 são o `pitch/nesis_pitch.html`** (deck de apresentação, não produto); `frontend/index.html` tem 18 linhas. O `package-lock.json` (3.076 linhas) está fora da conta. Código-fonte propriamente dito: **4.021 linhas** em `frontend/src` (TS+TSX) e **1.425 linhas** de Python em `backend/`.

**Endpoints: 3.** `GET /` (`main.py:51`), `GET /health` (`main.py:60`), `POST /api/v1/analyze` (`prescriptions/router.py:17`). Nenhum outro router é incluído.

**Testes: 5 casos, 1 arquivo** — `backend/tests/test_prescriptions.py` (67 linhas) + `conftest.py` (68 linhas) com fixtures de SQLite em memória e `ASGITransport`. **Cobertura: não encontrada** — não há `pytest-cov` em `requirements.txt`, nem `.coveragerc`, nem relatório. Dois pontos verificáveis que valem saber antes de citar os testes num currículo:

1. Não existe `pytest.ini`/`pyproject.toml`, logo `asyncio_mode` não está configurado e os testes `async def` sem decorator dependem do modo auto do pytest-asyncio.
2. As asserções são hardcoded contra a versão stub do motor — `len(body["alertas"]) == 3` e `total_grave == 1` (linhas 39, 46-48) — enquanto o `service.py` atual chama o motor real com Gemini, cuja saída é não-determinística.

A suíte não foi executada neste levantamento.

**Git**: 484 commits em todas as refs (458 no HEAD `bringel`, 363 na `main`), período 2026-03-27 a 2026-07-31, 7 branches (`main`, `bringel`, `bringelFront`, `Ricardo`, `marco`, `yasmin`). **5 identidades de autor, 4 pessoas** — você aparece com 3 identidades (`Gabriel Bringel <gbringelgoncalves@gmail.com>` 353, `bringel <gbringelgoncalves@gmail.com>` 45, `Gabriel Bringel <84107653+gabrielbringel@...>` 31).

**Commits seus: 429 de 484 = 88,6%.** Considerando só a `main`: **317 de 363 = 87,3%**. Os demais: Ricardo Bezerra 48, Marco Gadelha 7.

---

## Latência

**Não existe nenhuma medição de latência no repositório.** Busca por `latenc|time.time|perf_counter|elapsed|duration|benchmark|timeit|performance.now|p95|tempo de resposta` em todo `backend/app`, `backend/scripts`, `backend/tests`, `frontend/src`, `frontend/public` e nos 7 arquivos Markdown: **zero ocorrências**. Não há middleware de timing no FastAPI, não há log de duração, não há teste de performance, não há benchmark.

Os únicos usos de tempo no código são não-instrumentais: `time.sleep(2)` como rate-limit da ingestão (`ingest_knowledge.py:129`) e os timers cosméticos da animação de bullets na sidebar — `baseInterval` de 650-1000 ms e um teto `maxTotalMs = 10000` (`useSidebar.ts:264-267`), que são valores de UI escolhidos a priori, **não medições**. Qualquer número de latência num currículo teria que ser medido agora, não extraído deste repo.

---

## Nota para o currículo

Dois números que se sustentam sozinhos numa entrevista: **88,6% de 484 commits** e o **pipeline de 2 chamadas de LLM com recuperação k=4 sobre 41 documentos**.

O que evitar afirmar sem medir: qualquer coisa sobre latência, cobertura de testes, ou "validação clínica" — a severidade e a citação de fonte são produzidas pelo modelo, com validação em código limitada a um filtro de enum.
