(function () {
  'use strict';
  const catalog = window.CTEduModalityCatalog;
  const mount = document.getElementById('modality-catalog-content');
  const detail = document.getElementById('modality-detail');
  if (!catalog || !mount || !detail) return;
  let selectedId = null;

  const copy = {
    fa: {
      kicker:'IMAGING LIBRARY',title:'مسیرهای یادگیری تصویربرداری',
      intro:'مسیر فعال با دادهٔ فعلی مشخص است؛ سه مسیر دیگر تا تأیید منبع، مجوز و بازبینی تخصصی در وضعیت انتظار می‌مانند.',
      status:{available:'نمونهٔ موجود',candidate:'کاندیدا · بازبینی لازم',blocked:'فعلاً مسدود'},
      action:{available:'ورود به آزمایشگاه',candidate:'بررسی مسیر توسعه',blocked:'مشاهدهٔ موانع',localViewer:'بازکردن نمایشگر محلی'},
      goals:'اهداف آموزشی پیشنهادی',gates:'پیش‌نیازهای ورود به محصول',source:'منبع برای بررسی',
      close:'بستن جزئیات',warning:'این مسیر هنوز تصویر آموزشیِ قابل‌انتشار ندارد. هیچ تصویر بیمار، دادهٔ مشتق‌شده یا برچسب تأییدنشده‌ای در این تغییر اضافه نشده است.',
      currentWarning:'این مسیر در نسخهٔ آزمایشی کار می‌کند، اما جایگزین آموزش بالینی، نظر رادیولوژیست یا سامانهٔ تشخیصی نیست.'
    },
    en: {
      kicker:'IMAGING LIBRARY',title:'Imaging learning paths',
      intro:'The active path uses the current teaching dataset. The other three remain gated until source, rights, and specialist review are complete.',
      status:{available:'Teaching demo available',candidate:'Candidate · review needed',blocked:'Blocked for now'},
      action:{available:'Open learning lab',candidate:'Review expansion path',blocked:'View blockers',localViewer:'Open local image viewer'},
      goals:'Proposed learning objectives',gates:'Requirements before release',source:'Source to review',
      close:'Close details',warning:'This path has no approved public teaching images yet. No patient images, derivatives, or unreviewed labels were added in this change.',
      currentWarning:'This path works as a prototype, but it is not a substitute for clinical teaching, radiologist judgment, or a diagnostic system.'
    }
  };
  function language() { return document.documentElement.lang === 'fa' ? 'fa' : 'en'; }
  function node(tag, cls, value) {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (value !== undefined) element.textContent = String(value);
    return element;
  }
  function statusLabel(entry, strings) { return strings.status[entry.status] || strings.status.blocked; }
  function renderListBlock(title, items) {
    const block = node('section','modality-detail-block');
    block.appendChild(node('h4','',title));
    const list = node('ul','');
    items.forEach(function (value) { list.appendChild(node('li','',value)); });
    block.appendChild(list);
    return block;
  }
  function renderDetail(entry, strings, lang) {
    const head = node('div','modality-detail-head');
    const titleWrap = node('div','');
    titleWrap.appendChild(node('h3','',(lang === 'fa' ? entry.titleFa : entry.titleEn) + ' · ' + statusLabel(entry,strings)));
    titleWrap.appendChild(node('p','',lang === 'fa' ? 'وضعیت محتوای آموزشی' : 'Learning-content status'));
    head.appendChild(titleWrap);
    const close = node('button','modality-detail-close',strings.close);
    close.type = 'button';
    close.dataset.modalityClose = 'true';
    head.appendChild(close);
    detail.appendChild(head);
    detail.appendChild(node('p','modality-detail-copy',lang === 'fa' ? entry.detailFa : entry.detailEn));
    const blocks = node('div','modality-detail-grid');
    blocks.appendChild(renderListBlock(strings.goals,lang === 'fa' ? entry.objectivesFa : entry.objectivesEn));
    blocks.appendChild(renderListBlock(strings.gates,lang === 'fa' ? entry.gatesFa : entry.gatesEn));
    const sourceBlock = node('section','modality-detail-block');
    sourceBlock.appendChild(node('h4','',strings.source));
    sourceBlock.appendChild(node('p','modality-detail-copy',entry.sourceName));
    sourceBlock.appendChild(node('p','modality-detail-copy',lang === 'fa' ? entry.sourceNoteFa : entry.sourceNoteEn));
    const link = node('a','modality-source-link',lang === 'fa' ? 'مشاهدهٔ منبع رسمی ↗' : 'Open official source ↗');
    link.href = entry.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    sourceBlock.appendChild(link);
    blocks.appendChild(sourceBlock);
    detail.appendChild(blocks);
    detail.appendChild(node('p','modality-detail-warning',entry.contentAvailable ? strings.currentWarning : strings.warning));
  }
  function render() {
    const lang = language(), strings = copy[lang], entries = catalog.list();
    const count = entries.filter(function (entry) { return catalog.isAvailable(entry.id); }).length;
    const header = node('div','modality-catalog-heading');
    const heading = node('div','modality-catalog-heading-copy');
    heading.appendChild(node('span','modality-catalog-kicker',strings.kicker));
    const h2 = node('h2','',strings.title);
    h2.id = 'modality-catalog-title';
    heading.appendChild(h2);
    heading.appendChild(node('p','',strings.intro));
    header.appendChild(heading);
    header.appendChild(node('span','modality-catalog-count',lang === 'fa' ? ('۱ مسیر فعال از ۴') : (count + ' active of ' + entries.length)));
    const grid = node('div','modality-grid');
    grid.setAttribute('role','list');
    entries.forEach(function (entry) {
      const card = node('article','modality-card');
      card.dataset.status = entry.status;
      card.dataset.modalityId = entry.id;
      card.setAttribute('role','listitem');
      const top = node('div','modality-card-top');
      top.appendChild(node('span','modality-glyph',entry.shortLabel));
      top.appendChild(node('span','modality-status',statusLabel(entry,strings)));
      card.appendChild(top);
      card.appendChild(node('h3','',lang === 'fa' ? entry.titleFa : entry.titleEn));
      card.appendChild(node('p','modality-subtitle',lang === 'fa' ? entry.subtitleFa : entry.subtitleEn));
      card.appendChild(node('p','modality-summary',lang === 'fa' ? entry.summaryFa : entry.summaryEn));
      const action = node('button','modality-card-action',entry.viewerAvailable ? strings.action.localViewer : (strings.action[entry.status] || strings.action.blocked));
      action.type = 'button';
      action.dataset.modalitySelect = entry.id;
      action.setAttribute('aria-expanded',selectedId === entry.id ? 'true' : 'false');
      action.setAttribute('aria-controls','modality-detail');
      card.appendChild(action);
      grid.appendChild(card);
    });
    mount.replaceChildren(header,grid);
    detail.hidden = !selectedId;
    detail.replaceChildren();
    if (selectedId) {
      const entry = catalog.getById(selectedId);
      if (!entry) { selectedId = null; detail.hidden = true; return; }
      renderDetail(entry,strings,lang);
    }
  }
  mount.addEventListener('click',function (event) {
    const button = event.target.closest('[data-modality-select]');
    if (!button) return;
    const entry = catalog.getById(button.dataset.modalitySelect);
    if (!entry) return;
    if (catalog.isAvailable(entry.id)) {
      selectedId = null;
      render();
      const workspace = document.getElementById('workspace');
      if (workspace) workspace.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    selectedId = entry.id;
    render();
    detail.scrollIntoView({behavior:'smooth',block:'nearest'});
    if (entry.viewerAvailable && window.CTEduRadiographViewer) {
      window.CTEduRadiographViewer.open();
      const radioPanel = document.getElementById('radiograph-workspace');
      if (radioPanel) radioPanel.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
  detail.addEventListener('click',function (event) {
    if (!event.target.closest('[data-modality-close]')) return;
    selectedId = null;
    render();
  });
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function () { render(); });
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }
  render();
}());
