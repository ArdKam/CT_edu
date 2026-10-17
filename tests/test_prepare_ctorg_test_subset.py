from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import prepare_ctorg_test_subset as subset


class CTORGSubsetPreparationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.volumes_zip = self.root / "volumes.zip"
        self.labels_zip = self.root / "labels.zip"
        self.output = self.root / "selected"
        with zipfile.ZipFile(self.volumes_zip, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("CT-ORG/volume-0.nii.gz", b"fake-nifti-volume-0")
            archive.writestr("CT-ORG/volume-1.nii.gz", b"fake-nifti-volume-1")
            archive.writestr("CT-ORG/volume-21.nii.gz", b"must-not-be-extracted")
            archive.writestr("README.txt", b"metadata")
        with zipfile.ZipFile(self.labels_zip, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("CT-ORG/labels-0.nii.gz", b"fake-nifti-labels-0")
            archive.writestr("CT-ORG/labels-1.nii.gz", b"fake-nifti-labels-1")
            archive.writestr("CT-ORG/labels-21.nii.gz", b"must-not-be-extracted")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_extracts_only_selected_heldout_test_members_and_records_hashes(self) -> None:
        result = subset.extract_ctorg_test_subset(
            self.volumes_zip, self.labels_zip, self.output, case_ids=[1, 0]
        )
        self.assertEqual(result["officialSplit"], "test")
        self.assertEqual(result["officialTestCaseNumbers"], [0, 1])
        self.assertEqual(result["selectedCaseCount"], 2)
        self.assertTrue((self.output / "volume-0.nii.gz").is_file())
        self.assertTrue((self.output / "labels-1.nii.gz").is_file())
        self.assertFalse((self.output / "volume-21.nii.gz").exists())
        self.assertFalse((self.output / "labels-21.nii.gz").exists())
        self.assertEqual(
            hashlib.sha256((self.output / "volume-0.nii.gz").read_bytes()).hexdigest(),
            result["extractedFiles"][0]["volume"]["sha256"],
        )
        stored = json.loads((self.output / "subset-manifest.json").read_text(encoding="utf-8"))
        self.assertIn("CC BY 3.0", stored["license"])
        self.assertIn("10.7937/tcia.2019.tt7f4v7o", stored["sourceDataCitation"])
        self.assertEqual(len(list(self.output.glob("*.nii.gz"))), 4)
        self.assertEqual(len(list(self.root.glob(".selected.staging-*"))), 0)

    def test_only_official_test_case_numbers_are_allowed(self) -> None:
        for invalid in ([21], [0, 21], [0, 0], []):
            with self.subTest(invalid=invalid):
                with self.assertRaises(subset.CTORGArchiveError):
                    subset.extract_ctorg_test_subset(
                        self.volumes_zip, self.labels_zip, self.output, case_ids=invalid
                    )
                self.assertFalse(self.output.exists())

    def test_duplicate_archive_basename_fails_without_leaving_partial_output(self) -> None:
        duplicate_zip = self.root / "duplicate-volumes.zip"
        with zipfile.ZipFile(duplicate_zip, "w") as archive:
            archive.writestr("a/volume-0.nii.gz", b"volume A")
            archive.writestr("b/volume-0.nii.gz", b"volume B")
        with self.assertRaisesRegex(subset.CTORGArchiveError, "exactly one safe archive member"):
            subset.extract_ctorg_test_subset(
                duplicate_zip, self.labels_zip, self.output, case_ids=[0]
            )
        self.assertFalse((self.output / "volume-0.nii.gz").exists())
        self.assertFalse(self.output.exists())
        self.assertEqual(len(list(self.root.glob(".selected.staging-*"))), 0)

    def test_nonempty_output_directory_is_never_overwritten(self) -> None:
        self.output.mkdir()
        sentinel = self.output / "keep.txt"
        sentinel.write_text("do not overwrite", encoding="utf-8")
        with self.assertRaisesRegex(subset.CTORGArchiveError, "new or empty"):
            subset.extract_ctorg_test_subset(self.volumes_zip, self.labels_zip, self.output, case_ids=[0])
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "do not overwrite")


if __name__ == "__main__":
    unittest.main()
