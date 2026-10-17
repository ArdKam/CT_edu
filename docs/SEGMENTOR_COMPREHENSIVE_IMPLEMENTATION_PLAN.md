# Segmentor: comprehensive organ and vessel segmentation plan

**Status:** strategic implementation contract; not a claim that the full goal is already implemented  
**Last reviewed:** 2026-10-17  
**Repository:** ArdKam/CT_edu  
**Current verified starting point:** main at `643a182272ab9b5d7d12b24068bb88f85a836ff9` at the time this plan was written

This document is the durable instruction set for the next Segmentor implementation sessions. Re-read it alongside the live repository state before making changes. It expands the existing [Segmentor roadmap](SEGMENTOR_ROADMAP.md); it does not replace the more detailed annotation-editor phases or the repository's release gates.

## 1. Product outcome

Build a reliable, extensible segmentation system for medical-education anatomy. It should automatically segment as many clinically meaningful organs, anatomical structures, and vessels as can be reliably resolved on supported CT acquisitions; preserve 3D geometry; quantify per-structure quality; permit controlled correction; and make model provenance and review status explicit.

The long-term ambition is broad whole-body organ and vessel coverage, not a promise that every anatomical structure or every tiny vessel can be segmented accurately on every scan. Visibility and resolvability depend on acquisition, contrast phase, field of view, voxel spacing, reconstruction, pathology, and the model's supported domain. A structure that is not present or resolvable must not receive a fabricated mask or be presented as successfully segmented.

The initial product is for anatomy exploration, medical education, and creation of reviewed teaching material. It is not a diagnostic system, and unreviewed predictions must never be presented as clinically validated or medically approved.

## 2. Verified baseline at the time of writing

Repository state must be rechecked at the start of every future session; these facts are a historical anchor rather than a substitute for checking current HEAD.

At the time of writing, the project has an experimental model-based preview using TotalSegmentator 2.11.0 on a hosted GitHub Actions CPU runner in fast/approximately 3 mm mode. The current requested classes are liver, spleen, right kidney, and left kidney. The source SPL volume has dimensions 256 × 256 × 113 voxels. Generated assets include four individual NIfTI masks, one combined integer label map, a manifest, and 2,500 plane-specific mask PNGs spanning axial, coronal, and sagittal views.

The preview has plane selection, slice navigation, independent organ toggles, overlay opacity, coordinate readouts/crosshairs, bilingual Persian/English UI, and downloads for the generated masks. Workflows validate asset counts, basic geometry, and sampled mask-image orientation. CI for the recorded baseline passed, but software and coordinate checks are not anatomical validation.

The current same-volume Dice comparisons against labels bundled with the same atlas were:
- Liver: 0.91384
- Spleen: 0.79825
- Right kidney: 0.88139
- Left kidney: 0.89130

These are technical comparisons against the same source atlas, not independent held-out accuracy results, expert ground truth, or proof of clinical performance. The source intensity handling also includes an unconfirmed assumption that subtracting 1024 converts stored values to the model's expected intensity representation. Resolve this uncertainty before treating the baseline as trustworthy.

The dedicated experimental preview workflow has been deployable, while the primary production-release gate remains a separate control. Always verify the present workflow runs and live state rather than assuming prior preview or production status still holds.

## 3. Non-negotiable architecture and collaboration rules

1. Inspect the actual latest main HEAD, working tree where accessible, current branches, open PRs, relevant workflow runs, and exact current files before acting. Do not use prior chat summaries or an old SHA as the current truth.
2. Use a dedicated, narrowly scoped feature branch and PR. Do not push directly to main for this work.
3. Other contributors may be changing documentation and code. Avoid broad document rewrites, avoid changing unrelated files, and preserve concurrent changes. Prefer a new additive document or narrowly scoped diff. Fetch the current version and SHA before editing any existing file; never issue concurrent writes to the same path.
4. Preserve CT Edu's current static-site/vanilla-JavaScript architecture unless a documented technical requirement justifies a different approach. Heavy ML inference belongs in hosted compute, not the browser.
5. Do not require the maintainer to install large frameworks, manually download model weights, or run GPU inference locally. Use reproducible hosted inference/asset-generation workflows, while measuring GitHub Actions limits and costs.
6. Do not introduce a backend, paid inference service, user accounts, or cloud synchronization simply to match another prototype's architecture. Investigate and document the need, security implications, privacy, costs, and alternatives first.
7. Preserve the current SPL CT viewer, source data, source label map, coordinate model, learning flows, navigation, and other established functionality. Treat this feature as an extension.
8. Never silently replace a source/reference segmentation with a model prediction. Preserve original predictions and maintain separate identities for model output, corrected draft, evaluated output, and medically reviewed reference.
9. Do not mistake successful inference, a high same-volume Dice score, an image that looks plausible in one plane, passing unit tests, or a successful deployment for medical accuracy.
10. Confirm exact model, weight, code, and dataset licenses and redistribution rights before including any output in a public artifact. Record provenance and required attribution.
11. Do not enable the public-release approval gate or claim a public production release without explicit authorization and completed release checks.
12. Implement a useful, testable increment rather than returning only a report or a speculative plan. If blocked, explain the verified blocker and deliver safe partial progress without claiming completion.

