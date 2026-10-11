#!/usr/bin/env python3
"""Inspect selected atlas metadata in ZIP files without extracting the dataset."""
from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree

ARCHIVE_GLOB = "abacktools-abdomen-2016-09-part*-of6.zip"
KEY_SUFFIXES = (".nrrd", ".nii", ".nii.gz", ".mrb", ".mrml", ".json", ".md", ".xml")


def selected_assets(names):
    selected = []
    for name in names:
        lower = name.lower()
        base = Path(lower).name
        if lower.endswith(KEY_SUFFIXES) and (
            base in {"license.md", "readme.md", "atlasstructure.json", "manifest.json"}
            or lower.endswith((".mrml", ".mrb", ".nrrd", ".nii", ".nii.gz"))
        ):
            selected.append(name)
    return selected


def print_nrrd_header(archive, name, size):
    with archive.open(name) as stream:
        header = bytearray()
        while len(header) < min(size, 65536):
            line = stream.readline(4096)
            if not line:
                break
            if line in (b"\n", b"\r\n"):
                break
            header.extend(line)
    print("\nNRRD HEADER | " + name)
    print(header.decode("utf-8", errors="replace"))


def print_atlas_structure(raw, name):
    try:
        nodes = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        print("\nCould not parse " + name + ": " + str(exc))
        return
    if not isinstance(nodes, list):
        print("\nUnexpected atlasStructure root type: " + type(nodes).__name__)
        return

    def has_type(node, value):
        kinds = node.get("@type", [])
        if isinstance(kinds, str):
            return value in kinds
        return value in kinds

    sources = [node for node in nodes if has_type(node, "DataSource")]
    focus = []
    for node in sources:
        ident = str(node.get("@id", ""))
        source = str(node.get("source", ""))
        if any(token in (ident + " " + source).lower() for token in ("label", "volume", "image", "ct", "nrrd")):
            focus.append({"id": ident, "source": source, "mimeType": node.get("mimeType")})
    structures = [node for node in nodes if has_type(node, "Structure")]
    label_structures = []
    for node in structures:
        selectors = node.get("sourceSelector", [])
        selector = next((s for s in selectors if has_type(s, "LabelMapSelector")), None)
        if selector:
            label_structures.append({
                "name": node.get("annotation", {}).get("name", node.get("@id", "")),
                "dataKey": selector.get("dataKey"),
                "authoritative": selector.get("authoritative"),
            })
    print("\nATLAS STRUCTURE SUMMARY | " + name)
    print("Total metadata nodes: " + str(len(nodes)))
    print("DataSource nodes: " + str(len(sources)))
    print("Structure nodes: " + str(len(structures)))
    print("Structure nodes with LabelMapSelector: " + str(len(label_structures)))
    print("Volume/label-related data sources:")
    print(json.dumps(focus, ensure_ascii=False, indent=2))
    print("First 24 label-map structure entries:")
    print(json.dumps(label_structures[:24], ensure_ascii=False, indent=2))


def print_mrml_refs(raw, name):
    print("\nMRML STORAGE REFERENCES | " + name)
    try:
        root = ElementTree.fromstring(raw)
        refs = []
        for node in root.iter():
            for key, value in node.attrib.items():
                if key.lower() in {"filename", "url"} and re.search(r"\.(nrrd|nii(?:\.gz)?|vtk|mrb)$", value, re.I):
                    refs.append({"node": node.tag.rsplit("}", 1)[-1], "attribute": key, "value": value})
        unique = []
        seen = set()
        for item in refs:
            key = (item["node"], item["attribute"], item["value"])
            if key not in seen:
                seen.add(key)
                unique.append(item)
        print(json.dumps(unique[:100], ensure_ascii=False, indent=2))
        if not unique:
            print("No recognized local image/model filenames parsed; inspect the full MRML scene.")
    except ElementTree.ParseError as exc:
        print("MRML XML parse failed: " + str(exc))


def main():
    archives = sorted(Path(".").glob(ARCHIVE_GLOB))
    if not archives:
        print("No atlas ZIP archives found.")
        return 1
    print("Atlas source metadata inspection (no extraction; voxel payload not read)")
    print("Archive count: " + str(len(archives)))
    for path in archives:
        with zipfile.ZipFile(path) as zf:
            infos = [info for info in zf.infolist() if not info.is_dir()]
            names = [info.filename for info in infos]
            print("\n" + "=" * 78)
            print(path.name + ": " + str(len(infos)) + " files")
            for name in selected_assets(names):
                print("  " + name)
            for name in names:
                base = Path(name).name.lower()
                if base in {"license.md", "readme.md"}:
                    raw = zf.read(name)
                    print("\nTEXT FILE | " + name)
                    print(raw.decode("utf-8", errors="replace"))
                elif base == "atlasstructure.json":
                    print_atlas_structure(zf.read(name), name)
                elif base == "manifest.json":
                    print("\nVIEWER MANIFEST | " + name)
                    print(zf.read(name).decode("utf-8", errors="replace"))
                elif name.lower().endswith(".mrml"):
                    print_mrml_refs(zf.read(name), name)
                elif name.lower().endswith(".nrrd"):
                    print_nrrd_header(zf, name, zf.getinfo(name).file_size)
    print("\nDone. No files extracted or modified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
