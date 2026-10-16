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

test('core CT navigation controls provide 44px targets on narrow screens', function () {
  assert.ok(css.includes('.plane-tab { min-height:44px; }'));
  assert.ok(css.includes('.slice-nav-controls { grid-template-columns:44px minmax(0,1fr) 44px; gap:8px; }'));
  assert.ok(css.includes('.slice-step-button { width:44px; height:44px; min-width:44px; min-height:44px; }'));
  assert.ok(css.includes('.tri-return-button,\n  .window-level-reset,\n  .level-button { min-height:44px; }'));
  assert.ok(css.includes('.switch-row { min-height:44px; }'));
});

test('mobile navigation, filters, and report actions keep minimum touch height', function () {
  assert.ok(css.includes('.language-toggle { min-height:44px; }'));
  assert.ok(css.includes('min-height:44px;\n    padding-inline:5px;'));
  assert.ok(css.includes('.guided-case-filters select { min-height:44px; }'));
  assert.ok(css.includes('.guided-primary-button,\n  .guided-secondary-button,\n  .bookmark-save-button,'));
});

test('compact mobile zoom controls remain large enough for touch', function () {
  assert.ok(css.includes('width:36px;\n    height:36px;\n    min-width:36px;\n    min-height:36px;'));
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

  assert.ok(css.includes('.bookmark-row-actions button { min-height:44px; }'));
  assert.ok(css.includes('.window-level-reset { height:auto; min-height:44px; }'));
});
