# CT data provenance and license review

**Status: NOT VERIFIED — release gate before using the uploaded atlas data.**

The current web app uses a locally drawn schematic. It does not load the uploaded atlas archives. The repository is public, so the archives in the repository can be downloaded by anyone who can access it.

## Archive inventory

Run from the repository root:

~~~bash
python3 scripts/inspect_archives.py
~~~

The script reports archive sizes, member counts, expanded size, ZIP CRC status, likely medical-image paths and files that may contain license or attribution information. It does not extract or modify the archives.

## Checks required before real-data integration

- Determine whether the six files are independent archives or parts of one multipart archive. Do not infer format from filenames alone.
- Locate the README, license, acknowledgment and notices. Verify embedded third-party components individually.
- Identify source CT/volume format, dimensions, voxel spacing, coordinate/orientation conventions and any required 3D Slicer scene.
- Identify labelmaps, segment IDs, display colors, terminology, reference volume and transforms.
- Extract a copy outside the repository and validate a small example; do not overwrite the source archives.
- Compare each overlay against the source scene. A matching filename does not prove spatial alignment.
- Check left/right orientation carefully. In standard radiological axial display, patient right appears on the viewer's left.

## Redistribution caution

Do not assume that a public download URL means unrestricted redistribution. Before shipping a dataset in this public repository or web app, inspect the license included with the exact package/version, required attribution, modification and redistribution conditions, and any third-party licenses.

Do not bundle the complete archives into browser assets. Select a small, verified, licensed example and document its source and version.

## Renderer boundary

The current anatomy catalogue describes schematic structure metadata: id, bilingual names, color, descriptions, aliases and a schematic shape key. The shape key is only used by the schematic renderer; it is not a segmentation ID.

When a real-data adapter is added, it should receive validated CT slice pixels and an aligned labelmap, preserve geometry/orientation metadata, and remain separate from learner UI state.

## Medical education safeguards

- Label schematic illustrations honestly; never call them real CT.
- Display provenance/version for every real-data lesson.
- Independently review anatomy naming, orientation and overlay alignment.
- Keep the notice: educational anatomy prototype — not for diagnosis or clinical decisions.
