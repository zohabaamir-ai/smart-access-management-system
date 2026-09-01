"""B2: /persons list, photo, update, delete.

V1 rule: every management role (Super Admin, Admin, Operator) sees the
full Person record — name, CNIC, photo. There is no privacy masking and
no ``redacted`` field. Operators still cannot edit or delete a Person.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import torch
from PIL import Image

from app.db.db_models.person import Person
from app.db.db_models.person_activity import PersonActivity
from app.repositories.person_repository import PersonRepository

from tests.helpers import (
    NOT_AN_IMAGE,
    EMBEDDING_DIM,
    auth_headers,
    blank_jpeg_bytes,
    make_admin,
    make_person,
    make_person_activity,
    make_recognition_event,
    make_camera,
    write_blank_jpeg,
)

_PERSON_RESPONSE_KEYS = {
    "id",
    "name",
    "identifier",
    "created_at",
    "photo_path",
}


def test_recent_person_activity_populated_shape(client, db):
    """T1: GET /persons/activity/recent (populated) — bare dict, no response_model."""
    admin = make_admin(db, username="adm", role="admin")
    person = make_person(db, name="Zoe", identifier="99999-9999999-1")
    activity = make_person_activity(
        db,
        person_id=person.id,
        person_name="Zoe",
        action="registered",
        performed_by=admin.id,
    )
    headers = auth_headers(client, "adm")

    response = client.get("/persons/activity/recent", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "id",
        "person_id",
        "person_name",
        "action",
        "performed_by",
        "timestamp",
    }
    assert body["id"] == activity.id
    assert body["person_id"] == person.id
    assert body["person_name"] == "Zoe"
    assert body["action"] == "registered"
    assert body["performed_by"] == admin.id
    assert isinstance(body["timestamp"], str)


def test_delete_person_with_events_and_activity(client, db):
    """T2: cascade delete of recognition events + a 'deleted' activity row."""
    from app.db.db_models.person_activity import PersonActivity
    from app.db.db_models.recognition_event import RecognitionEvent

    admin = make_admin(db, username="adm", role="admin")
    person = make_person(db, name="Doomed", identifier="11111-2222222-3")
    camera = make_camera(db)
    make_recognition_event(db, person_id=person.id, camera_id=camera.id)
    make_recognition_event(db, person_id=person.id, camera_id=camera.id)

    # capture ids as plain ints before the row is deleted
    person_id = person.id
    admin_id = admin.id
    headers = auth_headers(client, "adm")

    response = client.delete(f"/persons/{person_id}", headers=headers)
    assert response.status_code == 200
    assert response.json() == {
        "message": "Person deleted successfully.",
        "person_id": person_id,
    }

    remaining_events = (
        db.query(RecognitionEvent)
        .filter(RecognitionEvent.person_id == person_id)
        .count()
    )
    assert remaining_events == 0

    deleted_rows = (
        db.query(PersonActivity)
        .filter(
            PersonActivity.person_id == person_id,
            PersonActivity.action == "deleted",
        )
        .all()
    )
    assert len(deleted_rows) == 1
    assert deleted_rows[0].person_name == "Doomed"
    assert deleted_rows[0].performed_by == admin_id


@pytest.fixture
def relative_photo_path():
    fixtures_dir = Path("tests") / "fixtures"
    fixtures_dir.mkdir(parents=True, exist_ok=True)
    target = fixtures_dir / "person_photo_sample.jpg"
    if not target.exists():
        Image.new("RGB", (48, 48), "white").save(str(target), format="JPEG")
    return target.as_posix()


def test_person_photo_served_with_relative_path(client, db, relative_photo_path):
    """T3: get_person_photo resolves a relative photo_path via Path.cwd()."""
    make_admin(db, username="adm", role="admin")
    person = make_person(db, photo_path=relative_photo_path)
    headers = auth_headers(client, "adm")

    response = client.get(f"/persons/{person.id}/photo", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/")


def test_update_person_duplicate_cnic_rejected(client, db):
    """T4: PATCH to a CNIC already used by another person -> 400."""
    make_admin(db, username="adm", role="admin")
    make_person(db, name="First", identifier="10101-0101010-1")
    p2 = make_person(db, name="Second", identifier="20202-0202020-2")
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{p2.id}",
        headers=headers,
        data={"identifier": "10101-0101010-1"},
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": "A person with this CNIC# already exists."
    }


def test_enroll_duplicate_cnic_rejected(client, db):
    """T5: enroll with an already-used CNIC -> 400 (CNIC check precedes face detection)."""
    make_admin(db, username="adm", role="admin")
    make_person(db, name="Existing", identifier="33333-3333333-3")
    headers = auth_headers(client, "adm")

    response = client.post(
        "/persons/enroll",
        headers=headers,
        data={"name": "New Guy", "identifier": "33333-3333333-3"},
        files={"file": ("blank.jpg", blank_jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": "A person with this CNIC# already exists."
    }


def test_list_persons_full_for_admin(client, db):
    make_admin(db, username="adm", role="admin")
    make_person(db, name="Ada", identifier="11111-1111111-1")
    headers = auth_headers(client, "adm")

    response = client.get("/persons", headers=headers)
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 1
    assert set(rows[0]) == _PERSON_RESPONSE_KEYS
    assert rows[0]["identifier"] == "11111-1111111-1"
    assert "redacted" not in rows[0]


def test_list_persons_full_for_super_admin(client, db):
    """B2 #1: Super Admin sees full Person data (name + CNIC)."""
    make_admin(db, username="root", role="super_admin")
    make_person(
        db, name="Ess", identifier="12121-1212121-2", photo_path="p.jpg"
    )
    headers = auth_headers(client, "root")

    row = client.get("/persons", headers=headers).json()[0]
    assert set(row) == _PERSON_RESPONSE_KEYS
    assert row["identifier"] == "12121-1212121-2"
    assert row["photo_path"] == "p.jpg"


