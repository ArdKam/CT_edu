# CT Edu — imaging anatomy learning workspace

CT Edu is an early-stage bilingual educational web app for medical students. The SPL Abdominal Atlas teaching volume now supports axial, coronal and sagittal viewing planes, per-plane slice navigation, labelled segment overlays where annotations are available, structure inspection and a four-option active-recall mode.

## Multi-modality roadmap status

The app now includes a bilingual modality catalog for four learning paths: the current abdominal CT teaching prototype, plus planned brain CT, chest CT, and chest radiography modules. The catalog intentionally shows data/readiness blockers instead of implying that unavailable images or lessons are already integrated.

- **Abdominal CT:** the SPL-based teaching volume is available for prototype use; clinical/educational review and exact source-rights checks remain release gates.
- **Brain CT:** candidate sources and curriculum are under review. Do not embed RSNA-IHD/MIRA source or derived images in the public site unless the applicable current terms clearly permit that use.
- **Chest CT:** LIDC-IDRI is a potential source for a small, attributed, expert-reviewed teaching subset; its full collection is too large for GitHub Pages.
- **Chest radiography:** a browser-only 2D viewer is implemented for local PNG/JPEG/WebP files (pan, zoom, fit, projection metadata; no upload). The official NIH Chest X-ray page states image use is unrestricted with attribution, making it the leading candidate for a curated public case subset. VinDr-CXR remains restricted and must not be redistributed.

The catalog is **not** a claim that those three additional image modules are implemented. No extra patient images, labelmaps, or unreviewed clinical examples were bundled in this change. Per-modality data must pass the gates in [DATASET_ROADMAP.md](DATASET_ROADMAP.md) and [RELEASE_GATES.md](RELEASE_GATES.md) before the catalog marks a path available.

## Current capabilities

- **Three orthogonal planes:** axial (113 positions), coronal (256) and sagittal (256), generated from the same CT and segmentation volumes.
- **Slice navigation:** plane tabs, previous/next controls, slider, mouse wheel over the viewer, and Up/Down keys when the canvas is focused.
- **Coordinate continuity:** the selected i/j/k voxel indices remain visible and each plane remembers its last slice when switching views. The UI displays voxel indices, not a claimed patient-space coordinate or verified DICOM world coordinate.
- **Anatomy overlays:** source segment IDs are preserved losslessly as RGB with `id = R + 256 × G`. The structure list is scoped to segments actually present in the currently loaded plane/slice.
- **Empty edge positions:** if a padded source slice contains no non-zero CT intensity, both the large viewer and synchronized overview identify it as having no image data instead of presenting an unexplained black rectangle.
- **Inspection tools:** structure search/selection, visibility controls, overlay emphasis, zoom (70–220%) and pointer drag to pan.
- **Local learning progress:** submitted active-recall answers are saved in this browser only, capped at 500 records, and summarized as attempts, accuracy, and distinct target structures. Users can clear the history or export/import a versioned JSON backup. Restore validates the schema and replaces the current local history only after confirmation.
- **Local slice bookmarks:** save a plane and slice index, i/j/k voxel coordinates, selected structure, and an optional note (up to 500 characters). Bookmarks are capped at 100, de-duplicated per case/plane/slice/structure, and can be opened, removed, exported or restored from a separate versioned JSON backup. Notes render as plain text. Bookmarks remain in this browser; there are no accounts, server upload, or cross-device sync.
- **Versioned case manifest:** the active SPL anatomy example has a stable case ID, source/geometry metadata, intensity semantics, and explicit medical-review and redistribution gates. A manifest entry does not imply content has been clinically or legally approved.
- **Bilingual UI:** Persian RTL and English LTR.
- **Browser security baseline:** dynamic structure and answer-list UI is built with DOM APIs and `textContent`, not HTML string injection sinks. A document-level Content Security Policy restricts scripts and data connections to the same origin, blocks objects/frames, and allowlists only the Google Fonts CSS/font origins currently required by the UI. CSP and untrusted-search-input behavior are exercised in Chromium; this is not a substitute for a complete security review.
- **CI supply-chain controls:** GitHub Actions are pinned to full commit SHAs, with weekly Dependabot checks for action updates. The Chromium smoke-test dependency is pinned to Playwright 1.63.0, and tests fail if workflow action references lose their immutable SHA pins.
- **Privacy notice:** [privacy.html](privacy.html) explains local browser storage, portable progress and bookmark backups, optional bookmark notes, limits on what the app sends, and the third-party Google Fonts request. It does not claim to settle hosting-provider log retention or source-data redistribution rights.
- **Static publication:** the Pages workflow builds and validates an artifact on pull requests and feature branches, including privacy notice and representative CT assets; the deploy job is restricted to `main`. The original source ZIP files are not copied into the Pages artifact.
- **Review and tests:** Node.js unit/UI contract tests, Python syntax and metadata checks, validation of generated CT/label pairs, and live HTTP probes for representative orthogonal planes.

