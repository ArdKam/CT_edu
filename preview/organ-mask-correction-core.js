(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CTMaskCorrectionCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function fail(message) { throw new Error(message); }
  function sameShape(actual, expected) {
    return Array.isArray(expected) && actual.length === 3 &&
      actual.every(function (value, index) { return value === Number(expected[index]); });
  }
  function affineSpacing(affine) {
    const spacing = [0, 1, 2].map(function (column) {
      return Math.hypot(affine[0][column], affine[1][column], affine[2][column]);
    });
    if (spacing.some(function (value) { return !Number.isFinite(value) || value <= 0; })) {
      fail('NIfTI affine has invalid voxel spacing.');
    }
    return spacing;
  }
  function parseNifti(buffer, expected, options) {
    options = options || {};
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 352) {
      fail('NIfTI file is too small or is not an ArrayBuffer.');
    }
    const view = new DataView(buffer);
    if (view.getInt32(0, true) !== 348) fail('Unsupported NIfTI header size or endianness.');
    if (String.fromCharCode(view.getUint8(344), view.getUint8(345), view.getUint8(346)) !== 'n+1' ||
        view.getUint8(347) !== 0) fail('Only single-file NIfTI-1 (.nii / .nii.gz) files are supported.');
    if (view.getInt16(40, true) !== 3) fail('Mask must be a three-dimensional NIfTI volume.');
    const shape = [view.getInt16(42, true), view.getInt16(44, true), view.getInt16(46, true)];
    if (shape.some(function (value) { return value <= 0; })) fail('NIfTI dimensions must be positive.');
    if (expected && expected.dimensionsXYZ && !sameShape(shape, expected.dimensionsXYZ)) {
      fail('NIfTI dimensions do not match the expected source grid.');
    }
    if (view.getInt16(70, true) !== 2 || view.getInt16(72, true) !== 8) {
      fail('Only uint8 NIfTI masks are supported; this file has a different voxel datatype.');
    }
    const units = view.getUint8(123) & 0x07;
    if (units !== 2) fail('NIfTI spatial units must explicitly be millimetres (mm).');
    const voxOffset = view.getFloat32(108, true);
    if (!Number.isFinite(voxOffset) || voxOffset < 352 || Math.floor(voxOffset) !== voxOffset) {
      fail('NIfTI voxel-data offset is invalid.');
    }
    const voxelCount = shape[0] * shape[1] * shape[2];
    if (!Number.isSafeInteger(voxelCount) || voxOffset + voxelCount > buffer.byteLength) {
      fail('NIfTI voxel data is truncated.');
    }
    const sformCode = view.getInt16(254, true);
    if (sformCode <= 0) fail('NIfTI must provide an explicit sform spatial affine.');
    const affine = [];
    [280, 296, 312].forEach(function (offset) {
      affine.push([0, 1, 2, 3].map(function (column) { return view.getFloat32(offset + column * 4, true); }));
    });
    affine.push([0, 0, 0, 1]);
    if (affine.some(function (row) { return row.some(function (value) { return !Number.isFinite(value); }); })) {
      fail('NIfTI affine contains a non-finite value.');
    }
    const linear = [
      [affine[0][0], affine[0][1], affine[0][2]],
      [affine[1][0], affine[1][1], affine[1][2]],
      [affine[2][0], affine[2][1], affine[2][2]]
    ];
    const determinant =
      linear[0][0] * (linear[1][1] * linear[2][2] - linear[1][2] * linear[2][1]) -
      linear[0][1] * (linear[1][0] * linear[2][2] - linear[1][2] * linear[2][0]) +
      linear[0][2] * (linear[1][0] * linear[2][1] - linear[1][1] * linear[2][0]);
    if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-9) fail('NIfTI affine is singular.');
    const spacingMm = affineSpacing(affine);
    const unitDirections = [0, 1, 2].map(function (column) {
      return [affine[0][column] / spacingMm[column], affine[1][column] / spacingMm[column], affine[2][column] / spacingMm[column]];
    });
    for (let first = 0; first < 3; first += 1) {
      for (let second = first + 1; second < 3; second += 1) {
        const dot = unitDirections[first][0] * unitDirections[second][0] +
          unitDirections[first][1] * unitDirections[second][1] +
          unitDirections[first][2] * unitDirections[second][2];
        if (Math.abs(dot) > 1e-4) fail('NIfTI has sheared/non-orthogonal axes; the tri-planar editor requires the expected orthogonal grid.');
      }
    }
    if (expected && expected.affineRAS !== undefined) {
      if (!Array.isArray(expected.affineRAS) || expected.affineRAS.length !== 4 ||
          expected.affineRAS.some(function (row) {
            return !Array.isArray(row) || row.length !== 4 || row.some(function (value) { return !Number.isFinite(Number(value)); });
          })) {
        fail('Expected source affine metadata is malformed.');
      }
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          if (Math.abs(affine[row][column] - Number(expected.affineRAS[row][column])) > 1e-4) {
            fail('NIfTI affine does not match the source volume geometry.');
          }
        }
      }
    }
    const voxels = new Uint8Array(buffer, voxOffset, voxelCount);
    const maxLabel = options.maxLabel === undefined ? 1 : options.maxLabel;
    for (let i = 0; i < voxels.length; i += 1) {
      if (voxels[i] > maxLabel) fail('NIfTI mask contains an unexpected label value.');
    }
    return {
      buffer: buffer,
      view: view,
      shape: shape,
      affineRAS: affine,
      spacingMm: spacingMm,
      voxOffset: voxOffset,
      voxelCount: voxelCount,
      headerPrefix: new Uint8Array(buffer.slice(0, voxOffset)),
      baseVoxels: voxels
    };
  }
  function voxelOffset(x, y, z, dimensionsXYZ) {
    const nx = Number(dimensionsXYZ[0]);
    const ny = Number(dimensionsXYZ[1]);
    const nz = Number(dimensionsXYZ[2]);
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z) ||
        x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) return -1;
    return x + nx * (y + ny * z);
  }
  function voxelFromPlanePixel(plane, index, pixelX, pixelY, dimensionsXYZ) {
    const nx = dimensionsXYZ[0], ny = dimensionsXYZ[1], nz = dimensionsXYZ[2];
    if (!Number.isInteger(pixelX) || !Number.isInteger(pixelY) ||
        !Number.isInteger(index) || pixelX < 0 || pixelY < 0 || index < 0) return null;
    let x, y, z;
    if (plane === 'axial') {
      if (pixelX >= nx || pixelY >= ny || index >= nz) return null;
      x = pixelX; y = ny - 1 - pixelY; z = index;
    } else if (plane === 'coronal') {
      if (pixelX >= nx || pixelY >= nz || index >= ny) return null;
      x = pixelX; y = index; z = pixelY;
    } else if (plane === 'sagittal') {
      if (pixelX >= ny || pixelY >= nz || index >= nx) return null;
      x = index; y = ny - 1 - pixelX; z = pixelY;
    } else {
      return null;
    }
    return { x: x, y: y, z: z, offset: voxelOffset(x, y, z, dimensionsXYZ) };
  }
  function planeGeometry(plane, dimensionsXYZ, spacingMm) {
    if (plane === 'axial') return { width: dimensionsXYZ[0], height: dimensionsXYZ[1], spacingX: spacingMm[0], spacingY: spacingMm[1] };
    if (plane === 'coronal') return { width: dimensionsXYZ[0], height: dimensionsXYZ[2], spacingX: spacingMm[0], spacingY: spacingMm[2] };
    if (plane === 'sagittal') return { width: dimensionsXYZ[1], height: dimensionsXYZ[2], spacingX: spacingMm[1], spacingY: spacingMm[2] };
    fail('Unknown viewing plane.');
  }
  function serializeNifti(headerPrefix, voxels) {
    if (!(headerPrefix instanceof Uint8Array) || !(voxels instanceof Uint8Array)) {
      fail('NIfTI export requires typed byte arrays.');
    }
    const result = new Uint8Array(headerPrefix.length + voxels.length);
    result.set(headerPrefix, 0);
    result.set(voxels, headerPrefix.length);
    return result;
  }
  function brushVoxelOffsets(plane, index, pixelX, pixelY, radiusMm, dimensionsXYZ, spacingMm) {
    if (!Number.isFinite(radiusMm) || radiusMm <= 0) return [];
    const geometry = planeGeometry(plane, dimensionsXYZ, spacingMm);
    const rx = Math.ceil(radiusMm / geometry.spacingX);
    const ry = Math.ceil(radiusMm / geometry.spacingY);
    const found = [];
    for (let dy = -ry; dy <= ry; dy += 1) {
      for (let dx = -rx; dx <= rx; dx += 1) {
        const physicalX = dx * geometry.spacingX;
        const physicalY = dy * geometry.spacingY;
        if (physicalX * physicalX + physicalY * physicalY > radiusMm * radiusMm) continue;
        const voxel = voxelFromPlanePixel(plane, index, pixelX + dx, pixelY + dy, dimensionsXYZ);
        if (voxel) found.push(voxel.offset);
      }
    }
    return found;
  }
  return {
    parseNifti: parseNifti,
    voxelOffset: voxelOffset,
    voxelFromPlanePixel: voxelFromPlanePixel,
    planeGeometry: planeGeometry,
    serializeNifti: serializeNifti,
    brushVoxelOffsets: brushVoxelOffsets
  };
}));
