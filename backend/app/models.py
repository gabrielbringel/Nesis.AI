"""Módulo central que importa todos os modelos ORM.

Importar este módulo garante que todos os `Table` foram registrados na
`Base.metadata`, viabilizando `create_all` e Alembic autogenerate.
"""

from app.audit.models import AuditLog  # noqa: F401
from app.patients.models import Patient  # noqa: F401
from app.prescriptions.models import Alert, Prescription  # noqa: F401
from app.users.models import User  # noqa: F401

__all__ = ["AuditLog", "Patient", "Alert", "Prescription", "User"]
