(function (root) {
  'use strict';
  const WIDTH = 256;
  const HEIGHT = 256;
  const CT_URL = 'assets/spl-abdominal-demo/ct-slice.png';
  const LABEL_URL = 'assets/spl-abdominal-demo/label-ids-rgb.png';
  let state = 'loading';
  let failure = null;
  let ctPixels = null;
  let segmentIds = null;
  let centroids = null;
  let sourceGray = null;

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Unable to load ' + url)); };
      img.src = url;
    });
  }

  function readImagePixels(img) {
    const scratch = document.createElement('canvas');
    scratch.width = WIDTH;
    scratch.height = HEIGHT;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
    return ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
  }

  function decodeLabelId(lowByte, highByte) {
    return Number(lowByte) + 256 * Number(highByte);
  }

  function buildCentroids(ids) {
    const summary = Object.create(null);
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      if (!id) continue;
      let item = summary[id];
      if (!item) item = summary[id] = { count: 0, x: 0, y: 0, minX: WIDTH, minY: HEIGHT, maxX: 0, maxY: 0 };
      const x = i % WIDTH;
      const y = Math.floor(i / WIDTH);
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

  function initialize() {
    if (typeof document === 'undefined' || typeof Image === 'undefined') return;
    Promise.all([loadImage(CT_URL), loadImage(LABEL_URL)]).then(function (images) {
      const ctData = readImagePixels(images[0]);
      const labelData = readImagePixels(images[1]);
      const pixelCount = WIDTH * HEIGHT;
      ctPixels = new Uint8Array(pixelCount);
      segmentIds = new Uint16Array(pixelCount);
      for (let i = 0; i < pixelCount; i += 1) {
        ctPixels[i] = ctData[i * 4];
        // Exact 16-bit class ID is encoded in the label PNG as R + 256*G.
        segmentIds[i] = decodeLabelId(labelData[i * 4], labelData[i * 4 + 1]);
      }
      sourceGray = new Uint8ClampedArray(pixelCount * 4);
      for (let i = 0; i < pixelCount; i += 1) {
        const v = ctPixels[i];
        sourceGray[i * 4] = v;
        sourceGray[i * 4 + 1] = v;
        sourceGray[i * 4 + 2] = v;
        sourceGray[i * 4 + 3] = 255;
      }
      centroids = buildCentroids(segmentIds);
      state = 'ready';
      root.dispatchEvent(new Event('ctedu:assets-ready'));
    }).catch(function (error) {
      failure = error;
      state = 'error';
      root.dispatchEvent(new Event('ctedu:assets-ready'));
    });
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
    const x = Math.max(width / 2 + 2, Math.min(WIDTH - width / 2 - 2, targetX));
    const y = Math.max(height / 2 + 2, Math.min(HEIGHT - height / 2 - 2, targetY));
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
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const imageData = ctx.createImageData(WIDTH, HEIGHT);
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
      for (let y = 1; y < HEIGHT - 1; y += 1) {
        for (let x = 1; x < WIDTH - 1; x += 1) {
          const i = y * WIDTH + x;
          if (segmentIds[i] !== highlightedId) continue;
          if (segmentIds[i - 1] === highlightedId && segmentIds[i + 1] === highlightedId &&
              segmentIds[i - WIDTH] === highlightedId && segmentIds[i + WIDTH] === highlightedId) continue;
          const k = i * 4;
          imageData.data[k] = highlightColor[0];
          imageData.data[k + 1] = highlightColor[1];
          imageData.data[k + 2] = highlightColor[2];
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    if (args.labelsOn && !args.quizId) {
      (args.items || []).forEach(function (item) {
        if (args.visible[item.id] === false) return;
        const summary = centroids[item.segmentId];
        if (!summary || summary.count < 16) return;
        drawCallout(ctx, item, args.language, summary);
      });
    }
    canvas.setAttribute('aria-label', targetItem
      ? (args.language === 'fa' ? 'ناحیهٔ برجسته‌شده روی برش CT' : 'Highlighted region on CT slice')
      : (args.language === 'fa' ? 'برش محوری CT شکم با لایهٔ قطعه‌بندی آموزشی' : 'Axial abdominal CT with educational segmentation overlay'));
    return true;
  }

  function hitTest(canvas, clientX, clientY) {
    if (state !== 'ready' || !canvas || !segmentIds) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = Math.floor((clientX - rect.left) / rect.width * WIDTH);
    const y = Math.floor((clientY - rect.top) / rect.height * HEIGHT);
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return null;
    return segmentIds[y * WIDTH + x];
  }

  function getStatus() {
    return { state: state, error: failure ? String(failure.message || failure) : null, width: WIDTH, height: HEIGHT };
  }

  const api = {
    draw: draw,
    hitTest: hitTest,
    getStatus: getStatus,
    decodeLabelId: decodeLabelId,
    getImageSize: function () { return { width: WIDTH, height: HEIGHT }; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CTEduSliceViewer = api;
  initialize();
})(typeof window !== 'undefined' ? window : globalThis);
