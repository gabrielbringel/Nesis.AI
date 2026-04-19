"""Modelo ORM de usuário."""

from __future__ import annotations

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.common import TimestampMixin, UUIDMixin
from app.database import Base

VALID_ROLES = {"medico", "farmaceutico", "admin"}


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="medico")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
