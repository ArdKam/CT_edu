const test = require('node:test');
const assert = require('node:assert/strict');
const series = require('../src/data/wikimedia-abdomen-series.js');

test('Base44 axial extraction preserves 320 ordered, unique Wikimedia image URLs', function () {
  const urls = series.listImageUrls('axial');
  assert.equal(series.imageCount, 320);
  assert.equal(urls.length, 320);
  assert.equal(new Set(urls).size, 320);
  for (let index = 0; index < urls.length; index += 1) {
    const url = new URL(urls[index]);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'upload.wikimedia.org');
    const match = decodeURIComponent(url.pathname).match(/_axial_plane_(\d+)\.png$/);
    assert.ok(match, 'Expected an axial-plane PNG at index ' + index);
    assert.equal(Number(match[1]), index + 1, 'Axial source image sequence must remain ordered');
  }
});

test('manifest describes three independent source image stacks and keeps geometry caveats explicit', function () {
  assert.match(series.sourceUrl, /^https:\/\/commons\.wikimedia\.org\//);
  assert.equal(series.license, 'CC0 1.0 Universal Public Domain Dedication');
  assert.deepEqual(series.planeCounts, { axial: 320, coronal: 150, sagittal: 178 });
  assert.equal(series.totalImageCount, 648);
  assert.equal(series.reportedSliceThicknessMm, 3);
  assert.equal(series.inPlaneSpacingMm, null);
  assert.equal(series.geometryVerified, false);
  assert.equal(series.synchronizedVolume, false);
  assert.equal(series.segmentationAvailable, false);
  assert.equal(series.clinicalReviewStatus, 'review-required');
  assert.equal(series.getImageUrl(-1), null);
  assert.equal(series.getImageUrl(320, 'axial'), null);
  assert.equal(series.getImageUrl(150, 'coronal'), null);
  assert.equal(series.getImageUrl(178, 'sagittal'), null);
  assert.match(series.getImageUrl(0, 'coronal'), /Special:FilePath.*coronal_plane_1\.png$/);
  assert.match(series.getImageUrl(149, 'coronal'), /coronal_plane_150\.png$/);
  assert.match(series.getImageUrl(177, 'sagittal'), /sagittal_plane_178\.png$/);
});

test('coronal and sagittal URLs remain ordered and point to Wikimedia Commons file paths', function () {
  for (const plane of ['coronal', 'sagittal']) {
    const urls = series.listImageUrls(plane);
    assert.equal(new Set(urls).size, urls.length);
    for (let index = 0; index < urls.length; index += 1) {
      const url = new URL(urls[index]);
      assert.equal(url.protocol, 'https:');
      assert.equal(url.hostname, 'commons.wikimedia.org');
      const match = decodeURIComponent(url.pathname).match(new RegExp('_' + plane + '_plane_(\\d+)\\.png$'));
      assert.ok(match, 'Expected ' + plane + ' plane image at index ' + index);
      assert.equal(Number(match[1]), index + 1, plane + ' source order must be preserved');
    }
  }
});
