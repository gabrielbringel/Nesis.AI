"""Modelo ORM de paciente — CPF armazenado apenas como SHA-256."""

from __future__ import annotations

from datetime import date

from sqlalchemy import Date, String
from sqlalchemy.orm import Mapped, mapped_column

from app.common import TimestampMixin, UUIDMixin
from app.database import Base


class Patient(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "patients"

    cpf_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    sex: Mapped[str] = mapped_column(String(8), nullable=False)
