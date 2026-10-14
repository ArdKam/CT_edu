const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1180 }, deviceScaleFactor: 1 });
  const screenshotDir = path.join(__dirname, '..', 'build', 'browser-smoke');
  fs.mkdirSync(screenshotDir, { recursive: true });
  const pageErrors = [];
  const browserConsoleErrors = [];
  const failedRequests = [];
  page.on('pageerror', function (error) { pageErrors.push(error.message); });
  page.on('console', function (message) { if (message.type() === 'error') browserConsoleErrors.push(message.text()); });
  page.on('requestfailed', function (request) { failedRequests.push(request.url() + ' :: ' + request.failure()?.errorText); });

  try {
    await page.addInitScript(function () { localStorage.removeItem('ctedu-learning-progress-v1'); localStorage.removeItem('ctedu-bookmarks-v1'); });
    const response = await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
    assert.ok(response && response.ok(), 'home page should return HTTP 200');
    await page.waitForFunction(function () {
      return window.CTEduSliceViewer &&
        window.CTEduSliceViewer.getStatus().state === 'ready' &&
        window.CTEduSliceViewer.getVolumeInfo().availablePlanes.length === 3;
    }, null, { timeout: 30000 });

    const csp = await page.evaluate(function () {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return meta ? meta.content : null;
    });
    assert.ok(csp && csp.includes("default-src 'self'") && csp.includes("script-src 'self'"),
      'the browser should receive the restrictive CSP before application scripts');
    await page.locator('#structure-search').fill('</strong><svg id="xss-probe" onload="window.__xssProbe=1"></svg>');
    const injectionCheck = await page.evaluate(function () {
      return { nodeCreated: Boolean(document.querySelector('#xss-probe')), executed: window.__xssProbe === 1 };
    });
    assert.equal(injectionCheck.nodeCreated, false, 'search input must never be parsed as markup');
    assert.equal(injectionCheck.executed, false, 'search input must not execute inline event code');
    await page.locator('#structure-search').fill('');

    let status = await page.evaluate(function () {
      return { status: window.CTEduSliceViewer.getStatus(), info: window.CTEduSliceViewer.getVolumeInfo() };
    });
    assert.equal(status.status.plane, 'axial');
    assert.equal(status.status.sliceCount, 113);
    assert.equal(status.status.sliceIndex, 26);
    assert.deepEqual(status.info.availablePlanes.sort(), ['axial', 'coronal', 'sagittal']);
    await page.locator('#schematic-canvas').screenshot({ path: path.join(screenshotDir, 'axial.png') });
    await page.locator('#bookmark-note-input').fill('Review this level <img id="bookmark-note-probe" src=x onerror="window.__bookmarkXss=1">');
    await page.locator('#bookmark-save-current').click();
    await page.waitForFunction(function () { return window.CTEduBookmarkStore && window.CTEduBookmarkStore.getState().count === 1; }, null, { timeout: 5000 });
    assert.equal(await page.locator('#bookmark-list .bookmark-row').count(), 1, 'the selected slice should be saved locally');
    assert.equal(await page.locator('#bookmark-note-probe').count(), 0, 'bookmark notes must render as plain text, never markup');
    assert.match(await page.locator('#bookmark-list').textContent(), /Review this level/);
    assert.equal(await page.evaluate(function () { return window.CTEduBookmarkStore.getState().bookmarks[0].coordinates.k; }), 26);

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
    assert.match(await page.locator('#slice-slider').getAttribute('aria-label'), /موقعیت برش کرونال|Coronal CT slice position/i);
    assert.match(await page.locator('#volume-coordinate-readout').textContent(), /k=(27|۲۷)/, 'coronal view should retain the previously selected axial coordinate');
    assert.match(await page.locator('#module-name-label').textContent(), /coronal|کرونال/i, 'breadcrumb should identify the active coronal view');
    assert.equal(await page.locator('#orientation-letter-left').textContent(), 'R');
    await page.locator('#schematic-canvas').screenshot({ path: path.join(screenshotDir, 'coronal.png') });

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
    assert.match(await page.locator('#slice-slider').getAttribute('aria-label'), /موقعیت برش ساژیتال|Sagittal CT slice position/i);
    assert.equal(await page.locator('#orientation-letter-left').textContent(), 'A');
    assert.equal(await page.locator('#orientation-letter-right').textContent(), 'P');
    assert.match(await page.locator('#module-name-label').textContent(), /sagittal|ساژیتال/i, 'breadcrumb should identify the active sagittal view');
    await page.locator('#schematic-canvas').screenshot({ path: path.join(screenshotDir, 'sagittal.png') });

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
    await page.locator('#zoom-in').click();
    const panBox = await page.locator('#ct-slice-canvas').boundingBox();
    assert.ok(panBox && panBox.width > 0 && panBox.height > 0, 'zoomed canvas should remain visible');
    await page.mouse.move(panBox.x + panBox.width / 2, panBox.y + panBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(panBox.x + panBox.width / 2 + 35, panBox.y + panBox.height / 2 + 24, { steps: 4 });
    await page.mouse.up();
    const draggedTransform = await page.locator('#ct-slice-canvas').evaluate(function (canvas) { return canvas.style.transform; });
    assert.match(draggedTransform, /translate\([^)]+\) scale\(1\.2\)/, 'dragging the enlarged CT should pan the image');
    await page.locator('#zoom-reset').click();
    assert.match(await page.locator('#zoom-value').textContent(), /100|۱۰۰/);
    const resetTransform = await page.locator('#ct-slice-canvas').evaluate(function (canvas) { return canvas.style.transform; });
    assert.match(resetTransform, /translate\(0px, 0px\) scale\(1\)/, 'reset should clear pan and zoom');

    const originalDisplaySignature = await page.locator('#ct-slice-canvas').evaluate(function (canvas) {
      const bytes = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let signature = 0;
      for (let i = 0; i < bytes.length; i += 4) signature = (signature + bytes[i] * 3 + bytes[i + 1] * 5 + bytes[i + 2] * 7) >>> 0;
      return signature;
    });
    const wInfo = await page.evaluate(function () { return window.CTEduSliceViewer.getWindowLevelInfo(); });
    const targetLevel = Math.floor((wInfo.intensityRange.min + wInfo.intensityRange.max) / 2);
    await page.locator('#window-width-slider').evaluate(function (slider) {
      slider.focus();
      slider.value = '600';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#window-level-slider').evaluate(function (slider, level) {
      slider.focus();
      slider.value = String(level);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }, targetLevel);
    try {
      await page.waitForFunction(function (expectedLevel) {
        const info = window.CTEduSliceViewer.getWindowLevelInfo();
        return info.rawAvailable && info.width === 600 && info.level === expectedLevel;
      }, targetLevel, { timeout: 20000 });
    } catch (error) {
      console.error('Window/level diagnostic', await page.evaluate(function () {
        return {
          info: window.CTEduSliceViewer.getWindowLevelInfo(),
          status: window.CTEduSliceViewer.getStatus(),
          controls: {
            width: document.querySelector('#window-width-slider').value,
            level: document.querySelector('#window-level-slider').value,
            note: document.querySelector('#window-level-status').textContent
          }
        };
      }));
      console.error('Browser errors', { pageErrors: pageErrors, consoleErrors: browserConsoleErrors, failedRequests: failedRequests });
      throw error;
    }
    assert.match(await page.locator('#window-level-status').textContent(), /raw|intensity|شدت/i);
    const adjustedDisplaySignature = await page.locator('#ct-slice-canvas').evaluate(function (canvas) {
      const bytes = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let signature = 0;
      for (let i = 0; i < bytes.length; i += 4) signature = (signature + bytes[i] * 3 + bytes[i + 1] * 5 + bytes[i + 2] * 7) >>> 0;
      return signature;
    });
    assert.notEqual(adjustedDisplaySignature, originalDisplaySignature, 'window/level must change the rendered CT pixels, not only the control value');
    await page.locator('#window-level-slider').evaluate(function (slider) {
      slider.focus();
      slider.value = '0';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForFunction(function () {
      const info = window.CTEduSliceViewer.getWindowLevelInfo();
      return info.rawAvailable && info.level === 0;
    }, null, { timeout: 10000 });
    await page.locator('#window-level-reset').click();
    await page.waitForFunction(function () {
      const info = window.CTEduSliceViewer.getWindowLevelInfo();
      return info.rawAvailable && info.width === info.defaultWidth && info.level === info.defaultLevel;
    }, null, { timeout: 10000 });

    await page.locator('#plane-axial').click();
    await page.waitForFunction(function () {
      const s = window.CTEduSliceViewer.getStatus();
      return s.state === 'ready' && s.plane === 'axial' && s.sliceIndex === 27;
    }, null, { timeout: 10000 });
    await page.locator('#quiz-mode').click();
    await page.waitForFunction(function () {
      return document.querySelector('#app').dataset.mode === 'quiz';
    });
    assert.equal(await page.locator('#plane-coronal').isDisabled(), true, 'plane changes should be disabled during a quiz');
    assert.ok(await page.locator('#answer-options button').count() >= 4, 'active recall should offer four answer options');
    await page.locator('#answer-options button').first().click();
    await page.waitForFunction(function () {
      const stored = JSON.parse(localStorage.getItem('ctedu-learning-progress-v1') || '{"attempts":[]}');
      return stored.attempts && stored.attempts.length === 1;
    }, null, { timeout: 5000 });
    const localProgress = await page.evaluate(function () {
      const stored = JSON.parse(localStorage.getItem('ctedu-learning-progress-v1'));
      return { attempts: stored.attempts.length, hasIdentity: stored.attempts.some(function (item) { return 'userId' in item || 'email' in item; }) };
    });
    assert.equal(localProgress.attempts, 1, 'a submitted answer should be stored locally');
    assert.equal(localProgress.hasIdentity, false, 'local progress should not collect identity fields');
    assert.match(await page.locator('#progress-attempts').textContent(), /1|۱/);
    assert.match(await page.locator('#progress-storage-note').textContent(), /مرورگر|browser/i);

    const [backupDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#export-local-progress').click()
    ]);
    assert.match(backupDownload.suggestedFilename(), /^ct-edu-progress-.*\.json$/);
    const backupPath = await backupDownload.path();
    const exportedBackup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    assert.equal(exportedBackup.app, 'ct-edu-local-progress');
    assert.equal(exportedBackup.version, 1);
    assert.equal(exportedBackup.attempts.length, 1);
    assert.equal('email' in exportedBackup.attempts[0], false);

    const restoreFixture = {
      app: 'ct-edu-local-progress',
      version: 1,
      exportedAt: Date.now(),
      attempts: [
        { caseId: 'spl-abdomen-normal-atlas', region: 'abdomen', skill: 'structure-identification', targetId: 'liver', selectedId: 'liver', isCorrect: true, timestamp: 1700000000000 },
        { caseId: 'spl-abdomen-normal-atlas', region: 'abdomen', skill: 'structure-identification', targetId: 'spleen', selectedId: 'aorta', isCorrect: false, timestamp: 1700000001000 }
      ]
    };
    page.once('dialog', function (dialog) { dialog.accept(); });
    await page.locator('#restore-local-progress-file').setInputFiles({
      name: 'ct-edu-progress-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(restoreFixture))
    });
    await page.waitForFunction(function () {
      const stored = JSON.parse(localStorage.getItem('ctedu-learning-progress-v1') || '{"attempts":[]}');
      return stored.attempts && stored.attempts.length === 2;
    }, null, { timeout: 5000 });
    assert.match(await page.locator('#progress-attempts').textContent(), /2|۲/);
    assert.match(await page.locator('#progress-accuracy').textContent(), /50|۵۰/);
    assert.match(await page.locator('#progress-feedback').textContent(), /بازیابی|restored/i);

    page.once('dialog', function (dialog) { dialog.accept(); });
    await page.locator('#restore-local-progress-file').setInputFiles({
      name: 'wrong-app-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ app: 'different-app', version: 1, attempts: [] }))
    });
    await page.waitForFunction(function () {
      return /valid CT Edu|معتبر CT Edu/.test(document.querySelector('#progress-feedback').textContent);
    }, null, { timeout: 5000 });
    assert.equal(await page.evaluate(function () {
      return JSON.parse(localStorage.getItem('ctedu-learning-progress-v1')).attempts.length;
    }), 2, 'an invalid backup must not replace current history');

    await page.locator('#restore-local-progress-file').setInputFiles({
      name: 'oversized-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.alloc(1024 * 1024 + 1, 32)
    });
    await page.waitForFunction(function () {
      return /1 MB|۱ مگابایت/.test(document.querySelector('#progress-feedback').textContent);
    }, null, { timeout: 5000 });
    assert.equal(await page.evaluate(function () {
      return JSON.parse(localStorage.getItem('ctedu-learning-progress-v1')).attempts.length;
    }), 2, 'an oversized backup must not change current history');

    await page.locator('#learn-mode').click();
    await page.waitForFunction(function () { return document.querySelector('#app').dataset.mode !== 'quiz'; });
    await page.locator('#reset-local-progress').click();
    await page.waitForFunction(function () {
      return document.querySelector('#progress-attempts').textContent.trim() === '۰' ||
        document.querySelector('#progress-attempts').textContent.trim() === '0';
    }, null, { timeout: 5000 });
    assert.match(await page.locator('#progress-feedback').textContent(), /پاک شد|cleared/i);

    await page.locator('#display-triplanar').click();
    await page.waitForFunction(function () {
      return window.CTEduTriPlanarViewer &&
        !document.querySelector('#tri-planar-panel').hidden &&
        window.CTEduTriPlanarViewer.getStatus().ready;
    }, null, { timeout: 30000 });
    assert.equal(await page.locator('#tri-axial-canvas').isVisible(), true);
    assert.equal(await page.locator('#tri-coronal-canvas').isVisible(), true);
    assert.equal(await page.locator('#tri-sagittal-canvas').isVisible(), true);
    for (const plane of ['axial', 'coronal', 'sagittal']) {
      assert.equal(await page.locator('#tri-' + plane + '-canvas').getAttribute('role'), 'img');
      assert.equal(await page.locator('#tri-' + plane + '-canvas').getAttribute('tabindex'), null, 'static tri-planar canvas must not add a dead keyboard focus stop');
      assert.equal(await page.locator('#tri-' + plane + '-slider').getAttribute('aria-labelledby'), 'tri-' + plane + '-title tri-' + plane + '-slider-label');
      assert.equal(await page.locator('#tri-' + plane + '-slider').getAttribute('aria-describedby'), 'tri-' + plane + '-position');
    }
    const triBefore = await page.evaluate(function () { return window.CTEduTriPlanarViewer.getStatus().indices; });
    assert.equal(triBefore.axial, 27, 'axial overview should preserve the selected k coordinate');
    await page.locator('#tri-coronal-slider').evaluate(function (slider) {
      slider.value = '140';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(function () {
      return window.CTEduTriPlanarViewer.getStatus().indices.coronal === 140;
    }, null, { timeout: 10000 });
    const triAfter = await page.evaluate(function () { return window.CTEduTriPlanarViewer.getStatus().indices; });
    assert.equal(triAfter.axial, triBefore.axial, 'changing j must preserve k');
    assert.equal(triAfter.sagittal, triBefore.sagittal, 'changing j must preserve i');
    await page.locator('#tri-planar-panel').screenshot({ path: path.join(screenshotDir, 'tri-planar.png') });
    await page.locator('[data-open-plane="coronal"]').click();
    await page.waitForFunction(function () {
      const status = window.CTEduSliceViewer.getStatus();
      return status.state === 'ready' && status.plane === 'coronal' && status.sliceIndex === 140 &&
        document.querySelector('#tri-planar-panel').hidden;
    }, null, { timeout: 10000 });
    assert.equal(await page.locator('#viewer-frame').isVisible(), true);
    assert.equal(await page.locator('#slice-navigation').isVisible(), true);
    await page.screenshot({ path: path.join(screenshotDir, 'ct-edu-browser-smoke.png'), fullPage: true });

    await page.locator('#display-triplanar').click();
    await page.waitForFunction(function () {
      return document.querySelector('#tri-planar-panel').hidden === false &&
        window.CTEduTriPlanarViewer &&
        window.CTEduTriPlanarViewer.getStatus().ready;
    }, null, { timeout: 20000 });
    const triStatus = await page.evaluate(function () {
      return {
        status: window.CTEduTriPlanarViewer.getStatus(),
        sizes: ['axial', 'coronal', 'sagittal'].map(function (plane) {
          const canvas = document.querySelector('#tri-' + plane + '-canvas');
          return { plane: plane, width: canvas.width, height: canvas.height };
        }),
        sagittalCrosshair: window.CTEduTriPlanarViewer.getCrosshairPoint('sagittal', 256, 113, { i: 128, j: 128, k: 27 })
      };
    });
    assert.deepEqual(triStatus.sizes, [
      { plane: 'axial', width: 256, height: 256 },
      { plane: 'coronal', width: 256, height: 113 },
      { plane: 'sagittal', width: 256, height: 113 }
    ]);
    assert.deepEqual(triStatus.sagittalCrosshair, { x: 127, y: 27 },
      'sagittal crosshair should use the 256-pixel j-axis for horizontal position');
    assert.equal(triStatus.status.indices.axial, 27);
    assert.equal(triStatus.status.indices.coronal, 140, 'tri-planar mode should preserve the selected coronal position when reopening');
    assert.equal(triStatus.status.hasSignal.coronal, true, 'a tissue-bearing coronal slice should be recognized as image data');
    assert.ok(triStatus.status.nonZeroIntensityPixels.coronal > 0);
    assert.equal(await page.locator('#tri-coronal-empty-state').isHidden(), true);
    assert.ok(await page.locator('#tri-axial-canvas').isVisible());
    assert.ok(await page.locator('#tri-coronal-canvas').isVisible());
    assert.ok(await page.locator('#tri-sagittal-canvas').isVisible());
    await page.locator('#tri-coronal-slider').evaluate(function (slider) {
      slider.value = '240';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(function () {
      const status = window.CTEduTriPlanarViewer.getStatus();
      return status.ready && status.indices.coronal === 240 && status.hasSignal.coronal === false;
    }, null, { timeout: 10000 });
    const sagittalLinkedCrosshair = await page.evaluate(function () {
      const status = window.CTEduTriPlanarViewer.getStatus();
      return {
        j: status.indices.coronal,
        point: window.CTEduTriPlanarViewer.getCrosshairPoint('sagittal', 256, 113, {
          i: 128, j: status.indices.coronal, k: status.indices.axial
        })
      };
    });
    assert.equal(sagittalLinkedCrosshair.j, 240);
    assert.equal(await page.locator('#tri-coronal-empty-state').isVisible(), true,
      'an all-zero padded CT slice should display an explanatory empty-state overlay');
    assert.match(await page.locator('#tri-coronal-empty-state').textContent(), /image data|No image|دادهٔ تصویری|خالی حجم/i);
    assert.deepEqual(sagittalLinkedCrosshair.point, { x: 15, y: 27 },
      'changing coronal position should move the linked sagittal crosshair');
    await page.screenshot({ path: path.join(screenshotDir, 'tri-planar.png'), fullPage: true });
    const expectedSagittalIndex = triStatus.status.indices.sagittal;
    await page.locator('[data-open-plane="coronal"]').click();
    await page.waitForFunction(function () {
      const status = window.CTEduSliceViewer.getStatus();
      return status.state === 'ready' && status.plane === 'coronal' && status.sliceIndex === 240 &&
        document.querySelector('#tri-planar-panel').hidden;
    }, null, { timeout: 10000 });
    assert.equal(await page.locator('#viewer-empty-state').isVisible(), true,
      'the single-plane viewer should explain when a selected edge slice has no CT signal');
    assert.match(await page.locator('#viewer-empty-state').textContent(), /No image data|outside the acquired|دادهٔ تصویری|خالی حجم/i);
    await page.screenshot({ path: path.join(screenshotDir, 'empty-edge-slice.png'), fullPage: true });
    await page.locator('#display-triplanar').click();
    await page.waitForFunction(function () {
      return !document.querySelector('#tri-planar-panel').hidden &&
        window.CTEduTriPlanarViewer.getStatus().ready;
    }, null, { timeout: 10000 });
    await page.locator('[data-open-plane="sagittal"]').click();
    await page.waitForFunction(function (expectedIndex) {
      const status = window.CTEduSliceViewer.getStatus();
      return status.state === 'ready' && status.plane === 'sagittal' && status.sliceIndex === expectedIndex &&
        document.querySelector('#tri-planar-panel').hidden;
    }, expectedSagittalIndex, { timeout: 10000 });

    await page.waitForFunction(function () { return document.querySelector('#bookmark-list [data-bookmark-open]') !== null; }, null, { timeout: 5000 });
    await page.locator('#bookmark-list [data-bookmark-open]').first().click();
    await page.waitForFunction(function () {
      const status = window.CTEduSliceViewer.getStatus();
      return status.state === 'ready' && status.plane === 'axial' && status.sliceIndex === 26 && document.querySelector('#tri-planar-panel').hidden;
    }, null, { timeout: 10000 });
    const [bookmarkDownload] = await Promise.all([page.waitForEvent('download'), page.locator('#bookmark-export').click()]);
    assert.match(bookmarkDownload.suggestedFilename(), /^ct-edu-bookmarks-.*\.json$/);
    const bookmarkBackup = JSON.parse(require('node:fs').readFileSync(await bookmarkDownload.path(), 'utf8'));
    assert.equal(bookmarkBackup.app, 'ct-edu-bookmarks');
    assert.equal(bookmarkBackup.version, 1);
    assert.equal(bookmarkBackup.bookmarks.length, 1);

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const mobileErrors = [];
    mobile.on('pageerror', function (error) { mobileErrors.push(error.message); });
    const mobileResponse = await mobile.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
    assert.ok(mobileResponse && mobileResponse.ok(), 'mobile home page should return HTTP 200');
    await mobile.waitForFunction(function () {
      return window.CTEduSliceViewer && window.CTEduSliceViewer.getStatus().state === 'ready';
    }, null, { timeout: 30000 });
    assert.equal(await mobile.locator('#plane-axial').isVisible(), true);
    assert.equal(await mobile.locator('#slice-slider').isVisible(), true);
    assert.equal(await mobile.locator('#window-width-slider').isVisible(), true);
    const mobileLayout = await mobile.evaluate(function () {
      return {
        width: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewerWidth: document.querySelector('#schematic-canvas').getBoundingClientRect().width
      };
    });
    assert.ok(mobileLayout.documentWidth <= mobileLayout.width + 1,
      'mobile layout must not overflow horizontally: ' + JSON.stringify(mobileLayout));
    await mobile.locator('#plane-coronal').tap();
    await mobile.waitForFunction(function () {
      const s = window.CTEduSliceViewer.getStatus();
      return s.state === 'ready' && s.plane === 'coronal';
    }, null, { timeout: 10000 });
    const mobileCoronalLayout = await mobile.evaluate(function () {
      return { width: window.innerWidth, documentWidth: document.documentElement.scrollWidth };
    });
    assert.ok(mobileCoronalLayout.documentWidth <= mobileCoronalLayout.width + 1,
      'coronal mobile view must not overflow horizontally: ' + JSON.stringify(mobileCoronalLayout));
    await mobile.locator('#display-triplanar').tap();
    await mobile.waitForFunction(function () {
      return window.CTEduTriPlanarViewer && window.CTEduTriPlanarViewer.getStatus().ready &&
        !document.querySelector('#tri-planar-panel').hidden;
    }, null, { timeout: 30000 });
    const mobileTriLayout = await mobile.evaluate(function () {
      return { width: window.innerWidth, documentWidth: document.documentElement.scrollWidth };
    });
    assert.ok(mobileTriLayout.documentWidth <= mobileTriLayout.width + 1,
      'tri-planar mobile layout must not overflow horizontally: ' + JSON.stringify(mobileTriLayout));
    await mobile.locator('#display-single').tap();
    await mobile.waitForFunction(function () { return !document.querySelector('#tri-planar-panel').hidden ? false : true; });
    assert.deepEqual(mobileErrors, [], 'mobile browser should not emit uncaught JavaScript errors');
    await mobile.close();

    const guidedPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const guidedErrors = [];
    guidedPage.on('pageerror', function (error) { guidedErrors.push(error.message); });
    await guidedPage.route('https://radiopaedia.org/**', function (route) {
      return route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><html><body><main id="mock-source-series">Mock external Radiopaedia series</main></body></html>'
      });
    });
    const guidedResponse = await guidedPage.goto('http://127.0.0.1:8765/cases.html', { waitUntil: 'domcontentloaded' });
    assert.ok(guidedResponse && guidedResponse.ok(), 'guided case workspace should return HTTP 200');
    await guidedPage.locator('#guided-case-list .guided-case-card').first().waitFor({ state: 'visible' });
    assert.equal(await guidedPage.locator('#guided-case-list .guided-case-card').count(), 26,
      'the existing four and 22 intake cases should be listed');
    assert.equal(await guidedPage.locator('#guided-case-count').textContent(), '26 از 26 کیس',
      'the case count should reflect the full catalog in Persian');
    await guidedPage.locator('#guided-system-filter').selectOption('renal-urinary');
    assert.equal(await guidedPage.locator('#guided-case-list .guided-case-card').count(), 4,
      'the renal/urinary filter should narrow the displayed case collection');
    assert.equal(await guidedPage.locator('#guided-case-list .guided-case-card[data-case-category="renal-urinary"]').count(), 4,
      'all visible results must belong to the selected primary category');
    await guidedPage.locator('#guided-system-filter').selectOption('');
    await guidedPage.locator('#guided-level-filter').selectOption('foundations');
    assert.equal(await guidedPage.locator('#guided-case-list .guided-case-card').count(), 4,
      'the foundations difficulty filter should narrow cases independently of organ system');
    await guidedPage.locator('#guided-level-filter').selectOption('');
    await guidedPage.locator('#guided-case-search').fill('zz-no-such-teaching-topic-zz');
    assert.equal(await guidedPage.locator('#guided-case-list .guided-case-card').count(), 0,
      'an unmatched search should produce no cards');
    assert.equal(await guidedPage.locator('#guided-case-empty').isVisible(), true,
      'an unmatched search should announce an empty state');
    assert.equal(await guidedPage.locator('#guided-active-case-panel').isVisible(), false,
      'an empty result should not leave a stale active case displayed');
    await guidedPage.locator('#guided-case-search').fill('');
    assert.equal(await guidedPage.locator('#guided-case-list .guided-case-card').count(), 26,
      'clearing search should restore the full collection');
    assert.equal(await guidedPage.locator('#radiopaedia-frame').getAttribute('src'), null,
      'the external source must not be requested before learner opt-in');
    const directViewerUrl = 'https://radiopaedia.org/cases/2582/studies/6276?lang=us#t=im&v1i=478&v1z=1&v2i=931&v2z=1';
    await guidedPage.locator('#guided-case-list .guided-case-card').nth(3).click();
    assert.equal((await guidedPage.locator('#source-case-title').textContent()).toLowerCase().includes('lipoma'), false,
      'the local source title should not reveal the diagnosis before the learner submits a report');
    assert.equal(await guidedPage.locator('#source-article-link').isVisible(), false,
      'the related article should stay hidden before the learner submits a report');
    assert.equal(await guidedPage.locator('#source-open-viewer-link').getAttribute('href'), directViewerUrl,
      'the lipoma case should expose its dedicated viewer URL');
    assert.equal(await guidedPage.locator('#source-open-viewer-link').isVisible(), true,
      'the direct viewer link should be visible when a study URL exists');
    await guidedPage.locator('#source-load-button').click();
    assert.equal(await guidedPage.locator('#radiopaedia-frame').getAttribute('src'), directViewerUrl,
      'the embedded viewer should load the exact study URL, including its selected-image fragment');
    await guidedPage.locator('#guided-case-list .guided-case-card').first().click();
    await guidedPage.locator('#learner-findings').fill('Dilated small bowel with a suspected transition point.');
    await guidedPage.locator('#learner-impression').fill('Small bowel obstruction; assess for closed-loop features and ischaemia.');
    await guidedPage.locator('#guided-case-form button[type="submit"]').click();
    assert.equal(await guidedPage.locator('#guided-case-rubric-section').isVisible(), true,
      'submitting findings and impression should reveal the self-review rubric');
    assert.equal(await guidedPage.locator('#source-article-link').isVisible(), true,
      'source details should become available after the learner submits a report');
    assert.equal(await guidedPage.locator('#guided-case-rubric .guided-rubric-item').count(), 4,
      'case-specific rubric should be displayed');
    assert.equal(await guidedPage.locator('#guided-case-rubric-progress').getAttribute('aria-live'), 'polite',
      'self-review progress should be announced accessibly');
    await guidedPage.locator('#guided-case-rubric input[type="checkbox"]').first().check();
    assert.match(await guidedPage.locator('#guided-case-rubric-progress').textContent(), /1 از 4/,
      'self-review should show the number of criteria checked');
    await guidedPage.locator('#source-load-button').click();
    assert.match(await guidedPage.locator('#radiopaedia-frame').getAttribute('src'),
      /^https:\/\/radiopaedia\.org\/cases\//, 'explicit source-viewer request should target the cited original case');
    assert.equal(await guidedPage.locator('#radiopaedia-frame-wrap').isVisible(), true);
    await guidedPage.locator('#language-toggle').click();
    assert.equal(await guidedPage.locator('html').getAttribute('lang'), 'en',
      'guided case workspace should switch language');
    assert.match(await guidedPage.locator('#guided-case-rubric-progress').textContent(), /1 of 4 items reviewed/,
      'checklist progress should follow the selected language');
    assert.equal(await guidedPage.locator('#learner-findings').getAttribute('placeholder'),
      'Record the imaging findings systematically…', 'guided case placeholders should be translated');
    assert.equal(await guidedPage.locator('#radiopaedia-frame-wrap').isVisible(), true,
      'language switch should preserve an already requested source viewer');
    await guidedPage.waitForFunction(function () {
      return document.documentElement.scrollWidth <= window.innerWidth + 1;
    });
    const guidedLayout = await guidedPage.evaluate(function () {
      return { width: window.innerWidth, documentWidth: document.documentElement.scrollWidth };
    });
    assert.ok(guidedLayout.documentWidth <= guidedLayout.width + 1,
      'guided case page must not overflow horizontally at 390px: ' + JSON.stringify(guidedLayout));
    await guidedPage.reload({ waitUntil: 'domcontentloaded' });
    await guidedPage.locator('#guided-case-list .guided-case-card').first().waitFor({ state: 'visible' });
    assert.match(await guidedPage.locator('#learner-findings').inputValue(), /Dilated small bowel/,
      'guided-case drafts should persist locally across reload');
    await guidedPage.locator('#guided-case-list .guided-case-card[data-case-id="pancreatic-mass-infiltrative-164871"]').click();
    assert.equal(await guidedPage.locator('#source-case-title').textContent(), 'منبع تصویربرداری خارجی',
      'a newly added case must not reveal its source diagnosis before report submission');
    assert.equal(await guidedPage.locator('#source-article-link').isVisible(), false,
      'unsubmitted source article details must remain hidden');
    assert.equal(await guidedPage.locator('#source-open-link').getAttribute('href'), 'https://radiopaedia.org/cases/164871?lang=us',
      'the original source page must remain accessible');
    assert.equal(await guidedPage.locator('#source-open-viewer-link').getAttribute('href'), 'https://radiopaedia.org/cases/164871/studies/134067?lang=us',
      'the extracted study URL must be used for the new case');
    assert.equal(await guidedPage.locator('#radiopaedia-frame').getAttribute('src'), null,
      'selecting another case must not load its external viewer before opt-in');
    assert.deepEqual(guidedErrors, [], 'guided case page should not emit uncaught JavaScript errors');
    await guidedPage.close();

    const guidedDesktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const guidedDesktopErrors = [];
    guidedDesktop.on('pageerror', function (error) { guidedDesktopErrors.push(error.message); });
    const guidedDesktopResponse = await guidedDesktop.goto('http://127.0.0.1:8765/cases.html', { waitUntil: 'domcontentloaded' });
    assert.ok(guidedDesktopResponse && guidedDesktopResponse.ok(), 'desktop guided case workspace should return HTTP 200');
    await guidedDesktop.locator('#guided-case-list .guided-case-card').first().waitFor({ state: 'visible' });
    assert.equal(await guidedDesktop.locator('#guided-case-list .guided-case-card').count(), 26,
      'desktop catalog should expose the full case collection');
    await guidedDesktop.locator('#guided-system-filter').selectOption('adrenal-endocrine');
    assert.equal(await guidedDesktop.locator('#guided-case-list .guided-case-card').count(), 2,
      'desktop system filtering should update case results');
    const desktopLayout = await guidedDesktop.evaluate(function () {
      return { width: window.innerWidth, documentWidth: document.documentElement.scrollWidth };
    });
    assert.ok(desktopLayout.documentWidth <= desktopLayout.width + 1,
      'desktop guided case page must not overflow horizontally: ' + JSON.stringify(desktopLayout));
    assert.deepEqual(guidedDesktopErrors, [], 'desktop guided case page should not emit uncaught JavaScript errors');
    await guidedDesktop.close();

    const privacyPage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const privacyErrors = [];
    const privacyConsoleErrors = [];
    const privacyFailedRequests = [];
    privacyPage.on('pageerror', function (error) { privacyErrors.push(error.message); });
    privacyPage.on('console', function (message) { if (message.type() === 'error') privacyConsoleErrors.push(message.text()); });
    privacyPage.on('requestfailed', function (request) { privacyFailedRequests.push(request.url() + ' :: ' + request.failure()?.errorText); });
    const privacyResponse = await privacyPage.goto('http://127.0.0.1:8765/privacy.html', { waitUntil: 'domcontentloaded' });
    assert.ok(privacyResponse && privacyResponse.ok(), 'privacy notice should return HTTP 200');
    await privacyPage.locator('#privacy-title').waitFor({ state: 'visible' });
    assert.match(await privacyPage.locator('body').textContent(), /Google Fonts/);
    assert.match(await privacyPage.locator('body').textContent(), /local history|local progress/i);
    assert.equal(await privacyPage.locator('meta[http-equiv="Content-Security-Policy"]').count(), 1);
    const privacyLayout = await privacyPage.evaluate(function () {
      return { width: window.innerWidth, documentWidth: document.documentElement.scrollWidth };
    });
    assert.ok(privacyLayout.documentWidth <= privacyLayout.width + 1,
      'privacy page must not overflow horizontally on a 390 px viewport: ' + JSON.stringify(privacyLayout));
    await privacyPage.screenshot({ path: path.join(screenshotDir, 'privacy-mobile.png'), fullPage: true });
    assert.deepEqual(privacyErrors, [], 'privacy page should not emit uncaught JavaScript errors');
    assert.deepEqual(privacyConsoleErrors, [], 'privacy page should not emit console errors');
    assert.deepEqual(privacyFailedRequests, [], 'privacy page should not have failed requests');
    await privacyPage.close();

    assert.deepEqual(pageErrors, [], 'the browser should not emit uncaught JavaScript errors');
    assert.deepEqual(browserConsoleErrors, [], 'the browser should not emit console errors');
    assert.deepEqual(failedRequests, [], 'the browser should not have failed requests');
    console.log('Browser smoke passed: CT navigation, synchronized tri-planar review, recall, local progress capture/reset, and responsive mobile layout.');
  } finally {
    await browser.close();
  }
})().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
