# Segmentor roadmap — CT Edu

Status: experimental automatic major-organ preview implemented; manual annotation/editor and independent medical validation remain incomplete.
Scope: remotely generated, preview-only SPL abdominal masks for liver, spleen, and both kidneys; later manual 2D annotation work may target the separate Wikimedia axial image stack.
Last updated: 2026-10-17.

This roadmap adapts useful parts of the supplied Base44 Segmentor prototype to CT Edu's static, vanilla-JavaScript architecture. A hosted GitHub Actions runner has installed and executed TotalSegmentator and produced geometry-preserving 3D NIfTI masks, a combined label map, and axial PNG overlays. These are unreviewed model candidates, not clinically validated segmentations. The manual annotation editor, correction workflow, and independent evaluation are still planned work.

## Long-term coverage plan

The target of comprehensive organ and vessel segmentation, model-selection strategy, intensity/geometry requirements, class-specific evaluation, hosted inference, 3D correction, implementation phases, and next-session instructions are tracked in the [Comprehensive Segmentor implementation plan](SEGMENTOR_COMPREHENSIVE_IMPLEMENTATION_PLAN.md). Keep this plan and the detailed phase/exit criteria below in sync as implementation evidence changes.

## Product goal

Deliver reliable automatic segmentation of major non-vascular abdominal organs first, with source geometry preserved and generated masks visible in a preview. Then add an annotation/correction workflow that lets an authorised content author inspect, edit, label, save, and review output. Intensity thresholds are not organ recognition; optional AI contour proposals and broader 3D segmentation require separate validation.

## Non-negotiable architectural boundaries

- Preserve the existing SPL volumetric CT viewer, source intensities, label-map decoding, tri-planar coordinate model, quizzes, and current data stores. The Segmentor must not replace or fork these systems.
- Build the first version as vanilla JavaScript modules consistent with CT Edu; port behaviors and algorithms from Base44, not its React component tree, SDK, entity model, or service assumptions.
- For model-based organ segmentation, use the geometry-bearing SPL NRRD volume and its paired label map; do not use the Wikimedia PNG stacks as 3D model input. The Wikimedia axial/coronal/sagittal stacks are independent pre-rendered sequences, not synchronized reformats of one known volume, and remain a separate future 2D annotation target.
- Persist 2D annotations against stable dataset/version and image identity, not plane/index alone. Store polygon and label points in native source-image pixel coordinates.
- Distinguish manual annotations, deterministic suggestions, and AI proposals by provenance. New and generated work is a draft unless explicitly reviewed. “Published” or “reviewed” must never be inferred from a successful save.
- Do not describe grayscale/intensity-based regions as organ segmentation or AI contours as medically correct. This is an educational authoring feature, not a diagnostic tool.
- Keep annotation data local in the MVP, with a versioned schema and validated JSON export/import. Do not add accounts, cloud sync, or a backend solely to port Base44 functionality.
- The existing public-release latch and human medical, privacy, accessibility, and data-rights gates remain unchanged.

## Priority clarification — automatic major-organ segmentation

The primary product objective is **automatic segmentation of major body organs**, initially excluding vessels. For this objective, a pretrained model experiment should precede a complete manual authoring tool. Manual polygons remain the future correction/QA layer rather than the segmentation engine.

The first feasibility path uses the existing SPL abdominal NRRD volume and the paired reference labelmap. A remote GitHub Actions runner can install and execute TotalSegmentator so the maintainer does not need a local model installation. The first scope is liver, spleen, right kidney, and left kidney; do not request vessels. Predictions are exported as four independent binary masks per axial slice plus a manifest and overlap metrics against the bundled labels.

Important constraints:
- The SPL stored intensity values are not independently HU-calibrated. The legacy viewer's window level suggests subtracting 1024 as an experimental preprocessing assumption; the conversion must be stated explicitly and revisited if source metadata proves otherwise.
- Dice against the labels bundled with the same SPL volume is a technical consistency check, not an independent accuracy benchmark or expert review.
- The initial output is preview-only, model-generated, and unreviewed. Never silently replace the original atlas labels or treat the model output as approved teaching content.
- A result on this one normal-anatomy volume does not establish generalization to arbitrary CT scans, pathologies, contrast phases, different scanners, or incomplete coverage.
- The separate Wikimedia PNG stacks are not used as model input because their planes are independent image stacks, not a verified shared 3D volume.

Future segmentation work should follow this order: validate/run a pretrained model; review and measure results; integrate masks into the existing viewer without replacing its source labelmap; add manual mask correction; then evaluate external held-out volumes and broader organ coverage. Intensity thresholds and AI contours remain optional supporting tools rather than the core organ-recognition method.

