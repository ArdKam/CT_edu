const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, firefox, webkit } = require('playwright');

const engineName = String(process.env.BROWSER_ENGINE || 'chromium').toLowerCase();
const engines = { chromium, firefox, webkit };
const engine = engines[engineName];

if (!engine) {
  throw new Error('Unsupported BROWSER_ENGINE: ' + engineName);
}

(async function main() {
  const browser = await engine.launch({ headless: true });
  const mobileEmulationSupported = engineName !== 'firefox';
  const contextOptions = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: mobileEmulationSupported ? 2 : 1
  };
  if (mobileEmulationSupported) {
    contextOptions.isMobile = true;
    contextOptions.hasTouch = true;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const pageErrors = [];
  const sameOriginFailures = [];
  const origin = 'http://127.0.0.1:8765';

  page.on('pageerror', function (error) {
    pageErrors.push(error.message);
  });
  page.on('requestfailed', function (request) {
    try {
      if (new URL(request.url()).origin === origin) {
        sameOriginFailures.push(request.url() + ' :: ' + request.failure()?.errorText);
      }
    } catch (_) {
      // Ignore malformed URLs from browser internals; only same-origin app assets are gated.
    }
  });

  try {
    const response = await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
    assert.ok(response && response.ok(), engineName + ': homepage should return HTTP 200');

    await page.waitForFunction(function () {
      return window.CTEduSliceViewer &&
        window.CTEduSliceViewer.getStatus().state === 'ready' &&
        window.CTEduSliceViewer.getVolumeInfo().availablePlanes.length === 3;
    }, null, { timeout: 30000 });

    for (const plane of ['coronal', 'sagittal', 'axial']) {
      await page.locator('#plane-' + plane).click();
      await page.waitForFunction(function (expectedPlane) {
        const status = window.CTEduSliceViewer.getStatus();
        return status.state === 'ready' && status.plane === expectedPlane;
      }, plane, { timeout: 15000 });
    }

    await page.locator('#language-toggle').click();
    assert.equal(await page.locator('html').getAttribute('dir'), 'ltr',
      engineName + ': language switch should move the layout to LTR');
    await page.locator('#language-toggle').click();
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl',
      engineName + ': switching back should restore RTL');

    await page.locator('#display-triplanar').click();
    await page.waitForFunction(function () {
      return window.CTEduTriPlanarViewer &&
        !document.querySelector('#tri-planar-panel').hidden &&
        window.CTEduTriPlanarViewer.getStatus().ready;
    }, null, { timeout: 30000 });

    for (const plane of ['axial', 'coronal', 'sagittal']) {
      assert.equal(await page.locator('#tri-' + plane + '-canvas').isVisible(), true,
        engineName + ': ' + plane + ' synchronized view should be visible');
      assert.equal(await page.locator('#tri-' + plane + '-slider').isVisible(), true,
        engineName + ': ' + plane + ' slice slider should be visible');
    }


    assert.equal(await page.locator('#modality-catalog .modality-card').count(), 5, engineName + ': all five learning paths should render');
    await page.locator('[data-modality-select="chest-xray"]').click();
    await page.waitForFunction(() => window.CTEduRadiographViewer && !document.querySelector('#radiograph-workspace').hidden, null, {timeout:5000});
    await page.locator('#radiograph-file-input').setInputFiles({
      name:'local-smoke-image.png',mimeType:'image/png',
      buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVQImWNgYGD4DwABBAEAq/2AfQAAAABJRU5ErkJggg==','base64')
    });
    await page.waitForFunction(() => window.CTEduRadiographViewer && window.CTEduRadiographViewer.getStatus().loaded, null, {timeout:5000});
    assert.match(await page.locator('#radiograph-image-status').innerText(), /local-smoke-image\.png/);
    await page.locator('#radiograph-zoom-in').click();
    assert.equal(await page.locator('#radiograph-zoom-value').innerText(), '110%', engineName + ': zoom works');
    await page.locator('#radiograph-fit').click();
    assert.equal(await page.locator('#radiograph-zoom-value').innerText(), '100%', engineName + ': fit restores initial scale');
    const imageStatus = await page.evaluate(() => window.CTEduRadiographViewer.getStatus());
    assert.equal(imageStatus.width, 1); assert.equal(imageStatus.height, 1);
    await page.locator('#radiograph-close').click();
    assert.equal(await page.locator('#radiograph-workspace').isVisible(), false);
    assert.equal(await page.locator('#radiograph-canvas').getAttribute('data-image-loaded'), 'false');

    const widthMetrics = await page.evaluate(function () {
      return {
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
      };
    });
    assert.ok(widthMetrics.document <= widthMetrics.viewport + 1,
      engineName + ': document should not overflow horizontally at 390px: ' + JSON.stringify(widthMetrics));
    assert.ok(widthMetrics.body <= widthMetrics.viewport + 1,
      engineName + ': body should not overflow horizontally at 390px: ' + JSON.stringify(widthMetrics));
    assert.deepEqual(sameOriginFailures, [],
      engineName + ': app assets should not fail to load: ' + JSON.stringify(sameOriginFailures));
    assert.deepEqual(pageErrors, [],
      engineName + ': browser page should not throw runtime exceptions: ' + JSON.stringify(pageErrors));

    const screenshotDir = path.join(__dirname, '..', 'build', 'browser-smoke');
    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, 'compat-' + engineName + '-390.png'),
      animations: 'disabled'
    });

    console.log('PASS browser compatibility: ' + JSON.stringify({
      engine: engineName,
      viewport: widthMetrics.viewport,
      documentWidth: widthMetrics.document,
      bodyWidth: widthMetrics.body,
      touchProfile: mobileEmulationSupported,
      checks: ['three orthogonal planes', 'Persian RTL / English LTR', 'synchronized tri-planar view', '390px no-overflow', 'no failed same-origin assets', 'no page exceptions']
    }));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
