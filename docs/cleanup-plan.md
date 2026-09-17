# Repository cleanup plan

Scope: finish the hackathon repository cleanup, preserve existing behavior, and make the project easier to install, inspect, and present. AWS deployment, model training, clinical-engine redesign, and additional EHR adapters are separate work.

## Work packages

| Work package | Owner | Deliverable | Acceptance criteria |
|---|---|---|---|
| Backend review | Backend agent | Review removals, configuration, API validation, and tests; remove remaining unused database helpers | API tests pass without external calls; Alembic metadata remains available |
| Frontend and documentation review | Frontend agent | Check dependency compatibility, unused code, screenshots, and documentation accuracy | Clean install and extension build pass; documentation matches the implementation |
| Integration | Primary agent | Consolidate changes, check links and configuration, report limitations | No broken local documentation links or whitespace errors; unrelated workspace files preserved |

## Completed before the review

- Removed obsolete SQLite setup scripts, unused frontend exports, and old vector-store artifacts.
- Reworked the README with architecture, setup instructions, current limitations, and actual frontend screenshots using fictional examples.
- Aligned the React plugin with Vite 8 and updated the lockfile.
- Corrected the sample database URL and excluded environment files from the Docker image; Compose supplies configuration at runtime.
- Replaced manual endpoint parsing with FastAPI request validation and removed full-payload logging.
- Made API tests deterministic by replacing the AI engine in fixtures.

## Final checks

- [x] Backend review and follow-up cleanup.
- [x] Frontend/documentation review and follow-up cleanup.
- [x] Relevant tests, extension build, and configuration checks.
- [x] Final diff and local documentation links reviewed.

## Boundaries

Retain the active cardiovascular knowledge base, database migration history, and original hackathon pitch. Do not edit the user's existing architecture survey (then `levantamento-arquitetura-nesis.md`, now `architecture-survey.md`). Do not call a live model or use real patient data for validation. No deployment or publication is part of this cleanup.

## Review outcome

Both agents completed their assigned changes. The backend now retains only the declarative database base required by models and Alembic, with unused SQLite dependency and configuration helper removed. Frontend demo fixtures no longer access storage; the history store owns initialization and reset, eliminating the mixed static/dynamic import warning. Repository context now describes the implemented typography and dark theme.

Validation: eight API tests passed; Alembic generated PostgreSQL migration SQL offline; the extension build passed without the import warning; history initialization, ordering, idempotence, deletion, reset, and settings preservation passed focused checks. Local documentation links and diff whitespace checks passed. Compose configuration and clean npm installation were validated in the initial cleanup.

These checks do not validate clinical accuracy or a live model call. Changes remain local and uncommitted.
