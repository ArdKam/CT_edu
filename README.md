# CT Edu — abdominal cross-sectional anatomy learning prototype

CT Edu is an early-stage bilingual educational web app for medical students. The SPL Abdominal Atlas teaching volume now supports axial, coronal and sagittal viewing planes, per-plane slice navigation, labelled segment overlays where annotations are available, structure inspection and a four-option active-recall mode.

## Current capabilities

- **Three orthogonal planes:** axial (113 positions), coronal (256) and sagittal (256), generated from the same CT and segmentation volumes.
- **Slice navigation:** plane tabs, previous/next controls, slider, mouse wheel over the viewer, and Up/Down keys when the canvas is focused.
- **Anatomy overlays:** source segment IDs are preserved losslessly as RGB with `id = R + 256 × G`. The structure list is scoped to segments actually present in the currently loaded plane/slice.
- **Inspection tools:** structure search/selection, visibility controls, overlay emphasis, zoom (70–220%) and pointer drag to pan.
- **Bilingual UI:** Persian RTL and English LTR.
- **Static publication:** GitHub Pages build generates the plane image stack in CI; the original source ZIP files are not copied into the Pages artifact.
- **Review and tests:** Node.js unit/UI contract tests, Python syntax and metadata checks, validation of generated CT/label pairs, and live HTTP probes for representative orthogonal planes.

## Dataset geometry and image-quality limits

- Source: **SPL Abdominal Atlas**, September 2015, by Florin Talos, Marianna Jakab and Ron Kikinis; Surgical Planning Laboratory, Brigham and Women's Hospital / Harvard Medical School.
- Source files: `Data/I.nrrd` CT and paired `Data/seg.nrrd` segmentation labelmap; both have matching geometry.
- Matrix: **256 × 256 × 113** voxels (x, y, z). In-plane spacing is approximately **0.9375 mm** and inter-slice spacing is **1.5 mm**.
- The current default axial position is k=26 (zero-based). Coronal and sagittal files are direct orthogonal reformats of the same sampled volume; their pixel aspect ratio follows physical spacing rather than stretching the data to a square image.
- The display window and teaching colors are modified for web use. These browser images are static 8-bit presentation images: **adjustable raw-voxel window/level and true DICOM-series ingestion are not implemented**.
- More slice positions do not improve within-slice detail. Enlarging a 256 × 256 image cannot recover anatomy absent from the source. If finer image detail is necessary, integrate a separately reviewed, legally redistributable higher-resolution dataset rather than synthesizing detail.
- The current catalogue contains nine bilingual target structures. The atlas metadata lists more structures, but broad catalogue coverage needs educational review before adding them.

## Known limitations and release gates

- Plane selection and slice navigation work, but this is not yet a synchronized three-panel viewer with shared crosshairs or arbitrary oblique reformatting.
- Raw-value window/level, DICOM-series import, pan/zoom touch-gesture QA, and full browser/device end-to-end testing remain outstanding.
- A radiologist or anatomy educator must independently review orientation, segmentation alignment in all planes, structure naming and the learning explanations. The app is not clinically validated and must not be used for diagnosis or clinical decisions.
- **License review is still open.** The repository root contains the source ZIP archives; do not assume that the license notice resolves all third-party rights. Before public distribution of source archives or derivative material, verify the exact licence conditions and third-party permissions.
- The UI remains a prototype, not a clinical workstation or diagnostic viewer.

**Educational use only. Not for diagnosis or clinical decisions.**

## Run locally

Requires Node.js 18+ for tests and Python 3 plus `numpy` and `Pillow` for asset generation.

~~~bash
python3 -m pip install numpy pillow
python3 scripts/build_demo_assets.py --output assets/spl-abdominal-demo
python3 -m http.server 8000
~~~

Open http://localhost:8000.

Run automated tests:

~~~bash
npm test
~~~

Inspect the uploaded archives and source metadata without extracting the ZIP files:

~~~bash
npm run inspect-data
python3 scripts/read_atlas_metadata.py
~~~

To generate a disposable review bundle instead of writing into the app assets:

~~~bash
python3 scripts/build_demo_assets.py --output build/ct-demo-volume
~~~

