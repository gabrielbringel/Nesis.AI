"""initial schema: pgvector + analises

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-25

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Habilita pgvector — necessário para embeddings nas próximas iterações.
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "analises",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("resposta", postgresql.JSONB(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("analises")
    op.execute("DROP EXTENSION IF EXISTS vector")
