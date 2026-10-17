#!/usr/bin/env python3
"""Safely extract only requested CT-ORG held-out test cases from the official ZIP bundles.

This helper never extracts the full archive and never overwrites an existing file.
Only case numbers 0-20 (the official CT-ORG test split) are allowed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
import zipfile
import shutil
from pathlib import Path, PurePosixPath
from typing import Any

OFFICIAL_TEST_CASES = set(range(21))
MAX_MEMBER_BYTES = 8 * 1024 * 1024 * 1024
DATA_CITATION = (
    "Rister B, Shivakumar K, Nobashi T, Rubin DL. CT-ORG: A Dataset of CT Volumes "
    "With Multiple Organ Segmentations (Version 1). The Cancer Imaging Archive (2019). "
    "DOI: 10.7937/tcia.2019.tt7f4v7o."
)
LICENSE = "Creative Commons Attribution 3.0 Unported (CC BY 3.0), subject to the TCIA Data Usage Policy"


class CTORGArchiveError(ValueError):
    """Raised when the official CT-ORG archive cannot safely supply the requested subset."""


def validate_case_ids(case_ids: list[int] | tuple[int, ...]) -> list[int]:
    if not case_ids:
        raise CTORGArchiveError("Select at least one official CT-ORG test case (0-20).")
    if any(isinstance(case_id, bool) or not isinstance(case_id, int) for case_id in case_ids):
        raise CTORGArchiveError("Case IDs must be integer CT-ORG case numbers.")
    if len(case_ids) != len(set(case_ids)):
        raise CTORGArchiveError("Duplicate CT-ORG case IDs are not allowed.")
    invalid = sorted(set(case_ids) - OFFICIAL_TEST_CASES)
    if invalid:
        raise CTORGArchiveError(
            f"Only the official held-out CT-ORG test split (cases 0-20) may be extracted; invalid IDs: {invalid}."
        )
    return sorted(case_ids)


def _member_for_basename(archive: zipfile.ZipFile, wanted: str) -> zipfile.ZipInfo:
    matches = []
    for info in archive.infolist():
        member = PurePosixPath(info.filename)
        if member.is_absolute() or any(part in {"", ".", ".."} for part in member.parts):
            continue
        if info.is_dir() or member.name != wanted:
            continue
        matches.append(info)
    if len(matches) != 1:
        raise CTORGArchiveError(
            f"Expected exactly one safe archive member named {wanted!r}; found {len(matches)}."
        )
    info = matches[0]
    if info.file_size <= 0 or info.file_size > MAX_MEMBER_BYTES:
        raise CTORGArchiveError(
            f"Archive member {wanted!r} has unsupported uncompressed size {info.file_size} bytes."
        )
    return info


def _extract_member(archive: zipfile.ZipFile, info: zipfile.ZipInfo, destination: Path) -> dict[str, Any]:
    if destination.exists() or destination.is_symlink():
        raise CTORGArchiveError(f"Refusing to overwrite an existing subset file: {destination.name}.")
    temporary = destination.with_name(destination.name + ".tmp")
    digest = hashlib.sha256()
    written = 0
    try:
        with archive.open(info, "r") as source, temporary.open("xb") as target:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                target.write(chunk)
                digest.update(chunk)
                written += len(chunk)
                if written > info.file_size or written > MAX_MEMBER_BYTES:
                    raise CTORGArchiveError(f"Archive member {destination.name!r} exceeded its declared size.")
        if written != info.file_size:
            raise CTORGArchiveError(f"Archive member {destination.name!r} was truncated.")
        os.replace(temporary, destination)
    except Exception:
        temporary.unlink(missing_ok=True)
        destination.unlink(missing_ok=True)
        raise
    return {
        "file": destination.name,
        "sha256": digest.hexdigest(),
        "sizeBytes": written,
    }


def extract_ctorg_test_subset(
    volumes_zip: Path,
    labels_zip: Path,
    output_dir: Path,
    *,
    case_ids: list[int] | tuple[int, ...] = tuple(range(21)),
) -> dict[str, Any]:
    selected = validate_case_ids(list(case_ids))
    volumes_zip = Path(volumes_zip)
    labels_zip = Path(labels_zip)
    output_dir = Path(output_dir)
    for path, description in ((volumes_zip, "volume archive"), (labels_zip, "label archive")):
        if not path.is_file():
            raise CTORGArchiveError(f"CT-ORG {description} does not exist.")
    if output_dir.is_symlink() or (output_dir.exists() and not output_dir.is_dir()):
        raise CTORGArchiveError("Refusing to write to a symlink or non-directory output path.")
    if output_dir.exists() and any(output_dir.iterdir()):
        raise CTORGArchiveError("Subset output directory must be new or empty.")
    output_dir.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=f".{output_dir.name}.staging-", dir=output_dir.parent))
    extracted: list[dict[str, Any]] = []
    try:
        with zipfile.ZipFile(volumes_zip, "r") as volume_archive, zipfile.ZipFile(labels_zip, "r") as label_archive:
            for case_number in selected:
                volume_name = f"volume-{case_number}.nii.gz"
                label_name = f"labels-{case_number}.nii.gz"
                volume_info = _member_for_basename(volume_archive, volume_name)
                label_info = _member_for_basename(label_archive, label_name)
                extracted.append({
                    "caseNumber": case_number,
                    "volume": _extract_member(volume_archive, volume_info, stage / volume_name),
                    "reference": _extract_member(label_archive, label_info, stage / label_name),
                })

        manifest = {
            "schemaVersion": 1,
            "dataset": "CT-ORG",
            "datasetVersion": "v1 / TCIA current collection record",
            "officialSplit": "test",
            "officialTestCaseNumbers": selected,
            "selectedCaseCount": len(selected),
            "sourceDataCitation": DATA_CITATION,
            "license": LICENSE,
            "sourceUrl": "https://www.cancerimagingarchive.net/collection/ct-org/",
            "extractedFiles": extracted,
            "interpretationLimits": [
                "Only official CT-ORG cases 0-20 are permitted by this helper; training cases are rejected.",
                "Input volumes and labels are extracted to a user-selected temporary workspace and are not copied into the repository by this script.",
                "The caller must preserve the data citation and comply with the TCIA Data Usage Policy and CC BY 3.0.",
            ],
        }
        manifest_path = stage / "subset-manifest.json"
        temporary_manifest = manifest_path.with_name(manifest_path.name + ".tmp")
        temporary_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary_manifest, manifest_path)
        if output_dir.exists():
            output_dir.rmdir()  # Only an empty directory passed the precondition above.
        os.replace(stage, output_dir)
        return manifest
    except Exception:
        shutil.rmtree(stage, ignore_errors=True)
        raise

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--volumes-zip", type=Path, required=True, help="Official CT-ORG volume archive containing cases 0-49.")
    parser.add_argument("--labels-zip", type=Path, required=True, help="Official CT-ORG labels/README archive.")
    parser.add_argument("--output-dir", type=Path, required=True, help="New or empty directory for the selected NIfTI files.")
    parser.add_argument("--cases", type=int, nargs="+", default=list(range(21)), help="Official held-out test case numbers, 0-20.")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        result = extract_ctorg_test_subset(args.volumes_zip, args.labels_zip, args.output_dir, case_ids=args.cases)
    except CTORGArchiveError as exc:
        print(f"SEGMENTOR_CTORG_ARCHIVE_ERROR: {exc}", file=sys.stderr)
        return 2
    except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
        print(f"SEGMENTOR_CTORG_ARCHIVE_ERROR: {type(exc).__name__}", file=sys.stderr)
        return 2
    print(json.dumps({
        "outputDirectory": str(args.output_dir),
        "selectedCaseCount": result["selectedCaseCount"],
        "extractedFileCount": len(result["extractedFiles"]) * 2,
        "officialSplit": result["officialSplit"],
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
