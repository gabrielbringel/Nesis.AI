"""Testes do módulo de pacientes."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


_VALID_CPF = "39053344705"


async def _create_patient(client, name="Maria da Silva", cpf=_VALID_CPF):
    return await client.post(
        "/patients",
        json={
            "cpf": cpf,
            "full_name": name,
            "birth_date": "1980-05-20",
            "sex": "F",
        },
    )


async def test_create_patient_never_returns_cpf(client):
    response = await _create_patient(client)
    assert response.status_code == 201
    data = response.json()
    assert "cpf" not in data
    assert data["cpf_hash"]
    assert len(data["cpf_hash"]) == 64
    assert _VALID_CPF not in str(data)


async def test_get_patient_returns_created_record(client):
    create = await _create_patient(client)
    patient_id = create.json()["id"]
    response = await client.get(f"/patients/{patient_id}")
    assert response.status_code == 200
    assert response.json()["id"] == patient_id


async def test_list_patients_filters_by_name(client):
    await _create_patient(client, name="Joao Carlos", cpf="52998224725")
    await _create_patient(client, name="Maria Clara", cpf=_VALID_CPF)
    response = await client.get("/patients", params={"name": "joao"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["full_name"] == "Joao Carlos"


async def test_list_patients_paginates(client):
    await _create_patient(client, name="Paciente A")
    await _create_patient(client, name="Paciente B", cpf="52998224725")
    response = await client.get("/patients", params={"page": 1, "page_size": 10})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


async def test_invalid_cpf_returns_422(client):
    response = await client.post(
        "/patients",
        json={
            "cpf": "00000000000",
            "full_name": "Teste",
            "birth_date": "1980-01-01",
            "sex": "M",
        },
    )
    assert response.status_code == 422


async def test_get_nonexistent_patient_returns_404(client):
    response = await client.get("/patients/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