## Dataset geometry and image-quality limits

- Source: **SPL Abdominal Atlas**, September 2015, by Florin Talos, Marianna Jakab and Ron Kikinis; Surgical Planning Laboratory, Brigham and Women's Hospital / Harvard Medical School.
- Source files: `Data/I.nrrd` CT and paired `Data/seg.nrrd` segmentation labelmap; both have matching geometry.
- Matrix: **256 × 256 × 113** voxels (x, y, z). In-plane spacing is approximately **0.9375 mm** and inter-slice spacing is **1.5 mm**.
- The current default axial position is k=26 (zero-based). Coronal and sagittal files are direct orthogonal reformats of the same sampled volume; their pixel aspect ratio follows physical spacing rather than stretching the data to a square image.
- The display window and teaching colors are modified for web use. The viewer preserves signed 16-bit source voxel values in a compressed binary sidecar and supports adjustable window width/level from those values; they are presented as **source stored intensities, not verified Hounsfield units (HU)**. True DICOM-series ingestion is not implemented.
- More slice positions do not improve within-slice detail. The source spacing is about 0.94 mm in-plane and 1.5 mm between slices, so the 256 × 256 matrix alone should not be misrepresented as exactly half the physical resolution of a 512 × 512 scan; however, it has fewer in-plane samples and can look softer when enlarged. Upscaling cannot recover missing detail.
- A potential separately licensed source is [CT-ORG at TCIA](https://wiki.cancerimagingarchive.net/pages/viewpage.action?pageId=133072448): TCIA lists 140 NIfTI volumes with labels for lung, bones, liver, kidneys and bladder (brain on some scans) under CC BY 3.0 and says the stored CT values are HU. But cases vary in acquisition and pathology, some may be left-right flipped, and the labels do not cover most current normal-abdominal lesson targets. It is a candidate for a **separate, reviewed clinical-case mode**, not a drop-in replacement for the SPL atlas.
- The current catalogue contains nine bilingual target structures. The atlas metadata lists more structures, but broad catalogue coverage needs educational review before adding them.

## Guided case practice

A separate [guided-case workspace](https://ardkam.github.io/CT_edu/preview/cases.html) is published as a live preview at `/preview/cases.html`. The case library now contains 25 records: the four existing abdominal CT exercises plus 21 additional Radiopaedia CT candidates categorized into gastrointestinal, hepatobiliary/pancreatic, renal/urinary, adrenal/endocrine, female reproductive/pelvic, male genitourinary, and peritoneal/retroperitoneal/vascular systems. It supports combined text search, organ-system and difficulty filters. The root homepage retains the stable baseline app plus a preview link until release gates are closed. Each pathway has a CT Edu-authored teaching context, a structured Findings/differential/Impression workflow, and a local self-review rubric. Cases with a stored study URL link to the Radiopaedia viewer directly; other cases retain their source-page fallback. The [per-case intake and verification log](docs/RADIOPAEDIA_ABDOMINAL_CASES.md) records each source URL, direct-viewer identifier when found, system category, search order and unresolved checks. All newly added records remain `partially_verified`: live Radiopaedia page access and actual image loading were not confirmed in this change. If Radiopaedia or the browser blocks framing, both the original case and direct viewer (when available) remain available in a separate tab. Source pages may reveal the diagnosis, so this is not a blinded exam. This is a direct browser request, not a Radiopaedia API integration or a local copy of its images/text.

The Findings, optional differential, Impression, and self-review checklist are CT Edu-authored. Drafts are kept in the current browser only (up to 20 cases); there is no account, upload, automated grading, or secure exam mode. Do not enter real patient details. The external source may disclose request metadata to Radiopaedia when the learner chooses to load it.

These are educational prototype exercises, not reviewed or approved clinical cases. The self-review checklist is not an automatically graded or independently validated reference interpretation. The Radiopaedia media and exact item rights are not re-hosted by CT Edu; see [data and licence review](DATA_LICENSE_REVIEW.md). Do not mark the public-release gate complete until source-data redistribution, independent clinical review, legal/privacy review, and device/accessibility review have documented evidence.

## Dataset and release planning

- [Dataset selection roadmap](DATASET_ROADMAP.md) tracks candidate CT sources for head, chest and abdomen, including exact licensing and validation gates. Candidate collections are not treated as approved teaching cases until reviewed.
- [Release gates](RELEASE_GATES.md) tracks technical, medical-content, privacy and publication requirements.
- [Privacy notice](privacy.html) is the in-app user-facing explanation of local progress storage and current external requests.
- [Security policy](SECURITY.md) explains private vulnerability reporting and the limits of this pre-release prototype.
- [Current data-license review](DATA_LICENSE_REVIEW.md) records the SPL Abdominal Atlas provenance, geometry, and unresolved redistribution checks.

## Known limitations and release gates

- The synchronized three-plane overview now displays axial, coronal and sagittal reformats at once, with shared voxel-coordinate crosshairs and an independent slider for each axis. It uses the dataset's pre-windowed images; full source-intensity Window/Level controls remain available after opening one plane in the large view. Arbitrary oblique reformatting and DICOM-series import are not implemented.
- The automated Chromium smoke test exercises desktop navigation, orientation, wheel scrolling, pan/zoom, raw-value window/level, active recall, synchronized three-plane rendering and coordinate sliders, plus a 390 px mobile viewport and touch navigation. This remains a smoke test, not a full device/browser matrix: multi-touch gestures, mobile pan/zoom ergonomics, Safari/iOS and Android-device QA remain open.
- A radiologist or anatomy educator must independently review orientation, segmentation alignment in all planes, structure naming and the learning explanations. The app is not clinically validated and must not be used for diagnosis or clinical decisions.
- **License review is still open.** The repository root contains the source ZIP archives; do not assume that the license notice resolves all third-party rights. Before public distribution of source archives or derivative material, verify the exact licence conditions and third-party permissions.
- The UI remains a prototype, not a clinical workstation or diagnostic viewer.

**Educational use only. Not for diagnosis or clinical decisions.**

## Guided-case authoring

The repository now contains an empty, versioned authoring template and a validator for provenance, image integrity, bilingual steps, rubric structure, review gates and direct-identifier fields. This is authoring infrastructure only: no unreviewed clinical interpretation or answer key has been added to the published client. See [the authoring contract](docs/CASE_AUTHORING_TEMPLATE.md).

## Next product work

- Complete independent medical-image orientation/label review, source redistribution review, public security/privacy checks, accessibility audit, and physical-device Safari/iOS and Android QA before enabling public release.
- The local bookmark feature is a first step toward a reusable case experience. Next implement a reviewed guided-case flow: clinical context, systematic review prompts, learner-entered findings, independent impression, and rubric-based feedback.
- Only integrate selected head/chest studies after exact-version use and redistribution rights, metadata review, geometry validation, annotation interpretation, expert review, and attribution are recorded. Candidate dataset names in the roadmap are not approved production content.
- DICOM-series import, cloud sync, teacher dashboards, and AI-assisted report feedback remain later phases; they are not implemented by the current prototype.

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



### Local chest radiograph viewer

Choose an image from the Chest radiograph card. The viewer reads PNG/JPEG/WebP in the current browser only, supports fit/zoom/pan and optional PA/AP/lateral metadata, clears the file when closed, and caps files at 25 MB. It does not upload images, parse DICOM, detect projection, or provide diagnosis. Curated public cases and expert-reviewed labels remain separate work.
