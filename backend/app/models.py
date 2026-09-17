"""Imports every ORM model so it is registered in the metadata.

Importing this module ensures each `Table` exists in `Base.metadata`
before `create_all` or Alembic autogenerate runs.
"""

from app.prescriptions.models import Analise  # noqa: F401

__all__ = ["Analise"]
