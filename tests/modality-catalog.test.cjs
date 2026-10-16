const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8'); };
const catalog = require('../src/data/modality-catalog.js');

test('modality catalog exposes five paths while only the reviewed SPL learning path is marked available', function () {
  const entries = catalog.list();
  assert.deepEqual(entries.map(function (entry) { return entry.id; }), ['abdomen-ct','abdomen-ct-series','brain-ct','chest-ct','chest-xray']);
  assert.equal(entries.filter(function (entry) { return catalog.isAvailable(entry.id); }).length, 1);
  assert.equal(catalog.isAvailable('abdomen-ct'), true);
  assert.equal(catalog.isAvailable('abdomen-ct-series'), false);
  const series = catalog.getById('abdomen-ct-series');
  assert.equal(series.status, 'candidate');
  assert.equal(series.contentAvailable, false);
  assert.equal(series.pageUrl, './abdomen-series.html');
  assert.match(series.sourceUrl, /commons\\.wikimedia\\.org/);
  assert.match(series.detailEn, /320 separate axial images/i);
  assert.match(series.detailEn, /in-plane spacing/i);
  assert.equal(catalog.isAvailable('brain-ct'), false);
  assert.equal(catalog.isAvailable('chest-ct'), false);
  assert.equal(catalog.isAvailable('chest-xray'), false);
  assert.equal(catalog.getById('unknown-modality'), null);
});

test('future modalities expose rights and expert-review gates', function () {
  const brain = catalog.getById('brain-ct'), chest = catalog.getById('chest-ct'), xray = catalog.getById('chest-xray');
  assert.equal(brain.contentAvailable,false);
  assert.match(brain.detailEn,/current MIRA terms must explicitly permit/i);
  assert.match(brain.sourceUrl,/^https:\/\/atlas\.rsna\.org\//);
  assert.equal(chest.contentAvailable,false);
  assert.match(chest.detailEn,/CC BY 3\.0/i);
  assert.match(chest.sourceUrl,/cancerimagingarchive\.net/);
  assert.equal(xray.contentAvailable,false);
  assert.match(xray.detailEn,/must not be redistributed/i);
  assert.match(xray.detailEn,/CVPR 2017/i);
  assert.match(xray.sourceUrl,/docs\.cloud\.google\.com/);
  assert.equal(xray.viewerAvailable,true);
  for (const entry of [brain,chest,xray]) {
    assert.ok(entry.gatesEn.length >= 3);
    assert.ok(entry.objectivesEn.length >= 3);
  }
});

test('catalog UI is wired into the page and avoids HTML string sinks', function () {
  const html = read('index.html'), ui = read('src/modality-catalog.js');
  assert.match(html,/id="modality-catalog"/);
  assert.match(html,/src="src\/data\/modality-catalog\.js"/);
  assert.match(html,/src="src\/modality-catalog\.js"/);
  assert.match(ui,/MutationObserver/);
  assert.match(ui,/replaceChildren/);
  assert.doesNotMatch(ui,/\binnerHTML\b/);
  assert.match(ui,/aria-expanded/);
  assert.match(ui,/noopener noreferrer/);
});

test('roadmap documents the NIH chest radiograph candidate and keeps VinDr-CXR redistribution blocked', function () {
  const roadmap = read('DATASET_ROADMAP.md'), readme = read('README.md');
  assert.match(roadmap,/NIH Chest X-ray/);
  assert.match(roadmap,/docs\.cloud\.google\.com\/healthcare-api\/docs\/resources\/public-datasets\/nih-chest/);
  assert.match(roadmap,/VinDr-CXR/);
  assert.match(roadmap,/Do \*\*not\*\* redistribute VinDr-CXR under its current terms/i);
  assert.match(roadmap,/only after all relevant gates pass/i);
  assert.match(readme,/catalog is \*\*not\*\* a claim/i);
});
