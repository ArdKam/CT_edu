"""Safe, failure-contained publication of generated segmentation artifacts."""
from __future__ import annotations

import os
import shutil
import sys
import uuid
from pathlib import Path


def publish_directory(staged: Path, destination: Path) -> None:
    """Replace a destination directory only after staged output is complete.

    Both directories must be siblings so the renames stay on one filesystem.
    If installing the staged directory fails, restore the previous destination.
    A stale backup is intentionally retained if cleanup fails after publication.
    """
    staged = Path(staged)
    destination = Path(destination)

    if staged.is_symlink() or not staged.is_dir():
        raise ValueError(f"Staged output must be a real directory: {staged}")
    if staged.resolve() == destination.resolve():
        raise ValueError("Staged output and destination must be different paths.")
    if staged.parent.resolve() != destination.parent.resolve():
        raise ValueError("Staged output and destination must share a parent directory.")
    if destination.is_symlink():
        raise ValueError(f"Refusing to replace a symlink destination: {destination}")
    if destination.exists() and not destination.is_dir():
        raise ValueError(f"Refusing to replace a non-directory destination: {destination}")

    backup = destination.with_name(f".{destination.name}.backup-{uuid.uuid4().hex}")
    had_destination = destination.exists()

    if had_destination:
        os.replace(destination, backup)

    try:
        os.replace(staged, destination)
    except OSError:
        if had_destination and backup.exists() and not destination.exists():
            try:
                os.replace(backup, destination)
            except OSError as rollback_error:
                raise RuntimeError(
                    "Could not publish the staged segmentation directory or restore the prior "
                    f"directory. The prior output remains recoverable at {backup}."
                ) from rollback_error
        raise

    if had_destination and backup.exists():
        try:
            shutil.rmtree(backup)
        except OSError as cleanup_error:
            print(
                f"WARNING: new segmentation output is published, but backup cleanup failed at "
                f"{backup}: {cleanup_error}",
                file=sys.stderr,
            )
