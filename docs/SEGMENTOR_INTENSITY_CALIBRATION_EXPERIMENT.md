# SPL intensity calibration investigation and controlled preprocessing experiment

**Status:** calibration remains unresolved; a hosted, same-volume preprocessing comparison has been added as an experiment.  
**Scope:** SPL Abdominal Atlas only; not clinical validation.  
**Branch:** `codex/segmentor-intensity-calibration-20261017`  
**Baseline `main`:** `83f68eaf65a0dbebfca27d0ba6864ccf6d18f23a` (2026-10-17)

## Evidence reviewed

1. The stored CT array is a signed 16-bit NRRD, dimensions 256 × 256 × 113. The complete header available in the packaged file records `type: short`, `space`, `sizes`, `space directions`, `kinds`, `endian`, `encoding` and `space origin`; it does not state a modality, HU unit, rescale slope, rescale intercept or equivalent explicit calibration field.
2. The checked-in data provenance review records the observed source stored-value range as 0–3952, explicitly says the intercept/calibration has not been independently verified, and notes that the viewer defaults to width 400 / level 1064.
3. The legacy level of 1064 is compatible with—but does not prove—a conventional soft-tissue display level near 40 after subtracting 1024. Window/level is a display operation and cannot establish the acquisition rescale transform by itself.
4. The official [Open Anatomy SPL Abdominal Atlas page](https://www.openanatomy.org/atlas-pages/atlas-spl-abdomen.html) identifies the dataset as a CT-derived atlas but does not provide a stored-value-to-HU calibration rule on the page reviewed.
5. [TotalSegmentator's official README](https://github.com/wasserth/TotalSegmentator) warns users to check whether input contains original HU values or values rescaled to another range when segmentations are poor. This makes the ambiguity material to the existing experiment.

**Conclusion:** the available package metadata inspected so far does not conclusively establish HU calibration. Do not describe stored values as HU, do not silently treat the -1024 hypothesis as fact, and do not choose a conversion solely because its output looks plausible.

## Implementation added

`scripts/compare_spl_intensity_preprocessing.py` executes the same pinned TotalSegmentator task and four ROI classes on the same SPL volume, changing only the explicitly provided subtractive offset. The dedicated hosted workflow compares two labelled conditions by default:

- **Offset 0:** unchanged stored values; a negative/control condition, not a claim that the data are HU.
- **Offset 1024:** the existing working hypothesis, included to compare sensitivity, not treated as a proven calibration.

For each candidate, the JSON artifact records the exact CT/label-map SHA-256 hashes, full NRRD headers, parsed MRML scene display/window-level evidence where available, source and transformed intensity statistics, model/package/task/device/resolution, input-array hash, affine/spacing, runtime, per-class voxel count and Dice against the bundled same-volume labels, packed-mask hashes, and pairwise per-class mask-difference counts/fractions. Logs and the report are uploaded as CI artifacts; generated prediction masks are not committed or published to the preview.

The report sets `calibrationDecision: not-established` regardless of scores. It labels Dice as same-volume technical consistency, requires complete output from all candidates for a successful comparison, and preserves failed/partial states and logs.

## What this experiment can and cannot establish

It can show whether these two preprocessing hypotheses materially change the model output on this one SPL volume, and quantify their agreement with the labels bundled with that same source atlas. It cannot prove the acquisition calibration, serve as independent held-out accuracy, or generalize to other CT protocols. The reference labels and source images are not independent of one another. Any apparent score advantage is a signal for further investigation, not automatic grounds to choose an offset.

## Safety and reproducibility

- Model version is pinned to TotalSegmentator 2.11.0, task `total`, CPU, `fast/3mm`, and identical four-class ROI list for all candidates.
- Source image dimensions, RAS affine and voxel spacing are checked and recorded; each NIfTI input is written from the same source geometry.
- Outputs are temporary model products. No atlas label map or preview mask is overwritten.
- The workflow has a bounded per-candidate timeout, logs, a partial/failure report, and uploads its report even if a candidate fails.
- This does not enable the public-release gate or approve experimental masks for teaching.

## Next decision

Review the archived comparison report and logs. If masks differ, investigate the source archive/scene lineage or seek the original calibration/source series; do not simply select whichever candidate has the largest Dice. Only then proceed to the versioned anatomy coverage registry and broader model benchmark.
