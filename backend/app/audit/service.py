"""Serviço de auditoria não-bloqueante.

Registra eventos sensíveis. Falhas são logadas mas NUNCA propagam — uma
falha no audit não deve quebrar a operação principal.
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuditLog
from app.users.models import User

logger = logging.getLogger(__name__)


async def record_audit(
    session: AsyncSession,
    *,
    user: Optional[User],
    action: str,
    resource_type: str,
    resource_id: Optional[uuid.UUID] = None,
    request: Optional[Request] = None,
) -> None:
    try:
        ip_address = None
        user_agent = None
        if request is not None:
            client = request.client
            ip_address = client.host if client else None
            ua = request.headers.get("user-agent")
            user_agent = ua[:255] if ua else None

        log = AuditLog(
            user_id=user.id if user else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        session.add(log)
        await session.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Falha ao registrar audit (%s): %s", action, exc)
        try:
            await session.rollback()
        except Exception:  # noqa: BLE001
            pass
