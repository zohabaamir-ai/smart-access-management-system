from datetime import datetime
from typing import Literal

from pydantic import BaseModel

# V1 user-facing Camera status.
#   online   - active and available
#   offline  - active but expected to be unavailable (no B1 writer yet)
#   disabled - intentionally disabled by authorized management (is_active=False)
CameraStatus = Literal["online", "offline", "disabled"]


class CameraResponse(BaseModel):
    id: int
    name: str
    slug: str
    location: str
    is_active: bool
    status: CameraStatus
    created_at: datetime


class CameraCreateRequest(BaseModel):
    name: str
    location: str


class CameraUpdateRequest(BaseModel):
    name: str | None = None
    location: str | None = None
    is_active: bool | None = None
