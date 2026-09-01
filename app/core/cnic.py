import re


def normalize_cnic(
    value: str,
) -> str:

    digits = re.sub(
        r"\D",
        "",
        value,
    )

    if len(digits) != 13:
        raise ValueError(
            "CNIC# must contain exactly 13 digits."
        )

    return (
        f"{digits[:5]}-"
        f"{digits[5:12]}-"
        f"{digits[12]}"
    )