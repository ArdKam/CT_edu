# CT Edu — abdominal anatomy learning prototype

CT Edu is a lightweight web app for clinical medical students. The first lesson uses one real axial CT slice from the SPL Abdominal Atlas with its matching labelmap. The interface defaults to Persian (RTL), supports English (LTR), and keeps bilingual anatomy names available.

## Included in this milestone

- index.html: responsive anatomy-learning workspace.
- src/data/anatomy.js: nine bilingual anatomical structures mapped to the atlas's authoritative segment IDs for the selected slice.
- src/viewer/ct-slice-viewer.js: browser canvas renderer; reads the grayscale CT PNG and lossless RGB-encoded segment-ID PNG, then draws the overlay and labels from the active UI state.
- src/quiz/quiz-engine.js: four-option active-recall quiz logic.
- src/app.js and src/styles.css: Persian/English interface, independent labels and overlays, per-structure visibility, zoom/reset, structure selection, emphasis presets and session score.
- assets/spl-abdominal-demo/: one 256×256 CT teaching slice, matching label-ID map and provenance metadata. Combined image payload is about 26 KB.
- data-license.html and licenses/SPL-Abdominal-Atlas-LICENSE.txt: source attribution and full referenced license notice.
- scripts/: archive inventory, source metadata inspection, and reproducible one-slice asset preparation scripts.
- tests/: built-in Node tests for search, segment ID mapping, quiz logic, source assets and quiz accessibility.
- .github/workflows/test.yml: CI checks plus a review artifact for the selected slice.

## Data, orientation and scope

- Source: **SPL Abdominal Atlas**, September 2015, by Florin Talos, Marianna Jakab and Ron Kikinis; Surgical Planning Laboratory, Brigham and Women's Hospital / Harvard Medical School.
- This lesson renders slice k=26 (zero-based) from Data/I.nrrd, with its paired Data/seg.nrrd labelmap.
- Both NRRD headers report 256×256×113 volumes and matching LPS coordinate space, direction vectors, spacing and origin. The CT and labelmap are flipped vertically in the same way in the slice-preparation step so anterior appears at the top while the left/right display convention remains consistent.
- The grayscale window and color presentation are modified for web-based teaching. Source segment IDs are preserved losslessly in label-ids-rgb.png as ID = R + 256 × G.
- The app currently loads a **single slice**, not a navigable 3-D/volumetric CT series. Emphasis presets only change the visual emphasis of structures on this slice.
- An anatomy educator/radiologist should review anatomy naming and orientation before external educational release. The current preview has been visually checked against the matching atlas labelmap, but it is not clinically validated.
- Source license terms and the third-party-material caveat are documented in DATA_LICENSE_REVIEW.md and data-license.html. Check those terms before redistributing additional data or third-party components.

**Educational use only. Not for diagnosis or clinical decisions.**

## Run locally

Requires Node.js 18+ to run tests and Python 3 for archive inspection. The UI itself requires no package installation.

~~~bash
python3 -m http.server 8000
~~~

Open http://localhost:8000.

Run tests:

~~~bash
npm test
~~~

Inspect the uploaded source archives without extracting or modifying them:

~~~bash
npm run inspect-data
python3 scripts/read_atlas_metadata.py
~~~

Regenerate the single-slice teaching assets (requires numpy and Pillow):

~~~bash
python3 -m pip install numpy pillow
python3 scripts/build_demo_assets.py --output build/ct-demo-slice
~~~

The source ZIPs are read in place and are not changed by these scripts.
