const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8'); };

test('series page declares both Wikimedia image origins and source attribution', function () {
  const html = read('abdomen-series.html');
  const privacy = read('privacy.html');
  assert.match(privacy, /Wikimedia Commons/);
  assert.match(privacy, /upload\.wikimedia\.org/);
  assert.match(html, /img-src[^"]*https:\/\/upload\.wikimedia\.org/);
  assert.match(html, /img-src[^\"]*https:\/\/commons\.wikimedia\.org/);
  assert.match(html, /referrerpolicy="no-referrer"/);
  assert.match(html, /Scrollable computed tomography images of a normal abdomen and pelvis/);
  assert.match(html, /Mikael Häggström, M\.D\./);
  assert.match(html, /CC0 1\.0/);
  assert.match(html, /not a verified DICOM series|not provide coronal\/sagittal reconstruction/i);
  assert.match(html, /id="series-slider"[^>]*max="320"/);
  assert.match(html, /data-series-plane="axial"/);
  assert.match(html, /data-series-plane="coronal"/);
  assert.match(html, /data-series-plane="sagittal"/);
  assert.match(html, /id="series-viewer-kicker-en"/);
  assert.match(read('src/abdomen-series.css'), /series-stage\\{order:2/);
  assert.match(html, /648/);
  assert.match(html, /not a synchronized 3D|not a 3D reconstruction|not synchronized/i);
});

test('viewer provides bilingual navigation, loading/error states, and keyboard controls without HTML string sinks', function () {
  const js = read('src/abdomen-series.js');
  const html = read('abdomen-series.html');
  assert.match(js, /ArrowLeft/);
  assert.match(js, /ArrowRight/);
  assert.match(js, /ArrowUp/);
  assert.match(js, /ArrowDown/);
  assert.match(js, /Home/);
  assert.match(js, /End/);
  assert.match(js, /series-retry/);
  assert.match(js, /preload\(/);
  assert.match(js, /setTimeout/);
  assert.match(js, /textContent/);
  assert.doesNotMatch(js, /\binnerHTML\b/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /lang="fa" dir="rtl"/);
  assert.match(html, /Switch language|تغییر زبان/);
});
