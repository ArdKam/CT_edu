#!/usr/bin/env python3
"""Evaluate discrete 3D segmentation masks against a geometry-matched reference.

This utility calculates technical overlap and voxel-sampled surface-distance
metrics. It does not assess clinical correctness, dataset rights, or reviewer
qualification. See docs/SEGMENTOR_INDEPENDENT_VALIDATION.md.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import nibabel as nib
import numpy as np
from scipy.ndimage import binary_erosion, distance_transform_edt, generate_binary_structure

EVALUATOR_VERSION = "1.0.0"
INDEPENDENT_REFERENCE_TYPES = {"independent-expert", "independent-dataset"}
AFFINE_ATOL_MM = 1e-4


class EvaluationInputError(ValueError):
    """Raised when an input cannot support a trustworthy voxelwise comparison."""


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _validate_affine(affine: np.ndarray, label: str) -> tuple[float, float, float]:
    affine = np.asarray(affine, dtype=np.float64)
    if affine.shape != (4, 4) or not np.isfinite(affine).all():
        raise EvaluationInputError(f"{label} has a malformed or non-finite 4x4 affine.")
    directions = affine[:3, :3]
    determinant = float(np.linalg.det(directions))
    if abs(determinant) < 1e-10:
        raise EvaluationInputError(f"{label} has a singular spatial affine.")
    spacing = np.linalg.norm(directions, axis=0)
    if np.any(~np.isfinite(spacing)) or np.any(spacing <= 0):
        raise EvaluationInputError(f"{label} has invalid voxel spacing.")
    normalized = directions / spacing[np.newaxis, :]
    gram = normalized.T @ normalized
    if not np.allclose(gram, np.eye(3), rtol=0.0, atol=1e-4):
        raise EvaluationInputError(
            f"{label} contains non-orthogonal/sheared voxel axes; resample explicitly "
            "to a documented orthogonal grid before evaluating surface distances."
        )
    return tuple(float(value) for value in spacing)


def load_label_volume(path: Path, label: str) -> tuple[nib.spatialimages.SpatialImage, np.ndarray, tuple[float, float, float]]:
    path = Path(path)
    if not path.is_file():
        raise EvaluationInputError(f"{label} file does not exist: {path}")
    try:
        image = nib.load(str(path))
    except Exception as exc:
        raise EvaluationInputError(f"Could not read {label} NIfTI volume: {exc}") from exc
    if len(image.shape) != 3 or any(int(size) <= 0 for size in image.shape):
        raise EvaluationInputError(f"{label} must be a non-empty 3D NIfTI volume; got shape {image.shape}.")
    spatial_unit, _ = image.header.get_xyzt_units()
    if spatial_unit != "mm":
        raise EvaluationInputError(
            f"{label} declares spatial units {spatial_unit!r}, not millimetres. "
            "Confirm the source geometry and explicitly set verified NIfTI spatial units to mm before evaluation."
        )
    spacing = _validate_affine(image.affine, label)
    try:
        raw = np.asanyarray(image.dataobj)
        numeric = np.asarray(raw, dtype=np.float64)
    except Exception as exc:
        raise EvaluationInputError(f"{label} data could not be read as numeric voxel labels: {exc}") from exc
    if not np.isfinite(numeric).all():
        raise EvaluationInputError(f"{label} contains NaN or infinite voxel values.")
    rounded = np.rint(numeric)
    if not np.all(np.abs(numeric - rounded) <= 1e-4):
        raise EvaluationInputError(
            f"{label} contains non-integer values. Supply a discrete label map or binary mask, "
            "not a probability/logit map."
        )
    if rounded.min(initial=0) < 0 or rounded.max(initial=0) > np.iinfo(np.int32).max:
        raise EvaluationInputError(f"{label} contains labels outside the supported non-negative int32 range.")
    return image, rounded.astype(np.int32, copy=False), spacing


def load_class_map(path: Path) -> list[dict[str, Any]]:
    try:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as exc:
        raise EvaluationInputError(f"Could not read class-map JSON: {exc}") from exc
    if not isinstance(raw, dict) or raw.get("schemaVersion") != 1 or not isinstance(raw.get("classes"), list):
        raise EvaluationInputError("Class map must be JSON with schemaVersion=1 and a classes array.")
    if not raw["classes"]:
        raise EvaluationInputError("Class map must include at least one structure.")
    classes: list[dict[str, Any]] = []
    ids: set[str] = set()
    pred_labels: set[int] = set()
    ref_labels: set[int] = set()
    for index, item in enumerate(raw["classes"]):
        if not isinstance(item, dict):
            raise EvaluationInputError(f"Class map entry {index} must be an object.")
        stable_id = item.get("id")
        name = item.get("name")
        pred = item.get("predictionLabel")
        ref = item.get("referenceLabel")
        if not isinstance(stable_id, str) or not stable_id.strip():
            raise EvaluationInputError(f"Class map entry {index} needs a non-empty stable id.")
        if stable_id in ids:
            raise EvaluationInputError(f"Duplicate class-map id: {stable_id}")
        if not isinstance(name, str) or not name.strip():
            raise EvaluationInputError(f"Class map entry {stable_id} needs a display name.")
        for key, value in (("predictionLabel", pred), ("referenceLabel", ref)):
            if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
                raise EvaluationInputError(
                    f"Class map entry {stable_id} needs a positive integer {key}; zero is background."
                )
        if pred in pred_labels:
            raise EvaluationInputError(f"Duplicate predictionLabel mapping: {pred}")
        if ref in ref_labels:
            raise EvaluationInputError(f"Duplicate referenceLabel mapping: {ref}")
        ids.add(stable_id)
        pred_labels.add(pred)
        ref_labels.add(ref)
        classes.append({
            "id": stable_id.strip(),
            "name": name.strip(),
            "predictionLabel": pred,
            "referenceLabel": ref,
        })
    return classes


def _ratio(numerator: int, denominator: int) -> float | None:
    return float(numerator / denominator) if denominator else None


def _surface_distances(
    prediction: np.ndarray,
    reference: np.ndarray,
    spacing_mm: tuple[float, float, float],
) -> dict[str, float]:
    structure = generate_binary_structure(3, 1)
    pred_surface = prediction & ~binary_erosion(prediction, structure=structure, border_value=0)
    ref_surface = reference & ~binary_erosion(reference, structure=structure, border_value=0)
    if not pred_surface.any() or not ref_surface.any():
        raise EvaluationInputError("Surface distance requested for an empty mask.")
    distance_to_ref = distance_transform_edt(~ref_surface, sampling=spacing_mm)
    distance_to_pred = distance_transform_edt(~pred_surface, sampling=spacing_mm)
    pred_to_ref = distance_to_ref[pred_surface]
    ref_to_pred = distance_to_pred[ref_surface]
    directed_p95 = float(np.percentile(pred_to_ref, 95))
    reverse_p95 = float(np.percentile(ref_to_pred, 95))
    return {
        "predictionToReferenceMeanMm": float(np.mean(pred_to_ref)),
        "referenceToPredictionMeanMm": float(np.mean(ref_to_pred)),
        "averageSymmetricSurfaceDistanceMm": float((np.mean(pred_to_ref) + np.mean(ref_to_pred)) / 2),
        "predictionToReferenceP95Mm": directed_p95,
        "referenceToPredictionP95Mm": reverse_p95,
        "hausdorff95Mm": float(max(directed_p95, reverse_p95)),
        "maximumSurfaceDistanceMm": float(max(np.max(pred_to_ref), np.max(ref_to_pred))),
        "surfaceVoxelCountPrediction": int(pred_surface.sum()),
        "surfaceVoxelCountReference": int(ref_surface.sum()),
        "method": "3D binary boundary voxels; Euclidean distances in mm using affine-derived orthogonal voxel spacing; unweighted boundary-voxel samples",
    }


def calculate_class_metrics(
    prediction_volume: np.ndarray,
    reference_volume: np.ndarray,
    prediction_label: int,
    reference_label: int,
    spacing_mm: tuple[float, float, float],
) -> dict[str, Any]:
    prediction = prediction_volume == prediction_label
    reference = reference_volume == reference_label
    tp = int(np.count_nonzero(prediction & reference))
    fp = int(np.count_nonzero(prediction & ~reference))
    fn = int(np.count_nonzero(~prediction & reference))
    total = int(prediction.size)
    tn = total - tp - fp - fn
    pred_count = tp + fp
    ref_count = tp + fn
    union = tp + fp + fn
    dice_denominator = 2 * tp + fp + fn
    if ref_count == 0 and pred_count == 0:
        status = "both-empty"
    elif ref_count == 0:
        status = "reference-empty"
    elif pred_count == 0:
        status = "empty-prediction"
    else:
        status = "evaluated"

    voxel_volume_mm3 = float(np.prod(spacing_mm))
    metrics: dict[str, Any] = {
        "status": status,
        "referencePresent": ref_count > 0,
        "eligibleForDiceSummary": ref_count > 0,
        "emptyPredictionFailure": ref_count > 0 and pred_count == 0,
        "predictionVoxelCount": pred_count,
        "referenceVoxelCount": ref_count,
        "truePositiveVoxelCount": tp,
        "falsePositiveVoxelCount": fp,
        "falseNegativeVoxelCount": fn,
        "trueNegativeVoxelCount": tn,
        "predictionVolumeMl": float(pred_count * voxel_volume_mm3 / 1000),
        "referenceVolumeMl": float(ref_count * voxel_volume_mm3 / 1000),
        "volumeDifferenceMl": float((pred_count - ref_count) * voxel_volume_mm3 / 1000),
        "relativeVolumeError": float((pred_count - ref_count) / ref_count) if ref_count else None,
        "dice": _ratio(2 * tp, dice_denominator),
        "iou": _ratio(tp, union),
        "sensitivity": _ratio(tp, ref_count),
        "precision": _ratio(tp, pred_count),
        "specificity": _ratio(tn, tn + fp),
        "surfaceDistances": None,
    }
    if pred_count > 0 and ref_count > 0:
        metrics["surfaceDistances"] = _surface_distances(prediction, reference, spacing_mm)
    return metrics


def compare_geometry(
    prediction_image: nib.spatialimages.SpatialImage,
    reference_image: nib.spatialimages.SpatialImage,
    affine_tolerance_mm: float = AFFINE_ATOL_MM,
) -> None:
    if prediction_image.shape != reference_image.shape:
        raise EvaluationInputError(
            f"Geometry mismatch: prediction shape {prediction_image.shape} != reference shape {reference_image.shape}. "
            "Automatic resizing/resampling is intentionally disabled."
        )
    if not np.allclose(prediction_image.affine, reference_image.affine, rtol=0.0, atol=affine_tolerance_mm):
        delta = float(np.max(np.abs(prediction_image.affine - reference_image.affine)))
        raise EvaluationInputError(
            f"Geometry mismatch: prediction and reference affines differ (max absolute element delta {delta:.6g}). "
            "Register/resample explicitly using a documented method, then evaluate the resulting files."
        )


def evaluate_case(
    prediction_path: Path,
    reference_path: Path,
    class_map_path: Path,
    *,
    case_id: str,
    reference_dataset_id: str,
    reference_type: str,
    model_id: str,
    preprocessing_description: str,
    affine_tolerance_mm: float = AFFINE_ATOL_MM,
) -> dict[str, Any]:
    if not case_id.strip() or not reference_dataset_id.strip() or not model_id.strip():
        raise EvaluationInputError("case id, reference dataset id and model id must be non-empty.")
    if not preprocessing_description.strip():
        raise EvaluationInputError("Provide an explicit preprocessing description; do not leave calibration assumptions implicit.")
    allowed_types = INDEPENDENT_REFERENCE_TYPES | {"same-source-atlas", "synthetic-test"}
    if reference_type not in allowed_types:
        raise EvaluationInputError(f"Unknown reference type {reference_type!r}; expected one of {sorted(allowed_types)}.")
    prediction_path = Path(prediction_path)
    reference_path = Path(reference_path)
    prediction_image, prediction_volume, spacing = load_label_volume(prediction_path, "prediction")
    reference_image, reference_volume, reference_spacing = load_label_volume(reference_path, "reference")
    compare_geometry(prediction_image, reference_image, affine_tolerance_mm)
    if not np.allclose(spacing, reference_spacing, rtol=0.0, atol=1e-5):
        raise EvaluationInputError("Prediction and reference voxel spacings differ.")
    classes = load_class_map(class_map_path)
    results = []
    findings = []
    for item in classes:
        metric = calculate_class_metrics(
            prediction_volume,
            reference_volume,
            item["predictionLabel"],
            item["referenceLabel"],
            spacing,
        )
        results.append({**item, **metric})
        if metric["emptyPredictionFailure"]:
            findings.append(f"{item['id']}: prediction is empty while the reference contains voxels")
        if metric["status"] == "reference-empty" and metric["predictionVoxelCount"] > 0:
            findings.append(f"{item['id']}: reference is empty but prediction contains voxels")
    independent_eligible = reference_type in INDEPENDENT_REFERENCE_TYPES
    config = {
        "modelId": model_id.strip(),
        "preprocessingDescription": preprocessing_description.strip(),
        "referenceDatasetId": reference_dataset_id.strip(),
        "classMap": classes,
    }
    canonical_config = json.dumps(config, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return {
        "schemaVersion": 1,
        "evaluator": {"name": "CT Edu independent segmentation evaluator", "version": EVALUATOR_VERSION},
        "createdAtUTC": utc_now(),
        "caseId": case_id.strip(),
        "configuration": config,
        "referenceType": reference_type,
        "independentComparisonEligible": independent_eligible,
        "configurationSha256": hashlib.sha256(canonical_config.encode("utf-8")).hexdigest(),
        # Do not persist source filenames: they can contain patient identifiers.
        "inputs": {
            "prediction": {"sha256": sha256_file(prediction_path)},
            "reference": {"sha256": sha256_file(reference_path)},
        },
        "geometry": {
            "dimensionsXYZ": [int(v) for v in prediction_image.shape],
            "affineRAS": [[float(v) for v in row] for row in np.asarray(prediction_image.affine)],
            "spacingMmXYZ": list(spacing),
            "voxelVolumeMm3": float(np.prod(spacing)),
            "automaticResampling": False,
        },
        "results": results,
        "qualityFindings": findings,
        "interpretationLimits": [
            "Metrics measure agreement with the supplied reference; they do not independently certify the reference labels.",
            "Independent-comparison eligibility is based on the user-declared reference type and is not a verification of dataset independence, licensing, annotation quality, or reviewer qualifications.",
            "Same-source-atlas and synthetic-test reports must not be described as independent validation.",
            "A successful report is not clinical validation, diagnostic approval, or approval for educational publication.",
            "Surface distances use unweighted boundary-voxel samples on an orthogonal grid; the method is reported with each class result.",
        ],
        "educationalApprovalStatus": "not-approved",
    }


def write_json_atomic(path: Path, value: dict[str, Any]) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prediction", type=Path, required=True, help="Discrete 3D NIfTI prediction label map or binary mask.")
    parser.add_argument("--reference", type=Path, required=True, help="Discrete 3D NIfTI reference label map or binary mask.")
    parser.add_argument("--class-map", type=Path, required=True, help="Version-1 JSON mapping prediction and reference class IDs.")
    parser.add_argument("--case-id", required=True, help="Pseudonymous case identifier; do not use patient names or direct identifiers.")
    parser.add_argument("--reference-dataset-id", required=True, help="Stable identifier for the reference dataset.")
    parser.add_argument("--reference-type", required=True, choices=sorted(INDEPENDENT_REFERENCE_TYPES | {"same-source-atlas", "synthetic-test"}))
    parser.add_argument("--model-id", required=True, help="Exact model/task/version identity.")
    parser.add_argument("--preprocessing-description", required=True, help="Explicit intensity, orientation and resampling preprocessing description.")
    parser.add_argument("--output", type=Path, required=True, help="JSON report output path.")
    parser.add_argument("--affine-tolerance-mm", type=float, default=AFFINE_ATOL_MM, help="Absolute affine-element tolerance; default 1e-4.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not np.isfinite(args.affine_tolerance_mm) or args.affine_tolerance_mm <= 0:
        parser.error("--affine-tolerance-mm must be a finite positive number.")
    try:
        report = evaluate_case(
            args.prediction,
            args.reference,
            args.class_map,
            case_id=args.case_id,
            reference_dataset_id=args.reference_dataset_id,
            reference_type=args.reference_type,
            model_id=args.model_id,
            preprocessing_description=args.preprocessing_description,
            affine_tolerance_mm=args.affine_tolerance_mm,
        )
        write_json_atomic(args.output, report)
    except EvaluationInputError as exc:
        print(f"SEGMENTOR_EVALUATION_INPUT_ERROR: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"SEGMENTOR_EVALUATION_UNEXPECTED_ERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    print(json.dumps({
        "report": str(args.output),
        "caseId": report["caseId"],
        "referenceType": report["referenceType"],
        "independentComparisonEligible": report["independentComparisonEligible"],
        "classes": len(report["results"]),
        "qualityFindings": len(report["qualityFindings"]),
        "automaticResampling": False,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
