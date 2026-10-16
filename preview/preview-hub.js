(function () {
  'use strict';
  const button = document.getElementById('preview-language-toggle');
  if (!button) return;
  function applyLanguage(lang) {
    const en = lang === 'en';
    document.documentElement.lang = en ? 'en' : 'fa';
    document.documentElement.dir = en ? 'ltr' : 'rtl';
    document.body.classList.toggle('lang-fa', !en);
    document.body.classList.toggle('lang-en', en);
    button.textContent = en ? 'فا ↔ EN' : 'EN ↔ فا';
    button.setAttribute('aria-label', en ? 'Switch language to Persian' : 'تغییر زبان به انگلیسی');
  }
  button.addEventListener('click', function () {
    applyLanguage(document.documentElement.lang === 'fa' ? 'en' : 'fa');
  });
}());
