"""Regras de negócio de usuários."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.utils import hash_password
from app.users.models import User
from app.users.schemas import UserCreate, UserUpdate


async def create_user(session: AsyncSession, payload: UserCreate) -> User:
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        role=payload.role,
        hashed_password=hash_password(payload.password),
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado"
        )
    await session.refresh(user)
    return user


async def get_user(session: AsyncSession, user_id: uuid.UUID) -> User:
    user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recurso não encontrado"
        )
    return user


async def list_users(
    session: AsyncSession, page: int, page_size: int
) -> tuple[list[User], int]:
    offset = max(page - 1, 0) * page_size
    total = (await session.execute(select(func.count(User.id)))).scalar_one()
    stmt = select(User).order_by(User.created_at.desc()).offset(offset).limit(page_size)
    items = list((await session.execute(stmt)).scalars().all())
    return items, int(total)


async def update_user(
    session: AsyncSession, user_id: uuid.UUID, payload: UserUpdate
) -> User:
    user = await get_user(session, user_id)
    data = payload.model_dump(exclude_unset=True)
    if "password" in data:
        password = data.pop("password")
        if password:
            user.hashed_password = hash_password(password)
    for key, value in data.items():
        setattr(user, key, value)
    await session.commit()
    await session.refresh(user)
    return user


async def deactivate_user(session: AsyncSession, user_id: uuid.UUID) -> User:
    user = await get_user(session, user_id)
    user.is_active = False
    await session.commit()
    await session.refresh(user)
    return user


async def get_by_email(session: AsyncSession, email: str) -> Optional[User]:
    stmt = select(User).where(User.email == email.lower())
    return (await session.execute(stmt)).scalar_one_or_none()
