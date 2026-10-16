# CT Edu — release gates and implementation status

Last reviewed: 2026-10-16
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
- [x] Split Pages build from deployment: PRs and feature branches build and validate the complete `_site` artifact (including privacy page and orthogonal CT files), while the public deploy job is skipped unless the ref is `main`.
- [x] Add a fail-closed public-release latch: Pages deploys only from `main` when the repository Actions variable `CT_EDU_PUBLIC_RELEASE_APPROVED` is explicitly set to `true`. Do not enable it until the independent medical, legal, privacy, and device-review gates are closed; the variable itself is not evidence that those reviews occurred.
- [x] Pin GitHub Actions to full official release commit SHAs, annotate each with its release version, schedule weekly Dependabot action updates, and pin Playwright 1.63.0 for reproducible Chromium smoke runs.
- [x] Add the public bilingual [privacy notice](privacy.html), link it in the app, and configure Pages staging/live probes for it; the feature-branch CI does not make this notice live until the branch is merged and deployed.
- [x] Interface language clarifies that anatomy controls filter real image overlays rather than a schematic drawing.
- [x] Introduce shared light-theme text, teal and keyboard-focus tokens; add automated contrast regression tests for the ink, secondary-text, brand and focus tokens on paper/white surfaces. This covers selected design tokens, not every color use in every component or dark-surface text.
- [x] Apply the `prefers-reduced-motion` preference app-wide and increase touch-target sizes for the core mobile CT plane, slice, zoom, case navigation, filter and report controls. Automated CSS contract tests cover declared sizes; physical-device validation remains open.
- [x] Extend mobile touch sizing to bookmark save/delete/export controls, radiograph controls, modality detail actions, and Window/Level buttons. Core plane and slice controls now use 44px targets; compact zoom controls use 36px targets. CSS contract tests cover these declarations; physical-device layout QA remains open.
- [x] Label Radiopaedia destinations as source study pages rather than implying a guaranteed standalone viewer; show that live image loading, medical review and redistribution rights remain separate checks.
- [x] Prevent the guided-case preview workflow from deploying once `CT_EDU_PUBLIC_RELEASE_APPROVED=true`, so its stable-baseline artifact cannot overwrite an approved production site.
- [x] Show each guided-case record's source/image verification status in the case list and in the active case workspace, with bilingual copy that separates source loading from medical validation and redistribution permission.

## Dataset acquisition plan

See [DATASET_ROADMAP.md](DATASET_ROADMAP.md) for reviewed candidate sources and their exact access/redistribution caveats. Do not mark head/chest coverage complete merely because candidate datasets have been identified.

## Current verification snapshot — 2026-10-14 (updated after guided-case preview)

