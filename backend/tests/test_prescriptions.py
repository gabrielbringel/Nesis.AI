"""Testes do módulo de prescrições e mock do motor."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


_VALID_CPF_A = "39053344705"
_VALID_CPF_B = "52998224725"


async def _create_patient(client, cpf=_VALID_CPF_A, name="Paciente Teste"):
    return await client.post(
        "/patients",
        json={
            "cpf": cpf,
            "full_name": name,
            "birth_date": "1980-05-20",
            "sex": "F",
        },
    )


async def test_analyze_warfarin_aspirin_returns_grave_alert(client):
    patient = (await _create_patient(client)).json()
    response = await client.post(
        "/prescriptions/analyze",
        json={
            "patient_id": patient["id"],
            "raw_text": "Paciente em uso de Warfarina 5mg e Aspirina 100mg/dia",
            "input_type": "text",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "done"
    assert data["pipeline_version"] == "mock-0.1.0"
    assert len(data["alerts"]) == 1
    alert = data["alerts"][0]
    assert alert["severity"] == "GRAVE"
    assert alert["rule_ids"] == ["R001"]


async def test_analyze_single_drug_returns_no_alerts(client):
    patient = (await _create_patient(client)).json()
    response = await client.post(
        "/prescriptions/analyze",
        json={
            "patient_id": patient["id"],
            "raw_text": "Paracetamol 500mg 6/6h",
            "input_type": "text",
        },
    )
    assert response.status_code == 201
    assert response.json()["alerts"] == []


async def test_get_prescription_returns_with_alerts(client):
    patient = (await _create_patient(client)).json()
    analysis = (
        await client.post(
            "/prescriptions/analyze",
            json={
                "patient_id": patient["id"],
                "raw_text": "Warfarina 5mg e Aspirina 100mg",
                "input_type": "text",
            },
        )
    ).json()

    response = await client.get(f"/prescriptions/{analysis['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == analysis["id"]


async def test_severity_filter_returns_only_grave(client):
    patient_a = (await _create_patient(client)).json()
    patient_b = (
        await _create_patient(client, cpf=_VALID_CPF_B, name="B")
    ).json()

    await client.post(
        "/prescriptions/analyze",
        json={
            "patient_id": patient_a["id"],
            "raw_text": "Warfarina 5mg e Aspirina 100mg",
            "input_type": "text",
        },
    )
    await client.post(
        "/prescriptions/analyze",
        json={
            "patient_id": patient_b["id"],
            "raw_text": "Paracetamol 500mg",
            "input_type": "text",
        },
    )

    response = await client.get("/prescriptions", params={"severity": "GRAVE"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["alerts"][0]["severity"] == "GRAVE"


async def test_prescription_alerts_sorted_by_score(client):
    patient = (await _create_patient(client)).json()
    analysis = (
        await client.post(
            "/prescriptions/analyze",
            json={
                "patient_id": patient["id"],
                "raw_text": "Warfarina 5mg e Aspirina 100mg",
                "input_type": "text",
            },
        )
    ).json()

    response = await client.get(f"/prescriptions/{analysis['id']}/alerts")
    assert response.status_code == 200
    alerts = response.json()
    assert alerts
    scores = [a["final_score"] for a in alerts]
    assert scores == sorted(scores, reverse=True)


async def test_analyze_nonexistent_patient_returns_404(client):
    response = await client.post(
        "/prescriptions/analyze",
        json={
            "patient_id": "00000000-0000-0000-0000-000000000000",
            "raw_text": "Paracetamol 500mg",
            "input_type": "text",
        },
    )
    assert response.status_code == 404
