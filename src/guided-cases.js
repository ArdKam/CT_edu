(function () {
  'use strict';
  const data = window.CTEduGuidedCases;
  const root = document.getElementById('guided-case-app');
  if (!data || !root) return;

  const STORAGE_KEY = 'ctedu-guided-case-drafts-v1';
  const MAX_DRAFTS = 20;
  const MAX_FIELD = 4000;
  const state = { activeId: data.list()[0] ? data.list()[0].id : null, drafts: readDrafts() };
  const el = function (id) { return document.getElementById(id); };
  const lang = function () { return document.documentElement.lang === 'en' ? 'en' : 'fa'; };
  const text = function (value) { return value && value[lang()] ? value[lang()] : ''; };

  const categoryLabels = {
    gastrointestinal: { en: 'Gastrointestinal', fa: 'گوارش' },
    'hepatobiliary-pancreatic': { en: 'Hepatobiliary & pancreas', fa: 'کبد، صفرا و پانکراس' },
    'renal-urinary': { en: 'Renal & urinary', fa: 'کلیه و مجاری ادراری' },
    'adrenal-endocrine': { en: 'Adrenal & endocrine', fa: 'آدرنال و غدد درون‌ریز' },
    'female-reproductive-pelvic': { en: 'Female reproductive & pelvis', fa: 'تولیدمثل زنان و لگن' },
    'male-genitourinary': { en: 'Male genitourinary', fa: 'دستگاه ادراری‌ـ‌تناسلی مردان' },
    'peritoneal-retroperitoneal-vascular': { en: 'Peritoneum, retroperitoneum & vessels', fa: 'صفاق، رتروپریتوئن و عروق' }
  };
  function getFilteredCases() {
    const searchNode = el('guided-case-search');
    const systemNode = el('guided-system-filter');
    const levelNode = el('guided-level-filter');
    const query = searchNode ? searchNode.value.trim().toLocaleLowerCase() : '';
    const selectedSystem = systemNode ? systemNode.value : '';
    const selectedLevel = levelNode ? levelNode.value : '';
    return data.list().filter(function (item) {
      if (selectedSystem && item.category !== selectedSystem) return false;
      if (selectedLevel && item.level !== selectedLevel) return false;
      if (!query) return true;
      const category = categoryLabels[item.category] || item.categoryLabel || {};
      // Deliberately exclude source titles, citations, IDs and direct URLs from
      // catalog search so answer-bearing source metadata does not leak pre-submit.
      const searchable = [
        text(item.title), item.title && item.title.en, item.title && item.title.fa,
        text(item.summary), item.summary && item.summary.en, item.summary && item.summary.fa,
        category.en, category.fa, item.modality, item.region,
        Array.isArray(item.tags) ? item.tags.join(' ') : ''
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return searchable.indexOf(query) !== -1;
    });
  }


  function readDrafts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !parsed.drafts || typeof parsed.drafts !== 'object') return {};
      const out = {};
      data.list().forEach(function (item) {
        const row = parsed.drafts[item.id];
        if (!row || typeof row !== 'object') return;
        out[item.id] = {
          findings: typeof row.findings === 'string' ? row.findings.slice(0, MAX_FIELD) : '',
          differential: typeof row.differential === 'string' ? row.differential.slice(0, MAX_FIELD) : '',
          impression: typeof row.impression === 'string' ? row.impression.slice(0, MAX_FIELD) : '',
          submitted: row.submitted === true,
          savedAt: Number.isFinite(Number(row.savedAt)) ? Number(row.savedAt) : 0,
          checklist: Array.isArray(row.checklist) ? row.checklist.filter(function (id) { return typeof id === 'string'; }).slice(0, 10) : []
        };
      });
      return out;
    } catch (_) { return {}; }
  }

  function persistDrafts() {
    try {
      const ids = Object.keys(state.drafts).sort(function (a, b) {
        return Number(state.drafts[b].savedAt || 0) - Number(state.drafts[a].savedAt || 0);
      }).slice(0, MAX_DRAFTS);
      const bounded = {};
      ids.forEach(function (id) { bounded[id] = state.drafts[id]; });
      state.drafts = bounded;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, drafts: bounded }));
      const status = el('draft-status');
      if (status) status.textContent = lang() === 'fa' ? 'پیش‌نویس در همین مرورگر ذخیره شد.' : 'Draft saved in this browser.';
    } catch (_) {
      const status = el('draft-status');
      if (status) status.textContent = lang() === 'fa' ? 'ذخیره‌سازی در این مرورگر در دسترس نیست؛ متن را جداگانه نگه دار.' : 'Local storage is unavailable; keep a separate copy of your work.';
    }
  }

  function getActive() { return data.getById(state.activeId); }
  function getDraft(id) {
    if (!state.drafts[id]) state.drafts[id] = { findings: '', differential: '', impression: '', submitted: false, savedAt: 0, checklist: [] };
    return state.drafts[id];
  }

  function make(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }

  function appendText(parent, tag, className, value) {
    const node = make(tag, className, value);
    parent.appendChild(node);
    return node;
  }

  function link(url, label, className) {
    const node = make('a', className, label);
    node.href = url;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
    return node;
  }

  function renderCards() {
    const container = el('guided-case-list');
    const filtered = getFilteredCases();
    container.replaceChildren();
    if (!filtered.some(function (item) { return item.id === state.activeId; })) {
      state.activeId = filtered[0] ? filtered[0].id : null;
    }
    const count = el('guided-case-count');
    if (count) count.textContent = lang() === 'fa'
      ? filtered.length + ' از ' + data.list().length + ' کیس'
      : filtered.length + ' of ' + data.list().length + ' cases';
    const empty = el('guided-case-empty');
    if (empty) empty.hidden = filtered.length !== 0;
    filtered.forEach(function (item, index) {
      const button = make('button', 'guided-case-card' + (item.id === state.activeId ? ' active' : ''));
      button.type = 'button';
      button.dataset.caseId = item.id;
      button.dataset.caseCategory = item.category || 'gastrointestinal';
      button.dataset.caseLevel = item.level || '';
      button.setAttribute('aria-pressed', item.id === state.activeId ? 'true' : 'false');
      appendText(button, 'span', 'guided-case-number', String(index + 1).padStart(2, '0'));
      appendText(button, 'strong', 'guided-case-card-title', text(item.title));
      appendText(button, 'span', 'guided-case-card-summary', text(item.summary));
      const category = categoryLabels[item.category] || item.categoryLabel || categoryLabels.gastrointestinal;
      const label = lang() === 'fa' ? category.fa : category.en;
      const level = ({ foundations: lang() === 'fa' ? 'پایه' : 'Foundations', intermediate: lang() === 'fa' ? 'متوسط' : 'Intermediate', advanced: lang() === 'fa' ? 'پیشرفته' : 'Advanced' }[item.level] || item.level || '');
      const meta = make('span', 'guided-case-card-meta', label + ' · CT' + (level ? ' · ' + level : ''));
      button.appendChild(meta);
      button.addEventListener('click', function () { selectCase(item.id); });
      container.appendChild(button);
    });
  }
  function renderRubric(item, draft) {
    const container = el('guided-case-rubric');
    container.replaceChildren();
    const progress = el('guided-case-rubric-progress');
    const updateProgress = function () {
      if (!progress) return;
      const checked = container.querySelectorAll('input[type=checkbox]:checked').length;
      const total = item.rubric.length;
      progress.textContent = lang() === 'fa'
        ? checked + ' از ' + total + ' مورد بررسی شده'
        : checked + ' of ' + total + ' items reviewed';
      progress.dataset.reviewed = String(checked);
      progress.dataset.total = String(total);
    };
    item.rubric.forEach(function (criterion) {
      const label = make('label', 'guided-rubric-item');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = criterion.id;
      input.checked = draft.checklist.indexOf(criterion.id) !== -1;
      input.addEventListener('change', function () {
        const current = getDraft(item.id);
        current.checklist = Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(function (box) { return box.value; });
        current.savedAt = Date.now();
        persistDrafts();
        updateProgress();
      });
      const copy = make('span', 'guided-rubric-copy');
      appendText(copy, 'strong', '', text(criterion.title));
      appendText(copy, 'span', '', text(criterion.cue));
      label.appendChild(input);
      label.appendChild(copy);
      container.appendChild(label);
    });
    updateProgress();
  }

  function renderSource(item) {
    const studyPageUrl = item.source.studyPageUrl || '';
    const sourceDetailsRevealed = Boolean(getDraft(item.id).submitted);
    el('source-case-title').textContent = sourceDetailsRevealed
      ? item.source.title
      : (lang() === 'fa' ? 'منبع تصویربرداری خارجی' : 'External imaging source');
    const attribution = item.source.contributor
      ? (lang() === 'fa' ? 'مشارکت‌کننده: ' : 'Contributed by: ') + item.source.contributor + (item.source.rid ? ' · ' + item.source.rid : '')
      : (lang() === 'fa' ? 'شناسهٔ کیس: ' : 'Case ID: ') + (item.source.caseId || item.source.rid || '');
    el('source-case-attribution').textContent = attribution;
    const sourceLink = el('source-open-link');
    sourceLink.href = item.source.url;
    sourceLink.textContent = lang() === 'fa'
      ? 'بازکردن صفحهٔ کیس منبع در Radiopaedia ↗'
      : 'Open source case page on Radiopaedia ↗';
    const studyLink = el('source-open-study-link');
    studyLink.hidden = !studyPageUrl;
    if (studyPageUrl) studyLink.href = studyPageUrl;
    else studyLink.removeAttribute('href');
    studyLink.textContent = lang() === 'fa'
      ? 'بازکردن صفحهٔ مطالعه در Radiopaedia ↗'
      : 'Open study page on Radiopaedia ↗';
    el('source-load-status').textContent = lang() === 'fa'
      ? 'Viewer مستقل و قابل‌تأیید داخل CT Edu در دسترس نیست. این پیوندها فقط صفحهٔ کیس/مطالعه را در Radiopaedia باز می‌کنند؛ برای نمایش تصویر داخل برنامه به روش رسمی embed یا تصاویر دارای مجوز و منبع قابل‌استفاده نیاز است.'
      : 'A standalone, verified in-app viewer is not available in CT Edu yet. These links open the case/study page on Radiopaedia. An in-app viewer needs an officially supported embed method or image files with confirmed reuse rights.';
    if (item.source.articleUrl) el('source-article-link').href = item.source.articleUrl;
    else el('source-article-link').removeAttribute('href');
    el('source-article-link').hidden = !sourceDetailsRevealed || !item.source.articleUrl;
    el('source-article-link').textContent = (lang() === 'fa' ? 'مقالهٔ مرتبط: ' : 'Related article: ') + (item.source.articleTitle || '');
    el('source-citation').hidden = !sourceDetailsRevealed;
    el('source-citation').textContent = item.source.citation;
  }

  function renderActive() {
    const item = getActive();
    const activePanel = el('guided-active-case-panel');
    if (!item) {
      if (activePanel) activePanel.hidden = true;
      return;
    }
    if (activePanel) activePanel.hidden = false;
    const draft = getDraft(item.id);
    el('guided-case-title').textContent = text(item.title);
    el('guided-case-summary').textContent = text(item.summary);
    el('guided-case-context').textContent = text(item.clinicalContext);
    el('guided-case-level').textContent = (lang() === 'fa' ? 'سطح: ' : 'Level: ') + ({foundations: lang() === 'fa' ? 'پایه' : 'Foundations', intermediate: lang() === 'fa' ? 'متوسط' : 'Intermediate', advanced: lang() === 'fa' ? 'پیشرفته' : 'Advanced'}[item.level] || item.level);
    el('guided-case-disclaimer').textContent = text(item.disclaimer);
    const goals = el('guided-case-objectives');
    goals.replaceChildren();
    item.objectives[lang()].forEach(function (goal) { appendText(goals, 'li', '', goal); });

    el('learner-findings').value = draft.findings;
    el('learner-differential').value = draft.differential;
    el('learner-impression').value = draft.impression;
    el('guided-case-rubric-section').hidden = !draft.submitted;
    el('guided-case-submit-status').textContent = draft.submitted
      ? (lang() === 'fa' ? 'پاسخ ذخیره‌شده است. این مرحله نمره‌گذاری خودکار ندارد؛ موارد را با چک‌لیست مرور کن.' : 'Your draft is submitted locally. There is no automatic grading; review the checklist.')
      : '';
    renderRubric(item, draft);
    renderSource(item);
  }

  function selectCase(id) {
    if (!data.getById(id)) return;
    state.activeId = id;
    renderCards();
    renderActive();
    el('guided-case-title').focus({ preventScroll: true });
  }

  function submitDraft(event) {
    event.preventDefault();
    const item = getActive();
    if (!item) return;
    const findings = el('learner-findings').value.trim();
    const impression = el('learner-impression').value.trim();
    if (!findings || !impression) {
      el('guided-case-submit-status').textContent = lang() === 'fa'
        ? 'برای ثبت خودارزیابی، Findings و Impression را پر کن.'
        : 'Enter both Findings and Impression before submitting your self-review.';
      (!findings ? el('learner-findings') : el('learner-impression')).focus();
      return;
    }
    const draft = getDraft(item.id);
    draft.findings = findings.slice(0, MAX_FIELD);
    draft.differential = el('learner-differential').value.slice(0, MAX_FIELD);
    draft.impression = impression.slice(0, MAX_FIELD);
    draft.submitted = true;
    draft.savedAt = Date.now();
    persistDrafts();
    renderSource(item);
    renderRubric(item, draft);
    el('guided-case-rubric-section').hidden = false;
    el('guided-case-submit-status').textContent = lang() === 'fa'
      ? 'پاسخ در همین مرورگر ذخیره شد. نمرهٔ خودکار یا تفسیر تأییدشده ارائه نمی‌شود؛ چک‌لیست زیر را برای خودارزیابی به کار ببر.'
      : 'Saved in this browser. No automated score or validated interpretation is provided; use the checklist for self-review.';
    el('guided-case-rubric-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearDraft() {
    const item = getActive();
    if (!item) return;
    if (!window.confirm(lang() === 'fa' ? 'پیش‌نویس این کیس از همین مرورگر حذف شود؟' : 'Delete this case draft from this browser?')) return;
    delete state.drafts[item.id];
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, drafts: state.drafts })); } catch (_) {}
    el('learner-findings').value = '';
    el('learner-differential').value = '';
    el('learner-impression').value = '';
    el('guided-case-rubric-section').hidden = true;
    el('guided-case-submit-status').textContent = lang() === 'fa' ? 'پیش‌نویس حذف شد.' : 'Draft deleted.';
    persistDrafts();
  }

  function setLanguage(next) {
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'fa' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-fa', next === 'fa');
    document.body.classList.toggle('lang-en', next === 'en');
    document.querySelectorAll('[data-fa][data-en]').forEach(function (node) {
      node.textContent = node.dataset[next];
    });
    document.querySelectorAll('[data-fa-placeholder][data-en-placeholder]').forEach(function (node) {
      node.placeholder = next === 'fa' ? node.dataset.faPlaceholder : node.dataset.enPlaceholder;
    });
    el('language-toggle').textContent = next === 'fa' ? 'EN' : 'فا';
    renderCards();
    renderActive();
  }

  ['learner-findings', 'learner-differential', 'learner-impression'].forEach(function (id) {
    el(id).addEventListener('input', function () {
      const item = getActive();
      if (!item) return;
      const draft = getDraft(item.id);
      draft[id === 'learner-findings' ? 'findings' : id === 'learner-differential' ? 'differential' : 'impression'] = el(id).value.slice(0, MAX_FIELD);
      draft.savedAt = Date.now();
      persistDrafts();
    });
  });

  ['guided-case-search', 'guided-system-filter', 'guided-level-filter'].forEach(function (id) {
    const control = el(id);
    if (!control) return;
    control.addEventListener(id === 'guided-case-search' ? 'input' : 'change', function () {
      renderCards();
      renderActive();
    });
  });
  el('guided-case-form').addEventListener('submit', submitDraft);
  el('clear-case-draft').addEventListener('click', clearDraft);
  el('language-toggle').addEventListener('click', function () { setLanguage(lang() === 'fa' ? 'en' : 'fa'); });
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function () { renderCards(); renderActive(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }
  renderCards();
  renderActive();
  setLanguage('fa');
}());
