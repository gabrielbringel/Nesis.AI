"""Ingestão da base de conhecimento cardiovascular no PGVector.

Lê backend/data/cardio_knowledge.json, converte cada entrada num Document
do LangChain e popula o pgvector com embeddings via Gemini.

Como rodar:
  Dentro do container backend:
    docker exec -it backend-backend-1 python scripts/ingest_knowledge.py

  Localmente (com PGVECTOR_URL apontando para localhost):
    python backend/scripts/ingest_knowledge.py

IMPORTANTE — PGVECTOR_URL:
  Dentro do Docker, o host é "postgres" (o nome do serviço no docker-compose).
  Fora do Docker, é "localhost". Configure no .env conforme o cenário de execução.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

# Garante que o módulo `app` (em backend/app) seja importável quando o script
# rodar como `python scripts/ingest_knowledge.py` a partir de backend/.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv

load_dotenv(BACKEND_DIR / ".env")

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
    logger.info("JSON carregado: %d entradas em %s", len(entradas), JSON_PATH)
    return entradas


def entrada_para_documento(entrada: dict) -> Document:
    """Converte uma entrada do JSON num Document do LangChain.

    page_content: texto rico para recuperação semântica.
    metadata: campos estruturados para filtragem futura.
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
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("GEMINI_API_KEY não definida no .env")

    pgvector_url = os.environ.get("PGVECTOR_URL")
    if not pgvector_url:
        raise SystemExit("PGVECTOR_URL não definida no .env")

    logger.info("Conectando ao pgvector em %s", _mascara_url(pgvector_url))

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
        "Inserindo %d documentos na coleção '%s'...",
        len(documentos),
        COLLECTION_NAME,
    )

    # add_documents com ids → upsert: re-rodar o script atualiza embeddings
    # ao invés de duplicar registros.
    vectorstore.add_documents(documents=documentos, ids=ids)

    logger.info("✓ %d documentos inseridos com sucesso.", len(documentos))
    logger.info("IDs: %s", ", ".join(ids))


def _mascara_url(url: str) -> str:
    """Esconde a senha da URL para não vazar em log."""
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
