from app.db.database import engine

from app.db.db_models.base import Base

# Import every model so Base.metadata is complete before create_all
# (side-effect imports — the names are registered with the declarative
# mapper, not used lexically here). Mirrors tests/conftest.py.
from app.db.db_models.admin import Admin  # noqa: F401
from app.db.db_models.person import Person  # noqa: F401
from app.db.db_models.recognition_event import (  # noqa: F401
    RecognitionEvent,
)
from app.db.db_models.camera import Camera  # noqa: F401
from app.db.db_models.person_activity import (  # noqa: F401
    PersonActivity,
)
from app.db.db_models.system_setting import (  # noqa: F401
    SystemSetting,
)


Base.metadata.create_all(
    bind=engine
)

print(
    "Tables created successfully."
)
