(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var Core = window.CTMaskCorrectionCore;
  var canvas = $('correction-canvas');
  var ctx = canvas && canvas.getContext('2d', { willReadFrequently: true });
  if (!canvas || !ctx || !Core) return;

  var DIMS = [256, 256, 113];
  var DB_NAME = 'ct-edu-segmentor-correction-v1';
  var DB_STORE = 'drafts';
  var state = {
    language: document.documentElement.lang === 'en' ? 'en' : 'fa',
    manifest: null,
    signature: null,
    draftId: null,
    dimensions: DIMS.slice(),
    spacingMm: null,
    plane: 'axial',
    index: 26,
    indices: { axial: 26, coronal: 127, sagittal: 127 },
    organs: [],
    organById: Object.create(null),
    labelMap: null,
    activeOrganId: null,
    mode: 'paint',
    brushRadiusMm: 3,
    opacity: 0.78,
    visible: Object.create(null),
    db: null,
    draftStorageAvailable: false,
    editedOverrides: Object.create(null),
    undoStack: [],
    redoStack: [],
    stroke: null,
    cursorPixel: null,
    renderRequest: 0,
    renderFrame: null,
    cursorFrame: null,
    renderedImageData: null,
    imageCache: new Map(),
    loaded: false,
    saving: false
  };

  function t(fa, en) { return state.language === 'fa' ? fa : en; }
  function digits(value) {
    return state.language === 'fa'
      ? String(value).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[Number(d)]; })
      : String(value);
  }
  function setText(id, fa, en) { $(id).textContent = t(fa, en); }
  function setStatus(fa, en) { $('correction-status').textContent = t(fa, en); }
  function setDraftStatus(fa, en) { $('correction-draft-state').textContent = t(fa, en); }
  function pad(index) { return String(index).padStart(3, '0'); }
  function setBusy(messageFa, messageEn) {
    var panel = $('correction-canvas-state');
    panel.hidden = false;
    panel.replaceChildren();
    if (!messageFa && !messageEn) {
      var spinner = document.createElement('span');
      spinner.className = 'correction-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      panel.appendChild(spinner);
    }
    var strong = document.createElement('strong');
    strong.textContent = t(messageFa || 'در حال بارگذاری حجم…', messageEn || 'Loading volume…');
    panel.appendChild(strong);
  }
  function hideBusy() { $('correction-canvas-state').hidden = true; }

  function requestPromise(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('IndexedDB request failed.')); };
    });
  }
  function openDraftDatabase() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB is not available in this browser.'));
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        var database = request.result;
        if (!database.objectStoreNames.contains(DB_STORE)) database.createObjectStore(DB_STORE, { keyPath: 'id' });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('Could not open IndexedDB.')); };
      request.onblocked = function () { reject(new Error('Draft database upgrade is blocked by another tab.')); };
    });
  }
  async function readDraftRecord(id) {
    if (!state.db) return null;
    var transaction = state.db.transaction(DB_STORE, 'readonly');
    return requestPromise(transaction.objectStore(DB_STORE).get(id));
  }
  async function writeDraftRecord(record) {
    if (!state.db) throw new Error('Local draft storage is not available.');
    var transaction = state.db.transaction(DB_STORE, 'readwrite');
    var store = transaction.objectStore(DB_STORE);
    await requestPromise(store.put(record));
    return new Promise(function (resolve, reject) {
      transaction.oncomplete = function () { resolve(); };
      transaction.onerror = function () { reject(transaction.error || new Error('Draft write failed.')); };
      transaction.onabort = function () { reject(transaction.error || new Error('Draft write was aborted.')); };
    });
  }
  async function deleteDraftRecord(id) {
    if (!state.db) throw new Error('Local draft storage is not available.');
    var transaction = state.db.transaction(DB_STORE, 'readwrite');
    var store = transaction.objectStore(DB_STORE);
    await requestPromise(store.delete(id));
    return new Promise(function (resolve, reject) {
      transaction.oncomplete = function () { resolve(); };
      transaction.onerror = function () { reject(transaction.error || new Error('Draft deletion failed.')); };
      transaction.onabort = function () { reject(transaction.error || new Error('Draft deletion was aborted.')); };
    });
  }

  async function decompressGzip(buffer) {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('This browser cannot decompress gzip streams. Use a current Chrome, Edge, Firefox or Safari build to edit 3D masks.');
    }
    var stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  }
  async function compressGzip(bytes) {
    if (typeof CompressionStream !== 'function') {
      throw new Error('This browser cannot gzip NIfTI exports. Update the browser or export from a compatible desktop browser.');
    }
    var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  }
  async function fetchVolume(fileName, maxLabel) {
    if (!/^[a-z0-9_-]+\.nii\.gz$/i.test(String(fileName || ''))) {
      throw new Error('Invalid NIfTI asset name in the segmentation manifest.');
    }
    var response = await fetch('./assets/organ-predictions/' + encodeURIComponent(fileName), { cache: 'no-cache' });
    if (!response.ok) throw new Error('Could not load mask volume: ' + fileName + ' (HTTP ' + response.status + ').');
    var compressed = await response.arrayBuffer();
    if (compressed.byteLength < 2 || new Uint8Array(compressed, 0, 2)[0] !== 31 ||
        new Uint8Array(compressed, 0, 2)[1] !== 139) {
      throw new Error('Mask asset is not gzip-compressed: ' + fileName);
    }
    var uncompressed = await decompressGzip(compressed);
    var parsed = Core.parseNifti(uncompressed, {
      dimensionsXYZ: state.dimensions,
      affineRAS: state.manifest.affineRAS
    }, { maxLabel: maxLabel });
    return {
      fileName: fileName,
      headerPrefix: parsed.headerPrefix,
      base: Uint8Array.from(parsed.baseVoxels),
      data: Uint8Array.from(parsed.baseVoxels),
      spacingMm: parsed.spacingMm,
      voxelCount: parsed.voxelCount
    };
  }
  async function makeSourceSignature(manifest) {
    var canonical = JSON.stringify({
      schemaVersion: manifest.schemaVersion,
      sourceDataset: manifest.sourceDataset,
      sourceDimensionsXYZ: manifest.sourceDimensionsXYZ,
      affineRAS: manifest.affineRAS,
      sourceInputHashes: manifest.sourceInputHashes || null,
      model: manifest.model,
      organs: manifest.organs.map(function (organ) {
        return { id: organ.id, maskVolumeFile: organ.maskVolumeFile, volumeLabelId: organ.volumeLabelId };
      }),
      combinedLabelMap: manifest.labelMap && manifest.labelMap.file
    });
    if (window.crypto && window.crypto.subtle && typeof TextEncoder === 'function') {
      var digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
      return Array.from(new Uint8Array(digest)).map(function (value) { return value.toString(16).padStart(2, '0'); }).join('');
    }
    return canonical;
  }
  function validateManifest(manifest) {
    if (!manifest || manifest.schemaVersion !== 1 || manifest.status !== 'experimental-unreviewed' ||
        !Array.isArray(manifest.sourceDimensionsXYZ) || manifest.sourceDimensionsXYZ.join(',') !== DIMS.join(',') ||
        !Array.isArray(manifest.affineRAS) || manifest.affineRAS.length !== 4 ||
        !Array.isArray(manifest.organs) || manifest.organs.length !== 4 ||
        !manifest.labelMap || typeof manifest.labelMap.file !== 'string') {
      throw new Error('The experimental mask manifest is missing required schema or geometry metadata.');
    }
    var ids = new Set();
    var labels = new Set();
    manifest.organs.forEach(function (organ) {
      if (!organ || !/^[a-z0-9_-]+$/i.test(String(organ.id || '')) ||
          !/^[a-z0-9_-]+\.nii\.gz$/i.test(String(organ.maskVolumeFile || '')) ||
          !Number.isInteger(organ.volumeLabelId) || organ.volumeLabelId < 1 || organ.volumeLabelId > 4 ||
          ids.has(organ.id) || labels.has(organ.volumeLabelId)) {
        throw new Error('Invalid or duplicate organ identity in the mask manifest.');
      }
      ids.add(organ.id);
      labels.add(organ.volumeLabelId);
    });
    if (!/^[a-z0-9_-]+\.nii\.gz$/i.test(manifest.labelMap.file)) {
      throw new Error('Invalid combined label-map filename in the manifest.');
    }
  }

  function normaliseStoredEdits(entries, organ) {
    if (!Array.isArray(entries)) throw new Error('Stored draft edits are malformed for ' + organ.id + '.');
    var overrides = new Map();
    entries.forEach(function (entry) {
      if (!Array.isArray(entry) || entry.length !== 2) throw new Error('Stored draft entry has an invalid shape.');
      var index = Number(entry[0]), value = Number(entry[1]);
      if (!Number.isSafeInteger(index) || index < 0 || index >= organ.data.length ||
          (value !== 0 && value !== 1)) throw new Error('Stored draft contains an invalid voxel index or label value.');
      if (organ.base[index] !== value) overrides.set(index, value);
      organ.data[index] = value;
    });
    return overrides;
  }
  async function restoreDraft() {
    if (!state.db) return;
    var record = await readDraftRecord(state.draftId);
    if (!record) {
      setDraftStatus('پیش‌نویس محلی وجود ندارد؛ پیش‌بینی اولیه بدون تغییر است.', 'No local draft exists; original model predictions are unchanged.');
      return;
    }
    if (record.schemaVersion !== 1 || record.sourceSignature !== state.signature || !record.edits || typeof record.edits !== 'object') {
      throw new Error('Stored draft schema or source identity does not match the loaded model output.');
    }
    state.organs.forEach(function (organ) {
      var entries = record.edits[organ.id] || [];
      state.editedOverrides[organ.id] = normaliseStoredEdits(entries, organ);
    });
    setDraftStatus(
      'پیش‌نویس محلی بازیابی شد؛ آخرین ذخیره: ' + String(record.updatedAt || 'زمان نامشخص') + ' (تأییدنشده).',
      'Local draft restored; last saved: ' + String(record.updatedAt || 'time unknown') + ' (unreviewed).'
    );
  }
  function countOverrides() {
    return state.organs.reduce(function (sum, organ) {
      return sum + (state.editedOverrides[organ.id] ? state.editedOverrides[organ.id].size : 0);
    }, 0);
  }
  function draftRecord() {
    var edits = Object.create(null);
    state.organs.forEach(function (organ) {
      var map = state.editedOverrides[organ.id] || new Map();
      edits[organ.id] = Array.from(map.entries()).sort(function (a, b) { return a[0] - b[0]; });
    });
    return {
      id: state.draftId,
      schemaVersion: 1,
      sourceSignature: state.signature,
      status: 'local-unreviewed-draft',
      updatedAt: new Date().toISOString(),
      edits: edits
    };
  }
  async function saveDraft() {
    if (!state.loaded || !state.db || state.saving) return;
    state.saving = true;
    $('correction-save-draft').disabled = true;
    try {
      var count = countOverrides();
      if (count === 0) {
        await deleteDraftRecord(state.draftId);
        setDraftStatus('هیچ وکسلی تغییر نکرده است؛ پیش‌نویس ذخیره‌شده‌ای باقی نماند.', 'No voxels are edited; there is no stored draft to keep.');
      } else {
        var record = draftRecord();
        await writeDraftRecord(record);
        setDraftStatus(
          digits(count) + ' وکسل اصلاح‌شده در IndexedDB همین مرورگر ذخیره شد؛ بازبینی نشده است.',
          count + ' edited voxels saved in this browser’s IndexedDB; not reviewed.'
        );
      }
    } catch (error) {
      setDraftStatus(
        'ذخیرهٔ محلی ناموفق بود؛ تغییرات فعلی فقط در حافظهٔ همین صفحه هستند. ' + String(error.message || error),
        'Local save failed; current edits exist only in this page’s memory. ' + String(error.message || error)
      );
    } finally {
      state.saving = false;
      updateButtons();
    }
  }
  function updateOneVoxel(organ, offset, value) {
    organ.data[offset] = value;
    var overrides = state.editedOverrides[organ.id];
    if (!overrides) overrides = state.editedOverrides[organ.id] = new Map();
    if (value === organ.base[offset]) overrides.delete(offset);
    else overrides.set(offset, value);
  }

  function currentPlaneGeometry() {
    return Core.planeGeometry(state.plane, state.dimensions, state.spacingMm);
  }
  function updateCanvasSize() {
    var geometry = currentPlaneGeometry();
    var wrap = $('correction-canvas-wrap');
    var maxWidth = Math.max(100, wrap.clientWidth - 20);
    var maxHeight = Math.max(100, Math.min(window.innerHeight * 0.64, 760));
    var aspect = (geometry.width * geometry.spacingX) / (geometry.height * geometry.spacingY);
    var displayWidth = Math.min(maxWidth, maxHeight * aspect);
    var displayHeight = displayWidth / aspect;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
  }
  function updatePosition() {
    if (!state.spacingMm) {
      updateButtons();
      return;
    }
    var geometry = currentPlaneGeometry();
    state.index = Math.max(0, Math.min(geometry.width === 0 ? 0 : state.indices[state.plane],
      (state.plane === 'axial' ? state.dimensions[2] : state.plane === 'coronal' ? state.dimensions[1] : state.dimensions[0]) - 1));
    state.indices[state.plane] = state.index;
    var count = state.plane === 'axial' ? state.dimensions[2] :
      state.plane === 'coronal' ? state.dimensions[1] : state.dimensions[0];
    var label = digits(state.index + 1) + ' / ' + digits(count);
    $('correction-position').textContent = label;
    $('correction-slice-value').textContent = label;
    $('correction-slice-slider').max = String(count);
    $('correction-slice-slider').value = String(state.index + 1);
    $('correction-prev').disabled = !state.loaded || state.index <= 0;
    $('correction-next').disabled = !state.loaded || state.index >= count - 1;
    var planeText = {
      axial: { fa: 'نمای محوری', en: 'Axial view' },
      coronal: { fa: 'نمای کرونال', en: 'Coronal view' },
      sagittal: { fa: 'نمای ساژیتال', en: 'Sagittal view' }
    }[state.plane];
    $('correction-plane-title').textContent = t(planeText.fa, planeText.en);
    document.querySelectorAll('[data-plane]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.plane === state.plane));
    });
    $('correction-slice-slider').disabled = !state.loaded;
    canvas.setAttribute('aria-label', t(
      planeText.fa + '، برش ' + (state.index + 1) + ' از ' + count + '، ویرایش ماسک پیش‌بینی‌نشده',
      planeText.en + ', slice ' + (state.index + 1) + ' of ' + count + ', editing unreviewed mask'
    ));
    updateCoordinateReadout();
    updateCanvasSize();
  }
  function updateCoordinateReadout() {
    var i = state.indices.sagittal + 1;
    var j = state.indices.coronal + 1;
    var k = state.indices.axial + 1;
    $('correction-coordinate-readout').textContent = t(
      'مختصات وکسل (i، j، k؛ شمارش از ۱): (' + digits(i) + '، ' + digits(j) + '، ' + digits(k) + ')',
      'Voxel coordinates (1-based i, j, k): (' + i + ', ' + j + ', ' + k + ')'
    );
  }
  function updateBrushLabel() {
    $('correction-brush-value').textContent = digits(state.brushRadiusMm) + ' mm';
  }
  function updateButtons() {
    var canEdit = state.loaded && !state.saving;
    $('correction-active-organ').disabled = !canEdit;
    document.querySelectorAll('[data-mode]').forEach(function (button) {
      button.disabled = !canEdit;
      button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
    });
    $('correction-brush-radius').disabled = !canEdit;
    $('correction-undo').disabled = !canEdit || state.undoStack.length === 0 || Boolean(state.stroke);
    $('correction-redo').disabled = !canEdit || state.redoStack.length === 0 || Boolean(state.stroke);
    $('correction-cancel-stroke').disabled = !state.stroke;
    $('correction-save-draft').disabled = !canEdit || !state.draftStorageAvailable || Boolean(state.stroke);
    $('correction-reset-draft').disabled = !canEdit || Boolean(state.stroke);
    $('correction-export-organ').disabled = !state.loaded || Boolean(state.stroke);
    $('correction-export-combined').disabled = !state.loaded || Boolean(state.stroke);
    $('correction-prev').disabled = !state.loaded || state.index <= 0;
    var count = state.plane === 'axial' ? state.dimensions[2] :
      state.plane === 'coronal' ? state.dimensions[1] : state.dimensions[0];
    $('correction-next').disabled = !state.loaded || state.index >= count - 1;
  }
  function renderOrganControls() {
    var select = $('correction-active-organ');
    select.replaceChildren();
    var visibility = $('correction-visibility-list');
    visibility.replaceChildren();
    state.organs.forEach(function (organ) {
      var option = document.createElement('option');
      option.value = organ.id;
      option.textContent = state.language === 'fa' ? organ.nameFa : organ.nameEn;
      select.appendChild(option);

      var label = document.createElement('label');
      label.className = 'correction-visibility-row';
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.visible[organ.id] !== false;
      checkbox.setAttribute('aria-label', t(organ.nameFa, organ.nameEn));
      checkbox.addEventListener('change', function () {
        state.visible[organ.id] = checkbox.checked;
        renderSlice(false);
      });
      var chip = document.createElement('span');
      chip.className = 'correction-color-chip';
      chip.style.setProperty('--organ-color', organ.color);
      chip.setAttribute('aria-hidden', 'true');
      var name = document.createElement('span');
      name.textContent = t(organ.nameFa, organ.nameEn);
      label.append(checkbox, chip, name);
      if (organ.id === state.activeOrganId) {
        var activeTag = document.createElement('span');
        activeTag.className = 'active-tag';
        activeTag.textContent = t('فعال', 'EDITING');
        label.appendChild(activeTag);
      }
      visibility.appendChild(label);
    });
    if (state.activeOrganId) select.value = state.activeOrganId;
  }
  function updateActiveOrgan() {
    renderOrganControls();
    updateButtons();
    renderSlice(false);
  }
  function loadImage(url) {
    if (state.imageCache.has(url)) return state.imageCache.get(url);
    var promise = new Promise(function (resolve, reject) {
      var image = new Image();
      image.referrerPolicy = 'no-referrer';
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error('Could not load CT slice asset: ' + url)); };
      image.src = url;
    });
    state.imageCache.set(url, promise);
    if (state.imageCache.size > 32) {
      var keep = new Set([url]);
      state.imageCache.forEach(function (_, key) { if (keep.size < 24) keep.add(key); });
      state.imageCache.forEach(function (_, key) { if (!keep.has(key)) state.imageCache.delete(key); });
    }
    return promise;
  }
  function hexRgb(hex) {
    var value = String(hex || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(value)) return [150, 170, 180];
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
  }
  function isBoundary(data, voxel) {
    var d = state.dimensions;
    var x = voxel.x, y = voxel.y, z = voxel.z, offset = voxel.offset;
    var value = data[offset];
    if (x === 0 || x === d[0] - 1 || y === 0 || y === d[1] - 1 || z === 0 || z === d[2] - 1) return true;
    return data[offset - 1] !== value || data[offset + 1] !== value ||
      data[offset - d[0]] !== value || data[offset + d[0]] !== value ||
      data[offset - d[0] * d[1]] !== value || data[offset + d[0] * d[1]] !== value;
  }
  function drawCrosshair(width, height) {
    var x, y, d = state.dimensions;
    if (state.plane === 'axial') {
      x = state.indices.sagittal;
      y = d[1] - 1 - state.indices.coronal;
    } else if (state.plane === 'coronal') {
      x = state.indices.sagittal;
      y = state.indices.axial;
    } else {
      x = d[1] - 1 - state.indices.coronal;
      y = state.indices.axial;
    }
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x + .5, 0);
    ctx.lineTo(x + .5, height);
    ctx.moveTo(0, y + .5);
    ctx.lineTo(width, y + .5);
    ctx.stroke();
    ctx.restore();
  }
  function drawBrushCursor(width, height) {
    if (!state.cursorPixel) return;
    var geometry = currentPlaneGeometry();
    var radiusX = state.brushRadiusMm / geometry.spacingX;
    var radiusY = state.brushRadiusMm / geometry.spacingY;
    ctx.save();
    ctx.strokeStyle = state.mode === 'paint' ? 'rgba(255,255,255,.95)' : 'rgba(255,185,160,.95)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.ellipse(state.cursorPixel.x + .5, state.cursorPixel.y + .5, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  async function renderSlice(showLoading) {
    if (!state.loaded) return;
    var request = ++state.renderRequest;
    if (showLoading) setBusy();
    updatePosition();
    var plane = state.plane;
    var index = state.index;
    var geometry = currentPlaneGeometry();
    var folder = plane === 'axial' ? 'slices' : plane;
    var ctUrl = '../assets/spl-abdominal-demo/' + folder + '/ct-' + pad(index) + '.png';
    try {
      var image = await loadImage(ctUrl);
      if (request !== state.renderRequest) return;
      if (image.naturalWidth !== geometry.width || image.naturalHeight !== geometry.height) {
        throw new Error('CT slice dimensions do not match NIfTI geometry in ' + plane + ' plane.');
      }
      canvas.width = geometry.width;
      canvas.height = geometry.height;
      updateCanvasSize();
      ctx.clearRect(0, 0, geometry.width, geometry.height);
      ctx.drawImage(image, 0, 0, geometry.width, geometry.height);
      var composite = ctx.getImageData(0, 0, geometry.width, geometry.height);
      var colors = state.organs.map(function (organ) { return { organ: organ, rgb: hexRgb(organ.color) }; });
      for (var py = 0; py < geometry.height; py += 1) {
        for (var px = 0; px < geometry.width; px += 1) {
          var voxel = Core.voxelFromPlanePixel(plane, index, px, py, state.dimensions);
          if (!voxel) continue;
          var pixelOffset = (py * geometry.width + px) * 4;
          for (var oi = 0; oi < colors.length; oi += 1) {
            var entry = colors[oi];
            if (state.visible[entry.organ.id] === false || entry.organ.data[voxel.offset] === 0) continue;
            var edge = isBoundary(entry.organ.data, voxel);
            var alpha = state.opacity * (edge ? .93 : .26);
            var rgb = entry.rgb;
            var pixelData = composite.data;
            pixelData[pixelOffset] = Math.round(pixelData[pixelOffset] * (1 - alpha) + rgb[0] * alpha);
            pixelData[pixelOffset + 1] = Math.round(pixelData[pixelOffset + 1] * (1 - alpha) + rgb[1] * alpha);
            pixelData[pixelOffset + 2] = Math.round(pixelData[pixelOffset + 2] * (1 - alpha) + rgb[2] * alpha);
          }
        }
      }
      if (request !== state.renderRequest) return;
      ctx.putImageData(composite, 0, 0);
      state.renderedImageData = ctx.getImageData(0, 0, geometry.width, geometry.height);
      drawCrosshair(geometry.width, geometry.height);
      drawBrushCursor(geometry.width, geometry.height);
      hideBusy();
      var planeLabel = { axial: { fa: 'محوری', en: 'axial' }, coronal: { fa: 'کرونال', en: 'coronal' }, sagittal: { fa: 'ساژیتال', en: 'sagittal' } }[plane];
      setStatus(
        'صفحهٔ ' + planeLabel.fa + ' · برش ' + digits(index + 1) + ' از ' + digits(plane === 'axial' ? DIMS[2] : plane === 'coronal' ? DIMS[1] : DIMS[0]) + ' · پیش‌نویس محلی و بازبینی‌نشده.',
        planeLabel.en + ' plane · slice ' + (index + 1) + ' · local unreviewed draft.'
      );
    } catch (error) {
      if (request !== state.renderRequest) return;
      setBusy('بارگذاری صفحه یا ماسک ناموفق بود؛ هیچ تصویر جایگزینی نمایش داده نمی‌شود.', 'Could not load the CT slice or mask; no substitute image is displayed.');
      setStatus('خطای نمایش: ' + String(error.message || error), 'Render error: ' + String(error.message || error));
    }
  }

  function redrawCursorLayer() {
    if (!state.renderedImageData || !state.loaded || state.stroke) return;
    ctx.putImageData(state.renderedImageData, 0, 0);
    drawCrosshair(canvas.width, canvas.height);
    drawBrushCursor(canvas.width, canvas.height);
  }
  function scheduleMaskRender() {
    if (state.renderFrame !== null) return;
    state.renderFrame = window.requestAnimationFrame(function () {
      state.renderFrame = null;
      renderSlice(false);
    });
  }
  function scheduleCursorRender() {
    if (state.cursorFrame !== null) return;
    state.cursorFrame = window.requestAnimationFrame(function () {
      state.cursorFrame = null;
      redrawCursorLayer();
    });
  }

  function pixelFromPointer(event) {
    var rect = canvas.getBoundingClientRect();
    var x = Math.floor((event.clientX - rect.left) / rect.width * canvas.width);
    var y = Math.floor((event.clientY - rect.top) / rect.height * canvas.height);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
    return { x: x, y: y };
  }
  function paintAt(pixel) {
    if (!state.stroke || !pixel || !state.activeOrganId) return false;
    var organ = state.organById[state.activeOrganId];
    var offsets = Core.brushVoxelOffsets(state.plane, state.index, pixel.x, pixel.y,
      state.brushRadiusMm, state.dimensions, state.spacingMm);
    var target = state.mode === 'erase' ? 0 : 1;
    var changed = false;
    offsets.forEach(function (offset) {
      var before = organ.data[offset];
      if (before === target) return;
      var existing = state.stroke.changes.get(offset);
      if (!existing) state.stroke.changes.set(offset, { before: before, after: target });
      else existing.after = target;
      updateOneVoxel(organ, offset, target);
      changed = true;
    });
    var centerVoxel = Core.voxelFromPlanePixel(state.plane, state.index, pixel.x, pixel.y, state.dimensions);
    if (centerVoxel) {
      state.indices.axial = centerVoxel.z;
      state.indices.coronal = centerVoxel.y;
      state.indices.sagittal = centerVoxel.x;
      updateCoordinateReadout();
    }
    return changed;
  }
  function startStroke(event) {
    if (!state.loaded || state.stroke || event.button !== 0) return;
    var pixel = pixelFromPointer(event);
    if (!pixel) return;
    state.stroke = { organId: state.activeOrganId, changes: new Map(), mode: state.mode, startedAt: new Date().toISOString() };
    state.cursorPixel = pixel;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    paintAt(pixel);
    renderSlice(false);
    updateButtons();
  }
  async function finishStroke() {
    if (!state.stroke) return;
    var stroke = state.stroke;
    state.stroke = null;
    var organ = state.organById[stroke.organId];
    var changes = Array.from(stroke.changes.entries())
      .filter(function (entry) { return entry[1].before !== entry[1].after; })
      .map(function (entry) { return { offset: entry[0], before: entry[1].before, after: entry[1].after }; });
    if (changes.length) {
      state.undoStack.push({ organId: stroke.organId, changes: changes, mode: stroke.mode, createdAt: stroke.startedAt });
      if (state.undoStack.length > 50) state.undoStack.shift();
      state.redoStack = [];
      setDraftStatus(
        'تغییرات در حافظه هستند؛ در حال ذخیرهٔ پیش‌نویس محلی…',
        'Changes are in memory; saving local draft…'
      );
      await saveDraft();
    }
    updateButtons();
    renderSlice(false);
  }
  function cancelStroke() {
    if (!state.stroke) return;
    var stroke = state.stroke;
    var organ = state.organById[stroke.organId];
    stroke.changes.forEach(function (change, offset) { updateOneVoxel(organ, offset, change.before); });
    state.stroke = null;
    state.cursorPixel = null;
    setDraftStatus('حرکت جاری لغو شد و وکسل‌های آن به وضعیت پیش از حرکت برگشتند.', 'Current stroke cancelled and its voxels restored to the pre-stroke state.');
    updateButtons();
    renderSlice(false);
  }
  function applyHistory(history, property) {
    var organ = state.organById[history.organId];
    history.changes.forEach(function (change) {
      updateOneVoxel(organ, change.offset, change[property]);
    });
  }
  function undo() {
    if (!state.undoStack.length || state.stroke) return;
    var item = state.undoStack.pop();
    applyHistory(item, 'before');
    state.redoStack.push(item);
    updateButtons();
    renderSlice(false);
    saveDraft();
  }
  function redo() {
    if (!state.redoStack.length || state.stroke) return;
    var item = state.redoStack.pop();
    applyHistory(item, 'after');
    state.undoStack.push(item);
    updateButtons();
    renderSlice(false);
    saveDraft();
  }

  function downloadBlob(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }
  async function exportNifti(headerPrefix, voxelData, fileName) {
    setDraftStatus('در حال آماده‌سازی فایل NIfTI فشرده…', 'Preparing compressed NIfTI export…');
    try {
      var bytes = Core.serializeNifti(headerPrefix, voxelData);
      var compressed = await compressGzip(bytes);
      downloadBlob(new Blob([compressed], { type: 'application/gzip' }), fileName);
      setDraftStatus(
        'خروجی ساخته شد: ' + fileName + ' · فایل خروجی بازبینی یا تأیید نشده است.',
        'Export created: ' + fileName + ' · the exported file is not reviewed or approved.'
      );
    } catch (error) {
      setDraftStatus('ساخت خروجی ناموفق بود: ' + String(error.message || error), 'Export failed: ' + String(error.message || error));
    }
  }
  function exportActiveOrgan() {
    var organ = state.organById[state.activeOrganId];
    if (!organ || state.stroke) return;
    exportNifti(organ.headerPrefix, organ.data, organ.id + '-corrected-draft.nii.gz');
  }
  function exportCombined() {
    if (!state.labelMap || state.stroke) return;
    var voxelCount = state.labelMap.voxelCount;
    var combined = new Uint8Array(voxelCount);
    var occupancy = new Uint8Array(voxelCount);
    var overlapVoxelCount = 0;
    state.organs.forEach(function (organ) {
      for (var i = 0; i < voxelCount; i += 1) {
        if (organ.data[i] === 0) continue;
        if (occupancy[i] === 1) overlapVoxelCount += 1;
        if (occupancy[i] < 255) occupancy[i] += 1;
        combined[i] = organ.volumeLabelId;
      }
    });
    setDraftStatus(
      'نقشهٔ ترکیبی با اولویت ترتیب اندام‌ها ساخته می‌شود؛ وکسل‌های هم‌پوشان: ' + digits(overlapVoxelCount) + '.',
      'Building combined map with organ-order precedence; overlapping voxels: ' + overlapVoxelCount + '.'
    );
    exportNifti(state.labelMap.headerPrefix, combined, 'major-organ-labelmap-corrected-draft.nii.gz');
  }
  async function discardDraft() {
    if (!state.loaded || state.stroke) return;
    var message = t(
      'تمام اصلاحات محلی این حجم حذف و ماسک‌های اصلی در این صفحه بازیابی شوند؟ این عمل قابل بازگشت نیست.',
      'Discard every local correction for this volume and restore the original masks in this page? This cannot be undone.'
    );
    if (!window.confirm(message)) return;
    state.organs.forEach(function (organ) {
      organ.data.set(organ.base);
      state.editedOverrides[organ.id] = new Map();
    });
    state.undoStack = [];
    state.redoStack = [];
    try {
      if (state.db) await deleteDraftRecord(state.draftId);
      setDraftStatus('تمام اصلاحات محلی حذف شد؛ ماسک‌های اولیه دست‌نخورده باقی ماندند.', 'All local edits discarded; original prediction assets remain untouched.');
    } catch (error) {
      setDraftStatus('ماسک‌های اولیه در حافظه بازیابی شدند اما حذف رکورد ذخیره‌شده ناموفق بود: ' + String(error.message || error),
        'Original masks restored in memory, but stored-draft deletion failed: ' + String(error.message || error));
    }
    updateButtons();
    renderSlice(false);
  }

  function setLanguage(next) {
    state.language = next === 'en' ? 'en' : 'fa';
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === 'fa' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-fa', state.language === 'fa');
    document.body.classList.toggle('lang-en', state.language === 'en');
    $('correction-language-toggle').textContent = state.language === 'fa' ? 'EN ↔ فا' : 'فا ↔ EN';
    $('correction-language-toggle').setAttribute('aria-label', t('تغییر زبان به انگلیسی', 'Switch language to Persian'));
    renderOrganControls();
    updateBrushLabel();
    updateCoordinateReadout();
    updatePosition();
    renderSlice(false);
  }

  async function initialise() {
    try {
      var response = await fetch('./assets/organ-predictions/manifest.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('The experimental segmentation manifest is not available.');
      var manifest = await response.json();
      validateManifest(manifest);
      state.manifest = manifest;
      state.signature = await makeSourceSignature(manifest);
      state.draftId = 'spl-atlas-mask-correction-v1:' + state.signature;
      var loadedVolumes = await Promise.all(manifest.organs.map(async function (organ) {
        var volume = await fetchVolume(organ.maskVolumeFile, 1);
        volume.id = organ.id;
        volume.nameFa = String(organ.nameFa || organ.id);
        volume.nameEn = String(organ.nameEn || organ.id);
        volume.color = String(organ.color || '#7c98a8');
        volume.volumeLabelId = organ.volumeLabelId;
        volume.metadata = organ;
        return volume;
      }));
      var combined = await fetchVolume(manifest.labelMap.file, 4);
      state.spacingMm = loadedVolumes[0].spacingMm;
      loadedVolumes.forEach(function (organ) {
        if (organ.voxelCount !== combined.voxelCount ||
            organ.spacingMm.some(function (value, index) { return Math.abs(value - combined.spacingMm[index]) > 1e-5; })) {
          throw new Error('Organ masks do not share the combined label-map geometry.');
        }
        state.organs.push(organ);
        state.organById[organ.id] = organ;
        state.visible[organ.id] = true;
        state.editedOverrides[organ.id] = new Map();
      });
      state.labelMap = combined;
      state.activeOrganId = state.organs[0].id;
      state.loaded = true;
      try {
        state.db = await openDraftDatabase();
        state.draftStorageAvailable = true;
        await restoreDraft();
      } catch (draftError) {
        state.draftStorageAvailable = false;
        setDraftStatus(
          'ذخیره‌سازی محلی آماده نیست؛ تغییرات در حافظه می‌مانند و با بستن صفحه از بین می‌روند. ' + String(draftError.message || draftError),
          'Local persistence is unavailable; edits remain in memory and will be lost when this page closes. ' + String(draftError.message || draftError)
        );
      }
      renderOrganControls();
      updateBrushLabel();
      updateButtons();
      updatePosition();
      setBusy('حجم‌ها بررسی شدند؛ در حال آماده‌سازی برش…', 'Volumes validated; preparing current slice…');
      await renderSlice(false);
      updateButtons();
      if (typeof CompressionStream !== 'function') {
        $('correction-export-organ').disabled = true;
        $('correction-export-combined').disabled = true;
        setDraftStatus('این مرورگر خروجی gzip نمی‌سازد؛ ویرایش محلی همچنان ممکن است.', 'This browser cannot create gzip exports; local editing remains available.');
      }
    } catch (error) {
      state.loaded = false;
      setBusy('حجم معتبر در دسترس نیست؛ ویرایش غیرفعال شد.', 'A valid volume is unavailable; editing is disabled.');
      setStatus('بارگذاری ناموفق بود: ' + String(error.message || error), 'Load failed: ' + String(error.message || error));
      setDraftStatus('هیچ پیش‌نویسی بارگذاری یا ذخیره نشد.', 'No draft was loaded or saved.');
      updateButtons();
    }
  }

  $('correction-language-toggle').addEventListener('click', function () {
    setLanguage(state.language === 'fa' ? 'en' : 'fa');
  });
  document.querySelectorAll('[data-plane]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (!state.loaded || state.stroke || !['axial', 'coronal', 'sagittal'].includes(button.dataset.plane)) return;
      state.plane = button.dataset.plane;
      state.index = state.indices[state.plane];
      state.cursorPixel = null;
      state.renderedImageData = null;
      updatePosition();
      renderSlice(true);
    });
  });
  $('correction-prev').addEventListener('click', function () {
    if (!state.loaded || state.stroke) return;
    state.index = Math.max(0, state.index - 1);
    state.indices[state.plane] = state.index;
    updatePosition();
    renderSlice(true);
  });
  $('correction-next').addEventListener('click', function () {
    if (!state.loaded || state.stroke) return;
    var count = state.plane === 'axial' ? state.dimensions[2] : state.plane === 'coronal' ? state.dimensions[1] : state.dimensions[0];
    state.index = Math.min(count - 1, state.index + 1);
    state.indices[state.plane] = state.index;
    updatePosition();
    renderSlice(true);
  });
  $('correction-reset-view').addEventListener('click', function () {
    state.indices = { axial: 26, coronal: 127, sagittal: 127 };
    state.index = state.indices[state.plane];
    state.cursorPixel = null;
    updatePosition();
    renderSlice(true);
  });
  $('correction-slice-slider').addEventListener('input', function () {
    if (!state.loaded || state.stroke) return;
    state.index = Math.max(0, Number(this.value) - 1);
    state.indices[state.plane] = state.index;
    updatePosition();
    renderSlice(false);
  });
  $('correction-active-organ').addEventListener('change', function () {
    if (!state.loaded || state.stroke || !state.organById[this.value]) return;
    state.activeOrganId = this.value;
    renderOrganControls();
    renderSlice(false);
  });
  document.querySelectorAll('[data-mode]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (!state.loaded || state.stroke) return;
      state.mode = button.dataset.mode === 'erase' ? 'erase' : 'paint';
      document.querySelectorAll('[data-mode]').forEach(function (candidate) {
        candidate.setAttribute('aria-pressed', String(candidate.dataset.mode === state.mode));
      });
      renderSlice(false);
    });
  });
  $('correction-brush-radius').addEventListener('input', function () {
    state.brushRadiusMm = Math.max(1, Math.min(12, Number(this.value)));
    updateBrushLabel();
    renderSlice(false);
  });
  $('correction-undo').addEventListener('click', undo);
  $('correction-redo').addEventListener('click', redo);
  $('correction-cancel-stroke').addEventListener('click', cancelStroke);
  $('correction-save-draft').addEventListener('click', saveDraft);
  $('correction-reset-draft').addEventListener('click', discardDraft);
  $('correction-export-organ').addEventListener('click', exportActiveOrgan);
  $('correction-export-combined').addEventListener('click', exportCombined);
  canvas.addEventListener('pointerdown', startStroke);
  canvas.addEventListener('pointermove', function (event) {
    var pixel = pixelFromPointer(event);
    state.cursorPixel = pixel;
    if (state.stroke) {
      paintAt(pixel);
      scheduleMaskRender();
    } else {
      scheduleCursorRender();
    }
  });
  canvas.addEventListener('pointerup', function () { finishStroke(); });
  canvas.addEventListener('pointercancel', cancelStroke);
  canvas.addEventListener('lostpointercapture', function () {
    if (state.stroke) cancelStroke();
  });
  canvas.addEventListener('pointerleave', function () {
    if (!state.stroke) {
      state.cursorPixel = null;
      scheduleCursorRender();
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && state.stroke) {
      event.preventDefault();
      cancelStroke();
      return;
    }
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
      event.preventDefault();
      redo();
    }
  });
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(function () { if (state.loaded) updateCanvasSize(); }).observe($('correction-canvas-wrap'));
  } else {
    window.addEventListener('resize', function () { if (state.loaded) updateCanvasSize(); });
  }
  window.addEventListener('beforeunload', function (event) {
    if (state.stroke) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  updateButtons();
  initialise();
}());
