#!/usr/bin/env python3
"""Aggregate per-case CT Edu segmentation evaluation reports for an independent cohort."""
from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

INDEPENDENT_TYPES = {"independent-expert", "independent-dataset"}


class AggregationInputError(ValueError):
    """Raised when reports do not form a comparable independent cohort."""


def read_report(path: Path) -> dict[str, Any]:
    try:
        report = json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as exc:
        raise AggregationInputError(f"Could not read report {path}: {exc}") from exc
    if not isinstance(report, dict) or report.get("schemaVersion") != 1:
        raise AggregationInputError(f"{path} is not a supported version-1 evaluation report.")
    return report


def _canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _mean(values: list[float]) -> float | None:
    return float(statistics.fmean(values)) if values else None


def _summary(values: list[float]) -> dict[str, float | None]:
    if not values:
        return {"mean": None, "median": None, "minimum": None, "maximum": None}
    return {
        "mean": float(statistics.fmean(values)),
        "median": float(statistics.median(values)),
        "minimum": float(min(values)),
        "maximum": float(max(values)),
    }


def aggregate_reports(report_paths: list[Path]) -> dict[str, Any]:
    if len(report_paths) < 2:
        raise AggregationInputError("At least two case reports are required for cohort aggregation.")
    reports = [read_report(path) for path in report_paths]
    case_ids: set[str] = set()
    reference_hashes: set[str] = set()
    baseline = reports[0]
    if baseline.get("referenceType") not in INDEPENDENT_TYPES or baseline.get("independentComparisonEligible") is not True:
        raise AggregationInputError("Only reports with an explicitly declared independent reference type may be aggregated.")
    baseline_config = baseline.get("configuration")
    baseline_type = baseline.get("referenceType")
    if not isinstance(baseline_config, dict):
        raise AggregationInputError("Evaluation report is missing its configuration.")
    baseline_class_map = baseline_config.get("classMap")
    if not isinstance(baseline_class_map, list) or not baseline_class_map:
        raise AggregationInputError("Evaluation report is missing its class map.")
    expected_class_ids = [item.get("id") for item in baseline_class_map if isinstance(item, dict)]
    if len(expected_class_ids) != len(baseline_class_map) or len(set(expected_class_ids)) != len(expected_class_ids):
        raise AggregationInputError("Baseline class map is malformed or contains duplicate class IDs.")

    for index, report in enumerate(reports):
        case_id = report.get("caseId")
        if not isinstance(case_id, str) or not case_id.strip():
            raise AggregationInputError(f"Report {index} is missing a stable caseId.")
        if case_id in case_ids:
            raise AggregationInputError(f"Duplicate caseId {case_id!r}; do not count the same case twice.")
        case_ids.add(case_id)
        if report.get("referenceType") != baseline_type or report.get("independentComparisonEligible") is not True:
            raise AggregationInputError("All reports must use the same declared independent reference type.")
        if _canonical(report.get("configuration")) != _canonical(baseline_config):
            raise AggregationInputError("Reports use different model/preprocessing/dataset/class-map configurations.")
        reference_hash = report.get("inputs", {}).get("reference", {}).get("sha256")
        if not isinstance(reference_hash, str) or len(reference_hash) != 64:
            raise AggregationInputError(f"Case {case_id} is missing a valid reference SHA-256 digest.")
        if reference_hash in reference_hashes:
            raise AggregationInputError(
                f"Duplicate reference-file hash in case {case_id}; the same reference file cannot count as two independent cases."
            )
        reference_hashes.add(reference_hash)
        results = report.get("results")
        if not isinstance(results, list) or len(results) != len(expected_class_ids):
            raise AggregationInputError(f"Case {case_id} does not have exactly the configured class results.")
        result_ids = [item.get("id") for item in results if isinstance(item, dict)]
        if len(result_ids) != len(results) or set(result_ids) != set(expected_class_ids):
            raise AggregationInputError(f"Case {case_id} has missing, duplicate or unexpected class results.")

    per_class: list[dict[str, Any]] = []
    for class_spec in baseline_class_map:
        stable_id = class_spec["id"]
        class_rows = []
        dice_values: list[float] = []
        sensitivity_values: list[float] = []
        precision_values: list[float] = []
        assd_values: list[float] = []
        hd95_values: list[float] = []
        reference_present_count = 0
        reference_empty_count = 0
        empty_prediction_failures = 0
        false_positive_on_reference_empty = 0
        both_empty_count = 0
        surface_case_count = 0
        for report in reports:
            result = next(item for item in report["results"] if item["id"] == stable_id)
            ref_count = int(result.get("referenceVoxelCount", -1))
            pred_count = int(result.get("predictionVoxelCount", -1))
            if ref_count < 0 or pred_count < 0:
                raise AggregationInputError(f"Invalid voxel counts for {stable_id} in case {report['caseId']}.")
            if ref_count > 0:
                reference_present_count += 1
                if result.get("dice") is not None:
                    dice_values.append(float(result["dice"]))
                if result.get("sensitivity") is not None:
                    sensitivity_values.append(float(result["sensitivity"]))
                if result.get("status") == "empty-prediction":
                    empty_prediction_failures += 1
            else:
                reference_empty_count += 1
                if pred_count > 0:
                    false_positive_on_reference_empty += 1
                else:
                    both_empty_count += 1
            if pred_count > 0 and result.get("precision") is not None:
                precision_values.append(float(result["precision"]))
            if pred_count > 0 and ref_count > 0:
                distances = result.get("surfaceDistances")
                if isinstance(distances, dict):
                    if distances.get("averageSymmetricSurfaceDistanceMm") is not None:
                        assd_values.append(float(distances["averageSymmetricSurfaceDistanceMm"]))
                    if distances.get("hausdorff95Mm") is not None:
                        hd95_values.append(float(distances["hausdorff95Mm"]))
                    surface_case_count += 1
            class_rows.append({
                "caseId": report["caseId"],
                "status": result.get("status"),
                "referenceVoxelCount": ref_count,
                "predictionVoxelCount": pred_count,
                "dice": result.get("dice"),
                "sensitivity": result.get("sensitivity"),
                "precision": result.get("precision"),
                "averageSymmetricSurfaceDistanceMm": (result.get("surfaceDistances") or {}).get("averageSymmetricSurfaceDistanceMm"),
                "hausdorff95Mm": (result.get("surfaceDistances") or {}).get("hausdorff95Mm"),
            })
        per_class.append({
            "id": stable_id,
            "name": class_spec.get("name", stable_id),
            "casesSubmitted": len(reports),
            "referencePresentCases": reference_present_count,
            "referenceEmptyCases": reference_empty_count,
            "emptyPredictionFailuresWhenReferencePresent": empty_prediction_failures,
            "falsePositiveCasesWhenReferenceEmpty": false_positive_on_reference_empty,
            "bothEmptyCases": both_empty_count,
            "diceCaseCount": len(dice_values),
            "dice": _summary(dice_values),
            "sensitivityCaseCount": len(sensitivity_values),
            "sensitivity": _mean(sensitivity_values),
            "precisionCaseCount": len(precision_values),
            "precision": _mean(precision_values),
            "surfaceDistanceCaseCount": surface_case_count,
            "averageSymmetricSurfaceDistanceMm": _mean(assd_values),
            "hausdorff95Mm": _summary(hd95_values),
            "aggregationMethod": "unweighted per-case summary; each reference-present case contributes one value regardless of organ volume",
            "perCase": class_rows,
        })
    return {
        "schemaVersion": 1,
        "reportType": "independent-segmentation-cohort-aggregate",
        "createdAtUTC": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "evaluatorVersion": baseline.get("evaluator", {}).get("version"),
        "caseCount": len(reports),
        "uniqueCaseCount": len(case_ids),
        "minimumTwoUniqueCasesMet": len(case_ids) >= 2,
        "referenceType": baseline_type,
        "referenceDatasetId": baseline_config.get("referenceDatasetId"),
        "configuration": baseline_config,
        "configurationSha256": baseline.get("configurationSha256"),
        "independentComparisonEligible": True,
        "independenceBasis": "user-declared report metadata; cohort independence and annotation quality were not independently verified by this script",
        "inputReports": [
            {"caseId": report["caseId"], "predictionSha256": report.get("inputs", {}).get("prediction", {}).get("sha256"),
             "referenceSha256": report.get("inputs", {}).get("reference", {}).get("sha256")}
            for report in reports
        ],
        "classes": per_class,
        "interpretationLimits": [
            "This is a descriptive summary of case-level agreement with supplied references, not a confidence-interval analysis or proof of generalization.",
            "The adequacy and representativeness of cohort size, scan acquisition, contrast phase, pathology, coverage and reference annotations require independent review.",
            "An empty-reference case is counted separately and excluded from Dice means; false positives in those cases are reported explicitly.",
            "Surface-distance summaries include only cases where both prediction and reference masks are non-empty, so inspect surfaceDistanceCaseCount alongside those metrics.",
            "Successful aggregation is not clinical validation or approval for educational publication.",
        ],
        "educationalApprovalStatus": "not-approved",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reports", type=Path, nargs="+", required=True, help="At least two per-case JSON reports from evaluate_segmentor_predictions.py.")
    parser.add_argument("--output", type=Path, required=True, help="Aggregate JSON report output path.")
    args = parser.parse_args(argv)
    try:
        report = aggregate_reports(args.reports)
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        temporary = output.with_name(output.name + ".tmp")
        temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, output)
    except AggregationInputError as exc:
        print(f"SEGMENTOR_AGGREGATION_INPUT_ERROR: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"SEGMENTOR_AGGREGATION_UNEXPECTED_ERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    print(json.dumps({"report": str(args.output), "caseCount": report["caseCount"], "classes": len(report["classes"]),
                      "independentComparisonEligible": report["independentComparisonEligible"],
                      "educationalApprovalStatus": report["educationalApprovalStatus"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
