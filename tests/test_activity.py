"""B4: Activity — the canonical filtered recognition-history layer.

Activity is a read/query view over Recognition Events:

    Recognition Event -> Activity query -> ┬─ View (JSON list)
                                           └─ CSV export

There is no separate Activity table, no Activity deletion, and no
separate Reports module.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta, timezone

from tests.helpers import (
    auth_headers,
    make_admin,
    make_camera,
    make_person,
    make_recognition_event,
)

_ACTIVITY_ROW_KEYS = {
    "id",
    "person_id",
    "person_name",
    "identifier",
    "camera_id",
    "camera_name",
    "camera_location",
    "timestamp",
    "match_distance",
}

_CSV_HEADER = [
    "Recognition Date",
    "Recognition Time",
    "Person",
    "Person ID",
    "Camera",
    "Camera ID",
    "Camera Location",
    "Match Distance",
]


def _csv_rows(text: str):
    return list(csv.reader(io.StringIO(text)))


# ---------------------------------------------------------------------------
# Viewing — authorization
# ---------------------------------------------------------------------------

def test_super_admin_can_view_activity(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    assert client.get("/activity", headers=headers).status_code == 200


def test_admin_can_view_activity(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")
    assert client.get("/activity", headers=headers).status_code == 200


def test_operator_can_view_activity(client, db):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")
    assert client.get("/activity", headers=headers).status_code == 200


def test_activity_requires_auth(client):
    assert client.get("/activity").status_code == 401


# ---------------------------------------------------------------------------
# Data — Activity represents Recognition Events
# ---------------------------------------------------------------------------

def test_activity_row_projects_person_camera_and_timestamp(client, db):
    make_admin(db, username="adm", role="admin")
    person = make_person(db, name="Ali", identifier="35202-1234567-8")
    camera = make_camera(
        db, name="Main Entrance", slug="main-entrance", location="Gate 1"
    )
    ts = datetime(2026, 8, 1, 5, 42, tzinfo=timezone.utc)
    make_recognition_event(
        db,
        person_id=person.id,
        camera_id=camera.id,
        match_distance=0.31,
        timestamp=ts,
    )
    headers = auth_headers(client, "adm")

    rows = client.get("/activity", headers=headers).json()
    assert len(rows) == 1
    row = rows[0]
    assert set(row) == _ACTIVITY_ROW_KEYS
    assert row["person_id"] == person.id
    assert row["person_name"] == "Ali"
    assert row["identifier"] == "35202-1234567-8"
    assert row["camera_id"] == camera.id
    assert row["camera_name"] == "Main Entrance"
    assert row["camera_location"] == "Gate 1"
    assert row["match_distance"] == 0.31
    assert datetime.fromisoformat(row["timestamp"]) == ts


def test_activity_camera_info_comes_from_camera_relationship(client, db):
    """B4 #9: camera_name/location follow the FK to `cameras`, not any
    denormalized copy on the event."""
    make_admin(db, username="adm", role="admin")
    person = make_person(db, identifier="11111-1111111-1")
    camera = make_camera(db, name="Original", slug="cam-x", location="Lobby")
    make_recognition_event(db, person_id=person.id, camera_id=camera.id)
    headers = auth_headers(client, "adm")

    # rename the camera row directly, then re-read Activity
    camera.name = "Renamed Camera"
    camera.location = "Basement"
    db.commit()

    row = client.get("/activity", headers=headers).json()[0]
    assert row["camera_name"] == "Renamed Camera"
    assert row["camera_location"] == "Basement"


def test_activity_api_has_no_terminal_terminology(client, db):
    make_admin(db, username="adm", role="admin")
    person = make_person(db, identifier="22222-2222222-2")
    camera = make_camera(db)
    make_recognition_event(db, person_id=person.id, camera_id=camera.id)
    headers = auth_headers(client, "adm")

    row = client.get("/activity", headers=headers).json()[0]
    joined = " ".join(row.keys()).lower()
    assert "terminal" not in joined
    assert "camera_id" in row and "camera_name" in row

    export = client.get("/activity/export", headers=headers).text
    assert "terminal" not in export.lower()


def test_activity_ordered_newest_first(client, db):
    make_admin(db, username="adm", role="admin")
    person = make_person(db, identifier="33333-3333333-3")
    camera = make_camera(db)
    base = datetime(2025, 1, 5, 10, 0, tzinfo=timezone.utc)
    for offset in (0, 5, 2):
        make_recognition_event(
            db,
            person_id=person.id,
            camera_id=camera.id,
            timestamp=base + timedelta(hours=offset),
        )
    headers = auth_headers(client, "adm")

    timestamps = [
        r["timestamp"]
        for r in client.get("/activity", headers=headers).json()
    ]
    assert timestamps == sorted(timestamps, reverse=True)


# ---------------------------------------------------------------------------
# Filters
# ---------------------------------------------------------------------------

def _seed_two_people_two_cameras(db):
    p1 = make_person(db, name="Alice Wonderland", identifier="80808-0808080-8")
    p2 = make_person(db, name="Bob Builder", identifier="90909-0909090-9")
    cam_a = make_camera(db, name="Cam A", slug="cam-a", location="North")
    cam_b = make_camera(db, name="Cam B", slug="cam-b", location="South")
    return p1, p2, cam_a, cam_b


def test_activity_filter_by_person(client, db):
    make_admin(db, username="adm", role="admin")
    p1, p2, cam_a, cam_b = _seed_two_people_two_cameras(db)
    make_recognition_event(db, person_id=p1.id, camera_id=cam_a.id)
    make_recognition_event(db, person_id=p2.id, camera_id=cam_a.id)
    headers = auth_headers(client, "adm")

    rows = client.get(
        "/activity", params={"person_id": p1.id}, headers=headers
    ).json()
    assert [r["person_id"] for r in rows] == [p1.id]


def test_activity_filter_by_camera(client, db):
    make_admin(db, username="adm", role="admin")
    p1, p2, cam_a, cam_b = _seed_two_people_two_cameras(db)
    make_recognition_event(db, person_id=p1.id, camera_id=cam_a.id)
    make_recognition_event(db, person_id=p1.id, camera_id=cam_b.id)
    make_recognition_event(db, person_id=p2.id, camera_id=cam_b.id)
    headers = auth_headers(client, "adm")

    rows = client.get(
        "/activity", params={"camera_id": cam_b.id}, headers=headers
    ).json()
    assert len(rows) == 2
    assert {r["camera_id"] for r in rows} == {cam_b.id}


def test_activity_filter_by_date_range(client, db):
    make_admin(db, username="adm", role="admin")
    person = make_person(db, identifier="44444-4444444-4")
    camera = make_camera(db)
    # 2026-03-10 and 2026-03-20, both at 06:00 UTC (11:00 PKT, same day)
    make_recognition_event(
        db,
        person_id=person.id,
        camera_id=camera.id,
        timestamp=datetime(2026, 3, 10, 6, 0, tzinfo=timezone.utc),
    )
    make_recognition_event(
        db,
        person_id=person.id,
        camera_id=camera.id,
        timestamp=datetime(2026, 3, 20, 6, 0, tzinfo=timezone.utc),
    )
    headers = auth_headers(client, "adm")

    rows = client.get(
        "/activity",
        params={"start_date": "2026-03-11", "end_date": "2026-03-31"},
        headers=headers,
    ).json()
    assert len(rows) == 1
    assert datetime.fromisoformat(rows[0]["timestamp"]).day == 20


def test_activity_combined_filters(client, db):
    make_admin(db, username="adm", role="admin")
    p1, p2, cam_a, cam_b = _seed_two_people_two_cameras(db)
    inside = datetime(2026, 5, 15, 6, 0, tzinfo=timezone.utc)
    outside = datetime(2026, 6, 15, 6, 0, tzinfo=timezone.utc)

    # target: p1 @ cam_a, inside the window
    make_recognition_event(
        db, person_id=p1.id, camera_id=cam_a.id, timestamp=inside
    )
    # wrong person / wrong camera / wrong date
    make_recognition_event(
        db, person_id=p2.id, camera_id=cam_a.id, timestamp=inside
    )
    make_recognition_event(
        db, person_id=p1.id, camera_id=cam_b.id, timestamp=inside
    )
    make_recognition_event(
        db, person_id=p1.id, camera_id=cam_a.id, timestamp=outside
    )
    headers = auth_headers(client, "adm")

    rows = client.get(
        "/activity",
        params={
            "person_id": p1.id,
            "camera_id": cam_a.id,
            "start_date": "2026-05-01",
            "end_date": "2026-05-31",
        },
        headers=headers,
    ).json()
    assert len(rows) == 1
    assert rows[0]["person_id"] == p1.id
    assert rows[0]["camera_id"] == cam_a.id


def test_activity_empty_result_is_not_an_error(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")

    response = client.get(
        "/activity",
        params={"start_date": "2020-01-01", "end_date": "2020-01-02"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json() == []


def test_activity_search_matches_name_or_cnic(client, db):
    make_admin(db, username="adm", role="admin")
    p1, p2, cam_a, _ = _seed_two_people_two_cameras(db)
    make_recognition_event(db, person_id=p1.id, camera_id=cam_a.id)
    make_recognition_event(db, person_id=p2.id, camera_id=cam_a.id)
    headers = auth_headers(client, "adm")

    by_name = client.get(
        "/activity", params={"search": "wonder"}, headers=headers
    ).json()
    assert [r["person_id"] for r in by_name] == [p1.id]

    by_cnic = client.get(
        "/activity", params={"search": "0808080"}, headers=headers
    ).json()
    assert [r["person_id"] for r in by_cnic] == [p1.id]

    assert client.get(
        "/activity", params={"search": "zzznope"}, headers=headers
    ).json() == []


def test_activity_bad_date_range_is_400(client, db):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")
    response = client.get(
        "/activity",
        params={"start_date": "2024-05-10", "end_date": "2024-05-01"},
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json() == {
        "detail": "End date cannot be before start date."
    }


def test_activity_pkt_date_boundary(client, db):
    """B4 #16: PKT (UTC+5) calendar-day boundaries are respected."""
    make_admin(db, username="adm", role="admin")
    person = make_person(db, identifier="55555-5555555-5")
    camera = make_camera(db)
    # 2026-06-14 23:30 PKT == 18:30 UTC  -> PKT day 06-14
    make_recognition_event(
        db,
        person_id=person.id,
        camera_id=camera.id,
        timestamp=datetime(2026, 6, 14, 18, 30, tzinfo=timezone.utc),
    )
    # 2026-06-15 00:30 PKT == 19:30 UTC  -> PKT day 06-15
    make_recognition_event(
        db,
        person_id=person.id,
        camera_id=camera.id,
        timestamp=datetime(2026, 6, 14, 19, 30, tzinfo=timezone.utc),
    )
    headers = auth_headers(client, "adm")

    def count(start, end):
        return len(
            client.get(
                "/activity",
                params={"start_date": start, "end_date": end},
                headers=headers,
            ).json()
        )

    assert count("2026-06-14", "2026-06-14") == 1
    assert count("2026-06-15", "2026-06-15") == 1
    assert count("2026-06-14", "2026-06-15") == 2


