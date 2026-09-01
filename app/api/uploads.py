"""Upload decoding helpers shared by the person and recognition routes."""

import io

from fastapi import HTTPException, UploadFile
from PIL import Image


async def decode_image_upload(file: UploadFile) -> Image.Image:
    """Read an uploaded file and decode it as an RGB ``PIL.Image``.

    On any decode failure this raises ``HTTPException(400, "Invalid image
    file.")`` — the exact status and detail the four previously inlined
    ``Image.open(io.BytesIO(...)).convert("RGB")`` blocks produced.
    """
    image_bytes = await file.read()

    try:
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file.",
        )
