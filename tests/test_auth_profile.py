"""Characterization: GET/PATCH /auth/profile."""

from __future__ import annotations

from tests.helpers import auth_headers, make_admin


def test_get_profile_shape(client, db):
    make_admin(db, username="pat", role="admin", full_name="Pat P")
    headers = auth_headers(client, "pat")

    response = client.get("/auth/profile", headers=headers)
    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "full_name": "Pat P",
        "display_name": "Pat P",
        "username": "pat",
        "role": "admin",
        "profile_image_url": None,
    }


def test_get_profile_requires_auth(client):
    response = client.get("/auth/profile")
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated."}


def test_get_profile_rejects_garbage_token(client):
    response = client.get(
        "/auth/profile",
        headers={"Authorization": "Bearer not.a.jwt"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid authentication token."}


def test_patch_profile_updates_name(client, db):
    # The legacy ``full_name`` form field is accepted as an alias, but it
    # updates the Display Name — the original full_name is not touched.
    make_admin(db, username="quinn", role="operator", full_name="Quinn Q")
    headers = auth_headers(client, "quinn")

    response = client.patch(
        "/auth/profile",
        headers=headers,
        data={"full_name": "  Quinn Renamed  "},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "Quinn Renamed"
    assert body["full_name"] == "Quinn Q"
    assert body["username"] == "quinn"
    assert body["profile_image_url"] is None


def test_patch_profile_blank_name_rejected(client, db):
    make_admin(db, username="rob", role="operator")
    headers = auth_headers(client, "rob")

    response = client.patch(
        "/auth/profile",
        headers=headers,
        data={"full_name": "   "},
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Display name is required."}


def test_patch_profile_name_too_long_rejected(client, db):
    make_admin(db, username="sam", role="operator")
    headers = auth_headers(client, "sam")

    response = client.patch(
        "/auth/profile",
        headers=headers,
        data={"full_name": "x" * 101},
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": "Display name must be 100 characters or less."
    }
