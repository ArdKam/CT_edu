# Segmentor independent-validation tooling

**Status:** evaluator/aggregator tooling is merged; a CT-ORG held-out runner is implemented but has not yet been run against real CT-ORG test data. No independent cohort metric result is claimed.  
**Purpose:** make future independent-case evaluation reproducible and prevent geometry mismatches or empty masks from looking like success.  
**Scope:** discrete NIfTI label maps; this does not add inference for arbitrary uploaded CT scans.

## Delivered in this increment

- **scripts/evaluate_segmentor_predictions.py** compares explicitly mapped classes in a prediction NIfTI and reference NIfTI.
- **scripts/aggregate_segmentor_evaluations.py** aggregates case reports only when at least two distinct case IDs use the same model, preprocessing, reference dataset, reference type and class mapping.
- **tests/test_segmentor_independent_evaluation.py** exercises overlap metrics, physical surface distances, geometry rejection, empty masks, and cohort aggregation.
- Each JSON report keeps the model and preprocessing description, reference-dataset/case IDs, input SHA-256 digests, spatial grid, class-specific metrics and interpretation limits. Reports store hashes rather than source filenames, absolute input paths or voxel data, reducing the risk of accidentally recording identifiers embedded in filenames.

This is a reusable evaluation layer, not proof of improved model accuracy. The current SPL atlas remains the existing experimental sample. A future step still needs to acquire, license-review, annotate/select, and evaluate genuinely independent cases, and to create or integrate inference capable of processing those scans.

## Requirements and input contract

Use Python 3.11+ with NumPy, SciPy and nibabel installed. Both NIfTI inputs must contain discrete 3D labels or binary masks with integer-valued voxels and explicitly declare spatial units as millimetres (`mm`). Unknown units are rejected because surface metrics are reported in mm; first confirm the real source geometry before correcting a header. Probability maps and logits are rejected. The script deliberately does not resample, register, flip, crop, or resize either input. Shape and affine must match within the declared tolerance. Sheared/non-orthogonal voxel axes are rejected because surface-distance calculations use spacing-aware Euclidean distance transforms on an orthogonal grid.

Create a version-1 class-map JSON file. Example for a model label map in which the liver prediction is label 1 and the reference dataset identifies liver as label 5:

```json
{
  "schemaVersion": 1,
  "classes": [
    {
      "id": "anatomy.liver",
      "name": "Liver",
      "predictionLabel": 1,
      "referenceLabel": 5
    }
  ]
}
```

Prediction and reference labels must be positive integers; label 0 is background. Each class needs a unique stable ID and unique prediction/reference label IDs. For individual binary masks, use label 1 for each mask and configure the corresponding reference label explicitly.

## Run one case

```bash
python3 scripts/evaluate_segmentor_predictions.py --prediction /local/validation/case-001-prediction.nii.gz --reference /local/validation/case-001-reference.nii.gz --class-map /local/validation/class-map.json --case-id case-001 --reference-dataset-id independent-cohort-v1 --reference-type independent-expert --model-id "TotalSegmentator 2.11.0; task=total; full-resolution" --preprocessing-description "Document modality rescale/HU status, orientation, spacing and any resampling; do not assume stored values are HU." --output build/segmentor-evaluations/case-001.json
```

Use a pseudonymous case ID, not a patient name or direct identifier. The reference type is a user declaration: `independent-expert` is for a genuinely independent reference with qualified expert annotation/review; `independent-dataset` is for an independent dataset reference with its annotation provenance documented; `same-source-atlas` and `synthetic-test` are not independent evidence. The tool cannot verify the dataset relationship, licensing, annotation quality, or reviewer qualifications.

## Metrics and edge-case semantics

Per class, the evaluator reports voxel counts, TP/FP/FN/TN, Dice, IoU, sensitivity, precision, specificity, predicted/reference volumes in mL, volume difference, and relative volume error. Where both masks are non-empty it also reports average symmetric surface distance, directional mean and 95th-percentile surface distances, symmetric Hausdorff-95, and maximum surface distance in millimetres.

Surface measurements are based on unweighted 3D boundary-voxel samples and affine-derived voxel spacing. They are not area-weighted surface estimates and should be interpreted with the scan spacing and reported method. The evaluator rejects geometry it cannot compare safely.

Empty masks are not silently accepted:

- Non-empty reference plus empty prediction: `empty-prediction`, Dice 0, sensitivity 0, precision undefined, and an explicit quality finding.
- Empty reference plus non-empty prediction: `reference-empty`, Dice 0 and a false-positive quality finding. This case is not eligible for the Dice cohort mean because the reference has no positive voxels.
- Both masks empty: `both-empty`; Dice is `null`, not 1.0, and the case is excluded from Dice aggregation.

A shape or affine mismatch exits with a clear input error and produces no report. The tool never silently changes either volume to make the geometry fit.

## Aggregate a genuinely independent cohort

```bash
python3 scripts/aggregate_segmentor_evaluations.py --reports build/segmentor-evaluations/case-001.json build/segmentor-evaluations/case-002.json build/segmentor-evaluations/case-003.json --output build/segmentor-evaluations/cohort-summary.json
```

