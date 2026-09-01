from pathlib import Path
import secrets

from fastapi import HTTPException, UploadFile


BASE_DIR = Path(__file__).resolve().parents[2]

PROFILE_UPLOAD_DIR = (
    BASE_DIR
    / "app"
    / "uploads"
    / "profiles"
)


MAX_FILE_SIZE = 5 * 1024 * 1024


ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class ProfileImageService:

    @staticmethod
    async def save_profile_image(
        file: UploadFile,
    ) -> str:

        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported image format. "
                    "Only JPEG, PNG, and WebP images are allowed."
                ),
            )

        file_contents = await file.read()

        if not file_contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded image is empty.",
            )

        if len(file_contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Profile image must be 5 MB or smaller.",
            )

        PROFILE_UPLOAD_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

        extension = ALLOWED_CONTENT_TYPES[
            file.content_type
        ]

        filename = (
            f"{secrets.token_hex(16)}"
            f"{extension}"
        )

        destination = (
            PROFILE_UPLOAD_DIR
            / filename
        )

        destination.write_bytes(
            file_contents
        )

        return (
            f"/uploads/profiles/{filename}"
        )