const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = function (name) { return fs.readFileSync(path.join(root, name), 'utf8'); };

test('public production deployment remains fail-closed while the guided-case preview is separate', function () {
  const releaseWorkflow = read('.github/workflows/pages-deploy.yml');
  const previewWorkflow = read('.github/workflows/preview-guided-cases.yml');
  const gates = read('RELEASE_GATES.md');
  const readme = read('README.md');

  assert.match(
    releaseWorkflow,
    /if: github\.ref == 'refs\/heads\/main' && vars\.CT_EDU_PUBLIC_RELEASE_APPROVED == 'true'/,
    'the root production site must not deploy until the explicit approval variable is set'
  );
  assert.match(previewWorkflow, /branches:\s*\n\s*- "main"/,
    'the preview workflow should deploy only from the main branch');
  assert.match(previewWorkflow, /BASE_SHA: a54bc01bdbda0ae2509f1e44a9f50d14c0371676/,
    'the preview workflow should deliberately preserve the reviewed stable root baseline');
  assert.match(previewWorkflow, /preview\/cases\.html/,
    'the current guided-case UI should be deployed under its separate preview path');
  assert.match(previewWorkflow, /preview\/index\.html/,
    'the stable homepage should link to a preview hub that lists both learning workspaces');
  assert.match(previewWorkflow, /fetch_with_retry "\$base\/preview\/index\.html" 'preview-hub-title'/,
    'the deployed preview hub should be checked after publication');
  assert.match(previewWorkflow, /cp abdomen-series\.html "\$preview\/abdomen-series\.html"/);
  assert.match(previewWorkflow, /cp src\/data\/wikimedia-abdomen-series\.js "\$preview\/src\/data\/wikimedia-abdomen-series\.js"/);
  assert.match(previewWorkflow, /fetch_with_retry "\$base\/preview\/abdomen-series\.html"/);
  assert.match(previewWorkflow, /fetch_with_retry "\$base\/preview\/src\/data\/wikimedia-abdomen-series\.js"/);
  assert.match(readme, /https:\/\/ardkam\.github\.io\/CT_edu\/preview\/cases\.html/);
  assert.match(readme, /https:\/\/ardkam\.github\.io\/CT_edu\/preview\/index\.html/);
  assert.match(gates, /Base revision inspected for this status update: `main @ d0b1cb71cf80d3c1735b2b891ac2e50375434233`/);
  assert.match(gates, /No radiologist\/anatomy-educator approval/);
  assert.match(gates, /Promote the guided-case workspace to the root production experience only after/);
  assert.match(gates, /Implement the guided-case workflow scaffold/);
  assert.doesNotMatch(gates, /guided-case workspace is being added on a feature branch/i,
    'release status must not imply that the already-merged workspace remains on a feature branch');
});

test('preview deployment cannot overwrite production after release approval is enabled', function () {
  const releaseWorkflow = read('.github/workflows/pages-deploy.yml');
  const previewWorkflow = read('.github/workflows/preview-guided-cases.yml');
  const previewDeployJob = previewWorkflow.slice(previewWorkflow.indexOf('  deploy-preview:'));

  assert.ok(
    previewDeployJob.includes("if: vars.CT_EDU_PUBLIC_RELEASE_APPROVED != 'true'"),
    'the preview job must stop publishing when the production release latch is enabled'
  );
  assert.ok(
    releaseWorkflow.includes("if: github.ref == 'refs/heads/main' && vars.CT_EDU_PUBLIC_RELEASE_APPROVED == 'true'"),
    'the production job remains the sole deployment path after approval'
  );
});
