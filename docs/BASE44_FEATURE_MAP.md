# Base44 → GitHub CT-Edu implementation map

Date: 2026-10-17  
Base branch: `main`  
Working branch: `feature/base44-dataset-and-ux-integration`

## Feature disposition

| Base44 asset / idea | GitHub destination | Decision | Rationale |
|---|---|---|---|
| 320-image normal abdomen/pelvis axial series from Base44, plus 150 coronal and 178 sagittal images found in the same Commons source categories | `src/data/wikimedia-abdomen-series.js` + `abdomen-series.html` | Integrate as three separate preview stacks | Preserves the Base44 axial asset and expands the same public-domain teaching source while keeping the images explicitly separate from SPL volume geometry |
| Source URL, CC0 licence, author, reported 3 mm thickness | Dataset manifest and source panel | Integrate with caveats | Keeps provenance attached to the image series |
| Liver polygons | None in this phase | Exclude | User says they are not important; annotations are draft and not independently verified |
| Three demo anatomy structures | None | Exclude | Placeholder shapes, not authoritative anatomy |
| Two sample clinical cases | None | Exclude | Both are explicitly demos with no verified source/licence/answer content |
| Empty QuizQuestion collection | None | Exclude | Nothing meaningful to migrate |
| Base44 entity schemas | Existing JSON manifest and case-authoring conventions | Selectively reuse | Useful fields already overlap with GitHub's data contracts; avoid adding a database dependency just for parity |
| Base44 UI/UX | GitHub design tokens and new module controls in this pass | Partial implementation | Actual Base44 screenshots/source are inaccessible in the current connection; exact visual matching would be speculation |
| Future case/content management | `docs/CASE_AUTHORING_TEMPLATE.md` and validators | Reuse GitHub infrastructure | Existing workflow already encodes provenance, review, privacy and publication gates |

## Data constraints

- The original Base44 axial list contains 320 unique URLs on `upload.wikimedia.org`, with indices 1–320 in source order.
- The same Commons case also has 150 coronal and 178 sagittal files in its official plane categories; the app links these through Wikimedia Commons Special:FilePath URLs.
- Plane tabs are separate image stacks, not synchronized reformats or evidence of shared physical coordinates.
- Treat the entries as displayable 2D axial images only. The Base44 schema reports no in-plane spacing and declares axial-only availability.
- Do not generate coronal/sagittal reformats or label the series as a verified 3D volume.
- Do not use the SPL viewer's voxel coordinates or segmentation for the Wikimedia images.
- Do not load all 320 images at once. Fetch the current image and lightly preload adjacent images only.
- The browser loads images from Wikimedia only after the learner opens this module. State this plainly and set the image referrer policy to `no-referrer`.
- Preserve a source link and an attribution credit to Mikael Häggström, M.D. even though the source states CC0.

## Acceptance criteria

1. The catalog presents the axial stack as a distinct candidate/preview, not as the existing SPL viewer.
2. The series viewer provides accessible previous/next, index slider, keyboard arrows, zoom/reset, native aspect ratio, loading and failure feedback, and English/Persian UI.
3. It never claims validated patient-space coordinates, HU calibration, segmentation, diagnosis, or clinical readiness.
4. Unit tests validate all 320 ordered unique source URLs and the viewer's key UI contracts.
5. Existing modality gating and main CT viewer contracts continue to pass.
6. Changes stay on the feature branch until CI and human review; do not turn on the public-release variable or bypass existing release gates.