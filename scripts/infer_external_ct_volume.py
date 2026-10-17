#!/usr/bin/env python3
"""Generate geometry-preserving TotalSegmentator masks for an external 3D CT NIfTI.

This is a local/controlled validation utility. It does not upload input data,
publish source scans, or certify model accuracy.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from importlib.metadata import PackageNotFoundError, version as installed_version
from pathlib import Path
from typing import Any

import nibabel as nib
import numpy as np
from nibabel.processing import resample_from_to

sys.path.insert(0, str(Path(__file__).resolve().parent))
from atomic_artifact_publish import publish_directory

REQUIRED_TOTAL_SEGMENTATOR_VERSION = "2.11.0"
MAX_OFFSET_ABS = 10000.0
CASE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
DATASET_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
REGISTRY_PATH = Path(__file__).resolve().parents[1] / "docs" / "SEGMENTOR_COVERAGE_REGISTRY.json"
TARGETS = [
    {"id": "anatomy.liver", "modelClass": "liver", "labelId": 1, "name": "Liver"},
    {"id": "anatomy.spleen", "modelClass": "spleen", "labelId": 2, "name": "Spleen"},
    {"id": "anatomy.kidney_right", "modelClass": "kidney_right", "labelId": 3, "name": "Right kidney"},
    {"id": "anatomy.kidney_left", "modelClass": "kidney_left", "labelId": 4, "name": "Left kidney"},
]



class ExternalInferenceError(ValueError):
    """Raised when input or output cannot support a geometry-faithful run."""


def available_total_class_targets() -> list[dict[str, Any]]:
    """Load only the pinned TotalSegmentator total-task classes from the versioned registry."""
    try:
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ExternalInferenceError(f"Could not read the versioned class-coverage registry: {exc}") from exc
    if registry.get("schemaVersion") != 1 or registry.get("upstreamSources", {}).get("pinnedVersion") != REQUIRED_TOTAL_SEGMENTATOR_VERSION:
        raise ExternalInferenceError("Coverage registry schema/version does not match the pinned TotalSegmentator package.")
    structures = registry.get("structures")
    if not isinstance(structures, list) or not structures:
        raise ExternalInferenceError("Coverage registry has no anatomy structures.")
    result: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    seen_classes: set[str] = set()
    for entry in structures:
        availability = entry.get("upstreamAvailability", {})
        if availability.get("model") != "TotalSegmentator" or availability.get("task") != "total":
            continue
        if availability.get("version") != REQUIRED_TOTAL_SEGMENTATOR_VERSION:
            continue
        stable_id = entry.get("id")
        model_class = entry.get("upstreamModelClass")
        display_name = entry.get("displayName")
        if (
            not isinstance(stable_id, str) or not stable_id.startswith("anatomy.") or
            not isinstance(model_class, str) or not re.fullmatch(r"[A-Za-z0-9_]+", model_class) or
            not isinstance(display_name, str) or not display_name.strip()
        ):
            raise ExternalInferenceError("Coverage registry contains a malformed TotalSegmentator class entry.")
        if stable_id in seen_ids or model_class in seen_classes:
            raise ExternalInferenceError("Coverage registry contains duplicate stable IDs or upstream model classes.")
        seen_ids.add(stable_id)
        seen_classes.add(model_class)
        result.append({
            "id": stable_id,
            "modelClass": model_class,
            "name": display_name.strip(),
            "anatomicalGroup": entry.get("anatomicalGroup"),
            "laterality": entry.get("laterality"),
        })
    if not result:
        raise ExternalInferenceError("Coverage registry has no classes for the pinned total task.")
    return result


def resolve_target_classes(class_names: list[str] | None = None) -> list[dict[str, Any]]:
    """Resolve explicit upstream class names/stable IDs, or 'all', into unique output label IDs."""
    if class_names is None:
        requested = [item["modelClass"] for item in TARGETS]
    else:
        requested = list(class_names)
    if not requested:
        raise ExternalInferenceError("Select at least one class.")
    available = available_total_class_targets()
    by_model = {item["modelClass"]: item for item in available}
    by_id = {item["id"]: item for item in available}
    if len(requested) == 1 and requested[0].casefold() == "all":
        selected = available
    else:
        if any(str(name).casefold() == "all" for name in requested):
            raise ExternalInferenceError("'all' must be used alone, not alongside individual classes.")
        selected = []
        seen: set[str] = set()
        for requested_name in requested:
            candidate = by_model.get(requested_name) or by_id.get(requested_name)
            if candidate is None:
                raise ExternalInferenceError(
                    f"Unsupported TotalSegmentator {REQUIRED_TOTAL_SEGMENTATOR_VERSION} total-task class: {requested_name!r}."
                )
            if candidate["id"] in seen:
                raise ExternalInferenceError(f"Class {requested_name!r} was requested more than once.")
            seen.add(candidate["id"])
            selected.append(candidate)
    if len(selected) > 255:
        raise ExternalInferenceError("A uint8 combined label map can represent at most 255 foreground classes.")
    return [dict(item, labelId=index) for index, item in enumerate(selected, start=1)]


OPEN_SPECIALIST_TASKS = {"lung_vessels", "headneck_bones_vessels", "liver_vessels"}


def task_catalog_entry(task_name: str) -> dict[str, Any]:
    """Return an explicitly open task from the pinned registry; licensed tasks fail closed."""
    try:
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ExternalInferenceError(f"Could not read the versioned task-coverage registry: {exc}") from exc
    if (
        registry.get("schemaVersion") != 1 or
        registry.get("upstreamSources", {}).get("pinnedVersion") != REQUIRED_TOTAL_SEGMENTATOR_VERSION
    ):
        raise ExternalInferenceError("Coverage registry schema/version does not match the pinned TotalSegmentator package.")
    if task_name not in ({"total"} | OPEN_SPECIALIST_TASKS):
        raise ExternalInferenceError(
            f"Task {task_name!r} is not enabled. Licensed tasks are deliberately blocked until task/model terms are reviewed."
        )
    catalog = registry.get("taskCatalog")
    if not isinstance(catalog, list):
        raise ExternalInferenceError("Coverage registry has no task catalog.")
    entry = next((item for item in catalog if isinstance(item, dict) and item.get("task") == task_name), None)
    if not entry or entry.get("version") != REQUIRED_TOTAL_SEGMENTATOR_VERSION:
        raise ExternalInferenceError(f"Task {task_name!r} is not declared for the pinned model version.")
    licensing = entry.get("licensing", {})
    if licensing.get("taskLicense") != "Apache-2.0":
        raise ExternalInferenceError(
            f"Task {task_name!r} is not listed as openly licensed in the pinned registry; refusing to execute it."
        )
    if task_name != "total" and (
        not isinstance(entry.get("classes"), list) or not entry.get("classes") or
        not all(isinstance(name, str) and re.fullmatch(r"[A-Za-z0-9_]+", name) for name in entry["classes"])
    ):
        raise ExternalInferenceError(f"Specialist task {task_name!r} has a malformed class list in the coverage registry.")
    return entry


def available_task_targets(task_name: str) -> list[dict[str, Any]]:
    """Resolve the target classes for a pinned, explicitly open TotalSegmentator task."""
    task_entry = task_catalog_entry(task_name)
    if task_name == "total":
        return available_total_class_targets()
    structures = json.loads(REGISTRY_PATH.read_text(encoding="utf-8")).get("structures", [])
    total_by_model = {
        item["modelClass"]: item
        for item in available_total_class_targets()
    }
    result: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for model_class in task_entry["classes"]:
        existing = total_by_model.get(model_class)
        stable_id = existing["id"] if existing else f"anatomy.task.{task_name}.{model_class}"
        display_name = existing["name"] if existing else model_class.replace("_", " ").title()
        group = existing.get("anatomicalGroup") if existing else "specialist-task-structure"
        if stable_id in seen_ids:
            raise ExternalInferenceError(f"Task {task_name!r} contains duplicate stable class identities.")
        seen_ids.add(stable_id)
        result.append({
            "id": stable_id,
            "modelClass": model_class,
            "name": display_name,
            "anatomicalGroup": group,
            "laterality": existing.get("laterality") if existing else "not-applicable-or-task-defined",
            "task": task_name,
        })
    if not result:
        raise ExternalInferenceError(f"Task {task_name!r} has no selectable classes.")
    return result


def resolve_task_classes(task_name: str, class_names: list[str] | None = None) -> list[dict[str, Any]]:
    """Resolve upstream class names/stable IDs or 'all' to sequential combined-map labels."""
    task_catalog_entry(task_name)
    if task_name == "total":
        return resolve_target_classes(class_names)
    available = available_task_targets(task_name)
    if class_names is None:
        requested = ["all"]
    else:
        requested = list(class_names)
    if not requested:
        raise ExternalInferenceError("Select at least one class.")
    by_model = {item["modelClass"]: item for item in available}
    by_id = {item["id"]: item for item in available}
    if len(requested) == 1 and requested[0].casefold() == "all":
        selected = available
    else:
        if any(not isinstance(name, str) for name in requested):
            raise ExternalInferenceError("Requested class names must be strings.")
        if any(name.casefold() == "all" for name in requested):
            raise ExternalInferenceError("'all' must be used alone, not alongside individual classes.")
        selected = []
        seen: set[str] = set()
        for requested_name in requested:
            candidate = by_model.get(requested_name) or by_id.get(requested_name)
            if candidate is None:
                raise ExternalInferenceError(
                    f"Unsupported TotalSegmentator {REQUIRED_TOTAL_SEGMENTATOR_VERSION} {task_name} class: {requested_name!r}."
                )
            if candidate["id"] in seen:
                raise ExternalInferenceError(f"Class {requested_name!r} was requested more than once.")
            seen.add(candidate["id"])
            selected.append(candidate)
    if len(selected) > 255:
        raise ExternalInferenceError("A uint8 combined label map can represent at most 255 foreground classes.")
    return [dict(item, labelId=index) for index, item in enumerate(selected, start=1)]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def model_version() -> str:
    try:
        return installed_version("TotalSegmentator")
    except PackageNotFoundError as exc:
        raise ExternalInferenceError(
            "The pinned TotalSegmentator distribution is not installed. Install TotalSegmentator==2.11.0."
        ) from exc


def validate_geometry(image: nib.spatialimages.SpatialImage, label: str = "input") -> tuple[float, float, float]:
    if len(image.shape) != 3 or any(int(dimension) <= 0 for dimension in image.shape):
        raise ExternalInferenceError(f"{label} must be a non-empty 3D NIfTI volume; got shape {image.shape}.")
    spatial_unit, _ = image.header.get_xyzt_units()
    if spatial_unit != "mm":
        raise ExternalInferenceError(
            f"{label} NIfTI spatial units are {spatial_unit!r}, not mm. Confirm the source geometry "
            "and correct the header only from authoritative source metadata before running inference."
        )
    if int(image.header["sform_code"]) <= 0 and int(image.header["qform_code"]) <= 0:
        raise ExternalInferenceError(f"{label} must contain an explicit qform or sform spatial transform.")
    affine = np.asarray(image.affine, dtype=np.float64)
    if affine.shape != (4, 4) or not np.isfinite(affine).all():
        raise ExternalInferenceError(f"{label} has a malformed or non-finite affine.")
    directions = affine[:3, :3]
    if abs(float(np.linalg.det(directions))) < 1e-10:
        raise ExternalInferenceError(f"{label} affine is singular.")
    spacing = np.linalg.norm(directions, axis=0)
    if np.any(~np.isfinite(spacing)) or np.any(spacing <= 0):
        raise ExternalInferenceError(f"{label} has invalid voxel spacing.")
    unit_directions = directions / spacing[np.newaxis, :]
    gram = unit_directions.T @ unit_directions
    if not np.allclose(gram, np.eye(3), rtol=0.0, atol=1e-4):
        raise ExternalInferenceError(
            f"{label} has sheared/non-orthogonal axes. Resample explicitly to a documented orthogonal grid first."
        )
    qform, qcode = image.get_qform(coded=True)
    sform, scode = image.get_sform(coded=True)
    if int(qcode) > 0 and int(scode) > 0 and not np.allclose(qform, sform, rtol=0.0, atol=1e-4):
        raise ExternalInferenceError(f"{label} qform and sform disagree; resolve the spatial transform explicitly.")
    return tuple(float(value) for value in spacing)


def load_source_volume(path: Path) -> tuple[nib.spatialimages.SpatialImage, np.ndarray, tuple[float, float, float]]:
    path = Path(path)
    if not path.is_file() or path.is_symlink():
        raise ExternalInferenceError("Input must be an existing regular NIfTI file, not a symlink.")
    try:
        image = nib.load(str(path))
    except Exception as exc:
        raise ExternalInferenceError(f"Could not read input NIfTI: {exc}") from exc
    spacing = validate_geometry(image)
    try:
        # Nibabel's data proxy applies NIfTI scl_slope/scl_inter before this conversion.
        values = np.asarray(image.dataobj, dtype=np.float32)
    except Exception as exc:
        raise ExternalInferenceError(f"Could not read scaled CT values from the NIfTI: {exc}") from exc
    if not np.isfinite(values).all():
        raise ExternalInferenceError("Input volume contains NaN or infinite values.")
    if not np.any(values):
        raise ExternalInferenceError("Input volume contains only zero-valued voxels.")
    return image, values, spacing


def preprocess_values(
    values: np.ndarray,
    intensity_offset: float,
    intensity_semantics: str,
) -> np.ndarray:
    if not np.isfinite(intensity_offset) or abs(intensity_offset) > MAX_OFFSET_ABS:
        raise ExternalInferenceError(f"Intensity offset must be finite and within ±{MAX_OFFSET_ABS:g}.")
    if intensity_semantics not in {"hounsfield-units-confirmed", "stored-values-unverified"}:
        raise ExternalInferenceError("Unsupported intensity semantics.")
    if intensity_semantics == "hounsfield-units-confirmed" and intensity_offset != 0:
        raise ExternalInferenceError(
            "For input declared as confirmed HU, use offset 0. Do not apply a storage correction to calibrated HU."
        )
    processed = np.asarray(values, dtype=np.float32) - np.float32(intensity_offset)
    if not np.isfinite(processed).all():
        raise ExternalInferenceError("Preprocessed input contains non-finite values.")
    return processed


def save_model_input(
    values: np.ndarray,
    reference: nib.spatialimages.SpatialImage,
    output_path: Path,
) -> None:
    affine = np.asarray(reference.affine, dtype=np.float64)
    image = nib.Nifti1Image(np.asarray(values, dtype=np.float32), affine)
    image.set_qform(affine, code=1)
    image.set_sform(affine, code=1)
    image.header.set_xyzt_units("mm")
    image.header.set_data_dtype(np.float32)
    nib.save(image, str(output_path))


def mask_image(mask: np.ndarray, affine: np.ndarray) -> nib.Nifti1Image:
    result = nib.Nifti1Image(np.asarray(mask, dtype=np.uint8), np.asarray(affine, dtype=np.float64))
    result.set_qform(result.affine, code=1)
    result.set_sform(result.affine, code=1)
    result.header.set_xyzt_units("mm")
    result.header.set_data_dtype(np.uint8)
    return result


def run_external_inference(
    input_path: Path,
    output_dir: Path,
    *,
    case_id: str,
    dataset_id: str,
    intensity_offset: float,
    intensity_semantics: str,
    preprocessing_notes: str,
    class_names: list[str] | None = None,
    resolution: str = "fast",
    timeout_seconds: int = 5400,
    executable: str = "TotalSegmentator",
) -> dict[str, Any]:
    case_id = case_id.strip() if isinstance(case_id, str) else ""
    dataset_id = dataset_id.strip() if isinstance(dataset_id, str) else ""
    if not CASE_ID_PATTERN.fullmatch(case_id):
        raise ExternalInferenceError(
            "Case ID must be a pseudonymous 1–128 character token containing only letters, digits, dot, underscore or hyphen."
        )
    if not DATASET_ID_PATTERN.fullmatch(dataset_id):
        raise ExternalInferenceError(
            "Dataset ID must be a 1–128 character token containing only letters, digits, dot, underscore or hyphen."
        )
    if not isinstance(preprocessing_notes, str) or not preprocessing_notes.strip():
        raise ExternalInferenceError("Provide explicit preprocessing notes; do not leave calibration assumptions implicit.")
    if resolution not in {"fast", "full"}:
        raise ExternalInferenceError("Resolution must be either 'fast' or 'full'.")
    if isinstance(timeout_seconds, bool) or not isinstance(timeout_seconds, int) or timeout_seconds <= 0:
        raise ExternalInferenceError("Timeout must be a positive integer number of seconds.")
    version = model_version()
    if version != REQUIRED_TOTAL_SEGMENTATOR_VERSION:
        raise ExternalInferenceError(
            f"Expected TotalSegmentator {REQUIRED_TOTAL_SEGMENTATOR_VERSION}, found {version}. "
            "Pin the model package before generating a comparison cohort."
        )
    targets = resolve_target_classes(class_names)
    input_path = Path(input_path)
    source_hash = sha256_file(input_path)
    image, source_values, spacing = load_source_volume(input_path)
    model_values = preprocess_values(source_values, intensity_offset, intensity_semantics)
    affine = np.asarray(image.affine, dtype=np.float64)
    input_statistics = {
        "minimum": float(np.min(model_values)),
        "p001": float(np.percentile(model_values, 0.1)),
        "median": float(np.percentile(model_values, 50)),
        "p999": float(np.percentile(model_values, 99.9)),
        "maximum": float(np.max(model_values)),
    }

    destination = Path(output_dir)
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.is_symlink() or (destination.exists() and not destination.is_dir()):
        raise ExternalInferenceError("Refusing to replace a symlink or non-directory output target.")
    stage = Path(tempfile.mkdtemp(prefix=f".{destination.name}.staging-", dir=destination.parent))
    try:
        with tempfile.TemporaryDirectory(prefix="ctedu-external-inference-") as temp_name:
            temp = Path(temp_name)
            model_input = temp / "model-input.nii.gz"
            model_outputs = temp / "model-output"
            model_outputs.mkdir()
            save_model_input(model_values, image, model_input)
            command = [
                executable, "-i", str(model_input), "-o", str(model_outputs),
                "--task", "total", "--device", "cpu",
                "--nr_thr_resamp", "1", "--nr_thr_saving", "1",
                "--roi_subset", *[item["modelClass"] for item in targets],
            ]
            if resolution == "fast":
                command.append("--fast")
            completed = subprocess.run(
                command,
                check=False,
                timeout=timeout_seconds,
                capture_output=True,
                text=True,
            )
            if completed.returncode != 0:
                # Do not include full command output in a persistent report; model logs can reveal local paths.
                tail = (completed.stderr or completed.stdout or "No model output was recorded.")[-1500:]
                raise ExternalInferenceError(
                    f"TotalSegmentator exited with status {completed.returncode}. Diagnostic tail: {tail}"
                )

            organ_records: list[dict[str, Any]] = []
            target_grid = (image.shape, image.affine)
            # Stream one mask at a time; keeping 117 full-size masks resident would
            # multiply memory use on large CTs. The uint8 accumulators track overlap
            # and the combined label map while each separate mask is published to stage.
            occupancy = np.zeros(image.shape, dtype=np.uint8)
            combined = np.zeros(image.shape, dtype=np.uint8)
            for item in targets:
                predicted_path = model_outputs / f"{item['modelClass']}.nii.gz"
                if not predicted_path.is_file():
                    raise ExternalInferenceError(f"Expected mask output is missing for {item['id']}.")
                try:
                    predicted_image = nib.load(str(predicted_path))
                    # Validate the model's own grid before resampling; otherwise an
                    # unknown spatial unit or ambiguous transform could corrupt alignment.
                    validate_geometry(predicted_image, f"model prediction {item['id']}")
                    aligned_image = resample_from_to(predicted_image, target_grid, order=0)
                    mask = np.asarray(aligned_image.dataobj) > 0.5
                except Exception as exc:
                    raise ExternalInferenceError(f"Could not align mask for {item['id']}: {exc}") from exc
                if mask.shape != image.shape:
                    raise ExternalInferenceError(f"Aligned mask shape mismatch for {item['id']}.")
                mask_voxels = int(mask.sum())
                mask_file = f"{item['modelClass']}.nii.gz"
                nib.save(mask_image(mask, affine), str(stage / mask_file))
                mask_sha = sha256_file(stage / mask_file)
                occupancy += mask
                combined[mask] = item["labelId"]
                organ_records.append({
                    **item,
                    "maskVolumeFile": mask_file,
                    "sha256": mask_sha,
                    "voxelCount": mask_voxels,
                    "volumeMl": float(mask_voxels * np.prod(spacing) / 1000.0),
                    "predictionStatus": "nonempty" if mask_voxels > 0 else "empty-prediction",
                    "reviewStatus": "unreviewed-model-output",
                })
            overlap_voxels = int(np.count_nonzero(occupancy > 1))
            del occupancy
            combined_file = "major-organ-labelmap.nii.gz"
            nib.save(mask_image(combined, affine), str(stage / combined_file))
            combined_sha = sha256_file(stage / combined_file)
            unique_labels = set(np.unique(combined).tolist())
            if not unique_labels.issubset(set(range(len(targets) + 1))):
                raise ExternalInferenceError("Combined label map contains unexpected label IDs.")

            manifest = {
                "schemaVersion": 1,
                "status": "experimental-unreviewed",
                "caseId": str(case_id).strip(),
                "datasetId": str(dataset_id).strip(),
                "createdAtUTC": utc_now(),
                "sourceInputSha256": source_hash,
                "sourceDimensionsXYZ": [int(value) for value in image.shape],
                "coordinateSystem": "RAS",
                "niftiSpatialUnits": "mm",
                "affineRAS": [[float(value) for value in row] for row in affine],
                "spacingMm": list(spacing),
                "sourceIntensitySemantics": intensity_semantics,
                "preprocessing": {
                    "operation": "subtract-explicit-intensity-offset",
                    "offset": float(intensity_offset),
                    "notes": str(preprocessing_notes).strip(),
                    "statisticsAfterPreprocessing": input_statistics,
                },
                "model": {
                    "name": "TotalSegmentator",
                    "version": version,
                    "task": "total",
                    "device": "cpu",
                    "resolution": "fast/3mm" if resolution == "fast" else "full/1.5mm",
                    "requestedClasses": [item["modelClass"] for item in targets],
                },
                "organs": organ_records,
                "labelMap": {
                    "file": combined_file,
                    "sha256": combined_sha,
                    "format": f"NIfTI-1 uint8, 0=background, 1-{len(targets)}=selected structure labels",
                    "labels": [{k: v for k, v in item.items() if k in {"id", "labelId", "name"}} for item in targets],
                    "overlapVoxelCount": overlap_voxels,
                    "overlapPolicy": "Individual masks are authoritative; combined map applies declared target order on overlap.",
                },
                "interpretationLimits": [
                    "Model predictions are not anatomically reviewed or approved for teaching.",
                    "Intensity semantics and preprocessing are recorded from the operator declaration; this tool does not prove HU calibration.",
                    "A successful model run and a non-empty mask do not establish independent accuracy.",
                    "Use an independently licensed reference annotation and evaluate using scripts/evaluate_segmentor_predictions.py.",
                    "The input CT and reference masks are not copied into this output directory.",
                ],
            }
            manifest_path = stage / "manifest.json"
            manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            # Re-open staged NIfTIs to ensure the saved affine, dimensions, type, and units are sound.
            for item in targets:
                staged_img = nib.load(str(stage / f"{item['modelClass']}.nii.gz"))
                if staged_img.shape != image.shape or not np.allclose(staged_img.affine, affine, rtol=0, atol=1e-4):
                    raise ExternalInferenceError(f"Staged mask geometry validation failed for {item['id']}.")
                unit, _ = staged_img.header.get_xyzt_units()
                if unit != "mm" or staged_img.get_data_dtype() != np.dtype(np.uint8):
                    raise ExternalInferenceError(f"Staged mask metadata validation failed for {item['id']}.")
            publish_directory(stage, destination)
            return manifest
    finally:
        if stage.exists():
            shutil.rmtree(stage, ignore_errors=True)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="Source 3D CT NIfTI in a verified millimetre spatial grid.")
    parser.add_argument("--output-dir", type=Path, required=True, help="Directory to atomically replace with generated masks and manifest.")
    parser.add_argument("--case-id", required=True, help="Pseudonymous case identifier; do not use patient names or direct identifiers.")
    parser.add_argument("--dataset-id", required=True, help="Stable reference dataset identifier, including version.")
    parser.add_argument("--intensity-offset", type=float, required=True, help="Explicit offset subtracted from scaled NIfTI voxel values.")
    parser.add_argument(
        "--intensity-semantics",
        required=True,
        choices=["hounsfield-units-confirmed", "stored-values-unverified"],
        help="Operator declaration only; the script does not independently verify HU calibration.",
    )
    parser.add_argument("--preprocessing-notes", required=True, help="Record source scaling, any resampling, and why this offset is appropriate.")
    parser.add_argument(
        "--classes", nargs="+", dest="class_names", default=None,
        help=("Optional TotalSegmentator total-task classes. Accept upstream names (e.g. aorta, liver) or stable anatomy IDs "
              "(e.g. anatomy.aorta). Use the single value 'all' for all registry classes. Default: liver, spleen and both kidneys."),
    )
    parser.add_argument("--resolution", choices=["fast", "full"], default="fast")
    parser.add_argument("--timeout-seconds", type=int, default=5400)
    parser.add_argument("--executable", default="TotalSegmentator", help="Model executable path/name; version remains pinned.")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.timeout_seconds <= 0:
            raise ExternalInferenceError("--timeout-seconds must be positive.")
        report = run_external_inference(
            args.input, args.output_dir,
            case_id=args.case_id,
            dataset_id=args.dataset_id,
            intensity_offset=args.intensity_offset,
            intensity_semantics=args.intensity_semantics,
            preprocessing_notes=args.preprocessing_notes,
            class_names=args.class_names,
            resolution=args.resolution,
            timeout_seconds=args.timeout_seconds,
            executable=args.executable,
        )
    except ExternalInferenceError as exc:
        print(f"SEGMENTOR_EXTERNAL_INFERENCE_ERROR: {exc}", file=sys.stderr)
        return 2
    except subprocess.TimeoutExpired:
        print("SEGMENTOR_EXTERNAL_INFERENCE_ERROR: model inference timed out; existing output was preserved.", file=sys.stderr)
        return 3
    except subprocess.CalledProcessError as exc:
        print(f"SEGMENTOR_EXTERNAL_INFERENCE_ERROR: model inference failed with status {exc.returncode}; existing output was preserved.", file=sys.stderr)
        return 3
    except Exception as exc:
        print(f"SEGMENTOR_EXTERNAL_INFERENCE_UNEXPECTED_ERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    print(json.dumps({
        "caseId": report["caseId"],
        "datasetId": report["datasetId"],
        "maskCount": len(report["organs"]),
        "emptyPredictions": [item["id"] for item in report["organs"] if item["predictionStatus"] == "empty-prediction"],
        "overlapVoxelCount": report["labelMap"]["overlapVoxelCount"],
        "status": report["status"],
        "outputDirectory": str(args.output_dir),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
