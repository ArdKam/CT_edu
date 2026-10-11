# CT Edu — release gates and implementation status

Last reviewed: 2026-10-11
Scope: educational CT web app for clinical-year medical students.

This checklist separates code that exists from educational, legal, and release requirements that still need independent evidence. Passing software tests does not establish medical validity.

## Current implementation

- [x] Bilingual Persian RTL / English LTR static web workspace.
- [x] SPL Abdominal Atlas volume decoded into axial, coronal, and sagittal stacks.
- [x] Independent slice navigation, zoom/pan, source-intensity window/level, and label-map overlay.
- [x] Anatomy search, visibility controls, structure detail panel, and four-choice active recall.
- [x] Node unit/UI tests and Chromium smoke test, including a basic mobile viewport and plane-tab tap.
- [x] GitHub Pages build validates representative image assets, raw-volume size, and excludes source ZIP archives from the Pages artifact.
- [x] Pages deployment workflow restricted to `main`; feature branches and PRs must not overwrite the single public Pages site.
- [x] Interface language clarifies that anatomy controls filter real image overlays rather than a schematic drawing.

## Release blockers

### Git / deployment

- [ ] Review and merge [PR #1](https://github.com/ArdKam/CT_edu/pull/1) only after its required gates are reviewed. It is still a Draft PR; do not treat the live preview as proof that `main` contains the code.
- [ ] After merge, confirm the resulting `main` SHA, Actions tests, Pages deploy, and live endpoint checks.
- [ ] Review public repository contents: the source ZIP archives are present in the repository even though the Pages artifact excludes them. Decide whether their continued public distribution is permitted by the exact source and third-party licenses.

### Medical image correctness and data

- [ ] Have a radiologist/anatomy educator review patient-left/right orientation, plane orientation, slice ordering, spacing, and segmentation alignment across all three planes.
- [ ] Compare coronal and sagittal reformats against the source volume and its physical geometry; a larger display or more slice positions must not be represented as added resolution.
- [ ] Keep stored source intensities explicitly distinct from Hounsfield units until calibration is verified.
- [ ] Confirm redistribution/derivative-use rights for the SPL atlas and every included third-party component, attribution, notices, and modification language.
- [ ] Choose, document, and review licensed CT head and chest datasets before claiming multi-region clinical-case coverage.

### Educational product completeness

- [ ] Implement case-level clinical context, structured systematic-review prompts, abnormal-finding capture, diagnosis/differential, and structured Findings/Impression writing.
- [ ] Create reviewed cases with an explicit rubric, teaching rationale, key-finding annotations, accepted alternatives, and provenance.
- [ ] Implement durable attempt history and per-skill progress before describing progress as persistent.
- [ ] Separate normal-anatomy identification from pathology interpretation and report-writing assessments.
- [ ] Run a learner pilot with pre/post cases and a transfer test; record usability issues separately from learning outcomes.

### Viewer, accessibility, and security

- [ ] Conduct a broader browser/device matrix, including iOS Safari and Android devices; the current Chromium mobile smoke test is not comprehensive touch QA.
- [ ] Decide whether a simultaneous synchronized tri-planar layout is required for MVP; current controls switch between independent planes and do not provide shared crosshairs or oblique reconstruction.
- [ ] Define case/image loading, memory, and responsiveness budgets from representative large studies and test them on lower-powered devices.
- [ ] Audit accessible names, focus order, keyboard operation, touch targets, contrast, and reduced-motion behavior.
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
