"""Tests for the POST /api/v1/analyze endpoint."""

from __future__ import annotations

import pytest


@pytest.fixture
def payload() -> dict:
    return {
        "paciente": {
            "nome": "Maria Silva",
            "idade": 67,
            "alergias": ["Dipirona"],
        },
        "medicacoes": [
            {
                "nome": "Dipirona Sódica",
                "dose": "500mg",
                "frequencia": "8/8h",
                "via": "oral",
            },
            {
                "nome": "Enalapril",
                "dose": "10mg",
                "frequencia": "12/12h",
                "via": "oral",
            },
        ],
    }


async def test_analyze_retorna_200_e_alertas(client, payload):
    response = await client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert "alertas" in body
    assert len(body["alertas"]) == 3


async def test_analyze_contagens_por_severidade(client, payload):
    response = await client.post("/api/v1/analyze", json=payload)
    body = response.json()

    assert body["total_grave"] == 1
    assert body["total_moderado"] == 1
    assert body["total_leve"] == 1


async def test_analyze_severidades_validas(client, payload):
    response = await client.post("/api/v1/analyze", json=payload)
    body = response.json()

    severidades = {a["severidade"] for a in body["alertas"]}
    assert severidades == {"GRAVE", "MODERADO", "LEVE"}


async def test_analyze_payload_invalido_retorna_422(client):
    response = await client.post("/api/v1/analyze", json={"paciente": {}})
    assert response.status_code == 422


async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_payload_invalido_nao_chama_motor(client, motor):
    response = await client.post(
        "/api/v1/analyze",
        json={"paciente": {"nome": "Exemplo", "idade": 131}, "medicacoes": []},
    )
    assert response.status_code == 422
    motor.assert_not_awaited()


async def test_payload_preserva_posologia_e_medicacoes_em_uso(client, payload, motor):
    payload["paciente"]["med_em_uso"] = ["Medicamento habitual"]
    payload["medicacoes"][0]["posologia_completa"] = "500mg, 8/8h | oral"
    response = await client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    sent = motor.await_args.args[0]
    assert sent["paciente"]["med_em_uso"] == ["Medicamento habitual"]
    assert sent["medicacoes"][0]["posologia_completa"] == "500mg, 8/8h | oral"


async def test_json_malformado_retorna_422(client, motor):
    response = await client.post(
        "/api/v1/analyze", content="{", headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422
    motor.assert_not_awaited()
