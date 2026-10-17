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

import infer_external_ct_volume as inference


class ExternalNiftiInferenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.affine = np.array([
            [-1.2, 0.0, 0.0, 100.0],
            [0.0, 0.8, 0.0, -50.0],
            [0.0, 0.0, -1.5, 20.0],
            [0.0, 0.0, 0.0, 1.0],
        ], dtype=np.float64)
        self.ct = np.full((12, 13, 8), 50, dtype=np.int16)
        self.input_path = self.root / "deidentified-case.nii.gz"
        self.save_nifti(self.input_path, self.ct, self.affine, units="mm")
        self.output_path = self.root / "masks"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def save_nifti(self, path: Path, data: np.ndarray, affine: np.ndarray, units: str | None) -> Path:
        image = nib.Nifti1Image(data, affine)
        image.set_qform(affine, code=1)
        image.set_sform(affine, code=1)
        if units is not None:
            image.header.set_xyzt_units(units)
        nib.save(image, str(path))
        return path

    def fake_model_run(self, command: list[str], **kwargs: object) -> SimpleNamespace:
        input_path = Path(command[command.index("-i") + 1])
        output_path = Path(command[command.index("-o") + 1])
        model_input = nib.load(str(input_path))
        shape = model_input.shape
        # Use separate regions so the combined-label-map order can be checked.
        for target in inference.TARGETS:
            mask = np.zeros(shape, dtype=np.uint8)
            if target["id"] != "kidney_left":
                offset = target["labelId"] - 1
                mask[1 + offset:4 + offset, 2:5, 2:4] = 1
            self.save_nifti(output_path / f"{target['modelClass']}.nii.gz", mask, model_input.affine, "mm")
        return SimpleNamespace(returncode=0, stdout="synthetic model run", stderr="")

    def test_geometry_requires_mm_explicit_spatial_transform_and_orthogonal_axes(self) -> None:
        image = nib.load(str(self.input_path))
        spacing = inference.validate_geometry(image)
        self.assertEqual(tuple(round(value, 4) for value in spacing), (1.2, 0.8, 1.5))

        unknown_path = self.root / "unknown-units.nii.gz"
        self.save_nifti(unknown_path, self.ct, self.affine, units=None)
        with self.assertRaisesRegex(inference.ExternalInferenceError, "not mm"):
            inference.load_source_volume(unknown_path)

        shear = self.affine.copy()
        shear[0, 1] = 0.2
        shear_path = self.root / "sheared.nii.gz"
        self.save_nifti(shear_path, self.ct, shear, units="mm")
        with self.assertRaisesRegex(inference.ExternalInferenceError, "non-orthogonal"):
            inference.load_source_volume(shear_path)

        disagree_path = self.root / "qform-sform-disagree.nii.gz"
        disagree = nib.Nifti1Image(self.ct, self.affine)
        disagree.set_qform(self.affine, code=1)
        different_sform = self.affine.copy()
        different_sform[0, 3] += 5.0
        disagree.set_sform(different_sform, code=1)
        disagree.header.set_xyzt_units("mm")
        nib.save(disagree, str(disagree_path))
        with self.assertRaisesRegex(inference.ExternalInferenceError, "qform and sform disagree"):
            inference.load_source_volume(disagree_path)

    def test_intensity_preprocessing_requires_explicit_semantics(self) -> None:
        raw = np.array([-1024.0, 0.0, 1024.0], dtype=np.float32)
        np.testing.assert_array_equal(
            inference.preprocess_values(raw, 1024, "stored-values-unverified"),
            np.array([-2048.0, -1024.0, 0.0], dtype=np.float32),
        )
        np.testing.assert_array_equal(
            inference.preprocess_values(raw, 0, "hounsfield-units-confirmed"),
            raw,
        )
        with self.assertRaisesRegex(inference.ExternalInferenceError, "use offset 0"):
            inference.preprocess_values(raw, 1024, "hounsfield-units-confirmed")
        with self.assertRaisesRegex(inference.ExternalInferenceError, "Unsupported intensity semantics"):
            inference.preprocess_values(raw, 0, "maybe-HU")
        with self.assertRaisesRegex(inference.ExternalInferenceError, "finite"):
            inference.preprocess_values(raw, float("nan"), "stored-values-unverified")

    def test_inference_publishes_four_masks_with_provenance_and_mm_geometry(self) -> None:
        with patch.object(inference, "model_version", return_value="2.11.0"), \
             patch.object(inference.subprocess, "run", side_effect=self.fake_model_run) as model_run:
            report = inference.run_external_inference(
                self.input_path,
                self.output_path,
                case_id="case-001",
                dataset_id="independent-cohort-v1",
                intensity_offset=0,
                intensity_semantics="hounsfield-units-confirmed",
                preprocessing_notes="Fixture uses calibrated HU values and an explicit orthogonal RAS affine.",
                resolution="fast",
                timeout_seconds=300,
            )
        self.assertEqual(report["status"], "experimental-unreviewed")
        self.assertEqual(report["sourceDimensionsXYZ"], list(self.ct.shape))
        self.assertEqual(report["niftiSpatialUnits"], "mm")
        self.assertEqual(len(report["organs"]), 4)
        self.assertEqual(report["organs"][3]["predictionStatus"], "empty-prediction")
        self.assertGreater(report["labelMap"]["overlapVoxelCount"], 0)
        self.assertEqual(model_run.call_count, 1)
        cmd = model_run.call_args.args[0]
        self.assertIn("--fast", cmd)
        self.assertIn("--roi_subset", cmd)
        self.assertTrue((self.output_path / "manifest.json").is_file())
        self.assertEqual(len(list(self.output_path.glob("*.nii.gz"))), 5)
        saved = nib.load(str(self.output_path / "liver.nii.gz"))
        self.assertEqual(saved.header.get_xyzt_units()[0], "mm")
        self.assertEqual(saved.get_data_dtype(), np.dtype(np.uint8))
        self.assertTrue(np.allclose(saved.affine, self.affine, rtol=0, atol=1e-4))
        stored_manifest = json.loads((self.output_path / "manifest.json").read_text(encoding="utf-8"))
        self.assertNotIn(self.input_path.name, json.dumps(stored_manifest))
        self.assertEqual(stored_manifest["sourceInputSha256"], inference.sha256_file(self.input_path))

    def test_failed_model_run_preserves_previous_output_and_cleans_stage(self) -> None:
        self.output_path.mkdir()
        prior = self.output_path / "manifest.json"
        prior.write_text('{"status":"trusted-prior"}\n', encoding="utf-8")

        def fail_run(command: list[str], **kwargs: object) -> SimpleNamespace:
            return SimpleNamespace(returncode=2, stdout="", stderr="synthetic failure")

        with patch.object(inference, "model_version", return_value="2.11.0"), \
             patch.object(inference.subprocess, "run", side_effect=fail_run):
            with self.assertRaisesRegex(inference.ExternalInferenceError, "exited with status 2"):
                inference.run_external_inference(
                    self.input_path,
                    self.output_path,
                    case_id="case-002",
                    dataset_id="independent-cohort-v1",
                    intensity_offset=0,
                    intensity_semantics="hounsfield-units-confirmed",
                    preprocessing_notes="Test failure containment.",
                )
        self.assertEqual(prior.read_text(encoding="utf-8"), '{"status":"trusted-prior"}\n')
        self.assertEqual([path.name for path in self.root.glob(".masks.staging-*")], [])

    def test_wrong_model_version_and_invalid_case_metadata_fail_before_publication(self) -> None:
        with patch.object(inference, "model_version", return_value="2.10.0"):
            with self.assertRaisesRegex(inference.ExternalInferenceError, "Expected TotalSegmentator 2.11.0"):
                inference.run_external_inference(
                    self.input_path, self.output_path,
                    case_id="case-003", dataset_id="cohort-v1",
                    intensity_offset=0, intensity_semantics="hounsfield-units-confirmed",
                    preprocessing_notes="Version mismatch test.",
                )
        with patch.object(inference, "model_version", return_value="2.11.0"):
            with self.assertRaisesRegex(inference.ExternalInferenceError, "Case ID"):
                inference.run_external_inference(
                    self.input_path, self.output_path,
                    case_id=" ", dataset_id="cohort-v1",
                    intensity_offset=0, intensity_semantics="hounsfield-units-confirmed",
                    preprocessing_notes="Invalid case metadata test.",
                )
            with self.assertRaisesRegex(inference.ExternalInferenceError, "Dataset ID"):
                inference.run_external_inference(
                    self.input_path, self.output_path,
                    case_id="case-004", dataset_id="../patient-folder",
                    intensity_offset=0, intensity_semantics="hounsfield-units-confirmed",
                    preprocessing_notes="Invalid dataset token test.",
                )
        self.assertFalse(self.output_path.exists())


if __name__ == "__main__":
    unittest.main()
