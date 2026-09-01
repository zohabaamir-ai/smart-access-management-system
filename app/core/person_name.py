import re


MIN_NAME_LENGTH = 2
MAX_NAME_LENGTH = 100


def normalize_person_name(
    name: str,
) -> str:

    normalized = " ".join(
        name.strip().split()
    )

    if len(normalized) < MIN_NAME_LENGTH:
        raise ValueError(
            "Person name must contain at least 2 characters."
        )

    if len(normalized) > MAX_NAME_LENGTH:
        raise ValueError(
            "Person name cannot exceed 100 characters."
        )

    if not re.fullmatch(
        r"[A-Za-zÀ-ÖØ-öø-ÿ' -]+",
        normalized,
    ):
        raise ValueError(
            "Person name can only contain letters, spaces, apostrophes, and hyphens."
        )

    return normalized