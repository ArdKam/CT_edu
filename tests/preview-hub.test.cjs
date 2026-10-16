const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8'); };

test('preview hub exposes both learning workspaces without claiming clinical approval', function () {
  const html = read('preview/index.html');
  const css = read('preview/preview.css');
  const js = read('preview/preview-hub.js');
  assert.match(html, /lang="fa" dir="rtl"/);
  assert.match(html, /id="preview-language-toggle"/);
  assert.match(html, /href="\.\/cases\.html"/);
  assert.match(html, /href="\.\/abdomen-series\.html"/);
  assert.match(html, /Abdomen &amp; pelvis image stacks/);
  assert.match(html, /not diagnostic|not a diagnostic/i);
  assert.match(html, /not a 3D volume|not synchronized reformats/i);
  assert.match(html, /src="\.\/preview-hub\.js"/);
  assert.match(html, /href="\.\.\/src\/styles\.css"/);
  assert.match(html, /href="\.\.\/favicon\.svg"/);
  assert.match(css, /preview-hub-grid/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(js, /Switch language to Persian/);
  assert.match(js, /classList\.toggle\('lang-en'/);
  assert.doesNotMatch(js, /\binnerHTML\b/);
});

test('preview workflow publishes both pages and verifies the image-stack route without unlocking production', function () {
  const workflow = read('.github/workflows/preview-guided-cases.yml');
  const mainWorkflow = read('.github/workflows/pages-deploy.yml');
  assert.match(workflow, /cp preview\/index\.html preview\/preview\.css preview\/preview-hub\.js "\$preview\//);
  assert.match(workflow, /cp abdomen-series\.html "\$preview\/abdomen-series\.html"/);
  assert.match(workflow, /cp src\/abdomen-series\.js "\$preview\/src\/abdomen-series\.js"/);
  assert.match(workflow, /cp src\/data\/wikimedia-abdomen-series\.js "\$preview\/src\/data\/wikimedia-abdomen-series\.js"/);
  assert.match(workflow, /fetch_with_retry "\$base\/preview\/index\.html"/);
  assert.match(workflow, /fetch_with_retry "\$base\/preview\/abdomen-series\.html"/);
  assert.match(workflow, /href="\.\/preview\/index\.html"/);
  assert.match(workflow, /Learning previews/);
  assert.match(workflow, /if: vars\.CT_EDU_PUBLIC_RELEASE_APPROVED != 'true'/);
  assert.match(mainWorkflow, /if: github\.ref == 'refs\/heads\/main' && vars\.CT_EDU_PUBLIC_RELEASE_APPROVED == 'true'/);
});
