#!/usr/bin/env python3
"""Generate experimental TotalSegmentator masks for four major abdominal organs.

This runs in GitHub Actions, not in the browser. Outputs are preview-only and
must not be treated as clinically validated segmentations.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from importlib.metadata import version as installed_package_version
import sys
import tempfile
import zipfile
from pathlib import Path

import nibabel as nib
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_demo_assets import has_type, read_nrrd

ARCHIVE_GLOB = "abacktools-abdomen-2016-09-part*-of6.zip"
TARGETS = [
    {"key": "liver", "model_name": "liver", "source_name": "liver", "color": "#d96d52",
     "name_en": "Liver", "name_fa": "کبد"},
    {"key": "spleen", "model_name": "spleen", "source_name": "spleen", "color": "#bd83bf",
     "name_en": "Spleen", "name_fa": "طحال"},
    {"key": "kidney_right", "model_name": "kidney_right", "source_name": "right kidney", "color": "#4c9f91",
     "name_en": "Right kidney", "name_fa": "کلیهٔ راست"},
    {"key": "kidney_left", "model_name": "kidney_left", "source_name": "left kidney", "color": "#7398d6",
     "name_en": "Left kidney", "name_fa": "کلیهٔ چپ"},
]


def read_source_members() -> dict[str, bytes]:
    archives = sorted(Path(".").glob(ARCHIVE_GLOB))
    if len(archives) != 6:
        raise SystemExit(f"Expected 6 SPL atlas ZIP parts, found {len(archives)}.")
    wanted = {"i.nrrd", "seg.nrrd", "atlasstructure.json"}
    found: dict[str, bytes] = {}
    for archive in archives:
        with zipfile.ZipFile(archive) as source:
            bad_member = source.testzip()
            if bad_member:
                raise SystemExit(f"ZIP CRC failure in {archive.name}:{bad_member}")
            for info in source.infolist():
                base = Path(info.filename).name.lower()
                if base in wanted and base not in found:
                    found[base] = source.read(info.filename)
    missing = wanted - found.keys()
    if missing:
        raise SystemExit("Missing SPL atlas member(s): " + ", ".join(sorted(missing)))
    return found


def geometry_affine_ras(header: dict[str, str]) -> np.ndarray:
    """Convert the known orthogonal SPL NRRD directions from LPS to NIfTI RAS."""
    expected_space = header.get("space", "").strip().lower()
    if expected_space not in {"left-posterior-superior", "lps"}:
        raise ValueError(f"Unexpected source coordinate space: {expected_space!r}")
    sizes = tuple(int(v) for v in header["sizes"].split())
    if sizes != (256, 256, 113):
        raise ValueError(f"Unexpected SPL volume dimensions: {sizes!r}")

    import re
    vectors = re.findall(r"\(([^)]+)\)", header["space directions"])
    if len(vectors) != 3:
        raise ValueError("Could not parse NRRD space directions.")
    dirs_lps = np.array([[float(v) for v in vector.split(",")] for vector in vectors], dtype=np.float64).T
    origin_lps = np.array([float(v) for v in re.findall(r"[-+]?\d+(?:\.\d*)?(?:[eE][-+]?\d+)?", header["space origin"])], dtype=np.float64)
    if dirs_lps.shape != (3, 3) or origin_lps.shape != (3,):
        raise ValueError("Malformed NRRD spatial geometry.")
    lps_to_ras = np.diag([-1.0, -1.0, 1.0])
    directions_ras = lps_to_ras @ dirs_lps
    origin_ras = lps_to_ras @ origin_lps
    affine = np.eye(4, dtype=np.float64)
    affine[:3, :3] = directions_ras
    affine[:3, 3] = origin_ras
    if not np.isfinite(affine).all() or abs(np.linalg.det(affine[:3, :3])) < 1e-8:
        raise ValueError("Invalid or singular source affine.")
    return affine


def get_source_structure_ids(metadata: list[dict]) -> dict[str, int]:
    wanted = {item["source_name"].casefold(): item["key"] for item in TARGETS}
    result: dict[str, int] = {}
    for node in metadata:
        if not has_type(node, "Structure"):
            continue
        annotation = node.get("annotation", {})
        name = str(annotation.get("name", "")).strip().casefold()
        if name not in wanted:
            continue
        selectors = node.get("sourceSelector", [])
        selector = next((s for s in selectors
                         if has_type(s, "LabelMapSelector") and s.get("authoritative")), None)
        if selector:
            result[wanted[name]] = int(selector["dataKey"])
    missing = {item["key"] for item in TARGETS} - result.keys()
    if missing:
        raise ValueError("Could not find reference label IDs for: " + ", ".join(sorted(missing)))
    return result


def save_binary_mask(mask_xyz: np.ndarray, path: Path) -> None:
    """Save an axial mask in the same row-flipped orientation as CT Edu's CT PNG."""
    z_index = int(path.stem.rsplit("-", 1)[1])
    if z_index < 0 or z_index >= mask_xyz.shape[2]:
        raise ValueError(f"Invalid axial slice index in {path.name}")
    displayed = np.flipud(mask_xyz[:, :, z_index].T.astype(np.uint8) * 255)
    Image.fromarray(displayed, mode="L").save(path, optimize=True)


