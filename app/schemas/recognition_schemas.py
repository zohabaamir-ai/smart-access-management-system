from datetime import datetime

from pydantic import BaseModel


class RecognitionResult(BaseModel):
    person_id: int | None
    name: str | None
    distance: float
    matched: bool
    timestamp: datetime | None = None


class RecognitionResponse(BaseModel):
    results: list[RecognitionResult]