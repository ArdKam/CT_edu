# Segmentor 3D mask correction workspace

**Status:** merged into `main` on 17 October 2026. The correction route is included in the Pages build; production deployment remains subject to the existing release gate.  
**Feature:** voxel-level correction of the experimental SPL four-organ prediction volumes.  
**Input:** the committed NIfTI masks and source-grid geometry described by `preview/assets/organ-predictions/manifest.json`.

## Implemented in this increment

- A separate `preview/organ-mask-correction.html` workspace; it does not replace the read-only model preview or the unrelated Wikimedia 2D polygon editor.
- NIfTI-1 gzip loading in the browser, including checks for uint8 labels, 3D dimensions, source affine, explicit millimetre units, file length, and binary per-organ mask values.
- One shared voxel array per organ is edited across axial, coronal, and sagittal views. The coordinate mapping is derived from the NIfTI XYZ data order and the documented CT Edu display transforms.
- A paint/erase brush whose radius is specified in millimetres and converted to a spacing-aware ellipse for each plane.
- Stroke cancellation, bounded undo/redo history, linked voxel-coordinate readout, per-organ visibility, and active-organ selection.
- A version-1 local IndexedDB draft keyed by a fingerprint of the source dataset, affine, model/task, class list and mask filenames. Sparse overrides are stored rather than duplicate multi-megabyte volumes. Drafts remain local to this browser.
- Corrected per-organ NIfTI-1 gzip export and combined label-map export. Exports retain the original NIfTI header/affine and use the edited voxel arrays. The combined map applies manifest organ order where classes overlap; separate masks remain authoritative.
- Focused Node core tests, UI contract tests, and a Playwright smoke test for an actual voxel edit, orthogonal-view update, local save/reopen, undo/redo, and NIfTI download.
- Pages staging checks for the new HTML, JavaScript, CSS and hub link. This change does not open the production deployment gate.

## Data and editing contract

The original prediction assets are fetched read-only and fingerprinted from their exact compressed bytes. Edits occur in separate browser memory arrays and are tracked as a sparse map of voxel index to the corrected binary value. The source/model fingerprint includes the actual individual mask and combined-label-map assets so a newly generated output will not silently reuse an older correction draft. The original masks on disk, the source SPL label map and the model manifest are never written by this page.

When the user completes a stroke, the workspace updates the undo history and attempts to save the versioned draft in IndexedDB. The interface reports failures and does not claim local persistence if it cannot be confirmed. On reopen, the draft is restored only for a matching source/model fingerprint and a valid schema. Clearing local edits requires explicit confirmation.

An exported file is an **edited, unreviewed draft**, not an approved reference. NIfTI dimensions, datatype, spatial units and affine are retained and validated; no automated resampling, flipping or resizing is performed to hide a geometry mismatch. Combined label maps cannot represent overlapping class membership, so overlaps are resolved by declared organ order and the export UI warns about that limitation.

## Known limitations and next work

- The current model masks remain experimental outputs for one SPL abdominal atlas. The correction tool does not resolve the 1024 intensity-offset hypothesis, prove anatomical correctness, or establish external accuracy.
- This is a local authoring tool for the bundled masks, not a general CT upload-to-inference pipeline. Arbitrary DICOM series, new scans, users, cloud synchronization and server persistence remain out of scope.
- The browser's gzip streaming APIs are required for NIfTI import/export. Unsupported browsers fail explicitly; no false-success export message is shown.
- Local IndexedDB data can be cleared by browser storage management. Authors should export an updated NIfTI draft when they need a portable copy. This version does not implement multi-tab edit locking or collaborative conflict resolution.
- Undo/redo is session-local; the persisted state is the current draft rather than a full audit history of every action. Qualified reviewer identity, formal review comments, sign-off workflow and version comparison are future work.
- Browser tests verify implementation behavior and coordinate consistency. They do not constitute anatomical validation, dataset/model licensing clearance, or educational approval.
- Vessel workflows will need vessel-specific review metrics (centerline coverage, branch sensitivity, continuity and false-positive branches); the current four-organ brush editor is not a vascular accuracy solution.

## Verification required before merge

1. Pass the complete CT Edu Node suite, Python checks, existing tri-planar viewer smoke tests and the new Playwright correction smoke.
2. Pass the Pages build and verify the new workspace assets are staged while the deploy job remains gated.
3. Review the sparse-edit lifecycle and IDB failure paths, export header/affine preservation, overlap handling, responsive pointer interaction and browser support.
4. Keep the editor explicitly experimental and avoid marking any mask reviewed or approved.
5. Continue independent held-out segmentation validation and anatomical review as separate release gates.
