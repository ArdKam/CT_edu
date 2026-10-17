const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8'); };

const thorax = require('../src/data/wikimedia-thorax-series.js');
const brain = require('../src/data/wikimedia-brain-series.js');
const brainContrast = require('../src/data/wikimedia-brain-contrast-series.js');

test('Wikimedia thorax manifest lists only known files and all three independent image stacks', function () {
  assert.deepEqual(thorax.planeCounts, { axial: 106, coronal: 67, sagittal: 93 });
  assert.equal(thorax.totalImageCount, 266);
  assert.equal(thorax.sourceAuthor, 'Mikael Häggström, M.D.');
  assert.match(thorax.sourceUrl, /Scrollable_high-resolution_computed_tomography_images_of_a_normal_thorax/);
  assert.equal(thorax.license, 'CC0 1.0 Universal Public Domain Dedication');
  assert.equal(thorax.geometryVerified, false);
  assert.equal(thorax.synchronizedVolume, false);
  assert.equal(thorax.segmentationAvailable, false);
  for (const plane of ['axial', 'coronal', 'sagittal']) {
    const urls = thorax.listImageUrls(plane);
    assert.equal(urls.length, thorax.planeCounts[plane]);
    assert.equal(new Set(urls).size, urls.length);
    assert.ok(urls.every(function (url) { return url.startsWith('https://commons.wikimedia.org/wiki/Special:FilePath/'); }));
  }
  const axialUrls = thorax.listImageUrls('axial');
  assert.ok(axialUrls.some(function (url) { return url.includes('axial_plane_%281%29.jpg'); }));
  assert.ok(axialUrls.some(function (url) { return url.includes('axial_plane_%28118%29.jpg'); }));
  for (const excluded of [71,73,84,87,89,91,96,99,104,106,111,114]) {
    assert.ok(!axialUrls.some(function (url) { return url.includes('axial_plane_%28' + excluded + '%29.jpg'); }));
  }
});

test('Wikimedia brain manifests use correct plane coverage and keep contrast series separate', function () {
  assert.deepEqual(brain.planeCounts, { axial: 41, coronal: 58, sagittal: 40 });
  assert.equal(brain.totalImageCount, 139);
  assert.match(brain.sourceUrl, /normal_brain_%28case_1%29/);
  assert.equal(brain.geometryVerified, false);
  assert.equal(brain.synchronizedVolume, false);
  assert.equal(brainContrast.planeCounts.axial, 34);
  assert.equal(brainContrast.totalImageCount, 34);
  assert.equal(brainContrast.getPlaneInfo('coronal'), null);
  assert.match(brainContrast.sourceUrl, /normal_brain_%28case_2%29/);
  assert.equal(brainContrast.geometryVerified, false);
  for (const manifest of [brain, brainContrast]) {
    assert.equal(manifest.sourceAuthor, 'Mikael Häggström, M.D.');
    assert.equal(manifest.license, 'CC0 1.0 Universal Public Domain Dedication');
    for (const plane of manifest.listPlanes()) {
      const urls = manifest.listImageUrls(plane.id);
      assert.equal(urls.length, plane.count);
      assert.equal(new Set(urls).size, urls.length);
      assert.ok(urls.every(function (url) { return url.startsWith('https://commons.wikimedia.org/wiki/Special:FilePath/'); }));
    }
  }
});

test('the three new preview viewers expose navigation, source credit and explicit geometry limits', function () {
  const routes = [
    ['preview/thorax-series.html', 'wikimedia-thorax-series.js', '106', 'CC0 1.0'],
    ['preview/brain-series.html', 'wikimedia-brain-series.js', '58', 'CC0 1.0'],
    ['preview/brain-contrast-series.html', 'wikimedia-brain-contrast-series.js', '34', 'CC0 1.0']
  ];
  for (const [file, manifest, count, license] of routes) {
    const html = read(file);
    assert.match(html, new RegExp(manifest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /src="\.\.\/src\/abdomen-series\.js"/);
    assert.match(html, /id="series-slider"/);
    assert.match(html, /id="series-retry"/);
    assert.match(html, /referrerpolicy="no-referrer"/);
    assert.match(html, /commons\.wikimedia\.org/);
    assert.match(html, /Mikael Häggström, M\.D\./);
    assert.match(html, new RegExp(license));
    assert.match(html, /not a DICOM volume|not form a spatially aligned DICOM volume|not a volumetric dataset/i);
    assert.match(html, /not verified/i);
    assert.ok(html.includes('https://commons.wikimedia.org/wiki/Scrollable_'));
  }
  const hub = read('preview/index.html');
  for (const route of ['thorax-series.html','brain-series.html','brain-contrast-series.html']) {
    assert.ok(hub.includes('href="./' + route + '"'), 'preview hub missing ' + route);
  }
});

test('the Pages workflow stages preview routes and their shared source manifests without bundling image binaries', function () {
  const workflow = read('.github/workflows/pages-deploy.yml');
  assert.match(workflow, /cp -R src _site\/src/);
  assert.match(workflow, /cp -R preview _site\/preview/);
  for (const file of ['src/data/wikimedia-thorax-series.js','src/data/wikimedia-brain-series.js','src/data/wikimedia-brain-contrast-series.js']) {
    assert.ok(fs.existsSync(path.join(root, file)));
  }
  assert.equal(fs.readdirSync(path.join(root, 'preview')).some(function (name) { return /\.(png|jpe?g|nii(?:\.gz)?)$/i.test(name); }), false);
});