## Implementation snapshot — 2026-10-17

### Completed technical experiment

- Hosted GitHub Actions installed TotalSegmentator 2.11.0 and ran CPU inference on the SPL abdominal NRRD volume. No maintainer-local model installation or execution was required.
- Initial target scope is liver, spleen, right kidney, and left kidney only. No vessel classes were requested.
- Generated four independent binary NIfTI masks (liver.nii.gz, spleen.nii.gz, kidney_right.nii.gz, kidney_left.nii.gz), one combined integer label map (major-organ-labelmap.nii.gz), 2,500 plane-specific PNG mask overlays (113 axial + 256 coronal + 256 sagittal slices per organ), and a versioned manifest.
- The five NIfTI assets preserve the source 256 × 256 × 113 voxel grid, RAS affine and approximately 0.9375 × 0.9375 × 1.5 mm spacing. The manifest records source NRRD spatial metadata, model metadata, the intensity-offset assumption, and unreviewed status.
- A bilingual preview at preview/organ-segmentation.html exposes axial/coronal/sagittal selection, linked voxel-coordinate readout and crosshairs, per-organ toggles, plane-specific slice navigation, overlay opacity, and downloads for the combined and per-organ 3D masks.
- The Pages build now copies preview/ into the staged site and validates the preview route, manifest, 2,500 three-plane mask PNGs, and five NIfTI files. The inference job also checks sampled PNG masks pixel-for-pixel against the 3D mask in each plane and verifies the source affine. This only builds the artifact; the public deploy job remains guarded by CT_EDU_PUBLIC_RELEASE_APPROVED.

### Initial same-volume comparison

| Organ | Dice against bundled atlas label |
| --- | ---: |
| Liver | 0.91384 |
| Spleen | 0.79825 |
| Right kidney | 0.88139 |
| Left kidney | 0.89130 |

These values are technical overlap measurements against labels bundled with the same input atlas. They are not held-out metrics, independent ground truth, expert review, or evidence of clinical performance.

### Limitations still open

- The source intensity array has not been independently confirmed as HU. The run subtracts 1024 as an explicit experimental assumption derived from the existing raw window-level setting; validate calibration before asserting model performance.
- Expert review of mask boundaries, left/right interpretation, coverage and slice-to-slice plausibility is still required.
- External held-out validation on independent cases and additional scan conditions is required before generalizing beyond this source volume.
- Manual 3D mask correction and persistence are not included in this model preview; the separate Wikimedia 2D polygon editor does not share geometry with this SPL volume and must not be used as a correction layer for these masks.
- The output is preview-only and not for diagnosis or clinical decisions.

## Phases and exit criteria

### Phase 0 — repository and data-contract groundwork (P0)

- Recheck the actual latest `main` commit and relevant files before implementation. Work on a feature branch; do not write directly to `main`.
- Define a versioned annotation schema with `datasetId`, `datasetVersion`, `plane`, stable `imageId`/source URL (and a content hash where practical), image dimensions, stable `structureId`, polygon points, label point, provenance, review status, and timestamps.
- Specify handling for duplicate structure names, annotation IDs, concurrent/stale edits, import validation, explicit replacement, and merge conflicts.
- Add geometry and storage unit-test fixtures before connecting the editor to real persistence.

**Exit gate:** data identity and merge semantics are defined; image identity is not inferred solely from slice index; no existing annotations can be silently overwritten.

### Phase 1 — shared image/overlay geometry (P0)

- Integrate an SVG overlay into the existing Wikimedia axial stack viewer without replacing its navigation or image-loading logic.
- Apply pan, zoom, fit/reset, responsive sizing, and image changes to the image and overlay through one shared transform or a demonstrably equivalent coordinate transform.
- Keep all stored coordinates in native image pixels and convert pointer coordinates using the actual SVG/image transform.
- Exclude the fixed reference panel. Prefer explicit source-panel metadata; if panel-boundary detection is uncertain, disable drawing/suggestions rather than guessing.
- Handle failed or superseded image loads, slice/plane changes during drawing, pointer cancellation, resize, and keyboard/touch interaction.

**Exit gate:** overlays stay attached to the same anatomy at different viewport sizes and zoom/pan levels; no editable region can enter the reference panel; original viewer navigation remains regression-free.

### Phase 2 — manual polygon editor MVP (P0)

Port the behaviors—not React/Base44 dependencies—from the prototype components: polygon canvas, annotation editor, structure panel, anatomy legend, structure details, and saved-outline legend.

