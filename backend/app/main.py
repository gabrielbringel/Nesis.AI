"""Entrypoint FastAPI."""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth.router import router as auth_router
from app.config import get_settings
from app.patients.router import router as patients_router
from app.prescriptions.router import router as prescriptions_router
from app.users.router import router as users_router

logger = logging.getLogger(__name__)
settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Nesis.AI — Prontuário API",
        version=settings.app_version,
        description=(
            "Backend do sistema de verificação de interações medicamentosas. "
            "Documentação interativa em /docs."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    _register_error_handlers(app)

    app.include_router(auth_router)
    app.include_router(users_router)
    app.include_router(patients_router)
    app.include_router(prescriptions_router)

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "version": settings.app_version}

    return app


def _register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            detail = "Recurso não encontrado"
        elif exc.status_code == status.HTTP_401_UNAUTHORIZED and not detail:
            detail = "Não autenticado"
        elif exc.status_code == status.HTTP_403_FORBIDDEN and not detail:
            detail = "Sem permissão para este recurso"
        headers = getattr(exc, "headers", None)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": detail},
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=jsonable_encoder({"detail": exc.errors()}),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Erro não tratado: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Erro interno. Tente novamente."},
        )


app = create_app()
