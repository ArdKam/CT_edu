const assert = require('node:assert/strict');
const cases = require('../src/data/guided-cases.js');

const fs = require('node:fs');
const page = fs.readFileSync(require('node:path').join(__dirname, '..', 'cases.html'), 'utf8');
const app = fs.readFileSync(require('node:path').join(__dirname, '..', 'src', 'guided-cases.js'), 'utf8');
const entries = cases.list();
assert.match(page, /id="guided-case-rubric-progress"[^>]*role="status"[^>]*aria-live="polite"/);
assert.match(app, /items reviewed/);
assert.match(app, /مورد بررسی شده/);
assert.equal(cases.schemaVersion, 1);
assert.equal(entries.length, 4);
assert.equal(new Set(entries.map(item => item.id)).size, entries.length);

for (const item of entries) {
  assert.ok(item.id && item.title.fa && item.title.en);
  assert.equal(item.modality, 'CT');
  assert.equal(item.region, 'abdomen');
  assert.ok(item.source.url.startsWith('https://radiopaedia.org/cases/'));
  assert.ok(item.source.articleUrl.startsWith('https://radiopaedia.org/articles/'));
  assert.ok((item.source.contributor && item.source.rid) || item.source.caseId, 'each source needs contributor metadata or a stable case ID');
  assert.ok(item.source.citation);
  if (item.source.viewerUrl) assert.ok(item.source.viewerUrl.includes('/studies/'), 'dedicated viewer URLs must point to a study');
  assert.ok(item.clinicalContext.fa && item.clinicalContext.en, 'each exercise needs a bilingual teaching context');
  assert.ok(Array.isArray(item.objectives.fa) && item.objectives.fa.length >= 3);
  assert.ok(Array.isArray(item.objectives.en) && item.objectives.en.length >= 3);
  assert.ok(Array.isArray(item.rubric) && item.rubric.length >= 3);
  assert.equal(item.disclaimer.fa.length > 0, true);
  assert.equal(item.disclaimer.en.length > 0, true);
  assert.equal(item.localImages, undefined, 'external source cases must not silently imply bundled Radiopaedia images');
  assert.equal(item.rubric.some(row => !row.id || !row.title.fa || !row.title.en || !row.cue.fa || !row.cue.en), false);
}
assert.equal(cases.getById(entries[0].id).id, entries[0].id);
assert.equal(cases.getById('missing'), null);
const lipoma = cases.getById('ascending-colon-lipoma-ct');
assert.equal(lipoma.source.url, 'https://radiopaedia.org/cases/ascending-colon-lipoma?lang=us');
assert.equal(lipoma.source.viewerUrl, 'https://radiopaedia.org/cases/2582/studies/6276?lang=us#t=im&v1i=478&v1z=1&v2i=931&v2z=1');
assert.ok(page.includes('id="source-open-viewer-link"'));
assert.ok(app.includes('frame.src = viewerUrl;'));
console.log('Guided cases: bilingual metadata, source links, and self-review rubrics validated.');
