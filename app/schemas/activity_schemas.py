from datetime import datetime

from pydantic import BaseModel


class ActivityResponse(BaseModel):
    """One row of recognition history — a read view of a Recognition Event.

    Not a separate stored entity: this is projected from
    RecognitionEvent + its Person and Camera relationships.
    """

    id: int

    person_id: int
    person_name: str
    identifier: str  # CNIC — visible to every management role in V1

    camera_id: int
    camera_name: str
    camera_location: str

    timestamp: datetime
    match_distance: float
