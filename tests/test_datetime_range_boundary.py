"""Asia/Karachi midnight boundary regression.

Pins the PKT calendar-day -> UTC-range arithmetic that /activity and
/dashboard depend on. Events straddling PKT midnight (UTC+5, no DST)
must bucket into the correct day.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from tests.helpers import (
    auth_headers,
    make_admin,
    make_person,
    make_recognition_event,
    make_camera,
)

PKT = ZoneInfo("Asia/Karachi")

# 2025-06-14 23:30 PKT == 2025-06-14 18:30 UTC  -> PKT day 2025-06-14
_EVENT_A_UTC = datetime(2025, 6, 14, 18, 30, tzinfo=timezone.utc)
# 2025-06-15 00:30 PKT == 2025-06-14 19:30 UTC  -> PKT day 2025-06-15
_EVENT_B_UTC = datetime(2025, 6, 14, 19, 30, tzinfo=timezone.utc)


def _seed_boundary_events(db):
    person = make_person(db, name="Bound", identifier="70707-0707070-7")
    camera = make_camera(db)
    make_recognition_event(
        db, person_id=person.id, camera_id=camera.id, timestamp=_EVENT_A_UTC
    )
    make_recognition_event(
        db, person_id=person.id, camera_id=camera.id, timestamp=_EVENT_B_UTC
    )


def test_activity_pkt_day_boundary(client, db):
    make_admin(db, username="adm", role="admin")
    _seed_boundary_events(db)
    headers = auth_headers(client, "adm")

    def count(**params):
        return len(
            client.get("/activity", params=params, headers=headers).json()
        )

    assert count(start_date="2025-06-14", end_date="2025-06-14") == 1
    assert count(start_date="2025-06-15", end_date="2025-06-15") == 1
    assert count(start_date="2025-06-14", end_date="2025-06-15") == 2
    assert count() == 2  # no bounds -> everything


def test_dashboard_todays_entries_pkt_boundary(client, db):
    make_admin(db, username="op", role="operator")
    person = make_person(db, name="Today", identifier="80808-0808080-8")
    camera = make_camera(db)

    now_pkt = datetime.now(PKT)
    start_today_pkt = now_pkt.replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # one event a minute ago (today, PKT) and one a minute before today began
    make_recognition_event(
        db,
        person_id=person.id,
        camera_id=camera.id,
        timestamp=(now_pkt - timedelta(minutes=1)).astimezone(timezone.utc),
    )
    make_recognition_event(
        db,
        person_id=person.id,
        camera_id=camera.id,
        timestamp=(start_today_pkt - timedelta(minutes=1)).astimezone(
            timezone.utc
        ),
    )

    headers = auth_headers(client, "op")
    body = client.get("/dashboard", headers=headers).json()

    assert body["todays_entries"] == 1
    assert body["unique_persons_today"] == 1
