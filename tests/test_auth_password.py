"""Characterization: POST /auth/change-password."""

from __future__ import annotations

from tests.helpers import DEFAULT_PASSWORD, auth_headers, make_admin


def _payload(current, new, confirm=None):
    return {
        "current_password": current,
        "new_password": new,
        "confirm_password": confirm if confirm is not None else new,
    }


def test_change_password_success(client, db):
    make_admin(db, username="ivy", role="operator")
    headers = auth_headers(client, "ivy")

    response = client.post(
        "/auth/change-password",
        headers=headers,
        json=_payload(DEFAULT_PASSWORD, "BrandNewPass1"),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Password changed successfully."
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]

    # new password now works
    assert client.post(
        "/auth/login",
        json={"username": "ivy", "password": "BrandNewPass1"},
    ).status_code == 200


def test_change_password_wrong_current(client, db):
    make_admin(db, username="jay", role="operator")
    headers = auth_headers(client, "jay")

    response = client.post(
        "/auth/change-password",
        headers=headers,
        json=_payload("not-the-current", "BrandNewPass1"),
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Current password is incorrect."}


def test_change_password_mismatch(client, db):
    make_admin(db, username="kim", role="operator")
    headers = auth_headers(client, "kim")

    response = client.post(
        "/auth/change-password",
        headers=headers,
        json=_payload(DEFAULT_PASSWORD, "BrandNewPass1", "Different1"),
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "New passwords do not match."}


def test_change_password_too_short(client, db):
    make_admin(db, username="lee", role="operator")
    headers = auth_headers(client, "lee")

    response = client.post(
        "/auth/change-password",
        headers=headers,
        json=_payload(DEFAULT_PASSWORD, "short1"),
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": "New password must be at least 8 characters long."
    }


def test_change_password_same_as_current(client, db):
    make_admin(db, username="mae", role="operator")
    headers = auth_headers(client, "mae")

    response = client.post(
        "/auth/change-password",
        headers=headers,
        json=_payload(DEFAULT_PASSWORD, DEFAULT_PASSWORD),
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": "New password must be different from the current password."
    }


def test_change_password_requires_auth(client):
    response = client.post(
        "/auth/change-password",
        json=_payload("a", "abcdefgh"),
    )
    assert response.status_code == 401
