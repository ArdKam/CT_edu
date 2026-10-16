const assert = require('node:assert/strict');
const cases = require('../src/data/radiopaedia-abdominal-cases.js');

const fs = require('node:fs');
const page = fs.readFileSync(require('node:path').join(__dirname, '..', 'cases.html'), 'utf8');
const app = fs.readFileSync(require('node:path').join(__dirname, '..', 'src', 'guided-cases.js'), 'utf8');
const entries = cases.list();
assert.match(page, /id="guided-case-rubric-progress"[^>]*role="status"[^>]*aria-live="polite"/);
assert.ok(app.includes("item.verification && item.verification.status === 'verified'"));
assert.match(app, /مورد بررسی شده/);
assert.equal(cases.schemaVersion, 2);
assert.equal(entries.length, 56, 'the four pre-existing cases and 52 new intake candidates should be present');
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
  if (item.source.studyPageUrl) {
    const direct = new URL(item.source.studyPageUrl);
    assert.equal(direct.hostname, 'radiopaedia.org');
    assert.match(direct.pathname, /^\/cases\/\d+\/studies\/\d+$/, 'study-page path must use numeric case and study IDs');
  }
  assert.ok((item.source.contributor && item.source.rid) || item.source.caseId, 'each source needs contributor metadata or a stable case ID');
  assert.ok(item.source.citation);
  assert.ok(item.source.caseNotes && item.source.caseNotes.fa && item.source.caseNotes.en, 'every case needs a bilingual local synopsis');
  if (item.source.studyPageUrl) assert.ok(item.source.studyPageUrl.includes('/studies/'), 'external study-page URLs must point to a study');
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
assert.equal(lipoma.source.studyPageUrl, 'https://radiopaedia.org/cases/2582/studies/6276?lang=us#t=im&v1i=478&v1z=1&v2i=931&v2z=1');
assert.equal(cases.getById('abd-gi-004').source.studyPageUrl, 'https://radiopaedia.org/cases/99249/studies/120709?lang=us');
assert.equal(cases.getById('abd-hbp-002').source.studyPageUrl, 'https://radiopaedia.org/cases/164871/studies/134067?lang=us');
assert.equal(cases.getById('abd-hbp-005').source.studyPageUrl, 'https://radiopaedia.org/cases/35234/studies/36772?lang=us');
const selectedStudyUrls = {
  'acute-abdominal-pain-ct': 'https://radiopaedia.org/cases/59227/studies/66554?lang=us#t=im&v1i=37233728&v1z=1&v2i=37233541&v2z=1&v3i=37233598&v3z=1',
  'closed-loop-pattern-ct': 'https://radiopaedia.org/cases/58281/studies/65391?lang=us#t=im&v1i=35824694&v1z=1&v2i=35824879&v2z=1',
  'bowel-viability-ct': 'https://radiopaedia.org/cases/83835/studies/99023?lang=us#t=im&v1i=53798188&v1z=1&v2i=53975701&v2z=1&v3i=53798655&v3z=1&v4i=53798366&v4z=1',
  'abd-hbp-001': 'https://radiopaedia.org/cases/11083/studies/11478?lang=us#t=im&v1i=595477&v1z=1',
  'abd-gi-003': 'https://radiopaedia.org/cases/25921/studies/26066?lang=us#t=im&v1i=5114893&v1z=1',
  'abd-gi-007': 'https://radiopaedia.org/cases/31252/studies/31971?lang=us#t=im&v1i=8514801&v1z=1&v2i=8514813&v2z=1&v3i=8514808&v3z=1',
  'abd-gi-008': 'https://radiopaedia.org/cases/40732/studies/43385?lang=us#t=im&v1i=16998886&v1z=1&v2i=16998833&v2z=1&v3i=16998810&v3z=1&v4i=16998871&v4z=1',
  'abd-hbp-003': 'https://radiopaedia.org/cases/47865/studies/52621#t=im&v1i=24953033&v1z=1',
  'abd-gi-010': 'https://radiopaedia.org/cases/61116/studies/68997?lang=us#t=im&v1i=40108037&v1z=1&v2i=40108176&v2z=1&v3i=40108215&v3z=1',
  'abd-gi-002': 'https://radiopaedia.org/cases/74870/studies/85892?lang=us#t=im&v1i=52141430&v1z=1&v2i=52141456&v2z=1&v3i=52141480&v3z=1&v4i=52143596&v4z=1',
  'abd-gi-006': 'https://radiopaedia.org/cases/83859/studies/99056?lang=us#t=im&v1i=53805104&v1z=1&v2i=53805048&v2z=1',
  'abd-gi-009': 'https://radiopaedia.org/cases/148532/studies/123575?lang=us#t=im&v1i=59021469&v1z=1&v2i=59021809&v2z=1&v3i=59021913&v3z=1',
  'abd-hbp-006': 'https://radiopaedia.org/cases/152397/studies/126296?lang=us#t=im&v1i=59598017&v1z=1&v2i=59598091&v2z=1&v3i=59598162&v3z=1&v4i=59598227&v4z=1',
  'abd-hbp-004': 'https://radiopaedia.org/cases/171645/studies/138747?lang=us#t=im&v1i=62817554&v1z=1&v2i=62918768&v2z=1&v3i=62918879&v3z=1',
  'abd-gi-005': 'https://radiopaedia.org/cases/177978/studies/142870#t=im&v1i=63801646&v1z=1&v2i=63801647&v2z=1&v3i=63801648&v3z=1&v4i=63801649&v4z=1',
  'abd-gi-001': 'https://radiopaedia.org/cases/198206/studies/156027?lang=us#t=im&v1i=67958925&v1z=1&v2i=67959103&v2z=1',
};
assert.equal(Object.keys(selectedStudyUrls).length, 16, 'all distinct selected-series links should be recorded once');
for (const [caseId, url] of Object.entries(selectedStudyUrls)) {
  assert.equal(cases.getById(caseId).source.studyPageUrl, url, 'selected study/image URL mismatch for ' + caseId);
}

