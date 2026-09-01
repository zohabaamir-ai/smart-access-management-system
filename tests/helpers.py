"""Seed + auth helpers for the characterization suite."""

from __future__ import annotations

import io

from PIL import Image
from pwdlib import PasswordHash

from app.db.db_models.admin import Admin
from app.db.db_models.camera import Camera
from app.db.db_models.person import Person
from app.db.db_models.person_activity import PersonActivity
from app.db.db_models.recognition_event import RecognitionEvent

_password_hash = PasswordHash.recommended()

DEFAULT_PASSWORD = "Password123!"
EMBEDDING_DIM = 512


# ---------------------------------------------------------------------------
# accounts
# ---------------------------------------------------------------------------

def make_admin(
    db,
    *,
    username: str,
    role: str = "operator",
    password: str = DEFAULT_PASSWORD,
    full_name: str | None = None,
    display_name: str | None = None,
    is_active: bool = True,
    must_change_password: bool = False,
    failed_login_attempts: int = 0,
    lockout_count: int = 0,
    locked_until=None,
    token_version: int = 0,
) -> Admin:
    resolved_full_name = full_name or username.capitalize()
    admin = Admin(
        full_name=resolved_full_name,
        display_name=display_name or resolved_full_name,
        username=username,
        password_hash=_password_hash.hash(password),
        role=role,
        is_active=is_active,
        failed_login_attempts=failed_login_attempts,
        lockout_count=lockout_count,
        locked_until=locked_until,
        must_change_password=must_change_password,
        token_version=token_version,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def login(client, username: str, password: str = DEFAULT_PASSWORD):
    return client.post(
        "/auth/login",
        json={"username": username, "password": password},
    )


def auth_headers(client, username: str, password: str = DEFAULT_PASSWORD) -> dict:
    response = login(client, username, password)
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


# ---------------------------------------------------------------------------
# domain rows
# ---------------------------------------------------------------------------

def make_person(
    db,
    *,
    name: str = "Test Person",
    identifier: str = "12345-1234567-1",
    photo_path: str | None = None,
    registered_by_admin_id: int | None = None,
    embedding: list[float] | None = None,
) -> Person:
    person = Person(
        name=name,
        identifier=identifier,
        embedding=(
            list(embedding)
            if embedding is not None
            else [0.0] * EMBEDDING_DIM
        ),
        photo_path=photo_path,
        registered_by_admin_id=registered_by_admin_id,
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


def make_camera(
    db,
    *,
    name: str = "Front Door",
    slug: str = "front-door",
    location: str = "Lobby",
    is_active: bool = True,
) -> Camera:
    camera = Camera(
        name=name,
        slug=slug,
        location=location,
        is_active=is_active,
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


def make_recognition_event(
    db,
    *,
    person_id: int,
    camera_id: int,
    match_distance: float = 0.42,
    timestamp=None,
) -> RecognitionEvent:
    kwargs = dict(
        person_id=person_id,
        camera_id=camera_id,
        match_distance=match_distance,
    )
    if timestamp is not None:
        kwargs["timestamp"] = timestamp
    event = RecognitionEvent(**kwargs)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def make_person_activity(
    db,
    *,
    person_id: int,
    person_name: str = "Test Person",
    action: str = "registered",
    performed_by: int = 1,
    timestamp=None,
) -> PersonActivity:
    kwargs = dict(
        person_id=person_id,
        person_name=person_name,
        action=action,
        performed_by=performed_by,
    )
    if timestamp is not None:
        kwargs["timestamp"] = timestamp
    activity = PersonActivity(**kwargs)
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


# ---------------------------------------------------------------------------
# images
# ---------------------------------------------------------------------------

def blank_jpeg_bytes(size: int = 200) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (size, size), "white").save(buffer, format="JPEG")
    return buffer.getvalue()


def write_blank_jpeg(path) -> str:
    Image.new("RGB", (64, 64), "white").save(str(path), format="JPEG")
    return str(path)


NOT_AN_IMAGE = b"this is definitely not an image file"
