"""Characterization: /users (admin/user management, privilege scoping)."""

from __future__ import annotations

from tests.helpers import auth_headers, make_admin


def test_super_admin_creates_operator(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")

    response = client.post(
        "/users",
        headers=headers,
        json={"full_name": "New Op", "username": "newop", "role": "operator"},
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "id",
        "full_name",
        "username",
        "role",
        "temporary_password",
    }
    assert body["role"] == "operator"
    assert isinstance(body["temporary_password"], str) and body["temporary_password"]


def test_super_admin_creates_admin(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    response = client.post(
        "/users",
        headers=headers,
        json={"full_name": "New Adm", "username": "newadm", "role": "admin"},
    )
    assert response.status_code == 200


def test_admin_creates_operator(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")
    response = client.post(
        "/users",
        headers=headers,
        json={"full_name": "Op", "username": "op2", "role": "operator"},
    )
    assert response.status_code == 200


def test_admin_cannot_create_admin(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")
    response = client.post(
        "/users",
        headers=headers,
        json={"full_name": "X", "username": "x", "role": "admin"},
    )
    assert response.status_code == 403
    assert response.json() == {
        "detail": "You cannot create a user with this role."
    }


def test_operator_cannot_create_users(client, db):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")
    response = client.post(
        "/users",
        headers=headers,
        json={"full_name": "X", "username": "x", "role": "operator"},
    )
    assert response.status_code == 403


def test_create_user_duplicate_username_is_409(client, db):
    make_admin(db, username="root", role="super_admin")
    make_admin(db, username="taken", role="operator")
    headers = auth_headers(client, "root")
    response = client.post(
        "/users",
        headers=headers,
        json={"full_name": "X", "username": "taken", "role": "operator"},
    )
    assert response.status_code == 409
    assert response.json() == {"detail": "Username already exists."}


def test_list_users_shape(client, db):
    make_admin(db, username="root", role="super_admin", full_name="Root R")
    headers = auth_headers(client, "root")

    rows = client.get("/users", headers=headers).json()
    assert len(rows) == 1
    assert set(rows[0]) == {
        "id",
        "full_name",
        "display_name",
        "username",
        "role",
        "profile_image_url",
        "is_active",
        "must_change_password",
        "created_at",
    }


def test_list_users_forbidden_for_operator(client, db):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")
    assert client.get("/users", headers=headers).status_code == 403


def test_reset_own_password_rejected(client, db):
    root = make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    response = client.post(
        f"/users/{root.id}/reset-password", headers=headers
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": "You cannot reset your own password using this function."
    }


def test_reset_other_password(client, db):
    make_admin(db, username="root", role="super_admin")
    target = make_admin(db, username="victim", role="operator")
    headers = auth_headers(client, "root")

    response = client.post(
        f"/users/{target.id}/reset-password", headers=headers
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "message",
        "user_id",
        "username",
        "temporary_password",
    }
    assert body["user_id"] == target.id


def test_admin_cannot_change_roles(client, db):
    make_admin(db, username="adm", role="admin")
    target = make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/users/{target.id}/role",
        params={"role": "admin"},
        headers=headers,
    )
    assert response.status_code == 403
    assert response.json() == {
        "detail": "Only a Super Admin may change user roles."
    }


def test_change_own_status_rejected(client, db):
    root = make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    response = client.patch(
        f"/users/{root.id}/status",
        params={"is_active": False},
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": "You cannot change your own account status."
    }


def test_delete_own_account_rejected(client, db):
    root = make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    response = client.delete(f"/users/{root.id}", headers=headers)
    assert response.status_code == 400
    assert response.json() == {
        "detail": "You cannot delete your own account."
    }


def test_deactivate_operator_by_super_admin(client, db):
    make_admin(db, username="root", role="super_admin")
    target = make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "root")

    response = client.patch(
        f"/users/{target.id}/status",
        params={"is_active": False},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["is_active"] is False
    assert body["message"] == "User deactivated successfully."


def test_users_require_auth(client):
    assert client.get("/users").status_code == 401
