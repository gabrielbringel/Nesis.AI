# AGENTS.md — Nesis

Context guide for Codex when working on the Nesis project.

---

## What Nesis is

A clinical copilot for physicians in primary care (APS, *Atenção Primária à Saúde*) within SUS, Brazil's public health system. It detects prescribing errors and drug interactions in real time, running as a **Chrome extension** that opens as a side panel next to the e-SUS APS patient record.

---

## Stack v2 (current)

### Backend
- **FastAPI** — async REST API
- **PostgreSQL + pgvector** — main database + vector store for RAG
- **Alembic** — migrations
- **Docker** — containerization (use named volumes, NOT bind mounts)
- Main endpoint: `POST /api/v1/analyze`

### AI engine
- **Gemini 2.5 Flash** (`gemini-2.5-flash`) — clinical text normalization + verification
- **RAG with pgvector** — cardiovascular knowledge base (41 entries)
- **LangChain + langchain-postgres** — vector store integration
- **GeminiEmbeddings** (custom class in `backend/app/motor/embeddings.py`) using `models/gemini-embedding-001`
- Embeddings: the new `google-genai` library — **NEVER use `google.generativeai` (deprecated)**

### Frontend
- **React 18 + TypeScript + Vite**
- **Tailwind CSS** (utilities only)
- **Chrome extension, Manifest V3 + Side Panel API**
- Sidebar with 4 states: idle → reading → analyzing → results
- Side drawer with history and settings

---

## Removed in v1 (do not reintroduce)

- BioBERTpt
- ChemicalX / RDKit
- Neo4j
- Celery / Redis
- MLflow

---

## End-to-end flow

```
physician opens a patient record in e-SUS APS
        ↓
extension detects the page
        ↓
DOM scraping (medications, allergies, patient data)
        ↓
sends to POST /api/v1/analyze
        ↓
LLM normalizes the data (Gemini)
        ↓
RAG searches the cardiovascular base (pgvector)
        ↓
LLM verifies and generates alerts with a cited source
        ↓
classified alerts appear in the sidebar:
  🔴 GRAVE (severe) — allergy, overdose, absolute contraindication
  🟡 MODERADO (moderate) — significant interaction, borderline dose
  🟢 LEVE (mild) — informational, minor duplication
```

---

## Language

- Documentation, code comments, docstrings, and log messages are in English.
- The UI, Gemini prompts, API field names, severity values, knowledge base, and demo data stay in Brazilian Portuguese, the language of the users and the source records.

---

## Repository structure

```
Nesis/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── motor/                 ← AI engine
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
│   │   └── cardio_knowledge.json  ← RAG base (41 cardiovascular entries)
│   ├── scripts/
│   │   └── ingest_knowledge.py    ← populates pgvector
│   ├── docker-compose.yml
│   └── .env                       ← DO NOT commit
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
    │   ├── scraper/
    │   │   └── esus-scraper.ts    ← e-SUS APS DOM extraction
    │   └── stores/
    │       └── settingsStore.ts   ← autoRead, darkMode (localStorage)
    └── public/
        ├── manifest.json          ← Manifest V3
        └── background.js          ← service worker
```

---

## Environment variables (backend/.env)

```env
# Database
DATABASE_URL=postgresql+asyncpg://nesis:nesis@postgres:5432/nesis
PGVECTOR_URL=postgresql+psycopg://nesis:nesis@postgres:5432/nesis

# Gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash

# App
APP_ENV=development
```

---

## Useful commands

```bash
# Start the backend
cd backend && docker compose up

# Populate the knowledge base (after Docker is up)
docker exec -it backend-backend-1 python scripts/ingest_knowledge.py

# Check embeddings in the database
docker exec -it backend-postgres-1 psql -U nesis -d nesis -c "SELECT COUNT(*) FROM langchain_pg_embedding;"

# Build the Chrome extension
cd frontend && npm run build:extension

# Install the extension
# chrome://extensions → Developer mode → Load unpacked → frontend/dist/
```

---

## Design system

| Element | Font |
|---|---|
| Headings | Roboto Serif |
| Buttons | Google Sans (fallback: DM Sans) |
| General UI | DM Sans |
| Clinical data, mono | DM Mono |

**Alert colors:**
- 🔴 GRAVE: `#E24B4A`
- 🟡 MODERADO: `#EF9F27`
- 🟢 LEVE: `#639922`

**Themes:** light and dark modes are implemented in `frontend/src/index.css` and selectable in settings.

---

## Important rules

- **Hackathon** — do not suggest real authentication, advanced protocols, or production features
- **Never use `google.generativeai`** — use `google.genai` (the new library)
- **Never use bind mounts in Docker** — use named volumes
- **CORS is open** with `allow_origins=["*"]` — do not change it
- History and settings use `localStorage` — no backend for them yet
- The login mock is not implemented yet — there is a placeholder in the drawer footer
