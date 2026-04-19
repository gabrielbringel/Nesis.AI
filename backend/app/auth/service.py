"""Serviços do módulo de autenticação."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.utils import verify_password
from app.users.models import User


async def authenticate(session: AsyncSession, email: str, password: str) -> Optional[User]:
    stmt = select(User).where(User.email == email.lower())
    user = (await session.execute(stmt)).scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
