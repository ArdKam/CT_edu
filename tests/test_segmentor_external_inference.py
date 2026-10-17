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
        task_name = command[command.index("--task") + 1]
        subset_index = command.index("--roi_subset") + 1
        model_classes = []
        for token in command[subset_index:]:
            if token.startswith("--"):
                break
            model_classes.append(token)
        selected_targets = inference.resolve_task_classes(task_name, model_classes)
        # Use separate regions so the combined-label-map order can be checked.
        for target in selected_targets:
            mask = np.zeros(shape, dtype=np.uint8)
            if target["modelClass"] != "kidney_left":
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

    def test_class_selection_uses_stable_registry_ids_and_supports_selected_vessels(self) -> None:
        selected = inference.resolve_target_classes(["aorta", "anatomy.liver"])
        self.assertEqual([item["id"] for item in selected], ["anatomy.aorta", "anatomy.liver"])
        self.assertEqual([item["modelClass"] for item in selected], ["aorta", "liver"])
        self.assertEqual([item["labelId"] for item in selected], [1, 2])
        self.assertEqual(selected[0]["anatomicalGroup"], "vessel")
        vertebra = inference.resolve_target_classes(["vertebrae_L5"])
        self.assertEqual(vertebra[0]["id"], "anatomy.vertebrae_l5")
        self.assertEqual(vertebra[0]["modelClass"], "vertebrae_L5",
            "preserve the upstream class spelling rather than lowercasing its model filename")

        with self.assertRaisesRegex(inference.ExternalInferenceError, "more than once"):
            inference.resolve_target_classes(["liver", "anatomy.liver"])
        with self.assertRaisesRegex(inference.ExternalInferenceError, "Unsupported TotalSegmentator"):
            inference.resolve_target_classes(["made_up_organ"])
        with self.assertRaisesRegex(inference.ExternalInferenceError, "'all' must be used alone"):
            inference.resolve_target_classes(["all", "liver"])

    def test_all_class_selection_covers_pinned_total_registry_without_claiming_validation(self) -> None:
        targets = inference.resolve_target_classes(["all"])
        self.assertEqual(len(targets), 117)
        self.assertEqual(len({item["id"] for item in targets}), 117)
        self.assertEqual(len({item["modelClass"] for item in targets}), 117)
        self.assertEqual([item["labelId"] for item in targets], list(range(1, 118)))
        self.assertTrue(any(item["modelClass"] == "aorta" for item in targets))
        self.assertTrue(any(item["modelClass"] == "portal_vein_and_splenic_vein" for item in targets))
        self.assertEqual(inference.resolve_target_classes(None)[0]["id"], "anatomy.liver")
        self.assertEqual(len(inference.resolve_target_classes(None)), 4)

    def test_open_specialist_tasks_expose_vessels_and_block_license_restricted_tasks(self) -> None:
        lung = inference.resolve_task_classes("lung_vessels")
        self.assertEqual([item["modelClass"] for item in lung], ["lung_vessels", "lung_trachea_bronchia"])
        self.assertTrue(all(item["labelId"] in {1, 2} for item in lung))
        carotid = inference.resolve_task_classes("headneck_bones_vessels", ["internal_carotid_artery_right"])
        self.assertEqual(carotid[0]["modelClass"], "internal_carotid_artery_right")
        liver_vessel = inference.resolve_task_classes("liver_vessels", ["liver_vessels"])
        self.assertEqual(liver_vessel[0]["modelClass"], "liver_vessels")
        with self.assertRaisesRegex(inference.ExternalInferenceError, "not enabled"):
            inference.resolve_task_classes("brain_structures", ["brainstem"])
        with self.assertRaisesRegex(inference.ExternalInferenceError, "not enabled"):
            inference.resolve_task_classes("coronary_arteries", ["coronary_arteries"])
        with self.assertRaisesRegex(inference.ExternalInferenceError, "not enabled"):
            inference.resolve_task_classes("heartchambers_highres", ["myocardium"])

    def test_external_inference_runs_an_open_specialist_vessel_task(self) -> None:
        with patch.object(inference, "model_version", return_value="2.11.0"), \
             patch.object(inference.subprocess, "run", side_effect=self.fake_model_run) as model_run:
            report = inference.run_external_inference(
                self.input_path,
                self.output_path,
                case_id="case-lung-vessel-001",
                dataset_id="independent-cohort-v1",
                intensity_offset=0,
                intensity_semantics="hounsfield-units-confirmed",
                preprocessing_notes="Fixture uses calibrated HU values and an explicit orthogonal RAS affine.",
                task="lung_vessels",
                class_names=["lung_vessels"],
                resolution="fast",
                timeout_seconds=300,
            )
        self.assertEqual(report["model"]["task"], "lung_vessels")
        self.assertEqual(report["model"]["taskLicense"], "Apache-2.0")
        self.assertEqual([item["modelClass"] for item in report["organs"]], ["lung_vessels"])
        self.assertEqual(report["labelMap"]["labels"][0]["id"], "anatomy.task.lung_vessels.lung_vessels")
        self.assertTrue((self.output_path / "lung_vessels.nii.gz").is_file())
        command = model_run.call_args.args[0]
        self.assertEqual(command[command.index("--task") + 1], "lung_vessels")
        self.assertEqual(command[command.index("--roi_subset") + 1], "lung_vessels")

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

    def test_external_inference_can_generate_a_selected_vessel_and_organ(self) -> None:
        with patch.object(inference, "model_version", return_value="2.11.0"), \
             patch.object(inference.subprocess, "run", side_effect=self.fake_model_run) as model_run:
            report = inference.run_external_inference(
                self.input_path,
                self.output_path,
                case_id="case-vessel-001",
                dataset_id="independent-cohort-v1",
                intensity_offset=0,
                intensity_semantics="hounsfield-units-confirmed",
                preprocessing_notes="Fixture uses calibrated HU values and an explicit orthogonal RAS affine.",
                class_names=["aorta", "anatomy.liver"],
                resolution="fast",
                timeout_seconds=300,
            )
        self.assertEqual([item["modelClass"] for item in report["organs"]], ["aorta", "liver"])
        self.assertEqual([item["id"] for item in report["organs"]], ["anatomy.aorta", "anatomy.liver"])
        self.assertEqual([item["labelId"] for item in report["labelMap"]["labels"]], [1, 2])
        self.assertTrue((self.output_path / "aorta.nii.gz").is_file())
        self.assertTrue((self.output_path / "liver.nii.gz").is_file())
        command = model_run.call_args.args[0]
        subset = command[command.index("--roi_subset") + 1:command.index("--fast")]
        self.assertEqual(subset, ["aorta", "liver"])

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
