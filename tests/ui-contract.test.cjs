const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8'); };

test('UI contains expected controls and medical-use disclaimer', function () {
  const html = read('index.html');
  [
    'language-toggle', 'structure-search', 'structure-list', 'toggle-overlays',
    'toggle-labels', 'zoom-in', 'zoom-out', 'zoom-reset', 'quiz-mode',
    'learn-mode', 'answer-options', 'next-question', 'reset-quiz', 'workspace', 'anatomy-panel'
  ].forEach(function (id) {
    assert.ok(html.includes('id="' + id + '"') || html.includes("id='" + id + "'"), 'missing UI control: ' + id);
  });
  assert.match(html, /CT واقعی نیست|NOT A REAL CT/i);
  assert.match(html, /هیچ CT بیمار|No patient CT/i);
  assert.match(html, /برای تشخیص|not for diagnosis/i);
  assert.match(html, /href="data-license.html"/);
});

test('viewer and data catalogue remain decoupled', function () {
  const viewer = read('src/viewer/schematic-viewer.js');
  const data = read('src/data/anatomy.js');
  assert.match(viewer, /function buildSvg/);
  assert.match(viewer, /شماتیک|SCHEMATIC/);
  assert.match(data, /descriptionFa/);
  assert.match(data, /shape: .liver./);
  assert.doesNotMatch(viewer, /fetch\(|XMLHttpRequest|DICOM parser|NIfTI parser/i);
});


test('quiz renderer does not expose the target name through accessible labels', function () {
  const viewer = require('../src/viewer/schematic-viewer.js');
  const anatomy = require('../src/data/anatomy.js');
  const svg = viewer.buildSvg({
    items: anatomy.items,
    visible: Object.fromEntries(anatomy.items.map(function (item) { return [item.id, true]; })),
    overlaysOn: true,
    labelsOn: false,
    selectedId: 'liver',
    quizId: 'liver',
    zoom: 100,
    language: 'en',
    level: 'organs'
  });
  assert.match(svg, /aria-label="Highlighted structure"/);
  assert.doesNotMatch(svg, /aria-label="Liver"/);
  assert.doesNotMatch(svg, /tabindex="0"/);
});
