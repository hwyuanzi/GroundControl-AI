from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_jfk_graph_is_available_without_database() -> None:
    response = client.get("/api/v1/analytics/graph")

    assert response.status_code == 200
    payload = response.json()
    assert payload["nodes"]
    assert payload["edges"]


def test_unknown_airport_route_is_rejected() -> None:
    response = client.post(
        "/api/v1/analytics/route",
        json={
            "origin": "T1_GATE",
            "destination": "RWY_04L",
            "airport_icao": "KLAX",
        },
    )

    assert response.status_code == 404
