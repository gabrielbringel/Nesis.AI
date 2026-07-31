# NesisAI

NesisAI is an AI-powered clinical copilot that detects prescription errors and drug interactions in real time. It integrates with Brazil's e-SUS APS electronic health record workflow through a Chrome extension.

## Project Overview

NesisAI is a clinical decision support system (CDSS) designed for physicians working in primary health care within Brazil's Unified Health System. It appears as a side panel alongside the e-SUS APS patient record and provides:

1. **Automatic Patient Record Detection**: the Chrome extension recognizes an e-SUS APS page and extracts patient and prescription data in real time.
2. **Hybrid LLM + RAG Analysis**: the AI engine combines Google Gemini with a cardiovascular knowledge base indexed in pgvector.
3. **Severity-Based Alerts**: findings are displayed using the Portuguese labels `GRAVE` (severe), `MODERADO` (moderate), or `LEVE` (mild), together with a clinical recommendation and an explicit source citation.
4. **Human Review**: an editable drawer allows the physician to correct the extracted data and run the analysis again.

### Brazilian Health Care Context

- **SUS (Sistema Único de Saúde, or Unified Health System)** is Brazil's publicly funded, universal health care system. It provides care free at the point of service across the country.
- **APS (Atenção Primária à Saúde, or Primary Health Care)** is the first level of care within SUS. It covers services such as prevention, routine appointments, chronic disease management, and referrals to specialized care.
- **e-SUS APS** is a digital health strategy and software ecosystem maintained by Brazil's Ministry of Health for recording and managing primary care information. Its electronic patient record is used by public primary care teams throughout Brazil, including those working in local community clinics known as *Unidades Básicas de Saúde* (UBS).
- **DCB (Denominações Comuns Brasileiras, or Brazilian Common Denominations)** is Brazil's official naming standard for pharmaceutical substances. NesisAI maps brand names to these standardized nonproprietary names before performing its analysis.

NesisAI is designed to fit into this existing clinical workflow and support—not replace—a health professional's judgment.

> [!IMPORTANT]
> NesisAI is a hackathon prototype. It has not been clinically validated or approved as a medical device and must not be used as the sole basis for patient-care decisions.

## Key Features

- Automatic detection of e-SUS APS patient records through Chrome Manifest V3 `host_permissions`
- Structured DOM scraping using mapped XPaths with a heuristic fallback
- LLM-based normalization of brand names to DCB-standard substance names
- Clinical verification using Gemini 2.5 Flash and RAG over a cardiovascular knowledge base containing 41 entries
- Automatic severity classification using the Portuguese UI labels `GRAVE` / `MODERADO` / `LEVE`, with source citations
- Editable side drawer for correcting extracted data and rerunning the analysis without scraping the page again
- Analysis history and settings stored locally in the browser using `localStorage`

## Technology Stack

### Backend

- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 16 + pgvector
- **ORM and migrations**: SQLAlchemy 2 (async) + Alembic
- **AI**: Google Gemini 2.5 Flash + `models/gemini-embedding-001`
- **RAG**: LangChain + langchain-postgres

### Frontend

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Platform**: Chrome Extension Manifest V3 + Side Panel API

### Infrastructure

- Docker + Docker Compose using named volumes (`pgvector/pgvector:pg16`)

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js `^20.19.0` or `>=22.12.0` (required by Vite 8)
- Google Chrome
- A Google AI Studio API key

### Backend

```bash
cd backend
cp .env.example .env   # Add your GEMINI_API_KEY
docker compose up --build
```

Once the services are running, populate the knowledge base:

```bash
docker exec -it backend-backend-1 python scripts/ingest_knowledge.py
```

For configuration details, environment variables, and troubleshooting, see [`backend/README_DOCKER.md`](backend/README_DOCKER.md).

### Frontend

```bash
cd frontend
npm install
npm run build:extension
```

Open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose the `frontend/dist/` directory.

For development and build details, see [`frontend/README.md`](frontend/README.md).

## Knowledge Base (Vector Database)

The project includes 41 curated entries focused on the Brazilian cardiovascular care context, with particular emphasis on interactions involving antiarrhythmic and antihypertensive drugs. The source data is stored in [`backend/data/cardio_knowledge.json`](backend/data/cardio_knowledge.json).

| Prefix | Category | Entries |
|---|---|---:|
| `INT` | Drug interactions | 16 |
| `CON` | Contraindications | 8 |
| `IDO` | Geriatric considerations | 8 |
| `REN` | Renal function dose adjustments | 5 |
| `SUP` | Supplement-related alerts | 4 |

## Documentation

| Document | Contents |
|---|---|
| [`backend/README.md`](backend/README.md) | Setup, main endpoint, and quick validation |
| [`backend/README_DOCKER.md`](backend/README_DOCKER.md) | Docker Compose, volumes, and troubleshooting |
| [`backend/README_DEV.md`](backend/README_DEV.md) | Local development, Alembic, and tests |
| [`backend/app/motor/README.md`](backend/app/motor/README.md) | AI pipeline, models, and data contract |
| [`frontend/README.md`](frontend/README.md) | Extension build, state flow, and project structure |
| [`CLAUDE.md`](CLAUDE.md) | Technical context, v2 stack, and project rules |

## License

This project was developed as a hackathon prototype. No license has been specified yet.
