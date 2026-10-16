(function () {
  'use strict';
  const series=window.CTEduWikimediaAbdomenSeries, profile=window.CTEduSegmentorSourceMetadata;
  const geometry=window.CTEduSegmentorGeometry, schema=window.CTEduSegmentorSchema, storeApi=window.CTEduSegmentorStore;
  if (!series || !profile || !geometry || !schema || !storeApi) return;
  const byId=id=>document.getElementById(id);
  const ids={
    stage:'segmentor-stage',movable:'segmentor-movable',clip:'segmentor-ct-clip',image:'segmentor-image',overlay:'segmentor-overlay',
    fallback:'segmentor-fallback-image',state:'segmentor-image-state',index:'segmentor-image-index',save:'segmentor-save',
    saveState:'segmentor-save-state',feedback:'segmentor-feedback',language:'segmentor-language-toggle'
  };
  const el={}; Object.keys(ids).forEach(key=>el[key]=byId(ids[key]));
  const store=storeApi.createStore();
  const MIN_ZOOM=0.75, MAX_ZOOM=3;
  let language='fa',index=159,requestToken=0,currentSource=null,currentRecord=null,annotations=[],structures=[],activeStructureId='structure-unclassified';
  let activePoints=null,selectedAnnotationId=null,mode='select',dirty=false,saveAvailable=true,importCandidate=null,history=[],future=[];
  let fitScale=1,zoom=1,panX=0,panY=0,dragState=null,vertexDrag=null,resizeObserver=null,projectSnapshot=null;
  const svgNS='http://www.w3.org/2000/svg';
  const t=(fa,en)=>language==='fa'?fa:en;
  const makeId=(tag)=>document.createElementNS(svgNS,tag);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const currentUrl=()=>series.getImageUrl(index,'axial');
  const selectedAnnotation=()=>annotations.find(item=>item.id===selectedAnnotationId)||null;
  function say(messageFa,messageEn,kind) {
    el.feedback.textContent=t(messageFa,messageEn);
    el.feedback.dataset.kind=kind||'info';
  }
  function setSaveStatus(fa,en,kind) {
    el.saveState.replaceChildren();
    const dot=document.createElement('span'); dot.className='segmentor-state-dot';
    const text=document.createElement('span'); text.textContent=t(fa,en);
    el.saveState.append(dot,text); el.saveState.dataset.state=kind||'info';
  }
  function setPageLanguage(next) {
    language=next==='en'?'en':'fa';
    document.documentElement.lang=language;
    document.documentElement.dir=language==='fa'?'rtl':'ltr';
    document.body.classList.toggle('lang-fa',language==='fa');
    document.body.classList.toggle('lang-en',language==='en');
    el.language.textContent=language==='fa'?'EN ↔ فا':'فا ↔ EN';
    el.language.setAttribute('aria-label',t('تغییر زبان به انگلیسی','Switch language to Persian'));
    byId('segmentor-previous').setAttribute('aria-label',t('تصویر قبلی','Previous image'));
    byId('segmentor-next').setAttribute('aria-label',t('تصویر بعدی','Next image'));
    byId('segmentor-zoom-out').setAttribute('aria-label',t('کوچک‌نمایی','Zoom out'));
    byId('segmentor-zoom-in').setAttribute('aria-label',t('بزرگ‌نمایی','Zoom in'));
    updateLabels(); renderList(); renderOverlay(); updateModeControls();
  }
  function updateLabels() {
    const number=String(index+1), total=String(series.planeCounts.axial);
    el.index.value=number;
    el.image.alt=t('تصویر محوری '+number+' از '+total,'Axial CT image '+number+' of '+total);
    byId('segmentor-zoom-value').textContent=Math.round(zoom*100)+'%';
    byId('segmentor-annotation-count').textContent=String(annotations.length);
    byId('segmentor-previous').disabled=index<=0;
    byId('segmentor-next').disabled=index>=series.planeCounts.axial-1;
    byId('segmentor-save').disabled=!saveAvailable||!currentSource;
    byId('segmentor-undo').disabled=history.length===0&&(!activePoints||activePoints.length===0);
    byId('segmentor-redo').disabled=future.length===0;
  }
  function recordSnapshot() {
    history.push(JSON.stringify(annotations));
    if (history.length>100) history.shift();
    future=[];
    updateLabels();
  }
  function markDirty() {
    dirty=true;
    setSaveStatus('تغییرات ذخیره‌نشده','Unsaved changes','dirty');
    updateLabels();
  }
  function checkLeave() {
    const hasActiveDrawing=!!(activePoints&&activePoints.length);
    if(!dirty&&!hasActiveDrawing)return true;
    const message=dirty&&hasActiveDrawing
      ? t('ترسیم ناتمام و تغییرات ذخیره‌نشده از دست می‌روند. بدون ذخیره ادامه می‌دهی؟','The unfinished contour and unsaved edits will be lost. Continue without saving?')
      : hasActiveDrawing
        ? t('ترسیم چندضلعی هنوز تمام نشده است. آن را لغو و ادامه می‌دهی؟','The polygon is unfinished. Cancel the drawing and continue?')
        : t('تغییرات این تصویر ذخیره نشده‌اند. بدون ذخیره ادامه می‌دهی؟','This image has unsaved edits. Leave without saving?');
    const approved=window.confirm(message);
    if(approved){dirty=false;activePoints=null;selectedAnnotationId=null;}
    return approved;
  }
  function setImageState(state,fa,en) {
    el.state.hidden=state==='ready';
    el.state.dataset.state=state;
    const retryButton=byId('segmentor-retry');
    if(retryButton)retryButton.hidden=state!=='error';
    const label=el.state.querySelector('strong');
    if (label) label.textContent=t(fa,en);
    const loader=el.state.querySelector('.series-loader');
    if (loader) loader.hidden=state!=='loading';
  }
  function resetTransform() { zoom=1;panX=0;panY=0;applyTransform(); }
  function applyTransform() {
    el.movable.style.setProperty('--pan-x',panX+'px');
    el.movable.style.setProperty('--pan-y',panY+'px');
    el.movable.style.setProperty('--zoom',String(zoom));
    byId('segmentor-zoom-value').textContent=Math.round(zoom*100)+'%';
    el.image.style.cursor=mode==='pan'?'grab':'crosshair';
  }
  function fitCanvas(preserveView) {
    if (!currentSource || !currentSource.region || !el.stage.clientWidth || !el.stage.clientHeight) return;
    const previous=fitScale;
    const availWidth=Math.max(80,el.stage.clientWidth-48), availHeight=Math.max(80,el.stage.clientHeight-48);
    fitScale=Math.min(availWidth/currentSource.region.width,availHeight/currentSource.region.height);
    const clipWidth=currentSource.region.width*fitScale,clipHeight=currentSource.region.height*fitScale;
    el.movable.style.width=clipWidth+'px';el.movable.style.height=clipHeight+'px';
    el.clip.style.width=clipWidth+'px';el.clip.style.height=clipHeight+'px';
    el.image.style.width=(currentSource.width*fitScale)+'px';el.image.style.height=(currentSource.height*fitScale)+'px';
    el.overlay.style.width=clipWidth+'px';el.overlay.style.height=clipHeight+'px';
    el.overlay.setAttribute('viewBox','0 0 '+currentSource.region.width+' '+currentSource.region.height);
    el.overlay.setAttribute('preserveAspectRatio','none');
    if (preserveView && previous>0) { const ratio=fitScale/previous;panX*=ratio;panY*=ratio; }
    else {panX=0;panY=0;zoom=1;}
    applyTransform();
    renderOverlay();
  }
  function nativePoint(event) {
    const matrix=el.overlay.getScreenCTM();
    if (!matrix) return null;
    const point=geometry.clientToNative(event.clientX,event.clientY,{a:matrix.a,b:matrix.b,c:matrix.c,d:matrix.d,e:matrix.e,f:matrix.f});
    if (!point || !geometry.insideRegion(point,currentSource.region,0)) return null;
    return {x:Math.round(point.x*100)/100,y:Math.round(point.y*100)/100};
  }
  function colourFor(annotation) {
    const structure=structures.find(s=>s.id===annotation.structureId);
    return annotation.color|| (structure&&structure.color)||'#f2b84b';
  }
  function polygonPath(points,close) {
    if (!points.length) return '';
    return 'M '+points.map(p=>p.x+' '+p.y).join(' L ')+(close?' Z':'');
  }
  function renderOverlay() {
    if (!currentSource || !el.overlay || !el.overlay.ownerDocument) return;
    while (el.overlay.firstChild) el.overlay.removeChild(el.overlay.firstChild);
    annotations.forEach(annotation=>{
      const group=makeId('g');group.setAttribute('data-annotation-id',annotation.id);
      const color=colourFor(annotation),path=makeId('path');
      path.setAttribute('d',polygonPath(annotation.points,true));path.setAttribute('fill',color+'28');path.setAttribute('stroke',color);
      path.setAttribute('stroke-width',String(selectedAnnotationId===annotation.id?2.5:1.8));path.setAttribute('vector-effect','non-scaling-stroke');
      path.setAttribute('class','segmentor-polygon');path.setAttribute('tabindex','0');path.setAttribute('role','button');
      path.setAttribute('aria-label',annotation.displayName||((structures.find(s=>s.id===annotation.structureId)||{}).name)||t('حاشیه‌نویسی','Annotation'));
      path.addEventListener('click',event=>{if(mode==='select'){event.stopPropagation();selectAnnotation(annotation.id);}});
      path.addEventListener('keydown',event=>{if(mode==='select'&&(event.key==='Enter'||event.key===' ')){event.preventDefault();selectAnnotation(annotation.id);}});
      group.appendChild(path);
      if (annotation.labelPoint) {
        const label=makeId('text');label.setAttribute('x',annotation.labelPoint.x);label.setAttribute('y',annotation.labelPoint.y);
        label.setAttribute('class','segmentor-svg-label');label.setAttribute('fill',color);label.textContent=annotation.displayName||((structures.find(s=>s.id===annotation.structureId)||{}).name)||'';
        group.appendChild(label);
      }
      if(selectedAnnotationId===annotation.id&&mode==='select') annotation.points.forEach((point,pointIndex)=>{
        const handle=makeId('circle');handle.setAttribute('cx',point.x);handle.setAttribute('cy',point.y);handle.setAttribute('r','4.5');
        handle.setAttribute('class','segmentor-vertex-handle');handle.setAttribute('tabindex','0');handle.setAttribute('role','button');
        handle.setAttribute('aria-label',t('ویرایش رأس '+(pointIndex+1),'Edit vertex '+(pointIndex+1)));
        handle.addEventListener('pointerdown',event=>startVertexDrag(event,annotation.id,pointIndex));
        handle.addEventListener('keydown',event=>moveVertexByKeyboard(event,annotation.id,pointIndex));
        group.appendChild(handle);
      });
      el.overlay.appendChild(group);
    });
    if(activePoints&&activePoints.length) {
      const path=makeId('path');path.setAttribute('d',polygonPath(activePoints,false));path.setAttribute('class','segmentor-active-contour');
      const structure=structures.find(s=>s.id===activeStructureId);
      path.setAttribute('stroke',structure?structure.color:'#f2b84b');el.overlay.appendChild(path);
      activePoints.forEach((point,i)=>{
        const dot=makeId('circle');dot.setAttribute('cx',point.x);dot.setAttribute('cy',point.y);dot.setAttribute('r',i===0?'5':'3.5');dot.setAttribute('class','segmentor-active-vertex');
        dot.setAttribute('fill',structure?structure.color:'#f2b84b');el.overlay.appendChild(dot);
      });
    }
  }
  function updateModeControls() {
    [['select','segmentor-mode-select'],['draw','segmentor-mode-draw'],['pan','segmentor-mode-pan']].forEach(([name,id])=>{
      byId(id).setAttribute('aria-pressed',mode===name?'true':'false');
    });
    byId('segmentor-close-polygon').disabled=mode!=='draw'||!activePoints||activePoints.length<3;
    byId('segmentor-cancel-polygon').disabled=!activePoints;
    el.overlay.style.cursor=mode==='draw'?'crosshair':mode==='pan'?'grab': 'default';
    el.overlay.style.pointerEvents=currentSource?'auto':'none';
    byId('segmentor-undo').disabled=history.length===0&&(!activePoints||activePoints.length===0);
    byId('segmentor-redo').disabled=future.length===0;
  }
  function renderStructureSelects() {
    const fields=[byId('segmentor-structure-select'),byId('segmentor-annotation-structure')];
    fields.forEach(select=>{
      const old=select.value;
      while(select.firstChild)select.removeChild(select.firstChild);
      structures.forEach(structure=>{
        const option=document.createElement('option');option.value=structure.id;option.textContent=structure.name;
        select.appendChild(option);
      });
      if(structures.some(s=>s.id===old))select.value=old;
    });
    if(structures.some(s=>s.id===activeStructureId))byId('segmentor-structure-select').value=activeStructureId;
  }
  function renderList() {
    const list=byId('segmentor-annotation-list');
    while(list.firstChild)list.removeChild(list.firstChild);
    if(!annotations.length) {
      const p=document.createElement('p');p.className='segmentor-empty-state';p.textContent=t('هنوز حاشیه‌نویسی‌ای وجود ندارد.','No annotations yet.');list.appendChild(p);
    } else annotations.forEach(annotation=>{
      const structure=structures.find(s=>s.id===annotation.structureId);
      const button=document.createElement('button');button.type='button';button.className='segmentor-annotation-item';
      if(annotation.id===selectedAnnotationId)button.classList.add('is-selected');
      const swatch=document.createElement('span');swatch.className='segmentor-annotation-swatch';swatch.style.backgroundColor=colourFor(annotation);
      const text=document.createElement('span');text.className='segmentor-annotation-copy';
      const strong=document.createElement('strong');strong.textContent=annotation.displayName||(structure&&structure.name)||t('بدون نام','Untitled');
      const small=document.createElement('small');small.textContent=t('پیش‌نویس · '+annotation.points.length+' رأس','Draft · '+annotation.points.length+' vertices');
      text.append(strong,small);button.append(swatch,text);
      button.addEventListener('click',()=>selectAnnotation(annotation.id));list.appendChild(button);
    });
    const selected=selectedAnnotation(),editor=byId('segmentor-selected-editor');
    editor.hidden=!selected;byId('segmentor-selected-empty').hidden=!!selected;
    if(selected) {
      byId('segmentor-annotation-name').value=selected.displayName||'';
      byId('segmentor-annotation-structure').value=selected.structureId;
      byId('segmentor-annotation-color').value=colourFor(selected);
    }
    updateLabels();
  }
  function selectAnnotation(id) {
    const annotation=annotations.find(item=>item.id===id);if(!annotation)return;
    selectedAnnotationId=id;renderOverlay();renderList();
  }
  function startVertexDrag(event,annotationId,pointIndex) {
    if(mode!=='select'||!event.isPrimary)return;
    event.preventDefault();event.stopPropagation();
    const point=annotations.find(a=>a.id===annotationId)?.points[pointIndex];if(!point)return;
    recordSnapshot();
    vertexDrag={annotationId,pointIndex,start:{x:point.x,y:point.y},pointerId:event.pointerId};
    try{event.target.setPointerCapture(event.pointerId);}catch(_){}
  }
  function moveVertexByKeyboard(event,annotationId,pointIndex) {
    if(mode!=='select'||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();
    const annotation=annotations.find(a=>a.id===annotationId),point=annotation&&annotation.points[pointIndex];
    if(!point)return;
    const before=clone(point),step=event.shiftKey?5:1;
    if(event.key==='ArrowUp')point.y-=step;if(event.key==='ArrowDown')point.y+=step;
    if(event.key==='ArrowLeft')point.x-=step;if(event.key==='ArrowRight')point.x+=step;
    if(!geometry.insideRegion(point,currentSource.region,0)){annotation.points[pointIndex]=before;return;}
    const validation=geometry.validatePolygon(annotation.points,currentSource.region);
    if(!validation.valid){annotation.points[pointIndex]=before;say('رأس در این موقعیت چندضلعی نامعتبر می‌سازد.','That vertex move would make the polygon invalid.','error');return;}
    annotation.updatedAt=schema.now();markDirty();renderOverlay();renderList();
  }
  function onPointerDown(event) {
    if(!currentSource||!event.isPrimary)return;
    if(mode==='draw') {
      event.preventDefault();
      const point=nativePoint(event);if(!point)return;
      if(activePoints&&activePoints.length>0&&Math.hypot(point.x-activePoints[0].x,point.y-activePoints[0].y)<7&&activePoints.length>=3){closePolygon();return;}
      if(!activePoints)activePoints=[];
      if(activePoints.length>=10000){say('تعداد رأس‌ها از حد مجاز بیشتر شد.','The polygon has reached the vertex limit.','error');return;}
      activePoints.push(point);renderOverlay();updateModeControls();return;
    }
    if(mode==='select') {
      if (event.target.closest && event.target.closest('.segmentor-vertex-handle')) return;
      const target=event.target.closest&&event.target.closest('[data-annotation-id]');
      if(target&&target.getAttribute('data-annotation-id'))selectAnnotation(target.getAttribute('data-annotation-id'));
      return;
    }
    if(mode==='pan') {
      event.preventDefault();dragState={x:event.clientX,y:event.clientY,panX:panX,panY:panY,pointerId:event.pointerId};
      try{el.overlay.setPointerCapture(event.pointerId);}catch(_){}
      el.movable.classList.add('is-panning');
    }
  }
  function onPointerMove(event) {
    if(vertexDrag&&vertexDrag.pointerId===event.pointerId) {
      const annotation=annotations.find(a=>a.id===vertexDrag.annotationId),point=annotation&&annotation.points[vertexDrag.pointIndex];
      const next=nativePoint(event);if(!point||!next)return;
      const before={x:point.x,y:point.y};point.x=next.x;point.y=next.y;
      if(!geometry.validatePolygon(annotation.points,currentSource.region).valid){point.x=before.x;point.y=before.y;return;}
      annotation.updatedAt=schema.now();dirty=true;setSaveStatus('تغییرات ذخیره‌نشده','Unsaved changes','dirty');renderOverlay();renderList();return;
    }
    if(dragState&&dragState.pointerId===event.pointerId) {
      panX=dragState.panX+event.clientX-dragState.x;panY=dragState.panY+event.clientY-dragState.y;applyTransform();
    }
  }
  function onPointerUp(event) {
    if(vertexDrag&&vertexDrag.pointerId===event.pointerId) {
      const final=vertexDrag;vertexDrag=null;
      const annotation=annotations.find(a=>a.id===final.annotationId);
      if(annotation) {annotation.updatedAt=schema.now();markDirty();}
      return;
    }
    if(dragState&&dragState.pointerId===event.pointerId) {dragState=null;el.movable.classList.remove('is-panning');}
  }
  function onPointerCancel(event) {
    if(vertexDrag&&vertexDrag.pointerId===event.pointerId) {
      const state=vertexDrag;vertexDrag=null;
      const annotation=annotations.find(a=>a.id===state.annotationId);
      if(annotation)annotation.points[state.pointIndex]=state.start;
      renderOverlay();renderList();say('ویرایش رأس لغو شد.','Vertex edit cancelled.','info');
    }
    if(dragState&&dragState.pointerId===event.pointerId){dragState=null;panX=0;panY=0;el.movable.classList.remove('is-panning');applyTransform();}
    if(activePoints){activePoints=null;renderOverlay();updateModeControls();say('ترسیم به‌دلیل لغو اشاره‌گر متوقف شد.','Drawing was cancelled by the pointer event.','info');}
  }
  function closePolygon() {
    if(!activePoints||activePoints.length<3)return;
    const validation=geometry.validatePolygon(activePoints,currentSource.region);
    if(!validation.valid){say('چندضلعی معتبر نیست: '+validation.error+'.','Invalid polygon: '+validation.error+'.','error');return;}
    const structure=structures.find(s=>s.id===activeStructureId)||structures[0];
    if(!structure){say('ابتدا یک ساختار بساز.','Create a structure first.','error');return;}
    recordSnapshot();
    const centre=activePoints.reduce((sum,p)=>({x:sum.x+p.x/activePoints.length,y:sum.y+p.y/activePoints.length}),{x:0,y:0});
    const annotation=schema.createAnnotation({structureId:structure.id,points:activePoints,labelPoint:centre,name:'',color:null,sourceImageId:currentSource.id});
    annotations.push(annotation);selectedAnnotationId=annotation.id;activePoints=null;markDirty();renderOverlay();renderList();updateModeControls();
    say('چندضلعی به‌صورت پیش‌نویس ایجاد شد؛ برای نگهداری ذخیره کن.','Polygon created as a draft; save to keep it.','info');
  }
  function changeMode(next) {
    if(!['select','draw','pan'].includes(next))return;
    if(next!=='draw'&&activePoints){
      if(!window.confirm(t('ترسیم ناتمام لغو شود؟','Discard the unfinished contour?')))return;
      activePoints=null;say('ترسیم ناتمام لغو شد.','Unfinished drawing cancelled.','info');
    }
    mode=next;updateModeControls();renderOverlay();el.stage.dataset.mode=mode;
  }
  async function loadImage(nextIndex,options) {
    const opts=options||{};
    if(!opts.force&&!checkLeave()){updateLabels();return;}
    index=Math.max(0,Math.min(series.planeCounts.axial-1,Math.trunc(Number(nextIndex)||0)));
    requestToken++;const token=requestToken;activePoints=null;selectedAnnotationId=null;currentSource=null;currentRecord=null;annotations=[];dirty=false;history=[];future=[];
    el.movable.hidden=true;el.fallback.hidden=true;setImageState('loading','در حال بارگذاری تصویر…','Loading image…');
    const url=series.getImageUrl(index,'axial');updateLabels();updateModeControls();
    if(!url){setImageState('error','نشانی تصویر در دسترس نیست.','Image URL is unavailable.');return;}
    el.image.onload=async function() {
      if(token!==requestToken)return;
      const region=profile.getRegion(el.image.naturalWidth,el.image.naturalHeight,index);
      if(!region) {
        el.fallback.src=url;el.fallback.alt=t('تصویر منبع؛ به‌دلیل نامشخص بودن ابعاد یا حاشیه، ویرایش غیرفعال است.','Source image; editing is disabled because dimensions or panel boundary are uncertain.');
        el.fallback.hidden=false;setImageState('error','ابعاد تصویر با مشخصات ناحیهٔ CT مطابقت ندارد؛ ویرایش در این تصویر غیرفعال است.','Image dimensions do not match the CT-region profile; editing is disabled for this image.');
        say('ویرایش غیرفعال شد تا مرز پنل مرجع حدس زده نشود.','Editing was disabled rather than guessing the reference-panel boundary.','warning');
        return;
      }
      currentSource=schema.createImageRecord({index,url,width:el.image.naturalWidth,height:el.image.naturalHeight,annotationRegion:region,geometryProfile:profile.id}).sourceImage;
      el.movable.hidden=false;fitCanvas(false);setImageState('ready','','');
      try {
        projectSnapshot=await store.loadProject();
        if(token!==requestToken)return;
        structures=clone(projectSnapshot.structures);
        const stored=projectSnapshot.images[currentSource.id];
        if(stored) {
          currentRecord=clone(stored);annotations=clone(stored.annotations);
          dirty=false;setSaveStatus('پیش‌نویس ذخیره‌شده','Saved draft','saved');
          say('پیش‌نویس محلی این تصویر بارگذاری شد. وضعیت بازبینی: بازبینی‌نشده.','Loaded this image’s local draft. Review status: not reviewed.','info');
        } else {
          currentRecord=null;annotations=[];dirty=false;setSaveStatus('بدون پیش‌نویس ذخیره‌شده','No saved draft','empty');
          say('برای این تصویر هنوز پیش‌نویسی ذخیره نشده است.','No draft has been saved for this image yet.','info');
        }
        saveAvailable=true;
      } catch(error) {
        saveAvailable=false;structures=structures.length?structures:schema.createProject().structures;
        annotations=[];currentRecord=null;
        setSaveStatus('ذخیره‌سازی در دسترس نیست','Storage unavailable','error');
        say('ذخیره‌سازی محلی در دسترس نیست: '+String(error.message||error),'Local storage is unavailable: '+String(error.message||error),'error');
      }
      if(token!==requestToken)return;
      renderStructureSelects();renderList();renderOverlay();fitCanvas(true);updateLabels();
      updateModeControls();
    };
    el.image.onerror=function(){
      if(token!==requestToken)return;
      currentSource=null;el.movable.hidden=true;el.fallback.hidden=true;
      setImageState('error','بارگذاری تصویر ناموفق بود. اتصال را بررسی و دوباره تلاش کن.','Image load failed. Check your connection and retry.');
      setSaveStatus('تصویر در دسترس نیست','Image unavailable','error');
    };
    el.image.src=url;
  }
  async function saveCurrentImage() {
    if(!currentSource||!saveAvailable)return;
    if(activePoints){say('ابتدا چندضلعی را ببند یا ترسیم را لغو کن.','Close or cancel the active polygon before saving.','warning');return;}
    try {
      const record={
        sourceImage:clone(currentSource),annotations:clone(annotations),provenance:annotations.every(a=>a.provenance==='manual')?'manual':'mixed',
        reviewStatus:'draft',createdAt:currentRecord?currentRecord.createdAt:schema.now(),updatedAt:schema.now()
      };
      const validationProject=schema.createProject();
      validationProject.structures=clone(structures);validationProject.images[currentSource.id]=record;
      schema.assertValidProject(validationProject);
      await store.saveImage(record,structures,currentRecord?currentRecord.updatedAt:null);
      currentRecord=clone(record);projectSnapshot=await store.loadProject();dirty=false;
      setSaveStatus('پیش‌نویس ذخیره شد','Draft saved','saved');
      say('ذخیره شد؛ حاشیه‌نویسی همچنان پیش‌نویس و بازبینی‌نشده است.','Saved; annotations remain drafts and are not reviewed.','success');
      updateLabels();
    } catch(error) {
      setSaveStatus('ذخیره ناموفق بود','Save failed','error');
      say('ذخیره انجام نشد: '+String(error.message||error),'Save failed: '+String(error.message||error),'error');
    }
  }
  function undo() {
    if(activePoints&&activePoints.length){activePoints.pop();if(!activePoints.length)activePoints=null;renderOverlay();updateModeControls();updateLabels();return;}
    if(!history.length)return;
    future.push(JSON.stringify(annotations));annotations=JSON.parse(history.pop());selectedAnnotationId=annotations.length?annotations[annotations.length-1].id:null;markDirty();renderOverlay();renderList();updateModeControls();
  }
  function redo() {
    if(!future.length)return;
    history.push(JSON.stringify(annotations));annotations=JSON.parse(future.pop());selectedAnnotationId=annotations.length?annotations[annotations.length-1].id:null;markDirty();renderOverlay();renderList();updateModeControls();
  }
  function addStructure() {
    const name=byId('segmentor-structure-name').value;
    try {
      const structure=schema.createStructure(name,byId('segmentor-structure-color').value);
      if(structures.some(s=>s.id===structure.id))throw new Error('Structure ID collision.');
      structures.push(structure);activeStructureId=structure.id;byId('segmentor-structure-name').value='';
      renderStructureSelects();renderList();renderOverlay();markDirty();
      say('ساختار افزوده شد؛ برای ذخیره‌سازی پایدار پیش‌نویس را ذخیره کن.','Structure added; save the draft to persist it.','success');
    } catch(error) {say('ساختار افزوده نشد: '+error.message,'Structure was not added: '+error.message,'error');}
  }
  function applyAnnotationChanges() {
    const annotation=selectedAnnotation();if(!annotation)return;
    const name=byId('segmentor-annotation-name').value.trim();
    if(name.length>100){say('نام حداکثر ۱۰۰ نویسه است.','Name is limited to 100 characters.','error');return;}
    const structureId=byId('segmentor-annotation-structure').value;
    if(!structures.some(s=>s.id===structureId)){say('ساختار انتخاب‌شده معتبر نیست.','The selected structure is invalid.','error');return;}
    recordSnapshot();annotation.displayName=name;annotation.structureId=structureId;
    const color=byId('segmentor-annotation-color').value;
    annotation.color=color===((structures.find(s=>s.id===structureId)||{}).color)?null:color;
    annotation.updatedAt=schema.now();markDirty();renderList();renderOverlay();
    say('تغییرات اعمال شد؛ برای نگهداری آن‌ها ذخیره کن.','Changes applied; save to keep them.','success');
  }
  function deleteSelected() {
    const annotation=selectedAnnotation();if(!annotation)return;
    if(!window.confirm(t('این حاشیه‌نویسی حذف می‌شود. ادامه می‌دهی؟','Delete this annotation? This cannot be undone after the page is closed.')))return;
    recordSnapshot();annotations=annotations.filter(a=>a.id!==annotation.id);selectedAnnotationId=null;markDirty();renderList();renderOverlay();updateModeControls();
    say('حاشیه‌نویسی از پیش‌نویس جاری حذف شد؛ برای ثبت تغییر ذخیره کن.','Annotation removed from the current draft; save to persist the change.','success');
  }
  function clearCurrentImageDraft() {
    if(!annotations.length&&!activePoints)return;
    if(!window.confirm(t('همهٔ حاشیه‌نویسی‌های این تصویر حذف می‌شوند؛ تصاویر دیگر تغییر نمی‌کنند. برای ثبت تغییر، پیش‌نویس را ذخیره کن. ادامه می‌دهی؟','Clear annotations for this image only? Other images will remain unchanged. Save the draft to persist this change.')))return;
    recordSnapshot();annotations=[];activePoints=null;selectedAnnotationId=null;markDirty();renderList();renderOverlay();updateModeControls();
    say('حاشیه‌نویسی‌های تصویر جاری پاک شدند؛ پیش‌نویس خالی پس از ذخیره جایگزین می‌شود.','Current-image annotations cleared; the empty draft is persisted only when you save.','success');
  }
  async function exportProject() {
    if(dirty||activePoints){
      say('پیش از خروجی گرفتن، ترسیم را لغو یا ببند و تغییرات را ذخیره کن.','Cancel or close the active contour and save edits before exporting.','warning');
      return;
    }
    try {
      const data=await store.exportProject(),valid=schema.validateProject(data);
      if(!valid.valid)throw new Error(valid.errors[0].message);
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='ct-edu-segmentor-annotations-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
      say('خروجی JSON ساخته شد.','JSON export created.','success');
    } catch(error) {say('خروجی انجام نشد: '+error.message,'Export failed: '+error.message,'error');}
  }
  async function previewImport(file) {
    importCandidate=null;byId('segmentor-import-preview').hidden=false;
    const summary=byId('segmentor-import-summary'),errors=byId('segmentor-import-errors');
    byId('segmentor-import-merge').disabled=true;byId('segmentor-import-replace').disabled=true;errors.hidden=true;errors.textContent='';
    try {
      if(!file||file.size>10*1024*1024)throw new Error('Import file is missing or exceeds the 10 MB limit.');
      const parsed=JSON.parse(await file.text()),validation=schema.validateProject(parsed);
      if(!validation.valid)throw new Error(validation.errors.slice(0,6).map(e=>e.path+': '+e.message).join(' '));
      importCandidate=parsed;
      const imageCount=Object.keys(parsed.images).length,annotationCount=Object.values(parsed.images).reduce((sum,item)=>sum+item.annotations.length,0);
      summary.textContent=t('فایل معتبر است: '+imageCount+' تصویر، '+annotationCount+' حاشیه‌نویسی، '+parsed.structures.length+' ساختار. انتخاب کن ادغام شود یا کل مجموعه جایگزین شود.','Valid file: '+imageCount+' images, '+annotationCount+' annotations, '+parsed.structures.length+' structures. Choose merge or replace the whole collection.');
      byId('segmentor-import-merge').disabled=false;byId('segmentor-import-replace').disabled=false;
    } catch(error) {
      errors.hidden=false;errors.textContent=String(error.message||error);
      summary.textContent=t('فایل قابل ورود نیست. دادهٔ محلی تغییری نکرد.','This file cannot be imported. Local data has not changed.');
    }
  }
  async function applyImport(modeName) {
    if(!importCandidate)return;
    if(activePoints&&!window.confirm(t('ترسیم ناتمام لغو می‌شود. ادامه می‌دهی؟','The unfinished contour will be discarded. Continue?')))return;
    if(dirty&&!window.confirm(t('تغییرات فعلی ذخیره نشده‌اند و هنگام واردکردن از دست می‌روند. ادامه می‌دهی؟','Current edits are unsaved and will be discarded by import. Continue?')))return;
    if(modeName==='replace'&&!window.confirm(t('جایگزینی کل مجموعه، تمام پیش‌نویس‌های محلی فعلی را حذف می‌کند. این عمل آگاهانه انجام شود؟','Replacing the collection removes all current local drafts. Confirm full replacement.')))return;
    try {
      activePoints=null;
      await store.importProject(importCandidate,modeName);
      importCandidate=null;byId('segmentor-import-preview').hidden=true;byId('segmentor-import-file').value='';
      dirty=false;await loadImage(index,{force:true});
      say(modeName==='replace'?'مجموعهٔ محلی پس از تأیید جایگزین شد.':'مجموعه با قواعد ادغام صریح وارد شد.','replace'===modeName?'Local collection replaced after confirmation.':'Collection imported using explicit merge rules.','success');
    } catch(error) {byId('segmentor-import-errors').hidden=false;byId('segmentor-import-errors').textContent=String(error.message||error);say('ورود انجام نشد؛ دادهٔ فعلی حفظ شد. '+error.message,'Import failed; existing data was preserved. '+error.message,'error');}
  }
  byId('segmentor-add-coordinate-vertex').addEventListener('click',()=>{
    if(mode!=='draw'){say('ابتدا ابزار ترسیم چندضلعی را فعال کن.','Activate Draw polygon before adding a coordinate vertex.','warning');return;}
    if(!currentSource){say('تصویر قابل ویرایش در دسترس نیست.','No editable image is available.','error');return;}
    const xField=byId('segmentor-vertex-x'),yField=byId('segmentor-vertex-y');
    if(!xField.value.trim()||!yField.value.trim()){say('هر دو مختصات X و Y را وارد کن.','Enter both X and Y coordinates.','error');return;}
    const point={x:Number(xField.value),y:Number(yField.value)};
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||!geometry.insideRegion(point,currentSource.region,0)){
      say('مختصات خارج از محدودهٔ CT است.','Coordinates must be inside the CT-only region.','error');return;
    }
    if(activePoints&&activePoints.length>=10000){say('تعداد رأس‌ها از حد مجاز بیشتر شد.','The polygon has reached the vertex limit.','error');return;}
    if(!activePoints)activePoints=[];
    activePoints.push({x:Math.round(point.x*100)/100,y:Math.round(point.y*100)/100});
    renderOverlay();updateModeControls();updateLabels();
    say('رأس با مختصات تصویر اصلی افزوده شد.','Vertex added in native source-image pixels.','success');
  });
  byId('segmentor-previous').addEventListener('click',()=>{if(index>0)loadImage(index-1);});
  byId('segmentor-next').addEventListener('click',()=>{if(index<319)loadImage(index+1);});
  el.index.addEventListener('change',()=>{const value=Number(el.index.value);if(!Number.isInteger(value)||value<1||value>320){el.index.setAttribute('aria-invalid','true');say('شمارهٔ تصویر باید بین ۱ تا ۳۲۰ باشد.','Image index must be from 1 to 320.','error');el.index.value=String(index+1);return;}el.index.removeAttribute('aria-invalid');loadImage(value-1);});
  byId('segmentor-zoom-in').addEventListener('click',()=>{zoom=Math.min(MAX_ZOOM,zoom+0.25);applyTransform();});
  byId('segmentor-zoom-out').addEventListener('click',()=>{zoom=Math.max(MIN_ZOOM,zoom-0.25);if(zoom===1){panX=0;panY=0;}applyTransform();});
  byId('segmentor-fit').addEventListener('click',()=>resetTransform());
  byId('segmentor-save').addEventListener('click',saveCurrentImage);
  byId('segmentor-mode-select').addEventListener('click',()=>changeMode('select'));
  byId('segmentor-mode-draw').addEventListener('click',()=>changeMode('draw'));
  byId('segmentor-mode-pan').addEventListener('click',()=>changeMode('pan'));
  byId('segmentor-close-polygon').addEventListener('click',closePolygon);
  byId('segmentor-cancel-polygon').addEventListener('click',()=>{activePoints=null;renderOverlay();updateModeControls();say('ترسیم لغو شد؛ حاشیه‌نویسی‌های دیگر تغییر نکردند.','Drawing cancelled; other annotations were unchanged.','info');});
  byId('segmentor-undo').addEventListener('click',undo);
  byId('segmentor-redo').addEventListener('click',redo);
  byId('segmentor-structure-select').addEventListener('change',event=>{activeStructureId=event.target.value;});
  byId('segmentor-add-structure').addEventListener('click',addStructure);
  byId('segmentor-update-annotation').addEventListener('click',applyAnnotationChanges);
  byId('segmentor-delete-annotation').addEventListener('click',deleteSelected);
  byId('segmentor-clear-image').addEventListener('click',clearCurrentImageDraft);
  byId('segmentor-retry').addEventListener('click',()=>loadImage(index,{force:true}));
  byId('segmentor-export').addEventListener('click',exportProject);
  byId('segmentor-import-file').addEventListener('change',event=>previewImport(event.target.files&&event.target.files[0]));
  byId('segmentor-import-merge').addEventListener('click',()=>applyImport('merge'));
  byId('segmentor-import-replace').addEventListener('click',()=>applyImport('replace'));
  byId('segmentor-import-cancel').addEventListener('click',()=>{importCandidate=null;byId('segmentor-import-preview').hidden=true;byId('segmentor-import-file').value='';});
  el.language.addEventListener('click',()=>setPageLanguage(language==='fa'?'en':'fa'));
  el.overlay.addEventListener('pointerdown',onPointerDown);
  el.overlay.addEventListener('pointermove',onPointerMove);
  el.overlay.addEventListener('pointerup',onPointerUp);
  el.overlay.addEventListener('pointercancel',onPointerCancel);
  el.overlay.addEventListener('lostpointercapture',onPointerUp);
  document.addEventListener('keydown',event=>{
    const target=event.target;
    if(target&&/INPUT|TEXTAREA|SELECT/.test(target.tagName))return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();undo();return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();redo();return;}
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.key==='Escape') {
      if(activePoints){activePoints=null;renderOverlay();updateModeControls();say('ترسیم ناتمام لغو شد.','Unfinished contour cancelled.','info');}
      else if(mode!=='select')changeMode('select');
    } else if(event.key==='Enter'&&mode==='draw'&&activePoints&&activePoints.length>=3){event.preventDefault();closePolygon();}
    else if(event.key.toLowerCase()==='z'&&(event.ctrlKey||event.metaKey)){event.preventDefault();undo();}
    else if(event.key.toLowerCase()==='y'&&(event.ctrlKey||event.metaKey)){event.preventDefault();redo();}
  });
  if(typeof ResizeObserver!=='undefined') {
    resizeObserver=new ResizeObserver(()=>fitCanvas(true));resizeObserver.observe(el.stage);
  } else window.addEventListener('resize',()=>fitCanvas(true));
  setPageLanguage('fa');
  structures=schema.createProject().structures;renderStructureSelects();
  loadImage(index,{force:true});
}());