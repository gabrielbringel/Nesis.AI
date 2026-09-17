"""PGVector setup through langchain-postgres.

The `nesis_knowledge_base` collection is populated by
`scripts/ingest_knowledge.py`. The internal tables
(`langchain_pg_collection`, `langchain_pg_embedding`) are created
automatically by langchain-postgres on first initialization.

Driver choice:
  We use the synchronous PGVector (psycopg driver) and wrap searches in
  asyncio.to_thread() so the FastAPI event loop is not blocked. Native
  async mode (asyncpg) breaks on startup: langchain-postgres sends several
  SQL commands together (pg_advisory_xact_lock + CREATE EXTENSION) in a
  single execute, and asyncpg does not support multiple statements in
  prepared statements.

IMPORTANT — PGVECTOR_URL:
  Inside Docker, the host is "postgres" (the docker-compose service).
  Outside Docker, it is "localhost". Set .env for your environment.
"""

from __future__ import annotations

import asyncio
import logging
import traceback
from functools import lru_cache

from langchain_core.documents import Document
from langchain_postgres import PGVector

from app.config import get_settings
from app.motor.embeddings import GeminiEmbeddings


logger = logging.getLogger(__name__)


COLLECTION_NAME = "nesis_knowledge_base"


@lru_cache(maxsize=1)
def _embeddings() -> GeminiEmbeddings:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Define it in .env before starting the engine."
        )
    return GeminiEmbeddings(api_key=settings.gemini_api_key)


@lru_cache(maxsize=1)
def get_vectorstore() -> PGVector | None:
    """Return the synchronous PGVector (lazy singleton), or None if setup fails."""
    settings = get_settings()
    try:
        return PGVector(
            embeddings=_embeddings(),
            collection_name=COLLECTION_NAME,
            connection=settings.pgvector_url,
            use_jsonb=True,
        )
    except Exception as e:
        logger.error("Failed to initialize PGVector: %s", e)
        logger.error(traceback.format_exc())
        return None


async def search_context(query: str, k: int = 4) -> list[Document]:
    """Return the k most relevant documents, or an empty list if unavailable.

    Runs the synchronous search in a separate thread via asyncio.to_thread()
    so the event loop is not blocked.
    """
    store = get_vectorstore()
    if store is None:
        logger.warning("get_vectorstore() returned None. RAG is disabled for this call.")
        return []
    try:
        docs = await asyncio.to_thread(store.similarity_search, query, k)
        logger.info("RAG retrieved %d documents for: %s", len(docs), query[:60])
        return docs
    except Exception as e:
        logger.error("search_context failed: %s", e)
        logger.error(traceback.format_exc())
        return []
