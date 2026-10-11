const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8'); };
const catalog = require('../src/data/modality-catalog.js');

test('modality catalog exposes four paths and only the current CT viewer is openable', function () {
  const entries = catalog.list();
  assert.deepEqual(entries.map(function (entry) { return entry.id; }), ['abdomen-ct','brain-ct','chest-ct','chest-xray']);
  assert.equal(entries.filter(function (entry) { return catalog.isAvailable(entry.id); }).length, 1);
  assert.equal(catalog.isAvailable('abdomen-ct'), true);
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
  assert.match(xray.detailEn,/do not permit sharing the dataset/i);
  assert.match(xray.sourceUrl,/physionet\.org/);
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

test('roadmap explains that VinDr-CXR is not approved for public redistribution', function () {
  const roadmap = read('DATASET_ROADMAP.md'), readme = read('README.md');
  assert.match(roadmap,/VinDr-CXR/);
  assert.match(roadmap,/Do \*\*not\*\* bundle VinDr-CXR images/i);
  assert.match(roadmap,/only after all relevant gates pass/i);
  assert.match(readme,/catalog is \*\*not\*\* a claim/i);
});
