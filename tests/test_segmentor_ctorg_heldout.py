from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import nibabel as nib
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import evaluate_ctorg_heldout as ctorg
import infer_external_ct_volume as inference


AFFINE = np.array([
    [1.0, 0.0, 0.0, -20.0],
    [0.0, 1.0, 0.0, -10.0],
    [0.0, 0.0, 1.5, 12.0],
    [0.0, 0.0, 0.0, 1.0],
], dtype=np.float64)
LUNG_CLASSES = [
    "lung_upper_lobe_left",
    "lung_lower_lobe_left",
    "lung_upper_lobe_right",
    "lung_middle_lobe_right",
    "lung_lower_lobe_right",
]


def reference_labels(case_number: int) -> np.ndarray:
    labels = np.zeros((12, 12, 8), dtype=np.uint8)
    y_shift = case_number % 2
    labels[1:3, 1 + y_shift:3 + y_shift, 1:3] = 1  # liver
    labels[4:6, 1 + y_shift:3 + y_shift, 1:3] = 2  # bladder
    labels[7:11, 1 + y_shift:5 + y_shift, 1:4] = 3  # lungs
    labels[1:4, 6 + y_shift:9 + y_shift, 1:4] = 4  # kidneys
    labels[5:8, 6 + y_shift:9 + y_shift, 1:4] = 5  # broad bone region
    if case_number == 0:
        labels[9:11, 7 + y_shift:9 + y_shift, 1:4] = 6  # brain reference exists only in case 0
    return labels


def save_nifti(path: Path, data: np.ndarray) -> Path:
    image = nib.Nifti1Image(data, AFFINE)
    image.set_qform(AFFINE, code=1)
    image.set_sform(AFFINE, code=1)
    image.header.set_xyzt_units("mm")
    nib.save(image, str(path))
    return path


class CTORGHeldoutEvaluationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.dataset_dir = self.root / "ctorg"
        self.dataset_dir.mkdir()
        self.output_dir = self.root / "reports"
        self.model_calls = 0
        for case_number in (0, 1):
            labels = reference_labels(case_number)
            ct = np.full(labels.shape, 35, dtype=np.int16)
            ct[0, 0, 0] = 20 + case_number  # synthetic case marker outside every reference region
            save_nifti(self.dataset_dir / f"volume-{case_number}.nii.gz", ct)
            save_nifti(self.dataset_dir / f"labels-{case_number}.nii.gz", labels)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def fake_model_run(self, command: list[str], **kwargs: object) -> SimpleNamespace:
        self.model_calls += 1
        model_input = nib.load(command[command.index("-i") + 1])
        output_dir = Path(command[command.index("-o") + 1])
        marker = int(round(float(np.asarray(model_input.dataobj)[0, 0, 0])))
        case_number = marker - 20
        truth = reference_labels(case_number)
        requested: list[str] = []
        subset_index = command.index("--roi_subset") + 1
        for token in command[subset_index:]:
            if token.startswith("--"):
                break
            requested.append(token)

        lung_indices = {name: index for index, name in enumerate(LUNG_CLASSES)}
        lung_voxels = np.argwhere(truth == 3)
        for model_class in requested:
            mask = np.zeros(truth.shape, dtype=np.uint8)
            if model_class == "liver":
                mask = (truth == 1).astype(np.uint8)
            elif model_class == "urinary_bladder":
                mask = (truth == 2).astype(np.uint8)
            elif model_class in lung_indices:
                for index, coord in enumerate(lung_voxels):
                    if index % len(LUNG_CLASSES) == lung_indices[model_class]:
                        mask[tuple(coord)] = 1
            elif model_class == "kidney_left":
                mask[(truth == 4) & (np.indices(truth.shape)[0] <= 2)] = 1
            elif model_class == "kidney_right":
                mask[(truth == 4) & (np.indices(truth.shape)[0] > 2)] = 1
            elif model_class == "sacrum":
                mask = (truth == 5).astype(np.uint8)
            elif model_class == "brain":
                mask = (truth == 6).astype(np.uint8)
            output_image = nib.Nifti1Image(mask, model_input.affine)
            output_image.set_qform(model_input.affine, code=1)
            output_image.set_sform(model_input.affine, code=1)
            output_image.header.set_xyzt_units("mm")
            output_image.header.set_data_dtype(np.uint8)
            nib.save(output_image, str(output_dir / f"{model_class}.nii.gz"))
        return SimpleNamespace(returncode=0, stdout="synthetic model run", stderr="")

    def test_only_official_test_split_case_numbers_are_allowed(self) -> None:
        self.assertEqual(ctorg.validate_case_ids([20, 0, 1]), [0, 1, 20])
        for invalid in ([21], [0, 21], [0, 0], []):
            with self.subTest(invalid=invalid):
                with self.assertRaises(ctorg.CTORGValidationError):
                    ctorg.validate_case_ids(invalid)

    def test_grouped_class_mapping_is_explicit_and_contains_no_vessel_claim(self) -> None:
        groups, all_classes = ctorg.resolve_ctorg_groups()
        self.assertEqual(groups["liver"]["referenceLabel"], 1)
        self.assertEqual(groups["bladder"]["referenceLabel"], 2)
        self.assertEqual(groups["lungs"]["referenceLabel"], 3)
        self.assertEqual(groups["kidneys"]["referenceLabel"], 4)
        self.assertEqual(groups["bones"]["referenceLabel"], 5)
        self.assertEqual(groups["brain"]["referenceLabel"], 6)
        self.assertIn("lung-lobe", groups["lungs"]["ontologyNote"])
        self.assertIn("approximate", groups["bones"]["ontologyNote"])
        self.assertNotIn("costal_cartilages", all_classes)
        self.assertIn("sacrum", groups["bones"]["modelClasses"])
        self.assertEqual(len(all_classes), len(set(all_classes)))

    def test_two_case_external_report_run_aggregates_groups_and_skips_unannotated_brain(self) -> None:
        with patch.object(inference, "model_version", return_value="2.11.0"), \
             patch.object(inference.subprocess, "run", side_effect=self.fake_model_run):
            index = ctorg.run_ctorg_heldout_evaluation(
                self.dataset_dir,
                self.output_dir,
                case_ids=[0, 1],
                resolution="fast",
                timeout_seconds=30,
            )
        self.assertEqual(index["caseCountRequested"], 2)
        self.assertEqual(index["caseCountProcessed"], 2)
        self.assertEqual(index["caseCountFailedOrPartial"], 0)
        self.assertFalse(index["limitations"] == [])
        self.assertFalse(index["model"].get("vesselEvaluationIncluded", True) is True)
        for group_id in ["liver", "bladder", "lungs", "kidneys", "bones"]:
            self.assertEqual(index["groups"][group_id]["status"], "aggregated")
            self.assertEqual(index["groups"][group_id]["evaluatedCaseCount"], 2)
            report_path = self.output_dir / index["groups"][group_id]["summaryReport"]
            report = json.loads(report_path.read_text(encoding="utf-8"))
            self.assertEqual(report["educationalApprovalStatus"], "not-approved")
            self.assertTrue(report["independentComparisonEligible"])
            self.assertAlmostEqual(report["classes"][0]["dice"]["mean"], 1.0)
        self.assertEqual(index["groups"]["brain"]["status"], "insufficient-independent-cases")
        self.assertEqual(index["groups"]["brain"]["evaluatedCaseCount"], 1)
        self.assertEqual(index["cases"][1]["skippedGroups"][0]["groupId"], "brain")
        self.assertEqual(self.model_calls, 2)
        stored_index = json.loads((self.output_dir / "index.json").read_text(encoding="utf-8"))
        self.assertEqual(stored_index["dataset"]["officialTestSplit"], "case numbers 0-20")
        self.assertEqual(list(self.output_dir.rglob("*.nii.gz")), [],
            "source CTs, references, and generated mask volumes must not be retained in the reports directory")
        self.assertFalse(list(self.output_dir.rglob("prediction-*.nii.gz")))

    def test_refuses_to_overwrite_prior_report_directory(self) -> None:
        self.output_dir.mkdir()
        marker = self.output_dir / "keep.json"
        marker.write_text('{"keep":true}', encoding="utf-8")
        with self.assertRaisesRegex(ctorg.CTORGValidationError, "new or empty"):
            ctorg.run_ctorg_heldout_evaluation(self.dataset_dir, self.output_dir, case_ids=[0, 1])
        self.assertTrue(marker.is_file())


if __name__ == "__main__":
    unittest.main()
