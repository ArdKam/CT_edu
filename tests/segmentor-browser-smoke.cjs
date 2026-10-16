const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.route('**/*axial_plane_*.png*',route=>{
    const url=route.request().url();
    if(url.includes('axial_plane_163.png')) return route.abort();
    const width=url.includes('axial_plane_162.png')?1200:786;
    return route.fulfill({
      status:200,contentType:'image/svg+xml',
      body:'<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="346" viewBox="0 0 '+width+' 346"><rect width="530" height="346" fill="#20262b"/><ellipse cx="265" cy="174" rx="190" ry="145" fill="#777"/><circle cx="265" cy="174" r="50" fill="#ddd"/><rect x="530" width="'+(width-530)+'" height="346" fill="#efefef"/><path d="M540 20H'+(width-10)+'V330H540Z" fill="#aaa"/></svg>'
    });
  });
  await page.goto('http://127.0.0.1:8765/preview/segmentor.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('segmentor-image')?.naturalWidth===786,{timeout:15000});
  await page.waitForFunction(()=>document.getElementById('segmentor-movable')?.hidden===false,{timeout:15000});
  assert.equal(await page.locator('#segmentor-fallback-image').isHidden(),true,'known layout must enable the axial CT crop');
  assert.equal(await page.locator('#segmentor-stage').evaluate(el=>el.dataset.mode||'select'),'select');
  await page.locator('#segmentor-mode-draw').click();
  async function clickNative(point) {
    const screen=await page.locator('#segmentor-overlay').evaluate((svg,p)=>{
      const m=svg.getScreenCTM();return {x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f};
    },point);
    await page.mouse.click(screen.x,screen.y);
  }
  await clickNative({x:100,y:100});
  await clickNative({x:220,y:100});
  await clickNative({x:220,y:220});
  await page.locator('#segmentor-close-polygon').click();
  assert.equal(await page.locator('#segmentor-overlay path.segmentor-polygon').count(),1,'closing a valid polygon should add one annotation');
  await page.locator('#segmentor-save').click();
  await page.waitForFunction(()=>document.getElementById('segmentor-save-state')?.dataset.state==='saved',{timeout:10000});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('segmentor-movable')?.hidden===false,{timeout:15000});
  assert.equal(await page.locator('#segmentor-overlay path.segmentor-polygon').count(),1,'saved annotation should reload from IndexedDB');
  await page.locator('#segmentor-overlay path.segmentor-polygon').first().click({position:{x:100,y:50}});
  assert.equal(await page.locator('#segmentor-overlay circle.segmentor-vertex-handle').count(),3,'selected polygon exposes editable vertices');
  async function assertVertexAligned() {
    const delta=await page.locator('#segmentor-overlay circle.segmentor-vertex-handle').first().evaluate(circle=>{
      const svg=circle.ownerSVGElement, m=svg.getScreenCTM();
      const x=Number(circle.getAttribute('cx')),y=Number(circle.getAttribute('cy'));
      const point={x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};
      const rect=circle.getBoundingClientRect();
      return Math.max(Math.abs(point.x-(rect.left+rect.width/2)),Math.abs(point.y-(rect.top+rect.height/2)));
    });
    assert.ok(delta<1.5,'SVG vertex and native-coordinate transform must align; delta='+delta);
  }
  await assertVertexAligned();
  await page.locator('#segmentor-zoom-in').click();
  await assertVertexAligned();
  await page.locator('#segmentor-mode-pan').click();
  const before=await page.locator('#segmentor-movable').evaluate(el=>el.style.getPropertyValue('--pan-x'));
  const stage=await page.locator('#segmentor-overlay').boundingBox();
  await page.mouse.move(stage.x+stage.width/2,stage.y+stage.height/2);
  await page.mouse.down();await page.mouse.move(stage.x+stage.width/2+35,stage.y+stage.height/2+20);await page.mouse.up();
  const after=await page.locator('#segmentor-movable').evaluate(el=>el.style.getPropertyValue('--pan-x'));
  assert.notEqual(after,before,'pan gesture should move the shared image/overlay wrapper');
  await assertVertexAligned();
  await page.locator('#segmentor-mode-draw').click();
  await clickNative({x:300,y:280});
  assert.equal(await page.locator('#segmentor-overlay path.segmentor-active-contour').count(),1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#segmentor-overlay path.segmentor-active-contour').count(),0,'Escape cancels the unfinished contour');
  for(const [x,y] of [[300,280],[350,280],[350,330]]){
    await page.locator('#segmentor-vertex-x').fill(String(x));
    await page.locator('#segmentor-vertex-y').fill(String(y));
    await page.locator('#segmentor-add-coordinate-vertex').click();
  }
  await page.locator('#segmentor-close-polygon').click();
  assert.equal(await page.locator('#segmentor-overlay path.segmentor-polygon').count(),2,'keyboard coordinate entry should create a native-pixel polygon');
  await page.locator('#segmentor-save').click();
  await page.waitForFunction(()=>document.getElementById('segmentor-save-state')?.dataset.state==='saved',{timeout:10000});
  await page.locator('#segmentor-language-toggle').click();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('html').getAttribute('dir'),'ltr');
  await page.locator('#segmentor-language-toggle').click();
  assert.equal(await page.locator('html').getAttribute('lang'),'fa');
  assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
  await page.locator('#segmentor-image-index').evaluate(input=>{input.value='161';input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>document.getElementById('segmentor-image-index')?.value==='161'&&document.getElementById('segmentor-movable')?.hidden===false,{timeout:15000});
  assert.equal(await page.locator('#segmentor-overlay path.segmentor-polygon').count(),0,'annotations must not bleed to a different source image');
  await page.locator('#segmentor-image-index').evaluate(input=>{input.value='162';input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>document.getElementById('segmentor-fallback-image')?.hidden===false,{timeout:15000});
  assert.equal(await page.locator('#segmentor-save').isDisabled(),true,'unknown composite dimensions must disable editing and saving');
  await page.locator('#segmentor-image-index').evaluate(input=>{input.value='163';input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>document.getElementById('segmentor-image-state')?.dataset.state==='error',{timeout:15000});
  assert.equal(await page.locator('#segmentor-retry').isVisible(),true,'failed image loads expose a retry action');
  await page.locator('#segmentor-image-index').evaluate(input=>{input.value='160';input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>document.getElementById('segmentor-image-index')?.value==='160'&&document.getElementById('segmentor-movable')?.hidden===false,{timeout:15000});
  assert.equal(await page.locator('#segmentor-overlay path.segmentor-polygon').count(),2,'returning to the exact source identity restores annotations');
  await page.locator('#segmentor-overlay path.segmentor-polygon').first().click({position:{x:100,y:50}});
  assert.equal(await page.locator('#segmentor-overlay circle.segmentor-vertex-handle').count(),3,'returning to an image requires explicit annotation selection before vertex handles appear');
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(120);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile Segmentor page must not overflow horizontally');
  await assertVertexAligned();
  assert.deepEqual(pageErrors,[],'browser page should have no uncaught JavaScript errors');
  await browser.close();
  console.log('Segmentor browser smoke passed: crop guard, create/save/reload, SVG alignment under zoom/pan/resize, image identity, keyboard cancellation and bilingual direction.');
})().catch(error=>{console.error(error);process.exitCode=1;});