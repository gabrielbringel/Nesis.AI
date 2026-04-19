"""Testes de autenticação."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_login_with_valid_credentials(client, admin_user):
    response = await client.post(
        "/auth/login",
        json={"email": admin_user.email, "password": "Admin@1234"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["expires_in"] > 0


async def test_login_with_wrong_password(client, admin_user):
    response = await client.post(
        "/auth/login",
        json={"email": admin_user.email, "password": "senha_errada"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciais inválidas"


async def test_protected_route_without_token(client):
    response = await client.get("/auth/me")
    assert response.status_code == 401


async def test_admin_route_with_medico_role(client, medico_headers):
    response = await client.get("/users", headers=medico_headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Sem permissão para este recurso"


async def test_me_returns_current_user(client, medico_headers, medico_user):
    response = await client.get("/auth/me", headers=medico_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == medico_user.email
    assert data["role"] == "medico"


async def test_refresh_returns_new_token(client, medico_headers):
    response = await client.post("/auth/refresh", headers=medico_headers)
    assert response.status_code == 200
    assert response.json()["access_token"]