## 4. Phase A — current-state and coverage audit

Before implementation, inspect at minimum:
- docs/SEGMENTOR_ROADMAP.md
- RELEASE_GATES.md
- DATASET_ROADMAP.md
- DATA_LICENSE_REVIEW.md
- preview/organ-segmentation.html
- preview/organ-segmentation.js
- preview/organ-segmentation.css
- preview/assets/organ-predictions/manifest.json
- scripts/generate_major_organ_masks.py
- .github/workflows/organ-segmentation.yml
- .github/workflows/pages-deploy.yml
- .github/workflows/preview-guided-cases.yml
- The source-volume builder, NRRD/NIfTI processing, manifest/label-map code, test suite, and preview deployment checks.

Confirm which code actually generates the masks, whether outputs are committed or generated at workflow time, their asset sizes, and which route and Pages artifact currently serve them. Inspect active PRs and concurrent branches before touching shared files.

Deliver a small evidence-based coverage inventory: each structure, its source model/task, output availability, current validation status, review status, and known limitations. Do not infer current support merely from a model's advertised class count.

## 5. Phase B — model and anatomical coverage strategy

Research the currently maintained model ecosystem and verify details from authoritative documentation and exact license texts. At minimum compare:
- TotalSegmentator's broad CT tasks and relevant specialized tasks.
- Specialized lung-vessel and coronary/cardiac segmentation approaches where relevant.
- Appropriate nnU-Net/MONAI-compatible pretrained models and credible specialized alternatives for uncovered structures.

Use the official TotalSegmentator repository as one starting point: https://github.com/wasserth/TotalSegmentator. Do not assume it or any single model is the best choice for every class or scan.

For each candidate, record supported classes/body region; required modality and field of view; contrast-phase assumptions; voxel spacing and preprocessing; known limitations; expected CPU/GPU time and memory; weight and code licensing; usable reference datasets; and compatibility with CT Edu.

Create a versioned, machine-readable anatomy coverage registry plus a concise human-readable summary. Every structure must have a stable ID, canonical name, laterality where relevant, anatomical group, model/task/version, preprocessing requirements, output format, evaluation status, review status, and licensing notes.

Use explicit states:
- Not implemented.
- Model available; not yet run.
- Prediction generated; not evaluated.
- Technically validated.
- Independently evaluated.
- Anatomically reviewed.
- Approved for the intended educational use.

Never equate class availability in an upstream model with demonstrated accuracy in CT Edu.

## 6. Phase C — input calibration and geometry first

Resolve the existing uncertainty about the SPL intensity offset. Inspect original headers, source documentation, generation code, stored values, and expected model input semantics. Do not infer HU calibration solely from window/level constants in the legacy viewer.

Establish whether the data are HU, shifted HU, or another representation. If this cannot be conclusively determined, label the uncertainty and run controlled preprocessing comparisons, without silently choosing a conversion that produces visually attractive masks.

For every scan, preserve and validate:
- Dimensions and axis ordering.
- Voxel spacing, origin, direction matrix/affine, and orientation conventions.
- Left-right, anterior-posterior, and inferior-superior consistency.
- Intensity semantics, calibration status, and preprocessing history.
- Resampling transforms and interpolation methods.
- Source identity, version, provenance, and content hash where practical.

Add fixtures covering anisotropic spacing, non-identity affine transforms, different orientations, incomplete fields of view, and supported anatomical regions. Verify geometry across model input, output masks, preview images, manual edits, and exported volumes. Unsupported anatomy or anatomy outside the scan coverage must be reported explicitly rather than represented as a segmentation failure or a successful empty mask without explanation.

## 7. Phase D — reproducible multi-model inference

Extend the current hosted workflow with reproducible, independently testable stages rather than creating disconnected scripts.

First benchmark the existing fast model configuration against a higher-resolution configuration where resources permit. Record runtime, peak memory where measurable, artifact size, class-level quality, and failure behavior. Then add broader organ coverage in an incremental, measured way, followed by specialized vessel tasks.

The inference pipeline must:
1. Pin model versions and dependencies; record task configuration and relevant hardware.
2. Validate input format, geometry, coverage, intensity metadata, and required preconditions.
3. Run the chosen model/task(s) on hosted compute.
4. Preserve original per-model outputs and provenance.
5. Validate dimensions, geometry, expected classes, invalid values, and empty/non-empty regions.
6. Distinguish full success, partial success, and failure.
7. Retry safely and cache expensive inference outputs without trusting stale or mismatched artifacts.
8. Combine masks only under documented label and geometry rules.
9. Generate a manifest, validation summary, reproducible logs, and files appropriate to the preview.
10. Verify the built artifact contains the expected files and metadata.

