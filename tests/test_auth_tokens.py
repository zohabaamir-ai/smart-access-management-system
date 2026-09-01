"""B6 — access-token lifecycle (per-admin ``token_version``).

A password change or administrative password reset bumps
``admins.token_version``; every access token carries the version it was
minted with, and the authentication chokepoint rejects any token whose
version no longer matches. No blacklist, no session table.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import JWT_ALGORITHM, JWT_SECRET_KEY
from app.repositories.admin_repository import AdminRepository
from tests.helpers import DEFAULT_PASSWORD, make_admin


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _login(client, username, password=DEFAULT_PASSWORD):
    return client.post(
        "/auth/login",
        json={"username": username, "password": password},
    )


def _token(client, username, password=DEFAULT_PASSWORD):
    response = _login(client, username, password)
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _claims(token):
    return jwt.decode(token, options={"verify_signature": False})


def _reload(db, admin_id):
    db.expire_all()
    return AdminRepository(db).get_by_id(admin_id)


def _change_password(client, token, current, new):
    return client.post(
        "/auth/change-password",
        headers=_hdr(token),
        json={
            "current_password": current,
            "new_password": new,
            "confirm_password": new,
        },
    )


# ---------------------------------------------------------------------------
# token issuance
# ---------------------------------------------------------------------------

def test_issued_token_carries_token_version(client, db):
    make_admin(db, username="iss", role="operator")
    claims = _claims(_token(client, "iss"))
    assert claims["token_version"] == 0


def test_token_version_reflects_current_db_value(client, db):
    make_admin(db, username="seeded", role="operator", token_version=4)
    claims = _claims(_token(client, "seeded"))
    assert claims["token_version"] == 4


def test_api_created_user_starts_at_token_version_zero(client, db):
    make_admin(db, username="root", role="super_admin")
    response = client.post(
        "/users",
        headers=_hdr(_token(client, "root")),
        json={"full_name": "New Op", "username": "newop", "role": "operator"},
    )
    assert response.status_code == 200
    created = AdminRepository(db).get_by_username("newop")
    assert created.token_version == 0


# ---------------------------------------------------------------------------
# token validation
# ---------------------------------------------------------------------------

def test_current_token_is_accepted(client, db):
    make_admin(db, username="cur", role="operator")
    token = _token(client, "cur")
    assert client.get("/auth/profile", headers=_hdr(token)).status_code == 200
    assert client.get("/persons", headers=_hdr(token)).status_code == 200


def test_expired_token_is_rejected(client, db):
    make_admin(db, username="exp", role="operator")
    expired = jwt.encode(
        {
            "sub": "1",
            "username": "exp",
            "role": "operator",
            "must_change_password": False,
            "token_version": 0,
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )
    response = client.get("/auth/profile", headers=_hdr(expired))
    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication token has expired."}


def test_stale_token_version_is_rejected(client, db):
    admin = make_admin(db, username="stale", role="operator")
    token = _token(client, "stale")  # minted at version 0

    # something advanced the account's version out from under the token
    admin.token_version = 1
    db.commit()

    assert client.get("/persons", headers=_hdr(token)).status_code == 401
    assert client.get("/auth/profile", headers=_hdr(token)).status_code == 401


def test_matching_token_version_succeeds(client, db):
    make_admin(db, username="match", role="operator", token_version=9)
    token = _token(client, "match")  # minted at version 9, matches
    assert client.get("/persons", headers=_hdr(token)).status_code == 200


def test_token_without_version_claim_is_rejected(client, db):
    # pre-B6 style token: valid signature, no token_version claim
    make_admin(db, username="legacy", role="operator")
    legacy = jwt.encode(
        {
            "sub": "1",
            "username": "legacy",
            "role": "operator",
            "must_change_password": False,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )
    assert client.get("/persons", headers=_hdr(legacy)).status_code == 401


# ---------------------------------------------------------------------------
# password change
# ---------------------------------------------------------------------------

def test_password_change_rotates_token_version_and_kills_old_tokens(client, db):
    admin = make_admin(db, username="chg", role="operator")

    old_a = _token(client, "chg")
    old_b = _token(client, "chg")  # a second, independently issued token

    changed = _change_password(client, old_a, DEFAULT_PASSWORD, "BrandNewPass1")
    assert changed.status_code == 200
    new_token = changed.json()["access_token"]

    row = _reload(db, admin.id)
    assert row.token_version == 1
    assert row.must_change_password is False

    assert _claims(new_token)["token_version"] == 1

    # every token minted before the change is now invalid
    assert client.get("/persons", headers=_hdr(old_a)).status_code == 401
    assert client.get("/persons", headers=_hdr(old_b)).status_code == 401

    # the freshly returned token works normally
    assert client.get("/persons", headers=_hdr(new_token)).status_code == 200


def test_forced_change_token_cannot_become_unrestricted(client, db):
    make_admin(
        db,
        username="forced",
        role="operator",
        must_change_password=True,
    )
    forced_token = _token(client, "forced")

    # B5 gate: forced-change token cannot touch normal endpoints
    assert client.get("/persons", headers=_hdr(forced_token)).status_code == 403

    changed = _change_password(
        client, forced_token, DEFAULT_PASSWORD, "AfterForced1"
    )
    assert changed.status_code == 200
    new_token = changed.json()["access_token"]

    # the OLD forced-change token must not have silently become a normal
    # token just because the DB flag flipped — the version moved on.
    assert client.get("/persons", headers=_hdr(forced_token)).status_code == 401

    # the new token is a normal, unrestricted token
    assert client.get("/persons", headers=_hdr(new_token)).status_code == 200
    assert _claims(new_token)["token_version"] == 1


def test_password_change_transaction_keeps_hash_and_version_together(client, db):
    admin = make_admin(db, username="atomic", role="operator")
    _change_password(client, _token(client, "atomic"), DEFAULT_PASSWORD, "NewOne12345")

    row = _reload(db, admin.id)
    # both moved, or neither would have
    assert row.token_version == 1
    # new password works, old does not
    assert _login(client, "atomic", "NewOne12345").status_code == 200
    assert _login(client, "atomic", DEFAULT_PASSWORD).status_code == 401


# ---------------------------------------------------------------------------
# administrative password reset
# ---------------------------------------------------------------------------

def test_admin_reset_rotates_target_token_version(client, db):
    make_admin(db, username="root", role="super_admin")
    target = make_admin(db, username="victim", role="operator")

    victim_token = _token(client, "victim")

    reset = client.post(
        f"/users/{target.id}/reset-password",
        headers=_hdr(_token(client, "root")),
    )
    assert reset.status_code == 200
    temp_password = reset.json()["temporary_password"]

    row = _reload(db, target.id)
    assert row.token_version == 1
    assert row.must_change_password is True

    # the target's previously issued token is now invalid
    assert client.get("/persons", headers=_hdr(victim_token)).status_code == 401

    # target signs in with the reset credentials -> forced-change token
    forced_token = _token(client, "victim", temp_password)
    assert _claims(forced_token)["token_version"] == 1
    assert client.get("/persons", headers=_hdr(forced_token)).status_code == 403

    # and can complete the change
    changed = _change_password(client, forced_token, temp_password, "VictimNew123")
    assert changed.status_code == 200
    assert client.get(
        "/persons", headers=_hdr(changed.json()["access_token"])
    ).status_code == 200


def test_admin_reset_does_not_touch_requester_tokens(client, db):
    make_admin(db, username="root", role="super_admin")
    target = make_admin(db, username="tgt", role="operator")

    root_token = _token(client, "root")
    client.post(
        f"/users/{target.id}/reset-password",
        headers=_hdr(root_token),
    )
    # the acting Super Admin's own session is unaffected
    assert client.get("/users", headers=_hdr(root_token)).status_code == 200


# ---------------------------------------------------------------------------
# account state
# ---------------------------------------------------------------------------

def test_disabled_account_token_rejected_without_version_bump(client, db):
    admin = make_admin(db, username="dis", role="operator")
    token = _token(client, "dis")

    admin.is_active = False
    db.commit()

    response = client.get("/persons", headers=_hdr(token))
    assert response.status_code == 403
    assert response.json() == {"detail": "This account has been disabled."}

    # disable does NOT rotate token_version (is_active is already checked
    # live on every request); re-enabling restores the same session.
    assert _reload(db, admin.id).token_version == 0


def test_super_admin_password_change_follows_same_invalidation(client, db):
    admin = make_admin(db, username="root", role="super_admin")
    old_token = _token(client, "root")

    changed = _change_password(client, old_token, DEFAULT_PASSWORD, "RootFresh123")
    assert changed.status_code == 200

    row = _reload(db, admin.id)
    assert row.token_version == 1
    # brute-force / lifecycle mechanics never force a Super Admin change
    assert row.must_change_password is False

    assert client.get("/users", headers=_hdr(old_token)).status_code == 401
    assert client.get(
        "/users", headers=_hdr(changed.json()["access_token"])
    ).status_code == 200


# ---------------------------------------------------------------------------
# security — no revocation oracle, no bypass
# ---------------------------------------------------------------------------

def test_stale_version_rejection_reveals_nothing_internal(client, db):
    admin = make_admin(db, username="quiet", role="operator")
    token = _token(client, "quiet")
    admin.token_version = 2
    db.commit()

    response = client.get("/persons", headers=_hdr(token))
    assert response.status_code == 401
    body = response.json()
    assert body == {"detail": "Invalid authentication token."}
    text = str(body).lower()
    for leak in ("version", "revoked", "mismatch", "stale", "rotat"):
        assert leak not in text


def test_old_token_cannot_bypass_invalidation_on_any_endpoint(client, db):
    make_admin(db, username="multi", role="operator")
    old_token = _token(client, "multi")

    changed = _change_password(client, old_token, DEFAULT_PASSWORD, "MultiNew1234")
    assert changed.status_code == 200

    for path in ("/persons", "/dashboard", "/auth/profile"):
        assert client.get(path, headers=_hdr(old_token)).status_code == 401
