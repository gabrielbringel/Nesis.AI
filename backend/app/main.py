"""Entrypoint FastAPI."""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.prescriptions.router import router as prescriptions_router

logger = logging.getLogger(__name__)
settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Nesis.AI — API",
        version=settings.app_version,
        description=(
            "Backend do sistema de verificação de interações medicamentosas. "
            "Recebe dados scrapeados pela extensão Chrome e devolve alertas "
            "classificados por severidade. Documentação em /docs."
        ),
    )

    # Em desenvolvimento aceitamos qualquer origem porque o ID da extensão
    # Chrome é gerado dinamicamente e ainda não pode ser fixado.
    # PRODUÇÃO: restringir para o ID definitivo da extensão (chrome-extension://<id>).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    _register_error_handlers(app)
    app.include_router(prescriptions_router)

    @app.get("/", tags=["root"])
    async def root() -> dict[str, str]:
        return {
            "name": "Nesis.AI API",
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/health",
        }

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "version": settings.app_version}

    return app


def _register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        headers = getattr(exc, "headers", None)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
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
