# Segmentor fast-versus-full-resolution benchmark

**Status:** hosted benchmark implemented as a gated experimental workflow; output is not a validated accuracy claim.  
**Branch:** `codex/segmentor-resolution-benchmark-20261017`  
**Baseline `main` at branch creation:** `83f68eaf65a0dbebfca27d0ba6864ccf6d18f23a`

## Purpose

The current Segmentor baseline uses TotalSegmentator v2.11.0 on CPU with `--fast`. The pinned upstream [README](https://github.com/wasserth/TotalSegmentator/blob/v2.11.0/README.md) describes `--fast` as a lower-resolution 3 mm model instead of the default 1.5 mm model. This comparison holds the source SPL CT, affine, model version, task, four ROIs and explicit intensity offset constant, changing only the resolution mode.

## Execution and artifact

The new `scripts/benchmark_segmentor_resolution.py` runs two sequential candidates on hosted GitHub Actions CPU:
- `fast-3mm`: the current `--fast` configuration.
- `full-1p5mm`: default 1.5 mm configuration with `--fast` omitted.

Both candidates use the same explicit subtraction offset, defaulted by the workflow to `1024`. That offset remains an unverified hypothesis. This design isolates resolution sensitivity but cannot correct or verify intensity calibration.

The JSON report and logs record source NRRD hashes, source geometry, input-array hashes, model version, command/task/ROI list, wall-clock duration, peak RSS when GNU `time -v` is available, output NIfTI sizes, per-class predicted/reference voxel counts, Dice, sensitivity, precision, packed-mask hashes, and fast-vs-full differences. Output masks are stored only in the experiment artifact under `build/segmentor-resolution-benchmark/`; this workflow never commits or deploys predictions.

## Interpreting the numbers

- Wall time includes input preparation, model startup, loading/download of weights, inference/resampling and output saving. The first candidate may download weights before the second candidate, so a one-pass timing is not a fair warm-cache latency comparison.
- GNU `time` maximum RSS is a best-effort measure of the launched command and its waited children; it is not guaranteed to equal the peak of every concurrently resident process.
- Dice/sensitivity/precision compare the outputs against labels bundled with the same SPL source volume. This is a technical reference comparison, not independent accuracy evaluation.
- The SPL CT stored values have no explicit HU unit/rescale transform in the packaged NRRD header. `1024` is kept constant solely as the existing hypothesis; this benchmark does not prove it is correct.
- The source volume is one normal-anatomy abdominal atlas, not a cohort spanning contrast phase, scanner, pathology, reconstruction, or incomplete field-of-view. No medical reviewer approval is asserted.
- A result with empty but correctly aligned masks may have valid execution/output-integrity status but a poor segmentation-quality status. These are tracked separately.

## Safety

The original SPL label map, current prediction manifest and public Pages preview are untouched. The current output remains experimental and non-diagnostic. This benchmark does not enable the public-release approval flag. Check license terms and source-data rights independently before distributing any derived masks more broadly.

## Files

- `scripts/benchmark_segmentor_resolution.py`
- `.github/workflows/segmentor-resolution-benchmark.yml`
- `tests/segmentor-resolution-benchmark.test.cjs`
- `docs/SEGMENTOR_RESOLUTION_BENCHMARK.md`

## Next milestone

Review the archived candidate report. If the full-resolution model materially changes the same-volume overlap or removes visible boundary artifacts, use that result to plan independent held-out evaluation—not to select a "best" model based on one atlas. The next major step remains class-specific independent validation and expert anatomical review.
