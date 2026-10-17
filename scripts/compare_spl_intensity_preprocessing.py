#!/usr/bin/env python3
"""Compare explicitly labelled SPL CT intensity-offset hypotheses on hosted compute.

This is a same-volume preprocessing experiment, not a calibration detector. It does
not select a winning offset and must not be used as independent accuracy evidence.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import traceback
import zipfile
from datetime import datetime, timezone
from importlib.metadata import version as installed_package_version
from pathlib import Path
from xml.etree import ElementTree

import nibabel as nib
import numpy as np
from nibabel.affines import voxel_sizes
from nibabel.processing import resample_from_to

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_demo_assets import read_nrrd
from generate_major_organ_masks import (
    TARGETS,
    dice_score,
    geometry_affine_ras,
    get_source_structure_ids,
    read_source_members,
)
from intensity_experiment_utils import classify_run_status, parse_candidate_offsets

ARCHIVE_GLOB = "abacktools-abdomen-2016-09-part*-of6.zip"
CALIBRATION_FIELD_NAMES = (
    "modality", "units", "space units", "slope", "intercept", "rescale slope",
    "rescale intercept", "measurement frame", "calibration", "intensity units",
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def intensity_stats(values: np.ndarray) -> dict:
    numeric = np.asarray(values, dtype=np.float32)
    quantiles = np.percentile(numeric, [0.1, 1, 5, 50, 95, 99, 99.9])
    return {
        "minimum": float(np.min(numeric)),
        "maximum": float(np.max(numeric)),
        "mean": float(np.mean(numeric, dtype=np.float64)),
        "standardDeviation": float(np.std(numeric, dtype=np.float64)),
        "percentiles": {
            key: float(value) for key, value in zip(
                ("p0_1", "p1", "p5", "p50", "p95", "p99", "p99_9"), quantiles
            )
        },
    }


def read_scene_evidence() -> dict:
    """Read display/window settings from the packaged MRML scene, never infer HU from them."""
    evidence = {"sceneFiles": [], "volumeNodes": [], "displayNodes": []}
    for archive_path in sorted(Path(".").glob(ARCHIVE_GLOB)):
        with zipfile.ZipFile(archive_path) as archive:
            for info in archive.infolist():
                if info.is_dir() or not info.filename.lower().endswith(".mrml"):
                    continue
                raw = archive.read(info.filename)
                scene_record = {
                    "archive": archive_path.name,
                    "member": info.filename,
                    "sha256": sha256_bytes(raw),
                }
                evidence["sceneFiles"].append(scene_record)
                try:
                    root = ElementTree.fromstring(raw)
                except ElementTree.ParseError as exc:
                    scene_record["parseError"] = str(exc)
                    continue
                for node in root.iter():
                    tag = str(node.tag).rsplit("}", 1)[-1]
                    attrs = {str(k).lower(): str(v) for k, v in node.attrib.items()}
                    name = attrs.get("name", "")
                    node_record = {
                        "tag": tag,
                        "id": attrs.get("id"),
                        "name": name or None,
                    }
                    if any(key in attrs for key in ("window", "level", "autowindowlevel")) or "display" in tag.lower():
                        for key in ("window", "level", "autowindowlevel", "fileName".lower(),
                                    "displayableNodeRef".lower(), "id"):
                            if key in attrs:
                                node_record[key] = attrs[key]
                        if "window" in attrs or "level" in attrs:
                            evidence["displayNodes"].append(node_record)
                    if "volume" in tag.lower() and ("scalar" in tag.lower() or "labelmap" in tag.lower()):
                        for key in ("filename", "storagenoderef", "displaynoderef", "id"):
                            if key in attrs:
                                node_record[key] = attrs[key]
                        evidence["volumeNodes"].append(node_record)
    return evidence


def header_calibration_audit(header: dict[str, str]) -> dict:
    normalized = {str(k).strip().lower(): str(v).strip() for k, v in header.items()}
    explicit = {
        key: normalized[key] for key in CALIBRATION_FIELD_NAMES if key in normalized
    }
    custom_matches = {
        key: value for key, value in normalized.items()
        if re.search(r"hu|calibrat|rescale|intercept|slope|intensity.?unit|modality", key, re.I)
    }
    return {
        "allHeaderKeys": sorted(normalized),
        "explicitCalibrationFieldsPresent": explicit,
        "headerKeysSuggestingCalibrationOrModality": custom_matches,
        "calibrationFieldsAbsentFromHeader": [
            key for key in ("modality", "space units", "units", "slope", "intercept",
                            "rescale slope", "rescale intercept", "measurement frame")
            if key not in normalized
        ],
        "interpretation": (
            "The inspected NRRD header has no explicit HU unit or rescale/intercept field. "
            "Header-field absence does not prove a calibration is impossible, but this file "
            "alone does not establish a conversion to HU."
        ),
    }


def write_report(path: Path, report: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def run_candidate(
    candidate_index: int,
    offset: float,
    source_ct: np.ndarray,
    source_labels: np.ndarray,
    reference_ids: dict[str, int],
    affine: np.ndarray,
    temp_root: Path,
    log_root: Path,
    timeout_seconds: int,
) -> tuple[dict, dict[str, np.ndarray]]:
    candidate_id = f"candidate_{candidate_index:02d}"
    run_started = utc_now()
    clock_started = time.perf_counter()
    record = {
        "candidateId": candidate_id,
        "operation": "subtract-stored-value-offset",
        "offset": offset,
        "status": "running",
        "modelExecutionStatus": "running",
        "outputIntegrityStatus": "unknown",
        "segmentationQualityStatus": "unknown",
        "startedAtUtc": run_started,
        "classes": [],
        "errors": [],
        "qualityWarnings": [],
    }
    masks: dict[str, np.ndarray] = {}
    log_path = log_root / f"{candidate_id}.log"
    with tempfile.TemporaryDirectory(prefix=f"ctedu-{candidate_id}-", dir=temp_root) as temp_name:
        temp_dir = Path(temp_name)
        model_dir = temp_dir / "totalsegmentator"
        model_dir.mkdir()
        input_path = temp_dir / "input.nii.gz"
        model_values = np.transpose(source_ct.astype(np.float32) - offset, (2, 1, 0))
        if not np.isfinite(model_values).all():
            raise ValueError(f"{candidate_id}: preprocessed volume contains non-finite values.")
        image = nib.Nifti1Image(model_values, affine)
        image.set_qform(affine, code=1)
        image.set_sform(affine, code=1)
        image.header.set_xyzt_units("mm")
        image.header.set_data_dtype(np.float32)
        nib.save(image, str(input_path))
        model_input_hash = sha256_bytes(np.asarray(model_values, dtype="<f4").tobytes(order="C"))
        record["input"] = {
            "arraySha256Float32LittleEndianCOrder": model_input_hash,
            "shapeXYZ": [int(v) for v in model_values.shape],
            "affineRAS": [[float(v) for v in row] for row in affine],
            "spacingMm": [float(v) for v in voxel_sizes(affine)],
            "intensityStatisticsAfterOffset": intensity_stats(model_values),
        }
        command = [
            "TotalSegmentator", "-i", str(input_path), "-o", str(model_dir),
            "--task", "total", "--device", "cpu", "--fast",
            "--nr_thr_resamp", "1", "--nr_thr_saving", "1",
            "--roi_subset", "liver", "spleen", "kidney_left", "kidney_right",
        ]
        if not shutil_which_totalsegmentator():
            raise RuntimeError("TotalSegmentator executable was not found after dependency installation.")
        record["commandSummary"] = {
            "executable": "TotalSegmentator",
            "task": "total",
            "device": "cpu",
            "resolution": "fast/3mm",
            "requestedClasses": [item["model_name"] for item in TARGETS],
            "timeoutSeconds": timeout_seconds,
            "logFile": str(log_path.relative_to(log_root.parent)),
        }
        env = os.environ.copy()
        env["OMP_NUM_THREADS"] = "2"
        env["ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS"] = "2"
        try:
            with log_path.open("w", encoding="utf-8") as log:
                log.write("COMMAND: " + " ".join(command) + "\n")
                log.write(f"CANDIDATE_OFFSET={offset}\n")
                log.flush()
                subprocess.run(command, check=True, timeout=timeout_seconds, stdout=log,
                               stderr=subprocess.STDOUT, env=env)
        except subprocess.TimeoutExpired:
            record["status"] = "failed"
            record["modelExecutionStatus"] = "failed"
            record["outputIntegrityStatus"] = "failed"
            record["segmentationQualityStatus"] = "failed"
            record["errors"].append(f"Model inference exceeded timeout of {timeout_seconds} seconds.")
            record["completedAtUtc"] = utc_now()
            record["durationSeconds"] = round(time.perf_counter() - clock_started, 3)
            return record, masks
        except subprocess.CalledProcessError as exc:
            record["status"] = "failed"
            record["modelExecutionStatus"] = "failed"
            record["outputIntegrityStatus"] = "failed"
            record["segmentationQualityStatus"] = "failed"
            record["errors"].append(f"TotalSegmentator exited with return code {exc.returncode}; see log.")
            record["completedAtUtc"] = utc_now()
            record["durationSeconds"] = round(time.perf_counter() - clock_started, 3)
            return record, masks

        record["modelExecutionStatus"] = "success"
        target = (image.shape, image.affine)
        per_class_statuses = []
        for item in TARGETS:
            predicted_path = model_dir / (item["model_name"] + ".nii.gz")
            class_record = {
                "id": item["key"],
                "modelClass": item["model_name"],
                "referenceLabelId": reference_ids[item["key"]],
            }
            if not predicted_path.is_file():
                class_record.update({"status": "missing-output", "predictedVoxelCount": None,
                                     "diceAgainstBundledAtlasLabel": None})
                per_class_statuses.append("missing-output")
                record["errors"].append(f"Missing model output for {item['model_name']}.")
                record["classes"].append(class_record)
                continue
            pred_image = nib.load(str(predicted_path))
            aligned = resample_from_to(pred_image, target, order=0)
            pred_xyz = np.asarray(aligned.dataobj) > 0.5
            if pred_xyz.shape != image.shape:
                class_record.update({"status": "geometry-mismatch", "predictedVoxelCount": int(pred_xyz.sum()),
                                     "diceAgainstBundledAtlasLabel": None})
                per_class_statuses.append("geometry-mismatch")
                record["errors"].append(
                    f"Resampled shape mismatch for {item['model_name']}: {pred_xyz.shape} vs {image.shape}."
                )
                record["classes"].append(class_record)
                continue
            pred_zyx = np.transpose(pred_xyz, (2, 1, 0))
            reference_zyx = source_labels == reference_ids[item["key"]]
            pred_count = int(pred_xyz.sum())
            reference_count = int(reference_zyx.sum())
            score = dice_score(pred_zyx, reference_zyx)
            packed = np.packbits(pred_xyz.reshape(-1), bitorder="little")
            class_record.update({
                "status": "complete" if pred_count > 0 else "empty-mask",
                "predictedVoxelCount": pred_count,
                "referenceVoxelCount": reference_count,
                "diceAgainstBundledAtlasLabel": round(score, 6) if score is not None else None,
                "predictedMaskPackedBitsSha256": sha256_bytes(packed.tobytes()),
            })
            record["classes"].append(class_record)
            per_class_statuses.append(class_record["status"])
            # Retain empty but present, geometry-aligned masks for pairwise comparison.
            # An empty mask is a quality failure, not evidence that inference did not run.
            masks[item["key"]] = packed
            if pred_count == 0:
                record["qualityWarnings"].append(
                    f"Prediction for {item['model_name']} is empty. Model execution succeeded, but this class is not a usable segmentation."
                )

    class_statuses = [item.get("status") for item in record["classes"]]
    valid_output_count = sum(status in {"complete", "empty-mask"} for status in class_statuses)
    record["outputIntegrityStatus"] = (
        "complete" if len(class_statuses) == len(TARGETS) and valid_output_count == len(TARGETS)
        else ("partial" if valid_output_count else "failed")
    )
    record["segmentationQualityStatus"] = classify_run_status(per_class_statuses)
    # Backwards-compatible status alias denotes mask quality, not process execution.
    record["status"] = record["segmentationQualityStatus"]
    record["completedAtUtc"] = utc_now()
    record["durationSeconds"] = round(time.perf_counter() - clock_started, 3)
    return record, masks


def shutil_which_totalsegmentator() -> bool:
    from shutil import which
    return which("TotalSegmentator") is not None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offsets", required=True,
                        help="Comma-separated explicit candidate offsets, e.g. 0,1024; at least two distinct values.")
    parser.add_argument("--output", default="build/segmentor-intensity-experiment")
    parser.add_argument("--timeout-seconds", type=int, default=5400,
                        help="Timeout for each individual candidate inference; default is 90 minutes.")
    args = parser.parse_args()
    try:
        offsets = parse_candidate_offsets(args.offsets)
    except ValueError as exc:
        parser.error(str(exc))
    if args.timeout_seconds < 60 or args.timeout_seconds > 9000:
        parser.error("--timeout-seconds must be between 60 and 9000.")

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    logs = output / "logs"
    logs.mkdir(exist_ok=True)
    report_path = output / "intensity-preprocessing-comparison.json"
    report = {
        "schemaVersion": 1,
        "experimentType": "single-volume-controlled-intensity-preprocessing-ablation",
        "status": "running",
        "segmentationOutcomeStatus": "pending",
        "calibrationDecision": "not-established",
        "source": {},
        "model": {
            "name": "TotalSegmentator",
            "version": installed_package_version("TotalSegmentator"),
            "task": "total",
            "device": "cpu",
            "resolution": "fast/3mm",
            "requestedClasses": [item["model_name"] for item in TARGETS],
        },
        "candidateOffsets": offsets,
        "runs": [],
        "pairwiseComparisons": [],
        "interpretationLimits": [
            "This single SPL atlas volume cannot establish the true intensity calibration.",
            "The bundled atlas labels are from the same volume and are only a technical consistency reference, not independent accuracy ground truth.",
            "Do not choose a calibration solely from the highest Dice score, mask appearance, or the success of inference.",
            "The no-offset candidate is a negative/control condition, not an assertion that stored values are HU.",
            "All predictions remain experimental and unreviewed; this report is not a diagnostic or clinical validation result.",
        ],
    }
    write_report(report_path, report)

    print("Reading original SPL CT, labelmap, and metadata from source ZIP members.", flush=True)
    found = read_source_members()
    ct_header, source_ct = read_nrrd(found["i.nrrd"])
    label_header, source_labels = read_nrrd(found["seg.nrrd"])
    if source_ct.shape != (113, 256, 256) or source_labels.shape != source_ct.shape:
        raise ValueError(f"Unexpected source arrays: CT={source_ct.shape}, labels={source_labels.shape}")
    geometry_keys = ("space", "sizes", "space directions", "space origin")
    mismatch = {key: (ct_header.get(key), label_header.get(key))
                for key in geometry_keys if ct_header.get(key) != label_header.get(key)}
    if mismatch:
        raise ValueError("CT/reference geometry mismatch: " + json.dumps(mismatch))
    affine = geometry_affine_ras(ct_header)
    reference_ids = get_source_structure_ids(json.loads(found["atlasstructure.json"].decode("utf-8")))
    source_archive_hashes = {
        "ctNrrdSha256": sha256_bytes(found["i.nrrd"]),
        "labelMapNrrdSha256": sha256_bytes(found["seg.nrrd"]),
    }
    scene_evidence = read_scene_evidence()
    header_audit = header_calibration_audit(ct_header)
    report["source"] = {
        "dataset": "SPL Abdominal Atlas",
        "sourceArchivePattern": ARCHIVE_GLOB,
        "sourceArchiveHashes": source_archive_hashes,
        "dimensionsXYZ": [256, 256, 113],
        "arrayOrder": "zyx",
        "coordinateSystem": "RAS after LPS conversion",
        "affineRAS": [[float(v) for v in row] for row in affine],
        "spacingMm": [float(v) for v in voxel_sizes(affine)],
        "ctNrrdHeader": {key: ct_header[key] for key in sorted(ct_header)},
        "labelMapHeader": {key: label_header[key] for key in sorted(label_header)},
        "ctHeaderCalibrationAudit": header_audit,
        "sourceStoredValueStatistics": intensity_stats(source_ct),
        "sceneMetadataEvidence": scene_evidence,
        "calibrationConclusion": (
            "UNRESOLVED: the available NRRD header has no explicit modality/HU unit or rescale/intercept field. "
            "The existing window/level convention is display metadata, not proof of a stored-value-to-HU transform."
        ),
    }
    report["startedAtUtc"] = utc_now()
    write_report(report_path, report)

    # Process candidates in a stable order. Each run reuses the same source CT,
    # labelmap, class list, model package, geometry, and CPU settings; only the
    # explicitly specified subtraction offset changes.
    with tempfile.TemporaryDirectory(prefix="ctedu-intensity-comparison-") as temp_name:
        temp_root = Path(temp_name)
        packed_masks_by_offset: dict[float, dict[str, np.ndarray]] = {}
        for index, offset in enumerate(offsets):
            try:
                record, masks = run_candidate(
                    index, offset, source_ct, source_labels, reference_ids,
                    affine, temp_root, logs, args.timeout_seconds,
                )
            except Exception as exc:
                record = {
                    "candidateId": f"candidate_{index:02d}",
                    "operation": "subtract-stored-value-offset",
                    "offset": offset,
                    "status": "failed",
                    "modelExecutionStatus": "failed",
                    "outputIntegrityStatus": "failed",
                    "segmentationQualityStatus": "failed",
                    "startedAtUtc": utc_now(),
                    "completedAtUtc": utc_now(),
                    "errors": [str(exc), traceback.format_exc(limit=8)],
                    "qualityWarnings": [],
                    "classes": [],
                }
                masks = {}
            report["runs"].append(record)
            packed_masks_by_offset[offset] = masks
            finished_count = len(report["runs"])
            execution_integrity_count = sum(
                run.get("modelExecutionStatus") == "success" and
                run.get("outputIntegrityStatus") == "complete"
                for run in report["runs"]
            )
            quality_complete_count = sum(
                run.get("segmentationQualityStatus") == "complete"
                for run in report["runs"]
            )
            if finished_count < len(offsets):
                report["status"] = "running"
            elif execution_integrity_count == len(offsets):
                report["status"] = "complete"
            elif execution_integrity_count:
                report["status"] = "partial"
            else:
                report["status"] = "failed"
            report["segmentationOutcomeStatus"] = (
                "complete" if quality_complete_count == len(offsets)
                else ("partial" if quality_complete_count else "failed")
            )
            write_report(report_path, report)

        for first_index, first_offset in enumerate(offsets):
            for second_offset in offsets[first_index + 1:]:
                class_comparisons = []
                first_masks = packed_masks_by_offset.get(first_offset, {})
                second_masks = packed_masks_by_offset.get(second_offset, {})
                for item in TARGETS:
                    first = first_masks.get(item["key"])
                    second = second_masks.get(item["key"])
                    if first is None or second is None:
                        class_comparisons.append({
                            "id": item["key"], "status": "not-comparable",
                            "reason": "One or both candidate masks were missing or empty.",
                        })
                    else:
                        changed = int(np.unpackbits(np.bitwise_xor(first, second), bitorder="little",
                                                    count=source_ct.size).sum())
                        class_comparisons.append({
                            "id": item["key"],
                            "status": "compared",
                            "differentVoxelCount": changed,
                            "differentVoxelFraction": float(changed / source_ct.size),
                        })
                report["pairwiseComparisons"].append({
                    "firstOffset": first_offset,
                    "secondOffset": second_offset,
                    "classes": class_comparisons,
                    "interpretation": "Mask differences quantify preprocessing sensitivity only; they do not identify true calibration.",
                })

    outputs_complete = len(report["runs"]) == len(offsets) and all(
        r.get("modelExecutionStatus") == "success" and r.get("outputIntegrityStatus") == "complete"
        for r in report["runs"]
    )
    any_valid_output = any(
        r.get("modelExecutionStatus") == "success" and r.get("outputIntegrityStatus") == "complete"
        for r in report["runs"]
    )
    report["status"] = "complete" if outputs_complete else ("partial" if any_valid_output else "failed")
    quality_complete_count = sum(
        r.get("segmentationQualityStatus") == "complete" for r in report["runs"]
    )
    report["segmentationOutcomeStatus"] = (
        "complete" if quality_complete_count == len(offsets)
        else ("partial" if quality_complete_count else "failed")
    )
    report["completedAtUtc"] = utc_now()
    write_report(report_path, report)
    print(
        f"INTENSITY_PREPROCESSING_EXPERIMENT status={report['status']} "
        f"segmentationOutcomeStatus={report['segmentationOutcomeStatus']} report={report_path}",
        flush=True,
    )
    if not outputs_complete:
        print("At least one candidate failed inference/output-integrity checks; inspect the JSON report and logs.", file=sys.stderr)
        return 1
    # A completed negative-control run may legitimately return empty masks. That
    # is a segmentation-quality result, not a workflow execution failure.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
