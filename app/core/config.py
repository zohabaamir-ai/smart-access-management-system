"""Single configuration source for the backend.

Every environment-derived value the application reads lives here. Other
modules import from this module instead of calling ``load_dotenv()`` /
``os.getenv()`` themselves.

Precedence is unchanged from the previous per-module reads:
``python-dotenv``'s ``load_dotenv()`` does NOT override variables already
present in the process environment, so anything exported before import
(e.g. the test harness setting ``DATABASE_URL`` / ``JWT_SECRET_KEY``)
still wins over ``.env``.

This module intentionally does NOT validate ``JWT_SECRET_KEY``. The two
existing guards are preserved where they were:

* ``app/services/auth_service.py`` raises ``RuntimeError`` at import if unset.
* ``app/api/auth_dependencies.py`` returns HTTP 500 at request time if unset.
"""

import os

from dotenv import load_dotenv

load_dotenv()


# --- database ------------------------------------------------------------

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/smart_access_management_system",
)


# --- authentication / JWT ---------------------------------------------------

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)


# --- face recognition thresholds --------------------------------------------

# Maximum embedding distance for two faces to be treated as the SAME person
# during enrollment / update (duplicate-face rejection). Value unchanged
# from the previous per-service constants.
DUPLICATE_FACE_THRESHOLD = 0.75

# Maximum embedding distance for a live face to be accepted as a match
# during recognition. Value unchanged.
RECOGNITION_THRESHOLD = 1.0


# --- camera recognition-session presence -----------------------------------

# A camera is ONLINE while its public recognition station's last heartbeat
# (or recognition frame) is newer than this. The station beats well inside
# the window; this leaves room for a couple of missed beats + network lag
# before the camera drops to OFFLINE.
CAMERA_SESSION_TTL_SECONDS = 20