Before selecting a compute provider, measure whether GitHub Actions CPU is adequate for the desired class count and scan sizes. Investigate GPU-enabled hosted compute only if justified, and document cost, secrets/permissions, retention, security and privacy, availability, timeout limits, and alternatives. No new paid service or backend should be added without an explicit need and a defensible design.

## 8. Phase E — multi-model label and vessel handling

Do not assume one model will segment all anatomy equally well. Use broad models for suitable structures and specialized models only where comparative evidence justifies them.

Different models may disagree in nomenclature, anatomical boundaries, laterality, resolution, or intensity preprocessing. Preserve each model's individual masks during evaluation. Normalize canonical label identity, but never silently overwrite conflicts. Define precedence or fusion rules only after evaluation, and expose unresolved disagreement for review.

Evaluate arteries and veins separately when reference labels and acquisition make that distinction meaningful. Vessel performance must not be judged by Dice alone. Include:
- Centerline or vessel-tree coverage.
- Branch sensitivity/recall and false-positive branch burden.
- Connected-component and continuity checks.
- Appropriate topology/connectivity measures.
- Boundary/surface distances in physical units.
- False-positive and false-negative analysis for small vessels.
- Failure modes caused by inadequate contrast, low resolution, motion, calcification, pathology, or field-of-view truncation.

State explicitly where a vessel is not visible/resolvable or a supported model is unsuitable. Do not promise reliable identification of microscopic vessels or every branch on arbitrary CT.

## 9. Phase F — independent, class-specific evaluation

Establish an appropriately licensed evaluation set with trustworthy reference annotations for the intended use. Keep training, tuning, and held-out cases separate; prevent patient/study leakage when source relationships could contaminate the evaluation. Include relevant differences in scan region, scanner, voxel spacing, reconstruction, contrast phase, and pathology. Do not overstate representativeness if the set is small.

Calculate appropriate per-structure metrics, including Dice, sensitivity, precision, surface Dice with a declared tolerance, HD95 or another justified surface-distance metric, physical boundary displacement in millimetres, empty-mask/error rates, and connected-component/topology checks. Vessels also need centerline coverage, branch-level sensitivity, and continuity analysis.

Define acceptance thresholds by class or class family before reviewing held-out results. Large solid organs, small structures, and vessels need different thresholds. Thresholds must be justified for the intended educational task and reviewed with qualified domain experts; do not invent one universal threshold for every structure.

Report per-structure and per-condition results, sample counts, exclusions, uncertainty, correction rate, and known failure modes. Review representative and difficult cases with qualified medical/anatomical reviewers.

Keep same-volume overlap with the bundled SPL atlas labels clearly separate from independent held-out evaluation. Metrics are evidence, not automatic approval.

## 10. Phase G — scalable viewer and asset design

The existing preview uses per-slice PNG overlays and NIfTI downloads. Scaling every class to every slice naïvely may grow the repository, workflow time, Pages artifact, network traffic, and browser memory excessively.

Measure actual asset sizes and build/runtime costs. Compare compact multi-label NIfTI decoded in-browser using a carefully tested library, selected/cached 2D overlays, or compact binary masks. A separately hosted inference or asset-serving service is an option only if its operational need is demonstrated.

Prefer a small, versioned set of volume and mask assets with lazy loading over unbounded class-by-slice files. Set and verify reasonable asset and memory budgets.

The viewer must preserve the source CT, present masks at correct physical coordinates in all three planes, allow independent layer toggling with stable colors, and keep crosshairs, slice navigation, pan/zoom, resize, and window/level operations spatially correct. It must distinguish missing masks, valid empty masks, unavailable classes, and unevaluated output. Provide clear loading/failure states, responsive mobile controls, accessible keyboard operation, and Persian RTL/English LTR support.

Every artifact manifest should include schema version, content hashes, sizes, geometry, class metadata, model/task provenance, preprocessing, and review status. Reject mismatched, corrupted, or incompatible outputs instead of displaying them without warning.

## 11. Phase H — real 3D mask correction

The current preview displays and exports model masks; it is not a full mask editor. Build a correction editor with one authoritative 3D mask and consistent edits from any supported plane.

Required functionality:
- Paint/erase voxel regions with adjustable brush size.
- Edit a selected structure without silently changing another.
- See each correction in all three planes.
- Preserve the original prediction and distinguish model output from edited draft.
- Undo/redo, cancel, save, reopen, compare, and version edits.
- Explicit confirmation for destructive operations.
- Persist source/model provenance and authoring history.
- Export corrected NIfTI where appropriate, preserving geometry and metadata; support a combined label map only with validated label semantics.
- Maintain independent review and approval states.

