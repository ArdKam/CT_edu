const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'styles.css'), 'utf8');

test('reduced-motion preference disables app-wide smooth scrolling and nonessential transitions', function () {
  const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.notEqual(start, -1, 'a prefers-reduced-motion media query must exist');
  const rule = css.slice(start, start + 900);

  assert.match(rule, /html\s*\{\s*scroll-behavior:auto\s*!important;/);
  assert.match(rule, /\*::before/);
  assert.match(rule, /\*::after/);
  assert.match(rule, /animation-duration:\.01ms\s*!important/);
  assert.match(rule, /animation-iteration-count:1\s*!important/);
  assert.match(rule, /transition-duration:\.01ms\s*!important/);
});

test('core CT navigation controls provide larger touch targets on narrow screens', function () {
  assert.match(css, /@media\s*\(max-width:780px\)[\s\S]*?\.plane-tab\s*\{\s*min-height:44px;/);
  assert.match(css, /\.slice-nav-controls\s*\{\s*grid-template-columns:44px minmax\\(0,1fr\\) 44px;\s*gap:8px;/);
  assert.match(css, /\.slice-step-button\s*\{\s*width:40px;\s*height:40px;\s*min-width:40px;\s*min-height:40px;/);
  assert.match(css, /\.mode-tab,[\s\S]*?\.tri-return-button\s*\{\s*min-height:40px;/);
});

test('mobile navigation, filters, and report actions keep minimum touch height', function () {
  assert.match(css, /\.language-toggle\s*\{\s*min-height:44px;/);
  assert.match(css, /\.case-library-link,[\s\S]*?\.case-library-home\s*\{[\s\S]*?min-height:44px;/);
  assert.match(css, /\.guided-case-filters input,[\s\S]*?\.guided-case-filters select\s*\{\s*min-height:44px;/);
  assert.match(css, /\.guided-form-actions button,[\s\S]*?\.guided-secondary-button\s*\{\s*min-height:44px;/);
});

test('compact mobile zoom controls remain larger than the previous 24x25 pixel targets', function () {
  assert.match(css, /@media\s*\(max-width:420px\)\s*\{\s*\.zoom-controls button\s*\{\s*width:32px;\s*height:32px;\s*min-width:32px;\s*min-height:32px;/);
});

test('secondary mobile controls also retain a 44px minimum target', function () {
  for (const selector of [
    '.bookmark-save-button',
    '.bookmark-toolbar .progress-reset',
    '.bookmark-row-actions .progress-reset',
    '.progress-actions .progress-reset',
    '.radiograph-tool-button',
    '.radiograph-file-label',
    '.radiograph-close',
    '.modality-detail-close',
    '.modality-card-action',
    '.bookmark-row-actions button'
  ]) {
    assert.ok(css.includes(selector), 'missing mobile touch rule for ' + selector);
  }
  assert.match(css, /\.bookmark-save-button,[\s\S]*?\.bookmark-row-actions button\s*\{\s*min-height:44px;/);
  assert.match(css, /\.window-level-reset\s*\{\s*height:auto;\s*min-height:44px;/);
  assert.match(css, /\.switch-row\s*\{\s*min-height:44px;/);
});