Minimum behavior:
- Draw, close, cancel, and select a polygon; add/remove vertices; rename/reassign structure; change color; undo/redo; delete an annotation; clear only the current draft.
- Show a visible draft state before saving and a reliable saved-state indication after saving.
- Navigate images without accidentally attaching a draft to the next image; confirm before destructive replacement/deletion.
- Provide clear empty, loading, error, and unsupported-image states.
- Keep UI bilingual (Persian RTL and English LTR), keyboard operable, and touch-usable.

**Exit gate:** a user can create, edit, save, close/reopen, and re-edit an annotation on the same source image with accurate alignment, with no silent data loss.

### Phase 3 — local persistence, import/export, and test hardening (P0)

- Use a small versioned local store. Prefer IndexedDB if annotation volume makes Web Storage limits or synchronous blocking problematic.
- Validate every read and import: schema version, source identity, finite coordinates, image bounds, point count, minimum polygon area, non-degenerate edges, and safe maximum payload size.
- Export and restore a documented JSON format. Preview the import summary and require confirmation before replacing data.
- Preserve provenance, stable IDs, review state, and timestamps across round-trips.
- Add deliberate merge/replacement rules. Never group records by lowercased label alone and never overwrite annotations sharing a slice key without an explicit decision.
- Handle unavailable/blocked local storage and malformed or older schema versions without breaking the viewer.

**Exit gate:** tests cover round-trips, invalid imports, duplicate records, partial failures, repeated saves, ID stability, and conflict/overwrite behavior.

### Phase 4 — deterministic intensity-region suggestions (P1, after P0)

Only proceed when Phases 1–3 pass. Adapt the supplied grayscale threshold and connected-component engine as an optional “Suggest intensity regions” tool.

- Operate only on the CT portion of the selected image; test actual source dimensions, panel separators, contrast, image boundaries, and failed image loads.
- Correct the contour-selection logic: selecting the loop with the most vertices is not a reliable proxy for the largest enclosed area. Validate closed loops, area, orientation, self-intersections, and simplification output.
- Make threshold parameters and algorithm version explicit. Handle holes, noisy boundaries, empty masks, tiny components, and pathological input dimensions.
- Keep generated regions unnamed or clearly labelled as intensity classes (e.g. body envelope, bright region, air-like region). Never infer organ identity from intensity or copy a structure name onto an algorithmic region as if it were recognised anatomy.
- Make long processing cancellable within a slice (e.g. chunked work or a Worker), not only between slices. Measure memory and run-time before enabling range processing.
- Preview, edit, reject, and selectively save results as drafts. Retain algorithm provenance and source-image identity. Saving suggestions must never delete or merge into manual annotations without an explicit, tested operation.

**Exit gate:** deterministic fixture coverage validates panel exclusion, boundaries, holes, contour geometry, cancellation, repeated processing, non-destructive saving, and responsive UI behavior. Medical usefulness remains a separate human-review question.

### Phase 5 — optional AI-assisted contour proposals (P2, backend/security gate)

Do not port the supplied Base44 function directly. CT Edu is currently a static GitHub Pages application; an AI proposal endpoint requires a separately designed and deployed backend.

Before this phase:
- Define authentication, authorization, rate limiting, privacy, retention, provider terms, and user-facing disclosure.
- Use strict allowlisted source hosts; validate redirects and final destinations; constrain response size, content type, timeouts, and dimensions to mitigate server-side request forgery and resource exhaustion.
- Specify normalized or pixel coordinate semantics explicitly in the schema; do not guess the format by examining arbitrary numbers in model output.
- Validate polygon closure, finite coordinates, bounds, self-intersections, label placement, maximum vertices and regions, and all unexpected/missing fields.
- Keep outputs editable, traceable, and in draft status. Require explicit human acceptance and independent clinical/anatomical review before presenting them as verified educational content.

**Exit gate:** security and failure-mode tests pass; no arbitrary URL fetch is possible; human reviewers assess a representative sample; uncertainty and limitations are visible.

### Phase 6 — optional true-volume segmentation (separate workstream, P2/P3)

This is not an extension of the independent Wikimedia image stacks. It requires a dataset with verified shared geometry, voxel spacing, orientation, and a source licence that permits the intended use.

Potential work:
- Voxel/labelmap editing for the SPL volume or another explicitly approved volume dataset.
- Brush/eraser tools, region fill, mask painting, 3D previews, and carefully validated interpolation between neighbouring slices.
- Import/export of masks using formats whose geometry and metadata are preserved (for example, NIfTI; DICOM SEG only when all required DICOM geometry and metadata are valid).
- A separately evaluated anatomical segmentation model, using expert-labelled ground truth and appropriate metrics such as Dice and surface-distance measures, stratified by structure and scan characteristics.
- Overlay checks across all three planes and qualified review of orientation, alignment, label meaning, and failure modes.

