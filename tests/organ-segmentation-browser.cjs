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
        return document.getElementById('organ-canvas-state').hidden === false;
      });
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

    await page.locator('#organ-slice-slider').fill('28');
    assert.match(await page.locator('#organ-position').textContent(), /28/);
    await page.locator('#organ-opacity').fill('55');
    assert.match(await page.locator('#organ-opacity-value').textContent(), /55/);

    await page.getByRole('button', { name: /Switch language to Persian|تغییر زبان به انگلیسی/ }).click().catch(async function () {
      // The starting language is Persian; use the stable control ID if the accessible name differs.
      await page.locator('#organ-language-toggle').click();
    });
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
