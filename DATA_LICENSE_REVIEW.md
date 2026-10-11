# CT data provenance and license review

**Status: the current branch provides independently navigable axial (113), coronal (256) and sagittal (256) planes, plus configurable window width/level from the source int16 volume. Values are labelled as source stored intensities, not verified HU. Synchronized tri-planar crosshairs, arbitrary oblique reconstruction, DICOM-series ingestion, third-party rights and independent anatomical review remain release gates.**

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

The browser viewer switches among axial, coronal and sagittal planes, each with an independent slider, and supports source window width/level after loading the preserved int16 sidecar (`ct-volume-int16.bin.gz`). The original CT intensity range in the source file is 0–3952; this is explicitly documented as **stored source intensity**, not HU, because the source intercept/calibration has not been independently verified. The default W/L is width 400, level 1064. Pixel rows and labelmaps use plane-specific transforms; orthogonal views preserve physical pixel aspect ratio rather than assuming square pixels. This is not yet a simultaneous synchronized three-panel viewer, arbitrary oblique reslicing or a DICOM-series reader. Do not treat larger on-screen display dimensions as higher source resolution. Header geometry and automated checks are not substitutes for an independent radiologist/anatomy educator review. Do not claim clinical validation. The source archives remain unmodified.

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
- Evaluate the [CT-ORG collection at TCIA](https://wiki.cancerimagingarchive.net/pages/viewpage.action?pageId=133072448) as a possible separate high-detail clinical-case mode. TCIA lists the NIfTI CT volumes as CC BY 3.0, with HU values and labels for five main organs (plus brain in some volumes), but acquisition types are heterogeneous, lesion-containing cases are common and some scans may be left-right flipped. It does not replace the broader SPL abdominal structure catalogue and must not be integrated as a default without selecting and reviewing an exact case, confirming attribution and validating orientation.
- Evaluate a higher-resolution, properly licensed CT source if the expected learning experience requires finer anatomical detail; do not synthesize or interpolate detail and present it as native resolution.
- Add synchronized crosshairs and validate shared physical coordinates if a tri-planar layout is introduced.
- Independently validate the source intensity transform before exposing HU-labeled presets. The current W/L sliders operate directly on stored source values and are deliberately not labelled HU.
- Re-validate axis ordering, spacing, origin and transforms against the full MRML scene before extending the views; matching headers alone are insufficient.
- Check third-party notices for any additional scene/model/software components.
- Keep the license notice with applicable dataset copies and documentation.
- Never present the app as a diagnostic tool. Its purpose is educational anatomy practice, not diagnosis or clinical decisions.
