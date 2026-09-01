from datetime import datetime

from pydantic import BaseModel


class SystemSettingValue(BaseModel):

    value: float | int | bool | str

    default: float | int | bool | str

    type: str

    description: str

    minimum: float | int | None = None

    maximum: float | int | None = None

    updated_at: datetime | None = None

    updated_by: int | None = None


class SystemSettingsResponse(BaseModel):

    settings: dict[str, SystemSettingValue]


class SystemSettingsUpdateRequest(BaseModel):

    # Map of known setting key -> new value. Unknown keys are
    # rejected by the service.
    settings: dict[str, float | int | bool | str]
