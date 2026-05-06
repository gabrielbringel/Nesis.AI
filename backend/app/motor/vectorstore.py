"""Configuração do PGVector via langchain-postgres.

A coleção `nesis_knowledge_base` é populada pelo script
`scripts/ingest_knowledge.py`. As tabelas internas
(`langchain_pg_collection`, `langchain_pg_embedding`) são criadas
automaticamente pelo langchain-postgres na primeira inicialização.

Decisão de driver:
  Usamos o PGVector síncrono (driver psycopg) e envolvemos a busca em
  asyncio.to_thread() para não bloquear o event loop do FastAPI. O modo
  async nativo (asyncpg) quebra na inicialização: o langchain-postgres
  envia múltiplos comandos SQL juntos (pg_advisory_xact_lock + CREATE
  EXTENSION) num único execute, e o asyncpg não suporta multi-statement
  em prepared statements.

IMPORTANTE — PGVECTOR_URL:
  Dentro do Docker, o host é "postgres" (serviço do docker-compose).
  Fora do Docker, é "localhost". Configure o .env conforme o cenário.
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
            "GEMINI_API_KEY não configurada — defina no .env antes de subir o motor."
        )
    return GeminiEmbeddings(api_key=settings.gemini_api_key)


@lru_cache(maxsize=1)
def get_vectorstore() -> PGVector | None:
    """Devolve o PGVector síncrono (lazy/singleton) ou None se a infra falhar."""
    settings = get_settings()
    try:
        return PGVector(
            embeddings=_embeddings(),
            collection_name=COLLECTION_NAME,
            connection=settings.pgvector_url,
            use_jsonb=True,
        )
    except Exception as e:
        logger.error("Falha ao inicializar PGVector: %s", e)
        logger.error(traceback.format_exc())
        return None


async def search_context(query: str, k: int = 4) -> list[Document]:
    """Busca os k documentos mais relevantes; lista vazia se indisponível.

    Roda a busca síncrona em thread separada via asyncio.to_thread() para
    não bloquear o event loop.
    """
    store = get_vectorstore()
    if store is None:
        logger.warning("get_vectorstore() devolveu None — RAG desativado nesta chamada.")
        return []
    try:
        docs = await asyncio.to_thread(store.similarity_search, query, k)
        logger.info("RAG recuperou %d documentos para: %s", len(docs), query[:60])
        return docs
    except Exception as e:
        logger.error("search_context falhou: %s", e)
        logger.error(traceback.format_exc())
        return []
