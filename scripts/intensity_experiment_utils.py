"""Small, dependency-free helpers for controlled CT intensity experiments."""
from __future__ import annotations

import math


def parse_candidate_offsets(raw: str) -> list[float]:
    """Parse explicit numeric offsets; require at least two distinct candidates."""
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("At least two candidate offsets must be supplied explicitly.")
    values: list[float] = []
    for token in raw.split(","):
        token = token.strip()
        if not token:
            raise ValueError("Empty candidate offset in comma-separated list.")
        try:
            value = float(token)
        except ValueError as exc:
            raise ValueError(f"Invalid candidate offset: {token!r}") from exc
        if not math.isfinite(value) or not -10000 <= value <= 10000:
            raise ValueError(f"Candidate offset must be finite and between -10000 and 10000: {token!r}")
        if value in values:
            raise ValueError(f"Duplicate candidate offset: {token!r}")
        values.append(value)
    if len(values) < 2:
        raise ValueError("At least two distinct candidate offsets are required for a comparison.")
    return values


def classify_run_status(per_class_statuses: list[str]) -> str:
    """Classify a model run without equating partial output with success."""
    if not per_class_statuses:
        return "failed"
    good = sum(status == "complete" for status in per_class_statuses)
    if good == len(per_class_statuses):
        return "complete"
    if good:
        return "partial"
    return "failed"
