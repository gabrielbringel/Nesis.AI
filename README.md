<div align="center">
  <img src="docs/readme-hero.svg" alt="Nesis — copiloto clínico para revisão de prescrições" width="100%" />
  <br /><br />
  <p>
    <code>CHROME EXTENSION</code>&nbsp;&nbsp;·&nbsp;&nbsp;
    <code>FASTAPI</code>&nbsp;&nbsp;·&nbsp;&nbsp;
    <code>RAG + PGVECTOR</code>&nbsp;&nbsp;·&nbsp;&nbsp;
    <code>GEMINI</code>
  </p>
  <p><a href="#interface">Interface</a> · <a href="#quick-start">Quick start</a> · <a href="#architecture">Architecture</a> · <a href="#project-status">Project status</a></p>
</div>

Built during a hackathon, Nesis explores how prescription review can fit into a physician's existing workflow. A Chrome side panel reads an e-SUS APS encounter, sends structured clinical data to an AI pipeline, and presents alerts with severity, explanations, recommendations, and source labels. Physicians can review the extracted data, edit it, and request another analysis.

> **Hackathon prototype.** This project has not been clinically validated. Use fictional data for development and demonstrations; it is not ready for patient-care decisions.

<a id="interface"></a>

## 01 · Interface

Actual frontend captures using the fictional examples bundled with the project. The results shown are saved demo records, not a live model evaluation.

<table>
  <tr>
    <th>Start an analysis</th>
    <th>Review a result</th>
    <th>Browse local history</th>
  </tr>
  <tr>
    <td><img src="docs/images/sidebar-idle.png" alt="Nesis side panel in its initial state" width="280" /></td>
    <td><img src="docs/images/sidebar-results.png" alt="Saved fictional analysis with an expanded alert" width="280" /></td>
    <td><img src="docs/images/sidebar-history.png" alt="Local history drawer with fictional cases" width="280" /></td>
  </tr>
</table>

The UI includes light and dark themes, editable patient and prescription details, and dedicated states for missing data, unavailable services, unsupported pages, and empty results. Typography combines Roboto Serif, DM Sans, DM Mono, and Google Sans.

## 02 · What it does

- Extracts encounter data from supported e-SUS pages using mapped XPaths and heuristic fallbacks.
- Normalizes medication names to Brazilian Common Denominations (DCB).
- Retrieves context from 41 cardiovascular knowledge entries stored in PostgreSQL with pgvector.
- Generates alerts labeled **GRAVE**, **MODERADO**, or **LEVE**.
- Lets the user correct extracted data and reanalyze without scraping again.
- Keeps analysis history and settings in browser `localStorage`.

## 03 · Brazilian Health Care Context

**SUS** is Brazil's public health system. **APS** refers to primary health care, and **e-SUS APS** is the Ministry of Health's digital health ecosystem for that setting. Nesis targets the encounter workflow in its electronic patient record. **DCB** is Brazil's standardized nomenclature for pharmaceutical substances.

The interface and API field names are in Brazilian Portuguese.

<a id="architecture"></a>

## 04 · Architecture

```mermaid
flowchart LR
    A[e-SUS encounter] -->|DOM extraction| B[Chrome side panel]
    B -->|POST /api/v1/analyze| C[FastAPI]
    C --> D[Medication normalization]
    D --> E[Context retrieval]
    F[(PostgreSQL + pgvector)] --> E
    E --> G[Clinical verification]
    G -->|Alerts by severity| B
    B --> H[Local history]
```

| Layer | Implementation |
|---|---|
| Extension | React 18, TypeScript, Vite 8, Manifest V3, Side Panel API |
| API | FastAPI, Pydantic, SQLAlchemy, Alembic |
| AI | Gemini chat through LangChain; embeddings through `google-genai` |
| Retrieval | `langchain-postgres`, PostgreSQL 16, pgvector |
| Local infrastructure | Docker Compose with a named database volume |

The implemented engine still uses Gemini. Self-hosted models, AWS deployment, and additional record-system adapters are potential next steps, not shipped features.

<a id="quick-start"></a>

## 05 · Quick start

### Explore the frontend without a backend

Requires Node.js `^20.19.0` or `>=22.12.0` and npm.

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite. Use the top-left menu to open the fictional history and select a saved result. You can inspect the UI without an API key. Running a new analysis requires the backend; extracting a record requires the installed Chrome extension.

### Run the backend

Requires Docker Compose and a Gemini API key for model calls and knowledge ingestion.

```bash
cd backend
cp .env.example .env
# Set GEMINI_API_KEY in .env.
docker compose up --build
```

In another terminal, populate the knowledge base:

```bash
cd backend
docker compose exec backend python scripts/ingest_knowledge.py
```

API documentation: [localhost:8000/docs](http://localhost:8000/docs). Health endpoint: [localhost:8000/health](http://localhost:8000/health).

The `.env` file is supplied at runtime and excluded from the Docker image. Database data persists in a named volume. Rebuild the image after backend source changes.

### Install the extension

```bash
cd frontend
npm run build:extension
```

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Choose **Load unpacked** and select `frontend/dist/`.
3. Open a supported e-SUS encounter and click the Nesis icon.
4. Start the analysis from the side panel.

The current scraper checks for `lista-atendimento/atendimento` in the active URL. Access also depends on the manifest's host permissions. The API address is currently fixed to `http://localhost:8000`.

## 06 · Development checks

Frontend type checking and extension build:

```bash
cd frontend
npm run build:extension
```

Backend API tests, after installing `backend/requirements.txt` in a virtual environment:

```bash
cd backend
python -m pytest
```

The API tests replace the AI engine with deterministic responses. They require no database or model credentials and do not measure clinical accuracy.

## 07 · Repository map

```text
backend/
  app/motor/           Normalization, prompts, retrieval, verification
  app/prescriptions/   API schemas, route, and response aggregation
  data/                Cardiovascular knowledge base
  scripts/             Knowledge ingestion
  tests/               API contract tests
  alembic/             Database migrations
frontend/
  src/components/      Sidebar, drawer, alerts, and UI states
  src/scraper/         e-SUS DOM extraction
  src/stores/          Local history and settings
  public/              Extension manifest, service worker, and icons
docs/images/           Frontend screenshots for this README
pitch/                 Original hackathon presentation
```

<a id="project-status"></a>

## 08 · Project status

This repository preserves the working hackathon scope. Important limitations:

- Some engine failures currently produce an empty alert list, indistinguishable from a completed analysis with no alerts.
- Retrieval falls back to model knowledge when the vector store is unavailable; source labels are not independently verified citations.
- Scraping depends on the e-SUS page structure and has not been generalized to other record systems.
- History contains bundled fictional examples and is stored locally. Resetting memory restores those examples while keeping settings.
- Patient data is not anonymized. Excluding the name from the verification prompt does not sanitize free-text fields or the API payload.
- The `analises` database schema exists, but analysis persistence is disabled; the active history is in the browser.

## 09 · Further reading

- [Backend and API contract](backend/README.md)
- [Docker workflow](backend/README_DOCKER.md)
- [Backend development](backend/README_DEV.md)
- [AI pipeline and failure behavior](backend/app/motor/README.md)
- [Extension development](frontend/README.md)
- [Original hackathon pitch](pitch/nesis_pitch.html)
- [Repository context](AGENTS.md)

## License

No license has been selected yet. Public availability of the repository does not grant an open-source license.
