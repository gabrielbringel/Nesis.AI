"""Testes do módulo de usuários."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_admin_can_create_user(client, admin_headers):
    response = await client.post(
        "/users",
        headers=admin_headers,
        json={
            "email": "novo@teste.dev",
            "full_name": "Novo Médico",
            "role": "medico",
            "password": "Senha@1234",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "novo@teste.dev"
    assert data["role"] == "medico"
    assert "hashed_password" not in data


async def test_medico_cannot_create_user(client, medico_headers):
    response = await client.post(
        "/users",
        headers=medico_headers,
        json={
            "email": "x@y.dev",
            "full_name": "X",
            "role": "medico",
            "password": "Senha@1234",
        },
    )
    assert response.status_code == 403


async def test_admin_can_list_users(client, admin_headers, medico_user):
    response = await client.get("/users", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    emails = {u["email"] for u in data["items"]}
    assert medico_user.email in emails


async def test_admin_can_deactivate_user(client, admin_headers, medico_user):
    response = await client.delete(
        f"/users/{medico_user.id}", headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False
