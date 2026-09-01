"""Phase 1.2 — regression coverage for the single configuration source.

Freezes: the config module surface, and the two preserved missing-secret
behaviors (RuntimeError at import in auth_service; the config module
itself never validates).
"""

from __future__ import annotations

import subprocess
import sys
import textwrap
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent


def _run(script: str, env_overrides: dict | None = None) -> subprocess.CompletedProcess:
    import os

    env = dict(os.environ)
    env["PYTHONPATH"] = str(_REPO_ROOT)
    env["DATABASE_URL"] = (
        "postgresql://postgres:postgres@localhost:5432/"
        "smart_access_management_system_test"
    )
    for key, value in (env_overrides or {}).items():
        if value is None:
            env.pop(key, None)
        else:
            env[key] = value
    return subprocess.run(
        [sys.executable, "-c", textwrap.dedent(script)],
        cwd=str(_REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=180,
    )


def test_config_module_surface():
    from app.core import config

    assert isinstance(config.DATABASE_URL, str) and config.DATABASE_URL
    assert config.JWT_ALGORITHM == "HS256"
    assert isinstance(config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES, int)
    assert config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES == 60
    assert config.DUPLICATE_FACE_THRESHOLD == 0.75
    assert config.RECOGNITION_THRESHOLD == 1.0


def test_config_thresholds_are_the_system_settings_defaults():
    """B9: the config constants are no longer read directly by the
    recognition / enrollment services — they consume the persisted
    System Setting at operation time. The constants remain as the
    catalog *defaults*, so a store with nothing set behaves exactly as
    before.
    """
    from app.core.config import (
        DUPLICATE_FACE_THRESHOLD,
        RECOGNITION_THRESHOLD,
    )
    from app.services import enrollment_service, person_service, recognition_service
    from app.services.system_setting_service import KNOWN_SETTINGS

    assert (
        KNOWN_SETTINGS["recognition_match_threshold"]["default"]
        == RECOGNITION_THRESHOLD
    )
    assert (
        KNOWN_SETTINGS["duplicate_face_match_threshold"]["default"]
        == DUPLICATE_FACE_THRESHOLD
    )

    # the services no longer carry a module-level threshold constant
    assert not hasattr(recognition_service, "RECOGNITION_THRESHOLD")
    assert not hasattr(enrollment_service, "DUPLICATE_FACE_THRESHOLD")
    assert not hasattr(person_service, "DUPLICATE_FACE_THRESHOLD")


def test_missing_jwt_secret_raises_runtime_error_at_import():
    """auth_service still raises RuntimeError when the secret is unset.

    The config value drives the guard: force it to None *before* auth_service
    is imported and confirm the import fails exactly as before.
    """
    result = _run(
        """
        import sys
        import app.core.config as cfg
        cfg.JWT_SECRET_KEY = None
        try:
            import app.services.auth_service  # noqa: F401
        except RuntimeError as exc:
            assert "JWT_SECRET_KEY is not configured." in str(exc), str(exc)
            print("RUNTIME_ERROR_RAISED")
            sys.exit(0)
        print("NO_ERROR")
        sys.exit(1)
        """
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "RUNTIME_ERROR_RAISED" in result.stdout


def test_app_imports_with_jwt_secret_present():
    result = _run(
        """
        import main
        assert main.app.title == "Face Recognition Attendance System"
        print("IMPORT_OK")
        """,
        env_overrides={"JWT_SECRET_KEY": "subprocess-import-check-secret-key-value"},
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "IMPORT_OK" in result.stdout


def test_config_module_does_not_validate_secret():
    """Importing app.core.config alone never raises, even with no secret."""
    result = _run(
        """
        import app.core.config  # noqa: F401
        print("CONFIG_IMPORT_OK")
        """,
        env_overrides={"JWT_SECRET_KEY": None},
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "CONFIG_IMPORT_OK" in result.stdout
