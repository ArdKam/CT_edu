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
    'slice-slider', 'slice-prev', 'slice-next', 'slice-position', 'plane-axial', 'plane-coronal', 'plane-sagittal', 'orientation-glyph', 'window-level-controls', 'window-width-slider', 'window-level-slider', 'window-level-reset', 'window-level-status', 'learning-progress', 'reset-local-progress', 'export-local-progress', 'restore-local-progress', 'restore-local-progress-file', 'progress-attempts', 'progress-accuracy', 'progress-structures', 'progress-storage-note', 'progress-feedback'
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
  const triViewer = read('src/viewer/tri-planar-viewer.js');
  assert.match(html, /src="src\/viewer\/tri-planar-viewer\.js"/);
  for (const id of ['display-triplanar', 'tri-planar-panel', 'tri-axial-canvas', 'tri-coronal-canvas', 'tri-sagittal-canvas',
    'tri-axial-slider', 'tri-coronal-slider', 'tri-sagittal-slider', 'tri-axial-empty-state', 'tri-coronal-empty-state', 'tri-sagittal-empty-state', 'viewer-empty-state']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing tri-planar control: ' + id);
  }
  assert.match(app, /function renderTriPlanar\(/);
  assert.match(app, /TriViewer\.render\(/);
  assert.match(triViewer, /function getCrosshairPoint\(/);
  assert.match(triViewer, /x = width - 1 - \(Number\(indices\.j\) \|\| 0\)/);
  for (const plane of ['axial', 'coronal', 'sagittal']) {
    assert.match(html, new RegExp('id="tri-' + plane + '-canvas"[^>]*role="img"'));
    assert.doesNotMatch(html, new RegExp('id="tri-' + plane + '-canvas"[^>]*tabindex='));
    assert.match(html, new RegExp('id="tri-' + plane + '-slider"[^>]*aria-labelledby="tri-' + plane + '-title tri-' + plane + '-slider-label"'));
    assert.match(html, new RegExp('id="tri-' + plane + '-slider"[^>]*aria-describedby="tri-' + plane + '-position"'));
  }
  assert.match(html, /data-i18n-aria-label="workspaceLabel"/);
  assert.match(app, /querySelectorAll\('\[data-i18n-aria-label\]'\)/);
  assert.match(app, /sliceSliderCoronal/);
  assert.match(app, /sliceSliderSagittal/);

  assert.ok(viewer.includes('const gray = sourceGray[i * 4]'), 'overlay blending must read the grayscale channel, not the raw RGBA byte index');
  assert.match(builder, /ct-volume-int16\.bin\.gz/);
  assert.match(builder, /HU calibration has not been independently verified/);
});

test('project-relative favicon resolves for GitHub Pages subpaths', function () {
  const html = read('index.html');
  assert.ok(html.includes('<link rel="icon" type="image/svg+xml" href="./favicon.svg">'), "favicon should use a project-relative URL");
  const icon = read('favicon.svg');
  assert.match(icon, /<svg[^>]*viewBox="0 0 64 64"/);
  assert.match(icon, /fill="#101923"/);
  const workflow = read('.github/workflows/pages-deploy.yml');
  assert.ok(workflow.includes('cp favicon.svg _site/'), "Pages workflow should copy the favicon into the published artifact");
  assert.ok(workflow.includes('test -s _site/favicon.svg'), "Pages staging should verify the favicon exists");
  assert.ok(workflow.includes('fetch_with_retry "$base/favicon.svg"'), "post-deploy checks should fetch the live favicon");
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
  assert.match(html, /data-i18n-aria-label="anatomyLayerGroup"/);
});

test('tri-planar overview uses its own renderer and exposes synchronized crosshair state', function () {
  const html = read('index.html');
  const app = read('src/app.js');
  const viewer = require('../src/viewer/tri-planar-viewer.js');
  assert.ok(html.includes('src/viewer/tri-planar-viewer.js'));
  assert.ok(app.includes('function renderTriPlanar('));
  assert.ok(app.includes('state.slicePositions[config.axis]'));
  assert.ok(html.includes('data-i18n="triEmptySlice"'), 'empty edge slices should be explained to learners');
  assert.ok(require('../src/viewer/tri-planar-viewer.js').getStatus().hasSignal.axial === null, 'signal state begins unknown before CT assets load');
  assert.deepEqual(viewer.getStatus().planes, ['axial', 'coronal', 'sagittal']);
  assert.equal(viewer.getStatus().ready, false, 'overview starts idle before browser assets load');
});

test('local progress is loaded before app code and states that it never uploads answers', function () {
  const html = read('index.html');
  const app = read('src/app.js');
  const store = read('src/data/progress-store.js');
  assert.ok(html.indexOf('src/data/progress-store.js') < html.indexOf('src/app.js'),
    'progress store must load before the app binds to it');
  assert.match(app, /Progress\.recordAttempt\(/);
  assert.match(app, /Progress\.clear\(/);
  assert.match(app, /Progress\.exportData\(/);
  assert.match(app, /Progress\.importData\(/);
  assert.match(app, /1024\*1024/);
  assert.match(store, /ct-edu-local-progress/);
  assert.match(store, /ctedu-learning-progress-v1/);
  assert.match(store, /MAX_ATTEMPTS = 500/);
  assert.match(app, /Saved only in this browser; never uploaded\./);
  assert.match(app, /فقط در همین مرورگر ذخیره می‌شود/);
});

test('dynamic UI uses DOM APIs and textContent instead of HTML injection sinks', function () {
  const app = read('src/app.js');
  const data = require('../src/data/anatomy.js');
  assert.doesNotMatch(app, /\\b(?:innerHTML|outerHTML|insertAdjacentHTML)\\b/);
  assert.doesNotMatch(app, /\\beval\\s*\\(|new Function\\s*\\(/);
  data.items.forEach(function (item) {
    assert.match(item.color, /^#[0-9a-f]{6}$/i, 'catalogue color must be a strict six-digit hex value: ' + item.id);
  });
});

test('CSP limits executable content and keeps only the required font origins external', function () {
  const html = read('index.html');
  const policyMatch = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/i);
  assert.ok(policyMatch, 'the public document must declare a Content Security Policy');
  const policy = policyMatch[1];
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /script-src 'self'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'self'/);
  assert.match(policy, /connect-src 'self'/);
  assert.doesNotMatch(policy, /unsafe-eval/);
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script defer'),
    'CSP must precede executable scripts');
  const sources = Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/gi), function (match) { return match[1]; });
  assert.ok(sources.length > 0);
  sources.forEach(function (src) {
    assert.doesNotMatch(src, /^(?:https?:)?\\/\\//i, 'scripts must be served locally: ' + src);
  });
});