Local-only persistence is appropriate for the MVP if reliable; evaluate IndexedDB for larger volumes rather than synchronous Web Storage. Validate saved data and imports. Never call a correction “medically approved” just because an author saved it.

The independent Wikimedia axial/coronal/sagittal PNG stacks are not a verified shared volumetric dataset and must not be used as the 3D correction space for the SPL model masks. Treat their manual 2D annotation as a separate future feature unless shared geometry is proven.

## 12. Phase I — engineering, regression, and release gates

Extend existing tests instead of replacing them. Cover:
- Input/manifest schema and version changes.
- Inference outputs, partial failure, invalid/missing classes, and corrupted assets.
- Label-map and per-model provenance integrity.
- Geometry, axis/orientation and left-right preservation.
- Three-plane rendering and correspondence with the 3D mask.
- Manual edit alignment, saving/restoring, undo/redo, and exports.
- Conflicting predictions and fusion rules.
- Retry, timeout, cache invalidation, resource limits, and artifact-size checks.
- Accessibility, keyboard/touch, mobile behavior and browser compatibility.
- Existing viewer, navigation, bookmarks, learning features, CSP and deployment-gate regressions.
- Pages build artifact and live route/file verification.

Report technical test status and anatomical validation status separately. Passing software tests cannot satisfy the medical-review gate.

Continue to honor data licensing, privacy, security, attribution, public release, and existing deployment controls. Ensure workflows cannot partially overwrite trusted source masks with incomplete output. Do not enable the release gate in the course of this feature work.

## 13. Recommended execution order

Follow this order unless repository evidence provides a clear, documented reason to change it:

1. Reinspect live HEAD, branch/PR activity, current files, CI and deployment status.
2. Audit current asset/model coverage, code paths, licensing, and intensity/geometry semantics.
3. Fix or explicitly characterize the SPL intensity calibration uncertainty.
4. Add a machine-readable coverage registry and reproducible per-class baseline report.
5. Benchmark the current fast baseline against appropriate higher-resolution settings.
6. Add the best-justified broader organ models/tasks as small increments.
7. Add suitable specialist vessel models with class-specific evaluation.
8. Make output asset handling scalable and integrate the additional layers into the real viewer.
9. Build the 3D correction editor and versioned persistence/export.
10. Run independent per-structure validation and qualified anatomical review.
11. Update roadmap/release records with the actual evidence and next milestone.
12. Keep public release gated until all required approvals are explicitly complete.

Do not attempt an unreviewable all-at-once rewrite. Each increment should compile/run, include appropriate tests, preserve existing behavior, and produce a useful result. Continue implementation whenever the next step is reasonably scoped and safe.

## 14. Definition of done

The long-term goal is reached only when:
- The coverage registry documents intended and supported organs/vessels and their limitations.
- The inference pipeline is reproducible on hosted infrastructure without local model setup by the maintainer.
- Geometry and preprocessing are proven or their uncertainty is explicitly contained.
- Every advertised output has traceable model/source provenance.
- Independent class-specific evaluations and failure modes are reported.
- Anatomical review is recorded separately from software checks.
- A usable 3D correction workflow preserves source masks and spatial integrity.
- The viewer stays responsive and maintains exact cross-plane correspondence.
- Existing CT Edu functions and release safeguards remain intact.
- Educational release approval is based on evidence and appropriate human review.

Never claim “all organs and vessels have been segmented successfully” merely because all configured model tasks ran. State which structures were generated, technically checked, independently evaluated, anatomically reviewed, and approved for the intended use.

## 15. Required report for each implementation session

Every implementation session should report:
1. Starting main commit and feature branch.
2. Relevant concurrent PRs/branches checked and how overlap was avoided.
3. Files/workflows actually changed.
4. Model/tasks/classes added and their licensing status.
5. Preprocessing and geometry safeguards.
6. Tests with pass/fail/skip detail and linked CI runs.
7. Quantitative results with dataset and methodology limitations.
8. Whether preview assets were generated, staged, deployed, or only built.
9. Known blockers and remaining review gates.
10. The single highest-priority next implementation milestone.

Claims must be grounded in repository diffs, logs, model documentation, test output, and verified artifacts.

## 16. First action next time

Do not start by rewriting this document or redoing completed work. First inspect the live repository and locate this plan. Reconcile it with the current Segmentor roadmap, actual code, open PRs, latest inference artifact, model coverage registry if present, and CI status. Then implement the next unmet item in the recommended execution order on an isolated branch. The immediate likely priorities are verifying the SPL intensity conversion, creating a class-coverage registry, and establishing a repeatable baseline/benchmark before expanding models—confirm this against the live repository before choosing.
