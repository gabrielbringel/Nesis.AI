"""Ingest the cardiovascular knowledge base into PGVector.

Reads backend/data/cardio_knowledge.json, turns each entry into a LangChain
Document, and populates pgvector with Gemini embeddings. The knowledge base
content stays in Portuguese.

How to run:
  Inside the backend container:
    docker exec -it backend-backend-1 python scripts/ingest_knowledge.py

  Locally (with PGVECTOR_URL pointing to localhost):
    python backend/scripts/ingest_knowledge.py

IMPORTANT — PGVECTOR_URL:
  Inside Docker, the host is "postgres" (the docker-compose service name).
  Outside Docker, it is "localhost". Set .env for your environment.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

# Makes the `app` module (backend/app) importable when the script runs as
# `python scripts/ingest_knowledge.py` from backend/.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# pydantic-settings in app.config loads .env automatically

from langchain_core.documents import Document
from langchain_postgres import PGVector

from app.motor.embeddings import GeminiEmbeddings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


COLLECTION_NAME = "nesis_knowledge_base"
EMBEDDING_MODEL = "models/gemini-embedding-001"
JSON_PATH = BACKEND_DIR / "data" / "cardio_knowledge.json"


def carregar_entradas() -> list[dict]:
    with open(JSON_PATH, encoding="utf-8") as f:
        dados = json.load(f)
    entradas = dados.get("base_conhecimento", [])
    logger.info("Loaded JSON: %d entries from %s", len(entradas), JSON_PATH)
    return entradas


def entrada_para_documento(entrada: dict) -> Document:
    """Convert a JSON entry into a LangChain Document.

    page_content: descriptive text for semantic retrieval.
    metadata: structured fields for future filtering.
    """
    titulo = entrada.get("titulo", "")
    mecanismo = entrada.get("mecanismo", "")
    consequencia = entrada.get("consequencia", "")
    recomendacao = entrada.get("recomendacao", "")

    page_content = (
        f"{titulo}. {mecanismo}. "
        f"Consequência: {consequencia}. "
        f"Recomendação: {recomendacao}."
    )

    metadata = {
        "id": entrada.get("id", ""),
        "tipo": entrada.get("tipo", ""),
        "medicamentos": ", ".join(entrada.get("medicamentos", []) or []),
        "severidade": entrada.get("severidade", ""),
        "fonte": entrada.get("fonte", ""),
    }

    return Document(page_content=page_content, metadata=metadata)


def main() -> None:
    from app.config import get_settings
    settings = get_settings()
    
    api_key = settings.gemini_api_key
    if not api_key:
        raise SystemExit("GEMINI_API_KEY is not set in .env")

    pgvector_url = settings.pgvector_url
    if not pgvector_url:
        raise SystemExit("PGVECTOR_URL is not set in .env")

    logger.info("Connecting to pgvector at %s", _mascara_url(pgvector_url))

    entradas = carregar_entradas()
    documentos = [entrada_para_documento(e) for e in entradas]
    ids = [e.get("id") for e in entradas]

    embeddings = GeminiEmbeddings(api_key=api_key, model=EMBEDDING_MODEL)

    vectorstore = PGVector(
        embeddings=embeddings,
        collection_name=COLLECTION_NAME,
        connection=pgvector_url,
        use_jsonb=True,
    )

    logger.info(
        "Inserting %d documents into collection '%s'...",
        len(documentos),
        COLLECTION_NAME,
    )

    # add_documents with ids → upsert: rerunning the script updates embeddings
    # instead of duplicating records.
    # Insert in small batches with a pause to avoid Gemini API 429 (rate limit) errors.
    import time
    batch_size = 5
    for i in range(0, len(documentos), batch_size):
        lote_docs = documentos[i : i + batch_size]
        lote_ids = ids[i : i + batch_size]
        logger.info("Inserting documents %d to %d of %d...", i + 1, min(i + batch_size, len(documentos)), len(documentos))
        vectorstore.add_documents(documents=lote_docs, ids=lote_ids)
        time.sleep(2)  # 2-second pause between batches


    logger.info("✓ %d documents inserted successfully.", len(documentos))
    logger.info("IDs: %s", ", ".join(ids))


def _mascara_url(url: str) -> str:
    """Mask the password in the URL so it does not leak into logs."""
    if "@" not in url or "://" not in url:
        return url
    prefixo, resto = url.split("://", 1)
    if "@" not in resto:
        return url
    creds, host = resto.split("@", 1)
    if ":" in creds:
        user, _ = creds.split(":", 1)
        return f"{prefixo}://{user}:***@{host}"
    return url


if __name__ == "__main__":
    main()
