# CT Edu — release gates and implementation status

Last reviewed: 2026-10-11
Scope: educational CT web app for clinical-year medical students.

This checklist separates code that exists from educational, legal, and release requirements that still need independent evidence. Passing software tests does not establish medical validity.

## Current implementation

- [x] Bilingual Persian RTL / English LTR static web workspace.
- [x] SPL Abdominal Atlas volume decoded into 113 axial, 256 coronal, and 256 sagittal positions.
- [x] Independent slice navigation, per-plane position retention with visible i/j/k voxel indices, zoom/pan, source-intensity window/level, and label-map overlay.
- [x] Anatomy search, visibility controls, structure detail panel, and four-choice active recall.
- [x] Node unit/UI tests and Chromium smoke test: all planes and orientation labels, coordinate continuity, active-plane breadcrumb, real window/level pixel changes, pan/zoom, recall flow, and a 390px touch-enabled viewport without horizontal overflow.
- [x] CI compares the compressed int16 sidecar byte-for-byte with the source NRRD CT and verifies sampled CT/labelmap transforms pixel-by-pixel in all three planes. The Pages build also checks representative live assets and excludes source ZIPs from the public artifact.
- [x] Main and synchronized viewers explain all-zero padded edge slices instead of disguising them as diagnostic black images; Chromium smoke covers this behavior in both layouts.
- [x] Pages deployment workflow restricted to `main`; feature branches and PRs must not overwrite the single public Pages site.
- [x] Interface language clarifies that anatomy controls filter real image overlays rather than a schematic drawing.

## Dataset acquisition plan

See [DATASET_ROADMAP.md](DATASET_ROADMAP.md) for reviewed candidate sources and their exact access/redistribution caveats. Do not mark head/chest coverage complete merely because candidate datasets have been identified.

## Release blockers

### Git / deployment

- [ ] Review and merge [PR #1](https://github.com/ArdKam/CT_edu/pull/1) only after its required gates are reviewed. It is still a Draft PR; do not treat the live preview as proof that `main` contains the code.
- [ ] After merge, confirm the resulting `main` SHA, Actions tests, Pages deploy, and live endpoint checks.
- [ ] Review public repository contents: the source ZIP archives are present in the repository even though the Pages artifact excludes them. Decide whether their continued public distribution is permitted by the exact source and third-party licenses.

### Privacy, legal, and governance

- [x] Add a bilingual, public [privacy notice](privacy.html) linked from the app, covering local-only progress, clear/export/restore behavior, no app-account upload, and the current Google Fonts third-party request.
- [ ] Complete the legal/privacy review of Google Fonts and static-hosting request logs; decide whether fonts should be self-hosted before a broader public release. The notice is transparent but is not a substitute for jurisdiction-specific legal advice.
- [ ] Confirm exact source and derivative redistribution permissions before publication; see [DATA_LICENSE_REVIEW.md](DATA_LICENSE_REVIEW.md) and [DATASET_ROADMAP.md](DATASET_ROADMAP.md).

### Medical image correctness and data

- [ ] Have a radiologist/anatomy educator review patient-left/right orientation, plane orientation, slice ordering, spacing, segmentation alignment, and tri-planar crosshair placement across all three planes.
- [ ] Obtain an independent radiologist/anatomy educator review of coronal/sagittal orientation, source physical geometry, left/right conventions, and overlay alignment. Automated pixel checks are necessary but do not replace this review; a larger display or more slice positions must not be represented as added resolution.
- [ ] Keep stored source intensities explicitly distinct from Hounsfield units until calibration is verified.
- [ ] Confirm redistribution/derivative-use rights for the SPL atlas and every included third-party component, attribution, notices, and modification language.
- [ ] Choose, document, and review licensed CT head and chest datasets before claiming multi-region clinical-case coverage.

### Educational product completeness

- [ ] Implement case-level clinical context, structured systematic-review prompts, abnormal-finding capture, diagnosis/differential, and structured Findings/Impression writing.
- [ ] Create reviewed cases with an explicit rubric, teaching rationale, key-finding annotations, accepted alternatives, and provenance.
- [x] Record active-recall outcomes in a bounded (500-attempt) local-only browser history, show attempts/accuracy/distinct structures, clear history, and export/import a validated versioned JSON backup (restore replaces history after confirmation). This is device/browser-local persistence only.
- [ ] Add account-backed, cross-device sync and per-skill durable history only after a backend and a privacy/data-retention design are approved.
- [ ] Separate normal-anatomy identification from pathology interpretation and report-writing assessments.
- [ ] Run a learner pilot with pre/post cases and a transfer test; record usability issues separately from learning outcomes.

### Viewer, accessibility, and security

- [x] Replace dynamic UI `innerHTML` construction with DOM APIs and `textContent`, validate anatomy palette values, add a restrictive CSP meta policy, and add tests for the HTML-sink contract and malicious search text. Chromium confirms the CSP is present and the injection probe creates no element and executes no code. This is a targeted client-side hardening baseline, not a complete security audit; the meta policy should be backed by deployment response headers when the hosting platform supports them.
- [ ] Conduct a broader browser/device matrix, including iOS Safari and Android devices; the current Chromium mobile smoke test is not comprehensive touch QA.
- [x] Add a synchronized side-by-side axial/coronal/sagittal overview with shared voxel-index crosshairs and separate i/j/k sliders. The overview does not claim patient-space coordinates or add oblique reconstruction; expert review of orientation and crosshair alignment remains open.
- [ ] Define case/image loading, memory, and responsiveness budgets from representative large studies and test them on lower-powered devices.
- [x] Targeted accessibility fixes: localize major landmarks and plane-specific slice-slider names; connect tri-planar sliders to their plane headings and coordinate outputs; expose passive tri-planar canvases as images and remove them from the tab order.
- [ ] Complete a broader accessibility audit of accessible names, focus order, keyboard operation, touch-target sizing, contrast, and reduced-motion behavior (automated smoke assertions are not a full WCAG audit).
- [ ] Keep reference interpretations server-side if a backend is introduced; never expose quiz answer keys before submission.
- [ ] Keep the educational-only/non-diagnostic disclaimer visible. Do not connect to clinical systems or market this as a diagnostic tool in this release.

## MVP acceptance gates

The MVP is ready for a small educational pilot only when all applicable items below pass:

1. A learner can select each supported anatomical region, inspect a complete study, navigate its slices, and use the supported window/level controls.
2. A learner can complete a guided case, submit an independent interpretation, receive reproducible rubric-based feedback, and attempt a different transfer case.
3. Every published case has documented source/license, anonymization status where applicable, a reviewed reference interpretation, and a versioned rubric.
4. Browser tests pass; no uncaught JS errors, failed required asset requests, or horizontal overflow occur in the supported viewport set.
5. Medical review and data-rights gates are documented and signed off; unresolved concerns remain visible rather than being represented as completed.
6. Any production release is built from the reviewed `main` commit and passes live deployment verification.

## Technical guardrails

- Current reference volume: SPL Abdominal Atlas, 256 × 256 × 113 voxels; approximately 0.9375 mm in-plane spacing and 1.5 mm between axial slices.
- The additional coronal and sagittal slice positions are reformats of this same volume; they do not add native detail.
- The current application remains a static prototype. React, FastAPI, PostgreSQL, general DICOM-series import, user accounts, and an AI interpreter are not implemented and should not be assumed to exist.
