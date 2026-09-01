from pathlib import Path
from uuid import uuid4

from PIL import Image


BASE_DIR = Path(__file__).resolve().parents[2]

PERSON_PHOTO_DIRECTORY = (
    BASE_DIR
    / "app"
    / "uploads"
    / "persons"
)


def save_person_photo(
    image: Image.Image,
) -> str:

    PERSON_PHOTO_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    filename = (
        f"{uuid4().hex}.jpg"
    )

    file_path = (
        PERSON_PHOTO_DIRECTORY
        / filename
    )

    image.convert("RGB").save(
        file_path,
        format="JPEG",
        quality=90,
    )

    return str(
        Path("app")
        / "uploads"
        / "persons"
        / filename
    )


def delete_person_photo(
    photo_path: str | None,
) -> None:

    if not photo_path:
        return

    file_path = (
        BASE_DIR / photo_path
    )

    if file_path.exists():
        file_path.unlink()