def save_coronal_mask(mask_xyz: np.ndarray, path: Path) -> None:
    """Save a coronal mask as rows=z, columns=x, matching the CT volume builder."""
    y_index = int(path.stem.rsplit("-", 1)[1])
    if y_index < 0 or y_index >= mask_xyz.shape[1]:
        raise ValueError(f"Invalid coronal slice index in {path.name}")
    displayed = mask_xyz[:, y_index, :].T.astype(np.uint8) * 255
    Image.fromarray(displayed, mode="L").save(path, optimize=True)


def save_sagittal_mask(mask_xyz: np.ndarray, path: Path) -> None:
    """Save a sagittal mask as rows=z, columns=flipped-y, matching CT Edu's CT PNG."""
    x_index = int(path.stem.rsplit("-", 1)[1])
    if x_index < 0 or x_index >= mask_xyz.shape[0]:
        raise ValueError(f"Invalid sagittal slice index in {path.name}")
    displayed = np.fliplr(mask_xyz[x_index, :, :].T.astype(np.uint8) * 255)
    Image.fromarray(displayed, mode="L").save(path, optimize=True)


def dice_score(prediction_zyx: np.ndarray, reference_zyx: np.ndarray) -> float | None:
    pred = np.asarray(prediction_zyx, dtype=bool)
    ref = np.asarray(reference_zyx, dtype=bool)
    pred_count = int(pred.sum())
    ref_count = int(ref.sum())
    if pred_count + ref_count == 0:
        return None
    return float(2 * np.logical_and(pred, ref).sum() / (pred_count + ref_count))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="preview/assets/organ-predictions")
    parser.add_argument("--intensity-offset", type=float, default=1024.0,
                        help="Subtract this experimental stored-value offset before model inference.")
    parser.add_argument("--fast", action="store_true", default=True,
                        help="Use the lower-resolution TotalSegmentator model for CPU feasibility.")
    args = parser.parse_args()

    if not np.isfinite(args.intensity_offset) or not (-10000 <= args.intensity_offset <= 10000):
        raise SystemExit("--intensity-offset must be a finite value between -10000 and 10000.")

    print("Reading source SPL CT, reference labelmap, and anatomy metadata from the six ZIP parts.", flush=True)
    found = read_source_members()
    ct_header, source_ct = read_nrrd(found["i.nrrd"])
    label_header, source_labels = read_nrrd(found["seg.nrrd"])
    geometry_keys = ("space", "sizes", "space directions", "space origin")
    mismatch = {key: (ct_header.get(key), label_header.get(key))
                for key in geometry_keys if ct_header.get(key) != label_header.get(key)}
    if mismatch:
        raise SystemExit("Source CT/reference label geometry mismatch: " + json.dumps(mismatch))
    if source_ct.shape != (113, 256, 256) or source_labels.shape != source_ct.shape:
        raise SystemExit(f"Unexpected source arrays: CT={source_ct.shape}, labels={source_labels.shape}")

    metadata = json.loads(found["atlasstructure.json"].decode("utf-8"))
    reference_ids = get_source_structure_ids(metadata)
    affine = geometry_affine_ras(ct_header)
    # The asset builder uses raw window level 1064, suggesting a +1024 storage
    # offset from a conventional soft-tissue level of 40. The source calibration
    # has not been independently verified, so this remains an explicit hypothesis.
    model_values = np.transpose(source_ct.astype(np.float32) - args.intensity_offset, (2, 1, 0))
    if not np.isfinite(model_values).all():
        raise SystemExit("Source volume has non-finite values.")
    if float(np.percentile(model_values, 0.1)) < -1300 or float(np.percentile(model_values, 99.9)) > 5000:
        raise SystemExit("Converted intensity distribution is outside the guarded experimental range.")

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    for old in output.glob("*.png"):
        old.unlink()
    for old in output.glob("*.nii*"):
        old.unlink()
    for old in output.glob("manifest.json"):
        old.unlink()

    with tempfile.TemporaryDirectory(prefix="ctedu-organ-seg-") as temp_dir:
        temp = Path(temp_dir)
        input_path = temp / "spl-abdomen-model-input.nii.gz"
        output_dir = temp / "totalsegmentator-output"
        output_dir.mkdir()
        image = nib.Nifti1Image(model_values.astype(np.float32), affine)
        image.set_qform(affine, code=1)
        image.set_sform(affine, code=1)
        image.header.set_xyzt_units("mm")
        image.header.set_data_dtype(np.float32)
        nib.save(image, str(input_path))

        command = [
            "TotalSegmentator", "-i", str(input_path), "-o", str(output_dir),
            "--task", "total", "--device", "cpu", "--fast",
            "--nr_thr_resamp", "1", "--nr_thr_saving", "1",
            "--roi_subset", "liver", "spleen", "kidney_left", "kidney_right",
        ]
        if not shutil.which("TotalSegmentator"):
            raise SystemExit("TotalSegmentator executable was not found after installation.")
        print("Running TotalSegmentator CPU inference for liver, spleen, and both kidneys.", flush=True)
        print("Command: " + " ".join(command), flush=True)
        subprocess.run(command, check=True, timeout=90 * 60)

        from nibabel.processing import resample_from_to
        from nibabel.affines import voxel_sizes
        target = (image.shape, image.affine)
        organ_records = []
        masks_xyz = {}
        for item in TARGETS:
            predicted_path = output_dir / (item["model_name"] + ".nii.gz")
            if not predicted_path.is_file():
                raise SystemExit("Expected model output is missing: " + predicted_path.name)
            pred_img = nib.load(str(predicted_path))
            aligned_img = resample_from_to(pred_img, target, order=0)
            pred_xyz = np.asarray(aligned_img.dataobj) > 0.5
            if pred_xyz.shape != image.shape:
                raise SystemExit(f"Resampled mask shape mismatch for {item['key']}: {pred_xyz.shape}")
            count = int(pred_xyz.sum())
            if count == 0:
                raise SystemExit("Model produced an empty mask for " + item["key"])
            pred_zyx = np.transpose(pred_xyz, (2, 1, 0))
            reference_zyx = source_labels == reference_ids[item["key"]]
            score = dice_score(pred_zyx, reference_zyx)
            if not np.array_equal(pred_zyx.shape, source_labels.shape):
                raise SystemExit("Prediction/reference array shape mismatch for " + item["key"])

            pattern = item["key"] + "-{index:03d}.png"
            coronal_pattern = item["key"] + "-coronal-{index:03d}.png"
            sagittal_pattern = item["key"] + "-sagittal-{index:03d}.png"
            for k in range(source_ct.shape[0]):
                save_binary_mask(pred_xyz, output / pattern.format(index=k))
            for y_index in range(source_ct.shape[1]):
                save_coronal_mask(pred_xyz, output / coronal_pattern.format(index=y_index))
            for x_index in range(source_ct.shape[0]):
                save_sagittal_mask(pred_xyz, output / sagittal_pattern.format(index=x_index))

            # Keep the actual 3D mask in the source volume's voxel grid as well
            # as the 2D display stack. This preserves affine/spacing for later
            # multi-plane viewing and mask correction.
            mask_volume_file = item["key"] + ".nii.gz"
            mask_volume = nib.Nifti1Image(pred_xyz.astype(np.uint8), affine)
            mask_volume.set_qform(affine, code=1)
            mask_volume.set_sform(affine, code=1)
            mask_volume.header.set_data_dtype(np.uint8)
            nib.save(mask_volume, str(output / mask_volume_file))
            masks_xyz[item["key"]] = pred_xyz

            nonempty_slices = [int(k) for k in range(pred_zyx.shape[0]) if bool(pred_zyx[k].any())]
            organ_records.append({
                "id": item["key"],
                "modelClass": item["model_name"],
                "nameEn": item["name_en"],
                "nameFa": item["name_fa"],
                "color": item["color"],
                "maskPattern": pattern,
                "maskPatterns": {
                    "axial": pattern,
                    "coronal": coronal_pattern,
                    "sagittal": sagittal_pattern,
                },
                "maskVolumeFile": mask_volume_file,
                "volumeLabelId": TARGETS.index(item) + 1,
                "voxels": count,
                "nonEmptySlices": nonempty_slices,
                "referenceLabelId": reference_ids[item["key"]],
                "diceAgainstBundledAtlasLabel": round(score, 5) if score is not None else None,
                "reviewStatus": "unreviewed-model-output",
            })
            print(f"RESULT organ={item['key']} voxels={count} "
                  f"reference_label_id={reference_ids[item['key']]} "
                  f"dice_vs_atlas={score if score is not None else 'n/a'} "
                  f"nonempty_slices={len(nonempty_slices)}", flush=True)

    # Build a combined integer label map for workflows that need one 3D
    # volume. Separate per-organ NIfTI files remain authoritative if masks
    # overlap; this combined map uses the declared order and records overlaps.
    mask_stack = np.stack([masks_xyz[item["key"]] for item in TARGETS], axis=0)
    overlap_voxel_count = int(np.count_nonzero(mask_stack.sum(axis=0) > 1))
    combined_xyz = np.zeros(image.shape, dtype=np.uint8)
    combined_labels = []
    for label_id, item in enumerate(TARGETS, start=1):
        combined_xyz[masks_xyz[item["key"]]] = label_id
        combined_labels.append({
            "labelId": label_id,
            "organId": item["key"],
            "nameEn": item["name_en"],
            "nameFa": item["name_fa"],
            "color": item["color"],
        })
    labelmap_file = "major-organ-labelmap.nii.gz"
    combined_volume = nib.Nifti1Image(combined_xyz, affine)
    combined_volume.set_qform(affine, code=1)
    combined_volume.set_sform(affine, code=1)
    combined_volume.header.set_data_dtype(np.uint8)
    nib.save(combined_volume, str(output / labelmap_file))

    manifest = {
        "schemaVersion": 1,
        "status": "experimental-unreviewed",
        "sourceDataset": "SPL Abdominal Atlas",
        "sourceDimensionsXYZ": [256, 256, 113],
        "sourceArrayOrder": "zyx",
        "coordinateSystem": "RAS after conversion from NRRD LPS",
        "affineRAS": [[float(value) for value in row] for row in affine],
        "originRASMm": [float(value) for value in affine[:3, 3]],
        "sourceNRRDGeometry": {
            "space": ct_header.get("space"),
            "sizesXYZ": ct_header.get("sizes"),
            "spaceDirectionsLPS": ct_header.get("space directions"),
            "spaceOriginLPS": ct_header.get("space origin"),
            "sourceArrayOrder": "zyx",
        },
        "spacingMm": [float(v) for v in voxel_sizes(affine)],
        "sourceIntensitySemantics": "Stored source intensities; independent HU calibration is not confirmed.",
        "preprocessing": {
            "operation": "subtract-stored-value-offset",
            "offset": float(args.intensity_offset),
            "reason": "The legacy preview window level is 1064; a +1024 offset is an experimental assumption, not independently verified HU calibration.",
        },
        "model": {
            "name": "TotalSegmentator",
            "version": installed_package_version("TotalSegmentator"),
            "task": "total",
            "device": "cpu",
            "resolution": "fast/3mm",
            "requestedClasses": [item["model_name"] for item in TARGETS],
        },
        "maskImageSize": [256, 256],
        "planeDefinitions": {
            "axial": {
                "sliceCount": int(source_ct.shape[0]),
                "imageSize": [int(source_ct.shape[2]), int(source_ct.shape[1])],
                "indexAxis": "z",
                "displayOrientation": "rows flipped so anterior is at the top",
            },
            "coronal": {
                "sliceCount": int(source_ct.shape[1]),
                "imageSize": [int(source_ct.shape[2]), int(source_ct.shape[0])],
                "indexAxis": "y",
                "displayOrientation": "columns x, rows z, superior at the top",
            },
            "sagittal": {
                "sliceCount": int(source_ct.shape[2]),
                "imageSize": [int(source_ct.shape[1]), int(source_ct.shape[0])],
                "indexAxis": "x",
                "displayOrientation": "columns y flipped, rows z, superior at the top",
            },
        },
        "maskFormat": "8-bit grayscale PNG; 0=background, 255=inside predicted organ. Each plane follows the matching CT Edu reformatted slice orientation.",
        "labelMap": {
            "file": labelmap_file,
            "format": "NIfTI-1, uint8",
            "dimensionsXYZ": [int(v) for v in image.shape],
            "backgroundLabelId": 0,
            "labels": combined_labels,
            "overlapVoxelCount": overlap_voxel_count,
            "overlapPolicy": "Separate per-organ masks are authoritative; the combined label map applies the declared label order when voxels overlap.",
        },
        "metricsNote": "Dice values compare model predictions with the atlas's bundled labels on this same volume. They are a technical reference comparison, not an independent benchmark or clinical accuracy claim.",
        "organs": organ_records,
        "warning": "Preview only. These are model-generated, unreviewed educational candidates; not for diagnosis or clinical decisions.",
    }
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    expected_pngs = len(TARGETS) * (
        source_ct.shape[2] + source_ct.shape[1] + source_ct.shape[0]
    )
    actual_pngs = len(list(output.glob("*.png")))
    if actual_pngs != expected_pngs:
        raise SystemExit(f"Expected {expected_pngs} three-plane organ-mask PNGs, found {actual_pngs}.")
    actual_nifti = len(list(output.glob("*.nii.gz")))
    expected_nifti = len(TARGETS) + 1
    if actual_nifti != expected_nifti:
        raise SystemExit(f"Expected {expected_nifti} NIfTI mask files, found {actual_nifti}.")
    print(f"SEGMENTATION_OUTPUT_OK pngs={actual_pngs} nifti={actual_nifti} manifest={output / 'manifest.json'}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
