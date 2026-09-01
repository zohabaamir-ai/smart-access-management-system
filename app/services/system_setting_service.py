import math

from fastapi import HTTPException

from app.core.config import (
    DUPLICATE_FACE_THRESHOLD,
    RECOGNITION_THRESHOLD,
)
from app.repositories.system_setting_repository import (
    SystemSettingRepository,
)


# =============================================================
# V1 SYSTEM SETTINGS CATALOG
#
# A key belongs here only if a Super Admin can meaningfully
# change it AND the running application actually consumes the
# stored value at operation time (see `runtime consumer` below).
# The server owns this catalog; unknown keys are rejected, never
# created.
#
#   recognition_match_threshold
#       consumed by RecognitionService.recognize_faces
#       (app/services/recognition_service.py)
#   duplicate_face_match_threshold
#       consumed by EnrollmentService.enroll_person and
#       PersonService (photo update) via
#       PersonRepository.find_person_by_embedding
#
# Defaults are the pre-B9 hard-coded values, so a deployment
# with nothing stored behaves exactly as before.
# =============================================================

KNOWN_SETTINGS: dict[str, dict] = {
    "recognition_match_threshold": {
        "type": "float",
        "default": RECOGNITION_THRESHOLD,
        "min": 0.1,
        "max": 2.0,
        "description": (
            "Maximum face-embedding distance for a live face to be "
            "accepted as a match against an enrolled person during "
            "recognition. Lower is stricter (fewer matches); higher is "
            "more permissive (more false matches)."
        ),
    },
    "duplicate_face_match_threshold": {
        "type": "float",
        "default": DUPLICATE_FACE_THRESHOLD,
        "min": 0.1,
        "max": 2.0,
        "description": (
            "Maximum face-embedding distance at which a new enrollment "
            "or updated photo is treated as a duplicate of an "
            "already-enrolled person and rejected. Higher rejects more "
            "near-duplicates; lower allows more similar faces as "
            "separate people."
        ),
    },
}


class SystemSettingService:

    def __init__(
        self,
        system_setting_repository: SystemSettingRepository,
    ):
        self.repository = (
            system_setting_repository
        )

    # ---------------------------------------------------------
    # VALIDATION / COERCION
    # ---------------------------------------------------------

    def _coerce(
        self,
        key: str,
        raw_value,
    ):
        """Validate a client-supplied value against the catalog spec
        and return it in its declared Python type. Raises 400 on any
        type / range / finiteness violation."""

        spec = KNOWN_SETTINGS[key]

        numeric = spec["type"] in {"int", "float"}

        # A JSON boolean is not a number, even though bool is an int
        # subclass in Python.
        if numeric and isinstance(raw_value, bool):
            raise HTTPException(
                status_code=400,
                detail=f"Setting '{key}' must be a number.",
            )

        try:
            if spec["type"] == "int":
                value = int(raw_value)

            elif spec["type"] == "float":
                value = float(raw_value)

            elif spec["type"] == "bool":
                if isinstance(raw_value, bool):
                    value = raw_value
                else:
                    value = str(
                        raw_value
                    ).strip().lower() in {
                        "true",
                        "1",
                        "yes",
                    }

            else:
                value = str(raw_value)

        except (TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Setting '{key}' must be "
                    f"of type {spec['type']}."
                ),
            )

        if spec["type"] == "float" and (
            math.isnan(value)
            or math.isinf(value)
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Setting '{key}' must be a "
                    "finite number."
                ),
            )

        if numeric:
            if (
                "min" in spec
                and value < spec["min"]
            ) or (
                "max" in spec
                and value > spec["max"]
            ):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Setting '{key}' must be "
                        f"between {spec['min']} "
                        f"and {spec['max']}."
                    ),
                )

        return value

    # ---------------------------------------------------------
    # RUNTIME ACCESS
    # ---------------------------------------------------------

    def get_value(
        self,
        key: str,
    ):
        """Current effective value of a single setting, for the
        services that consume it at operation time. Tolerant: a
        missing or somehow-unparseable stored row falls back to the
        catalog default rather than raising into a recognition /
        enrollment request."""

        spec = KNOWN_SETTINGS[key]

        stored = self.repository.get(key)

        if stored is None:
            return spec["default"]

        try:
            if spec["type"] == "int":
                value = int(stored.value)
            elif spec["type"] == "float":
                value = float(stored.value)
            else:
                return stored.value

        except (TypeError, ValueError):
            return spec["default"]

        if spec["type"] == "float" and (
            math.isnan(value)
            or math.isinf(value)
        ):
            return spec["default"]

        return value

    # ---------------------------------------------------------
    # READ (API)
    # ---------------------------------------------------------

    def get_system_settings(
        self,
    ) -> dict:

        stored = {
            setting.key: setting
            for setting in self.repository.get_all()
        }

        result: dict = {}

        for key, spec in KNOWN_SETTINGS.items():

            entry = {
                "type": spec["type"],
                "default": spec["default"],
                "minimum": spec.get("min"),
                "maximum": spec.get("max"),
                "description": spec["description"],
            }

            if key in stored:
                entry["value"] = self._coerce(
                    key,
                    stored[key].value,
                )
                entry["updated_at"] = (
                    stored[key].updated_at
                )
                entry["updated_by"] = (
                    stored[key].updated_by
                )
            else:
                entry["value"] = spec["default"]
                entry["updated_at"] = None
                entry["updated_by"] = None

            result[key] = entry

        return result

    # ---------------------------------------------------------
    # WRITE (API)
    # ---------------------------------------------------------

    def update_system_settings(
        self,
        updates: dict,
        updated_by: int | None,
    ) -> dict:
        """All-or-nothing: every submitted key is validated before any
        row is written, and all writes share one commit."""

        if not updates:
            raise HTTPException(
                status_code=400,
                detail="No settings were provided.",
            )

        unknown = (
            set(updates)
            - set(KNOWN_SETTINGS)
        )

        if unknown:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unknown system setting(s): "
                    + ", ".join(sorted(unknown))
                ),
            )

        # Pass 1 — validate everything. Raises before any write.
        coerced = {
            key: self._coerce(key, raw_value)
            for key, raw_value in updates.items()
        }

        # Pass 2 — stage every row, then a single commit.
        for key, value in coerced.items():
            self.repository.upsert(
                key=key,
                value=str(value),
                updated_by=updated_by,
                commit=False,
            )

        self.repository.db.commit()

        return self.get_system_settings()
