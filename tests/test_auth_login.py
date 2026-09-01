"""POST /auth/login — login contract.

B5 hardening: the credential-failure response is byte-identical for an
unknown username, a wrong password, and a disabled account probed without
the real password (no username enumeration, no attempt countdown).
Deeper lockout / gating behaviour lives in ``test_auth_hardening.py``.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from tests.helpers import DEFAULT_PASSWORD, make_admin

_GENERIC_FAILURE = {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password.",
}


def test_login_success_shape(client, db):
    make_admin(db, username="alice", role="admin", full_name="Alice A")

    response = client.post(
        "/auth/login",
        json={"username": "alice", "password": DEFAULT_PASSWORD},
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "access_token",
        "token_type",
        "must_change_password",
        "user",
    }
    assert body["token_type"] == "bearer"
    assert body["must_change_password"] is False
    assert body["user"] == {
        "id": 1,
        "full_name": "Alice A",
        "display_name": "Alice A",
        "username": "alice",
        "role": "admin",
    }
    assert isinstance(body["access_token"], str) and body["access_token"]


def test_login_unknown_user(client):
    response = client.post(
        "/auth/login",
        json={"username": "nobody", "password": "whatever"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == _GENERIC_FAILURE


def test_login_wrong_password(client, db):
    make_admin(db, username="bob", role="operator")

    response = client.post(
        "/auth/login",
        json={"username": "bob", "password": "wrong-1"},
    )
    assert response.status_code == 401
    detail = response.json()["detail"]
    assert detail == _GENERIC_FAILURE
    # no attempt countdown — it would betray that the account exists
    assert "attempts_remaining" not in detail


def test_login_unknown_and_wrong_password_are_indistinguishable(client, db):
    make_admin(db, username="realuser", role="operator")

    unknown = client.post(
        "/auth/login",
        json={"username": "ghostuser", "password": "nope"},
    )
    wrong = client.post(
        "/auth/login",
        json={"username": "realuser", "password": "nope"},
    )

    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json() == wrong.json()


def test_login_fifth_failure_locks_account(client, db):
    make_admin(db, username="carol", role="operator")

    last = None
    for _ in range(5):
        last = client.post(
            "/auth/login",
            json={"username": "carol", "password": "bad"},
        )

    assert last.status_code == 423
    detail = last.json()["detail"]
    assert detail["code"] == "ACCOUNT_TEMPORARILY_LOCKED"
    assert "attempts_remaining" not in detail
    locked_until = datetime.fromisoformat(detail["locked_until"])
    assert locked_until > datetime.now(timezone.utc)


def test_login_when_already_locked(client, db):
    make_admin(
        db,
        username="dave",
        role="operator",
        failed_login_attempts=5,
        locked_until=datetime.now(timezone.utc) + timedelta(minutes=15),
    )

    response = client.post(
        "/auth/login",
        json={"username": "dave", "password": DEFAULT_PASSWORD},
    )
    assert response.status_code == 423
    detail = response.json()["detail"]
    assert detail["code"] == "ACCOUNT_TEMPORARILY_LOCKED"
    assert detail["message"] == "Account temporarily locked."
    assert "locked_until" in detail


def test_login_disabled_account_with_correct_password_reveals_disabled(client, db):
    # The owner of the account (they supplied the real password) is allowed
    # to learn it was disabled by an administrator.
    make_admin(db, username="erin", role="operator", is_active=False)

    response = client.post(
        "/auth/login",
        json={"username": "erin", "password": DEFAULT_PASSWORD},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == {
        "code": "ACCOUNT_ADMINISTRATIVELY_DISABLED",
        "message": "This account has been disabled by an administrator.",
    }


def test_login_disabled_account_with_wrong_password_is_generic(client, db):
    make_admin(db, username="evan", role="operator", is_active=False)

    response = client.post(
        "/auth/login",
        json={"username": "evan", "password": "not-the-password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == _GENERIC_FAILURE


def test_login_must_change_password_flag_passed_through(client, db):
    make_admin(
        db,
        username="frank",
        role="operator",
        must_change_password=True,
    )
    response = client.post(
        "/auth/login",
        json={"username": "frank", "password": DEFAULT_PASSWORD},
    )
    assert response.status_code == 200
    assert response.json()["must_change_password"] is True


def test_login_missing_body_is_422(client):
    assert client.post("/auth/login", json={}).status_code == 422


def test_lock_status_endpoint_is_gone(client, db):
    # The public, side-effecting GET /auth/lock-status/{username} was removed.
    make_admin(db, username="grace", role="operator")
    assert client.get("/auth/lock-status/grace").status_code == 404
