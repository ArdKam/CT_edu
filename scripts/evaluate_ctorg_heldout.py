#!/usr/bin/env python3
"""Run an exploratory TotalSegmentator evaluation on the official CT-ORG test split.

CT-ORG volumes are in HU and reference labels use: 1=liver, 2=bladder,
3=lungs, 4=kidneys, 5=bone, 6=brain. This pipeline processes test cases 0-20
only, evaluates only classes present in each reference case, writes metrics
and provenance, and deletes per-case mask volumes after each case. It does
not publish CT scans or generated mask files.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path
from typing import Any

import nibabel as nib
import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import aggregate_segmentor_evaluations as aggregator
import evaluate_segmentor_predictions as evaluator
import infer_external_ct_volume as inference


CTORG_DATASET_ID = "CT-ORG-v1-TCIA-CC-BY-3.0"
CTORG_LICENSE = "Creative Commons Attribution 3.0 Unported (CC BY 3.0), subject to the TCIA Data Usage Policy"
CTORG_DATA_CITATION = (
    "Rister B, Shivakumar K, Nobashi T, Rubin DL. CT-ORG: A Dataset of CT Volumes "
    "With Multiple Organ Segmentations (Version 1). The Cancer Imaging Archive (2019). "
    "DOI: 10.7937/tcia.2019.tt7f4v7o."
)
TCIA_CITATION = (
    "Clark K, Vendt B, Smith K, Freymann J, Kirby J, Koppel P, Moore S, Phillips S, "
    "Maffitt D, Pringle M, Tarbox L, Prior F. The Cancer Imaging Archive (TCIA): "
    "Maintaining and Operating a Public Information Repository. Journal of Digital Imaging "
    "26(6), 1045-1057 (2013). DOI: 10.1007/s10278-013-9622-7."
)
OFFICIAL_TEST_CASES = set(range(21))
REFERENCE_LABEL_IDS = {"liver": 1, "bladder": 2, "lungs": 3, "kidneys": 4, "bones": 5, "brain": 6}
GROUP_NOTES = {
    "liver": "Exact named class mapping: TotalSegmentator liver class versus CT-ORG label 1.",
    "bladder": "Exact named class mapping: TotalSegmentator urinary_bladder class versus CT-ORG label 2.",
    "lungs": (
        "The prediction is the union of the five TotalSegmentator lung-lobe masks versus the single CT-ORG "
        "whole-lung label. This is a region-level ontology mapping, not a lobe-by-lobe evaluation."
    ),
    "kidneys": (
        "The prediction is the union of the left and right kidney masks versus the single CT-ORG kidney label; "
        "laterality is not evaluated by this grouped metric."
    ),
    "bones": (
        "The prediction is an approximate union of the 62 TotalSegmentator total-task skeletal classes "
        "(the costal-cartilage class is excluded) versus CT-ORG's broad bone label. The taxonomies are not "
        "equivalent: unmodeled bones may be absent from the prediction and cartilage is excluded."
    ),
    "brain": (
        "The brain class is evaluated only for cases where CT-ORG has a non-empty brain reference label. "
        "An empty brain label is treated as not annotated/not represented, not as evidence of absence."
    ),
}
PREPROCESSING_DESCRIPTION = (
    "CT-ORG source documentation states voxel intensities are Hounsfield units; subtractive offset=0; "
    "source native grid preserved; no automatic input resampling or orientation correction. Only cases "
    "0-20 from the official CT-ORG test split are processed. A group prediction is the Boolean union of "
    "the listed pinned TotalSegmentator 2.11.0 total-task masks."
)


class CTORGValidationError(ValueError):
    """Raised when the selected CT-ORG case subset or dataset does not meet preconditions."""


def validate_case_ids(case_ids: list[int] | tuple[int, ...]) -> list[int]:
    if not case_ids:
        raise CTORGValidationError("Select at least one official CT-ORG test case (0-20).")
    if any(isinstance(case_id, bool) or not isinstance(case_id, int) for case_id in case_ids):
        raise CTORGValidationError("Case IDs must be integer CT-ORG case numbers.")
    if len(case_ids) != len(set(case_ids)):
        raise CTORGValidationError("Duplicate CT-ORG case IDs are not allowed.")
    invalid = sorted(set(case_ids) - OFFICIAL_TEST_CASES)
    if invalid:
        raise CTORGValidationError(
            f"Only the official held-out CT-ORG test split (cases 0-20) is permitted; invalid IDs: {invalid}."
        )
    return sorted(case_ids)


def resolve_ctorg_groups() -> tuple[dict[str, dict[str, Any]], list[str]]:
    """Resolve CT-ORG broad labels to the pinned model class list without inventing classes."""
    registry = inference.available_total_class_targets()
    by_name = {item["modelClass"]: item for item in registry}

    required = {
        "liver": ["liver"],
        "bladder": ["urinary_bladder"],
        "lungs": [
            "lung_upper_lobe_left",
            "lung_lower_lobe_left",
            "lung_upper_lobe_right",
            "lung_middle_lobe_right",
            "lung_lower_lobe_right",
        ],
        "kidneys": ["kidney_left", "kidney_right"],
        "brain": ["brain"],
    }
    for group_id, class_names in required.items():
        missing = [name for name in class_names if name not in by_name]
        if missing:
            raise CTORGValidationError(f"Coverage registry is missing classes needed for CT-ORG {group_id}: {missing}.")

    bone_classes = [
        item["modelClass"]
        for item in registry
        if item.get("anatomicalGroup") == "skeletal-structure" and item["modelClass"] != "costal_cartilages"
    ]
    if not bone_classes:
        raise CTORGValidationError("Coverage registry has no skeletal classes for the CT-ORG bone comparison.")

    groups: dict[str, dict[str, Any]] = {
        "liver": {"name": "Liver", "referenceLabel": 1, "modelClasses": required["liver"], "ontologyNote": GROUP_NOTES["liver"]},
        "bladder": {"name": "Urinary bladder", "referenceLabel": 2, "modelClasses": required["bladder"], "ontologyNote": GROUP_NOTES["bladder"]},
        "lungs": {"name": "Lungs (lobe union)", "referenceLabel": 3, "modelClasses": required["lungs"], "ontologyNote": GROUP_NOTES["lungs"]},
        "kidneys": {"name": "Kidneys (left+right union)", "referenceLabel": 4, "modelClasses": required["kidneys"], "ontologyNote": GROUP_NOTES["kidneys"]},
        "bones": {"name": "Skeletal structures (approximate union)", "referenceLabel": 5, "modelClasses": bone_classes, "ontologyNote": GROUP_NOTES["bones"]},
        "brain": {"name": "Brain", "referenceLabel": 6, "modelClasses": required["brain"], "ontologyNote": GROUP_NOTES["brain"]},
    }
    all_names = [name for group in groups.values() for name in group["modelClasses"]]
    if len(all_names) != len(set(all_names)):
        raise CTORGValidationError("CT-ORG evaluation class groups contain duplicate model classes.")
    return groups, all_names


def _case_paths(dataset_dir: Path, case_number: int) -> tuple[Path, Path]:
    return dataset_dir / f"volume-{case_number}.nii.gz", dataset_dir / f"labels-{case_number}.nii.gz"


def _load_reference(path: Path) -> tuple[nib.spatialimages.SpatialImage, np.ndarray]:
    image, labels, _spacing = evaluator.load_label_volume(path, "CT-ORG reference label map")
    allowed = set(np.unique(labels).tolist())
    if not allowed.issubset({0, 1, 2, 3, 4, 5, 6}):
        raise CTORGValidationError(f"CT-ORG label map contains labels outside the documented 0-6 schema: {sorted(allowed)}.")
    return image, labels


def _write_class_map(path: Path, group_id: str, group: dict[str, Any]) -> None:
    document = {
        "schemaVersion": 1,
        "classes": [{
            "id": f"ctorg.{group_id}",
            "name": group["name"],
            "predictionLabel": 1,
            "referenceLabel": int(group["referenceLabel"]),
        }],
    }
    path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _write_report(path: Path, report: dict[str, Any]) -> None:
    evaluator.write_json_atomic(path, report)


def _safe_relative(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.name


def run_ctorg_heldout_evaluation(
    dataset_dir: Path,
    output_dir: Path,
    *,
    case_ids: list[int] | tuple[int, ...] = tuple(range(21)),
    resolution: str = "fast",
    timeout_seconds: int = 5400,
    executable: str = "TotalSegmentator",
) -> dict[str, Any]:
    dataset_dir = Path(dataset_dir)
    output_dir = Path(output_dir)
    selected_cases = validate_case_ids(list(case_ids))
    if resolution not in {"fast", "full"}:
        raise CTORGValidationError("Resolution must be either fast or full.")
    if isinstance(timeout_seconds, bool) or not isinstance(timeout_seconds, int) or timeout_seconds <= 0:
        raise CTORGValidationError("Timeout must be a positive integer number of seconds.")
    if not dataset_dir.is_dir():
        raise CTORGValidationError("CT-ORG dataset directory does not exist.")
    if output_dir.is_symlink() or (output_dir.exists() and not output_dir.is_dir()):
        raise CTORGValidationError("Refusing to replace a symlink or non-directory output path.")
    if output_dir.exists() and any(output_dir.iterdir()):
        raise CTORGValidationError("Output directory must be new or empty; use a unique run directory to protect prior reports.")
    output_dir.mkdir(parents=True, exist_ok=True)
    groups, all_model_classes = resolve_ctorg_groups()

    case_root = output_dir / "cases"
    cohort_root = output_dir / "cohort"
    case_root.mkdir()
    cohort_root.mkdir()
    group_report_paths: dict[str, list[Path]] = {group_id: [] for group_id in groups}
    case_records: list[dict[str, Any]] = []
    case_failures = 0

    for case_number in selected_cases:
        case_id = f"ctorg-test-{case_number:03d}"
        ct_path, reference_path = _case_paths(dataset_dir, case_number)
        case_record: dict[str, Any] = {
            "caseId": case_id,
            "officialTestSplitCaseNumber": case_number,
            "status": "failed",
            "evaluatedGroups": [],
            "skippedGroups": [],
            "groupFailures": [],
        }
        try:
            if not ct_path.is_file() or not reference_path.is_file():
                raise CTORGValidationError("Required CT or label-map file is missing for a selected test case.")
            ct_image, _source_values, _spacing = inference.load_source_volume(ct_path)
            reference_image, reference_labels = _load_reference(reference_path)
            evaluator.compare_geometry(ct_image, reference_image)
            if tuple(ct_image.shape) != tuple(reference_image.shape):
                raise CTORGValidationError("CT-ORG CT and label map have different dimensions.")

            active_groups: dict[str, dict[str, Any]] = {}
            reference_counts = {group_id: int(np.count_nonzero(reference_labels == group["referenceLabel"]))
                                for group_id, group in groups.items()}
            for group_id, group in groups.items():
                if reference_counts[group_id] == 0:
                    case_record["skippedGroups"].append({
                        "groupId": group_id,
                        "status": "skipped-reference-empty",
                        "note": "The dataset provides no voxels for this label in this case; it is not treated as a valid absent-structure negative.",
                    })
                else:
                    active_groups[group_id] = group
            if not active_groups:
                raise CTORGValidationError("Selected test case has no non-empty CT-ORG reference labels from the configured groups.")

            requested_classes = []
            seen_classes: set[str] = set()
            for group in active_groups.values():
                for model_class in group["modelClasses"]:
                    if model_class not in seen_classes:
                        seen_classes.add(model_class)
                        requested_classes.append(model_class)

            with tempfile.TemporaryDirectory(prefix="ctedu-ctorg-case-") as temp_name:
                temp_root = Path(temp_name)
                mask_dir = temp_root / "masks"
                inference_manifest = inference.run_external_inference(
                    ct_path,
                    mask_dir,
                    case_id=case_id,
                    dataset_id=CTORG_DATASET_ID,
                    intensity_offset=0,
                    intensity_semantics="hounsfield-units-confirmed",
                    preprocessing_notes=(
                        "CT-ORG's official data record states CT intensities are HU. Offset is 0; "
                        "no intensity conversion or spatial resampling is applied. The source CT and its paired "
                        "reference labels must have matching native-space geometry."
                    ),
                    task="total",
                    class_names=requested_classes,
                    resolution=resolution,
                    timeout_seconds=timeout_seconds,
                    executable=executable,
                )
                mask_paths = {
                    item["modelClass"]: mask_dir / item["maskVolumeFile"]
                    for item in inference_manifest["organs"]
                }
                for group_id, group in active_groups.items():
                    try:
                        grouped_mask = np.zeros(ct_image.shape, dtype=bool)
                        for model_class in group["modelClasses"]:
                            path = mask_paths.get(model_class)
                            if path is None or not path.is_file():
                                raise CTORGValidationError(f"Model output missing for a configured class in group {group_id}.")
                            mask_image = nib.load(str(path))
                            if mask_image.shape != ct_image.shape or not np.allclose(mask_image.affine, ct_image.affine, rtol=0.0, atol=1e-4):
                                raise CTORGValidationError(f"Model mask geometry mismatch in group {group_id}.")
                            grouped_mask |= np.asarray(mask_image.dataobj) > 0
                        prediction_path = temp_root / f"prediction-{group_id}.nii.gz"
                        nib.save(inference.mask_image(grouped_mask, np.asarray(ct_image.affine)), str(prediction_path))
                        class_map_path = temp_root / f"class-map-{group_id}.json"
                        _write_class_map(class_map_path, group_id, group)
                        model_id = (
                            f"TotalSegmentator {inference.REQUIRED_TOTAL_SEGMENTATOR_VERSION}; "
                            f"task=total; resolution={'fast/3mm' if resolution == 'fast' else 'full/1.5mm'}; "
                            f"CT-ORG grouped class={group_id}; selected={len(group['modelClasses'])} model classes"
                        )
                        report = evaluator.evaluate_case(
                            prediction_path,
                            reference_path,
                            class_map_path,
                            case_id=case_id,
                            reference_dataset_id=CTORG_DATASET_ID,
                            reference_type="independent-dataset",
                            model_id=model_id,
                            preprocessing_description=PREPROCESSING_DESCRIPTION,
                        )
                        report["datasetContext"] = {
                            "datasetId": CTORG_DATASET_ID,
                            "sourceCitation": CTORG_DATA_CITATION,
                            "archiveCitation": TCIA_CITATION,
                            "license": CTORG_LICENSE,
                            "officialSplit": "test",
                            "caseNumber": case_number,
                            "referenceLabelId": int(group["referenceLabel"]),
                            "groupOntologyNote": group["ontologyNote"],
                            "sourceInputIntensity": "HU stated by TCIA; zero offset applied.",
                        }
                        report["interpretationLimits"].append(
                            "This is an exploratory external-dataset comparison; it is not clinical validation, an expert approval, or approval for educational publication."
                        )
                        report_path = case_root / case_id / f"{group_id}.json"
                        _write_report(report_path, report)
                        group_report_paths[group_id].append(report_path)
                        case_record["evaluatedGroups"].append({
                            "groupId": group_id,
                            "status": "evaluated",
                            "report": _safe_relative(report_path, output_dir),
                            "referenceVoxelCount": reference_counts[group_id],
                            "predictionVoxelCount": int(np.count_nonzero(grouped_mask)),
                        })
                    except Exception as exc:
                        case_record["groupFailures"].append({
                            "groupId": group_id,
                            "errorType": type(exc).__name__,
                        })
            if case_record["groupFailures"]:
                case_record["status"] = "partial"
                case_failures += 1
            elif case_record["evaluatedGroups"]:
                case_record["status"] = "completed"
            else:
                case_record["status"] = "failed"
                case_failures += 1
        except Exception as exc:
            case_record["status"] = "failed"
            case_record["errorType"] = type(exc).__name__
            case_failures += 1
        case_records.append(case_record)

    group_summaries: dict[str, dict[str, Any]] = {}
    for group_id, group in groups.items():
        report_paths = group_report_paths[group_id]
        if len(report_paths) < 2:
            group_summaries[group_id] = {
                "status": "insufficient-independent-cases",
                "evaluatedCaseCount": len(report_paths),
                "requiredMinimum": 2,
                "ontologyNote": group["ontologyNote"],
            }
            continue
        summary = aggregator.aggregate_reports(report_paths)
        summary["datasetContext"] = {
            "datasetId": CTORG_DATASET_ID,
            "sourceCitation": CTORG_DATA_CITATION,
            "archiveCitation": TCIA_CITATION,
            "license": CTORG_LICENSE,
            "officialSplit": "test cases 0-20 only",
            "groupId": group_id,
            "groupName": group["name"],
            "groupOntologyNote": group["ontologyNote"],
        }
        summary["educationalApprovalStatus"] = "not-approved"
        summary["interpretationLimits"].append(
            "The cohort is the official CT-ORG test split, but source-label quality and representativeness are not independently re-certified by this pipeline."
        )
        summary_path = cohort_root / f"{group_id}.json"
        evaluator.write_json_atomic(summary_path, summary)
        group_summaries[group_id] = {
            "status": "aggregated",
            "evaluatedCaseCount": len(report_paths),
            "summaryReport": _safe_relative(summary_path, output_dir),
            "metrics": summary["perClass"][0] if summary.get("perClass") else {},
            "ontologyNote": group["ontologyNote"],
        }

    completed = sum(item["status"] in {"completed", "partial"} for item in case_records)
    index = {
        "schemaVersion": 1,
        "status": "completed-with-case-failures" if case_failures else "completed",
        "createdAtUTC": evaluator.utc_now(),
        "dataset": {
            "id": CTORG_DATASET_ID,
            "name": "CT-ORG",
            "officialTestSplit": "case numbers 0-20",
            "license": CTORG_LICENSE,
            "sourceCitation": CTORG_DATA_CITATION,
            "archiveCitation": TCIA_CITATION,
            "sourceUrl": "https://www.cancerimagingarchive.net/collection/ct-org/",
        },
        "model": {
            "name": "TotalSegmentator",
            "version": inference.REQUIRED_TOTAL_SEGMENTATOR_VERSION,
            "task": "total",
            "resolution": "fast/3mm" if resolution == "fast" else "full/1.5mm",
            "selectedClassCountMaximum": len(all_model_classes),
            "device": "cpu",
        },
        "caseNumbersRequested": selected_cases,
        "caseCountRequested": len(selected_cases),
        "caseCountProcessed": completed,
        "caseCountFailedOrPartial": case_failures,
        "cases": case_records,
        "groups": group_summaries,
        "outputs": {
            "caseReportsDirectory": "cases/",
            "cohortReportsDirectory": "cohort/",
            "predictionMasksPersisted": False,
            "sourceScansPersisted": False,
        },
        "limitations": [
            "No vessel reference labels exist in CT-ORG's six-class label map; this experiment does not validate vessel segmentation.",
            "Brain and bladder are evaluated only when their reference labels are non-empty. Empty reference labels are skipped rather than treated as a true negative.",
            "The CT-ORG bone label is one broad region. The comparison uses a union of 62 available skeletal classes and is approximate, not a one-to-one class ontology.",
            "Lung lobes are unioned to compare against the single CT-ORG lung label; kidney laterality is also unioned.",
            "Dataset citation and the CC BY 3.0 / TCIA Data Usage Policy must be preserved if results are redistributed.",
            "Metrics measure overlap with dataset reference annotations; they do not certify clinical accuracy or qualify anatomy for educational use.",
        ],
        "independentEvaluationStatus": "exploratory-external-test-split",
        "anatomicalReviewStatus": "not-reviewed",
        "educationalApprovalStatus": "not-approved",
        "publicReleaseGate": "unchanged-and-closed-unless-explicitly-approved",
    }
    evaluator.write_json_atomic(output_dir / "index.json", index)
    return index


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset-dir", type=Path, required=True, help="Directory containing CT-ORG volume-0.nii.gz and labels-0.nii.gz files.")
    parser.add_argument("--output-dir", type=Path, required=True, help="New or empty directory; reports only are retained.")
    parser.add_argument("--cases", type=int, nargs="+", default=list(range(21)), help="Official CT-ORG test case numbers, 0-20 only.")
    parser.add_argument("--resolution", choices=["fast", "full"], default="fast")
    parser.add_argument("--timeout-seconds", type=int, default=5400)
    parser.add_argument("--executable", default="TotalSegmentator")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        report = run_ctorg_heldout_evaluation(
            args.dataset_dir,
            args.output_dir,
            case_ids=args.cases,
            resolution=args.resolution,
            timeout_seconds=args.timeout_seconds,
            executable=args.executable,
        )
    except CTORGValidationError as exc:
        print(f"SEGMENTOR_CTORG_VALIDATION_INPUT_ERROR: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"SEGMENTOR_CTORG_VALIDATION_UNEXPECTED_ERROR: {type(exc).__name__}", file=sys.stderr)
        return 1
    print(json.dumps({
        "report": str(args.output_dir / "index.json"),
        "status": report["status"],
        "caseCountRequested": report["caseCountRequested"],
        "caseCountProcessed": report["caseCountProcessed"],
        "caseCountFailedOrPartial": report["caseCountFailedOrPartial"],
        "evaluatedGroups": [key for key, item in report["groups"].items() if item["status"] == "aggregated"],
        "vesselEvaluationIncluded": False,
    }, ensure_ascii=False))
    return 1 if report["caseCountFailedOrPartial"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