def test_list_persons_full_for_operator_including_foreign_record(client, db):
    """B2 #3 / #5: Operator sees full CNIC + photo for ANY record,
    including one they did not register. No masking, no ``redacted``.
    """
    admin = make_admin(db, username="adm", role="admin")
    make_admin(db, username="op", role="operator")
    make_person(
        db,
        name="Bea",
        identifier="22222-2222222-2",
        photo_path="something.jpg",
        registered_by_admin_id=admin.id,
    )
    headers = auth_headers(client, "op")

    response = client.get("/persons", headers=headers)
    assert response.status_code == 200
    row = response.json()[0]
    assert set(row) == _PERSON_RESPONSE_KEYS
    assert row["name"] == "Bea"
    assert row["identifier"] == "22222-2222222-2"
    assert row["photo_path"] == "something.jpg"
    assert "redacted" not in row


def test_list_persons_requires_auth(client):
    assert client.get("/persons").status_code == 401


def test_person_photo_served(client, db, tmp_path):
    make_admin(db, username="adm", role="admin")
    photo = write_blank_jpeg(tmp_path / "p.jpg")
    person = make_person(db, photo_path=photo)
    headers = auth_headers(client, "adm")

    response = client.get(f"/persons/{person.id}/photo", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/")


def test_person_photo_404_when_no_photo(client, db):
    make_admin(db, username="adm", role="admin")
    person = make_person(db, photo_path=None)
    headers = auth_headers(client, "adm")

    response = client.get(f"/persons/{person.id}/photo", headers=headers)
    assert response.status_code == 404
    assert response.json() == {"detail": "Person photo not found."}


def test_person_photo_404_when_person_missing(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")
    response = client.get("/persons/9999/photo", headers=headers)
    assert response.status_code == 404
    assert response.json() == {"detail": "Person not found."}


def test_operator_can_view_foreign_person_photo(client, db, tmp_path):
    """B2 #4: Operator can retrieve the photo of a Person they did not
    register. The old registered_by_admin_id 403 gate is removed.
    """
    admin = make_admin(db, username="adm", role="admin")
    make_admin(db, username="op", role="operator")
    photo = write_blank_jpeg(tmp_path / "p.jpg")
    person = make_person(db, photo_path=photo, registered_by_admin_id=admin.id)
    headers = auth_headers(client, "op")

    response = client.get(f"/persons/{person.id}/photo", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/")


def test_update_person_returns_full_person_response(client, db):
    """B2: PATCH follows the normal Person response contract (full shape,
    real photo_path, no ``redacted`` field).
    """
    make_admin(db, username="adm", role="admin")
    person = make_person(
        db, name="Old Name", identifier="44444-4444444-4"
    )
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{person.id}",
        headers=headers,
        data={"name": "New Name"},
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) == _PERSON_RESPONSE_KEYS
    assert body["id"] == person.id
    assert body["name"] == "New Name"
    assert body["identifier"] == "44444-4444444-4"
    assert body["photo_path"] is None
    assert "redacted" not in body


def test_update_person_rejects_invalid_image(client, db):
    """PATCH with a corrupt file → 400 'Invalid image file.' (conditional decode)."""
    make_admin(db, username="adm", role="admin")
    person = make_person(db, name="Img", identifier="45450-4545454-5")
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{person.id}",
        headers=headers,
        data={"name": "Img New"},
        files={"file": ("bad.bin", NOT_AN_IMAGE, "application/octet-stream")},
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid image file."}


def test_update_person_no_changes_rejected(client, db):
    make_admin(db, username="adm", role="admin")
    person = make_person(db, name="Stable", identifier="55555-5555555-5")
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{person.id}",
        headers=headers,
        data={"name": "Stable"},
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "No changes were provided."}


def test_update_person_forbidden_for_operator(client, db):
    make_admin(db, username="op", role="operator")
    person = make_person(db)
    headers = auth_headers(client, "op")

    response = client.patch(
        f"/persons/{person.id}",
        headers=headers,
        data={"name": "Whatever"},
    )
    assert response.status_code == 403


def test_delete_person(client, db):
    make_admin(db, username="adm", role="admin")
    person = make_person(db)
    headers = auth_headers(client, "adm")

    response = client.delete(f"/persons/{person.id}", headers=headers)
    assert response.status_code == 200
    assert response.json() == {
        "message": "Person deleted successfully.",
        "person_id": person.id,
    }


def test_delete_person_missing_is_404(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")
    response = client.delete("/persons/4242", headers=headers)
    assert response.status_code == 404


def test_delete_person_forbidden_for_operator(client, db):
    make_admin(db, username="op", role="operator")
    person = make_person(db)
    headers = auth_headers(client, "op")
    response = client.delete(f"/persons/{person.id}", headers=headers)
    assert response.status_code == 403


def test_enroll_rejects_invalid_image(client, db):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")

    response = client.post(
        "/persons/enroll",
        headers=headers,
        data={"name": "Zed", "identifier": "66666-6666666-6"},
        files={"file": ("bad.txt", NOT_AN_IMAGE, "text/plain")},
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid image file."}


def test_enroll_rejects_image_without_face(client, db):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")

    response = client.post(
        "/persons/enroll",
        headers=headers,
        data={"name": "Zed", "identifier": "77777-7777777-7"},
        files={"file": ("blank.jpg", blank_jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 400
    assert "No face detected" in response.json()["detail"]


def test_recent_person_activity_empty(client, db):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")
    response = client.get("/persons/activity/recent", headers=headers)
    assert response.status_code == 200
    assert response.json() is None


# ---------------------------------------------------------------------------
# B2: edit / delete authorization by role
# ---------------------------------------------------------------------------

def test_admin_can_edit_person(client, db):
    """B2 #8."""
    make_admin(db, username="adm", role="admin")
    person = make_person(db, name="A", identifier="90909-0909090-9")
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{person.id}",
        headers=headers,
        data={"name": "A Edited"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "A Edited"


def test_super_admin_can_edit_and_delete_person(client, db):
    """B2 #9."""
    make_admin(db, username="root", role="super_admin")
    person = make_person(db, name="S", identifier="80808-0808080-8")
    headers = auth_headers(client, "root")

    edit = client.patch(
        f"/persons/{person.id}",
        headers=headers,
        data={"name": "S Edited"},
    )
    assert edit.status_code == 200
    assert edit.json()["name"] == "S Edited"

    delete = client.delete(f"/persons/{person.id}", headers=headers)
    assert delete.status_code == 200
    assert delete.json()["person_id"] == person.id


# ---------------------------------------------------------------------------
# B2: preserved behavior (CNIC normalization, embeddings, dedup, audit,
# provenance) — regression guards, not changed by B2.
# ---------------------------------------------------------------------------

def test_enroll_normalizes_cnic_before_uniqueness_check(client, db):
    """B2 #11: the enroll path normalizes raw CNIC digits to
    #####-#######-# before the uniqueness check.
    """
    make_admin(db, username="adm", role="admin")
    make_person(db, name="Seed", identifier="35202-1234567-8")
    headers = auth_headers(client, "adm")

    response = client.post(
        "/persons/enroll",
        headers=headers,
        data={"name": "New", "identifier": "3520212345678"},
        files={"file": ("blank.jpg", blank_jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": "A person with this CNIC# already exists."
    }


def test_update_normalizes_cnic(client, db):
    """B2 #11 (PATCH path)."""
    make_admin(db, username="adm", role="admin")
    make_person(db, name="One", identifier="10101-0101010-1")
    p2 = make_person(db, name="Two", identifier="20202-0202020-2")
    headers = auth_headers(client, "adm")

    response = client.patch(
        f"/persons/{p2.id}",
        headers=headers,
        data={"identifier": "1010101010101"},
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": "A person with this CNIC# already exists."
    }


def test_face_embedding_storage_and_duplicate_face_protection(db):
    """B2 #12 + #13: embeddings are stored and read back, and
    find_person_by_embedding still detects a near-identical face.
    """
    person = make_person(db, name="Emb", identifier="60606-0606060-6")
    repo = PersonRepository(db)

    identical = torch.zeros(EMBEDDING_DIM)
    match = repo.find_person_by_embedding(identical)
    assert match is not None and match.id == person.id

    far_away = torch.ones(EMBEDDING_DIM) * 10.0
    assert repo.find_person_by_embedding(far_away) is None

    # excluding the person itself (as the update path does) skips it
    assert (
        repo.find_person_by_embedding(
            identical, exclude_person_id=person.id
        )
        is None
    )


def test_person_activities_recorded_on_edit(client, db):
    """B2 #14: an 'edited' person_activities row is written on PATCH."""
    make_admin(db, username="adm", role="admin")
    person = make_person(db, name="Aud", identifier="61616-1616161-6")
    headers = auth_headers(client, "adm")

    client.patch(
        f"/persons/{person.id}",
        headers=headers,
        data={"name": "Aud Renamed"},
    )

    rows = (
        db.query(PersonActivity)
        .filter(
            PersonActivity.person_id == person.id,
            PersonActivity.action == "edited",
        )
        .all()
    )
    assert len(rows) == 1
    assert rows[0].person_name == "Aud Renamed"


def test_registered_by_admin_id_is_provenance_not_a_visibility_gate(
    client, db
):
    """B2 #15: registered_by_admin_id is persisted as provenance and is
    not consulted when deciding what an Operator may view.
    """
    admin = make_admin(db, username="adm", role="admin")
    make_admin(db, username="op", role="operator")
    person = make_person(
        db,
        name="Prov",
        identifier="70707-0707070-7",
        photo_path="x.jpg",
        registered_by_admin_id=admin.id,
    )

    stored = (
        db.query(Person).filter(Person.id == person.id).one()
    )
    assert stored.registered_by_admin_id == admin.id

    # a *different* account (operator) still sees the full record
    headers = auth_headers(client, "op")
    row = client.get("/persons", headers=headers).json()[0]
    assert row["identifier"] == "70707-0707070-7"
    assert row["photo_path"] == "x.jpg"
