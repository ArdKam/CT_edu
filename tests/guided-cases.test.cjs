const assert = require('node:assert/strict');
const cases = require('../src/data/guided-cases.js');

const entries = cases.list();
assert.equal(cases.schemaVersion, 1);
assert.equal(entries.length, 3);
assert.equal(new Set(entries.map(item => item.id)).size, entries.length);

for (const item of entries) {
  assert.ok(item.id && item.title.fa && item.title.en);
  assert.equal(item.modality, 'CT');
  assert.equal(item.region, 'abdomen');
  assert.ok(item.source.url.startsWith('https://radiopaedia.org/cases/'));
  assert.ok(item.source.articleUrl.startsWith('https://radiopaedia.org/articles/'));
  assert.ok(item.source.contributor && item.source.rid && item.source.citation);
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
console.log('Guided cases: bilingual metadata, source links, and self-review rubrics validated.');
