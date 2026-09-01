"""Characterization: /settings/system  (Super Admin only)."""

from __future__ import annotations

from tests.helpers import auth_headers, make_admin

EXPECTED_KEYS = {
    "recognition_match_threshold",
    "duplicate_face_match_threshold",
}
# Defaults equal the pre-B9 hard-coded values in app/core/config.py.
EXPECTED_DEFAULTS = {
    "recognition_match_threshold": 1.0,
    "duplicate_face_match_threshold": 0.75,
}
_ENTRY_FIELDS = {
    "value",
    "default",
    "type",
    "description",
    "minimum",
    "maximum",
    "updated_at",
    "updated_by",
}


def test_get_system_settings_super_admin(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")

    response = client.get("/settings/system", headers=headers)
    assert response.status_code == 200
    settings = response.json()["settings"]
    assert set(settings) == EXPECTED_KEYS
    for key, default in EXPECTED_DEFAULTS.items():
        entry = settings[key]
        assert set(entry) == _ENTRY_FIELDS
        assert entry["value"] == default
        assert entry["default"] == default
        assert entry["type"] == "float"
        assert entry["minimum"] == 0.1
        assert entry["maximum"] == 2.0
        assert entry["description"]
        assert entry["updated_at"] is None
        assert entry["updated_by"] is None


def test_get_system_settings_forbidden_for_admin(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")
    assert client.get("/settings/system", headers=headers).status_code == 403


def test_get_system_settings_forbidden_for_operator(client, db):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")
    assert client.get("/settings/system", headers=headers).status_code == 403


def test_get_system_settings_requires_auth(client):
    assert client.get("/settings/system").status_code == 401


def test_update_system_setting_persists_value(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")

    response = client.put(
        "/settings/system",
        headers=headers,
        json={"settings": {"recognition_match_threshold": 0.9}},
    )
    assert response.status_code == 200
    entry = response.json()["settings"]["recognition_match_threshold"]
    assert entry["value"] == 0.9
    assert entry["updated_by"] == 1
    assert entry["updated_at"] is not None


def test_update_system_setting_unknown_key_is_400(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    response = client.put(
        "/settings/system",
        headers=headers,
        json={"settings": {"totally_made_up": 1}},
    )
    assert response.status_code == 400
    assert response.json()["detail"].startswith(
        "Unknown system setting(s): totally_made_up"
    )


def test_update_system_setting_empty_is_400(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    response = client.put(
        "/settings/system", headers=headers, json={"settings": {}}
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "No settings were provided."}


def test_update_system_setting_out_of_range_is_400(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    response = client.put(
        "/settings/system",
        headers=headers,
        json={"settings": {"recognition_match_threshold": 999}},
    )
    assert response.status_code == 400
    assert "between" in response.json()["detail"]
