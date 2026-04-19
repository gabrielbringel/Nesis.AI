"""Modelos ORM de prescrição e alerta."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.common import TimestampMixin, UUIDMixin, utcnow
from app.database import Base


class Prescription(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "prescriptions"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    input_type: Mapped[str] = mapped_column(String(16), nullable=False, default="text")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending", index=True)
    processing_time_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pipeline_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    alerts: Mapped[list["Alert"]] = relationship(
        back_populates="prescription",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Alert(UUIDMixin, Base):
    __tablename__ = "alerts"

    prescription_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("prescriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    drug_pair_1: Mapped[str] = mapped_column(String(255), nullable=False)
    drug_pair_2: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    final_score: Mapped[float] = mapped_column(Float, nullable=False)
    mechanism: Mapped[str] = mapped_column(Text, nullable=False, default="")
    recommendation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    evidence: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    rule_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    component_scores: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    prescription: Mapped[Prescription] = relationship(back_populates="alerts")
