const test = require('node:test');
const assert = require('node:assert/strict');
const series = require('../src/data/wikimedia-abdomen-series.js');

test('Base44 axial-series extraction preserves 320 ordered, unique Wikimedia image URLs', function () {
  const urls = series.listImageUrls();
  assert.equal(series.imageCount, 320);
  assert.equal(urls.length, 320);
  assert.equal(new Set(urls).size, 320);
  for (let index = 0; index < urls.length; index += 1) {
    const url = new URL(urls[index]);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'upload.wikimedia.org');
    const match = decodeURIComponent(url.pathname).match(/_axial_plane_(\d+)\.png$/);
    assert.ok(match, 'Expected an axial-plane PNG at index ' + index);
    assert.equal(Number(match[1]), index + 1, 'Source image sequence must remain ordered');
  }
});

test('dataset manifest states source licence and unverified geometry honestly', function () {
  assert.match(series.sourceUrl, /^https:\/\/commons\.wikimedia\.org\//);
  assert.equal(series.license, 'CC0 1.0 Universal Public Domain Dedication');
  assert.equal(series.plane, 'axial');
  assert.equal(series.reportedSliceThicknessMm, 3);
  assert.equal(series.inPlaneSpacingMm, null);
  assert.equal(series.geometryVerified, false);
  assert.equal(series.segmentationAvailable, false);
  assert.equal(series.clinicalReviewStatus, 'review-required');
  assert.equal(series.getImageUrl(-1), null);
  assert.equal(series.getImageUrl(320), null);
  assert.equal(series.getImageUrl(0), series.listImageUrls()[0]);
});
