const test = require('node:test');
const assert = require('node:assert/strict');
const viewer = require('../src/viewer/tri-planar-viewer.js');

test('tri-planar crosshairs use shared i/j/k coordinates in each plane', function () {
  assert.deepEqual(
    viewer.getCrosshairPoint('axial', 256, 256, { i: 128, j: 128, k: 26 }),
    { x: 128, y: 127 }
  );
  assert.deepEqual(
    viewer.getCrosshairPoint('coronal', 256, 113, { i: 128, j: 128, k: 26 }),
    { x: 128, y: 26 }
  );
  assert.deepEqual(
    viewer.getCrosshairPoint('sagittal', 256, 113, { i: 128, j: 128, k: 26 }),
    { x: 127, y: 26 }
  );
});

test('sagittal crosshair spans the 256-pixel horizontal j axis, not the 113-slice vertical axis', function () {
  const point = viewer.getCrosshairPoint('sagittal', 256, 113, { i: 200, j: 240, k: 50 });
  assert.deepEqual(point, { x: 15, y: 50 });
  assert.ok(point.x < 113, 'this sample remains within the 113-pixel axial dimension but is computed from width');
});

test('tri-planar crosshairs clamp out-of-range indices to image edges', function () {
  assert.deepEqual(
    viewer.getCrosshairPoint('sagittal', 256, 113, { i: 999, j: -8, k: 900 }),
    { x: 255, y: 112 }
  );
  assert.deepEqual(
    viewer.getCrosshairPoint('coronal', 256, 113, { i: -8, j: 128, k: -1 }),
    { x: 0, y: 0 }
  );
});
