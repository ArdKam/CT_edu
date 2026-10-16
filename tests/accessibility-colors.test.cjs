const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'styles.css'), 'utf8');
const rootTokens = (css.match(/:root\s*\{([^}]*)\}/i) || [])[1];

function token(name) {
  assert.ok(rootTokens, 'the stylesheet must declare a root design-token block');
  const match = rootTokens.match(new RegExp('(?:^|;)--' + name + ':(#[0-9a-f]{6})(?:;|$)', 'i'));
  assert.ok(match, 'missing six-digit design token --' + name);
  return match[1];
}

function luminance(hex) {
  const rgb = [1, 3, 5].map(function (offset) {
    return parseInt(hex.slice(offset, offset + 2), 16) / 255;
  }).map(function (channel) {
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrastRatio(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('primary light-theme text tokens meet WCAG AA contrast on paper and white surfaces', function () {
  const paper = token('paper');
  const white = '#ffffff';

  for (const [name, foreground] of [
    ['ink', token('ink')],
    ['muted', token('muted')],
    ['teal', token('teal')]
  ]) {
    for (const [surfaceName, background] of [['paper', paper], ['white', white]]) {
      const ratio = contrastRatio(foreground, background);
      assert.ok(
        ratio >= 4.5,
        '--' + name + ' must have at least 4.5:1 contrast on ' + surfaceName + ' (got ' + ratio.toFixed(2) + ':1)'
      );
    }
  }
});

test('focus indicators meet a 3:1 contrast floor and share the focus token', function () {
  const focus = token('focus');
  const paper = token('paper');
  const white = '#ffffff';

  for (const [surfaceName, background] of [['paper', paper], ['white', white]]) {
    const ratio = contrastRatio(focus, background);
    assert.ok(
      ratio >= 3,
      '--focus must have at least 3:1 contrast on ' + surfaceName + ' (got ' + ratio.toFixed(2) + ':1)'
    );
  }

  assert.match(css, /button:focus-visible,[^}]*outline:3px solid var\(--focus\)/);
  assert.match(css, /\.switch-row input:focus-visible\+\.switch-ui\{outline:3px solid var\(--focus\)/);
});

test('viewer control labels do not regress to the previous low-contrast light-theme colors', function () {
  for (const legacyColor of ['#56a9a2', '#2c8985', '#879594', '#a6b2b0', '#a2acac', '#7c8a8d', '#398c86', '#478f89']) {
    assert.doesNotMatch(css, new RegExp(legacyColor, 'i'), 'legacy low-contrast color remains: ' + legacyColor);
  }
});
