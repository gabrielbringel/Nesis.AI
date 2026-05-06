"""Modelos ORM do módulo de prescrições."""

from __future__ import annotations

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.common import TimestampMixin, UUIDMixin
from app.database import Base


# Em PostgreSQL usamos JSONB; em SQLite (testes) o tipo cai para JSON.
_JSONType = JSONB().with_variant(JSON(), "sqlite")


class Analise(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "analises"

    payload: Mapped[dict] = mapped_column(_JSONType, nullable=False)
    resposta: Mapped[dict] = mapped_column(_JSONType, nullable=False)
