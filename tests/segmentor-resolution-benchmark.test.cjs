const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8'); };

test('resolution benchmark compares fast and full models without publishing predictions', function () {
  const runner = read('scripts/benchmark_segmentor_resolution.py');
  const workflow = read('.github/workflows/segmentor-resolution-benchmark.yml');
  const doc = read('docs/SEGMENTOR_RESOLUTION_BENCHMARK.md');
  assert.match(runner, /type=float, required=True/);
  assert.match(runner, /calibrationStatus.*unverified-hypothesis/);
  assert.match(runner, /fast-3mm/);
  assert.match(runner, /full-1p5mm/);
  assert.match(runner, /if fast:/);
  assert.match(runner, /candidateOutputNiftiBytes/);
  assert.match(runner, /peakRssKiB/);
  assert.match(runner, /sensitivityAgainstBundledAtlasLabel/);
  assert.match(runner, /precisionAgainstBundledAtlasLabel/);
  assert.match(runner, /independent accuracy evidence/);
  assert.match(runner, /build\/segmentor-resolution-benchmark/);
  assert.doesNotMatch(runner, /preview\/assets\/organ-predictions/);
  assert.match(workflow, /TotalSegmentator==2\.11\.0/);
  assert.match(workflow, /--intensity-offset 1024/);
  assert.match(workflow, /--timeout-seconds 5400/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /retention-days: 30/);
  assert.match(doc, /higher resolution/);
  assert.match(doc, /not independent accuracy/);
  assert.match(doc, /not established/);
});

test('resolution benchmark measurement labels preserve distinct execution, integrity, and quality states', function () {
  const runner = read('scripts/benchmark_segmentor_resolution.py');
  assert.match(runner, /modelExecutionStatus/);
  assert.match(runner, /outputIntegrityStatus/);
  assert.match(runner, /segmentationQualityStatus/);
  assert.match(runner, /segmentationOutcomeStatus/);
  assert.match(runner, /GNU \/usr\/bin\/time/);
  assert.match(runner, /originalPredictionMasksLeftInTempOnly/);
});
