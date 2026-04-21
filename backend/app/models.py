"""Módulo central que importa todos os modelos ORM.

Importar este módulo garante que todos os `Table` foram registrados na
`Base.metadata`, viabilizando `create_all` e Alembic autogenerate.
"""

from app.patients.models import Patient  # noqa: F401
from app.prescriptions.models import Alert, Prescription  # noqa: F401

__all__ = ["Patient", "Alert", "Prescription"]
