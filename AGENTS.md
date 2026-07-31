# AGENTS.md — NesisAI

Guia de contexto para o Codex trabalhar no projeto NesisAI.

---

## O que é o NesisAI

Copiloto clínico para médicos da Atenção Primária à Saúde (APS) do SUS. Detecta erros de prescrição e interações medicamentosas em tempo real, operando como uma **extensão Chrome** que aparece como sidebar ao lado do prontuário do eSUS.

---

## Stack v2 (atual)

### Backend
- **FastAPI** — API REST assíncrona
- **PostgreSQL + pgvector** — banco principal + vector store para RAG
- **Alembic** — migrações
- **Docker** — containerização (usar named volumes, NÃO bind mounts)
- Endpoint principal: `POST /api/v1/analyze`

### Motor de IA
- **Gemini 2.5 Flash** (`gemini-2.5-flash`) — normalização de texto clínico + verificação
- **RAG com pgvector** — base de conhecimento cardiovascular (41 entradas)
- **LangChain + langchain-postgres** — integração vectorstore
- **GeminiEmbeddings** (classe customizada em `backend/app/motor/embeddings.py`) usando `models/gemini-embedding-001`
- Embeddings: biblioteca `google-genai` (nova) — **NUNCA usar `google.generativeai` (deprecated)**

### Frontend
- **React 18 + TypeScript + Vite**
- **Tailwind CSS** (utilitários apenas)
- **Extensão Chrome Manifest V3 + Side Panel API**
- Sidebar com 4 estados: idle → lendo → analisando → resultado
- Drawer lateral com histórico e configurações

---

## O que foi REMOVIDO da v1 (não reintroduzir)

- BioBERTpt
- ChemicalX / RDKit
- Neo4j
- Celery / Redis
- MLflow

---

## Fluxo completo

```
médico abre prontuário no eSUS
        ↓
extensão detecta a página (content script)
        ↓
scraping do DOM (medicações, alergias, dados do paciente)
        ↓
envia para POST /api/v1/analyze
        ↓
LLM normaliza os dados (Gemini)
        ↓
RAG busca na base cardiovascular (pgvector)
        ↓
LLM verifica e gera alertas com fonte citada
        ↓
alertas classificados aparecem na sidebar:
  🔴 GRAVE — alergia, superdosagem, contraindicação absoluta
  🟡 MODERADO — interação significativa, dose limítrofe
  🟢 LEVE — informativo, duplicidade menor
```

---

## Estrutura do repositório

```
Nesis.AI/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── motor/
│   │   │   ├── __init__.py
│   │   │   ├── pipeline.py
│   │   │   ├── normalizer.py
│   │   │   ├── verifier.py
│   │   │   ├── vectorstore.py
│   │   │   ├── embeddings.py      ← GeminiEmbeddings (google-genai)
│   │   │   └── prompts.py
│   │   └── prescriptions/
│   │       ├── schemas.py
│   │       ├── service.py
│   │       └── router.py
│   ├── data/
│   │   └── cardio_knowledge.json  ← base RAG (41 entradas cardiovasculares)
│   ├── scripts/
│   │   └── ingest_knowledge.py    ← popula pgvector
│   ├── docker-compose.yml
│   └── .env                       ← NÃO commitar
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.tsx
    │   │   ├── SidebarHeader.tsx
    │   │   ├── SidebarFooter.tsx
    │   │   ├── Drawer.tsx
    │   │   ├── AlertCard.tsx
    │   │   ├── ActionButton.tsx
    │   │   ├── IconButton.tsx
    │   │   └── states/
    │   │       ├── IdleState.tsx
    │   │       ├── ReadingState.tsx
    │   │       ├── AnalyzingState.tsx
    │   │       └── ResultsState.tsx
    │   ├── hooks/
    │   │   ├── useSidebar.ts
    │   │   └── useDrawer.ts
    │   └── stores/
    │       └── settingsStore.ts    ← autoRead, darkMode (localStorage)
    └── public/
        ├── manifest.json           ← Manifest V3
        └── background.js           ← service worker
```

---

## Variáveis de ambiente (backend/.env)

```env
# Banco
DATABASE_URL=postgresql+asyncpg://nesis:nesis@postgres:5432/nesis
PGVECTOR_URL=postgresql+psycopg://nesis:nesis@postgres:5432/nesis

# Gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash

# App
APP_ENV=development
```

---

## Comandos úteis

```bash
# Subir backend
cd backend && docker compose up

# Popular base de conhecimento (após subir o Docker)
docker exec -it backend-backend-1 python scripts/ingest_knowledge.py

# Verificar embeddings no banco
docker exec -it backend-postgres-1 psql -U nesis -d nesis -c "SELECT COUNT(*) FROM langchain_pg_embedding;"

# Buildar extensão Chrome
cd frontend && npm run build:extension

# Instalar extensão
# chrome://extensions → Modo do desenvolvedor → Carregar sem compactação → frontend/dist/
```

---

## Design system

| Elemento | Fonte |
|---|---|
| Headings, botões | Instrument Serif |
| UI geral | DM Sans |
| Dados clínicos, mono | DM Mono |

**Cores de alerta:**
- 🔴 GRAVE: `#E24B4A`
- 🟡 MODERADO: `#EF9F27`
- 🟢 LEVE: `#639922`

**Modo:** Light mode apenas (dark mode é flag implementado, sem aplicação visual ainda)

---

## Regras importantes

- **Hackathon** — não sugerir autenticação real, protocolos avançados, ou features de produção
- **Nunca usar `google.generativeai`** — usar `google.genai` (nova biblioteca)
- **Nunca usar bind mounts no Docker** — usar named volumes
- **CORS está liberado** com `allow_origins=["*"]` — não alterar
- O histórico e configurações usam `localStorage` — sem backend para isso ainda
- O mock de login ainda não foi implementado — há um placeholder no rodapé do drawer