"""B8 — Users & role management.

Backend authorization for the V1 role matrix:

    SUPER ADMIN  (exactly one, the deployment owner)
        can manage Admins and Operators, cannot create/assign Super Admin,
        cannot delete / disable / demote itself
    ADMIN
        can create and manage Operators only; no role changes; no Settings
    OPERATOR
        no Users management at all
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from app.repositories.admin_repository import AdminRepository
from tests.helpers import DEFAULT_PASSWORD, make_admin


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _token(client, username, password=DEFAULT_PASSWORD):
    response = client.post(
        "/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _claims(token):
    return jwt.decode(token, options={"verify_signature": False})


def _reload(db, admin_id):
    db.expire_all()
    return AdminRepository(db).get_by_id(admin_id)


def _create_user(client, actor_token, *, full_name, username, role, display_name=None):
    body = {"full_name": full_name, "username": username, "role": role}
    if display_name is not None:
        body["display_name"] = display_name
    return client.post("/users", headers=_hdr(actor_token), json=body)


# ===========================================================================
# SUPER ADMIN
# ===========================================================================

def test_exactly_one_super_admin_and_cannot_create_another(client, db):
    make_admin(db, username="root", role="super_admin")
    token = _token(client, "root")

    assert AdminRepository(db).count_super_admins() == 1

    response = _create_user(
        client, token, full_name="Second Owner",
        username="root2", role="super_admin",
    )
    assert response.status_code == 403
    assert response.json() == {
        "detail": "You cannot create a user with this role."
    }
    assert AdminRepository(db).count_super_admins() == 1


def test_super_admin_creates_admin(client, db):
    make_admin(db, username="root", role="super_admin")
    response = _create_user(
        client, _token(client, "root"),
        full_name="New Admin", username="newadm", role="admin",
    )
    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    row = AdminRepository(db).get_by_username("newadm")
    assert row.must_change_password is True
    assert row.token_version == 0


def test_super_admin_creates_operator(client, db):
    make_admin(db, username="root", role="super_admin")
    response = _create_user(
        client, _token(client, "root"),
        full_name="New Op", username="newop", role="operator",
    )
    assert response.status_code == 200
    assert response.json()["role"] == "operator"


def test_super_admin_promotes_operator_to_admin(client, db):
    make_admin(db, username="root", role="super_admin")
    target = make_admin(db, username="op", role="operator")
    before = _reload(db, target.id).token_version

    response = client.patch(
        f"/users/{target.id}/role",
        params={"role": "admin"},
        headers=_hdr(_token(client, "root")),
    )
    assert response.status_code == 200

    row = _reload(db, target.id)
    assert row.role == "admin"
    assert row.token_version == before + 1


def test_super_admin_demotes_admin_to_operator(client, db):
    make_admin(db, username="root", role="super_admin")
    target = make_admin(db, username="adm", role="admin")

    response = client.patch(
        f"/users/{target.id}/role",
        params={"role": "operator"},
        headers=_hdr(_token(client, "root")),
    )
    assert response.status_code == 200
    assert _reload(db, target.id).role == "operator"


def test_super_admin_cannot_change_own_role(client, db):
    root = make_admin(db, username="root", role="super_admin")
    response = client.patch(
        f"/users/{root.id}/role",
        params={"role": "admin"},
        headers=_hdr(_token(client, "root")),
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "You cannot change your own role."}
    assert _reload(db, root.id).role == "super_admin"


def test_super_admin_cannot_delete_self(client, db):
    root = make_admin(db, username="root", role="super_admin")
    response = client.delete(
        f"/users/{root.id}", headers=_hdr(_token(client, "root"))
    )
    assert response.status_code == 400
    assert _reload(db, root.id) is not None


def test_super_admin_cannot_disable_self(client, db):
    root = make_admin(db, username="root", role="super_admin")
    response = client.patch(
        f"/users/{root.id}/status",
        params={"is_active": False},
        headers=_hdr(_token(client, "root")),
    )
    assert response.status_code == 400
    assert _reload(db, root.id).is_active is True


def test_super_admin_cannot_assign_super_admin_role(client, db):
    make_admin(db, username="root", role="super_admin")
    target = make_admin(db, username="op", role="operator")
    response = client.patch(
        f"/users/{target.id}/role",
        params={"role": "super_admin"},
        headers=_hdr(_token(client, "root")),
    )
    assert response.status_code == 403
    assert response.json() == {
        "detail": "The Super Admin role cannot be assigned."
    }
    assert _reload(db, target.id).role == "operator"


def test_super_admin_manages_permitted_users(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator")
    token = _token(client, "root")

    assert client.post(
        f"/users/{op.id}/reset-password", headers=_hdr(token)
    ).status_code == 200
    assert client.patch(
        f"/users/{op.id}/status",
        params={"is_active": False},
        headers=_hdr(token),
    ).status_code == 200


# ===========================================================================
# ADMIN
# ===========================================================================

def test_admin_creates_operator(client, db):
    make_admin(db, username="adm", role="admin")
    response = _create_user(
        client, _token(client, "adm"),
        full_name="Op", username="op2", role="operator",
    )
    assert response.status_code == 200


def test_admin_cannot_create_admin(client, db):
    make_admin(db, username="adm", role="admin")
    response = _create_user(
        client, _token(client, "adm"),
        full_name="X", username="x", role="admin",
    )
    assert response.status_code == 403
    assert response.json() == {
        "detail": "You cannot create a user with this role."
    }


def test_admin_cannot_create_super_admin(client, db):
    make_admin(db, username="adm", role="admin")
    response = _create_user(
        client, _token(client, "adm"),
        full_name="X", username="x", role="super_admin",
    )
    assert response.status_code == 403


def test_admin_cannot_promote_operator_to_admin(client, db):
    make_admin(db, username="adm", role="admin")
    target = make_admin(db, username="op", role="operator")
    response = client.patch(
        f"/users/{target.id}/role",
        params={"role": "admin"},
        headers=_hdr(_token(client, "adm")),
    )
    assert response.status_code == 403
    assert response.json() == {
        "detail": "Only a Super Admin may change user roles."
    }


def test_admin_cannot_demote_another_admin(client, db):
    make_admin(db, username="adm", role="admin")
    other = make_admin(db, username="adm2", role="admin")
    response = client.patch(
        f"/users/{other.id}/role",
        params={"role": "operator"},
        headers=_hdr(_token(client, "adm")),
    )
    assert response.status_code == 403


def test_admin_cannot_modify_super_admin(client, db):
    root = make_admin(db, username="root", role="super_admin")
    make_admin(db, username="adm", role="admin")
    token = _token(client, "adm")

    assert client.post(
        f"/users/{root.id}/reset-password", headers=_hdr(token)
    ).status_code == 403
    assert client.patch(
        f"/users/{root.id}/status",
        params={"is_active": False},
        headers=_hdr(token),
    ).status_code == 403
    assert client.patch(
        f"/users/{root.id}",
        headers=_hdr(token),
        json={"display_name": "hacked"},
    ).status_code == 403


def test_admin_cannot_access_system_settings(client, db):
    make_admin(db, username="adm", role="admin")
    assert client.get(
        "/settings/system", headers=_hdr(_token(client, "adm"))
    ).status_code == 403


def test_admin_manages_permitted_operator(client, db):
    make_admin(db, username="adm", role="admin")
    op = make_admin(db, username="op", role="operator")
    token = _token(client, "adm")

    assert client.post(
        f"/users/{op.id}/reset-password", headers=_hdr(token)
    ).status_code == 200
    assert client.patch(
        f"/users/{op.id}",
        headers=_hdr(token),
        json={"full_name": "Corrected Name"},
    ).status_code == 200
    assert client.patch(
        f"/users/{op.id}/status",
        params={"is_active": False},
        headers=_hdr(token),
    ).status_code == 200


def test_admin_cannot_touch_another_admin_state(client, db):
    make_admin(db, username="adm", role="admin")
    other = make_admin(db, username="adm2", role="admin")
    token = _token(client, "adm")

    assert client.post(
        f"/users/{other.id}/reset-password", headers=_hdr(token)
    ).status_code == 403
    assert client.patch(
        f"/users/{other.id}/status",
        params={"is_active": False},
        headers=_hdr(token),
    ).status_code == 403
    assert client.delete(
        f"/users/{other.id}", headers=_hdr(token)
    ).status_code == 403


# ===========================================================================
# OPERATOR
# ===========================================================================

def test_operator_is_locked_out_of_users_management(client, db):
    make_admin(db, username="root", role="super_admin")
    victim = make_admin(db, username="victim", role="operator")
    make_admin(db, username="op", role="operator")
    token = _token(client, "op")

    assert client.get("/users", headers=_hdr(token)).status_code == 403
    assert _create_user(
        client, token, full_name="X", username="x", role="operator"
    ).status_code == 403
    assert client.patch(
        f"/users/{victim.id}/role",
        params={"role": "admin"},
        headers=_hdr(token),
    ).status_code == 403
    assert client.post(
        f"/users/{victim.id}/reset-password", headers=_hdr(token)
    ).status_code == 403
    assert client.patch(
        f"/users/{victim.id}/status",
        params={"is_active": False},
        headers=_hdr(token),
    ).status_code == 403
    assert client.patch(
        f"/users/{victim.id}",
        headers=_hdr(token),
        json={"display_name": "x"},
    ).status_code == 403
    assert client.delete(
        f"/users/{victim.id}", headers=_hdr(token)
    ).status_code == 403


def test_operator_cannot_access_system_settings(client, db):
    make_admin(db, username="op", role="operator")
    assert client.get(
        "/settings/system", headers=_hdr(_token(client, "op"))
    ).status_code == 403


def test_operator_keeps_person_camera_activity_access(client, db):
    make_admin(db, username="op", role="operator")
    token = _token(client, "op")
    assert client.get("/persons", headers=_hdr(token)).status_code == 200
    assert client.get("/cameras", headers=_hdr(token)).status_code == 200
    assert client.get("/activity", headers=_hdr(token)).status_code == 200


def test_operator_cannot_export_activity(client, db):
    make_admin(db, username="op", role="operator")
    assert client.get(
        "/activity/export", headers=_hdr(_token(client, "op"))
    ).status_code == 403


# ===========================================================================
# FULL NAME / DISPLAY NAME (managed edit)
# ===========================================================================

def test_manager_updates_full_name(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator",
                    full_name="Wrong Name", display_name="Nick")

    response = client.patch(
        f"/users/{op.id}",
        headers=_hdr(_token(client, "root")),
        json={"full_name": "  Right Name  "},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Right Name"
    assert body["display_name"] == "Nick"          # untouched
    row = _reload(db, op.id)
    assert row.full_name == "Right Name"
    assert row.username == "op"                     # untouched


def test_manager_updates_display_name_independently(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator",
                    full_name="Original", display_name="Original")

    response = client.patch(
        f"/users/{op.id}",
        headers=_hdr(_token(client, "root")),
        json={"display_name": "Shorty"},
    )
    assert response.status_code == 200
    row = _reload(db, op.id)
    assert row.display_name == "Shorty"
    assert row.full_name == "Original"             # untouched


def test_managed_edit_ignores_username_and_role(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator", full_name="Op Name")

    response = client.patch(
        f"/users/{op.id}",
        headers=_hdr(_token(client, "root")),
        json={
            "full_name": "New Name",
            "username": "hacked",
            "role": "super_admin",
        },
    )
    assert response.status_code == 200
    row = _reload(db, op.id)
    assert row.full_name == "New Name"
    assert row.username == "op"
    assert row.role == "operator"


def test_managed_edit_requires_a_field(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator")
    response = client.patch(
        f"/users/{op.id}",
        headers=_hdr(_token(client, "root")),
        json={},
    )
    assert response.status_code == 400


def test_managed_edit_rejects_blank_and_overlong(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator")
    token = _token(client, "root")

    assert client.patch(
        f"/users/{op.id}", headers=_hdr(token), json={"full_name": "   "}
    ).status_code == 400
    assert client.patch(
        f"/users/{op.id}", headers=_hdr(token),
        json={"display_name": "x" * 101},
    ).status_code == 400


def test_managed_edit_does_not_rotate_token_version(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator")
    op_token = _token(client, "op")
    before = _reload(db, op.id).token_version

    client.patch(
        f"/users/{op.id}",
        headers=_hdr(_token(client, "root")),
        json={"display_name": "Renamed"},
    )
    assert _reload(db, op.id).token_version == before
    # a name edit is not a security event — the operator stays logged in
    assert client.get("/persons", headers=_hdr(op_token)).status_code == 200


# ===========================================================================
# PASSWORD RESET  (token lifecycle preserved from B6)
# ===========================================================================

def test_admin_reset_rotates_token_version_and_invalidates_tokens(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator")
    op_token = _token(client, "op")
    before = _reload(db, op.id).token_version

    reset = client.post(
        f"/users/{op.id}/reset-password", headers=_hdr(_token(client, "root"))
    )
    assert reset.status_code == 200
    temp_password = reset.json()["temporary_password"]

    row = _reload(db, op.id)
    assert row.token_version == before + 1
    assert row.must_change_password is True

    assert client.get("/persons", headers=_hdr(op_token)).status_code == 401

    forced_token = _token(client, "op", temp_password)
    assert _claims(forced_token)["must_change_password"] is True
    assert client.get("/persons", headers=_hdr(forced_token)).status_code == 403
    changed = client.post(
        "/auth/change-password",
        headers=_hdr(forced_token),
        json={
            "current_password": temp_password,
            "new_password": "OperatorNew123",
            "confirm_password": "OperatorNew123",
        },
    )
    assert changed.status_code == 200


# ===========================================================================
# ACCOUNT STATUS
# ===========================================================================

def test_disable_invalidates_tokens_and_blocks_auth(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator")
    op_token = _token(client, "op")
    before = _reload(db, op.id).token_version

    disabled = client.patch(
        f"/users/{op.id}/status",
        params={"is_active": False},
        headers=_hdr(_token(client, "root")),
    )
    assert disabled.status_code == 200

    row = _reload(db, op.id)
    assert row.is_active is False
    assert row.token_version == before + 1

    # existing token no longer works
    response = client.get("/persons", headers=_hdr(op_token))
    assert response.status_code == 403

    # cannot obtain a new token either
    login = client.post(
        "/auth/login",
        json={"username": "op", "password": DEFAULT_PASSWORD},
    )
    assert login.status_code == 403


def test_reenable_clears_stale_lockout_state(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(
        db,
        username="op",
        role="operator",
        is_active=False,
        failed_login_attempts=5,
        lockout_count=2,
        locked_until=datetime.now(timezone.utc) + timedelta(minutes=30),
    )

    response = client.patch(
        f"/users/{op.id}/status",
        params={"is_active": True},
        headers=_hdr(_token(client, "root")),
    )
    assert response.status_code == 200

    row = _reload(db, op.id)
    assert row.is_active is True
    assert row.failed_login_attempts == 0
    assert row.lockout_count == 0
    assert row.locked_until is None

    # and the account can authenticate again straight away
    assert client.post(
        "/auth/login",
        json={"username": "op", "password": DEFAULT_PASSWORD},
    ).status_code == 200


def test_reenable_does_not_touch_password_or_role(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator", is_active=False)
    token = _token(client, "root")

    client.patch(
        f"/users/{op.id}/status",
        params={"is_active": True},
        headers=_hdr(token),
    )
    row = _reload(db, op.id)
    assert row.role == "operator"
    assert row.must_change_password is False


# ===========================================================================
# ROLE CHANGE — authorization context follows the DB
# ===========================================================================

def test_role_change_invalidates_old_tokens_and_grants_new_authority(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator")
    op_token = _token(client, "op")

    promote = client.patch(
        f"/users/{op.id}/role",
        params={"role": "admin"},
        headers=_hdr(_token(client, "root")),
    )
    assert promote.status_code == 200

    # token minted while the account was an Operator no longer works
    assert client.get("/persons", headers=_hdr(op_token)).status_code == 401

    # a fresh login reflects the new role: Users + Activity export now allowed
    new_token = _token(client, "op")
    assert client.get("/users", headers=_hdr(new_token)).status_code == 200
    assert client.get(
        "/activity/export", headers=_hdr(new_token)
    ).status_code == 200


def test_unauthorized_roles_cannot_change_roles(client, db):
    make_admin(db, username="adm", role="admin")
    make_admin(db, username="op", role="operator")
    target = make_admin(db, username="t", role="operator")

    assert client.patch(
        f"/users/{target.id}/role",
        params={"role": "admin"},
        headers=_hdr(_token(client, "adm")),
    ).status_code == 403
    assert client.patch(
        f"/users/{target.id}/role",
        params={"role": "admin"},
        headers=_hdr(_token(client, "op")),
    ).status_code == 403


def test_no_op_role_change_rejected(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator")
    response = client.patch(
        f"/users/{op.id}/role",
        params={"role": "operator"},
        headers=_hdr(_token(client, "root")),
    )
    assert response.status_code == 400


# ===========================================================================
# DELETE
# ===========================================================================

def test_super_admin_deletes_operator(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator")
    response = client.delete(
        f"/users/{op.id}", headers=_hdr(_token(client, "root"))
    )
    assert response.status_code == 200
    assert _reload(db, op.id) is None


def test_deleted_user_token_stops_working(client, db):
    make_admin(db, username="root", role="super_admin")
    op = make_admin(db, username="op", role="operator")
    op_token = _token(client, "op")

    client.delete(f"/users/{op.id}", headers=_hdr(_token(client, "root")))

    assert client.get("/persons", headers=_hdr(op_token)).status_code == 401


def test_operator_cannot_delete_and_admin_cannot_delete_admin(client, db):
    make_admin(db, username="op", role="operator")
    make_admin(db, username="adm", role="admin")
    other_admin = make_admin(db, username="adm2", role="admin")
    victim = make_admin(db, username="victim", role="operator")

    assert client.delete(
        f"/users/{victim.id}", headers=_hdr(_token(client, "op"))
    ).status_code == 403
    assert client.delete(
        f"/users/{other_admin.id}", headers=_hdr(_token(client, "adm"))
    ).status_code == 403


def test_sole_super_admin_cannot_be_deleted(client, db):
    root = make_admin(db, username="root", role="super_admin")
    make_admin(db, username="adm", role="admin")

    # by another manager -> scope check
    assert client.delete(
        f"/users/{root.id}", headers=_hdr(_token(client, "adm"))
    ).status_code == 403
    # by itself -> self-protection
    assert client.delete(
        f"/users/{root.id}", headers=_hdr(_token(client, "root"))
    ).status_code == 400
    assert _reload(db, root.id) is not None


# ===========================================================================
# AUTHORIZATION — backend is authoritative
# ===========================================================================

def test_direct_api_calls_cannot_bypass_role_restrictions(client, db):
    """An Operator with a completely valid token still cannot reach any
    Users-management or Settings operation by calling the API directly."""
    make_admin(db, username="root", role="super_admin")
    target = make_admin(db, username="target", role="operator")
    make_admin(db, username="op", role="operator")
    token = _token(client, "op")

    forbidden = [
        ("get", "/users", {}),
        ("post", "/users", {"json": {"full_name": "a", "username": "b", "role": "operator"}}),
        ("patch", f"/users/{target.id}", {"json": {"full_name": "x"}}),
        ("patch", f"/users/{target.id}/role", {"params": {"role": "admin"}}),
        ("patch", f"/users/{target.id}/status", {"params": {"is_active": False}}),
        ("post", f"/users/{target.id}/reset-password", {}),
        ("patch", f"/users/{target.id}/unlock", {}),
        ("delete", f"/users/{target.id}", {}),
        ("get", "/settings/system", {}),
        ("get", "/activity/export", {}),
    ]
    for method, path, kwargs in forbidden:
        response = getattr(client, method)(
            path, headers=_hdr(token), **kwargs
        )
        assert response.status_code == 403, f"{method} {path} -> {response.status_code}"
