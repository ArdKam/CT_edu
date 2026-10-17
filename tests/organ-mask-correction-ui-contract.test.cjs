const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('3D correction workspace is a local draft editor, not the independent Wikimedia polygon editor', function () {
  const html = read('preview/organ-mask-correction.html');
  const script = read('preview/organ-mask-correction.js');
  const core = read('preview/organ-mask-correction-core.js');
  const doc = read('docs/SEGMENTOR_INDEPENDENT_VALIDATION.md'); // existing data-safety contract remains in force

  assert.match(html, /organ-mask-correction-core\.js/);
  assert.match(html, /organ-mask-correction\.js/);
  assert.match(html, /correction-export-organ/);
  assert.match(html, /correction-export-combined/);
  assert.match(html, /correction-undo/);
  assert.match(html, /correction-redo/);
  assert.match(html, /correction-reset-draft/);
  assert.match(html, /local draft|پیش‌نویس محلی/i);
  assert.match(script, /indexedDB/);
  assert.match(script, /DecompressionStream/);
  assert.match(script, /CompressionStream/);
  assert.match(script, /original prediction assets remain untouched|پیش‌بینی اولیه دست‌نخورده/);
  assert.match(script, /state\.editedOverrides/);
  assert.match(script, /pointercancel/);
  assert.match(script, /cancelStroke/);
  assert.match(core, /voxelFromPlanePixel/);
  assert.match(core, /brushVoxelOffsets/);
  assert.doesNotMatch(script, /assets\/spl-abdominal-demo\/.+label/);
  assert.doesNotMatch(script, /fetch\(['"]https?:/);
  assert.match(doc, /not clinical validation|not.*validation/i);
});

test('3D mask correction route keeps all three planes on one geometry-preserving voxel grid', function () {
  const script = read('preview/organ-mask-correction.js');
  const core = read('preview/organ-mask-correction-core.js');
  assert.match(script, /affineRAS/);
  assert.match(script, /dimensionsXYZ/);
  assert.match(script, /sourceSignature/);
  assert.match(script, /voxelFromPlanePixel/);
  assert.match(script, /major-organ-labelmap-corrected-draft\.nii\.gz/);
  assert.match(core, /spatial units must explicitly be millimetres/);
  assert.match(core, /does not match the source volume geometry/);
  assert.match(script, /educational|reviewed|unreviewed/);
});
