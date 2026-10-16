const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1
  });
  const pageErrors = [];
  page.on('pageerror', function (error) { pageErrors.push(error.message); });

  try {
    const response = await page.goto('http://127.0.0.1:8765/preview/organ-segmentation.html', {
      waitUntil: 'domcontentloaded'
    });
    assert.ok(response && response.ok(), 'organ segmentation preview must return HTTP 200');

    await page.waitForFunction(function () {
      return document.documentElement.lang === 'fa' &&
        document.documentElement.dir === 'rtl' &&
        Boolean(document.getElementById('organ-canvas')) &&
        Boolean(document.getElementById('organ-slice-slider'));
    });
    assert.equal(await page.locator('#organ-canvas').getAttribute('width'), '256');
    assert.equal(await page.locator('#organ-canvas').getAttribute('height'), '256');

    const manifestResponse = await page.request.get(
      'http://127.0.0.1:8765/preview/assets/organ-predictions/manifest.json'
    );

    if (!manifestResponse.ok()) {
      // A build without generated model output must fail visibly instead of showing mock masks.
      await page.waitForFunction(function () {
        const status = document.getElementById('organ-status').textContent;
        return /No usable output was generated|خروجی قابل‌استفاده‌ای تولید نشده/.test(status);
      }, null, { timeout: 10000 });
      const status = await page.locator('#organ-status').textContent();
      assert.match(status, /No usable output was generated|خروجی قابل‌استفاده‌ای تولید نشده/);
      assert.equal(await page.locator('#organ-controls-list .organ-control-row').count(), 0);
      assert.deepEqual(pageErrors, [], 'the missing-output state should not throw');
      console.log('ORGAN_PREVIEW_BROWSER_OK: explicit unavailable state, no fake masks');
      return;
    }

    const manifest = await manifestResponse.json();
    assert.equal(manifest.status, 'experimental-unreviewed');
    assert.deepEqual(manifest.sourceDimensionsXYZ, [256, 256, 113]);
    assert.equal(manifest.organs.length, 4);
    assert.deepEqual(
      manifest.organs.map(function (organ) { return organ.id; }).sort(),
      ['kidney_left', 'kidney_right', 'liver', 'spleen']
    );

    await page.waitForFunction(function () {
      const state = document.getElementById('organ-canvas-state');
      return state && state.hidden;
    }, null, { timeout: 30000 });
    assert.equal(await page.locator('#organ-controls-list .organ-control-row').count(), 4);
    assert.equal(await page.locator('.organ-download-links a').count(), 5);
    assert.equal(await page.locator('.organ-download-links a').first().getAttribute('download'), 'major-organ-labelmap.nii.gz');
    const downloads = await page.locator('.organ-download-links a').evaluateAll(function (links) {
      return links.map(function (link) { return { href: link.href, fileName: link.download }; });
    });
    for (const download of downloads) {
      const fileResponse = await page.request.get(download.href);
      assert.ok(fileResponse.ok(), '3D mask asset should be available: ' + download.fileName);
      const bytes = await fileResponse.body();
      assert.deepEqual(Array.from(bytes.slice(0, 2)), [31, 139], 'NIfTI file should be gzip-compressed: ' + download.fileName);
    }
    assert.match(await page.locator('#organ-status').textContent(), /model predictions|پیش‌بینی مدل/);

    const beforeToggle = await page.locator('#organ-canvas').evaluate(function (canvas) {
      return canvas.toDataURL();
    });
    await page.locator('#organ-controls-list input[type="checkbox"]').first().uncheck();
    await page.waitForFunction(function (previous) {
      const canvas = document.getElementById('organ-canvas');
      const state = document.getElementById('organ-canvas-state');
      return state.hidden && canvas.toDataURL() !== previous;
    }, beforeToggle, { timeout: 10000 });

    await page.locator('#organ-slice-slider').evaluate(function (input) {
      input.value = '28';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const slicePosition = await page.locator('#organ-position').textContent();
    const westernSlicePosition = slicePosition.replace(/[۰-۹]/g, function (digit) {
      return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit));
    });
    assert.match(westernSlicePosition, /28/);
    await page.locator('#organ-opacity').evaluate(function (input) {
      input.value = '55';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.match(await page.locator('#organ-opacity-value').textContent(), /55/);

    await page.locator('#organ-language-toggle').click();
    assert.ok(['en', 'fa'].includes(await page.locator('html').getAttribute('lang')));
    assert.deepEqual(pageErrors, [], 'organ segmentation preview must not throw runtime errors');
    console.log('ORGAN_PREVIEW_BROWSER_OK: mask display, four-organ toggles, slice navigation, opacity and language');
  } finally {
    await browser.close();
  }
}().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
}));
