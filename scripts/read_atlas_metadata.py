#!/usr/bin/env python3
"""Read selected text/headers from the uploaded atlas ZIPs without extracting them."""
from __future__ import annotations

from pathlib import Path
from zipfile import BadZipFile, ZipFile

ROOT = Path(".")
TEXT_LIMIT = 12000
HEADER_LIMIT = 4096
TEXT_NAMES = {"license.md", "readme.md", "atlasstructure.json", "manifest.json"}


def main() -> int:
    archives = sorted(ROOT.glob("abacktools-abdomen-2016-09-part*-of6.zip"))
    if not archives:
        print("No atlas part archives found in the repository root.")
        return 1

    seen = set()
    printed = 0
    for archive in archives:
        try:
            with ZipFile(archive) as zf:
                for info in zf.infolist():
                    if info.is_dir():
                        continue
                    lower = info.filename.lower()
                    basename = Path(lower).name
                    selected_text = basename in TEXT_NAMES
                    selected_nrrd = basename == "i.nrrd"
                    if not (selected_text or selected_nrrd):
                        continue
                    # Do not print duplicate README/license copies if a future archive repeats them.
                    key = (basename, info.file_size)
                    if selected_text and key in seen:
                        continue
                    seen.add(key)
                    cap = HEADER_LIMIT if selected_nrrd else TEXT_LIMIT
                    with zf.open(info) as stream:
                        sample = stream.read(cap + 1)
                    truncated = len(sample) > cap
                    sample = sample[:cap]
                    if selected_nrrd:
                        # NRRD header is plain text up to a blank line; binary/compressed voxel data follows.
                        split = sample.find(b"\n\n")
                        header = sample[:split + 2] if split >= 0 else sample
                        text = header.decode("utf-8", errors="replace")
                        label = "NRRD HEADER ONLY"
                    else:
                        text = sample.decode("utf-8", errors="replace")
                        label = "TEXT/METADATA"
                    print("\n" + "=" * 78)
                    print(label + " | archive=" + archive.name + " | member=" + info.filename)
                    print("member_size_bytes=" + str(info.file_size) + (" | sample_truncated=yes" if truncated else ""))
                    print("-" * 78)
                    print(text)
                    printed += 1
        except (BadZipFile, OSError, RuntimeError) as exc:
            print("ERROR reading " + archive.name + ": " + type(exc).__name__ + ": " + str(exc))
            return 1

    print("\nSelected members inspected: " + str(printed))
    print("No files were extracted or modified; the NRRD voxel payload was not read.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
