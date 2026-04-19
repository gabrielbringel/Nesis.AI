"""Rotas de gerenciamento de usuários (apenas admin)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_audit
from app.database import get_db
from app.dependencies import require_role
from app.users import service
from app.users.models import User
from app.users.schemas import UserCreate, UserListResponse, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

_admin_only = require_role("admin")


@router.post(
    "", response_model=UserRead, status_code=status.HTTP_201_CREATED
)
async def create_user(
    payload: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_admin_only),
) -> User:
    user = await service.create_user(db, payload)
    await record_audit(
        db,
        user=current_user,
        action="create_user",
        resource_type="user",
        resource_id=user.id,
        request=request,
    )
    return user


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_admin_only),
) -> UserListResponse:
    items, total = await service.list_users(db, page, page_size)
    return UserListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_admin_only),
) -> User:
    return await service.get_user(db, user_id)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_admin_only),
) -> User:
    user = await service.update_user(db, user_id, payload)
    await record_audit(
        db,
        user=current_user,
        action="update_user",
        resource_type="user",
        resource_id=user.id,
        request=request,
    )
    return user


@router.delete("/{user_id}", response_model=UserRead)
async def deactivate_user(
    user_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_admin_only),
) -> User:
    user = await service.deactivate_user(db, user_id)
    await record_audit(
        db,
        user=current_user,
        action="deactivate_user",
        resource_type="user",
        resource_id=user.id,
        request=request,
    )
    return user
