"""Embeddings wrapper built on the new `google-genai` SDK.

The old `google.generativeai` SDK is deprecated and behaves unpredictably
(including ingestions that report success but never persist embeddings to
pgvector). We use the new `google-genai` SDK (`from google import genai`),
the same one the LLM engine already uses.

Implements LangChain's `Embeddings` interface (`embed_documents` +
`embed_query`), so it plugs into `langchain_postgres.PGVector` without
changes to the call site.
"""

from __future__ import annotations

import logging
import os

from google import genai
from google.genai import types
from langchain_core.embeddings import Embeddings


logger = logging.getLogger(__name__)


EMBEDDING_MODEL = "models/gemini-embedding-001"


class GeminiEmbeddings(Embeddings):
    def __init__(self, api_key: str | None = None, model: str = EMBEDDING_MODEL):
        key = api_key or os.environ.get("GEMINI_API_KEY")
        if not key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Define it in .env before using embeddings."
            )
        self.client = genai.Client(api_key=key)
        self.model = model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        logger.info("Generating embeddings for %d documents...", len(texts))
        result = self.client.models.embed_content(
            model=self.model,
            contents=texts,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
        )
        return [e.values for e in result.embeddings]

    def embed_query(self, text: str) -> list[float]:
        result = self.client.models.embed_content(
            model=self.model,
            contents=[text],
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
        )
        return result.embeddings[0].values
