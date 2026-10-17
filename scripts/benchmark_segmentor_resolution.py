#!/usr/bin/env python3
"""Hosted CPU comparison of TotalSegmentator fast (3 mm) and full (1.5 mm) resolution.

The experiment compares the same source volume, preprocessing hypothesis, task and
four ROIs. Results are preliminary same-volume comparisons, not independent medical
accuracy evaluation. Predictions are written only to the experiment artifact.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import traceback
import zipfile
from datetime import datetime, timezone
from importlib.metadata import version as installed_package_version
from pathlib import Path

import nibabel as nib
import numpy as np
from nibabel.affines import voxel_sizes
from nibabel.processing import resample_from_to

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_demo_assets import read_nrrd
from generate_major_organ_masks import (
    ARCHIVE_GLOB,
    TARGETS,
    dice_score,
    geometry_affine_ras,
    get_source_structure_ids,
    read_source_members,
)

EXPECTED_ZYX = (113, 256, 256)
TIME_BINARY = Path("/usr/bin/time")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: Path, value: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def parse_max_rss_kib(raw: str) -> int | None:
    match = re.search(r"Maximum resident set size \(kbytes\):\s*(\d+)", raw)
    return int(match.group(1)) if match else None


def intensity_stats(values: np.ndarray) -> dict:
    arr = np.asarray(values, dtype=np.float32)
    quantiles = np.percentile(arr, [0.1, 1, 5, 50, 95, 99, 99.9])
    names = ("p0_1", "p1", "p5", "p50", "p95", "p99", "p99_9")
    return {
        "minimum": float(arr.min()),
        "maximum": float(arr.max()),
        "mean": float(np.mean(arr, dtype=np.float64)),
        "standardDeviation": float(np.std(arr, dtype=np.float64)),
        "percentiles": {name: float(value) for name, value in zip(names, quantiles)},
    }


def make_input_nifti(source_ct: np.ndarray, affine: np.ndarray, offset: float, path: Path) -> nib.Nifti1Image:
    # NRRD reader exposes NumPy order z,y,x; NIfTI image storage is x,y,z.
    values_xyz = np.transpose(source_ct.astype(np.float32) - offset, (2, 1, 0))
    if values_xyz.shape != (256, 256, 113) or not np.isfinite(values_xyz).all():
        raise ValueError(f"Invalid preprocessed source volume: shape={values_xyz.shape}")
    image = nib.Nifti1Image(values_xyz, affine)
    image.set_qform(affine, code=1)
    image.set_sform(affine, code=1)
    image.header.set_xyzt_units("mm")
    image.header.set_data_dtype(np.float32)
    nib.save(image, str(path))
    return image


def run_resolution(
    *,
    candidate_id: str,
    resolution: str,
    fast: bool,
    source_ct: np.ndarray,
    source_labels: np.ndarray,
    reference_ids: dict[str, int],
    affine: np.ndarray,
    offset: float,
    output_root: Path,
    timeout_seconds: int,
) -> tuple[dict, dict[str, bytes]]:
    candidate_started = time.perf_counter()
    candidate_started_utc = utc_now()
    candidate_root = output_root / "candidates" / candidate_id
    candidate_root.mkdir(parents=True, exist_ok=False)
    log_path = output_root / "logs" / f"{candidate_id}.log"
    time_path = candidate_root / "gnu-time.txt"
    packed_masks: dict[str, bytes] = {}
    result = {
        "candidateId": candidate_id,
        "resolution": resolution,
        "fastFlag": fast,
        "status": "running",
        "modelExecutionStatus": "running",
        "outputIntegrityStatus": "unknown",
        "segmentationQualityStatus": "unknown",
        "startedAtUtc": candidate_started_utc,
        "durationSeconds": None,
        "peakRssKiB": None,
        "peakRssMeasurementMethod": (
            "GNU /usr/bin/time -v maximum resident set size; measures the launched command and waited children, "
            "not a guaranteed aggregate of concurrently resident process trees."
            if TIME_BINARY.is_file() else "Unavailable: /usr/bin/time was not found on the runner."
        ),
        "preprocessing": {
            "operation": "subtract-stored-value-offset",
            "offset": offset,
            "calibrationStatus": "unverified-hypothesis",
        },
        "classes": [],
        "errors": [],
        "qualityWarnings": [],
    }

    try:
        with tempfile.TemporaryDirectory(prefix=f"ctedu-resolution-{candidate_id}-", dir=str(output_root)) as temp_name:
            temp = Path(temp_name)
            input_path = temp / "spl-abdomen-input.nii.gz"
            model_output = temp / "model-output"
            model_output.mkdir()
            input_image = make_input_nifti(source_ct, affine, offset, input_path)
            command = [
                "TotalSegmentator", "-i", str(input_path), "-o", str(model_output),
                "--task", "total", "--device", "cpu",
                "--nr_thr_resamp", "1", "--nr_thr_saving", "1",
                "--roi_subset", "liver", "spleen", "kidney_left", "kidney_right",
            ]
            if fast:
                command.append("--fast")
            result["commandSummary"] = {
                "task": "total",
                "device": "cpu",
                "requestedClasses": [item["model_name"] for item in TARGETS],
                "command": command[:],
                "timeoutSeconds": timeout_seconds,
                "modelInputShapeXYZ": [int(v) for v in input_image.shape],
                "modelInputAffineRAS": [[float(v) for v in row] for row in input_image.affine],
                "sourceSpacingMm": [float(v) for v in voxel_sizes(affine)],
                "inputArraySha256Float32LittleEndianCOrder": sha256_bytes(
                    np.asarray(input_image.dataobj, dtype="<f4").tobytes(order="C")
                ),
                "intensityStatisticsAfterOffset": intensity_stats(np.asarray(input_image.dataobj)),
            }
            env = os.environ.copy()
            env["OMP_NUM_THREADS"] = "2"
            env["ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS"] = "2"
            with log_path.open("w", encoding="utf-8") as log:
                log.write("RESOLUTION=" + resolution + "\n")
                log.write("OFFSET=" + str(offset) + "\n")
                log.write("COMMAND=" + " ".join(command) + "\n")
                log.flush()
                launched = [str(TIME_BINARY), "-v", "-o", str(time_path), *command] if TIME_BINARY.is_file() else command
                try:
                    subprocess.run(
                        launched, check=True, timeout=timeout_seconds,
                        stdout=log, stderr=subprocess.STDOUT, env=env,
                    )
                    result["modelExecutionStatus"] = "success"
                except subprocess.TimeoutExpired:
                    result["modelExecutionStatus"] = "failed"
                    result["errors"].append(f"Inference exceeded timeout of {timeout_seconds} seconds.")
                    return finalize_result(result, candidate_started, candidate_root), packed_masks
                except subprocess.CalledProcessError as exc:
                    result["modelExecutionStatus"] = "failed"
                    result["errors"].append(f"TotalSegmentator exited with return code {exc.returncode}; see log.")
                    return finalize_result(result, candidate_started, candidate_root), packed_masks

            if time_path.exists():
                time_text = time_path.read_text(encoding="utf-8", errors="replace")
                result["peakRssKiB"] = parse_max_rss_kib(time_text)
                result["gnuTimeStatisticsPath"] = str(time_path.relative_to(output_root))

            target = (input_image.shape, input_image.affine)
            per_class_statuses = []
            for item in TARGETS:
                model_class = item["model_name"]
                predicted_path = model_output / f"{model_class}.nii.gz"
                class_record = {
                    "id": item["key"],
                    "modelClass": model_class,
                    "referenceLabelId": reference_ids[item["key"]],
                }
                if not predicted_path.is_file():
                    class_record.update({
                        "status": "missing-output",
                        "predictedVoxelCount": None,
                        "diceAgainstBundledAtlasLabel": None,
                    })
                    result["classes"].append(class_record)
                    per_class_statuses.append("missing-output")
                    result["errors"].append(f"Missing model output: {predicted_path.name}")
                    continue
                try:
                    pred_image = nib.load(str(predicted_path))
                    aligned = resample_from_to(pred_image, target, order=0)
                    pred_xyz = np.asarray(aligned.dataobj) > 0.5
                    if pred_xyz.shape != input_image.shape or not np.allclose(aligned.affine, affine, atol=1e-4):
                        raise ValueError(
                            f"Aligned prediction geometry mismatch: shape={pred_xyz.shape}, affine matches={np.allclose(aligned.affine, affine, atol=1e-4)}"
                        )
                    pred_zyx = np.transpose(pred_xyz, (2, 1, 0))
                    reference_zyx = source_labels == reference_ids[item["key"]]
                    pred_count = int(pred_xyz.sum())
                    ref_count = int(reference_zyx.sum())
                    intersection = int(np.logical_and(pred_zyx, reference_zyx).sum())
                    dice = dice_score(pred_zyx, reference_zyx)
                    sensitivity = float(intersection / ref_count) if ref_count else None
                    precision = float(intersection / pred_count) if pred_count else None
                    packed = np.packbits(pred_xyz.reshape(-1), bitorder="little").tobytes()
                    packed_masks[item["key"]] = packed
                    mask_path = candidate_root / f"{item['key']}.nii.gz"
                    mask_image = nib.Nifti1Image(pred_xyz.astype(np.uint8), affine)
                    mask_image.set_qform(affine, code=1)
                    mask_image.set_sform(affine, code=1)
                    mask_image.header.set_data_dtype(np.uint8)
                    mask_image.header.set_xyzt_units("mm")
                    nib.save(mask_image, str(mask_path))
                    class_record.update({
                        "status": "complete" if pred_count else "empty-mask",
                        "predictedVoxelCount": pred_count,
                        "referenceVoxelCount": ref_count,
                        "intersectionVoxelCount": intersection,
                        "diceAgainstBundledAtlasLabel": round(dice, 6) if dice is not None else None,
                        "sensitivityAgainstBundledAtlasLabel": round(sensitivity, 6) if sensitivity is not None else None,
                        "precisionAgainstBundledAtlasLabel": round(precision, 6) if precision is not None else None,
                        "predictedMaskPackedBitsSha256": sha256_bytes(packed),
                        "niftiFile": str(mask_path.relative_to(output_root)),
                        "niftiFileBytes": mask_path.stat().st_size,
                        "outputShapeXYZ": [int(v) for v in mask_image.shape],
                        "outputAffineRAS": [[float(v) for v in row] for row in mask_image.affine],
                    })
                    result["classes"].append(class_record)
                    per_class_statuses.append(class_record["status"])
                    if pred_count == 0:
                        result["qualityWarnings"].append(
                            f"{model_class} produced an empty mask; this is a class-quality failure, not a successful segmentation."
                        )
                except Exception as exc:
                    class_record.update({"status": "invalid-output", "error": str(exc)})
                    result["classes"].append(class_record)
                    per_class_statuses.append("invalid-output")
                    result["errors"].append(f"{model_class} output validation failed: {exc}")

            all_output_records = [c for c in result["classes"] if c.get("status") in {"complete", "empty-mask"}]
            if len(result["classes"]) == len(TARGETS) and len(all_output_records) == len(TARGETS):
                result["outputIntegrityStatus"] = "complete"
            elif all_output_records:
                result["outputIntegrityStatus"] = "partial"
            else:
                result["outputIntegrityStatus"] = "failed"
            if per_class_statuses and all(s == "complete" for s in per_class_statuses):
                result["segmentationQualityStatus"] = "complete"
            elif any(s == "complete" for s in per_class_statuses):
                result["segmentationQualityStatus"] = "partial"
            else:
                result["segmentationQualityStatus"] = "failed"
            result["candidateOutputNiftiBytes"] = sum(
                p.stat().st_size for p in candidate_root.glob("*.nii.gz")
            )
            result["candidateOutputNiftiFileCount"] = len(list(candidate_root.glob("*.nii.gz")))
            result["originalPredictionMasksLeftInTempOnly"] = True
            result["status"] = result["outputIntegrityStatus"]
            return finalize_result(result, candidate_started, candidate_root), packed_masks
    except Exception as exc:
        result["modelExecutionStatus"] = "failed" if result["modelExecutionStatus"] == "running" else result["modelExecutionStatus"]
        result["outputIntegrityStatus"] = "failed"
        result["segmentationQualityStatus"] = "failed"
        result["status"] = "failed"
        result["errors"].append(str(exc))
        result["errors"].append(traceback.format_exc(limit=8))
        return finalize_result(result, candidate_started, candidate_root), packed_masks


def finalize_result(result: dict, started: float, candidate_root: Path) -> dict:
    result["completedAtUtc"] = utc_now()
    result["durationSeconds"] = round(time.perf_counter() - started, 3)
    result["candidateOutputNiftiBytes"] = sum(
        p.stat().st_size for p in candidate_root.glob("*.nii.gz")
    ) if candidate_root.exists() else 0
    result["candidateOutputNiftiFileCount"] = len(list(candidate_root.glob("*.nii.gz"))) if candidate_root.exists() else 0
    if result.get("status") == "running":
        result["status"] = result.get("outputIntegrityStatus", "failed")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--intensity-offset", type=float, required=True,
                        help="Explicit experimental stored-value offset to subtract; the source HU calibration is unconfirmed.")
    parser.add_argument("--output", default="build/segmentor-resolution-benchmark")
    parser.add_argument("--timeout-seconds", type=int, default=5400)
    args = parser.parse_args()
    if not np.isfinite(args.intensity_offset) or not -10000 <= args.intensity_offset <= 10000:
        parser.error("--intensity-offset must be finite and between -10000 and 10000.")
    if not 60 <= args.timeout_seconds <= 9000:
        parser.error("--timeout-seconds must be between 60 and 9000.")

    output = Path(args.output)
    if output.exists() and any(output.iterdir()):
        parser.error(f"Output directory must be empty or not exist; refusing to overwrite existing artifacts: {output}")
    output.mkdir(parents=True, exist_ok=True)
    (output / "logs").mkdir(exist_ok=True)
    report_path = output / "resolution-benchmark.json"
    report = {
        "schemaVersion": 1,
        "experimentType": "single-volume-resolution-ablation",
        "status": "running",
        "segmentationOutcomeStatus": "pending",
        "preprocessingCalibrationDecision": "not-established",
        "source": {},
        "model": {
            "name": "TotalSegmentator",
            "version": None,
            "task": "total",
            "device": "cpu",
            "classNames": [item["model_name"] for item in TARGETS],
            "softwareResolutionDefinitions": {
                "fast-3mm": "TotalSegmentator --fast option (pinned README says lower resolution 3mm vs 1.5mm)",
                "full-1.5mm": "TotalSegmentator default resolution with --fast omitted (pinned README says 1.5mm)",
            },
        },
        "candidateConfiguration": {
            "sameSourceVolume": True,
            "sameStoredValueOffset": args.intensity_offset,
            "sameTaskAndClassList": True,
            "candidateOrder": ["fast-3mm", "full-1.5mm"],
            "timingCaveat": (
                "Wall time includes preprocessing, model startup, model-weight loading/download if needed, resampling and saving. "
                "The first candidate may have different cache state; do not treat this one-run wall-clock comparison as a fair warm-cache speed benchmark."
            ),
            "peakMemoryCaveat": (
                "Peak RSS is reported from GNU time when available; it is a per-launched-command maximum and may not equal the total concurrently resident process-tree memory."
            ),
        },
        "runs": [],
        "pairwiseComparisons": [],
        "interpretationLimits": [
            "The SPL NRRD header does not establish an HU calibration; offset 1024 is an unverified hypothesis held constant to isolate resolution sensitivity.",
            "The bundled SPL reference labels come from the same volume; same-volume Dice, sensitivity and precision are technical consistency comparisons, not independent accuracy evidence.",
            "One normal-anatomy volume does not establish generalization to pathology, other scanners, contrast phases, reconstruction kernels or incomplete fields of view.",
            "Output masks are temporary benchmark artifacts; this job does not modify preview masks or production assets.",
            "A higher metric on the same volume does not automatically make a model clinically or educationally approved.",
        ],
    }
    write_json(report_path, report)

    try:
        source = read_source_members()
        ct_header, source_ct = read_nrrd(source["i.nrrd"])
        label_header, source_labels = read_nrrd(source["seg.nrrd"])
        geometry_keys = ("space", "sizes", "space directions", "space origin")
        mismatches = {
            key: (ct_header.get(key), label_header.get(key))
            for key in geometry_keys if ct_header.get(key) != label_header.get(key)
        }
        if mismatches:
            raise ValueError("CT/reference label geometry mismatch: " + json.dumps(mismatches))
        if source_ct.shape != EXPECTED_ZYX or source_labels.shape != source_ct.shape:
            raise ValueError(f"Unexpected source array shape: CT={source_ct.shape}, labels={source_labels.shape}")
        if not shutil.which("TotalSegmentator"):
            raise RuntimeError("TotalSegmentator executable not found after dependency installation.")
        metadata = json.loads(source["atlasstructure.json"].decode("utf-8"))
        reference_ids = get_source_structure_ids(metadata)
        affine = geometry_affine_ras(ct_header)
        report["source"] = {
            "dataset": "SPL Abdominal Atlas",
            "sourceArchivePattern": ARCHIVE_GLOB,
            "ctNrrdSha256": sha256_bytes(source["i.nrrd"]),
            "labelMapNrrdSha256": sha256_bytes(source["seg.nrrd"]),
            "sourceDimensionsXYZ": [256, 256, 113],
            "sourceArrayOrder": "zyx",
            "coordinateSystem": "RAS after conversion from NRRD LPS",
            "affineRAS": [[float(v) for v in row] for row in affine],
            "spacingMm": [float(v) for v in voxel_sizes(affine)],
            "ctNrrdHeader": {key: ct_header[key] for key in sorted(ct_header)},
            "labelMapNrrdHeader": {key: label_header[key] for key in sorted(label_header)},
            "storedIntensityStatistics": intensity_stats(source_ct),
            "intensitySemantics": "Stored values; not independently confirmed as HU.",
        }
        report["startedAtUtc"] = utc_now()
        report["model"]["version"] = installed_package_version("TotalSegmentator")
        write_json(report_path, report)
    except Exception as exc:
        report["status"] = "failed"
        report["error"] = str(exc)
        report["traceback"] = traceback.format_exc(limit=8)
        report["completedAtUtc"] = utc_now()
        write_json(report_path, report)
        print(f"RESOLUTION_BENCHMARK status=failed report={report_path}", file=sys.stderr, flush=True)
        return 1

    configurations = [("fast-3mm", True), ("full-1p5mm", False)]
    packed_by_resolution: dict[str, dict[str, bytes]] = {}
    for candidate_id, fast in configurations:
        try:
            result, packed = run_resolution(
                candidate_id=candidate_id,
                resolution="3 mm fast model" if fast else "1.5 mm full-resolution model",
                fast=fast,
                source_ct=source_ct,
                source_labels=source_labels,
                reference_ids=reference_ids,
                affine=affine,
                offset=args.intensity_offset,
                output_root=output,
                timeout_seconds=args.timeout_seconds,
            )
        except Exception as exc:
            result = {
                "candidateId": candidate_id,
                "resolution": "3 mm fast model" if fast else "1.5 mm full-resolution model",
                "fastFlag": fast,
                "status": "failed",
                "modelExecutionStatus": "failed",
                "outputIntegrityStatus": "failed",
                "segmentationQualityStatus": "failed",
                "errors": [str(exc), traceback.format_exc(limit=8)],
                "classes": [],
                "completedAtUtc": utc_now(),
            }
            packed = {}
        report["runs"].append(result)
        packed_by_resolution[candidate_id] = packed
        complete_runs = [
            run for run in report["runs"]
            if run.get("modelExecutionStatus") == "success" and run.get("outputIntegrityStatus") == "complete"
        ]
        if len(report["runs"]) < len(configurations):
            report["status"] = "running"
        elif len(complete_runs) == len(configurations):
            report["status"] = "complete"
        elif complete_runs:
            report["status"] = "partial"
        else:
            report["status"] = "failed"
        quality_complete = [
            run for run in report["runs"] if run.get("segmentationQualityStatus") == "complete"
        ]
        report["segmentationOutcomeStatus"] = (
            "complete" if len(quality_complete) == len(configurations)
            else ("partial" if quality_complete or any(run.get("segmentationQualityStatus") == "partial" for run in report["runs"])
                  else "failed")
        )
        write_json(report_path, report)

    fast_masks = packed_by_resolution.get("fast-3mm", {})
    full_masks = packed_by_resolution.get("full-1p5mm", {})
    class_map = {item["key"]: item for item in TARGETS}
    fast_records = {
        c.get("id"): c for run in report["runs"] if run.get("candidateId") == "fast-3mm"
        for c in run.get("classes", [])
    }
    full_records = {
        c.get("id"): c for run in report["runs"] if run.get("candidateId") == "full-1p5mm"
        for c in run.get("classes", [])
    }
    comparisons = []
    for item in TARGETS:
        key = item["key"]
        a = fast_records.get(key, {})
        b = full_records.get(key, {})
        mask_a = fast_masks.get(key)
        mask_b = full_masks.get(key)
        if mask_a is None or mask_b is None or a.get("diceAgainstBundledAtlasLabel") is None or b.get("diceAgainstBundledAtlasLabel") is None:
            comparisons.append({"id": key, "status": "not-comparable", "reason": "One or both outputs are missing or invalid."})
            continue
        diff_voxels = int(np.unpackbits(
            np.bitwise_xor(np.frombuffer(mask_a, dtype=np.uint8), np.frombuffer(mask_b, dtype=np.uint8)),
            bitorder="little", count=source_ct.size
        ).sum())
        comparisons.append({
            "id": key,
            "status": "compared",
            "fastDice": a["diceAgainstBundledAtlasLabel"],
            "fullResolutionDice": b["diceAgainstBundledAtlasLabel"],
            "diceDeltaFullMinusFast": round(b["diceAgainstBundledAtlasLabel"] - a["diceAgainstBundledAtlasLabel"], 6),
            "differentVoxelCount": diff_voxels,
            "differentVoxelFractionOfSourceVolume": float(diff_voxels / source_ct.size),
            "interpretation": "Resolution sensitivity on one atlas/reference, not independent accuracy.",
        })
    report["pairwiseComparisons"] = comparisons
    report["completedAtUtc"] = utc_now()
    outputs_complete = len(report["runs"]) == len(configurations) and all(
        r.get("modelExecutionStatus") == "success" and r.get("outputIntegrityStatus") == "complete"
        for r in report["runs"]
    )
    report["status"] = "complete" if outputs_complete else (
        "partial" if any(r.get("modelExecutionStatus") == "success" and r.get("outputIntegrityStatus") == "complete" for r in report["runs"])
        else "failed"
    )
    quality_statuses = [r.get("segmentationQualityStatus") for r in report["runs"]]
    report["segmentationOutcomeStatus"] = (
        "complete" if all(v == "complete" for v in quality_statuses)
        else ("partial" if any(v in {"complete", "partial"} for v in quality_statuses) else "failed")
    )
    write_json(report_path, report)
    print(
        f"RESOLUTION_BENCHMARK status={report['status']} "
        f"segmentationOutcomeStatus={report['segmentationOutcomeStatus']} report={report_path}",
        flush=True,
    )
    if not outputs_complete:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
