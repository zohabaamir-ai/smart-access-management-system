from datetime import datetime

from pydantic import BaseModel


class DashboardRecentEntry(BaseModel):
    id: int
    person_id: int
    name: str
    identifier: str
    timestamp: datetime
    match_distance: float


class DashboardResponse(BaseModel):
    total_persons: int
    todays_entries: int
    unique_persons_today: int
    average_match_distance: float | None
    recent_entries: list[DashboardRecentEntry]