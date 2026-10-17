# External NIfTI inference for independent Segmentor evaluation

**Status:** reusable inference utility added on a dedicated feature branch; no external cohort has been processed or evaluated by this change.  
**Purpose:** let the existing TotalSegmentator-based pipeline generate geometry-aligned masks for a separately licensed CT volume so the independent evaluator can compare them with that dataset's own reference labels.  
**Scope:** defaults to the four current abdominal classes—liver, spleen, right kidney and left kidney. The CLI can also select additional classes from the pinned `TotalSegmentator` `total` task, including vessels, through the versioned 117-class registry. Availability is not validation. This is not a browser upload feature or a claim of general clinical accuracy.

## Commands

Install the pinned dependencies in an isolated environment, including TotalSegmentator 2.11.0, NumPy, SciPy and nibabel. Use a regular 3D NIfTI CT image whose geometry and spatial units have been verified from the authoritative source. The tool refuses unknown spatial units, qform/sform disagreement, sheared/non-orthogonal axes, non-finite data and unsupported dimensions.

For an input whose values have already been authoritatively converted to HU:

```bash
python3 scripts/infer_external_ct_volume.py \
  --input /private-validation/case-001-ct.nii.gz \
  --output-dir /private-validation/outputs/case-001 \
  --case-id case-001 \
  --dataset-id AMOS22-CT-v2 \
  --intensity-offset 0 \
  --intensity-semantics hounsfield-units-confirmed \
  --preprocessing-notes "Document the source conversion, verified HU semantics and any prior resampling." \
  --resolution fast
```

The default targets remain four major abdominal organs. To request a specific additional organ or vessel, pass upstream class names or stable registry IDs:

```bash
# Liver plus aorta, preserving each as a separate mask volume
python3 scripts/infer_external_ct_volume.py \
  --input /private-validation/case-001-ct.nii.gz \
  --output-dir /private-validation/outputs/case-001-aorta \
  --case-id case-001 \
  --dataset-id AMOS22-CT-v2 \
  --intensity-offset 0 \
  --intensity-semantics hounsfield-units-confirmed \
  --preprocessing-notes "Document verified source HU semantics and prior transforms." \
  --classes liver anatomy.aorta
```

Use `--classes all` to request all 117 classes in the pinned `total`-task registry. For a large volume this increases runtime, output size and peak memory; use it only on a host with sufficient resources. The 8-bit combined map assigns sequential label IDs for the selected classes in the recorded selection order (registry order for `all`). If classes overlap, individual mask files remain authoritative. The tool marks empty predictions explicitly. This does not add 117 validated CT Edu classes: all generated outputs remain experimental and need independent evaluation and qualified anatomical review.

The `hounsfield-units-confirmed` value is an operator declaration, not a fact the utility can independently verify. If the NIfTI contains stored values whose HU interpretation remains uncertain, use `--intensity-semantics stored-values-unverified` and record a justified explicit offset plus the evidence in `--preprocessing-notes`. Do not choose an offset because it gives a visually pleasing result. For HU-confirmed input, the utility enforces an offset of zero.

Use `--resolution full` for the full-resolution model when runtime permits. Resolution, package version, preprocessing assumptions, value statistics, input SHA-256, geometry, output hashes, empty-mask states and overlap policy are recorded in a manifest.

## Outputs and safeguards

The output directory contains four separate binary uint8 NIfTI masks, a combined multi-label NIfTI map, and `manifest.json`. The individual masks are authoritative if predicted organs overlap; the combined map resolves overlaps in the declared order and reports the overlapping voxel count. Empty predictions are recorded explicitly for evaluation rather than silently described as correct.

Each output mask is resampled back to the source grid with nearest-neighbour interpolation. The original dimensions, affine and millimetre spatial units are preserved. The generator writes to a sibling staging directory and atomically publishes only after inference, output checks and manifest construction succeed. Existing output remains intact on failure.

The input image is read-only, and it is not copied into the output. Temporary model input and raw model outputs are deleted when the run ends. The manifest records only a pseudonymous case ID, dataset version and input content hash—not the input filename or absolute path. Do not put names, dates of birth, medical-record numbers or other identifiers into the case ID or notes.

## Connect to the independent evaluator

The evaluator can compare a single per-organ mask with the corresponding class in a dataset reference label map. For example, if the reference dataset labels liver with ID 6 while the generated liver binary mask uses label 1:

```bash
python3 scripts/evaluate_segmentor_predictions.py \
  --prediction /private-validation/outputs/case-001/liver.nii.gz \
  --reference /private-validation/case-001-reference-labels.nii.gz \
  --class-map /private-validation/liver-class-map.json \
  --case-id case-001 \
  --reference-dataset-id AMOS22-CT-v2 \
  --reference-type independent-dataset \
  --model-id "TotalSegmentator 2.11.0; task=total; fast" \
  --preprocessing-description "Use the exact preprocessing declaration stored in the inference manifest." \
  --output /private-validation/reports/case-001-liver.json
```

A class map uses stable identity and the respective prediction/reference IDs. For each organ, create a matching one-class map or use a combined prediction label map and all mapped reference labels when its overlap precedence is acceptable. Compare dimensions and affine exactly; do not hide errors by automatically flipping or resizing a file. Use the cohort aggregator only with independent reports for distinct cases, the same model/preprocessing/class-map configuration, and appropriately identified reference files.

## Dataset selection and release limits

Use a genuinely independent, appropriately licensed reference cohort that contains the target organ labels. Record its exact release, provenance, permitted use, annotations and anatomical limitations. Do not commit private/restricted input scans, reference masks, model outputs or identity-bearing metadata into public Git history or CI artifacts. Check model-weight and dataset terms independently; access to a public download does not itself grant redistribution rights.

The tool's technical checks and class metrics do not certify anatomical accuracy. Choose a held-out cohort not used to select the model, offset, resolution or preprocessing. Review representative predictions with a qualified reviewer and report per-class failure rates, empty masks, Dice, precision/sensitivity and physical boundary distances. Independent evaluation is outstanding until it has actually been run on a suitable external cohort.

The public site still serves only the precomputed SPL preview. This utility does not add server-side inference, cloud uploads, DICOM import, accounts, public CT uploads or a paid inference backend. It does not change the Pages release gate.
