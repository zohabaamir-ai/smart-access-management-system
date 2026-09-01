"""Asia/Karachi (PKT) calendar-day boundaries expressed as UTC ranges.

Two shapes, ported verbatim from the sites that previously duplicated
this arithmetic (``RecognitionEventRepository._get_today_utc_range`` for
the Dashboard, and the Activity date-range filter):

* ``today_utc_range()``    — "now" based: [start-of-today, start-of-tomorrow)
* ``dates_to_utc_range()`` — explicit start/end ``date`` bounds (either may
  be ``None``); ``end_date`` is treated as inclusive, so the returned upper
  bound is the start of the following day.
"""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

PAKISTAN_TIMEZONE = ZoneInfo("Asia/Karachi")


def today_utc_range() -> tuple[datetime, datetime]:
    now_pakistan = datetime.now(PAKISTAN_TIMEZONE)

    start_of_day_pakistan = now_pakistan.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    start_of_next_day_pakistan = start_of_day_pakistan + timedelta(days=1)

    start_of_day_utc = start_of_day_pakistan.astimezone(timezone.utc)
    start_of_next_day_utc = start_of_next_day_pakistan.astimezone(
        timezone.utc
    )

    return (start_of_day_utc, start_of_next_day_utc)


def dates_to_utc_range(
    start_date: date | None,
    end_date: date | None,
) -> tuple[datetime | None, datetime | None]:
    start_utc = None
    end_utc = None

    if start_date is not None:
        start_of_day_pakistan = datetime.combine(
            start_date,
            time.min,
        ).replace(tzinfo=PAKISTAN_TIMEZONE)

        start_utc = start_of_day_pakistan.astimezone(timezone.utc)

    if end_date is not None:
        end_of_day_pakistan = datetime.combine(
            end_date + timedelta(days=1),
            time.min,
        ).replace(tzinfo=PAKISTAN_TIMEZONE)

        end_utc = end_of_day_pakistan.astimezone(timezone.utc)

    return (start_utc, end_utc)
