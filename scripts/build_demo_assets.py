#!/usr/bin/env python3
"""Build a tiny, review-only CT/labelmap sample from the atlas ZIPs.

The original ZIPs are read in place; nothing is extracted back into the repository.
Output is a one-slice PNG + lossless RGB-encoded label IDs and a human-readable preview.
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ARCHIVE_GLOB = "abacktools-abdomen-2016-09-part*-of6.zip"
TARGETS = [
    "liver", "spleen", "right kidney", "left kidney", "aorta",
    "inferior vena cava", "pancreas", "stomach and duodenum",
    "right psoas muscle", "left psoas muscle", "Lumbar4", "gallbladder",
]
CORE = {"liver", "spleen", "right kidney", "left kidney", "aorta", "inferior vena cava", "Lumbar4"}


def read_nrrd(raw: bytes):
    match = re.search(b"\r?\n\r?\n", raw)
    if not match:
        raise ValueError("NRRD header separator not found")
    header_bytes = raw[:match.start()]
    payload = raw[match.end():]
    header = {}
    for line in header_bytes.decode("ascii", errors="replace").splitlines():
        if ":" in line and not line.lstrip().startswith("#"):
            key, value = line.split(":", 1)
            header[key.strip().lower()] = value.strip()
    sizes = tuple(int(v) for v in header["sizes"].split())
    dtype_name = header["type"].lower()
    dtypes = {"short": "i2", "int16": "i2", "ushort": "u2", "unsigned short": "u2"}
    if dtype_name not in dtypes:
        raise ValueError("Unsupported NRRD type: " + dtype_name)
    endian = ">" if header.get("endian", "little").lower() == "big" else "<"
    encoding = header.get("encoding", "raw").lower()
    if encoding in {"gzip", "gz"}:
        payload = gzip.decompress(payload)
    elif encoding not in {"raw", "txt", "text", "ascii"}:
        raise ValueError("Unsupported NRRD encoding: " + encoding)
    if encoding in {"txt", "text", "ascii"}:
        raise ValueError("Text NRRD encoding is not supported for this atlas volume")
    expected = int(np.prod(sizes)) * np.dtype(endian + dtypes[dtype_name]).itemsize
    if len(payload) != expected:
        raise ValueError("Payload size mismatch: expected %d, received %d" % (expected, len(payload)))
    # NRRD dimension 0 is fastest varying, so a 3-D volume is (z, y, x) in NumPy.
    volume = np.frombuffer(payload, dtype=np.dtype(endian + dtypes[dtype_name])).reshape(tuple(reversed(sizes))).copy()
    return header, volume


def has_type(node, expected):
    kinds = node.get("@type", [])
    return expected in kinds if isinstance(kinds, list) else expected in str(kinds)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="build/ct-demo-slice", help="Output directory")
    parser.add_argument("--window", type=float, default=400, help="CT soft-tissue window width")
    parser.add_argument("--level", type=float, default=1064, help="CT raw soft-tissue window level (atlas values are stored with a positive offset)")
    args = parser.parse_args()

    archives = sorted(Path(".").glob(ARCHIVE_GLOB))
    if not archives:
        raise SystemExit("No atlas ZIP archives found in the repository root.")
    wanted = {"i.nrrd", "seg.nrrd", "atlasstructure.json"}
    found = {}
    member_names = {}
    for path in archives:
        with zipfile.ZipFile(path) as zf:
            for info in zf.infolist():
                base = Path(info.filename).name.lower()
                if base in wanted and base not in found:
                    found[base] = zf.read(info.filename)
                    member_names[base] = path.name + ":" + info.filename
    missing = wanted - set(found)
    if missing:
        raise SystemExit("Missing required atlas member(s): " + ", ".join(sorted(missing)))

    image_header, image_volume = read_nrrd(found["i.nrrd"])
    label_header, label_volume = read_nrrd(found["seg.nrrd"])
    if image_volume.shape != label_volume.shape:
        raise SystemExit("CT/label volume shapes differ: %r vs %r" % (image_volume.shape, label_volume.shape))
    geometry_keys = ("space", "sizes", "space directions", "space origin")
    mismatches = {key: (image_header.get(key), label_header.get(key))
                  for key in geometry_keys if image_header.get(key) != label_header.get(key)}
    if mismatches:
        raise SystemExit("CT/label header geometry mismatch: " + json.dumps(mismatches, indent=2))

    metadata = json.loads(found["atlasstructure.json"].decode("utf-8"))
    structures = []
    for node in metadata:
        if not has_type(node, "Structure"):
            continue
        selectors = node.get("sourceSelector", [])
        selector = next((s for s in selectors if has_type(s, "LabelMapSelector") and s.get("authoritative")), None)
        if not selector:
            continue
        color_text = node.get("renderOption", {}).get("color", "rgb(160,180,190)")
        rgb = tuple(int(v) for v in re.findall(r"\d+", color_text)[:3])
        name = node.get("annotation", {}).get("name", node.get("@id", "").lstrip("#"))
        structures.append({
            "id": int(selector["dataKey"]),
            "name": str(name),
            "color": list(rgb if len(rgb) == 3 else (160, 180, 190)),
        })

    by_name = {item["name"].casefold(): item for item in structures}
    target_items = [by_name[name.casefold()] for name in TARGETS if name.casefold() in by_name]
    if len(target_items) < 7:
        raise SystemExit("Too few target structures resolved in atlasStructure.json: " +
                         ", ".join(item["name"] for item in target_items))
    label_ids = [int(item["id"]) for item in target_items]
    names_by_id = {int(item["id"]): item["name"] for item in structures}
    present_ids = set(int(v) for v in np.unique(label_volume))
    absent = [item["name"] for item in target_items if item["id"] not in present_ids]
    if absent:
        raise SystemExit("Target labels absent from segmentation volume: " + ", ".join(absent))

    # Pick a slice where the greatest number of named structures coexist.
    # Core abdominal landmarks receive higher weight; label masks need at least 8 pixels to count.
    z_records = []
    for z in range(label_volume.shape[0]):
        slice_labels = label_volume[z]
        area = {item["id"]: int(np.count_nonzero(slice_labels == item["id"])) for item in target_items}
        present = [item for item in target_items if area[item["id"]] >= 8]
        core_count = sum(1 for item in present if item["name"] in CORE)
        total_area = sum(area.values())
        score = core_count * 1000 + len(present) * 100 + min(total_area, 99999) / 100000
        z_records.append({"slice_index": z, "score": score, "core_count": core_count,
                          "target_count": len(present), "target_pixel_count": total_area,
                          "present": [item["name"] for item in present],
                          "pixel_counts": {item["name"]: area[item["id"]] for item in target_items}})
    z_records.sort(key=lambda item: (item["score"], item["target_pixel_count"]), reverse=True)
    chosen = z_records[0]["slice_index"]
    ct = image_volume[chosen].astype(np.float32)
    seg = label_volume[chosen].astype(np.int32)

    # Convert NRRD's LPS array layout to the standard axial screen convention:
    # index 0 runs from patient right toward patient left (left-to-right on screen);
    # the second axis runs posterior-to-anterior and is flipped so anterior is at the top.
    ct = np.flipud(ct)
    seg = np.flipud(seg)

    lo = args.level - args.window / 2
    hi = args.level + args.window / 2
    ct8 = np.clip((ct - lo) / (hi - lo) * 255, 0, 255).astype(np.uint8)
    ct_rgb = np.repeat(ct8[:, :, None], 3, axis=2)
    overlay = ct_rgb.astype(np.float32)
    visible_masks = []
    for item in target_items:
        mask = seg == int(item["id"])
        if int(mask.sum()) < 8:
            continue
        color = np.array(item["color"], dtype=np.float32)
        overlay[mask] = overlay[mask] * 0.50 + color * 0.50
        visible_masks.append({**item, "pixels_on_slice": int(mask.sum())})
    overlay8 = np.clip(overlay, 0, 255).astype(np.uint8)

    # Store exact segment ID as RGB (low byte in R, high byte in G); 16-bit IDs remain lossless in browser canvas.
    seg_rgb = np.zeros((seg.shape[0], seg.shape[1], 3), dtype=np.uint8)
    seg_rgb[:, :, 0] = np.bitwise_and(seg, 255).astype(np.uint8)
    seg_rgb[:, :, 1] = np.right_shift(seg, 8).astype(np.uint8)
    seg_rgb[:, :, 2] = 0

    outdir = Path(args.output)
    outdir.mkdir(parents=True, exist_ok=True)
    Image.fromarray(ct8, mode="L").save(outdir / "ct-slice.png", optimize=True)
    Image.fromarray(seg_rgb, mode="RGB").save(outdir / "label-ids-rgb.png", optimize=True)
    Image.fromarray(overlay8, mode="RGB").save(outdir / "overlay-preview.png", optimize=True)

    # Reviewer contact sheet: CT, source segment palette overlay, plus the highest-level label names.
    scale = 3
    tile_w = image_volume.shape[2] * scale
    tile_h = image_volume.shape[1] * scale
    canvas = Image.new("RGB", (tile_w * 2 + 36, tile_h + 105), (17, 27, 38))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    ct_img = Image.fromarray(ct8, mode="L").convert("RGB").resize((tile_w, tile_h), Image.Resampling.BILINEAR)
    over_img = Image.fromarray(overlay8, mode="RGB").resize((tile_w, tile_h), Image.Resampling.BILINEAR)
    canvas.paste(ct_img, (12, 12))
    canvas.paste(over_img, (tile_w + 24, 12))
    draw.text((12, tile_h + 20), "CT slice | soft-tissue window", fill=(240, 244, 247), font=font)
    draw.text((tile_w + 24, tile_h + 20), "Modified educational label overlay", fill=(240, 244, 247), font=font)
    caption = "Atlas slice k=%d (0-based) | LPS geometry | 256x256 | label overlay preview" % chosen
    draw.text((12, tile_h + 40), caption, fill=(177, 194, 208), font=font)
    legend_y = tile_h + 60
    labels_line = " | ".join("%s:%s" % (x["name"], x["pixels_on_slice"]) for x in visible_masks)
    draw.text((12, legend_y), labels_line[:160], fill=(177, 194, 208), font=font)
    canvas.save(outdir / "review-contact-sheet.png", optimize=True)

    selected_meta = {
        "kind": "review-only candidate slice; not yet integrated in app",
        "source": "SPL Abdominal Atlas, September 2015",
        "source_license": "3D Slicer License Part B (verify third-party components separately)",
        "source_files": member_names,
        "source_scene": "AbdominalAtlas-2015Sept-Slicer4-4Version.mrml",
        "nrrd_geometry_matches": True,
        "nrrd_header": {key: image_header.get(key) for key in ("type", "dimension", "space", "sizes", "space directions", "space origin", "encoding")},
        "array_shape_zyx": list(image_volume.shape),
        "slice_index_k_zero_based": chosen,
        "index_direction_note": "Preview reverses only the screen row order so anterior is displayed at the top; CT and segmentation use identical transform.",
        "display_window": {"width": args.window, "level": args.level},
        "visible_target_structures": visible_masks,
        "candidate_slice_ranking": z_records[:12],
        "label_png_encoding": "RGB: segment ID = R + 256*G; exact 16-bit label IDs survive 8-bit RGB PNG decoding",
    }
    (outdir / "demo-slice.json").write_text(json.dumps(selected_meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print("SPL Abdominal Atlas one-slice proof-of-concept")
    print("source files: " + json.dumps(member_names, ensure_ascii=False))
    print("geometry identical in both NRRD headers: yes")
    print("array shape (z,y,x): " + str(image_volume.shape))
    print("raw CT range: %d..%d; selected slice range: %.1f..%.1f" % (
        int(image_volume.min()), int(image_volume.max()), float(ct.min()), float(ct.max())))
    print("raw CT percentiles [0,1,5,25,50,75,95,99,100]: " + json.dumps(
        [round(float(v), 1) for v in np.percentile(ct, [0,1,5,25,50,75,95,99,100])]))
    print("slice chosen (0-based k): " + str(chosen))
    print("target structure pixel counts:")
    for item in visible_masks:
        print("  %4d  %-34s %7d pixels" % (item["id"], item["name"], item["pixels_on_slice"]))
    print("top candidate slices:")
    for record in z_records[:12]:
        print("  k=%3d core=%d targets=%d total_pixels=%d" % (
            record["slice_index"], record["core_count"], record["target_count"], record["target_pixel_count"]))
    print("outputs: " + ", ".join(str(p) for p in sorted(outdir.iterdir())))
    print("source ZIP files were not modified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
