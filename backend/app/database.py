"""Engine SQLAlchemy assíncrono e sessão compartilhada."""

from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    """Base compartilhada entre todos os modelos ORM."""


def _make_engine(url: str):
    # SQLite em memória usado nos testes; produção sempre PostgreSQL+asyncpg.
    if url.startswith("sqlite"):
        from sqlalchemy.pool import StaticPool

        return create_async_engine(
            url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )
    return create_async_engine(url, future=True, pool_pre_ping=True)


_settings = get_settings()
engine = _make_engine(_settings.database_url)
SessionLocal = async_sessionmaker(
    bind=engine, expire_on_commit=False, class_=AsyncSession
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    """Cria todas as tabelas — usado pelos testes."""
    from app import models  # noqa: F401 — registra metadata

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
