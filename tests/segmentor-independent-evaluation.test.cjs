const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('independent Segmentor evaluation enforces discrete labels and matching 3D geometry', function () {
  const evaluator = read('scripts/evaluate_segmentor_predictions.py');
  const doc = read('docs/SEGMENTOR_INDEPENDENT_VALIDATION.md');
  assert.match(evaluator, /compare_geometry/);
  assert.match(evaluator, /Automatic resizing\/resampling is intentionally disabled/);
  assert.match(evaluator, /non-integer values/);
  assert.match(evaluator, /non-orthogonal\/sheared voxel axes/);
  assert.match(evaluator, /hausdorff95Mm/);
  assert.match(evaluator, /averageSymmetricSurfaceDistanceMm/);
  assert.match(evaluator, /emptyPredictionFailure/);
  assert.match(evaluator, /both-empty/);
  assert.match(evaluator, /same-source-atlas/);
  assert.match(evaluator, /educationalApprovalStatus.*not-approved/s);
  assert.match(doc, /independent comparison eligibility is based on the user-declared reference type|user declaration/i);
  assert.match(doc, /never silently changes either volume/);
  assert.match(doc, /not a scientifically adequate cohort size/);
});

test('cohort aggregation requires distinct independent case reports and reports empty-mask denominators', function () {
  const aggregator = read('scripts/aggregate_segmentor_evaluations.py');
  const doc = read('docs/SEGMENTOR_INDEPENDENT_VALIDATION.md');
  assert.match(aggregator, /At least two case reports/);
  assert.match(aggregator, /Duplicate caseId/);
  assert.match(aggregator, /independent reference type/);
  assert.match(aggregator, /emptyPredictionFailuresWhenReferencePresent/);
  assert.match(aggregator, /falsePositiveCasesWhenReferenceEmpty/);
  assert.match(aggregator, /surfaceDistanceCaseCount/);
  assert.match(aggregator, /educationalApprovalStatus.*not-approved/s);
  assert.match(doc, /unweighted case-level summaries/);
});

test('new Segmentor Python entrypoints compile without running model inference', function () {
  const result = spawnSync('python3', [
    '-m', 'py_compile',
    'scripts/evaluate_segmentor_predictions.py',
    'scripts/aggregate_segmentor_evaluations.py',
    'tests/test_segmentor_independent_evaluation.py'
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
