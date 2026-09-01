"""Import / OpenAPI / wiring baseline (no behavior assertions on business logic)."""

from __future__ import annotations


def test_application_imports():
    import main  # noqa: F401

    assert main.app.title == "Face Recognition Attendance System"


def test_openapi_schema_generates(client):
    schema = client.app.openapi()
    assert schema["openapi"].startswith("3.")
    assert schema["info"]["title"] == "Face Recognition Attendance System"
    # Freeze the set of top-level path prefixes currently exposed.
    prefixes = sorted({p.split("/")[1] for p in schema["paths"]})
    assert prefixes == [
        "activity",
        "auth",
        "cameras",
        "dashboard",
        "persons",
        "recognition",
        "settings",
        "users",
    ]


def test_openapi_json_endpoint(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert response.json()["info"]["title"] == "Face Recognition Attendance System"


def test_docs_available(client):
    assert client.get("/docs").status_code == 200


def test_unknown_route_is_404(client):
    assert client.get("/definitely-not-a-route").status_code == 404
