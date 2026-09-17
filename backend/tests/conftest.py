"""API contract test fixtures with a mocked engine, no database, and no external calls.

Alert values stay in Portuguese to match the API contract.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["APP_ENV"] = "test"
os.environ["GEMINI_API_KEY"] = ""

from app.main import create_app  # noqa: E402
from app.prescriptions import service  # noqa: E402


@pytest.fixture
def motor(monkeypatch):
    mock = AsyncMock(return_value=[
        {
            "severidade": severity,
            "titulo": "Alerta de teste",
            "descricao": "Resultado simulado para verificar o contrato da API.",
            "fonte": "Fixture de teste",
            "medicamentos_envolvidos": ["Medicamento de teste"],
            "recomendacao": "Exemplo fictício, sem orientação clínica.",
        }
        for severity in ("GRAVE", "MODERADO", "LEVE")
    ])
    monkeypatch.setattr(service, "motor_analyze", mock)
    return mock


@pytest_asyncio.fixture
async def client(motor):
    transport = ASGITransport(app=create_app())
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
