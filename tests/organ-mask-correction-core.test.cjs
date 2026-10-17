const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../preview/organ-mask-correction-core.js');

function makeNifti(options) {
  options = options || {};
  const dimensions = options.dimensions || [3, 4, 2];
  const count = dimensions.reduce((a, b) => a * b, 1);
  const offset = options.voxOffset === undefined ? 352 : options.voxOffset;
  const buffer = new ArrayBuffer(offset + count);
  const view = new DataView(buffer);
  view.setInt32(0, 348, true);
  view.setInt16(40, 3, true);
  view.setInt16(42, dimensions[0], true);
  view.setInt16(44, dimensions[1], true);
  view.setInt16(46, dimensions[2], true);
  view.setInt16(70, options.datatype === undefined ? 2 : options.datatype, true);
  view.setInt16(72, options.bitpix === undefined ? 8 : options.bitpix, true);
  view.setFloat32(108, offset, true);
  view.setUint8(123, options.units === undefined ? 2 : options.units);
  view.setInt16(254, 1, true);
  const affine = options.affine || [
    [0.9375, 0, 0, 12],
    [0, 0.9375, 0, -21],
    [0, 0, -1.5, 84],
    [0, 0, 0, 1]
  ];
  [280, 296, 312].forEach((rowOffset, row) => {
    for (let column = 0; column < 4; column += 1) {
      view.setFloat32(rowOffset + column * 4, affine[row][column], true);
    }
  });
  view.setUint8(344, 110);
  view.setUint8(345, 43);
  view.setUint8(346, 49);
  view.setUint8(347, 0);
  const data = new Uint8Array(buffer, offset, count);
  if (options.data) data.set(options.data);
  return { buffer, affine, dimensions, data };
}

test('NIfTI reader accepts matching uint8 mask volumes with explicit millimetre units', function () {
  const sample = makeNifti({ data: [0, 1, 0, 1, 1] });
  const parsed = Core.parseNifti(sample.buffer, {
    dimensionsXYZ: sample.dimensions,
    affineRAS: sample.affine
  });
  assert.deepEqual(parsed.shape, [3, 4, 2]);
  assert.equal(parsed.voxelCount, 24);
  assert.deepEqual(parsed.spacingMm.map((value) => Number(value.toFixed(4))), [0.9375, 0.9375, 1.5]);
  assert.equal(parsed.baseVoxels[1], 1);
  assert.equal(parsed.headerPrefix.length, 352);
});

test('NIfTI reader rejects unknown units, geometry mismatch, non-mask datatypes and invalid class values', function () {
  const unknownUnits = makeNifti({ units: 0 });
  assert.throws(() => Core.parseNifti(unknownUnits.buffer), /millimetres/);

  const wrongGrid = makeNifti({ dimensions: [4, 4, 2] });
  assert.throws(() => Core.parseNifti(wrongGrid.buffer, { dimensionsXYZ: [3, 4, 2] }), /dimensions/);

  const wrongAffine = makeNifti();
  assert.throws(() => Core.parseNifti(wrongAffine.buffer, {
    affineRAS: [
      [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]
    ]
  }), /affine/);

  const wrongType = makeNifti({ datatype: 16, bitpix: 32 });
  assert.throws(() => Core.parseNifti(wrongType.buffer), /uint8/);

  const shearAffine = [
    [0.9375, 0.1, 0, 12],
    [0, 0.9375, 0, -21],
    [0, 0, -1.5, 84],
    [0, 0, 0, 1]
  ];
  const sheared = makeNifti({ affine: shearAffine });
  assert.throws(() => Core.parseNifti(sheared.buffer), /sheared\/non-orthogonal/);

  const notBinary = makeNifti({ data: [0, 2] });
  assert.throws(() => Core.parseNifti(notBinary.buffer), /unexpected label value/);
});

test('coordinate mapping agrees across all three orthogonal views', function () {
  const dimensions = [3, 4, 2];
  const axial = Core.voxelFromPlanePixel('axial', 1, 2, 0, dimensions);
  assert.deepEqual(axial, { x: 2, y: 3, z: 1, offset: 23 });

  const coronal = Core.voxelFromPlanePixel('coronal', 2, 1, 1, dimensions);
  assert.deepEqual(coronal, { x: 1, y: 2, z: 1, offset: 19 });

  const sagittal = Core.voxelFromPlanePixel('sagittal', 1, 0, 1, dimensions);
  assert.deepEqual(sagittal, { x: 1, y: 3, z: 1, offset: 22 });

  assert.equal(Core.voxelFromPlanePixel('axial', 2, 0, 0, dimensions), null);
  assert.equal(Core.voxelFromPlanePixel('axial', -1, 0, 0, dimensions), null);
  assert.equal(Core.voxelOffset(3, 0, 0, dimensions), -1);
});

test('millimetre brush creates spacing-aware footprints on coronal and axial planes', function () {
  const dimensions = [20, 20, 20];
  const spacing = [1, 1, 2];
  const axial = Core.brushVoxelOffsets('axial', 5, 10, 10, 2, dimensions, spacing);
  const coronal = Core.brushVoxelOffsets('coronal', 10, 10, 10, 2, dimensions, spacing);
  assert.ok(axial.includes(Core.voxelOffset(10, 10, 5, dimensions)));
  assert.ok(coronal.includes(Core.voxelOffset(10, 10, 10, dimensions)));
  assert.ok(axial.length > coronal.length, '2 mm brush spans more slices in the finer-spaced axial plane');
  assert.equal(new Set(axial).size, axial.length);
});

test('NIfTI serializer preserves the header prefix and writes only supplied voxel bytes', function () {
  const sample = makeNifti();
  const parsed = Core.parseNifti(sample.buffer);
  const data = new Uint8Array(parsed.voxelCount);
  data[0] = 1;
  data[23] = 1;
  const exported = Core.serializeNifti(parsed.headerPrefix, data);
  assert.equal(exported.length, 352 + data.length);
  assert.deepEqual(Array.from(exported.slice(0, 352)), Array.from(new Uint8Array(sample.buffer, 0, 352)));
  assert.equal(exported[352], 1);
  assert.equal(exported[352 + 23], 1);
});