The aggregator requires at least two reports with unique case IDs and distinct reference-file hashes, an explicitly declared independent reference type, and identical model/preprocessing/dataset/class-map configuration. Reusing the exact same reference NIfTI file under multiple case IDs is rejected. It reports class-specific case counts, mean/median/min/max Dice, mean sensitivity/precision, mean surface distance and Hausdorff-95 summaries, plus empty-mask rates and per-case results. Dice and sensitivity summaries are unweighted case-level summaries; an organ in a large volume does not automatically dominate a smaller case. Precision/surface metrics report their own denominators because they cannot be computed meaningfully for every empty-mask scenario.

Two cases are only a minimum software gate, not a scientifically adequate cohort size. The aggregate report explicitly states that cohort independence and annotation quality were not independently verified and always keeps `educationalApprovalStatus` at `not-approved`.

## CT-ORG held-out evaluation runner (real-data run pending)

The repository now includes two experimental utilities:

- `scripts/prepare_ctorg_test_subset.py` extracts only selected CT-ORG volume/label NIfTI pairs from the official ZIP bundles. It restricts case numbers to the documented held-out test split 0–20, hashes the extracted members, records attribution/license metadata, and atomically publishes the selected subset.
- `scripts/evaluate_ctorg_heldout.py` invokes the existing pinned TotalSegmentator 2.11.0 controlled NIfTI inference CLI and computes per-case/cohort metrics with the existing evaluator. It retains JSON metrics/provenance only; source CTs, reference labels and predicted NIfTIs are not placed in the report directory.

The manual workflow `.github/workflows/segmentor-ctorg-heldout-evaluation.yml` offers `pilot-2` (cases 0 and 1) and `official-test-21` (cases 0–20), with `fast`/ `full` resolution. The default is the two-case engineering pilot. The workflow is restricted to a non-main branch, deletes private source archives and selected input NIfTIs when its inference step exits, and uploads only the reports directory. **The real CT-ORG workflow has not yet been dispatched**, so no real-data CT-ORG score is available.

Dataset and interpretation requirements:

- CT-ORG is distributed through [The Cancer Imaging Archive (TCIA)](https://www.cancerimagingarchive.net/collection/ct-org/). Preserve CC BY 3.0 attribution and comply with TCIA's Data Usage Policy. Citation: Rister B, Shivakumar K, Nobashi T, Rubin DL. *CT-ORG: A Dataset of CT Volumes With Multiple Organ Segmentations (Version 1).* TCIA (2019), DOI: [10.7937/tcia.2019.tt7f4v7o](https://doi.org/10.7937/tcia.2019.tt7f4v7o). Cite TCIA itself as Clark K et al., *Journal of Digital Imaging* 26(6), 1045–1057 (2013), DOI: [10.1007/s10278-013-9622-7](https://doi.org/10.1007/s10278-013-9622-7).
- Comparisons cover liver (reference label 1), bladder (2), lungs (3), kidneys (4), broad bone (5) and brain (6) when the reference label exists. CT-ORG documentation describes the values as HU; this runner uses offset 0 and requires native CT/reference dimensions and geometry to match. It never silently flips, resizes, or auto-resamples input.
- The prediction is the union of the five lobe masks for the single whole-lung label and the union of both kidneys for the one kidney label. Broad bone is compared with an approximate union of 62 available TotalSegmentator skeletal classes excluding costal cartilage. These are not lobe-/laterality-/individual-bone-level validation.
- **CT-ORG provides no vessel reference labels.** This pipeline cannot validate any vessel segmentation; that requires a separate appropriately licensed dataset with vascular annotations and vessel-specific branch/centerline metrics.
- Empty reference labels (notably brain labels missing from some cases) are skipped rather than counted as true negatives. A brain aggregate may remain below the two-distinct-case minimum.
- The two-case pilot is an engineering smoke test, not a scientific cohort. Even a successful 21-case split result is exploratory; annotation quality, left/right orientation, cohort representativeness and qualified anatomical review remain separate gates. No result enables educational approval or public release.

To run it manually, open Actions → **Experimental CT-ORG held-out Segmentor evaluation**, choose `pilot-2` first, then choose `official-test-21` only after reviewing archive download, disk usage, runtime and grouped-label mapping behavior.

## Safe use and next actions

- Use legally obtained, appropriately licensed independent volumes and reference labels. Record exact dataset version, subject/case identity, annotation provenance, modality, contrast phase, acquisition/reconstruction metadata, model weights/version, intensity transform, resampling steps and software environment.
- Keep private or restricted scans, reference masks and case metadata out of public Git history and public CI artifacts unless applicable authorization explicitly permits it. The evaluator is designed for local execution; a report contains hashes and pseudonymous IDs but no voxel arrays.
- Evaluate a held-out set that was not used to choose model, task, threshold, intensity conversion or resolution. Do not select the winning preprocessing from the same cohort and then present that cohort as independent confirmation.
- Include relevant variation in body coverage, voxel spacing, scanner, contrast phase and pathology. Investigate missing anatomy and scan coverage before treating a zero mask as a model failure or a valid absent structure.
- Obtain qualified anatomical review and separately review code/weight/data licences, privacy, accessibility and intended-use wording before claiming educational approval.
- For vessel models, extend evaluation with centerline coverage, branch sensitivity, continuity, false-positive branches and clinically meaningful vessel-specific failure categories. Generic voxel/surface metrics alone are insufficient for tiny, thin or branching vessels.
- Do not treat this tooling as arbitrary CT upload/inference. The existing generator is an SPL-specific hosted experiment; general case inference and reviewer correction remain separate workstreams.
