const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1180 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', function (error) { pageErrors.push(error.message); });

  try {
    const response = await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
    assert.ok(response && response.ok(), 'home page should return HTTP 200');
    await page.waitForFunction(function () {
      return window.CTEduSliceViewer &&
        window.CTEduSliceViewer.getStatus().state === 'ready' &&
        window.CTEduSliceViewer.getVolumeInfo().availablePlanes.length === 3;
    }, null, { timeout: 30000 });

    let status = await page.evaluate(function () {
      return { status: window.CTEduSliceViewer.getStatus(), info: window.CTEduSliceViewer.getVolumeInfo() };
    });
    assert.equal(status.status.plane, 'axial');
    assert.equal(status.status.sliceCount, 113);
    assert.equal(status.status.sliceIndex, 26);
    assert.deepEqual(status.info.availablePlanes.sort(), ['axial', 'coronal', 'sagittal']);

    await page.locator('#slice-slider').evaluate(function (slider) {
      slider.value = '27';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(function () {
      const s = window.CTEduSliceViewer.getStatus();
      return s.state === 'ready' && s.plane === 'axial' && s.sliceIndex === 27;
    });

    await page.locator('#plane-coronal').click();
    await page.waitForFunction(function () {
      const s = window.CTEduSliceViewer.getStatus();
      return s.state === 'ready' && s.plane === 'coronal';
    });
    status = await page.evaluate(function () {
      return { status: window.CTEduSliceViewer.getStatus(), info: window.CTEduSliceViewer.getVolumeInfo() };
    });
    assert.equal(status.status.sliceCount, 256);
    assert.equal(status.status.width, 256);
    assert.equal(status.status.height, 113);
    assert.equal(status.info.indexAxis, 'j');
    assert.equal(await page.locator('#orientation-letter-left').textContent(), 'R');

    await page.locator('#plane-sagittal').click();
    await page.waitForFunction(function () {
      const s = window.CTEduSliceViewer.getStatus();
      return s.state === 'ready' && s.plane === 'sagittal';
    });
    status = await page.evaluate(function () {
      return { status: window.CTEduSliceViewer.getStatus(), info: window.CTEduSliceViewer.getVolumeInfo() };
    });
    assert.equal(status.status.sliceCount, 256);
    assert.equal(status.status.width, 256);
    assert.equal(status.status.height, 113);
    assert.equal(status.info.indexAxis, 'i');
    assert.equal(await page.locator('#orientation-letter-left').textContent(), 'A');
    assert.equal(await page.locator('#orientation-letter-right').textContent(), 'P');

    const previousIndex = status.status.sliceIndex;
    const canvasBox = await page.locator('#ct-slice-canvas').boundingBox();
    assert.ok(canvasBox && canvasBox.width > 0 && canvasBox.height > 0, 'canvas should have a visible layout box');
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    await page.mouse.wheel(0, 80);
    await page.waitForFunction(function (expected) {
      const s = window.CTEduSliceViewer.getStatus();
      return s.state === 'ready' && s.plane === 'sagittal' && s.sliceIndex !== expected;
    }, previousIndex, { timeout: 5000 });

    await page.locator('#zoom-in').click();
    assert.match(await page.locator('#zoom-value').textContent(), /110|۱۱۰/);
    await page.locator('#zoom-reset').click();
    assert.match(await page.locator('#zoom-value').textContent(), /100|۱۰۰/);

    const wInfo = await page.evaluate(function () { return window.CTEduSliceViewer.getWindowLevelInfo(); });
    const targetLevel = Math.floor((wInfo.intensityRange.min + wInfo.intensityRange.max) / 2);
    await page.locator('#window-width-slider').evaluate(function (slider) {
      slider.value = '600';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#window-level-slider').evaluate(function (slider, level) {
      slider.value = String(level);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }, targetLevel);
    await page.waitForFunction(function (expectedLevel) {
      const info = window.CTEduSliceViewer.getWindowLevelInfo();
      return info.rawAvailable && info.width === 600 && info.level === expectedLevel;
    }, targetLevel, { timeout: 20000 });
    assert.match(await page.locator('#window-level-status').textContent(), /raw|intensity|شدت/i);
    await page.locator('#window-level-reset').click();
    await page.waitForFunction(function () {
      const info = window.CTEduSliceViewer.getWindowLevelInfo();
      return info.rawAvailable && info.width === info.defaultWidth && info.level === info.defaultLevel;
    }, null, { timeout: 10000 });

    await page.locator('#plane-axial').click();
    await page.waitForFunction(function () {
      const s = window.CTEduSliceViewer.getStatus();
      return s.state === 'ready' && s.plane === 'axial';
    });
    await page.locator('#quiz-mode').click();
    await page.waitForFunction(function () {
      return document.querySelector('#app').dataset.mode === 'quiz';
    });
    assert.equal(await page.locator('#plane-coronal').isDisabled(), true, 'plane changes should be disabled during a quiz');
    assert.ok(await page.locator('#answer-options button').count() >= 4, 'active recall should offer four answer options');
    await page.locator('#learn-mode').click();
    await page.waitForFunction(function () { return document.querySelector('#app').dataset.mode !== 'quiz'; });

    fs.mkdirSync(path.join(__dirname, '..', 'build', 'browser-smoke'), { recursive: true });
    await page.screenshot({ path: path.join(__dirname, '..', 'build', 'browser-smoke', 'ct-edu-browser-smoke.png'), fullPage: true });
    assert.deepEqual(pageErrors, [], 'the browser should not emit uncaught JavaScript errors');
    console.log('Browser smoke passed: axial slice navigation, orthogonal views, orientation, wheel, zoom and active recall.');
  } finally {
    await browser.close();
  }
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
