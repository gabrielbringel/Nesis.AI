"""Rotas de autenticação."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_audit
from app.auth.schemas import LoginRequest, TokenResponse
from app.auth.service import authenticate
from app.auth.utils import create_access_token
from app.database import get_db
from app.dependencies import get_current_user
from app.users.models import User
from app.users.schemas import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user = await authenticate(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )
    token, expires_in = create_access_token(user.id, extra_claims={"role": user.role})
    await record_audit(
        db,
        user=user,
        action="login",
        resource_type="user",
        resource_id=user.id,
        request=request,
    )
    return TokenResponse(access_token=token, expires_in=expires_in)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(current_user: User = Depends(get_current_user)) -> TokenResponse:
    token, expires_in = create_access_token(
        current_user.id, extra_claims={"role": current_user.role}
    )
    return TokenResponse(access_token=token, expires_in=expires_in)


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
