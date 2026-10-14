const assert = require('node:assert/strict');
const cases = require('../src/data/radiopaedia-abdominal-cases.js');

const fs = require('node:fs');
const page = fs.readFileSync(require('node:path').join(__dirname, '..', 'cases.html'), 'utf8');
const app = fs.readFileSync(require('node:path').join(__dirname, '..', 'src', 'guided-cases.js'), 'utf8');
const entries = cases.list();
assert.match(page, /id="guided-case-rubric-progress"[^>]*role="status"[^>]*aria-live="polite"/);
assert.match(app, /items reviewed/);
assert.match(app, /مورد بررسی شده/);
assert.equal(cases.schemaVersion, 2);
assert.equal(entries.length, 53, 'the four pre-existing cases and 49 new intake candidates should be present');
assert.equal(new Set(entries.map(item => item.id)).size, entries.length);

for (const item of entries) {
  assert.ok(item.id && item.title.fa && item.title.en);
  assert.equal(item.modality, 'CT');
  assert.equal(item.region, 'abdomen');
  assert.ok(cases.categories[item.category], 'every case must have a valid primary system category');
  assert.ok(Array.isArray(item.tags) && item.tags.length > 0, 'every case must include at least one anatomical or clinical tag');
  assert.ok(item.verification && ['verified', 'partially_verified', 'unavailable', 'excluded'].includes(item.verification.status), 'every case must record a verification status');
  assert.ok(item.verification.checks && item.verification.checks.sourcePage && item.verification.checks.ctImages && item.verification.checks.imagesLoaded, 'verification checks must be recorded separately');
  assert.ok(item.source.url.startsWith('https://radiopaedia.org/cases/'));
  if (item.source.articleUrl) assert.ok(item.source.articleUrl.startsWith('https://radiopaedia.org/articles/'));
  assert.equal(new URL(item.source.url).hostname, 'radiopaedia.org');
  if (item.source.viewerUrl) {
    const direct = new URL(item.source.viewerUrl);
    assert.equal(direct.hostname, 'radiopaedia.org');
    assert.match(direct.pathname, /^\/cases\/\d+\/studies\/\d+$/, 'direct viewer path must use numeric case and study IDs');
  }
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
assert.deepEqual(entries.slice(0, 4).map(item => item.id), ['acute-abdominal-pain-ct', 'closed-loop-pattern-ct', 'bowel-viability-ct', 'ascending-colon-lipoma-ct'], 'all existing records must remain first and keep stable IDs');
assert.deepEqual(new Set(entries.map(item => item.category)), new Set(Object.keys(cases.categories)), 'all seven organ-system categories should be discoverable');
assert.equal(entries.filter(item => item.verification.status === 'verified').length, 0, 'do not claim live image-load verification that was not completed');
const lipoma = cases.getById('ascending-colon-lipoma-ct');
assert.equal(lipoma.source.url, 'https://radiopaedia.org/cases/ascending-colon-lipoma?lang=us');
assert.equal(lipoma.source.viewerUrl, 'https://radiopaedia.org/cases/2582/studies/6276?lang=us#t=im&v1i=478&v1z=1&v2i=931&v2z=1');
assert.equal(cases.getById('abd-gi-004').source.viewerUrl, 'https://radiopaedia.org/cases/99249/studies/120709?lang=us');
assert.equal(cases.getById('abd-hbp-002').source.viewerUrl, 'https://radiopaedia.org/cases/164871/studies/134067?lang=us');
assert.equal(cases.getById('abd-hbp-005').source.viewerUrl, 'https://radiopaedia.org/cases/35234/studies/36772?lang=us');
assert.equal(cases.getById('abd-gi-010').source.url, 'https://radiopaedia.org/cases/61116?lang=us');
assert.equal(cases.getById('abd-ru-007').source.url, 'https://radiopaedia.org/cases/147902?lang=us');
assert.equal(cases.getById('abd-ru-008').source.url, 'https://radiopaedia.org/cases/78376?lang=us');
assert.equal(cases.getById('abd-prv-008').source.url, 'https://radiopaedia.org/cases/215044?lang=us');
assert.equal(cases.getById('abd-mgu-004').source.url, 'https://radiopaedia.org/cases/150292?lang=us');
assert.equal(cases.intake.addedCount, 49);
assert.ok(app.includes('function getFilteredCases()'));
assert.ok(app.includes('exclude source titles, citations, IDs and direct URLs from'));
assert.ok(page.includes('id="guided-system-filter"'));
assert.ok(page.includes('id="guided-case-search"'));
assert.ok(page.includes('src="./src/data/radiopaedia-abdominal-cases.js"'));
assert.ok(page.includes('id="source-open-viewer-link"'));
assert.ok(app.includes('frame.src = viewerUrl;'));
assert.ok(app.includes('viewerLink.hidden = !item.source.viewerUrl;'));
assert.ok(app.includes("function loadSourceViewer() {\n    const item = getActive();\n    if (!item) return;\n    const frame = el('radiopaedia-frame');\n    const wrap = el('radiopaedia-frame-wrap');\n    const viewerUrl = item.source.viewerUrl || item.source.url;"));
console.log('Guided cases: bilingual metadata, source links, and self-review rubrics validated.');
