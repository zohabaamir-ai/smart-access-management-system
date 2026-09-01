from datetime import datetime
from typing import Literal

from pydantic import BaseModel

# V1 user-facing Camera status (derived — see camera_routes._to_response).
#   online   - fresh public recognition-session heartbeat (last_seen_at within TTL)
#   offline  - enabled, but no fresh public recognition session
#   disabled - intentionally disabled by authorized management (is_active=False)
CameraStatus = Literal["online", "offline", "disabled"]


class CameraResponse(BaseModel):
    id: int
    name: str
    slug: str
    location: str
    is_active: bool
    status: CameraStatus
    # Auto (True) vs Manual (False) recognition mode for this camera's
    # public station. Camera-level, shared across devices.
    auto_recognition: bool
    created_at: datetime


class CameraCreateRequest(BaseModel):
    name: str
    location: str


class CameraUpdateRequest(BaseModel):
    name: str | None = None
    location: str | None = None
    is_active: bool | None = None
    auto_recognition: bool | None = None
