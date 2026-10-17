from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

import nibabel as nib
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import evaluate_segmentor_predictions as evaluator
import aggregate_segmentor_evaluations as aggregator


class SegmentorIndependentEvaluationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.affine = np.diag([2.0, 1.0, 3.0, 1.0])
        self.class_map_path = self.root / "class-map.json"
        self.class_map_path.write_text(json.dumps({
            "schemaVersion": 1,
            "classes": [{
                "id": "anatomy.liver",
                "name": "Liver",
                "predictionLabel": 1,
                "referenceLabel": 5,
            }],
        }), encoding="utf-8")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def save_volume(self, name: str, data: np.ndarray, affine: np.ndarray | None = None) -> Path:
        path = self.root / name
        image = nib.Nifti1Image(data.astype(np.uint8), affine if affine is not None else self.affine)
        image.set_qform(image.affine, code=1)
        image.set_sform(image.affine, code=1)
        image.header.set_xyzt_units("mm")
        nib.save(image, str(path))
        return path

    def evaluate(self, prediction: Path, reference: Path, case_id: str, reference_type: str = "independent-expert") -> dict:
        return evaluator.evaluate_case(
            prediction,
            reference,
            self.class_map_path,
            case_id=case_id,
            reference_dataset_id="synthetic-external-validation-set-v1",
            reference_type=reference_type,
            model_id="example-model@1.0/task=total",
            preprocessing_description="unit-test discrete labels; geometry-preserving; intensity calibration explicitly specified",
        )

    def test_identical_masks_have_perfect_overlap_and_zero_surface_distance(self) -> None:
        reference = np.zeros((7, 7, 7), dtype=np.uint8)
        reference[2:5, 2:5, 2:5] = 5
        prediction = np.zeros_like(reference)
        prediction[2:5, 2:5, 2:5] = 1
        pred_path = self.save_volume("pred.nii.gz", prediction)
        ref_path = self.save_volume("ref.nii.gz", reference)
        report = self.evaluate(pred_path, ref_path, "case-perfect")
        result = report["results"][0]
        self.assertEqual(result["status"], "evaluated")
        self.assertEqual(result["dice"], 1.0)
        self.assertEqual(result["iou"], 1.0)
        self.assertEqual(result["sensitivity"], 1.0)
        self.assertEqual(result["precision"], 1.0)
        self.assertAlmostEqual(result["surfaceDistances"]["hausdorff95Mm"], 0.0)
        self.assertTrue(report["independentComparisonEligible"])
        self.assertEqual(report["educationalApprovalStatus"], "not-approved")

    def test_surface_distance_uses_physical_spacing_not_voxel_count(self) -> None:
        reference = np.zeros((5, 5, 5), dtype=np.uint8)
        prediction = np.zeros_like(reference)
        reference[1, 2, 2] = 5
        prediction[2, 2, 2] = 1
        pred_path = self.save_volume("pred-shift.nii.gz", prediction)
        ref_path = self.save_volume("ref-shift.nii.gz", reference)
        result = self.evaluate(pred_path, ref_path, "case-shift")["results"][0]
        self.assertEqual(result["dice"], 0.0)
        self.assertAlmostEqual(result["surfaceDistances"]["hausdorff95Mm"], 2.0)
        self.assertAlmostEqual(result["surfaceDistances"]["averageSymmetricSurfaceDistanceMm"], 2.0)

    def test_empty_prediction_is_explicit_failure_not_success(self) -> None:
        reference = np.zeros((5, 5, 5), dtype=np.uint8)
        reference[1:3, 1:3, 1:3] = 5
        prediction = np.zeros_like(reference)
        report = self.evaluate(
            self.save_volume("pred-empty.nii.gz", prediction),
            self.save_volume("ref-present.nii.gz", reference),
            "case-empty-pred",
        )
        result = report["results"][0]
        self.assertEqual(result["status"], "empty-prediction")
        self.assertTrue(result["emptyPredictionFailure"])
        self.assertEqual(result["dice"], 0.0)
        self.assertEqual(result["sensitivity"], 0.0)
        self.assertIsNone(result["precision"])
        self.assertIsNone(result["surfaceDistances"])
        self.assertEqual(len(report["qualityFindings"]), 1)

    def test_both_empty_masks_are_not_counted_as_perfect_dice(self) -> None:
        empty = np.zeros((4, 4, 4), dtype=np.uint8)
        report = self.evaluate(
            self.save_volume("pred-both-empty.nii.gz", empty),
            self.save_volume("ref-both-empty.nii.gz", empty),
            "case-both-empty",
        )
        result = report["results"][0]
        self.assertEqual(result["status"], "both-empty")
        self.assertIsNone(result["dice"])
        self.assertFalse(result["eligibleForDiceSummary"])

    def test_geometry_mismatch_is_rejected_without_resampling(self) -> None:
        data = np.zeros((5, 5, 5), dtype=np.uint8)
        pred_path = self.save_volume("pred-geometry.nii.gz", data)
        shifted_affine = self.affine.copy()
        shifted_affine[0, 3] = 2.0
        ref_path = self.save_volume("ref-geometry.nii.gz", data, shifted_affine)
        pred_image = nib.load(str(pred_path))
        ref_image = nib.load(str(ref_path))
        with self.assertRaisesRegex(evaluator.EvaluationInputError, "affines differ"):
            evaluator.compare_geometry(pred_image, ref_image)

        other_shape = self.save_volume("ref-shape.nii.gz", np.zeros((6, 5, 5), dtype=np.uint8))
        with self.assertRaisesRegex(evaluator.EvaluationInputError, "shape"):
            evaluator.compare_geometry(pred_image, nib.load(str(other_shape)))

    def test_unknown_spatial_units_are_rejected_before_millimetre_metrics(self) -> None:
        path = self.root / "unknown-units.nii.gz"
        image = nib.Nifti1Image(np.zeros((4, 4, 4), dtype=np.uint8), self.affine)
        image.set_qform(self.affine, code=1)
        image.set_sform(self.affine, code=1)
        nib.save(image, str(path))
        with self.assertRaisesRegex(evaluator.EvaluationInputError, "not millimetres"):
            evaluator.load_label_volume(path, "prediction")

    def test_fractional_probability_values_and_sheared_affines_are_rejected(self) -> None:
        probability_path = self.root / "probability.nii.gz"
        probability = np.zeros((4, 4, 4), dtype=np.float32)
        probability[1, 1, 1] = 0.25
        probability_image = nib.Nifti1Image(probability, self.affine)
        probability_image.header.set_xyzt_units("mm")
        nib.save(probability_image, str(probability_path))
        with self.assertRaisesRegex(evaluator.EvaluationInputError, "non-integer values"):
            evaluator.load_label_volume(probability_path, "prediction")

        sheared = self.affine.copy()
        sheared[0, 1] = 0.25
        with self.assertRaisesRegex(evaluator.EvaluationInputError, "non-orthogonal"):
            evaluator._validate_affine(sheared, "test-volume")

    def test_independent_cohort_aggregation_reports_empty_mask_failures(self) -> None:
        reference1 = np.zeros((6, 6, 6), dtype=np.uint8)
        reference1[1:4, 1:4, 1:4] = 5
        reference2 = np.zeros((6, 6, 6), dtype=np.uint8)
        reference2[2:5, 2:5, 2:5] = 5
        exact_prediction = np.zeros_like(reference1)
        exact_prediction[1:4, 1:4, 1:4] = 1
        empty_prediction = np.zeros_like(reference2)
        ref_path1 = self.save_volume("reference-1.nii.gz", reference1)
        ref_path2 = self.save_volume("reference-2.nii.gz", reference2)
        report1 = self.evaluate(self.save_volume("pred-1.nii.gz", exact_prediction), ref_path1, "case-001")
        report2 = self.evaluate(self.save_volume("pred-2.nii.gz", empty_prediction), ref_path2, "case-002")
        path1, path2 = self.root / "case-001.json", self.root / "case-002.json"
        path1.write_text(json.dumps(report1), encoding="utf-8")
        path2.write_text(json.dumps(report2), encoding="utf-8")
        aggregate = aggregator.aggregate_reports([path1, path2])
        cls = aggregate["classes"][0]
        self.assertEqual(aggregate["caseCount"], 2)
        self.assertEqual(cls["referencePresentCases"], 2)
        self.assertEqual(cls["diceCaseCount"], 2)
        self.assertAlmostEqual(cls["dice"]["mean"], 0.5)
        self.assertEqual(cls["emptyPredictionFailuresWhenReferencePresent"], 1)
        self.assertEqual(cls["surfaceDistanceCaseCount"], 1)
        self.assertEqual(aggregate["educationalApprovalStatus"], "not-approved")

    def test_cohort_aggregator_rejects_same_source_reference_and_duplicate_cases(self) -> None:
        data = np.zeros((4, 4, 4), dtype=np.uint8)
        pred_path = self.save_volume("pred-same-source.nii.gz", data)
        ref_path = self.save_volume("ref-same-source.nii.gz", data)
        same_source = self.evaluate(pred_path, ref_path, "case-same-source", "same-source-atlas")
        independent = self.evaluate(pred_path, ref_path, "case-independent")
        p1, p2 = self.root / "same.json", self.root / "independent.json"
        p1.write_text(json.dumps(same_source), encoding="utf-8")
        p2.write_text(json.dumps(independent), encoding="utf-8")
        with self.assertRaisesRegex(aggregator.AggregationInputError, "independent reference"):
            aggregator.aggregate_reports([p1, p2])
        p3 = self.root / "independent-duplicate.json"
        duplicate = dict(independent)
        duplicate["caseId"] = "case-independent"
        p3.write_text(json.dumps(duplicate), encoding="utf-8")
        with self.assertRaisesRegex(aggregator.AggregationInputError, "Duplicate caseId"):
            aggregator.aggregate_reports([p2, p3])

    def test_invalid_class_map_rejects_background_and_duplicate_labels(self) -> None:
        invalid = self.root / "invalid-map.json"
        invalid.write_text(json.dumps({
            "schemaVersion": 1,
            "classes": [
                {"id": "a", "name": "A", "predictionLabel": 0, "referenceLabel": 1},
            ],
        }), encoding="utf-8")
        with self.assertRaisesRegex(evaluator.EvaluationInputError, "zero is background"):
            evaluator.load_class_map(invalid)


if __name__ == "__main__":
    unittest.main()