- Base revision inspected for this status update: `main @ d0b1cb71cf80d3c1735b2b891ac2e50375434233`. The guided-case implementation was merged in [PR #2](https://github.com/ArdKam/CT_edu/pull/2); this revision adds the main-only preview publication workflow.
- The full [CT Edu checks run](https://github.com/ArdKam/CT_edu/actions/runs/38543661457) reported success for the merged implementation: Node tests, source-volume/labelmap validation, and Chromium/Firefox/WebKit smoke checks. This is the run recorded for the feature merge; it should not be described as a fresh full-suite result for every later SHA.
- The [guided-case preview deployment run](https://github.com/ArdKam/CT_edu/actions/runs/38545091431) completed both build and deploy jobs and passed live HTTP/content probes for the root navigation, preview page, case metadata, and guided-case script.
- **Live preview:** https://ardkam.github.io/CT_edu/preview/cases.html. The root URL https://ardkam.github.io/CT_edu/ retains the `a54bc01` stable baseline feature set with an added preview link; the new guided-case workspace is served from `/preview/cases.html`. This is intentionally not represented as a full production release.
- Automated checks establish technical behavior only. No radiologist/anatomy-educator approval, Radiopaedia item-specific permission determination, source ZIP redistribution clearance, jurisdiction-specific legal review, physical-device sign-off, or full accessibility review has been recorded here.
## Maintenance verification — 2026-10-16

- Latest `main` revision inspected for this update: [`1785a7dde4cafec5706c82add069452d830c1bb5`](https://github.com/ArdKam/CT_edu/commit/1785a7dde4cafec5706c82add069452d830c1bb5), after merges of [PR #14](https://github.com/ArdKam/CT_edu/pull/14), [PR #15](https://github.com/ArdKam/CT_edu/pull/15), [PR #16](https://github.com/ArdKam/CT_edu/pull/16), [PR #17](https://github.com/ArdKam/CT_edu/pull/17), and [PR #18](https://github.com/ArdKam/CT_edu/pull/18).
- PR #12 and PR #13 improved selected light-theme contrast and focus indicators, added contrast regressions, applied `prefers-reduced-motion` app-wide, and began raising mobile touch targets.
- PR #14 clarifies that Radiopaedia Study destinations are source-hosted pages, not proof of a CT Edu-native viewer or guaranteed iframe image loading. Its checks passed; the 52 added catalog candidates remain partially verified.
- PR #15 adds a deployment guard: once `CT_EDU_PUBLIC_RELEASE_APPROVED=true`, the preview workflow builds/checks but does not publish over the production site.
- PR #16 fixes the search placeholder CSS declaration and expands contrast regressions for selected small text and controls. Its Node/UI and browser checks passed.
- PR #17 raises remaining mobile controls (including slice, Window/Level, bookmarks and radiograph actions) and adds rendered Chromium target-size assertions at a 390px touch-enabled viewport. CI passed, but physical iOS/Android validation remains open.
- PR #18 exposes source/image verification status in the case list and active workspace, and explicitly distinguishes source loading from medical review and redistribution rights. CI passed; this does not make any case medically reviewed or rights-cleared.
- The latest feature PR checks and Pages builds succeeded; the actual production Pages deployment remained skipped behind the public-release approval latch. This maintenance update does not close any medical, legal, image-rights, privacy, physical-device, or full accessibility sign-off.

## Release blockers

### Git / deployment

- [x] PR #1 is merged into `main` at the current baseline (`a54bc01` at the time of this review). The prior Draft-PR status was stale. This does not close any medical, rights, privacy, device, or release-deployment gate.
- [x] Guided-case workspace and its local-draft/self-review workflow are merged into `main` (PR #2); the dedicated preview route has been published and checked by [workflow run 38545091431](https://github.com/ArdKam/CT_edu/actions/runs/38545091431).
- [x] Keep the stable root app distinct from the preview until release gates pass. The preview workflow rebuilds the `a54bc01` baseline and adds a link to `/preview/cases.html`; it does not promote all current `main` code to the root URL.
- [ ] Promote the guided-case workspace to the root production experience only after required medical, legal, privacy, accessibility and device evidence is recorded.
- [ ] Keep `CT_EDU_PUBLIC_RELEASE_APPROVED` unset while any release blocker remains. Only after the medical, legal, privacy, accessibility, and device-review evidence is recorded should the maintainer set it to `true`; then confirm the resulting `main` SHA, Actions tests, Pages deploy, and live endpoint checks.
- [ ] Review public repository contents: the source ZIP archives are present in the repository even though the Pages artifact excludes them. Decide whether their continued public distribution is permitted by the exact source and third-party licenses.

### Privacy, legal, and governance

- [x] Add [`SECURITY.md`](SECURITY.md) with private vulnerability-reporting instructions, scope notes, and a warning not to submit patient data or backups in public reports.
- [ ] Verify GitHub private vulnerability reporting is enabled for this repository; confirm a private fallback contact method before broader public release.
- [x] Add a bilingual, public [privacy notice](privacy.html) linked from the app, covering local-only progress, clear/export/restore behavior, no app-account upload, and the current Google Fonts third-party request.
- [ ] Complete the legal/privacy review of Google Fonts and static-hosting request logs; decide whether fonts should be self-hosted before a broader public release. The notice is transparent but is not a substitute for jurisdiction-specific legal advice.
- [ ] Review the current Radiopaedia Terms of Use and the exact referenced case/item rights. Current links open source pages; an in-app Radiopaedia viewer is not implemented. Do not claim embedded image viewing until the source provides a supported embed mechanism or image assets have confirmed reuse rights.
- [ ] Confirm exact source and derivative redistribution permissions before publication; see [DATA_LICENSE_REVIEW.md](DATA_LICENSE_REVIEW.md) and [DATASET_ROADMAP.md](DATASET_ROADMAP.md).

### Medical image correctness and data

- [ ] Have a radiologist/anatomy educator review patient-left/right orientation, plane orientation, slice ordering, spacing, segmentation alignment, and tri-planar crosshair placement across all three planes.
- [ ] Obtain an independent radiologist/anatomy educator review of coronal/sagittal orientation, source physical geometry, left/right conventions, and overlay alignment. Automated pixel checks are necessary but do not replace this review; a larger display or more slice positions must not be represented as added resolution.
- [ ] Keep stored source intensities explicitly distinct from Hounsfield units until calibration is verified.
- [ ] Confirm redistribution/derivative-use rights for the SPL atlas and every included third-party component, attribution, notices, and modification language.
- [ ] Choose, document, and review licensed CT head and chest datasets before claiming multi-region clinical-case coverage.

### Educational product completeness

- [x] Implement the guided-case workflow scaffold: bilingual teaching context, systematic-review objectives, Findings/differential/Impression fields, local drafts, and self-review checklist. This records learner self-attestation only; it does not provide a reviewed reference interpretation or automatic grading.
- [x] Add a bilingual guided-case workspace with structured Findings/differential/Impression fields, locally saved drafts, self-review checklists and explicit external Radiopaedia source-page links. The source links are not an embedded viewer. This is workflow scaffolding only; the prompts are not validated interpretations and must not be treated as approved cases.
- [x] Add a draft case-authoring template and validator that require provenance, image-integrity metadata, bilingual guided steps, rubric structure, independent review records, privacy checks, and explicit publication approval. The template is empty and is not an approved educational case.
- [ ] Create reviewed cases with an explicit rubric, teaching rationale, key-finding annotations, accepted alternatives, and provenance.
- [x] Record active-recall outcomes in a bounded (500-attempt) local-only browser history, show attempts/accuracy/distinct structures, clear history, and export/import a validated versioned JSON backup (restore replaces history after confirmation). This is device/browser-local persistence only.
- [x] Add local slice bookmarks with stable case ID, plane/index, i/j/k coordinates, selected structure, optional plain-text note (maximum 500 characters), per-location de-duplication, a 100-bookmark cap, per-item deletion, and versioned export/restore with validation and a 1 MB input cap. Bookmarks and notes remain in local browser storage.
- [x] Add a versioned case manifest for the current SPL normal-anatomy example, recording source, volume geometry, intensity semantics, and open expert/legal review gates. The manifest is not a substitute for case review or rights clearance.
- [ ] Add account-backed, cross-device sync and per-skill durable history only after a backend and a privacy/data-retention design are approved.
- [ ] Separate normal-anatomy identification from pathology interpretation and report-writing assessments.
- [ ] Run a learner pilot with pre/post cases and a transfer test; record usability issues separately from learning outcomes.

### Viewer, accessibility, and security

- [x] Restore opt-in external source-frame support for the four pre-existing guided cases and records with a specifically recorded `studyPageUrl`; new candidates without a study URL do not fall back to embedding the generic case page. Automated checks cover routing and opt-in, not successful third-party image load.
- [ ] Validate live image loading for each enabled case and implement a genuine in-app CT stack viewer if the product requirement is to browse slices natively inside CT Edu. A URL shaped like `https://radiopaedia.org/cases/{id}/studies/{id}` remains a Radiopaedia page, not proof of a standalone embeddable endpoint.

- [x] Replace dynamic UI `innerHTML` construction with DOM APIs and `textContent`, validate anatomy palette values, add a restrictive CSP meta policy, and add tests for the HTML-sink contract and malicious search text. Chromium confirms the CSP is present and the injection probe creates no element and executes no code. This is a targeted client-side hardening baseline, not a complete security audit; the meta policy should be backed by deployment response headers when the hosting platform supports them.
- [x] Add Playwright compatibility smoke checks for Chromium, Firefox, and Playwright WebKit at a 390px viewport; Chromium/WebKit also use touch/mobile emulation where supported. These checks validate basic cross-engine behavior, not certification on physical phones.
- [ ] Conduct a real-device browser/device matrix, including Safari on iOS and Android Chrome on physical devices; Playwright WebKit and emulated mobile profiles do not replace this release gate.
- [x] Add a synchronized side-by-side axial/coronal/sagittal overview with shared voxel-index crosshairs and separate i/j/k sliders. The overview does not claim patient-space coordinates or add oblique reconstruction; expert review of orientation and crosshair alignment remains open.
- [ ] Define case/image loading, memory, and responsiveness budgets from representative large studies and test them on lower-powered devices.
- [x] Targeted accessibility fixes: localize major landmarks and plane-specific slice-slider names; connect tri-planar sliders to their plane headings and coordinate outputs; expose passive tri-planar canvases as images and remove them from the tab order.
- [ ] Complete a broader accessibility audit of accessible names, focus order, keyboard operation, touch-target sizing, contrast, screen-reader behavior, and reduced-motion behavior. Contrast-token regression tests and app-wide reduced-motion CSS now exist, but automated checks are not a full WCAG audit and physical-device/screen-reader validation remains open.
- [ ] Keep reference interpretations server-side if a backend is introduced; never expose quiz answer keys before submission.
- [ ] Keep the educational-only/non-diagnostic disclaimer visible. Do not connect to clinical systems or market this as a diagnostic tool in this release.

## MVP acceptance gates

The MVP is ready for a small educational pilot only when all applicable items below pass:

1. A learner can select each supported anatomical region, inspect a complete study, navigate its slices, use the supported window/level controls, and save/resume a local bookmark for a reviewed case.
2. A learner can complete a guided case, submit an independent interpretation, receive reproducible rubric-based feedback, and attempt a different transfer case.
3. Every published case has documented source/license, anonymization status where applicable, a reviewed reference interpretation, and a versioned rubric.
4. Browser tests pass; no uncaught JS errors, failed required asset requests, or horizontal overflow occur in the supported viewport set.
5. Medical review and data-rights gates are documented and signed off; unresolved concerns remain visible rather than being represented as completed.
6. Any production release is built from the reviewed `main` commit and passes live deployment verification.

## Technical guardrails

- Current reference volume: SPL Abdominal Atlas, 256 × 256 × 113 voxels; approximately 0.9375 mm in-plane spacing and 1.5 mm between axial slices.
- The additional coronal and sagittal slice positions are reformats of this same volume; they do not add native detail.
- The current application remains a static prototype. React, FastAPI, PostgreSQL, general DICOM-series import, user accounts, and an AI interpreter are not implemented and should not be assumed to exist.
