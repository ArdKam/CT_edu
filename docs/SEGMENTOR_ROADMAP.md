# Segmentor roadmap — CT Edu

Status: proposed; not implemented in CT Edu.
Scope: a safe, preview-only annotation workflow, initially for the separate Wikimedia axial image stack.
Last updated: 2026-10-17.

This roadmap adapts the useful parts of the supplied Base44 Segmentor prototype to CT Edu's current static, vanilla-JavaScript architecture. It is not a claim that anatomical segmentation, AI contour generation, or annotation review is already implemented.

## Product goal

Allow a learner or authorised content author to draw, edit, label, save, and review polygon annotations on a specific source image. Add deterministic intensity-region suggestions only after manual annotation is stable. Consider AI proposals and true volumetric segmentation only as later, separately validated capabilities.

## Non-negotiable architectural boundaries

- Preserve the existing SPL volumetric CT viewer, source intensities, label-map decoding, tri-planar coordinate model, quizzes, and current data stores. The Segmentor must not replace or fork these systems.
- Build the first version as vanilla JavaScript modules consistent with CT Edu; port behaviors and algorithms from Base44, not its React component tree, SDK, entity model, or service assumptions.
- Start with the separate Wikimedia image-stack preview, initially axial only. Its axial, coronal, and sagittal images are independent pre-rendered stacks, not spatially synchronized reformats of one known volume.
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
