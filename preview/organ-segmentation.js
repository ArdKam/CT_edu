(function () {
  'use strict';
  const $ = function (id) { return document.getElementById(id); };
  const canvas = $('organ-canvas');
  const ctx = canvas && canvas.getContext('2d', { willReadFrequently: true });
  if (!canvas || !ctx) return;

  const state = {
    language: document.documentElement.lang === 'en' ? 'en' : 'fa',
    index: 26,
    count: 113,
    manifest: null,
    visible: Object.create(null),
    opacity: 0.72,
    request: 0,
    imageCache: new Map(),
    maskCanvas: document.createElement('canvas'),
    maskContext: null
  };
  state.maskCanvas.width = state.maskCanvas.height = 256;
  state.maskContext = state.maskCanvas.getContext('2d', { willReadFrequently: true });

  function t(fa, en) { return state.language === 'fa' ? fa : en; }
  function digits(value) {
    return state.language === 'fa'
      ? String(value).replace(/[0-9]/g, function (digit) { return '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]; })
      : String(value);
  }
  function setText(id, fa, en) { $(id).textContent = t(fa, en); }
  function applyLanguage(next) {
    state.language = next === 'en' ? 'en' : 'fa';
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === 'fa' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-fa', state.language === 'fa');
    document.body.classList.toggle('lang-en', state.language === 'en');
    $('organ-language-toggle').textContent = state.language === 'fa' ? 'EN ↔ فا' : 'فا ↔ EN';
    $('organ-language-toggle').setAttribute('aria-label', t('تغییر زبان به انگلیسی', 'Switch language to Persian'));
    renderOrganControls();
    updatePosition();
    updateOpacityLabel();
    if (state.manifest) renderCurrentSlice();
  }
  function showCanvasState(kind, customMessage) {
    const panel = $('organ-canvas-state');
    panel.hidden = false;
    panel.replaceChildren();
    if (kind === 'loading') {
      const spinner = document.createElement('span');
      spinner.className = 'organ-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      panel.appendChild(spinner);
    }
    const strong = document.createElement('strong');
    strong.textContent = customMessage || (kind === 'loading'
      ? t('در حال بارگذاری خروجی مدل…', 'Loading model output…')
      : t('خروجی مدل در دسترس نیست.', 'Model output is unavailable.'));
    panel.appendChild(strong);
  }
  function setStatus(messageFa, messageEn) { $('organ-status').textContent = t(messageFa, messageEn); }
  function pad(index) { return String(index).padStart(3, '0'); }
  function loadImage(url) {
    if (state.imageCache.has(url)) return state.imageCache.get(url);
    const promise = new Promise(function (resolve, reject) {
      const image = new Image();
      image.referrerPolicy = 'no-referrer';
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error('Image could not be loaded: ' + url)); };
      image.src = url;
    });
    state.imageCache.set(url, promise);
    if (state.imageCache.size > 32) {
      const keep = new Set([url]);
      state.imageCache.forEach(function (_, key) { if (keep.size < 24) keep.add(key); });
      state.imageCache.forEach(function (value, key) { if (!keep.has(key)) state.imageCache.delete(key); });
    }
    return promise;
  }
  function hexRgb(hex) {
    const value = String(hex || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(value)) return [150, 170, 180];
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
  }
  function renderOrganControls() {
    const list = $('organ-controls-list');
    list.replaceChildren();
    if (!state.manifest || !Array.isArray(state.manifest.organs)) return;
    state.manifest.organs.forEach(function (organ) {
      const label = document.createElement('label');
      label.className = 'organ-control-row';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = state.visible[organ.id] !== false;
      input.setAttribute('aria-label', state.language === 'fa' ? organ.nameFa : organ.nameEn);
      input.addEventListener('change', function () {
        state.visible[organ.id] = input.checked;
        renderCurrentSlice();
      });
      const chip = document.createElement('span');
      chip.className = 'organ-color-chip';
      chip.style.setProperty('--organ-color', organ.color);
      chip.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'organ-control-name';
      name.textContent = state.language === 'fa' ? organ.nameFa : organ.nameEn;
      label.append(input, chip, name);

      const meta = document.createElement('span');
      meta.className = 'organ-control-meta';
      const dice = organ.diceAgainstBundledAtlasLabel;
      meta.textContent = dice === null || dice === undefined
        ? t('ماسک مدل · بدون امتیاز هم‌پوشانی', 'Model mask · no reference overlap score')
        : t('Dice با برچسب مرجع همین اطلس: ', 'Dice vs this atlas reference: ') + Number(dice).toFixed(3);
      list.append(label, meta);
    });
  }
  function renderModelMeta() {
    const target = $('organ-model-meta');
    target.replaceChildren();
    const entries = [
      [t('مدل', 'Model'), state.manifest.model.name + ' ' + state.manifest.model.version],
      [t('حالت اجرا', 'Inference'), t('CPU · سریع/۳ میلی‌متر', 'CPU · fast/3mm')],
      [t('حجم', 'Volume'), '256 × 256 × 113'],
      [t('وضعیت', 'Status'), t('پیش‌بینی بازبینی‌نشده', 'Unreviewed prediction')]
    ];
    entries.forEach(function (entry) {
      const row = document.createElement('div');
      row.className = 'organ-model-stat';
      const key = document.createElement('span');
      key.textContent = entry[0];
      const value = document.createElement('strong');
      value.textContent = entry[1];
      row.append(key, value);
      target.appendChild(row);
    });
    const warning = document.createElement('p');
    warning.className = 'organ-model-warning';
    warning.textContent = t(
      'امتیازهای Dice با برچسب‌های همراه همین اطلس محاسبه شده‌اند و معیار مستقل دقت پزشکی نیستند.',
      'Dice scores use the labels bundled with this same atlas; they are not an independent measure of medical accuracy.'
    );
    target.appendChild(warning);

    const downloads = document.createElement('div');
    downloads.className = 'organ-download-links';
    const downloadTitle = document.createElement('strong');
    downloadTitle.textContent = t('ماسک‌های سه‌بعدی', '3D mask files');
    downloads.appendChild(downloadTitle);

    function appendDownload(fileName, faLabel, enLabel) {
      if (typeof fileName !== 'string' || !/^[a-z0-9-]+\.nii\.gz$/i.test(fileName)) return;
      const link = document.createElement('a');
      link.className = 'organ-download-link';
      link.href = './assets/organ-predictions/' + encodeURIComponent(fileName);
      link.download = fileName;
      link.textContent = t(faLabel, enLabel);
      downloads.appendChild(link);
    }
    if (state.manifest.labelMap) {
      appendDownload(state.manifest.labelMap.file,
        'دریافت نقشهٔ برچسب چنداندامی (.nii.gz)',
        'Download combined organ label map (.nii.gz)');
    }
    state.manifest.organs.forEach(function (organ) {
      appendDownload(organ.maskVolumeFile,
        'دریافت ماسک سه‌بعدی · ' + organ.nameFa,
        'Download 3D mask · ' + organ.nameEn);
    });
    if (downloads.querySelector('a')) target.appendChild(downloads);
  }
  function updatePosition() {
    const position = digits(state.index + 1) + ' / ' + digits(state.count);
    $('organ-position').textContent = position;
    $('organ-slice-value').textContent = position;
    $('organ-slice-slider').max = String(state.count);
    $('organ-slice-slider').value = String(state.index + 1);
    $('organ-prev').disabled = state.index <= 0;
    $('organ-next').disabled = state.index >= state.count - 1;
    canvas.setAttribute('aria-label', t(
      'برش محوری ' + (state.index + 1) + ' از ' + state.count + ' همراه با ماسک‌های پیش‌بینی‌شده و بازبینی‌نشده',
      'Axial slice ' + (state.index + 1) + ' of ' + state.count + ' with unreviewed predicted organ masks'
    ));
  }
  function updateOpacityLabel() {
    $('organ-opacity-value').textContent = digits(Math.round(state.opacity * 100)) + '%';
  }
  function blendOverlay(base, mask, color, opacity) {
    const data = base.data;
    const m = mask.data;
    const width = mask.width;
    const height = mask.height;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        if (m[i] < 128) continue;
        const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
          m[i - 4] < 128 || m[i + 4] < 128 ||
          m[i - width * 4] < 128 || m[i + width * 4] < 128;
        const alpha = Math.max(0, Math.min(1, opacity * (edge ? 0.96 : 0.30)));
        data[i] = Math.round(data[i] * (1 - alpha) + color[0] * alpha);
        data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + color[1] * alpha);
        data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + color[2] * alpha);
      }
    }
  }
  async function renderCurrentSlice() {
    if (!state.manifest) return;
    const request = ++state.request;
    showCanvasState('loading');
    updatePosition();
    try {
      const ctUrl = '../assets/spl-abdominal-demo/slices/ct-' + pad(state.index) + '.png';
      const ctImage = await loadImage(ctUrl);
      if (ctImage.naturalWidth !== 256 || ctImage.naturalHeight !== 256) {
        throw new Error('Unexpected CT image dimensions.');
      }
      canvas.width = 256;
      canvas.height = 256;
      ctx.clearRect(0, 0, 256, 256);
      ctx.drawImage(ctImage, 0, 0, 256, 256);
      let composite = ctx.getImageData(0, 0, 256, 256);

      for (const organ of state.manifest.organs) {
        if (state.visible[organ.id] === false) continue;
        const maskUrl = './assets/organ-predictions/' + organ.maskPattern.replace('{index:03d}', pad(state.index));
        const maskImage = await loadImage(maskUrl);
        if (request !== state.request) return;
        if (maskImage.naturalWidth !== 256 || maskImage.naturalHeight !== 256) {
          throw new Error('Unexpected mask dimensions for ' + organ.id);
        }
        state.maskContext.clearRect(0, 0, 256, 256);
        state.maskContext.drawImage(maskImage, 0, 0, 256, 256);
        const mask = state.maskContext.getImageData(0, 0, 256, 256);
        blendOverlay(composite, mask, hexRgb(organ.color), state.opacity);
      }
      if (request !== state.request) return;
      ctx.putImageData(composite, 0, 0);
      $('organ-canvas-state').hidden = true;
      setStatus(
        'برش ' + (state.index + 1) + ' از ' + state.count + ' · ماسک‌ها پیش‌بینی مدل و بازبینی‌نشده‌اند.',
        'Slice ' + (state.index + 1) + ' of ' + state.count + ' · model predictions, not yet reviewed.'
      );
    } catch (error) {
      if (request !== state.request) return;
      showCanvasState('error', t(
        'بارگذاری تصویر یا ماسک ناموفق بود. خروجی مدل و دارایی‌های پیش‌نمایش را بررسی کن.',
        'A CT image or mask failed to load. Check the generated model output and preview assets.'
      ));
      setStatus(t('خطای بارگذاری: ', 'Loading error: ') + String(error && error.message || error), t('خطای بارگذاری: ', 'Loading error: ') + String(error && error.message || error));
    }
  }

  $('organ-language-toggle').addEventListener('click', function () {
    applyLanguage(state.language === 'fa' ? 'en' : 'fa');
  });
  $('organ-prev').addEventListener('click', function () {
    state.index = Math.max(0, state.index - 1);
    renderCurrentSlice();
  });
  $('organ-next').addEventListener('click', function () {
    state.index = Math.min(state.count - 1, state.index + 1);
    renderCurrentSlice();
  });
  $('organ-reset').addEventListener('click', function () {
    state.opacity = 0.72;
    $('organ-opacity').value = '72';
    updateOpacityLabel();
    renderCurrentSlice();
  });
  $('organ-slice-slider').addEventListener('input', function () {
    state.index = Math.max(0, Math.min(state.count - 1, Number($('organ-slice-slider').value) - 1));
    updatePosition();
    renderCurrentSlice();
  });
  $('organ-opacity').addEventListener('input', function () {
    state.opacity = Math.max(0.15, Math.min(1, Number($('organ-opacity').value) / 100));
    updateOpacityLabel();
    renderCurrentSlice();
  });
  document.addEventListener('keydown', function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const active = document.activeElement;
    if (active && /INPUT|TEXTAREA|SELECT|BUTTON/.test(active.tagName)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault(); state.index = Math.max(0, state.index - 1); renderCurrentSlice();
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault(); state.index = Math.min(state.count - 1, state.index + 1); renderCurrentSlice();
    } else if (event.key === 'Home') {
      event.preventDefault(); state.index = 0; renderCurrentSlice();
    } else if (event.key === 'End') {
      event.preventDefault(); state.index = state.count - 1; renderCurrentSlice();
    }
  });

  fetch('./assets/organ-predictions/manifest.json', { cache: 'no-cache' })
    .then(function (response) {
      if (!response.ok) throw new Error('The experimental segmentation manifest is missing.');
      return response.json();
    })
    .then(function (manifest) {
      if (!manifest || manifest.schemaVersion !== 1 ||
          manifest.status !== 'experimental-unreviewed' ||
          manifest.sourceDimensionsXYZ.join(',') !== '256,256,113' ||
          !Array.isArray(manifest.organs) || manifest.organs.length !== 4) {
        throw new Error('The model manifest did not pass schema checks.');
      }
      state.manifest = manifest;
      state.count = manifest.sourceDimensionsXYZ[2];
      state.index = 26;
      manifest.organs.forEach(function (organ) { state.visible[organ.id] = true; });
      renderOrganControls();
      renderModelMeta();
      updatePosition();
      updateOpacityLabel();
      renderCurrentSlice();
    })
    .catch(function (error) {
      $('organ-controls-list').replaceChildren();
      $('organ-model-meta').textContent = String(error && error.message || error);
      showCanvasState('error', t(
        'هنوز ماسک‌های مدل در این پیش‌نمایش موجود نیستند؛ اجرای مدل یا ساخت دارایی‌ها ممکن است شکست خورده باشد.',
        'Model masks are not available in this preview yet; inference or asset generation may have failed.'
      ));
      setStatus(t('خروجی قابل‌استفاده‌ای تولید نشده است. هیچ ماسک ساختگی نمایش داده نمی‌شود.', 'No usable output was generated. No placeholder masks are displayed.'));
    });
}());
