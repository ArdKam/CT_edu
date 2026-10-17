const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('external Segmentor inference pins its model version and requires explicit input calibration metadata', function () {
  const script = read('scripts/infer_external_ct_volume.py');
  const doc = read('docs/SEGMENTOR_EXTERNAL_NIFTI_INFERENCE.md');
  assert.match(script, /REQUIRED_TOTAL_SEGMENTATOR_VERSION = "2\.11\.0"/);
  assert.match(script, /--intensity-offset/);
  assert.match(script, /--intensity-semantics/);
  assert.match(script, /hounsfield-units-confirmed/);
  assert.match(script, /stored-values-unverified/);
  assert.match(script, /qform and sform disagree/);
  assert.match(script, /sheared\/non-orthogonal axes/);
  assert.match(script, /spatial_unit != "mm"/);
  assert.match(script, /from atomic_artifact_publish import publish_directory/);
  assert.match(script, /publish_directory\(stage, destination\)/);
  assert.match(script, /sourceInputSha256/);
  assert.match(script, /resolve_target_classes\(class_names\)/);
  assert.match(script, /--classes/);
  assert.match(script, /--roi_subset/);
  assert.match(script, /REGISTRY_PATH/);
  assert.match(script, /len\(selected\) > 255/);
  assert.match(script, /OPEN_SPECIALIST_TASKS = \{"lung_vessels", "headneck_bones_vessels", "liver_vessels"\}/);
  assert.match(script, /task_catalog_entry\(task_name\)/);
  assert.match(script, /licensing\.get\("taskLicense"\) != "Apache-2\.0"/);
  assert.match(script, /--task/);
  assert.match(script, /taskLicense/);
  assert.doesNotMatch(script, /np\.stack\(\[aligned_masks/);
  assert.doesNotMatch(script, /preview\/assets\/organ-predictions/);
  assert.doesNotMatch(script, /inputPath["']?\s*:/);
  assert.match(doc, /select additional classes.*versioned 117-class registry/i);
  assert.match(doc, /Specialist vessel tasks/i);
  assert.match(doc, /coronary_arteries.*brain_structures.*remain blocked/s);
  assert.match(doc, /Use .*all.*117 classes/i);
  assert.match(doc, /original dimensions, affine and millimetre spatial units are preserved/i);
  assert.match(doc, /does not add server-side inference, cloud uploads/i);
  assert.match(doc, /independent evaluation is outstanding/i);
});

test('external inference records empty masks and overlap instead of silently approving them', function () {
  const script = read('scripts/infer_external_ct_volume.py');
  assert.match(script, /empty-prediction/);
  assert.match(script, /overlapVoxelCount/);
  assert.match(script, /Individual masks are authoritative/);
  assert.match(script, /unreviewed-model-output/);
  assert.match(script, /not anatomically reviewed or approved for teaching/);
});
