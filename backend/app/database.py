"""Base declarativa compartilhada pelos modelos e pelas migrações Alembic."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base compartilhada entre todos os modelos ORM."""
