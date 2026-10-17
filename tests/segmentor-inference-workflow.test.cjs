const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/organ-segmentation.yml'), 'utf8');

test('Segmentor inference triggers include normal PR updates and relevant source changes', function () {
  assert.match(workflow, /types:\s*\[opened, synchronize, reopened\]/);
  assert.match(workflow, /scripts\/generate_major_organ_masks\.py/);
  assert.match(workflow, /scripts\/build_demo_assets\.py/);
  assert.match(workflow, /abacktools-abdomen-2016-09-part\*-of6\.zip/);
  assert.match(workflow, /\.github\/workflows\/organ-segmentation\.yml/);
});

test('expensive inference is opt-in to designated in-repository branches, never main', function () {
  assert.match(workflow, /startsWith\(github\.head_ref, 'codex\/segmentor-inference-'\)/);
  assert.match(workflow, /startsWith\(github\.ref_name, 'codex\/segmentor-inference-'\)/);
  assert.match(workflow, /github\.head_ref == 'codex\/segmentor-three-plane-main'/);
  assert.match(workflow, /github\.ref_name == 'codex\/segmentor-three-plane-main'/);
  assert.match(workflow, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(workflow, /github\.ref != 'refs\/heads\/main'/);
});

test('write permissions are scoped to the guarded inference job and public release is not toggled', function () {
  assert.match(workflow, /permissions:\s*\n  contents: read/);
  assert.match(workflow, /jobs:[\s\S]*?permissions:\s*\n      contents: write/);
  assert.doesNotMatch(workflow, /CT_EDU_PUBLIC_RELEASE_APPROVED\s*[:=]\s*true/);
});
