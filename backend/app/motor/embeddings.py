"""Wrapper de embeddings via SDK `google-genai` (novo).

O SDK antigo `google.generativeai` é deprecated e tem comportamentos
imprevisíveis (incluindo ingestões que reportam sucesso mas não persistem
embeddings no pgvector). Usamos o SDK novo `google-genai` (`from google
import genai`), que é o mesmo já usado pelo motor LLM.

Expõe a interface `Embeddings` do LangChain (`embed_documents` +
`embed_query`), para ser plugado em `langchain_postgres.PGVector` sem
alteração na chamada.
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
                "GEMINI_API_KEY não configurada — defina no .env antes de usar embeddings."
            )
        self.client = genai.Client(api_key=key)
        self.model = model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        logger.info("Gerando embeddings para %d documentos...", len(texts))
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
