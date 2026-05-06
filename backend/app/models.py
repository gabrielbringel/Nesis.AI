"""Importa todos os modelos ORM para registrá-los na metadata.

Importar este módulo garante que cada `Table` tenha sido criado em
`Base.metadata` antes de `create_all` ou Alembic autogenerate rodarem.
"""

from app.prescriptions.models import Analise  # noqa: F401

__all__ = ["Analise"]