**Exit gate:** source geometry and permissions are verified, mask transformations are tested against the source volume, and independent domain experts review the segmentation. A technically valid mask is not automatically a medically valid annotation.

## Required automated verification

Extend, rather than replace, existing tests. At minimum cover:

- Correct source image / dataset / plane identity and native-pixel coordinate round-trips.
- Overlay alignment after zoom, pan, fit/reset, resize, image navigation, and failed/superseded loads.
- Reference-panel exclusion and all boundary cases.
- Polygon editing and keyboard/pointer/touch behavior, including RTL/LTR.
- Local store failure, schema versioning, export/import, duplicate saves, deletion and overwrite protection.
- Deterministic intensity-engine fixtures and cancellation, before exposing range processing.
- Existing SPL viewer, tri-planar geometry, label-map rendering, learning progress, bookmarks, page navigation, mobile layout, CSP and release-latch regressions.

Passing software tests establishes technical behavior only; it does not establish clinical accuracy, appropriate teaching, legal clearance, or production-release approval.

## Future improvements backlog

These are candidates, not commitments, and should only be prioritized after the MVP proves useful:

1. **Annotation quality-of-life:** freehand brush/eraser, polygon smoothing, vertex snapping, keyboard shortcuts, undo/redo history, comparison view, opacity controls, and side-by-side original/annotated images.
2. **Authoring and education:** structure-specific review checklists, learner-facing show/hide/reveal modes, annotation-linked active recall, reviewed reference overlays, author feedback and change history.
3. **Review governance:** reviewer identity and role, audit events, two-person approval for publication, version comparison, disputed annotations, and an explicit review expiry/revalidation policy.
4. **Efficient 2D editing:** interpolation suggestions between adjacent slices only when the images are proven to share the same volume geometry; never interpolate across independent Wikimedia stacks.
5. **Semantic segmentation:** a validated model or approved pre-labelled dataset, uncertainty visualization, expert correction, structure-specific quality metrics, and documented failure examples.
6. **True 3D workflows:** multi-plane mask editing, volumetric rendering, mask measurements, and standards-based export only after geometry and data rights have passed review.
7. **Collaboration and sync:** accounts, server storage, version control, and teacher dashboards only after a backend architecture, access controls, privacy notice, retention plan, backup/recovery, and threat model are approved.
8. **Performance and accessibility:** Web Workers, lazy rendering, memory limits, offline-capability evaluation, screen-reader review, mobile Safari/Android testing, and reduced-motion / contrast regression coverage.

## Explicit non-goals for the first release

- Replacing the SPL viewer or its label-map engine.
- Treating the 648 separate Wikimedia images as one 3D volume.
- Claiming that grayscale thresholding identifies organs.
- Automatically publishing AI output or presenting generated contours as clinically verified.
- Adding accounts, cloud sync, DICOM import, or a server solely to match Base44's architecture.
- Enabling the public-release approval variable as part of this work.

## Definition of done for the first release

The preview-only manual annotation MVP is complete when Phases 0–3 and their exit gates pass, the repository's existing test and browser checks remain green, the feature is discoverable only through the intended preview workflow, and the release documentation explicitly says that annotations are author-created drafts rather than medically approved content. Phases 4–6 remain future work until separately approved.

## Additive implementation note — 3D mask correction workspace (2026-10-17)

A dedicated voxel-level correction workspace is implemented in `main`, separately from the Wikimedia axial polygon editor. See [SEGMENTOR_3D_MASK_CORRECTION.md](SEGMENTOR_3D_MASK_CORRECTION.md) for the current behavior contract and merge gates.

The workspace loads the existing per-organ NIfTI mask volumes read-only, validates their dimensions, uint8 datatype, explicit millimetre units and affine, then paints/erases the shared voxel arrays used by axial, coronal and sagittal views. Edits are a versioned local IndexedDB draft; original predictions and the source labelmap remain unchanged. It provides stroke cancellation, undo/redo, source-fingerprinted draft reopening, per-organ NIfTI export and a combined label-map export with explicit overlap precedence.

The implementation passed the repository’s Node/unit suite, the existing CT viewer browser smoke test, and the dedicated Chromium correction smoke test in PR #37; Pages artifact staging also passed. The feature remains experimental and has not received anatomical approval. It does not establish anatomical accuracy, fix the unverified intensity conversion, add general CT upload inference or grant educational approval. Independent multi-volume validation, qualified anatomical review, exact licensing review and public-release approval remain separate gates.

