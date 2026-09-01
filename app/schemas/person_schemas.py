from pydantic import BaseModel, ConfigDict
from datetime import datetime

class PersonResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    name: str
    # CNIC. V1: visible to every management role — no privacy masking.
    identifier: str
    created_at: datetime
    # None only when the Person genuinely has no enrollment photo.
    photo_path: str | None = None


class PersonUpdateResponse(BaseModel):
    id: int
    name: str
    identifier: str
    message: str


class PersonActivityResponse(
    BaseModel
):
    id: int
    person_id: int
    person_name: str
    action: str
    performed_by: int
    timestamp: datetime