assert.equal(cases.getById('abd-gi-010').source.url, 'https://radiopaedia.org/cases/61116?lang=us');
assert.equal(cases.getById('abd-ru-007').source.url, 'https://radiopaedia.org/cases/147902?lang=us');
assert.equal(cases.getById('abd-ru-008').source.url, 'https://radiopaedia.org/cases/78376?lang=us');
assert.equal(cases.getById('abd-prv-008').source.url, 'https://radiopaedia.org/cases/215044?lang=us');
assert.equal(cases.getById('abd-mgu-004').source.url, 'https://radiopaedia.org/cases/150292?lang=us');
assert.equal(cases.getById('abd-frp-005').source.url, 'https://radiopaedia.org/cases/161157?lang=us');
assert.equal(cases.getById('abd-frp-006').source.url, 'https://radiopaedia.org/cases/75582?lang=us');
assert.equal(cases.getById('abd-frp-007').source.url, 'https://radiopaedia.org/cases/194493?lang=us');
assert.equal(cases.intake.addedCount, 52);
assert.ok(app.includes('function getFilteredCases()'));
assert.ok(app.includes('exclude source titles, citations, IDs and direct URLs from'));
assert.ok(page.includes('id="guided-system-filter"'));
assert.ok(page.includes('id="guided-case-search"'));
assert.ok(page.includes('src="./src/data/radiopaedia-abdominal-cases.js"'));
assert.ok(page.includes('id="source-open-study-link"'));
assert.ok(page.includes('id="radiopaedia-exit-mask"'));
assert.ok(page.includes('id="source-case-notes"'));
assert.ok(page.includes('id="radiopaedia-frame"'));
assert.ok(app.includes('function getEmbeddableSourceUrl(item)'));
assert.ok(app.includes("return item.source && item.source.studyPageUrl ? item.source.studyPageUrl : '';"));
assert.ok(app.includes('frame.src = viewerUrl;'));
assert.ok(app.includes('frameWrap.hidden = false;'));
assert.ok(app.includes('item.source.caseNotes'));
assert.ok(!app.includes('LEGACY_CASE_PAGE_EMBEDS'), 'generic case pages must not be embedded as if they were image viewers');
assert.ok(!app.includes('item.source.studyPageUrl || item.source.url'), 'arbitrary new candidates must not fall back to embedding their case page');
assert.ok(!app.includes("return item.source.studyPageUrl || item.source.url;"));



assert.match(page, /embedded image viewing is not guaranteed/);
assert.match(page, /shows only the case page/);
assert.match(page, /Radiopaedia study page; displayed content is controlled by the source site/);
assert.match(app, /Open Radiopaedia study page/);
assert.match(app, /embedded image viewing is not guaranteed/);
assert.match(app, /Radiopaedia controls the displayed page and image navigation/);
assert.doesNotMatch(app, /Open study viewer on Radiopaedia/);
assert.doesNotMatch(page, /the viewer opens automatically/i);
assert.match(app, /Live image loading for this case has not been independently verified/);
assert.match(app, /Medical review and image-redistribution rights must also be checked separately/);
assert.ok(app.includes("item.verification && item.verification.status === 'verified'"));
assert.match(app, /Live source loading was verified in a recorded check/);

assert.match(page, /Image-loading status is shown per case/);
assert.match(page, /لینک منبع به معنی تأیید تصویر/);
assert.ok(app.includes("button.dataset.caseVerification = verificationStatus;"));
assert.ok(app.includes("'guided-case-verification'"));
assert.ok(app.includes("Image loading not independently verified"));
assert.ok(app.includes("Source loading recorded; medical review is separate"));
for (const item of entries) {
  assert.ok(item.verification && item.verification.status,
    'each case must expose an explicit image/source verification status: ' + item.id);
}

console.log('Guided cases: metadata, source-status disclosure, and self-review rubrics validated.');
