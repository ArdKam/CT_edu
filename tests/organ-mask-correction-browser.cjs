const assert = require('node:assert/strict');
const { chromium } = require('playwright');

function westernDigits(text) {
  return String(text).replace(/[۰-۹]/g, function (digit) {
    return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit));
  });
}

(async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', function (error) { errors.push(error.message); });
  try {
    const response = await page.goto('http://127.0.0.1:8765/preview/organ-mask-correction.html', { waitUntil: 'domcontentloaded' });
    assert.ok(response && response.ok(), '3D mask correction page must return HTTP 200');
    await page.waitForFunction(function () {
      return document.getElementById('correction-canvas-state').hidden &&
        document.getElementById('correction-active-organ').options.length === 4 &&
        document.getElementById('correction-slice-slider').disabled === false;
    }, null, { timeout: 45000 });

    assert.equal(await page.locator('[data-plane]').count(), 3);
    assert.equal(await page.locator('#correction-visibility-list input[type="checkbox"]').count(), 4);
    assert.equal(await page.locator('#correction-export-organ').isEnabled(), true);
    assert.equal(await page.locator('#correction-export-combined').isEnabled(), true);

    const target = await page.evaluate(async function () {
      const response = await fetch('./assets/organ-predictions/manifest.json');
      const manifest = await response.json();
      const Core = window.CTMaskCorrectionCore;
      const parsed = {};
      for (const organ of manifest.organs) {
        const assetResponse = await fetch('./assets/organ-predictions/' + encodeURIComponent(organ.maskVolumeFile));
        const compressed = await assetResponse.arrayBuffer();
        const decompressed = await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
        parsed[organ.id] = {
          data: Core.parseNifti(decompressed, { dimensionsXYZ: manifest.sourceDimensionsXYZ, affineRAS: manifest.affineRAS }).baseVoxels
        };
      }
      const nx = manifest.sourceDimensionsXYZ[0], ny = manifest.sourceDimensionsXYZ[1], nz = manifest.sourceDimensionsXYZ[2];
      const liver = parsed.liver.data;
      for (let z = 0; z < nz; z += 1) {
        for (let y = 2; y < ny - 2; y += 1) {
          for (let x = 2; x < nx - 2; x += 1) {
            const offset = x + nx * (y + ny * z);
            const neighborhood = [
              offset, offset + 1, offset - 1, offset + nx, offset - nx,
              offset + nx + 1, offset + nx - 1, offset - nx + 1, offset - nx - 1
            ];
            if (!neighborhood.every((index) => liver[index] === 1)) continue;
            const otherIds = Object.keys(parsed).filter((id) => id !== 'liver');
            if (neighborhood.some((index) => otherIds.some((id) => parsed[id].data[index] !== 0))) continue;
            return { x, y, z, pixelX: x, pixelY: ny - 1 - y, dimensions: manifest.sourceDimensionsXYZ };
          }
        }
      }
      throw new Error('Could not find a safely isolated interior liver voxel for browser edit smoke testing.');
    });

    await page.locator('#correction-active-organ').selectOption('liver');
    await page.locator('#correction-brush-radius').evaluate(function (input) {
      input.value = '2';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('[data-mode="paint"]').click();
    await page.locator('#correction-slice-slider').evaluate(function (input, value) {
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, target.z + 1);
    await page.waitForFunction(function (value) {
      return Number(westernDigits(document.getElementById('correction-slice-slider').value)) === value;
    }, target.z + 1);

    async function clickVoxel() {
      const point = await page.locator('#correction-canvas').evaluate(function (canvas, voxel) {
        const rect = canvas.getBoundingClientRect();
        return {
          x: rect.left + (voxel.pixelX + 0.5) / canvas.width * rect.width,
          y: rect.top + (voxel.pixelY + 0.5) / canvas.height * rect.height
        };
      }, target);
      await page.mouse.click(point.x, point.y);
    }

    // Paint mode over an already-positive voxel moves the shared crosshair without changing the source draft.
    await clickVoxel();
    await page.waitForTimeout(100);
    await page.locator('[data-plane="coronal"]').click();
    await page.waitForFunction(function () {
      return document.getElementById('correction-canvas').height === 113 &&
        document.getElementById('correction-slice-slider').max === '256';
    });
    const beforeCoronal = await page.locator('#correction-canvas').evaluate(function (canvas) { return canvas.toDataURL(); });
    assert.match(westernDigits(await page.locator('#correction-position').textContent()), new RegExp(String(target.y + 1)));

    await page.locator('[data-plane="axial"]').click();
    await page.waitForFunction(function () { return document.getElementById('correction-canvas').height === 256; });
    await page.locator('[data-mode="erase"]').click();
    const beforeAxial = await page.locator('#correction-canvas').evaluate(function (canvas) { return canvas.toDataURL(); });
    await clickVoxel();
    await page.waitForFunction(function () {
      const text = document.getElementById('correction-draft-state').textContent;
      return /IndexedDB/.test(text) && document.getElementById('correction-undo').disabled === false;
    }, null, { timeout: 15000 });
    const afterAxial = await page.locator('#correction-canvas').evaluate(function (canvas) { return canvas.toDataURL(); });
    assert.notEqual(afterAxial, beforeAxial, 'erasing a positive 3D mask must change the rendered correction state');

    // The same edited voxel must affect the orthogonal slice, not just the active 2D canvas.
    await page.locator('[data-plane="coronal"]').click();
    await page.waitForFunction(function () { return document.getElementById('correction-canvas').height === 113; });
    const afterCoronal = await page.locator('#correction-canvas').evaluate(function (canvas) { return canvas.toDataURL(); });
    assert.notEqual(afterCoronal, beforeCoronal, 'an axial edit must update the corresponding coronal reformat');
    assert.match(westernDigits(await page.locator('#correction-position').textContent()), new RegExp(String(target.y + 1)));

    await page.locator('#correction-undo').click();
    await page.waitForFunction(function () { return document.getElementById('correction-redo').disabled === false; });
    await page.locator('#correction-redo').click();
    await page.waitForFunction(function () { return document.getElementById('correction-undo').disabled === false; });
    const savedCount = await page.evaluate(async function () {
      const open = indexedDB.open('ct-edu-segmentor-correction-v1', 1);
      const db = await new Promise((resolve, reject) => {
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const transaction = db.transaction('drafts', 'readonly');
      const records = await new Promise((resolve, reject) => {
        const request = transaction.objectStore('drafts').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return records.reduce((sum, record) => sum + Object.values(record.edits).reduce((n, edits) => n + edits.length, 0), 0);
    });
    assert.ok(savedCount > 0, 'completed edits must be persisted as a sparse local draft');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(function () {
      return document.getElementById('correction-canvas-state').hidden &&
        /بازیابی شد|Local draft restored/.test(document.getElementById('correction-draft-state').textContent);
    }, null, { timeout: 45000 });
    assert.equal(await page.locator('#correction-undo').isEnabled(), false, 'history stacks start clean after reopening a persisted draft');
    assert.match(await page.locator('#correction-draft-state').textContent(), /بازیابی شد|Local draft restored/);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#correction-export-organ').click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /liver-corrected-draft\.nii\.gz/);
    assert.deepEqual(errors, [], '3D correction workflow must not throw browser errors');
    console.log('ORGAN_MASK_CORRECTION_BROWSER_OK: shared voxel edits, cross-plane update, local draft restore, undo/redo and NIfTI export');
  } finally {
    await browser.close();
  }
}().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
}));
