"""Configuração do PGVector via langchain-postgres.

A biblioteca cria automaticamente as tabelas internas
(`langchain_pg_collection`, `langchain_pg_embedding`) na primeira inicialização —
não há tabelas correspondentes no Alembic. A migração inicial só garante a
extensão `vector`.

A coleção é inicializada lazy (singleton) para evitar custo de bootstrap em
chamadas repetidas e para permitir que o backend suba mesmo sem a base de
conhecimento populada.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_postgres import PGVector

from app.config import get_settings


logger = logging.getLogger(__name__)


COLLECTION_NAME = "nesis_knowledge_base"
EMBEDDING_MODEL = "models/embedding-001"


@lru_cache(maxsize=1)
def _embeddings() -> GoogleGenerativeAIEmbeddings:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY não configurada — defina no .env antes de subir o motor."
        )
    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=settings.gemini_api_key,
    )


@lru_cache(maxsize=1)
def get_vectorstore() -> PGVector | None:
    """Devolve o PGVector configurado ou None se a infra não estiver pronta.

    Falhas de conexão ao Postgres não devem derrubar o motor — o pipeline
    segue sem RAG, apoiando-se apenas no conhecimento do LLM.
    """
    settings = get_settings()
    try:
        return PGVector(
            embeddings=_embeddings(),
            collection_name=COLLECTION_NAME,
            connection=settings.pgvector_url,
            use_jsonb=True,
        )
    except Exception:  # noqa: BLE001 — degradação graciosa
        logger.exception("Falha ao inicializar PGVector — seguindo sem RAG.")
        return None


async def search_context(query: str, k: int = 4) -> list[str]:
    """Busca documentos relevantes; devolve lista vazia se vector store indisponível."""
    store = get_vectorstore()
    if store is None:
        return []
    try:
        docs = await store.asimilarity_search(query, k=k)
    except Exception:  # noqa: BLE001 — coleção vazia ou erro de conexão
        logger.exception("asimilarity_search falhou — seguindo sem contexto.")
        return []
    return [d.page_content for d in docs]
