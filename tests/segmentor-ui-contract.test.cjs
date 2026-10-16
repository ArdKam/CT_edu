const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('Segmentor is isolated in the preview workflow and loads its own modules in dependency order',()=>{
  const html=read('preview/segmentor.html');
  const hub=read('preview/index.html');
  assert.match(hub,/segmentor\.html/);
  assert.match(html,/lang="fa" dir="rtl"/);
  assert.match(html,/Educational draft|بازبینی‌نشده/);
  assert.match(html,/img-src[^"]*upload\\.wikimedia\\.org/);
  assert.match(html,/img-src[^"]*commons\\.wikimedia\\.org/);
  assert.match(html,/../);
  const scripts=[ '../src/data/wikimedia-abdomen-series.js','../src/segmentor/source-metadata.js','../src/segmentor/geometry.js','../src/segmentor/annotation-schema.js','../src/segmentor/annotation-store.js','../src/segmentor/editor.js' ];
  let last=-1;
  scripts.forEach(src=>{const next=html.indexOf('src="'+src+'"');assert.ok(next>last,'script order: '+src);last=next;});
  assert.match(html,/id="segmentor-overlay"/);
  assert.match(html,/id="segmentor-import-preview"/);
  assert.match(html,/Save draft|ذخیرهٔ پیش‌نویس/);
  assert.match(html,/Export JSON|خروجی JSON/);
});

test('manual annotation source profile crops the fixed locator panel and fails closed on unknown dimensions',()=>{
  const metadata=read('src/segmentor/source-metadata.js');
  assert.match(metadata,/expectedWidth: 786/);
  assert.match(metadata,/expectedHeight: 512/);
  assert.match(metadata,/width:530,height:512/);
  assert.match(metadata,/supportsAnnotation/);
  assert.match(metadata,/dimension-gated/);
  const editor=read('src/segmentor/editor.js');
  assert.match(editor,/getScreenCTM/);
  assert.match(editor,/clientToNative/);
  assert.match(editor,/fitCanvas/);
  assert.match(editor,/reference-panel boundary is uncertain|reference panel is uncertain|reference-panel boundary/);
  assert.match(editor,/currentSource\.id/);
  assert.match(html,/segmentor-vertex-x/);
  assert.match(html,/segmentor-add-coordinate-vertex/);
  assert.match(html,/segmentor-clear-image/);
  assert.match(html,/segmentor-retry/);
  assert.match(editor,/token!==requestToken/);
});

test('manual editing supports drafts, undo/redo, polygon cancellation, explicit import merge/replacement and local-only storage',()=>{
  const html=read('preview/segmentor.html');
  const js=read('src/segmentor/editor.js');
  const store=read('src/segmentor/annotation-store.js');
  for(const id of ['segmentor-mode-draw','segmentor-mode-select','segmentor-mode-pan','segmentor-close-polygon','segmentor-cancel-polygon','segmentor-undo','segmentor-redo','segmentor-update-annotation','segmentor-delete-annotation','segmentor-export','segmentor-import-merge','segmentor-import-replace'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(js,/reviewStatus:'draft'/);
  assert.match(js,/pointercancel/);
  assert.match(js,/ResizeObserver/);
  assert.match(js,/window\.confirm/);
  assert.match(js,/schema\.validateProject/);
  assert.match(js,/store\.saveImage/);
  assert.match(store,/IndexedDB is unavailable/);
  assert.match(store,/Annotation ID conflict/);
  assert.doesNotMatch(js,/\binnerHTML\b/);
  assert.doesNotMatch(store,/\binnerHTML\b/);
});

test('preview and annotation source remain explicit about separate non-volume image stacks and non-diagnostic use',()=>{
  const html=read('preview/segmentor.html');
  assert.match(html,/not a verified DICOM volume|not a verified DICOM/i);
  assert.match(html,/not a diagnostic tool|تشخیصی نیست/);
  assert.match(html,/reviewed|بازبینی‌نشده/);
  assert.match(html,/This browser only|فقط این مرورگر/);
  const workflow=read('.github/workflows/test.yml');
  assert.match(workflow,/segmentor-browser-smoke\.cjs/);
  const previewWorkflow=read('.github/workflows/preview-guided-cases.yml');
  assert.ok(previewWorkflow.includes('cp preview/segmentor.html'));
  assert.ok(previewWorkflow.includes('cp src/segmentor/*.js'));
  assert.ok(previewWorkflow.includes('preview/segmentor.html'));
  assert.ok(previewWorkflow.includes("CT_EDU_PUBLIC_RELEASE_APPROVED != 'true'"));
});