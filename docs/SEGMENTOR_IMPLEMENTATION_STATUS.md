# Segmentor implementation status — manual annotation preview

Status reviewed: 2026-10-17

This document records what the Segmentor manual-annotation pull request implements. It is an implementation-status note, not a medical validation report or a replacement for the phased roadmap proposed in PR #22.

## Implemented in this phase

- A separate bilingual Persian RTL / English LTR preview route at `preview/segmentor.html`. The existing SPL CT volume viewer, tri-planar renderer, label-map engine, progress storage, and bookmark storage are not rewritten.
- Manual polygon draft creation, close/cancel, annotation selection, vertex editing with pointer and keyboard arrow keys, native-pixel coordinate entry, undo/redo, annotation naming, structure reassignment, annotation color overrides, per-annotation deletion, and confirmed clear of the current image draft.
- A schema-versioned JSON project model. Image identity incorporates dataset ID/version, plane, source index and exact source URL. Vertices and label points use the original source-image pixel coordinate system.
- Dataset/source dimensions and the annotation crop are checked when each image loads. For the current axial Wikimedia composite profile, the supported source dimensions are 786 × 346 and the editable CT area is x=0..530, y=0..346; the fixed right reference panel is outside the SVG clipping region. Any image with different dimensions is displayed without editing or saving enabled, rather than inferring a boundary.
- IndexedDB-only local persistence, with visible storage-unavailable/save-error feedback. Draft writes use an expected update timestamp so stale edits from another tab are rejected instead of silently replacing a newer image record.
- Validated JSON export and import preview, with separate explicit merge and full-replacement choices. Merge detects duplicate IDs and rejects conflicting content; replacement requires confirmation. The import parser is capped at 10 MiB.
- Provenance and review-state fields. New annotations start as manual drafts. This preview accepts draft review status only; importing a value that claims “reviewed” is rejected because this UI does not implement an independent review workflow.
- Unit/schema/geometry/storage tests, UI contract tests and a Chromium browser-smoke test wired into `.github/workflows/test.yml`.

## Source geometry and limitations

The implementation currently supports only the independent Wikimedia axial image sequence. It does not annotate the separate coronal or sagittal stacks and does not propagate polygons between them. The axial images are composite PNGs containing a fixed reference panel; the editor clips the overlay and editable area to the known source profile.

The crop profile is gated by actual loaded image dimensions, but matching dimensions alone are not proof that every source file has been medically or geometrically validated. The image collection still needs systematic per-image verification for dimensions, CT/panel boundary, orientation, slice order, sequence continuity and teaching suitability. If any source differs from the defined profile, editing is disabled for that image.

The saved coordinates describe pixels in each original static image. They are not DICOM patient-space coordinates, are not calibrated to millimetres, and do not establish cross-slice or cross-plane correspondence. These image stacks are not represented as one volumetric scan.

## Deliberately not included

- Automatic intensity-region suggestions: deferred until the manual editor’s geometry and persistence gates pass against actual source images.
- AI-generated contours: no backend, external image-fetch service or model integration is added.
- True 3D segmentation, volumetric masks, cross-slice interpolation, DICOM import/export, account sync and collaboration.
- A medical review or publication approval workflow.

All saved work remains local to the current browser profile. Exported JSON files are portable user-controlled backups; they are not synced or uploaded. A saved draft is not a reviewed annotation.

## Verification

Run the repository’s regular checks with `npm test`. The workflow also checks syntax for the new modules and invokes `tests/segmentor-browser-smoke.cjs` after installing its pinned Playwright version and starting a local HTTP server.

The browser smoke mocks the external axial image with a deterministic test image; it checks editor interaction and native SVG alignment but does not verify availability, geometry, correctness, licensing, or medical suitability of every remote Wikimedia file. CI success, when reported on the PR, establishes software behavior only and is not medical validation.

## Release posture

Opening this PR does not modify the public-release approval variable/latch or deploy anything. After an approved merge, the existing preview-only workflow stages this page under `/preview/segmentor.html` while `CT_EDU_PUBLIC_RELEASE_APPROVED` remains false; the production workflow still requires its separate `main`-branch release gate. The SPL production-viewer code is not changed. Keep it behind review until the new checks pass and the source-image geometry has been reviewed. Do not treat this status note as approval for diagnosis, clinical decisions or public medical use.