# ---------------------------------------------------------------------------
# CSV export
# ---------------------------------------------------------------------------

def test_super_admin_can_export_csv(client, db):
    make_admin(db, username="root", role="super_admin")
    headers = auth_headers(client, "root")
    response = client.get("/activity/export", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    assert _csv_rows(response.text)[0] == _CSV_HEADER


def test_admin_can_export_csv(client, db):
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")
    assert client.get("/activity/export", headers=headers).status_code == 200


def test_operator_cannot_export_csv(client, db):
    make_admin(db, username="op", role="operator")
    headers = auth_headers(client, "op")
    assert client.get("/activity/export", headers=headers).status_code == 403


def test_export_requires_auth(client):
    assert client.get("/activity/export").status_code == 401


def test_export_row_content(client, db):
    make_admin(db, username="adm", role="admin")
    person = make_person(db, name="Csv Person", identifier="66666-6666666-6")
    camera = make_camera(
        db, name="Export Cam", slug="export-cam", location="Dock"
    )
    make_recognition_event(
        db,
        person_id=person.id,
        camera_id=camera.id,
        match_distance=0.5,
        timestamp=datetime(2026, 8, 1, 6, 30, tzinfo=timezone.utc),
    )
    headers = auth_headers(client, "adm")

    rows = _csv_rows(client.get("/activity/export", headers=headers).text)
    assert rows[0] == _CSV_HEADER
    assert len(rows) == 2
    data = rows[1]
    assert data[0] == "2026-08-01"          # 06:30 UTC -> 11:30 PKT, same day
    assert data[1] == "11:30:00"
    assert data[2] == "Csv Person"
    assert data[3] == str(person.id)
    assert data[4] == "Export Cam"
    assert data[5] == str(camera.id)
    assert data[6] == "Dock"
    assert data[7] == "0.5000"


def test_export_respects_person_filter(client, db):
    make_admin(db, username="adm", role="admin")
    p1, p2, cam_a, _ = _seed_two_people_two_cameras(db)
    make_recognition_event(db, person_id=p1.id, camera_id=cam_a.id)
    make_recognition_event(db, person_id=p2.id, camera_id=cam_a.id)
    headers = auth_headers(client, "adm")

    rows = _csv_rows(
        client.get(
            "/activity/export",
            params={"person_id": p1.id},
            headers=headers,
        ).text
    )
    assert len(rows) == 2  # header + one match
    assert rows[1][3] == str(p1.id)


def test_export_respects_camera_filter(client, db):
    make_admin(db, username="adm", role="admin")
    p1, p2, cam_a, cam_b = _seed_two_people_two_cameras(db)
    make_recognition_event(db, person_id=p1.id, camera_id=cam_a.id)
    make_recognition_event(db, person_id=p1.id, camera_id=cam_b.id)
    make_recognition_event(db, person_id=p2.id, camera_id=cam_b.id)
    headers = auth_headers(client, "adm")

    rows = _csv_rows(
        client.get(
            "/activity/export",
            params={"camera_id": cam_b.id},
            headers=headers,
        ).text
    )
    assert len(rows) == 3  # header + two cam_b events
    assert {r[5] for r in rows[1:]} == {str(cam_b.id)}


def test_export_respects_date_filter(client, db):
    make_admin(db, username="adm", role="admin")
    person = make_person(db, identifier="77777-7777777-7")
    camera = make_camera(db)
    make_recognition_event(
        db,
        person_id=person.id,
        camera_id=camera.id,
        timestamp=datetime(2026, 2, 1, 6, 0, tzinfo=timezone.utc),
    )
    make_recognition_event(
        db,
        person_id=person.id,
        camera_id=camera.id,
        timestamp=datetime(2026, 2, 20, 6, 0, tzinfo=timezone.utc),
    )
    headers = auth_headers(client, "adm")

    rows = _csv_rows(
        client.get(
            "/activity/export",
            params={"start_date": "2026-02-10", "end_date": "2026-02-28"},
            headers=headers,
        ).text
    )
    assert len(rows) == 2
    assert rows[1][0] == "2026-02-20"


def test_export_respects_combined_filters(client, db):
    make_admin(db, username="adm", role="admin")
    p1, p2, cam_a, cam_b = _seed_two_people_two_cameras(db)
    inside = datetime(2026, 7, 10, 6, 0, tzinfo=timezone.utc)
    make_recognition_event(
        db, person_id=p1.id, camera_id=cam_a.id, timestamp=inside
    )
    make_recognition_event(
        db, person_id=p2.id, camera_id=cam_a.id, timestamp=inside
    )
    make_recognition_event(
        db, person_id=p1.id, camera_id=cam_b.id, timestamp=inside
    )
    headers = auth_headers(client, "adm")

    rows = _csv_rows(
        client.get(
            "/activity/export",
            params={
                "person_id": p1.id,
                "camera_id": cam_a.id,
                "start_date": "2026-07-01",
                "end_date": "2026-07-31",
            },
            headers=headers,
        ).text
    )
    assert len(rows) == 2
    assert rows[1][3] == str(p1.id)
    assert rows[1][5] == str(cam_a.id)


def test_export_dataset_matches_activity_query(client, db):
    """B4 #24: the export contains the same logical rows the list shows
    for the same filters, in the same order."""
    make_admin(db, username="adm", role="admin")
    p1, p2, cam_a, cam_b = _seed_two_people_two_cameras(db)
    base = datetime(2026, 4, 1, 6, 0, tzinfo=timezone.utc)
    make_recognition_event(
        db, person_id=p1.id, camera_id=cam_a.id, timestamp=base
    )
    make_recognition_event(
        db,
        person_id=p2.id,
        camera_id=cam_a.id,
        timestamp=base + timedelta(hours=3),
    )
    make_recognition_event(
        db,
        person_id=p1.id,
        camera_id=cam_b.id,
        timestamp=base + timedelta(hours=6),
    )
    headers = auth_headers(client, "adm")
    params = {"camera_id": cam_a.id}

    listed = client.get(
        "/activity", params=params, headers=headers
    ).json()
    exported = _csv_rows(
        client.get(
            "/activity/export", params=params, headers=headers
        ).text
    )[1:]

    assert len(listed) == len(exported)
    assert [row["person_id"] for row in listed] == [
        int(r[3]) for r in exported
    ]
    assert [row["camera_id"] for row in listed] == [
        int(r[5]) for r in exported
    ]


# ---------------------------------------------------------------------------
# No Activity deletion
# ---------------------------------------------------------------------------

def test_no_activity_delete_endpoint(client, db):
    """B4 #25."""
    make_admin(db, username="root", role="super_admin")
    person = make_person(db, identifier="88888-8888888-8")
    camera = make_camera(db)
    event = make_recognition_event(
        db, person_id=person.id, camera_id=camera.id
    )
    headers = auth_headers(client, "root")

    assert (
        client.delete(f"/activity/{event.id}", headers=headers).status_code
        == 404
    )
    assert client.delete("/activity", headers=headers).status_code == 405

    # the recognition event is untouched
    from app.db.db_models.recognition_event import RecognitionEvent

    assert db.query(RecognitionEvent).count() == 1


def test_recognition_history_survives_person_deletion(client, db):
    """B4 #26: deleting a Person cascades its recognition events per the
    existing model design — this pins that current behavior."""
    from app.db.db_models.recognition_event import RecognitionEvent

    make_admin(db, username="adm", role="admin")
    keep_person = make_person(db, name="Keep", identifier="12312-3123123-1")
    doomed = make_person(db, name="Doomed", identifier="45645-6456456-4")
    camera = make_camera(db)
    make_recognition_event(
        db, person_id=keep_person.id, camera_id=camera.id
    )
    make_recognition_event(db, person_id=doomed.id, camera_id=camera.id)
    headers = auth_headers(client, "adm")

    client.delete(f"/persons/{doomed.id}", headers=headers)

    remaining = db.query(RecognitionEvent).all()
    assert [e.person_id for e in remaining] == [keep_person.id]
    # Activity for the surviving person is intact
    rows = client.get("/activity", headers=headers).json()
    assert [r["person_id"] for r in rows] == [keep_person.id]


# ---------------------------------------------------------------------------
# Reports removal
# ---------------------------------------------------------------------------

def test_old_reports_endpoint_is_gone(client, db):
    """B4 #27."""
    make_admin(db, username="adm", role="admin")
    headers = auth_headers(client, "adm")
    assert client.get(
        "/reports",
        params={"start_date": "2024-01-01", "end_date": "2024-12-31"},
        headers=headers,
    ).status_code == 404
    assert client.get("/students", headers=headers).status_code == 404


def test_old_reports_permissions_are_gone(client, db):
    """B4 #28."""
    from app.core.permissions import Permission

    names = {p.name for p in Permission}
    values = {p.value for p in Permission}
    assert "VIEW_REPORTS" not in names and "view_reports" not in values
    assert "EXPORT_REPORTS" not in names and "export_reports" not in values
    assert "DELETE_ACTIVITY" not in names and "delete_activity" not in values
    assert "EXPORT_ACTIVITY" in names and "export_activity" in values


def test_activity_is_the_canonical_recognition_history_endpoint(client, db):
    """B4 #29: one endpoint means "filtered recognition history"."""
    make_admin(db, username="adm", role="admin")
    person = make_person(db, name="Canon", identifier="98798-7987987-9")
    camera = make_camera(db, name="Canon Cam", slug="canon-cam")
    make_recognition_event(db, person_id=person.id, camera_id=camera.id)
    headers = auth_headers(client, "adm")

    rows = client.get(
        "/activity", params={"person_id": person.id}, headers=headers
    ).json()
    assert len(rows) == 1
    assert rows[0]["person_name"] == "Canon"
    assert rows[0]["camera_name"] == "Canon Cam"
