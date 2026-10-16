(function () {
  'use strict';
  const series = window.CTEduWikimediaAbdomenSeries;
  if (!series) return;
  const byId = function (id) { return document.getElementById(id); };
  const image = byId('series-image'), stage = byId('series-stage'), stateMessage = byId('series-image-state');
  const position = byId('series-position'), slider = byId('series-slider'), sliderValue = byId('series-slider-value');
  const zoomValue = byId('series-zoom-value'), retry = byId('series-retry'), languageButton = byId('series-language-toggle');
  if (!image || !stage || !slider || !position || !sliderValue) return;
  let current = 0, requestId = 0, zoom = 100, panX = 0, panY = 0, language = 'fa', debounceId = 0, drag = null;
  const toDigits = function (value) { return language === 'fa' ? String(value).replace(/[0-9]/g, function (digit) { return '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]; }) : String(value); };
  const text = function (fa, en) { return language === 'fa' ? fa : en; };
  function applyLanguage(next) {
    language = next === 'en' ? 'en' : 'fa';
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-fa', language === 'fa');
    document.body.classList.toggle('lang-en', language === 'en');
    languageButton.textContent = language === 'fa' ? 'EN ↔ فا' : 'فا ↔ EN';
    languageButton.setAttribute('aria-label', text('تغییر زبان به انگلیسی','Switch language to Persian'));
    byId('series-previous').setAttribute('aria-label', text('تصویر قبلی','Previous image'));
    byId('series-next').setAttribute('aria-label', text('تصویر بعدی','Next image'));
    byId('series-zoom-out').setAttribute('aria-label', text('کوچک‌نمایی','Zoom out'));
    byId('series-zoom-in').setAttribute('aria-label', text('بزرگ‌نمایی','Zoom in'));
    slider.setAttribute('aria-label', text('انتخاب شمارهٔ تصویر محوری','Select axial image index'));
    image.alt = text('تصویر محوری CT شمارهٔ ' + toDigits(current + 1) + ' از ' + toDigits(series.imageCount),'Axial CT image ' + (current + 1) + ' of ' + series.imageCount);
    updateLabels();
  }
  function updateLabels() {
    position.textContent = text(toDigits(current + 1) + ' از ' + toDigits(series.imageCount),(current + 1) + ' of ' + series.imageCount);
    sliderValue.textContent = text(toDigits(current + 1) + ' / ' + toDigits(series.imageCount),(current + 1) + ' / ' + series.imageCount);
    slider.setAttribute('aria-valuetext', text('تصویر ' + toDigits(current + 1) + ' از ' + toDigits(series.imageCount),'Image ' + (current + 1) + ' of ' + series.imageCount));
    slider.value = String(current + 1);
    byId('series-previous').disabled = current <= 0;
    byId('series-next').disabled = current >= series.imageCount - 1;
  }
  function showState(kind) {
    stateMessage.hidden = false;
    const strong = stateMessage.querySelector('strong');
    const loader = stateMessage.querySelector('.series-loader');
    if (kind === 'error') {
      if (loader) loader.hidden = true;
      strong.textContent = text('بارگذاری این تصویر انجام نشد. اتصال را بررسی و دوباره تلاش کن.','This image failed to load. Check the connection and retry.');
      retry.hidden = false;
    } else {
      if (loader) loader.hidden = false;
      strong.textContent = text('در حال بارگذاری تصویر…','Loading image…');
      retry.hidden = true;
    }
  }
  function updateTransform() {
    image.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + (zoom / 100) + ')';
    zoomValue.textContent = zoom + '%';
    image.style.cursor = zoom > 100 ? 'grab' : 'default';
  }
  function resetView() { zoom = 100; panX = 0; panY = 0; updateTransform(); }
  function loadImage(index) {
    current = Math.max(0, Math.min(series.imageCount - 1, Number(index) || 0));
    const request = ++requestId;
    updateLabels();
    image.hidden = true;
    showState('loading');
    const url = series.getImageUrl(current);
    if (!url) { showState('error'); return; }
    image.onload = function () {
      if (request !== requestId) return;
      image.hidden = false;
      stateMessage.hidden = true;
      retry.hidden = true;
      image.alt = text('تصویر محوری CT شمارهٔ ' + toDigits(current + 1) + ' از ' + toDigits(series.imageCount),'Axial CT image ' + (current + 1) + ' of ' + series.imageCount);
      resetView();
      preload(current - 1);
      preload(current + 1);
    };
    image.onerror = function () {
      if (request !== requestId) return;
      showState('error');
    };
    image.src = url;
  }
  const preloaded = new Set();
  function preload(index) {
    if (index < 0 || index >= series.imageCount) return;
    const url = series.getImageUrl(index);
    if (!url || preloaded.has(url)) return;
    preloaded.add(url);
    const next = new Image();
    next.referrerPolicy = 'no-referrer';
    next.src = url;
  }
  function goTo(index) { window.clearTimeout(debounceId); loadImage(index); }
  byId('series-previous').addEventListener('click', function () { goTo(current - 1); });
  byId('series-next').addEventListener('click', function () { goTo(current + 1); });
  byId('series-zoom-in').addEventListener('click', function () { zoom = Math.min(250, zoom + 25); updateTransform(); });
  byId('series-zoom-out').addEventListener('click', function () { zoom = Math.max(75, zoom - 25); if (zoom === 100) { panX = 0; panY = 0; } updateTransform(); });
  byId('series-fit').addEventListener('click', resetView);
  retry.addEventListener('click', function () { loadImage(current); });
  slider.addEventListener('input', function () {
    current = Number(slider.value) - 1;
    updateLabels();
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(function () { loadImage(current); }, 110);
  });
  slider.addEventListener('change', function () { goTo(Number(slider.value) - 1); });
  languageButton.addEventListener('click', function () { applyLanguage(language === 'fa' ? 'en' : 'fa'); });
  document.addEventListener('keydown', function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const active = document.activeElement;
    if (active && /INPUT|TEXTAREA|SELECT|BUTTON/.test(active.tagName)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); goTo(current - 1); }
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); goTo(current + 1); }
    else if (event.key === 'Home') { event.preventDefault(); goTo(0); }
    else if (event.key === 'End') { event.preventDefault(); goTo(series.imageCount - 1); }
    else if (event.key === '+' || event.key === '=') { zoom = Math.min(250, zoom + 25); updateTransform(); }
    else if (event.key === '-') { zoom = Math.max(75, zoom - 25); if (zoom === 100) { panX = 0; panY = 0; } updateTransform(); }
  });
  stage.addEventListener('wheel', function (event) {
    if (event.ctrlKey) return;
    event.preventDefault();
    zoom = Math.max(75, Math.min(250, zoom + (event.deltaY < 0 ? 10 : -10)));
    if (zoom === 100) { panX = 0; panY = 0; }
    updateTransform();
  }, { passive: false });
  image.addEventListener('pointerdown', function (event) {
    if (zoom <= 100 || image.hidden) return;
    drag = { x: event.clientX, y: event.clientY, panX: panX, panY: panY, pointerId: event.pointerId };
    image.setPointerCapture(event.pointerId);
    image.classList.add('is-dragging');
  });
  image.addEventListener('pointermove', function (event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    panX = drag.panX + event.clientX - drag.x;
    panY = drag.panY + event.clientY - drag.y;
    updateTransform();
    image.classList.add('is-dragging');
  });
  function stopDrag(event) {
    if (!drag || (event && drag.pointerId !== event.pointerId)) return;
    drag = null;
    image.classList.remove('is-dragging');
  }
  image.addEventListener('pointerup', stopDrag);
  image.addEventListener('pointercancel', stopDrag);
  image.addEventListener('lostpointercapture', stopDrag);
  applyLanguage('fa');
  loadImage(0);
}());
