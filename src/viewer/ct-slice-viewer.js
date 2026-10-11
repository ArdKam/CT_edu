(function (root) {
  'use strict';
  const WIDTH = 256;
  const HEIGHT = 256;
  const ASSET_BASE = 'assets/spl-abdominal-demo';
  const VOLUME_URL = ASSET_BASE + '/volume.json';
  const CT_URL = ASSET_BASE + '/ct-slice.png';
  const LABEL_URL = ASSET_BASE + '/label-ids-rgb.png';
  const DEFAULT_SLICE_INDEX = 26;
  let state = 'loading';
  let failure = null;
  let ctPixels = null;
  let segmentIds = null;
  let centroids = null;
  let sourceGray = null;
  let activeWidth = WIDTH;
  let activeHeight = HEIGHT;
  let activePixelSpacing = { x: 1, y: 1 };
  let loadRequestId = 0;
  let volumeManifest = null;
  let rawVoxelVolume = null;
  let rawVoxelPromise = null;
  let rawVoxelError = null;
  let windowWidth = 400;
  let windowLevel = 1064;
  let activePlane = 'axial';
  let volumeInfo = {
    isVolume: false,
    sliceCount: 1,
    currentSliceIndex: DEFAULT_SLICE_INDEX,
    defaultSliceIndex: DEFAULT_SLICE_INDEX,
    spacingMm: { x: 0.9375, y: 0.9375, z: 1.5 },
    dimensions: { width: WIDTH, height: HEIGHT, slices: 1 }
  };

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Unable to load ' + url)); };
      img.src = url;
    });
  }

  function readImagePixels(img) {
    const width = Number(img.naturalWidth || img.width || WIDTH);
    const height = Number(img.naturalHeight || img.height || HEIGHT);
    if (!width || !height) throw new Error('CT slice has invalid dimensions');
    const scratch = document.createElement('canvas');
    scratch.width = width;
    scratch.height = height;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas pixel access is unavailable');
    ctx.drawImage(img, 0, 0, width, height);
    return { width: width, height: height, data: ctx.getImageData(0, 0, width, height).data };
  }

  function decodeLabelId(lowByte, highByte) {
    return Number(lowByte) + 256 * Number(highByte);
  }

  function buildCentroids(ids, width, height) {
    width = width || WIDTH;
    height = height || HEIGHT;
    const summary = Object.create(null);
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      if (!id) continue;
      let item = summary[id];
      if (!item) item = summary[id] = { count: 0, x: 0, y: 0, minX: width, minY: height, maxX: 0, maxY: 0 };
      const x = i % width;
      const y = Math.floor(i / width);
      item.count += 1;
      item.x += x;
      item.y += y;
      item.minX = Math.min(item.minX, x);
      item.minY = Math.min(item.minY, y);
      item.maxX = Math.max(item.maxX, x);
      item.maxY = Math.max(item.maxY, y);
    }
    Object.keys(summary).forEach(function (id) {
      const item = summary[id];
      item.x = item.x / item.count;
      item.y = item.y / item.count;
    });
    return summary;
  }

  function dispatchAssetsReady() {
    if (typeof root.dispatchEvent === 'function' && typeof Event !== 'undefined') {
      root.dispatchEvent(new Event('ctedu:assets-ready'));
    }
  }

  function loadRawVoxelVolume() {
    if (rawVoxelVolume) return Promise.resolve(rawVoxelVolume);
    if (rawVoxelPromise) return rawVoxelPromise;
    if (!volumeManifest || !volumeManifest.rawVoxelVolume || typeof root.fetch !== 'function') {
      return Promise.reject(new Error('Raw CT voxel data is unavailable'));
    }
    if (typeof root.DecompressionStream !== 'function') {
      return Promise.reject(new Error('This browser does not support gzip decompression for raw CT values'));
    }
    const rawMeta = volumeManifest.rawVoxelVolume;
    rawVoxelPromise = root.fetch(ASSET_BASE + '/' + rawMeta.path).then(function (response) {
      if (!response.ok) throw new Error('Unable to fetch raw CT voxel data');
      return response.body.pipeThrough(new root.DecompressionStream('gzip'));
    }).then(function (stream) {
      return new Response(stream).arrayBuffer();
    }).then(function (buffer) {
      const count = Number(rawMeta.voxelCount);
      if (!Number.isInteger(count) || count < 1 || buffer.byteLength !== count * 2) {
        throw new Error('Raw CT voxel data has an unexpected size');
      }
      const view = new DataView(buffer);
      const data = new Int16Array(count);
      for (let i = 0; i < count; i += 1) data[i] = view.getInt16(i * 2, true);
      rawVoxelVolume = data;
      rawVoxelError = null;
      return rawVoxelVolume;
    }).catch(function (error) {
      rawVoxelError = String(error && (error.message || error) || 'Raw CT data could not be loaded');
      rawVoxelPromise = null;
      throw error;
    });
    return rawVoxelPromise;
  }

  function renderWindowedSlice() {
    if (!rawVoxelVolume || !volumeManifest) return false;
    const dimensions = volumeManifest.dimensions;
    const sourceWidth = Number(dimensions.width);
    const sourceHeight = Number(dimensions.height);
    const sourceSlices = Number(dimensions.slices);
    if (rawVoxelVolume.length !== sourceWidth * sourceHeight * sourceSlices) return false;
    const planeIndex = Number(volumeInfo.currentSliceIndex) || 0;
    const low = windowLevel - windowWidth / 2;
    const inverseWindow = 255 / Math.max(1, windowWidth);
    const pixelCount = activeWidth * activeHeight;
    if (!ctPixels || ctPixels.length !== pixelCount) ctPixels = new Uint8Array(pixelCount);
    if (!sourceGray || sourceGray.length !== pixelCount * 4) sourceGray = new Uint8ClampedArray(pixelCount * 4);
    for (let y = 0; y < activeHeight; y += 1) {
      for (let x = 0; x < activeWidth; x += 1) {
        let sourceX, sourceY, sourceZ;
        if (activePlane === 'coronal') {
          sourceX = x;
          sourceY = planeIndex;
          sourceZ = y;
        } else if (activePlane === 'sagittal') {
          sourceX = planeIndex;
          sourceY = sourceHeight - 1 - x;
          sourceZ = y;
        } else {
          sourceX = x;
          sourceY = sourceHeight - 1 - y;
          sourceZ = planeIndex;
        }
        if (sourceX < 0 || sourceX >= sourceWidth || sourceY < 0 || sourceY >= sourceHeight ||
            sourceZ < 0 || sourceZ >= sourceSlices) continue;
        const raw = rawVoxelVolume[(sourceZ * sourceHeight + sourceY) * sourceWidth + sourceX];
        const value = Math.max(0, Math.min(255, Math.round((raw - low) * inverseWindow)));
        const i = y * activeWidth + x;
        ctPixels[i] = value;
        sourceGray[i * 4] = value;
        sourceGray[i * 4 + 1] = value;
        sourceGray[i * 4 + 2] = value;
        sourceGray[i * 4 + 3] = 255;
      }
    }
    return true;
  }

  function setWindowLevel(width, level) {
    const rawMeta = volumeManifest && volumeManifest.rawVoxelVolume;
    const range = rawMeta && rawMeta.intensityRange || { min: 0, max: 3000 };
    const safeWidth = Math.max(1, Math.min(Number(range.max) - Number(range.min) || 4000, Number(width) || 400));
    const safeLevel = Math.max(Number(range.min), Math.min(Number(range.max), Number(level) || 1064));
    return loadRawVoxelVolume().then(function () {
      windowWidth = safeWidth;
      windowLevel = safeLevel;
      renderWindowedSlice();
      rawVoxelError = null;
      dispatchAssetsReady();
      return true;
    }).catch(function () {
      return false;
    });
  }

  function getWindowLevelInfo() {
    const range = volumeManifest && volumeManifest.rawVoxelVolume && volumeManifest.rawVoxelVolume.intensityRange || null;
    return {
      width: windowWidth,
      level: windowLevel,
      defaultWidth: Number(volumeManifest && volumeManifest.window && volumeManifest.window.width) || 400,
      defaultLevel: Number(volumeManifest && volumeManifest.window && volumeManifest.window.level) || 1064,
      intensityRange: range,
      rawAvailable: Boolean(rawVoxelVolume),
      loading: Boolean(rawVoxelPromise),
      error: rawVoxelError,
      units: 'source stored intensity values; HU calibration not independently verified'
    };
  }

  function commitSliceImages(images, sliceIndex, planeName, requestId) {
    if (requestId !== loadRequestId) return false;
    const ct = readImagePixels(images[0]);
    const label = readImagePixels(images[1]);
    if (ct.width !== label.width || ct.height !== label.height) {
      throw new Error('CT image and segmentation image dimensions differ');
    }
    activeWidth = ct.width;
    activeHeight = ct.height;
    activePixelSpacing = volumeInfo.spacingMm && Number.isFinite(Number(volumeInfo.spacingMm.x)) && Number.isFinite(Number(volumeInfo.spacingMm.y))
      ? { x: Number(volumeInfo.spacingMm.x), y: Number(volumeInfo.spacingMm.y) }
      : { x: 1, y: 1 };
    const pixelCount = activeWidth * activeHeight;
    ctPixels = new Uint8Array(pixelCount);
    segmentIds = new Uint16Array(pixelCount);
    for (let i = 0; i < pixelCount; i += 1) {
      ctPixels[i] = ct.data[i * 4];
      // Exact 16-bit class ID is encoded in the label PNG as R + 256*G.
      segmentIds[i] = decodeLabelId(label.data[i * 4], label.data[i * 4 + 1]);
    }
    sourceGray = new Uint8ClampedArray(pixelCount * 4);
    for (let i = 0; i < pixelCount; i += 1) {
      const v = ctPixels[i];
      sourceGray[i * 4] = v;
      sourceGray[i * 4 + 1] = v;
      sourceGray[i * 4 + 2] = v;
      sourceGray[i * 4 + 3] = 255;
    }
    centroids = buildCentroids(segmentIds, activeWidth, activeHeight);
    activePlane = planeName;
    volumeInfo.activePlane = planeName;
    volumeInfo.currentSliceIndex = sliceIndex;
    volumeInfo.dimensions = { width: activeWidth, height: activeHeight };
    renderWindowedSlice();
    failure = null;
    state = 'ready';
    dispatchAssetsReady();
    return true;
  }

  function loadSlice(requestedIndex, requestedPlane) {
    if (typeof Image === 'undefined') return Promise.resolve(false);
    const planeName = requestedPlane || activePlane || 'axial';
    const plane = volumeManifest && volumeManifest.planes && volumeManifest.planes[planeName];
    if (volumeManifest && !plane) return Promise.resolve(false);
    const isVolume = Boolean(plane);
    const sliceCount = isVolume ? Number(plane.sliceCount) : 1;
    const defaultIndex = isVolume ? Number(plane.defaultSliceIndex) || 0 : DEFAULT_SLICE_INDEX;
    const requested = Number(requestedIndex);
    const sourceIndex = isVolume
      ? Math.max(0, Math.min(sliceCount - 1, Number.isFinite(requested) ? Math.trunc(requested) : defaultIndex))
      : DEFAULT_SLICE_INDEX;
    if (state === 'ready' && sourceIndex === volumeInfo.currentSliceIndex &&
        planeName === activePlane) return Promise.resolve(true);

    const requestId = ++loadRequestId;
    activePlane = planeName;
    state = 'loading';
    failure = null;
    volumeInfo = {
      isVolume: isVolume,
      plane: planeName,
      activePlane: planeName,
      sliceCount: sliceCount,
      currentSliceIndex: sourceIndex,
      defaultSliceIndex: defaultIndex,
      spacingMm: plane ? plane.pixelSpacingMm : { x: 0.9375, y: 0.9375, z: 1.5 },
      sliceSpacingMm: plane ? plane.sliceSpacingMm : 1.5,
      dimensions: plane ? plane.dimensions : { width: WIDTH, height: HEIGHT },
      coordinateSystem: volumeManifest ? volumeManifest.coordinateSystem || 'unknown' : 'unknown',
      indexAxis: plane ? plane.indexAxis : 'k',
      planes: volumeManifest ? Object.keys(volumeManifest.planes || {}) : ['axial']
    };
    dispatchAssetsReady();
    const suffix = String(sourceIndex).padStart(3, '0');
    const ctPattern = plane && plane.ctPattern;
    const labelPattern = plane && plane.labelsPattern;
    const ctPath = isVolume
      ? ASSET_BASE + '/' + ctPattern.replace('{index:03d}', suffix)
      : CT_URL;
    const labelPath = isVolume
      ? ASSET_BASE + '/' + labelPattern.replace('{index:03d}', suffix)
      : LABEL_URL;
    return Promise.all([loadImage(ctPath), loadImage(labelPath)]).then(function (images) {
      return commitSliceImages(images, sourceIndex, planeName, requestId);
    }).catch(function (error) {
      if (requestId !== loadRequestId) return false;
      failure = error;
      state = 'error';
      dispatchAssetsReady();
      return false;
    });
  }

  function initialize() {
    if (typeof document === 'undefined' || typeof Image === 'undefined') return;
    if (typeof root.fetch === 'function') {
      root.fetch(VOLUME_URL).then(function (response) {
        if (!response.ok) throw new Error('Volume manifest unavailable');
        return response.json();
      }).then(function (manifest) {
        const planes = manifest && manifest.planes;
        const axial = planes && planes.axial;
        if (!axial || !Number.isInteger(Number(axial.sliceCount)) || Number(axial.sliceCount) < 1 ||
            !axial.dimensions || Number(axial.dimensions.width) !== WIDTH ||
            Number(axial.dimensions.height) !== HEIGHT ||
            !planes.coronal || !planes.sagittal) {
          throw new Error('Invalid CT volume manifest');
        }
        volumeManifest = manifest;
        return loadSlice(Number(axial.defaultSliceIndex) || 0, 'axial');
      }).catch(function () {
        // Keep compatibility with the committed single-slice fallback for local/offline review.
        volumeManifest = null;
        volumeInfo = {
          isVolume: false,
          plane: 'axial',
          activePlane: 'axial',
          sliceCount: 1,
          currentSliceIndex: DEFAULT_SLICE_INDEX,
          defaultSliceIndex: DEFAULT_SLICE_INDEX,
          spacingMm: { x: 0.9375, y: 0.9375, z: 1.5 },
          dimensions: { width: WIDTH, height: HEIGHT },
          coordinateSystem: 'unknown',
          indexAxis: 'k',
          planes: ['axial']
        };
        loadSlice(DEFAULT_SLICE_INDEX, 'axial');
      });
      return;
    }
    loadSlice(DEFAULT_SLICE_INDEX, 'axial');
  }

  function parseHex(hex) {
    const clean = String(hex || '#ffffff').replace('#', '');
    const normalized = clean.length === 3 ? clean.split('').map(function (c) { return c + c; }).join('') : clean;
    const value = parseInt(normalized, 16);
    if (!Number.isFinite(value)) return [255, 255, 255];
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  function mix(base, color, alpha) {
    return [
      Math.round(base[0] * (1 - alpha) + color[0] * alpha),
      Math.round(base[1] * (1 - alpha) + color[1] * alpha),
      Math.round(base[2] * (1 - alpha) + color[2] * alpha)
    ];
  }

  function labelText(item, language) {
    if (language === 'fa') {
      const names = {
        liver: 'کبد',
        spleen: 'طحال',
        'right-kidney': 'کلیه راست',
        'left-kidney': 'کلیه چپ',
        ivc: 'IVC',
        aorta: 'آئورت',
        pancreas: 'پانکراس',
        'stomach-duodenum': 'معده / دوازدهه',
        gallbladder: 'کیسه صفرا'
      };
      return names[item.id] || item.nameFa;
    }
    const names = {
      'right-kidney': 'Rt kidney',
      'left-kidney': 'Lt kidney',
      ivc: 'IVC',
      'stomach-duodenum': 'Stomach / duodenum'
    };
    return names[item.id] || item.nameEn;
  }

  function drawCallout(ctx, item, language, centroid) {
    if (!item.labelPosition || !centroid) return;
    const text = labelText(item, language);
    const targetX = item.labelPosition[0];
    const targetY = item.labelPosition[1];
    ctx.save();
    ctx.font = language === 'fa' ? '6.8px Vazirmatn, sans-serif' : '6.8px "DM Sans", sans-serif';
    ctx.direction = language === 'fa' ? 'rtl' : 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const width = Math.min(76, ctx.measureText(text).width + 6);
    const height = 10;
    const x = Math.max(width / 2 + 2, Math.min(activeWidth - width / 2 - 2, targetX));
    const y = Math.max(height / 2 + 2, Math.min(activeHeight - height / 2 - 2, targetY));
    const endX = Math.max(x - width / 2, Math.min(x + width / 2, centroid.x));
    const endY = Math.max(y - height / 2, Math.min(y + height / 2, centroid.y));
    ctx.beginPath();
    ctx.moveTo(centroid.x, centroid.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'rgba(241,247,250,.72)';
    ctx.lineWidth = 0.75;
    ctx.stroke();
    ctx.fillStyle = 'rgba(9,19,28,.86)';
    ctx.fillRect(x - width / 2, y - height / 2, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.20)';
    ctx.lineWidth = 0.45;
    ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    ctx.fillStyle = '#f4f8fa';
    ctx.fillText(text, x, y, width - 4);
    ctx.restore();
  }

  function draw(canvas, args) {
    if (state !== 'ready' || !canvas) return false;
    canvas.width = activeWidth;
    canvas.height = activeHeight;
    const spacingX = activePixelSpacing.x > 0 ? activePixelSpacing.x : 1;
    const spacingY = activePixelSpacing.y > 0 ? activePixelSpacing.y : 1;
    canvas.style.aspectRatio = (activeWidth * spacingX) + ' / ' + (activeHeight * spacingY);
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const imageData = ctx.createImageData(activeWidth, activeHeight);
    imageData.data.set(sourceGray);
    const itemsBySegment = Object.create(null);
    const itemsById = Object.create(null);
    (args.items || []).forEach(function (item) {
      itemsBySegment[item.segmentId] = item;
      itemsById[item.id] = item;
    });
    const targetItem = args.quizId ? itemsById[args.quizId] : null;
    const selectedItem = args.selectedId ? itemsById[args.selectedId] : null;
    const highlightItem = targetItem || selectedItem;
    const highlightedId = highlightItem ? highlightItem.segmentId : -1;
    const highlightColor = targetItem ? [255, 193, 100] : [255, 224, 163];

    for (let i = 0; i < segmentIds.length; i += 1) {
      const segId = segmentIds[i];
      const item = itemsBySegment[segId];
      if (!item || args.visible[item.id] === false) continue;
      const regionMatch = args.level === 'organs' ? item.region === 'organ'
        : args.level === 'vessels' ? item.region === 'vessel'
          : args.level === 'posterior' ? item.region === 'posterior' || item.id === 'aorta' || item.id === 'ivc'
            : true;
      const activeHighlight = segId === highlightedId;
      let alpha = 0;
      let color = parseHex(item.color);
      if (targetItem && activeHighlight) {
        alpha = 0.78;
        color = highlightColor;
      } else if (args.overlaysOn) {
        alpha = regionMatch ? 0.52 : 0.10;
      }
      if (!args.overlaysOn && !activeHighlight) alpha = 0;
      if (alpha > 0) {
        const k = i * 4;
        const mixed = mix([sourceGray[i], sourceGray[i], sourceGray[i]], color, alpha);
        imageData.data[k] = mixed[0];
        imageData.data[k + 1] = mixed[1];
        imageData.data[k + 2] = mixed[2];
      }
    }

    // Selected/quiz structures get a narrow edge cue, without modifying label IDs.
    if (highlightedId >= 0) {
      for (let y = 1; y < activeHeight - 1; y += 1) {
        for (let x = 1; x < activeWidth - 1; x += 1) {
          const i = y * activeWidth + x;
          if (segmentIds[i] !== highlightedId) continue;
          if (segmentIds[i - 1] === highlightedId && segmentIds[i + 1] === highlightedId &&
              segmentIds[i - activeWidth] === highlightedId && segmentIds[i + activeWidth] === highlightedId) continue;
          const k = i * 4;
          imageData.data[k] = highlightColor[0];
          imageData.data[k + 1] = highlightColor[1];
          imageData.data[k + 2] = highlightColor[2];
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    if (args.labelsOn && !args.quizId && activePlane === 'axial') {
      (args.items || []).forEach(function (item) {
        if (args.visible[item.id] === false) return;
        const summary = centroids[item.segmentId];
        if (!summary || summary.count < 16) return;
        drawCallout(ctx, item, args.language, summary);
      });
    }
    canvas.setAttribute('aria-label', accessibleLabel(args));
    return true;
  }

  function hitTest(canvas, clientX, clientY) {
    if (state !== 'ready' || !canvas || !segmentIds) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = Math.floor((clientX - rect.left) / rect.width * activeWidth);
    const y = Math.floor((clientY - rect.top) / rect.height * activeHeight);
    if (x < 0 || x >= activeWidth || y < 0 || y >= activeHeight) return null;
    return segmentIds[y * activeWidth + x];
  }

  function getStatus() {
    return {
      state: state,
      error: failure ? String(failure.message || failure) : null,
      width: activeWidth,
      height: activeHeight,
      plane: activePlane,
      sliceIndex: volumeInfo.currentSliceIndex,
      sliceCount: volumeInfo.sliceCount,
      isVolume: volumeInfo.isVolume
    };
  }

  function getPresentSegmentIds(minPixels) {
    const threshold = Number.isFinite(Number(minPixels)) ? Math.max(1, Number(minPixels)) : 8;
    if (state !== 'ready' || !centroids) return [];
    return Object.keys(centroids).filter(function (id) {
      return centroids[id].count >= threshold;
    }).map(function (id) { return Number(id); });
  }

  function getVolumeInfo(planeName) {
    const name = planeName || activePlane;
    const plane = volumeManifest && volumeManifest.planes && volumeManifest.planes[name];
    if (plane) {
      return {
        isVolume: true,
        plane: name,
        activePlane: activePlane,
        sliceCount: Number(plane.sliceCount),
        currentSliceIndex: name === activePlane ? volumeInfo.currentSliceIndex : Number(plane.defaultSliceIndex) || 0,
        defaultSliceIndex: Number(plane.defaultSliceIndex) || 0,
        spacingMm: plane.pixelSpacingMm || null,
        sliceSpacingMm: plane.sliceSpacingMm || null,
        dimensions: plane.dimensions,
        coordinateSystem: volumeManifest.coordinateSystem || 'unknown',
        indexAxis: plane.indexAxis,
        availablePlanes: Object.keys(volumeManifest.planes || {})
      };
    }
    return {
      isVolume: false,
      plane: 'axial',
      activePlane: activePlane,
      sliceCount: 1,
      currentSliceIndex: volumeInfo.currentSliceIndex,
      defaultSliceIndex: DEFAULT_SLICE_INDEX,
      spacingMm: volumeInfo.spacingMm,
      sliceSpacingMm: 1.5,
      dimensions: { width: activeWidth, height: activeHeight },
      coordinateSystem: volumeInfo.coordinateSystem || 'unknown',
      indexAxis: 'k',
      availablePlanes: ['axial']
    };
  }

  function accessibleLabel(args) {
    if (args && args.quizId) {
      return args.language === 'fa' ? 'ناحیهٔ برجسته‌شده روی برش CT' : 'Highlighted region on CT slice';
    }
    const plane = args && args.plane || activePlane;
    const planeLabels = {
      axial: { fa: 'برش محوری CT شکم با لایهٔ قطعه‌بندی آموزشی', en: 'Axial abdominal CT with educational segmentation overlay' },
      coronal: { fa: 'برش کرونال CT شکم با لایهٔ قطعه‌بندی آموزشی', en: 'Coronal abdominal CT with educational segmentation overlay' },
      sagittal: { fa: 'برش ساژیتال CT شکم با لایهٔ قطعه‌بندی آموزشی', en: 'Sagittal abdominal CT with educational segmentation overlay' }
    };
    const labels = planeLabels[plane] || planeLabels.axial;
    return args && args.language === 'fa' ? labels.fa : labels.en;
  }

  const api = {
    draw: draw,
    hitTest: hitTest,
    getStatus: getStatus,
    getVolumeInfo: getVolumeInfo,
    getWindowLevelInfo: getWindowLevelInfo,
    setWindowLevel: setWindowLevel,
    getPresentSegmentIds: getPresentSegmentIds,
    loadSlice: loadSlice,
    decodeLabelId: decodeLabelId,
    accessibleLabel: accessibleLabel,
    getImageSize: function () { return { width: activeWidth, height: activeHeight }; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CTEduSliceViewer = api;
  initialize();
})(typeof window !== 'undefined' ? window : globalThis);
