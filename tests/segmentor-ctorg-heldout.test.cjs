const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('CT-ORG runner is limited to the official held-out test split and preserves dataset context', function () {
  const runner = read('scripts/evaluate_ctorg_heldout.py');
  const subset = read('scripts/prepare_ctorg_test_subset.py');
  assert.match(runner, /OFFICIAL_TEST_CASES = set\(range\(21\)\)/);
  assert.match(runner, /case_ids: list\[int\].*= tuple\(range\(21\)\)/);
  assert.match(runner, /Only the official held-out CT-ORG test split \(cases 0-20\) is permitted/);
  assert.match(runner, /independent-dataset/);
  assert.match(runner, /referenceEmptyCases|reference-empty|reference-empty/i);
  assert.match(runner, /No vessel reference labels exist in CT-ORG/);
  assert.match(runner, /costal_cartilages/);
  assert.match(runner, /educationalApprovalStatus.*not-approved/);
  assert.match(runner, /publicReleaseGate.*unchanged-and-closed-unless-explicitly-approved/);
  assert.match(subset, /Only case numbers 0-20/);
  assert.match(subset, /Only official CT-ORG cases 0-20 are permitted/);
  assert.match(subset, /sha256/);
  assert.match(subset, /publish|os\.replace/);
});

test('CT-ORG workflow is manually invoked, non-main only, and uploads metric reports only', function () {
  const workflow = read('.github/workflows/segmentor-ctorg-heldout-evaluation.yml');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*push:/m);
  assert.match(workflow, /github\.ref != 'refs\/heads\/main'/);
  assert.match(workflow, /pilot-2/);
  assert.match(workflow, /official-test-21/);
  assert.match(workflow, /CTORG_RESOLUTION/);
  assert.match(workflow, /prepare_ctorg_test_subset\.py/);
  assert.match(workflow, /evaluate_ctorg_heldout\.py/);
  assert.match(workflow, /rm -rf "\$ARCHIVES"/);
  assert.match(workflow, /cleanup_private_data/);
  assert.match(workflow, /path: build\/ctorg-validation\/reports\//);
  assert.doesNotMatch(workflow, /path: build\/ctorg-validation\/private-input/);
  assert.doesNotMatch(workflow, /path: build\/ctorg-validation\/private-archives/);
  assert.doesNotMatch(workflow, /git add|git push|contents: write/);
});

test('CT-ORG mappings are explicitly coarse-grained and do not claim vessel evaluation', function () {
  const runner = read('scripts/evaluate_ctorg_heldout.py');
  assert.match(runner, /CT-ORG grouped class=liver/);
  assert.match(runner, /union of the five TotalSegmentator lung-lobe masks/);
  assert.match(runner, /union of the left and right kidney masks/);
  assert.match(runner, /union of 62 available skeletal classes/);
  assert.match(runner, /vesselEvaluationIncluded": False/);
  assert.match(runner, /reference-empty.*not treated as a valid absent-structure negative/i);
});
