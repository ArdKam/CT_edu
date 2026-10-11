(function (root) {
  'use strict';

  const ASSET_BASE = 'assets/spl-abdominal-demo';
  const planes = ['axial', 'coronal', 'sagittal'];
  const currentData = Object.create(null);
  const pending = Object.create(null);
  let manifestPromise = null;
  let renderSequence = 0;

  function getManifest() {
    if (!manifestPromise) {
      if (typeof root.fetch !== 'function') return Promise.reject(new Error('Fetch is unavailable'));
      manifestPromise = root.fetch(ASSET_BASE + '/volume.json').then(function (response) {
        if (!response.ok) throw new Error('CT volume manifest could not be loaded');
        return response.json();
      }).then(function (manifest) {
        if (!manifest || !manifest.planes || planes.some(function (name) {
          const item = manifest.planes[name];
          return !item || !item.ctPattern || !item.labelsPattern || !Number(item.sliceCount);
        })) throw new Error('The CT volume does not contain all three viewing planes');
        return manifest;
      }).catch(function (error) {
        manifestPromise = null;
        throw error;
      });
    }
    return manifestPromise;
  }

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Unable to load CT plane asset: ' + url)); };
      img.src = url;
    });
  }

  function readPixels(image) {
    const width = Number(image.naturalWidth || image.width);
    const height = Number(image.naturalHeight || image.height);
    if (!width || !height) throw new Error('Invalid CT plane dimensions');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas pixel access is unavailable');
    context.drawImage(image, 0, 0, width, height);
    return { width: width, height: height, data: context.getImageData(0, 0, width, height).data };
  }

  function loadPlaneData(planeName, index, manifest) {
    const plane = manifest.planes[planeName];
    const safeIndex = Math.max(0, Math.min(Number(plane.sliceCount) - 1, Math.trunc(Number(index) || 0)));
    if (currentData[planeName] && currentData[planeName].index === safeIndex) {
      return Promise.resolve(currentData[planeName]);
    }
    const key = planeName + ':' + safeIndex;
    if (pending[key]) return pending[key];

    const suffix = String(safeIndex).padStart(3, '0');
    const ctUrl = ASSET_BASE + '/' + plane.ctPattern.replace('{index:03d}', suffix);
    const labelsUrl = ASSET_BASE + '/' + plane.labelsPattern.replace('{index:03d}', suffix);
    pending[key] = Promise.all([loadImage(ctUrl), loadImage(labelsUrl)]).then(function (images) {
      const ct = readPixels(images[0]);
      const labels = readPixels(images[1]);
      if (ct.width !== labels.width || ct.height !== labels.height) {
        throw new Error('CT pixels and label map dimensions differ');
      }
      const count = ct.width * ct.height;
      const grayscale = new Uint8Array(count);
      const segmentIds = new Uint16Array(count);
      let nonZeroIntensityPixels = 0, maximumIntensity = 0;
      for (let i = 0; i < count; i += 1) {
        const intensity = ct.data[i * 4];
        grayscale[i] = intensity;
        if (intensity > 0) nonZeroIntensityPixels += 1;
        if (intensity > maximumIntensity) maximumIntensity = intensity;
        segmentIds[i] = labels.data[i * 4] + 256 * labels.data[i * 4 + 1];
      }
      return {
        plane: planeName,
        index: safeIndex,
        width: ct.width,
        height: ct.height,
        grayscale: grayscale,
        segmentIds: segmentIds,
        nonZeroIntensityPixels: nonZeroIntensityPixels,
        maximumIntensity: maximumIntensity,
        hasSignal: maximumIntensity > 0,
        spacing: plane.pixelSpacingMm || { x: 1, y: 1 }
      };
    }).finally(function () {
      delete pending[key];
    });
    return pending[key];
  }

  function colorFromHex(hex) {
    const value = String(hex || '#ffffff').replace('#', '');
    const normalized = value.length === 3 ? value.split('').map(function (c) { return c + c; }).join('') : value;
    const number = parseInt(normalized, 16);
    if (!Number.isFinite(number)) return [255, 255, 255];
    return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
  }

  function tint(base, color, alpha) {
    return Math.round(base * (1 - alpha) + color * alpha);
  }

  function regionIsEmphasized(item, level) {
    if (level === 'organs') return item.region === 'organ';
    if (level === 'vessels') return item.region === 'vessel';
    if (level === 'posterior') return item.region === 'posterior' || item.id === 'aorta' || item.id === 'ivc';
    return true;
  }

  function getCrosshairPoint(plane, width, height, indices) {
    let x, y;
    if (plane === 'axial') {
      x = Number(indices.i) || 0;
      y = height - 1 - (Number(indices.j) || 0);
    } else if (plane === 'coronal') {
      x = Number(indices.i) || 0;
      y = Number(indices.k) || 0;
    } else {
      // Sagittal image columns run from anterior to posterior (reversed j axis);
      // use the canvas width, not its much smaller axial-slice-count height.
      x = width - 1 - (Number(indices.j) || 0);
      y = Number(indices.k) || 0;
    }
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));
    return { x: x, y: y };
  }

  function drawCrosshair(context, data, indices) {
    const point = getCrosshairPoint(data.plane, data.width, data.height, indices);
    const x = point.x, y = point.y, width = data.width, height = data.height;
    context.save();
    context.strokeStyle = '#79d4ca';
    context.fillStyle = '#79d4ca';
    context.globalAlpha = 0.95;
    context.lineWidth = 1.15;
    context.setLineDash([4, 3]);
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, height);
    context.moveTo(0, y + 0.5);
    context.lineTo(width, y + 0.5);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.arc(x + 0.5, y + 0.5, 3.3, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function draw(canvas, data, args) {
    if (!canvas || !data) return false;
    const width = data.width, height = data.height, count = width * height;
    canvas.width = width;
    canvas.height = height;
    canvas.style.aspectRatio = (width * Number(data.spacing.x || 1)) + ' / ' +
      (height * Number(data.spacing.y || 1));
    const context = canvas.getContext('2d');
    if (!context) return false;
    const image = context.createImageData(width, height);
    const bySegment = Object.create(null);
    const items = Array.isArray(args.items) ? args.items : [];
    items.forEach(function (item) { bySegment[Number(item.segmentId)] = item; });
    for (let i = 0; i < count; i += 1) {
      const base = data.grayscale[i], id = data.segmentIds[i];
      let r = base, g = base, b = base;
      const item = bySegment[id];
      if (args.overlaysOn && item && args.visible[item.id] !== false) {
        const emphasized = regionIsEmphasized(item, args.level);
        const color = colorFromHex(item.color);
        const alpha = emphasized ? 0.48 : 0.08;
        r = tint(base, color[0], alpha);
        g = tint(base, color[1], alpha);
        b = tint(base, color[2], alpha);
      }
      const offset = i * 4;
      image.data[offset] = r;
      image.data[offset + 1] = g;
      image.data[offset + 2] = b;
      image.data[offset + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    drawCrosshair(context, data, args.indices || {});
    canvas.setAttribute('aria-label', args.labels && args.labels[data.plane] || data.plane + ' CT plane with synchronized crosshair');
    return true;
  }

  async function render(args) {
    const requestId = ++renderSequence;
    const manifest = await getManifest();
    const indices = args.indices || {};
    const jobs = planes.map(function (name) {
      const axis = manifest.planes[name].indexAxis;
      return loadPlaneData(name, indices[axis], manifest);
    });
    const loaded = await Promise.all(jobs);
    if (requestId !== renderSequence) return false;
    planes.forEach(function (name, index) {
      currentData[name] = loaded[index];
      const canvas = root.document.getElementById('tri-' + name + '-canvas');
      draw(canvas, loaded[index], args);
    });
    return true;
  }

  const api = {
    render: render,
    getCrosshairPoint: getCrosshairPoint,
    getStatus: function () {
      return {
        ready: planes.every(function (name) { return Boolean(currentData[name]); }),
        planes: planes.slice(),
        indices: planes.reduce(function (result, name) {
          result[name] = currentData[name] ? currentData[name].index : null;
          return result;
        }, {}),
        hasSignal: planes.reduce(function (result, name) {
          result[name] = currentData[name] ? currentData[name].hasSignal : null;
          return result;
        }, {}),
        nonZeroIntensityPixels: planes.reduce(function (result, name) {
          result[name] = currentData[name] ? currentData[name].nonZeroIntensityPixels : null;
          return result;
        }, {})
      };
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CTEduTriPlanarViewer = api;
})(typeof window !== 'undefined' ? window : globalThis);
