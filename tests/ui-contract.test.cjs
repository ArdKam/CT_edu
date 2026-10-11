const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8'); };

test('UI contains expected controls, real-slice canvas and medical-use disclaimer', function () {
  const html = read('index.html');
  const app = read('src/app.js');
  [
    'language-toggle', 'structure-search', 'structure-list', 'toggle-overlays',
    'toggle-labels', 'zoom-in', 'zoom-out', 'zoom-reset', 'quiz-mode',
    'learn-mode', 'answer-options', 'next-question', 'reset-quiz', 'workspace',
    'anatomy-panel', 'ct-slice-canvas', 'viewer-load-error', 'slice-navigation', 'display-mode-controls', 'display-single', 'display-triplanar', 'tri-planar-panel', 'tri-axial-canvas', 'tri-coronal-canvas', 'tri-sagittal-canvas', 'tri-axial-slider', 'tri-coronal-slider', 'tri-sagittal-slider',
    'slice-slider', 'slice-prev', 'slice-next', 'slice-position', 'plane-axial', 'plane-coronal', 'plane-sagittal', 'orientation-glyph', 'window-level-controls', 'window-width-slider', 'window-level-slider', 'window-level-reset', 'window-level-status'
  ].forEach(function (id) {
    assert.ok(html.includes('id="' + id + '"') || html.includes("id='" + id + "'"), 'missing UI control: ' + id);
  });
  assert.match(html, /SPL ATLAS|sourceBadge/i);
  assert.match(html, /برای تشخیص|not for diagnosis/i);
  assert.match(app, /not for clinical diagnosis|برای تشخیص بالینی نیست/);
  assert.match(html, /href="data-license.html"/);
  assert.match(html, /src="src\/viewer\/ct-slice-viewer\.js"/);
  const viewer = read('src/viewer/ct-slice-viewer.js');
  const builder = read('scripts/build_demo_assets.py');
  assert.match(viewer, /volume\.json/);
  assert.match(viewer, /function loadSlice\(/);
  assert.match(viewer, /function getVolumeInfo\(planeName\)/);
  assert.match(builder, /"sliceCount": int\(image_volume\.shape\[0\]\)/);
  assert.match(builder, /for slice_index in range\(image_volume\.shape\[0\]\)/);
  assert.match(builder, /for plane_index in range\(image_volume.shape\[1\]\)/);
  assert.match(builder, /for plane_index in range\(image_volume.shape\[2\]\)/);
  assert.match(builder, /"coronal"/);
  assert.match(builder, /"sagittal"/);
  assert.match(viewer, /function getVolumeInfo\(planeName\)/);
  assert.match(viewer, /canvas\.style\.aspectRatio/);
  assert.match(app, /widthInput\.min='10'/);
  assert.match(app, /widthInput\.step='10'/);
  assert.match(app, /pendingWindowLevel/);
  assert.match(viewer, /function setWindowLevel\(/);
  assert.ok(viewer.includes('const gray = sourceGray[i * 4]'), 'overlay blending must read the grayscale channel, not the raw RGBA byte index');
  assert.match(builder, /ct-volume-int16\.bin\.gz/);
  assert.match(builder, /HU calibration has not been independently verified/);
});

test('real CT slice and lossless segment-ID map are present', function () {
  const ctPath = path.join(root, 'assets/spl-abdominal-demo/ct-slice.png');
  const labelPath = path.join(root, 'assets/spl-abdominal-demo/label-ids-rgb.png');
  assert.ok(fs.existsSync(ctPath), 'missing CT teaching slice asset');
  assert.ok(fs.existsSync(labelPath), 'missing segment-ID PNG asset');
  assert.ok(fs.statSync(ctPath).size < 100000, 'CT single-slice asset should stay small');
  assert.ok(fs.statSync(labelPath).size < 25000, 'label-ID map should stay small');
});

test('data catalogue maps anatomy names to authoritative atlas label IDs', function () {
  const data = require('../src/data/anatomy.js');
  assert.equal(data.items.length, 9);
  assert.equal(data.bySegmentId(3).id, 'liver');
  assert.equal(data.bySegmentId(4).id, 'spleen');
  assert.equal(data.bySegmentId(51).id, 'right-kidney');
  assert.equal(data.bySegmentId(52).id, 'left-kidney');
  assert.equal(data.bySegmentId(7).id, 'aorta');
  assert.equal(data.bySegmentId(8).id, 'ivc');
});

test('quiz canvas accessibility label does not disclose the highlighted structure', function () {
  const viewer = require('../src/viewer/ct-slice-viewer.js');
  assert.equal(viewer.accessibleLabel({ quizId: 'liver', language: 'en' }), 'Highlighted region on CT slice');
  assert.equal(viewer.accessibleLabel({ quizId: 'spleen', language: 'fa' }), 'ناحیهٔ برجسته‌شده روی برش CT');
  assert.doesNotMatch(viewer.accessibleLabel({ quizId: 'liver', language: 'en' }), /liver/i);
});

test('release workflow deploys only main and viewer wording is not misleading', function () {
  const workflow = read('.github/workflows/pages-deploy.yml');
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.doesNotMatch(workflow, /codex\/initial-anatomy-workspace/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.match(workflow, /Unexpected source ZIP found in the public site bundle/);

  const html = read('index.html');
  assert.doesNotMatch(html, /aria-label="Schematic teaching emphasis"/);
  assert.match(html, /aria-label="Anatomy layer emphasis"/);
});

test('tri-planar overview uses its own renderer and exposes synchronized crosshair state', function () {
  const html = read('index.html');
  const app = read('src/app.js');
  const viewer = require('../src/viewer/tri-planar-viewer.js');
  assert.match(html, /src\\/viewer\\/tri-planar-viewer\\.js/);
  assert.match(app, /function renderTriPlanar\\(/);
  assert.match(app, /state\\.slicePositions\\[config\\.axis\\]/);
  assert.deepEqual(viewer.getStatus().planes, ['axial', 'coronal', 'sagittal']);
  assert.equal(viewer.getStatus().ready, false, 'overview starts idle before browser assets load');
});
