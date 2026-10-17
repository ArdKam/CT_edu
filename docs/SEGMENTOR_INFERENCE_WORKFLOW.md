# Segmentor inference workflow — opt-in branch contract

**Status:** workflow trigger hardening proposed on a dedicated PR; no inference run or mask publication is caused by this documentation change.  
**Scope:** the existing SPL four-organ generation workflow only. This does not add arbitrary CT upload, new model classes, calibration evidence, or validation.

## Why this change exists

The existing workflow was tied to one exact branch name and listened only for pull-request creation. That made a repair commit on the branch insufficient to re-run the workflow automatically, and it made experimentation depend on a historical branch name.

The revised workflow preserves explicit opt-in while allowing a dedicated branch naming convention:
- New model/output-generation branches use `codex/segmentor-inference-<short-purpose>`.
- The historical `codex/segmentor-three-plane-main` branch remains allowed for compatibility.
- `main` itself is never eligible for manual inference dispatch.
- Pull-request inference is limited to same-repository branches; fork-originated pull requests cannot run the write-capable inference job.
- The workflow triggers on `opened`, `synchronize`, and `reopened` events when the PR changes the generator, source-volume builder, or source archive parts. Workflow-only edits run the standard repository checks but do not launch heavy inference; this prevents a workflow-trigger PR from spending CPU/model-download time merely to validate its own configuration.
- Workflow-wide contents permission is read-only; write permission is scoped to the guarded generation job because that job commits generated assets to its opted-in branch.

## Expected behavior

The inference job runs only on an explicitly named inference branch and generates the same four SPL major-organ predictions with the current explicit preprocessing offset and fast-resolution setting. It continues to validate output structure and sampled mask orientation before committing generated output. It does not write to `main` and does not change the Pages production-release latch.

Any new class, resolution, offset, model version, output schema, geometry change, or data source must be treated as a separate reviewed model experiment. The workflow branch naming permission is not approval to change scientific assumptions.

## Remaining scientific limitations

- The offset of 1024 remains an unverified stored-intensity preprocessing hypothesis, not confirmed Hounsfield-unit calibration.
- Default outputs remain four unreviewed organ candidates from one SPL volume.
- CI can validate file integrity, geometry and workflow behavior; it cannot approve anatomy or generalization.
- External held-out reference cases, qualified anatomical review, class-specific validation and data/model licensing checks remain release gates.
- Public Pages deployment remains controlled by the existing explicit release approval variable; this workflow must never change that setting.
