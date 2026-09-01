"""B1: /cameras management + public slug lookup, and the Camera rename
of the recognition-event relationship.

The old Terminal device-pairing subsystem (heartbeat / provision /
configure / regenerate-key / terminal_key) is gone; these tests assert
that too.
"""

from __future__ import annotations

from tests.helpers import (
    auth_headers,
    make_admin,
    make_camera,
    make_person,
    make_recognition_event,
)

_CAMERA_RESPONSE_KEYS = {
    "id",
    "name",
    "slug",
    "location",
    "is_active",
    "status",
    "created_at",
}


# ---------------------------------------------------------------------------
# creation
# ---------------------------------------------------------------------------

def test_create_camera(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")

    response = client.post(
        "/cameras",
        headers=headers,
        json={"name": "Main Gate", "location": "North"},
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) == _CAMERA_RESPONSE_KEYS
    assert body["name"] == "Main Gate"
    assert body["slug"] == "main-gate"
    assert body["location"] == "North"
    assert body["is_active"] is True
    # enabled but no public recognition session has run yet
    assert body["status"] == "offline"
    # the removed device-pairing secret is not part of the contract
    assert "terminal_key" not in body


def test_create_camera_forbidden_for_operator(client, db):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")

    response = client.post(
        "/cameras",
        headers=headers,
        json={"name": "X", "location": "Y"},
    )
    assert response.status_code == 403


def test_create_camera_requires_auth(client):
    response = client.post(
        "/cameras",
        json={"name": "X", "location": "Y"},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# retrieval
# ---------------------------------------------------------------------------

def test_list_cameras_shape(client, db):
    make_admin(db, username="op", role="operator")
    make_camera(db, name="Door", slug="door")
    headers = auth_headers(client, "op")

    rows = client.get("/cameras", headers=headers).json()
    assert len(rows) == 1
    assert set(rows[0]) == _CAMERA_RESPONSE_KEYS
    # no public recognition session -> offline (not a stored column)
    assert rows[0]["status"] == "offline"
    assert "terminal_key" not in rows[0]
    assert "last_seen" not in rows[0]
    assert "last_seen_at" not in rows[0]
    assert "camera_status" not in rows[0]


def test_list_cameras_requires_auth(client):
    assert client.get("/cameras").status_code == 401


def test_get_camera_by_id(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, name="Lobby Cam", slug="lobby-cam")
    headers = auth_headers(client, "adm")

    response = client.get(f"/cameras/{camera.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["slug"] == "lobby-cam"


def test_get_camera_by_id_unknown_is_404(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")
    assert client.get("/cameras/9999", headers=headers).status_code == 404


# ---------------------------------------------------------------------------
# slug behavior (public dedicated-URL bootstrap)
# ---------------------------------------------------------------------------

def test_get_camera_by_slug_is_public(client, db):
    make_camera(db, name="Reception", slug="reception")
    response = client.get("/cameras/slug/reception")
    assert response.status_code == 200
    assert response.json()["slug"] == "reception"
    assert "terminal_key" not in response.json()


def test_get_camera_by_unknown_slug_is_404(client):
    assert client.get("/cameras/slug/ghost-camera").status_code == 404


def test_slug_is_generated_and_deduplicated(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")

    first = client.post(
        "/cameras",
        headers=headers,
        json={"name": "Side Entrance", "location": "East"},
    ).json()
    assert first["slug"] == "side-entrance"

    second = client.post(
        "/cameras",
        headers=headers,
        json={"name": "Side Entrance", "location": "West"},
    )
    # duplicate active name is rejected at the service layer
    assert second.status_code == 400


def test_slug_dedup_after_decommission(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")

    created = client.post(
        "/cameras",
        headers=headers,
        json={"name": "Gate", "location": "N"},
    ).json()
    assert created["slug"] == "gate"

    client.delete(f"/cameras/{created['id']}", headers=headers)

    # the decommissioned camera no longer reserves the slug, so a fresh
    # camera with the same name still gets the clean slug
    again = client.post(
        "/cameras",
        headers=headers,
        json={"name": "Gate", "location": "N"},
    ).json()
    assert again["slug"] == "gate"


# ---------------------------------------------------------------------------
# update + disable / status
# ---------------------------------------------------------------------------

def test_update_camera_fields(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, name="Old", slug="old")
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/cameras/{camera.id}",
        headers=headers,
        json={"name": "New Name", "location": "New Location"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "New Name"
    assert body["location"] == "New Location"
    assert body["slug"] == "old"  # slug is not regenerated on rename


def test_disable_camera_reports_disabled_status(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="toggle")
    headers = auth_headers(client, "adm")

    disabled = client.patch(
        f"/cameras/{camera.id}",
        headers=headers,
        json={"is_active": False},
    ).json()
    assert disabled["is_active"] is False
    assert disabled["status"] == "disabled"

    re_enabled = client.patch(
        f"/cameras/{camera.id}",
        headers=headers,
        json={"is_active": True},
    ).json()
    assert re_enabled["is_active"] is True
    # re-enabling does not start a public session
    assert re_enabled["status"] == "offline"


def test_update_camera_forbidden_for_operator(client, db):
    make_admin(db, username="op", role="operator")
    camera = make_camera(db, slug="op-cam")
    headers = auth_headers(client, "op")

    response = client.patch(
        f"/cameras/{camera.id}",
        headers=headers,
        json={"name": "Nope"},
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# decommission
# ---------------------------------------------------------------------------

def test_decommission_camera(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="dc")
    headers = auth_headers(client, "adm")

    response = client.delete(f"/cameras/{camera.id}", headers=headers)
    assert response.status_code == 200
    assert response.json() == {
        "message": "Camera decommissioned successfully."
    }

    # decommissioned cameras drop out of the management list
    rows = client.get("/cameras", headers=headers).json()
    assert rows == []


def test_decommission_camera_forbidden_for_operator(client, db):
    make_admin(db, username="op", role="operator")
    camera = make_camera(db, slug="op-dc")
    headers = auth_headers(client, "op")

    assert (
        client.delete(f"/cameras/{camera.id}", headers=headers).status_code
        == 403
    )


# ---------------------------------------------------------------------------
# recognition event <-> camera relationship
# ---------------------------------------------------------------------------

def test_recognition_event_uses_camera_id_and_relationship(client, db):
    from app.db.db_models.recognition_event import RecognitionEvent

    person = make_person(db, identifier="55555-5555555-5")
    camera = make_camera(db, slug="rel-cam")
    make_recognition_event(
        db, person_id=person.id, camera_id=camera.id
    )

    event = db.query(RecognitionEvent).one()
    assert event.camera_id == camera.id
    # ORM relationship resolves to the Camera row
    assert event.camera.id == camera.id
    assert event.camera.slug == "rel-cam"
    # reverse relationship
    assert [e.id for e in camera.recognition_events] == [event.id]


# ---------------------------------------------------------------------------
# obsolete Terminal subsystem is gone
# ---------------------------------------------------------------------------

def test_obsolete_terminal_routes_are_gone(client, db):
    make_admin(db, username="adm", role="admin")
    camera = make_camera(db, slug="legacy")
    headers = auth_headers(client, "adm")

    # old prefix
    assert client.get("/terminals", headers=headers).status_code == 404

    # removed device-pairing endpoints (both old and renamed prefixes)
    assert client.post(
        "/terminals/heartbeat",
        json={"terminal_key": "x", "camera_status": "connected"},
    ).status_code == 404
    assert client.post(
        "/cameras/heartbeat",
        json={"terminal_key": "x", "camera_status": "connected"},
    ).status_code in (404, 405)
    assert client.post(
        f"/cameras/slug/{camera.slug}/provision",
        json={"terminal_key": "x"},
    ).status_code == 404
    assert client.post(
        f"/cameras/{camera.id}/configure",
        headers=headers,
        json={"terminal_key": "x"},
    ).status_code in (404, 405)
    assert client.post(
        f"/cameras/{camera.id}/regenerate-key",
        headers=headers,
    ).status_code in (404, 405)


def test_obsolete_terminal_permissions_are_gone():
    from app.core.permissions import Permission

    names = {p.name for p in Permission}
    assert "VIEW_TERMINALS" not in names
    assert "MANAGE_TERMINALS" not in names
    assert "VIEW_CAMERAS" in names
    assert "MANAGE_CAMERAS" in names

    values = {p.value for p in Permission}
    assert "view_terminals" not in values
    assert "manage_terminals" not in values
    assert "view_cameras" in values
    assert "manage_cameras" in values
