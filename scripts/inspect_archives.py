#!/usr/bin/env python3
"""Inventory ZIP archives without extracting or modifying them."""
from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path

INTERESTING = (".nii", ".nii.gz", ".nrrd", ".dcm", ".dicom", ".mrb", ".mrml", ".vtk", ".vtp", ".stl", ".obj", ".json", ".csv", ".txt")


def inspect(directory: Path):
    records = []
    for archive in sorted(p for p in directory.glob("*.zip") if p.is_file()):
        item = {"file": archive.name, "compressed_bytes": archive.stat().st_size, "valid_zip": False, "member_count": 0, "uncompressed_bytes": 0, "suspected_medical_files": [], "license_candidates": [], "integrity_error": None}
        try:
            with zipfile.ZipFile(archive) as zf:
                members = zf.infolist()
                names = [m.filename for m in members if not m.is_dir()]
                item["valid_zip"] = True
                item["member_count"] = len(members)
                item["uncompressed_bytes"] = sum(m.file_size for m in members)
                item["suspected_medical_files"] = [n for n in names if n.lower().endswith(INTERESTING)][:100]
                item["license_candidates"] = [n for n in names if any(t in Path(n).name.lower() for t in ("license", "licence", "notice", "copyright", "readme", "acknowledg"))][:100]
                bad = zf.testzip()
                if bad:
                    item["integrity_error"] = "CRC failure in " + bad
        except (zipfile.BadZipFile, OSError, RuntimeError) as exc:
            item["integrity_error"] = type(exc).__name__ + ": " + str(exc)
        records.append(item)
    return records


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", default=".", help="Directory to inspect")
    parser.add_argument("--json", action="store_true", help="Print JSON")
    args = parser.parse_args()
    directory = Path(args.directory).resolve()
    records = inspect(directory)
    if args.json:
        print(json.dumps({"directory": str(directory), "archives_found": len(records), "archives": records}, ensure_ascii=False, indent=2))
    else:
        print("CT Edu archive inventory: " + str(directory))
        print("Archives found: " + str(len(records)))
        for item in records:
            print("\\n- " + item["file"] + " (" + format(item["compressed_bytes"], ",") + " bytes)")
            if not item["valid_zip"]:
                print("  INVALID: " + str(item["integrity_error"]))
                continue
            print("  Members: " + str(item["member_count"]) + " | expanded: " + format(item["uncompressed_bytes"], ",") + " bytes")
            print("  ZIP CRC: " + ("FAILED: " + item["integrity_error"] if item["integrity_error"] else "passed"))
            print("  License candidates: " + (", ".join(item["license_candidates"][:12]) or "none detected"))
            print("  Medical/metadata paths: " + (", ".join(item["suspected_medical_files"][:12]) or "none detected"))
        print("\\nNo archives were extracted or modified. Review licenses before redistributing data.")
    return 0 if all(item["valid_zip"] and not item["integrity_error"] for item in records) else 1


if __name__ == "__main__":
    raise SystemExit(main())
