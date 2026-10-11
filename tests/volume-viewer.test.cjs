const test = require('node:test');
const assert = require('node:assert/strict');
const viewer = require('../src/viewer/ct-slice-viewer.js');

test('viewer exposes volume metadata and slice navigation API', function () {
  assert.equal(typeof viewer.getVolumeInfo, 'function');
  assert.equal(typeof viewer.loadSlice, 'function');
  const info = viewer.getVolumeInfo();
  assert.equal(info.dimensions.width, 256);
  assert.equal(info.dimensions.height, 256);
  assert.equal(info.currentSliceIndex, 26);
});

test('slice navigation clamps indices and remains harmless outside a browser', async function () {
  const result = await viewer.loadSlice(27);
  assert.equal(result, false);
  assert.equal(viewer.getStatus().state, 'loading');
});
