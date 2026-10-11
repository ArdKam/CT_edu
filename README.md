# CT Edu — abdominal anatomy learning prototype

CT Edu is a dependency-free web prototype for clinical medical students. The first unit focuses on normal axial abdominal anatomy. The default interface is Persian (RTL), with an English mode and bilingual anatomical names.

## Data integrity

The current viewer is a deliberately schematic illustration. It is **not a patient CT, not a segmentation mask, not to scale, and not intended for diagnosis or clinical decisions**. The atlas ZIP files stored at the repository root are not yet loaded by the app.

## Included

- index.html: accessible learning workspace and app shell.
- src/data/anatomy.js: bilingual structure catalogue and search.
- src/viewer/schematic-viewer.js: separate SVG schematic renderer, designed to be replaced by a verified CT/labelmap adapter.
- src/quiz/quiz-engine.js: active-recall question generation and answer evaluation.
- src/app.js and src/styles.css: interaction state, language switching, responsive layout and visual system.
- tests/: Node built-in tests for the catalogue, quiz logic and UI contract.
- scripts/inspect_archives.py: inventory ZIP files and run integrity checks without extraction.
- scripts/read_atlas_metadata.py: read selected license/README/metadata text and the NRRD header in-place, without extracting voxel data.
- DATA_LICENSE_REVIEW.md: provenance and release gate.

## Run locally

Requires Node.js 18+ for tests and Python 3 for archive inventory. No npm install is needed.

Start a static server from the repository root:

~~~bash
python3 -m http.server 8000
~~~

Open http://localhost:8000.

Run tests:

~~~bash
npm test
~~~

Inspect the six atlas archives without extracting them:

~~~bash
npm run inspect-data
python3 scripts/read_atlas_metadata.py
~~~

## Implemented interactions

Structure selection, English/Persian search, independent per-structure visibility, show/hide all, independent overlays and labels, bounded zoom/reset, organ/vessel/posterior emphasis presets, bilingual descriptions, and a four-option active-recall quiz with feedback and resettable session score. Language preference is saved locally when browser storage is available.

## Next milestone

Review the exact source/version, license and notices; validate CT orientation, spacing, segmentation reference volume and label-map alignment; then integrate only an appropriately licensed small example. See DATA_LICENSE_REVIEW.md.
