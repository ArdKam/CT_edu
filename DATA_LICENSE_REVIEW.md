# CT data provenance and license review

**Status: source terms identified; geometry/asset mapping and rights for third-party material remain to be verified before real-data release.**

## What is in the uploaded archives

A GitHub Actions inventory of the six ZIP files at the repository root completed successfully on 11 October 2026:

- Six independently readable ZIP archives; all ZIP CRC checks passed.
- 183 archive entries, about 50.6 MB expanded total.
- `abdomen-2016-09/AbdominalAtlas-2015Sept-Slicer4-4Version.mrml`: a 3D Slicer scene.
- `abdomen-2016-09/atlasStructure.json`: structure metadata including display colors and authoritative label-map selectors/data keys.
- `abdomen-2016-09/Data/I.nrrd`: NRRD0004, type `short`, 3D dimensions `256 × 256 × 113`, gzip encoding, declared coordinate space `left-posterior-superior`, voxel direction magnitudes about `0.9375 × 0.9375 × 1.5 mm`, origin `(-119.53, 119.53, 84.0)`.
- Many `.vtk` anatomical meshes and a viewer manifest.
- `abdomen-2016-09/LICENSE.md` points to the 3D Slicer License. The bundled README contains only the project slug.

The inventory and metadata reader do not extract or modify the source archives, and the metadata reader does not read NRRD voxel payloads. The role of `I.nrrd` and its relation to the label-map selectors must be confirmed from the complete MRML + JSON mapping; do not infer it from the filename.

Commands:

~~~bash
python3 scripts/inspect_archives.py
python3 scripts/read_atlas_metadata.py
~~~

## Source and attribution

The source is the **SPL Abdominal Atlas**, released September 2015, by Florin Talos, Marianna Jakab and Ron Kikinis at the Surgical Planning Laboratory, Department of Radiology, Brigham and Women's Hospital / Harvard Medical School. The official atlas page describes a clinical-quality CT, detailed label maps and 3D models of labelled anatomical structures.

- [Official SPL Abdominal Atlas page](https://www.openanatomy.org/atlas-pages/atlas-spl-abdomen.html)
- [Official 3D Slicer License page](https://www.openanatomy.org/atlas-pages/slicer-license.html)

The `LICENSE.md` contained inside the exact uploaded package says that the atlas is released under the terms of the 3D Slicer License, Part B. A copy of the referenced license, preceded by the required distribution notice, is stored in `licenses/SPL-Abdominal-Atlas-LICENSE.txt`. The app exposes a user-readable notice through `data-license.html`.

## Important license conditions

Part B grants a royalty-free, non-exclusive license (with sublicensing rights only to the extent of the rights Brigham can grant) to use, reproduce, modify, display and distribute covered material, subject to conditions including:

1. Include the required notice and all terms of the Software License with each distributed copy/sublicense and in applicable user documentation.
2. Preserve applicable attributions, copyright notices and licenses.
3. Clearly mark modified versions and never represent them as the original.
4. The license does **not** grant rights to third-party software/data that the licensor was not authorized to sublicense. Any such components require separate review.
5. The license states the materials are for research purposes, are not reviewed or approved by FDA or another agency, and that clinical applications are neither recommended nor advised. It is provided “AS IS”; endorsement using contributor names/logos is also restricted.

The app is an educational anatomy prototype, not for diagnosis or clinical decisions. These notes do not replace legal review, and do not establish rights in any separately licensed third-party component.

## Before loading a real image/labelmap in the browser

- Parse the complete MRML scene and JSON to map the scalar volume, labelmap reference, voxel/segment IDs, colors and geometry transforms to exact files.
- Validate that the chosen volume and labelmap occupy the same space and that array ordering, axis directions, spacing, origin and left/right orientation agree with the source scene.
- Render a few labelled structures and compare the result against the original Slicer scene; file presence or matching dimensions alone does not prove alignment.
- Identify third-party notices embedded in the package. Keep the source archives unchanged and test using a separate working copy.
- Choose a small example only after license and anatomical alignment have been checked. Do not bundle every archive into front-end assets.

## Renderer boundary and safety

The current viewer uses a locally drawn, deliberately simplified schematic. It is **not a real CT, not a segmentation mask, not to scale and not clinically accurate enough for image interpretation**. Shape keys used by the UI are not atlas label IDs. Real-data integration must use a separate adapter and preserve all geometry metadata; no volume/labelmap adapter is implemented yet.

Every real-data lesson must show source/version and license attribution. The app must continue to display an educational-use disclaimer and must never imply diagnostic validation.
