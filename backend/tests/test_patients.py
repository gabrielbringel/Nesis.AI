"""Testes do módulo de pacientes."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


_VALID_CPF = "39053344705"


async def _create_patient(client, headers, name="Maria da Silva", cpf=_VALID_CPF):
    return await client.post(
        "/patients",
        headers=headers,
        json={
            "cpf": cpf,
            "full_name": name,
            "birth_date": "1980-05-20",
            "sex": "F",
        },
    )


async def test_create_patient_never_returns_cpf(client, medico_headers):
    response = await _create_patient(client, medico_headers)
    assert response.status_code == 201
    data = response.json()
    assert "cpf" not in data
    assert data["cpf_hash"]
    assert len(data["cpf_hash"]) == 64
    assert _VALID_CPF not in str(data)


async def test_medico_cannot_access_other_medicos_patient(
    client, medico_headers, medico_b_headers
):
    create = await _create_patient(client, medico_headers, name="Paciente A")
    patient_id = create.json()["id"]

    response = await client.get(f"/patients/{patient_id}", headers=medico_b_headers)
    assert response.status_code == 403


async def test_medico_can_access_own_patient(client, medico_headers):
    create = await _create_patient(client, medico_headers)
    patient_id = create.json()["id"]
    response = await client.get(f"/patients/{patient_id}", headers=medico_headers)
    assert response.status_code == 200


async def test_list_patients_filters_by_name(client, medico_headers):
    await _create_patient(client, medico_headers, name="Joao Carlos", cpf="52998224725")
    await _create_patient(client, medico_headers, name="Maria Clara", cpf=_VALID_CPF)
    response = await client.get(
        "/patients", headers=medico_headers, params={"name": "joao"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["full_name"] == "Joao Carlos"


async def test_medico_a_does_not_see_medico_b_patients_in_list(
    client, medico_headers, medico_b_headers
):
    await _create_patient(client, medico_headers, name="Paciente A")
    await _create_patient(client, medico_b_headers, name="Paciente B", cpf="52998224725")

    a_list = (await client.get("/patients", headers=medico_headers)).json()
    b_list = (await client.get("/patients", headers=medico_b_headers)).json()

    a_names = {p["full_name"] for p in a_list["items"]}
    b_names = {p["full_name"] for p in b_list["items"]}
    assert "Paciente A" in a_names
    assert "Paciente B" not in a_names
    assert "Paciente B" in b_names
    assert "Paciente A" not in b_names


async def test_invalid_cpf_returns_422(client, medico_headers):
    response = await client.post(
        "/patients",
        headers=medico_headers,
        json={
            "cpf": "00000000000",
            "full_name": "Teste",
            "birth_date": "1980-01-01",
            "sex": "M",
        },
    )
    assert response.status_code == 422
