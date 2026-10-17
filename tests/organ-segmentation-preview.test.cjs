const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8'); };

test('major-organ segmentation preview is bilingual, self-hosted, and explicitly experimental', function () {
  const html = read('preview/organ-segmentation.html');
  assert.match(html, /lang="fa" dir="rtl"/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /script-src 'self'/);
  assert.match(html, /img-src 'self'/);
  assert.match(html, /organ-segmentation\.js/);
  assert.match(html, /organ-segmentation\.css/);
  assert.match(html, /TotalSegmentator/);
  assert.match(html, /not a diagnostic tool/i);
  assert.match(html, /not been independently.*calibrated/i);
  [
    'organ-canvas', 'organ-prev', 'organ-next', 'organ-slice-slider',
    'organ-plane-selector', 'organ-voxel-coordinates',
    'organ-opacity', 'organ-controls-list', 'organ-model-meta'
  ].forEach(function (id) {
    assert.ok(html.includes('id="' + id + '"'), 'missing organ preview control: ' + id);
  });
});

test('preview validates the generated manifest and never fabricates fallback masks', function () {
  const app = read('preview/organ-segmentation.js');
  assert.match(app, /manifest\.schemaVersion !== 1/);
  assert.match(app, /manifest\.status !== 'experimental-unreviewed'/);
  assert.match(app, /manifest\.organs\.length !== 4/);
  assert.match(app, /No placeholder masks are displayed/);
  assert.match(app, /maskPatterns\[state\.plane\]/);
  assert.match(app, /planeDefinitions/);
  assert.match(app, /function drawCrosshair/);
  assert.match(app, /naturalWidth !== 256/);
  assert.match(app, /diceAgainstBundledAtlasLabel/);
});

test('automatic inference uses a real model, explicit intensity-offset assumption, and reference comparison', function () {
  const generator = read('scripts/generate_major_organ_masks.py');
  assert.match(generator, /TotalSegmentator/);
  assert.match(generator, /save_coronal_mask/);
  assert.match(generator, /save_sagittal_mask/);
  assert.match(generator, /planeDefinitions/);
  assert.match(generator, /--roi_subset/);
  assert.match(generator, /liver.*spleen.*kidney_left.*kidney_right/s);
  assert.match(generator, /intensity-offset/);
  assert.match(generator, /subtract-stored-value-offset/);
  assert.match(generator, /diceAgainstBundledAtlasLabel/);
  assert.match(generator, /unreviewed-model-output/);
  assert.match(generator, /major-organ-labelmap\.nii\.gz/);
  assert.match(generator, /affineRAS/);
  assert.match(generator, /maskVolumeFile/);
  assert.match(generator, /originRASMm/);
});

test('preview build stages organ page and generated assets only when they exist', function () {
  const workflow = read('.github/workflows/preview-guided-cases.yml');
  assert.match(workflow, /cp preview\/organ-segmentation\.html preview\/organ-segmentation\.css preview\/organ-segmentation\.js/);
  assert.match(workflow, /if \[ -d preview\/assets\/organ-predictions \]/);
  assert.match(workflow, /experimental-unreviewed/);
  assert.match(workflow, /organ-segmentation\.html/);
  assert.match(workflow, /2500/);
});
