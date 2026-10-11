# CT data provenance and license review

**Status: the browser preview now exposes independently navigable axial (113), coronal (256) and sagittal (256) planes generated from the source CT and labelmap. This is orthogonal plane viewing, not synchronized tri-planar crosshairs, arbitrary oblique reconstruction or raw-voxel window/level. Source terms, third-party rights and independent anatomical review remain release gates.**

## Source and files

The repository root contains six parts of the **SPL Abdominal Atlas** (September 2015), by Florin Talos, Marianna Jakab and Ron Kikinis, from the Surgical Planning Laboratory, Department of Radiology, Brigham and Women's Hospital / Harvard Medical School.

The original package includes a 3D Slicer scene, atlasStructure.json, a CT volume (Data/I.nrrd), a labelmap (Data/seg.nrrd), and many VTK anatomical models. The README bundled in the ZIP only contains the project slug.

- Official atlas page: https://www.openanatomy.org/atlas-pages/atlas-spl-abdomen.html
- Official 3D Slicer License page: https://openanatomy.org/atlas-pages/slicer-license.html

The ZIPs are independently readable and their CRC checks passed. They contain 183 entries and about 50.6 MB of expanded content. The inventory/metadata scripts inspect files in place and never extract or modify the original ZIP archives.

## Geometry and label IDs

The MRML scene names Data/I.nrrd as the CT background and Data/seg.nrrd as the segmentation volume. Both NRRD headers report:

- NRRD0004, type short, dimension 3.
- Sizes 256 × 256 × 113.
- Coordinate space left-posterior-superior (LPS).
- Space directions (0.9375, 0, 0), (0, -0.9375, 0), (0, 0, -1.5).
- Origin (-119.53, 119.53, 84.0).
- Gzip encoding.

atlasStructure.json provides 94 Structure entries with authoritative LabelMapSelector data keys. The browser catalogue maps the nine structures visible on the selected slice to their authoritative segment IDs. The lossless label-ID PNG stores an ID as R + 256 × G.

The first in-app position defaults to axial slice k=26 (zero-based) of a 113-slice volume. Every exported slice is 256 × 256 pixels. The grayscale display window and pixel row order are transformed for screen display; each corresponding labelmap receives the exact same row flip. The palette follows the atlas's segment colors. The matching CT/labelmap overlay preview for k=26 was visually inspected: major regions for liver, spleen, kidneys, aorta, IVC, pancreas, stomach/duodenum and gallbladder appear aligned on this candidate slice.

The browser viewer now switches between axial, coronal and sagittal sampled planes, each with its own slider range. It does **not yet offer synchronized tri-planar crosshairs, arbitrary oblique reslicing, adjustable raw-voxel window/level or DICOM-series ingestion**. The source in-plane matrix is 256 × 256 (about 0.94 mm spacing in-plane) with 1.5 mm spacing between slices. The orthogonal views preserve physical pixel aspect ratio rather than assuming square pixels. Do not treat larger on-screen display dimensions as higher source resolution. Header geometry plus a visual contact-sheet check is not a substitute for an independent radiologist/anatomy educator review. Do not claim clinical validation. The source archives remain unmodified.

To inspect/regenerate the volume assets:

~~~bash
python3 scripts/inspect_archives.py
python3 scripts/read_atlas_metadata.py
python3 -m pip install numpy pillow
python3 scripts/build_demo_assets.py --output build/ct-demo-volume
~~~

## License and attribution

The LICENSE.md file inside the exact uploaded package states that the atlas is released under the terms of the 3D Slicer License, Part B. A full copy of that referenced license, preceded by the required notice, is stored at licenses/SPL-Abdominal-Atlas-LICENSE.txt; the app exposes a user-facing page at data-license.html.

Part B provides rights to use, reproduce, modify, display and distribute covered material subject to conditions including:

1. Include the required notice and all terms of the Software License with each distributed copy/sublicense and in applicable user documentation.
2. Preserve applicable attribution, copyright notices and licenses.
3. Clearly mark modified versions and do not represent them as the original.
4. The license does not grant rights to third-party material that the licensor was not authorized to sublicense. Separate third-party rights must be reviewed.
5. The materials are stated to be for research purposes, not reviewed or approved by FDA or another agency; clinical applications are neither recommended nor advised. They are supplied “AS IS”, and endorsement using contributor names/logos is restricted.

The in-app notice attributes the SPL Abdominal Atlas and describes the web-display window and teaching overlay as modified. These notes are not legal advice and do not establish rights in any separately licensed component.

## Before broader release

- Obtain independent review of orientation and segmentation alignment in all three planes, label names and teaching explanations.
- Evaluate a higher-resolution, properly licensed CT source if the expected learning experience requires finer anatomical detail; do not synthesize or interpolate detail and present it as native resolution.
- Add synchronized crosshairs and validate shared physical coordinates if a tri-planar layout is introduced.
- Add configurable window/level from verified raw voxel values; current PNGs only contain a fixed 8-bit presentation.
- Re-validate axis ordering, spacing, origin and transforms against the full MRML scene before extending the views; matching headers alone are insufficient.
- Check third-party notices for any additional scene/model/software components.
- Keep the license notice with applicable dataset copies and documentation.
- Never present the app as a diagnostic tool. Its purpose is educational anatomy practice, not diagnosis or clinical decisions.
