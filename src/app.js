(function () {
  'use strict';
  const DATA=window.CTEduAnatomy, Viewer=window.CTEduSliceViewer, Quiz=window.CTEduQuiz, TriViewer=window.CTEduTriPlanarViewer, Progress=window.CTEduProgressStore;
  if(!DATA||!Viewer||!Quiz||!TriViewer||!Progress) return;
  const copy={
    fa:{
      moduleCrumb:'آناتومی مقطعی',moduleName:'شکم · نمای محوری',moduleNameCoronal:'شکم · نمای کرونال',moduleNameSagittal:'شکم · نمای ساژیتال',educationalOnly:'صرفاً آموزشی',eyebrow:'FOUNDATIONS · NORMAL ANATOMY',pageTitle:'از برش تا شناخت ساختار',pageIntro:'ساختارهای طبیعی شکم را بشناس، لایه‌های رنگی را بررسی کن و بعد خودت را به چالش بکش.',pathLearn:'یادگیری',pathIdentify:'شناسایی',pathRecall:'یادآوری فعال',structuresLabel:'ساختار در این نما',sessionHint:'حجم محوری با ۱۱۳ برش',sliceNavLabel:'پیمایش برش‌ها',slicePrevious:'برش قبلی',sliceNext:'برش بعدی',sliceNavHint:'با لغزنده، چرخ ماوس روی تصویر یا کلیدهای بالا و پایین بین برش‌ها جابه‌جا شو.',sliceSingle:'نسخهٔ فعلی فقط یک برش دارد',libraryKicker:'ANATOMY LIBRARY',anatomyTitle:'ساختارها',hideAll:'مخفی‌کردن همه',showAll:'نمایش همه',searchPlaceholder:'جست‌وجوی ساختار…',selectStructure:'برای انتخاب، نام ساختار را بزن',colorNote:'شناسه‌ها از labelmap اطلس گرفته شده‌اند',viewerTitle:'نمای CT شکم',viewAxial:'نمای محوری',viewCoronal:'نمای کرونال',viewSagittal:'نمای ساژیتال',planeAxial:'محوری · Axial',planeCoronal:'کرونال · Coronal',planeSagittal:'ساژیتال · Sagittal',patientAnterior:'قدام بیمار',patientPosterior:'خلف بیمار',coronalHint:'نمای کرونال: از جلو به پشت، با بالا در جهت سر بیمار.',sagittalHint:'نمای ساژیتال: قدام در سمت چپ و خلف در سمت راست تصویر.',axialLabelsOnly:'برچسب‌های متنی این درس فقط برای نمای محوریِ دارای جایگاه تأییدشده نمایش داده می‌شوند.',windowLevelTitle:'تنظیم پنجره و سطح',windowLevelSource:'شدت خام ذخیره‌شدهٔ اطلس',windowWidth:'پهنای پنجره (WW)',windowLevel:'سطح پنجره (WL)',windowLevelReset:'بازنشانی',windowLevelNote:'شدت خام ذخیره‌شدهٔ اطلس؛ کالیبراسیون HU مستقلاً تأیید نشده است.',windowLevelLoading:'در حال بارگذاری دادهٔ شدت خام…',windowLevelApplied:'نمایش از شدت خام منبع تولید می‌شود؛ واحدها به‌طور مستقل به HU کالیبره نشده‌اند.',windowLevelError:'دادهٔ شدت خام بارگذاری نشد؛ تصویر با پنجرهٔ پیش‌فرض باقی مانده است.',viewerSubtitle:'اطلس SPL · پیمایش برش‌های محوری',learnMode:'مطالعه',quizMode:'تمرین',recallKicker:'ACTIVE RECALL',quizPrompt:'ساختار برجسته‌شده کدام است؟',sessionScore:'امتیاز این جلسه',sourceBadge:'SPL ATLAS · حجم محوری آموزشی',quizCanvasLabel:'ناحیهٔ برجسته‌شده روی برش CT',ctCanvasLabel:'برش محوری CT شکم با لایهٔ قطعه‌بندی آموزشی',loadingCT:'در حال بارگذاری برش CT آموزشی…',loadCTError:'بارگذاری دادهٔ CT انجام نشد. وجود فایل‌های assets/spl-abdominal-demo را بررسی کن.',patientRight:'راست بیمار',patientLeft:'چپ بیمار',notToScale:'CT واقعی · لایهٔ آموزشی',viewPreset:'فیلتر لایه‌های آناتومی',levelOrgans:'اندام‌ها',levelVessels:'عروق',levelPosterior:'رتروپریتوئن',colorOverlays:'رنگ‌بندی',anatomyLabels:'برچسب‌ها',provenanceTitle:'منبع و وضعیت تصویر',provenanceText:'حجم محوری ۱۱۳‌برشی از SPL Abdominal Atlas (2015) همراه با labelmap متناظر. پنجره و رنگ‌گذاری برای آموزش تغییر داده شده‌اند؛ ماتریس هر برش ۲۵۶×۲۵۶ است و این ابزار برای تشخیص بالینی نیست.',inspectorKicker:'STRUCTURE INSPECTOR',detailTitle:'اطلاعات ساختار',selectedStructure:'ساختار انتخاب‌شده',demoStructure:'ساختار آموزشی نمونه',anatomicalNote:'نکتهٔ آناتومیک',orientationTitle:'جهت‌یابی',orientationNote:'سمت راست بیمار در سمت چپ تصویر نمایش داده می‌شود.',coronalOrientationNote:'در نمای کرونال، سمت راست بیمار در سمت چپ تصویر و جهت سر در بالا است.',sagittalOrientationNote:'در نمای ساژیتال، قدام بیمار در سمت چپ تصویر و خلف در سمت راست است.',nextQuestion:'سؤال بعدی ←',resetQuiz:'شروع دوبارهٔ امتیاز',learnNudge:'یک ساختار را از فهرست انتخاب کن تا رنگ، نام و نکتهٔ آن را بررسی کنی.',footerDisclaimer:'مناسب یادگیری آناتومی؛ برای تشخیص یا تصمیم‌گیری بالینی استفاده نشود.',dataReviewLink:'وضعیت داده و مجوز',licenseNoticeLink:'متن مجوز اطلس',noResults:'در این برش ساختار برچسب‌گذاری‌شده‌ای با این نام پیدا نشد.',quizUnavailable:'برای تمرین، برشی با دست‌کم چهار ساختارِ قابل‌شناسایی انتخاب کن.',noMappedStructure:'در این برش ساختارِ فهرست‌شده‌ای قطعه‌بندی نشده است.',quizCorrect:'درست بود. خوب شناسایی کردی.',quizWrong:'این پاسخ درست نیست. به نشانگرهای جهت و محل ساختار توجه کن.',optionsInstruction:'یک گزینه را انتخاب کن.',scoreReset:'امتیاز این جلسه پاک شد.',selected:'انتخاب شده',hidden:'مخفی',visible:'نمایان',displayModeLabel:'حالت نمایش',displaySingle:'یک‌نما',displayTriPlanar:'سه‌نما هم‌زمان',triPlanarKicker:'SYNCHRONIZED REVIEW',triPlanarTitle:'مرور هم‌زمان سه صفحه',triPlanarHint:'هر لغزنده مختصات همان محور را تغییر می‌دهد؛ خطوط راهنما موقعیت مشترک را نشان می‌دهند. برای پیمایش صفحه‌کلیدی، تصویر را focus کن و از بالا/پایین یا Home/End استفاده کن.',triAxialAxis:'محور k · برش محوری',triCoronalAxis:'محور j · قدامی به خلفی',triSagittalAxis:'محور i · راست به چپ',triSlicePosition:'موقعیت برش',openSinglePlane:'بازکردن این نما',returnSingleView:'بازگشت به نمای بزرگ',triPlanarWindowNote:'این نمای هم‌زمان از پنجرهٔ پیش‌فرض داده استفاده می‌کند. برای تنظیم Window/Level از نمای بزرگ استفاده کن.',triPlanarLoadError:'بارگذاری نماهای هم‌زمان انجام نشد. اتصال و دارایی‌های CT را بررسی کن.',triEmptySlice:'دادهٔ تصویری در این موقعیت وجود ندارد؛ این برش در ناحیهٔ خالی حجم قرار دارد.',workspaceLabel:'فضای یادگیری آناتومی CT',viewerPanelLabel:'نمایشگر آناتومی CT',planeGroupLabel:'انتخاب صفحهٔ CT',sliceNavigationGroup:'پیمایش برش‌های CT',anatomyLayerGroup:'فیلتر لایه‌های آناتومی',sliceSliderAxial:'موقعیت برش محوری',sliceSliderCoronal:'موقعیت برش کرونال',sliceSliderSagittal:'موقعیت برش ساژیتال',switchToSingleForQuiz:'برای آزمون ابتدا به نمای بزرگ برگرد',progressKicker:'پیشرفت محلی',progressTitle:'پیشرفت تمرین',progressAttempts:'پاسخ‌ها',progressAccuracy:'درستی',progressStructures:'ساختارها',progressLocalNote:'فقط در همین مرورگر ذخیره می‌شود؛ به سرور ارسال نمی‌شود.',progressUnavailable:'ذخیره‌سازی محلی در این مرورگر در دسترس نیست.',progressReset:'پاک کردن',progressExport:'پشتیبان‌گیری',progressRestore:'بازیابی',progressEmpty:'هنوز پاسخی ذخیره نشده است.',progressSaved:'تاریخچهٔ محلی پاک شد.',progressResetFailed:'پاک کردن تاریخچهٔ محلی ممکن نشد.',progressExported:'فایل پشتیبان دانلود شد.',progressSaveFailed:'پاسخ در تاریخچهٔ محلی ذخیره نشد؛ فضای مرورگر را بررسی کن.',progressRestored:'تاریخچه از فایل پشتیبان بازیابی شد.',progressRestoredTruncated:'فایل بزرگ‌تر از سقف نگهداری بود؛ ۵۰۰ پاسخ آخر بازیابی شدند.',progressImportInvalid:'این فایل پشتیبان معتبر CT Edu نیست.',progressImportFailed:'بازیابی انجام نشد؛ فضای ذخیره‌سازی را بررسی کن.',progressFileTooLarge:'فایل پشتیبان نباید بیشتر از ۱ مگابایت باشد.',progressRestoreConfirm:'بازیابی، تاریخچهٔ محلی فعلی را جایگزین می‌کند. قبل از ادامه از تاریخچهٔ فعلی پشتیبان بگیر. ادامه می‌دهی؟'
    },
    en:{
      moduleCrumb:'Cross-sectional anatomy',moduleName:'Abdomen · Axial view',moduleNameCoronal:'Abdomen · Coronal view',moduleNameSagittal:'Abdomen · Sagittal view',educationalOnly:'Educational only',eyebrow:'FOUNDATIONS · NORMAL ANATOMY',pageTitle:'From slice to structure',pageIntro:'Learn normal abdominal anatomy, explore color overlays, then challenge your recall.',pathLearn:'Learn',pathIdentify:'Identify',pathRecall:'Active recall',structuresLabel:'structures in this view',sessionHint:'A navigable 113-slice axial volume',sliceNavLabel:'AXIAL SLICE POSITION',slicePrevious:'Previous slice',sliceNext:'Next slice',sliceNavHint:'Use the slider, mouse wheel over the image, or Up/Down keys to navigate.',sliceSingle:'Only one slice is available in this preview',libraryKicker:'ANATOMY LIBRARY',anatomyTitle:'Structures',hideAll:'Hide all',showAll:'Show all',searchPlaceholder:'Search structures…',selectStructure:'Select a name to inspect it',colorNote:'Structure IDs are mapped from the source labelmap',viewerTitle:'Abdominal CT',viewAxial:'Axial view',viewCoronal:'Coronal view',viewSagittal:'Sagittal view',planeAxial:'Axial',planeCoronal:'Coronal',planeSagittal:'Sagittal',patientAnterior:'Anterior',patientPosterior:'Posterior',coronalHint:'Coronal view: anterior to posterior, with superior at the top.',sagittalHint:'Sagittal view: anterior is on the left and posterior is on the right.',axialLabelsOnly:'Text callouts are only available for the axial plane in this lesson.',windowLevelTitle:'Window and level',windowLevelSource:'Source stored intensity values',windowWidth:'Window width (WW)',windowLevel:'Window level (WL)',windowLevelReset:'Reset',windowLevelNote:'Source stored values; HU calibration has not been independently verified.',windowLevelLoading:'Loading raw intensity data…',windowLevelApplied:'Rendering uses source raw values; units have not been independently calibrated to HU.',windowLevelError:'Raw intensity data could not be loaded; the default image remains available.',viewerSubtitle:'SPL atlas · navigable axial stack',learnMode:'Explore',quizMode:'Practice',recallKicker:'ACTIVE RECALL',quizPrompt:'Which structure is highlighted?',sessionScore:'Session score',sourceBadge:'SPL ATLAS · AXIAL VOLUME',quizCanvasLabel:'Highlighted area on CT slice',ctCanvasLabel:'Axial abdominal CT with educational segmentation overlay',loadingCT:'Loading the CT teaching slice…',loadCTError:'The CT teaching assets did not load. Check that assets/spl-abdominal-demo exists.',patientRight:'Patient right',patientLeft:'Patient left',notToScale:'Real CT · teaching overlay',viewPreset:'Anatomy layer filter',levelOrgans:'Organs',levelVessels:'Vessels',levelPosterior:'Retroperitoneum',colorOverlays:'Color overlays',anatomyLabels:'Labels',provenanceTitle:'Image source & status',provenanceText:'A 113-slice axial volume from the SPL Abdominal Atlas (2015), paired with its source labelmap. The display window and teaching colors are modified; each slice remains 256×256 pixels. Not for clinical diagnosis.',inspectorKicker:'STRUCTURE INSPECTOR',detailTitle:'Structure details',selectedStructure:'SELECTED STRUCTURE',demoStructure:'Demonstration anatomy',anatomicalNote:'Anatomical note',orientationTitle:'Orientation',orientationNote:'Patient right is displayed on the viewer’s left.',coronalOrientationNote:'In coronal view, patient right is on image-left and superior is at the top.',sagittalOrientationNote:'In sagittal view, anterior is on image-left and posterior is on image-right.',nextQuestion:'Next question →',resetQuiz:'Reset score',learnNudge:'Choose a structure from the list to inspect its color, name, and note.',footerDisclaimer:'For anatomy learning only; not for diagnosis or clinical decisions.',dataReviewLink:'Data & license status',licenseNoticeLink:'Atlas license notice',noResults:'No matching labelled structure is present on this slice.',quizUnavailable:'Choose a slice containing at least four catalogue structures to practice.',noMappedStructure:'No catalogue structure is segmented on this slice.',quizCorrect:'Correct. Well identified.',quizWrong:'Not quite. Check the orientation markers and anatomical position.',optionsInstruction:'Choose one option.',scoreReset:'Session score has been reset.',selected:'Selected',hidden:'Hidden',visible:'Visible',displayModeLabel:'Layout',displaySingle:'Single plane',displayTriPlanar:'Three-plane view',triPlanarKicker:'SYNCHRONIZED REVIEW',triPlanarTitle:'Synchronized three-plane review',triPlanarHint:'Each slider changes one axis coordinate. Crosshair guides show the shared location; focus a plane image and use Up/Down or Home/End to navigate it with the keyboard.',triAxialAxis:'k axis · axial position',triCoronalAxis:'j axis · anterior to posterior',triSagittalAxis:'i axis · right to left',triSlicePosition:'Slice position',openSinglePlane:'Open this plane',returnSingleView:'Return to large view',triPlanarWindowNote:'The overview uses the dataset’s default display window. Open a plane in the large view to adjust Window/Level.',triPlanarLoadError:'The synchronized views could not load. Check the connection and CT assets.',triEmptySlice:'No image data is available at this position; this slice is outside the acquired anatomy.',workspaceLabel:'CT anatomy learning workspace',viewerPanelLabel:'CT anatomy viewer',planeGroupLabel:'CT viewing plane',sliceNavigationGroup:'CT slice navigation',anatomyLayerGroup:'Anatomy layer filter',sliceSliderAxial:'Axial CT slice position',sliceSliderCoronal:'Coronal CT slice position',sliceSliderSagittal:'Sagittal CT slice position',switchToSingleForQuiz:'Return to the large view before starting a quiz',progressKicker:'ON THIS DEVICE',progressTitle:'Learning progress',progressAttempts:'Answers',progressAccuracy:'Accuracy',progressStructures:'Structures',progressLocalNote:'Saved only in this browser; never uploaded.',progressUnavailable:'Local storage is unavailable in this browser.',progressReset:'Clear',progressExport:'Back up',progressRestore:'Restore',progressEmpty:'No answers saved yet.',progressSaved:'Local learning history cleared.',progressResetFailed:'Could not clear local learning history.',progressExported:'Progress backup downloaded.',progressSaveFailed:'This answer was not saved; check browser storage space.',progressRestored:'Learning history restored from backup.',progressRestoredTruncated:'The backup exceeded the retention limit; the latest 500 answers were restored.',progressImportInvalid:'This is not a valid CT Edu progress backup.',progressImportFailed:'Restore failed; check the browser storage quota.',progressFileTooLarge:'The backup file must be 1 MB or smaller.',progressRestoreConfirm:'Restoring replaces current local history. Back up current history first if you want to keep it. Continue?'
    }
  };
  const el=function(id){return document.getElementById(id);};
  function safeGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function safeSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  const state={lang:safeGet('ctedu-lang')==='en'?'en':'fa',selectedId:'liver',plane:'axial',displayMode:'single',sliceIndex:26,slicePositions:{i:128,j:128,k:26},panX:0,panY:0,windowLevelStatus:'note',pendingWindowLevel:null,windowLevelRequestId:0,overlaysOn:true,labelsOn:true,previousLabelsOn:true,zoom:100,level:'organs',query:'',quizMode:false,question:null,score:0,answered:0,lastQuestionId:null,answeredCurrent:false,visible:Object.fromEntries(DATA.items.map(function(i){return [i.id,true];}))};
  const langButton=el('language-toggle'),listEl=el('structure-list'),searchEl=el('structure-search'),canvasEl=el('ct-slice-canvas'),overlaysToggle=el('toggle-overlays'),labelsToggle=el('toggle-labels');
  function t(k){return (copy[state.lang]&&copy[state.lang][k])||copy.en[k]||k;}
  function displayName(item){return state.lang==='fa'?item.nameFa:item.nameEn;}
  function number(value){return state.lang==='fa'?String(value).replace(/[0-9]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'[Number(d)];}):String(value);}
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function applyLanguage(){
    const fa=state.lang==='fa';document.documentElement.lang=state.lang;document.documentElement.dir=fa?'rtl':'ltr';document.body.classList.toggle('lang-fa',fa);document.body.classList.toggle('lang-en',!fa);
    document.querySelectorAll('[data-i18n]').forEach(function(node){const key=node.getAttribute('data-i18n');if(t(key))node.textContent=t(key);});
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(node){node.placeholder=t(node.getAttribute('data-i18n-placeholder'));});
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function(node){node.setAttribute('aria-label',t(node.getAttribute('data-i18n-aria-label')));});
    langButton.innerHTML=fa?'EN <span aria-hidden="true">↔</span> فا':'فا <span aria-hidden="true">↔</span> EN';
    langButton.setAttribute('aria-label',fa?'Switch to English':'تغییر زبان به فارسی');
  }
  function getSliceItems(){
    if(Viewer.getStatus().state!=='ready'||typeof Viewer.getPresentSegmentIds!=='function')return DATA.items;
    const present=new Set(Viewer.getPresentSegmentIds(8));
    return DATA.items.filter(function(item){return present.has(Number(item.segmentId));});
  }
  function renderList(){
    const available=getSliceItems(),availableIds=new Set(available.map(function(item){return item.id;}));
    const matching=DATA.search(state.query).filter(function(item){return availableIds.has(item.id);});listEl.innerHTML='';
    matching.forEach(function(item){
      const li=document.createElement('li');li.className='structure-row'+(state.selectedId===item.id?' active':'');
      const select=document.createElement('button');select.type='button';select.className='structure-select';select.dataset.selectStructure=item.id;select.setAttribute('aria-pressed',String(state.selectedId===item.id));
      select.innerHTML='<span class="structure-swatch" style="--swatch:'+item.color+'"></span><span class="structure-name"><strong>'+escapeHtml(displayName(item))+'</strong><small>'+escapeHtml(state.lang==='fa'?item.nameEn:item.nameFa)+'</small></span><span class="row-chevron" aria-hidden="true">'+(state.lang==='fa'?'‹':'›')+'</span>';
      const eye=document.createElement('button');eye.type='button';eye.className='visibility-button'+(state.visible[item.id]?'':' is-off');eye.dataset.toggleStructure=item.id;eye.setAttribute('aria-label',(state.visible[item.id]?t('hidden'):t('visible'))+' · '+displayName(item));eye.setAttribute('aria-pressed',String(state.visible[item.id]));eye.innerHTML=state.visible[item.id]?'<span aria-hidden="true">◉</span>':'<span aria-hidden="true">○</span>';
      li.append(select,eye);listEl.appendChild(li);
    });
    if(!matching.length)listEl.innerHTML='<li class="empty-results">'+t('noResults')+'</li>';
    const visible=available.filter(function(item){return state.visible[item.id];}).length;
    el('structure-count').textContent=number(available.length);el('visible-count').textContent=number(visible)+'/'+number(available.length);
    el('visibility-all').textContent=available.length&&visible===available.length?t('hideAll'):t('showAll');
  }
  function renderWindowLevelControls(){
    const widthInput=el('window-width-slider'),levelInput=el('window-level-slider');
    const info=Viewer.getWindowLevelInfo?Viewer.getWindowLevelInfo():{width:400,level:1064,defaultWidth:400,defaultLevel:1064,rawAvailable:false};
    const range=info.intensityRange||{min:0,max:4000};
    const min=Number(range.min),max=Number(range.max),span=Math.max(1,max-min);
    widthInput.min='10';widthInput.max=String(Math.ceil(Math.max(400,span)/10)*10);widthInput.step='10';
    levelInput.min=String(min);levelInput.max=String(max);levelInput.step='1';
    const pending=state.windowLevelStatus==='loading'?state.pendingWindowLevel:null;
    if(document.activeElement!==widthInput)widthInput.value=String(pending?pending.width:info.width);
    if(document.activeElement!==levelInput)levelInput.value=String(pending?pending.level:info.level);
    el('window-width-value').textContent=number(Math.round(Number(widthInput.value)));
    el('window-level-value').textContent=number(Math.round(Number(levelInput.value)));
    widthInput.disabled=state.quizMode;levelInput.disabled=state.quizMode;
    el('window-level-reset').disabled=state.quizMode;
    const key=state.windowLevelStatus==='loading'?'windowLevelLoading':
      state.windowLevelStatus==='applied'?'windowLevelApplied':
      state.windowLevelStatus==='error'?'windowLevelError':'windowLevelNote';
    el('window-level-status').textContent=t(key);
    el('window-level-status').dataset.rawAvailable=String(Boolean(info.rawAvailable));
  }
  let windowLevelDebounce=null;
  function applyWindowLevel(){
    if(!Viewer.setWindowLevel||state.quizMode)return;
    const width=Math.max(1,Number(el('window-width-slider').value)||400);
    const level=Number(el('window-level-slider').value)||0;
    el('window-width-value').textContent=number(Math.round(width));
    el('window-level-value').textContent=number(Math.round(level));
    if(windowLevelDebounce)window.clearTimeout(windowLevelDebounce);
    const requestId=++state.windowLevelRequestId;
    state.pendingWindowLevel={width:width,level:level};
    state.windowLevelStatus='loading';renderWindowLevelControls();
    windowLevelDebounce=window.setTimeout(function(){
      windowLevelDebounce=null;
      Viewer.setWindowLevel(width,level).then(function(ok){
        if(requestId!==state.windowLevelRequestId)return;
        state.pendingWindowLevel=null;
        state.windowLevelStatus=ok?'applied':'error';
        renderWindowLevelControls();
        if(ok)renderViewer();
      }).catch(function(){
        if(requestId!==state.windowLevelRequestId)return;
        state.pendingWindowLevel=null;
        state.windowLevelStatus='error';renderWindowLevelControls();
      });
    },90);
  }
  function resetWindowLevel(){
    const info=Viewer.getWindowLevelInfo?Viewer.getWindowLevelInfo():{defaultWidth:400,defaultLevel:1064};
    el('window-width-slider').value=String(info.defaultWidth||400);
    el('window-level-slider').value=String(info.defaultLevel||1064);
    applyWindowLevel();
  }
  function renderSliceNavigation(){
    const info=Viewer.getVolumeInfo(state.plane),slider=el('slice-slider'),previous=el('slice-prev'),next=el('slice-next');
    if(!slider||!previous||!next)return;
    const isVolume=Boolean(info.isVolume),current=isVolume?state.sliceIndex:info.currentSliceIndex,canNavigate=isVolume&&!state.quizMode;
    slider.min=String(isVolume?0:info.currentSliceIndex);
    slider.max=String(isVolume?info.sliceCount-1:info.currentSliceIndex);
    slider.value=String(current);slider.disabled=!canNavigate;
    previous.disabled=!canNavigate||current<=0;next.disabled=!canNavigate||current>=info.sliceCount-1;
    previous.title=t('slicePrevious');previous.setAttribute('aria-label',t('slicePrevious'));
    next.title=t('sliceNext');next.setAttribute('aria-label',t('sliceNext'));
    const sliderLabelKey=state.plane==='coronal'?'sliceSliderCoronal':state.plane==='sagittal'?'sliceSliderSagittal':'sliceSliderAxial';
    slider.setAttribute('aria-label',t(sliderLabelKey));
    const visibleNavLabel=el('slice-navigation').querySelector('.toolbar-label');
    if(visibleNavLabel)visibleNavLabel.textContent=t(sliderLabelKey);
    el('slice-position').textContent=isVolume
      ?number(current+1)+' / '+number(info.sliceCount)+' · '+info.indexAxis+'='+number(current)
      :t('sliceSingle')+' · '+info.indexAxis+'='+number(info.currentSliceIndex);
    const coordinates=state.slicePositions;
    el('volume-coordinate-readout').textContent='i='+number(coordinates.i)+' · j='+number(coordinates.j)+' · k='+number(coordinates.k);
  }
  let pointerDrag=null, suppressCanvasClick=false;
  function applyCanvasTransform(){
    const viewport=el('schematic-canvas');
    const scale=state.zoom/100;
    const maxX=Math.max(0,(canvasEl.offsetWidth*scale-viewport.clientWidth)/2+6);
    const maxY=Math.max(0,(canvasEl.offsetHeight*scale-viewport.clientHeight)/2+6);
    state.panX=Math.max(-maxX,Math.min(maxX,state.panX));
    state.panY=Math.max(-maxY,Math.min(maxY,state.panY));
    canvasEl.style.transform='translate('+state.panX+'px, '+state.panY+'px) scale('+scale+')';
    canvasEl.style.cursor=(state.zoom>100||state.panX!==0||state.panY!==0)?'grab':'crosshair';
    canvasEl.style.touchAction=state.zoom>100?'none':'pan-y';
  }
  function renderViewer(){
    const status=Viewer.getStatus(),loadMessage=el('viewer-load-error'),emptyState=el('viewer-empty-state'),hasFrame=canvasEl.dataset.hasRendered==='true';
    emptyState.hidden=!(status.state==='ready'&&status.hasSignal===false);
    const planeAvailable=Viewer.getVolumeInfo().availablePlanes||['axial'];
    const planeTitleKey=state.plane==='coronal'?'viewCoronal':state.plane==='sagittal'?'viewSagittal':'viewAxial';
    el('viewer-plane-title').textContent=t(planeTitleKey);
    el('module-name-label').textContent=t(state.plane==='coronal'?'moduleNameCoronal':state.plane==='sagittal'?'moduleNameSagittal':'moduleName');
    el('viewer-plane-subtitle').textContent=state.plane==='coronal'?t('coronalHint'):state.plane==='sagittal'?t('sagittalHint'):t('viewerSubtitle');
    document.querySelectorAll('.plane-tab').forEach(function(button){const active=button.dataset.plane===state.plane;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));button.disabled=state.quizMode||!planeAvailable.includes(button.dataset.plane);});
    const sagittal=state.plane==='sagittal';
    el('orientation-letter-left').textContent=sagittal?'A':'R';el('orientation-letter-right').textContent=sagittal?'P':'L';
    el('orientation-label-left').textContent=t(sagittal?'patientAnterior':'patientRight');el('orientation-label-right').textContent=t(sagittal?'patientPosterior':'patientLeft');
    el('orientation-marker-left').setAttribute('aria-label',t(sagittal?'patientAnterior':'patientRight'));
    el('orientation-marker-right').setAttribute('aria-label',t(sagittal?'patientPosterior':'patientLeft'));
    el('viewer-axis-labels').innerHTML=sagittal?'A <i>•</i> P':'R <i>•</i> L';
    el('orientation-glyph').innerHTML=sagittal?'A <i>→</i> P':'R <i>→</i> L';
    el('orientation-note').textContent=t(sagittal?'sagittalOrientationNote':state.plane==='coronal'?'coronalOrientationNote':'orientationNote');
    if(status.state!=='ready'&&!hasFrame){
      canvasEl.hidden=true;loadMessage.hidden=false;loadMessage.textContent=status.state==='error'?t('loadCTError'):t('loadingCT');
    }else{
      canvasEl.hidden=false;loadMessage.hidden=status.state!=='error';
      if(status.state==='error')loadMessage.textContent=t('loadCTError');
      applyCanvasTransform();
      if(status.state==='ready'){
        const drawn=Viewer.draw(canvasEl,{items:DATA.items,visible:state.visible,overlaysOn:state.overlaysOn,labelsOn:state.labelsOn&&!state.quizMode,selectedId:state.selectedId,quizId:state.quizMode&&state.question?state.question.id:null,language:state.lang,level:state.level,plane:state.plane});
        if(drawn)canvasEl.dataset.hasRendered='true';
      }
    }
    el('zoom-value').textContent=number(state.zoom)+'%';overlaysToggle.checked=state.overlaysOn;labelsToggle.checked=state.labelsOn;
    renderWindowLevelControls();
    labelsToggle.disabled=state.plane!=='axial';labelsToggle.closest('.switch-row').title=state.plane==='axial'?'':t('axialLabelsOnly');
    document.querySelectorAll('.level-button').forEach(function(button){button.classList.toggle('active',button.dataset.level===state.level);});
    renderSliceNavigation();
  }
  function renderDetails(){
    const available=getSliceItems();
    const target=state.quizMode&&state.question?DATA.byId(state.question.id):(available.some(function(item){return item.id===state.selectedId;})?DATA.byId(state.selectedId):null);
    const quizButton=el('quiz-mode');
    quizButton.disabled=(available.length<4||state.displayMode==='tri')&&!state.quizMode;
    quizButton.title=state.displayMode==='tri'?t('switchToSingleForQuiz'):quizButton.disabled?t('quizUnavailable'):'';
    if(!target){
      el('selected-color').style.setProperty('--selected-color','#7F91A0');el('selected-chip').style.backgroundColor='#7F91A0';
      el('selected-name-fa').textContent='—';el('selected-name-en').textContent='—';
      el('selected-description').textContent=t('noMappedStructure');
      el('detail-index').textContent='—';el('selected-meta-text').textContent=t('noMappedStructure');
      el('learn-nudge').hidden=state.quizMode;el('answer-panel').hidden=!state.quizMode;el('quiz-banner').hidden=!state.quizMode;
      el('learn-mode').classList.toggle('active',!state.quizMode);el('learn-mode').setAttribute('aria-pressed',String(!state.quizMode));el('quiz-mode').classList.toggle('active',state.quizMode);el('quiz-mode').setAttribute('aria-pressed',String(state.quizMode));
      el('score').textContent=number(state.score);el('answered-count').textContent=number(state.answered);
      if(state.quizMode)renderAnswerOptions();
      return;
    }
    const hidden=Boolean(state.quizMode&&!state.answeredCurrent);
    el('selected-color').style.setProperty('--selected-color',hidden?'#7F91A0':target.color);el('selected-chip').style.backgroundColor=hidden?'#7F91A0':target.color;
    el('selected-name-fa').textContent=hidden?'ساختار هدف':target.nameFa;el('selected-name-en').textContent=hidden?'Target structure':target.nameEn;
    el('selected-description').textContent=hidden?(state.lang==='fa'?'به شکل کلی، موقعیت نسبی و نشانگرهای R/L توجه کن؛ سپس گزینه را انتخاب کن.':'Use the overall shape, relative position and R/L markers, then choose an answer.'):(state.lang==='fa'?target.descriptionFa:target.descriptionEn);
    el('detail-index').textContent=hidden?'••':number(String(DATA.items.findIndex(function(x){return x.id===target.id;})+1).padStart(2,'0'));
    el('selected-meta-text').textContent=hidden?t('optionsInstruction'):(state.quizMode?(state.lang==='fa'?'ساختار هدف در سؤال':'Target structure for this question'):t('demoStructure'));
    el('learn-nudge').hidden=state.quizMode;el('answer-panel').hidden=!state.quizMode;el('quiz-banner').hidden=!state.quizMode;
    el('learn-mode').classList.toggle('active',!state.quizMode);el('learn-mode').setAttribute('aria-pressed',String(!state.quizMode));el('quiz-mode').classList.toggle('active',state.quizMode);el('quiz-mode').setAttribute('aria-pressed',String(state.quizMode));
    el('score').textContent=number(state.score);el('answered-count').textContent=number(state.answered);
    if(state.quizMode)renderAnswerOptions();
  }
  function renderAnswerOptions(){
    const optionsEl=el('answer-options');optionsEl.innerHTML='';if(!state.question)return;
    state.question.options.forEach(function(option,index){
      const item=DATA.byId(option.id),button=document.createElement('button');button.type='button';button.className='answer-option';button.disabled=state.answeredCurrent;button.dataset.answerId=option.id;
      button.innerHTML='<span class="option-letter">'+('ABCD'[index])+'</span><span>'+escapeHtml(displayName(item))+'</span><span class="option-mark" aria-hidden="true"></span>';
      if(state.answeredCurrent&&option.id===state.question.id)button.classList.add('correct');
      if(state.answeredCurrent&&option.id===state.question.selectedId&&option.id!==state.question.id)button.classList.add('incorrect');
      button.addEventListener('click',function(){chooseAnswer(option.id);});optionsEl.appendChild(button);
    });
    const feedback=el('answer-feedback');feedback.className='answer-feedback'+(state.answeredCurrent?(state.question.selectedId===state.question.id?' correct':' incorrect'):'');
    feedback.textContent=!state.answeredCurrent?t('optionsInstruction'):t(state.question.selectedId===state.question.id?'quizCorrect':'quizWrong');
    el('next-question').disabled=!state.answeredCurrent;
  }
  function chooseAnswer(id){
    if(!state.quizMode||state.answeredCurrent||!state.question)return;
    const result=Quiz.evaluateAnswer(state.question,id);if(!result.accepted)return;
    state.question.selectedId=id;state.question.answered=true;state.answeredCurrent=true;state.answered+=1;if(result.correct)state.score+=1;
    const progressResult=Progress.recordAttempt({
      caseId:'spl-abdomen-normal-atlas',
      region:'abdomen',
      skill:'structure-identification',
      targetId:state.question.id,
      selectedId:id,
      isCorrect:result.correct,
      timestamp:Date.now()
    });
    renderViewer();renderDetails();renderProgress(progressResult.saved?null:'progressSaveFailed');
  }
  function startQuiz(){
    const available=getSliceItems();
    if(available.length<4)return;
    if(!state.quizMode)state.previousLabelsOn=state.labelsOn;
    state.lastQuestionId=state.question?state.question.id:null;
    state.quizMode=true;
    const visible=available.filter(function(item){return state.visible[item.id];});
    if(visible.length<4)available.slice(0,4).forEach(function(item){state.visible[item.id]=true;});
    state.question=Quiz.createQuestion(available.filter(function(item){return state.visible[item.id];}),state.lastQuestionId);state.answeredCurrent=false;
    state.labelsOn=false;el('app').dataset.mode='quiz';render();
  }
  function nextQuestion(){
    if(!state.quizMode||!state.answeredCurrent)return;
    state.lastQuestionId=state.question.id;const pool=getSliceItems().filter(function(item){return state.visible[item.id];});
    if(pool.length<4){el('answer-feedback').textContent=t('quizUnavailable');return;}
    state.question=Quiz.createQuestion(pool,state.lastQuestionId);state.answeredCurrent=false;render();
  }
  function exitQuiz(){state.quizMode=false;state.question=null;state.answeredCurrent=false;state.labelsOn=state.previousLabelsOn;el('app').dataset.mode='learn';render();}
  function renderDisplayMode(){
    const tri=state.displayMode==='tri'&&!state.quizMode;
    el('display-single').classList.toggle('active',!tri);el('display-single').setAttribute('aria-pressed',String(!tri));
    el('display-triplanar').classList.toggle('active',tri);el('display-triplanar').setAttribute('aria-pressed',String(tri));el('display-triplanar').disabled=state.quizMode;
    ['plane-tabs','viewer-frame','slice-navigation','window-level-controls','viewer-toolbar','source-disclaimer'].forEach(function(id){el(id).hidden=tri;});
    el('tri-planar-panel').hidden=!tri;
  }
  const triPlaneConfigs=[
    {plane:'axial',axis:'k',count:113},
    {plane:'coronal',axis:'j',count:256},
    {plane:'sagittal',axis:'i',count:256}
  ];
  function renderTriPlanar(){
    const tri=state.displayMode==='tri'&&!state.quizMode;
    const indices={i:state.slicePositions.i,j:state.slicePositions.j,k:state.slicePositions.k};
    triPlaneConfigs.forEach(function(config){
      const slider=el('tri-'+config.plane+'-slider'),output=el('tri-'+config.plane+'-position');
      slider.min='0';slider.max=String(config.count-1);slider.value=String(indices[config.axis]);slider.disabled=!tri;
      output.textContent=config.axis+'='+number(indices[config.axis])+' / '+number(config.count);
    });
    const error=el('tri-planar-error');
    if(!tri){error.hidden=true;return;}
    error.hidden=true;
    TriViewer.render({indices:indices,items:DATA.items,visible:state.visible,overlaysOn:state.overlaysOn,level:state.level,language:state.lang,labels:{
      axial:state.lang==='fa'?'نمای محوری CT با خط راهنمای هماهنگ':'Axial CT with synchronized crosshair',
      coronal:state.lang==='fa'?'نمای کرونال CT با خط راهنمای هماهنگ':'Coronal CT with synchronized crosshair',
      sagittal:state.lang==='fa'?'نمای ساژیتال CT با خط راهنمای هماهنگ':'Sagittal CT with synchronized crosshair'
    }}).then(function(rendered){
      if(!rendered||state.displayMode!=='tri'||state.quizMode)return;
      const status=TriViewer.getStatus();
      triPlaneConfigs.forEach(function(config){
        const empty=el('tri-'+config.plane+'-empty-state');
        const canvas=el('tri-'+config.plane+'-canvas');
        const hasSignal=status.hasSignal[config.plane];
        empty.hidden=hasSignal!==false;
        if(hasSignal===false)canvas.setAttribute('aria-label',t('triEmptySlice'));
        else canvas.setAttribute('aria-label',state.lang==='fa'?
          (config.plane==='axial'?'نمای محوری CT با خط راهنمای هماهنگ':config.plane==='coronal'?'نمای کرونال CT با خط راهنمای هماهنگ':'نمای ساژیتال CT با خط راهنمای هماهنگ'):
          (config.plane==='axial'?'Axial CT with synchronized crosshair':config.plane==='coronal'?'Coronal CT with synchronized crosshair':'Sagittal CT with synchronized crosshair'));
      });
    }).catch(function(){
      if(state.displayMode!=='tri'||state.quizMode)return;
      error.textContent=t('triPlanarLoadError');error.hidden=false;
    });
  }
  function setDisplayMode(mode){
    if(mode==='tri'&&state.quizMode)return;
    if(mode==='single'&&state.displayMode==='tri'){
      const info=Viewer.getVolumeInfo(state.plane);
      state.sliceIndex=Number(state.slicePositions[info.indexAxis]??info.defaultSliceIndex);
      state.zoom=100;state.panX=0;state.panY=0;
      Viewer.loadSlice(state.sliceIndex,state.plane);
    }
    state.displayMode=mode;render();
  }
  function openTriPlane(plane){
    if(state.quizMode)return;
    const info=Viewer.getVolumeInfo(plane);
    if(!info.isVolume)return;
    state.plane=plane;state.sliceIndex=Number(state.slicePositions[info.indexAxis]??info.defaultSliceIndex);
    state.displayMode='single';state.zoom=100;state.panX=0;state.panY=0;
    Viewer.loadSlice(state.sliceIndex,plane);render();
  }
  function renderProgress(messageKey){
    const summary=Progress.getSummary();
    el('progress-attempts').textContent=number(summary.totalAttempts);
    el('progress-accuracy').textContent=summary.totalAttempts?number(summary.accuracy)+'%':'—';
    el('progress-structures').textContent=number(summary.distinctStructures);
    el('progress-storage-note').textContent=t(summary.available?'progressLocalNote':'progressUnavailable');
    el('export-local-progress').disabled=!summary.available;
    el('restore-local-progress').disabled=!summary.available;
    el('reset-local-progress').disabled=!summary.available;
    const feedback=el('progress-feedback');
    feedback.textContent=messageKey?t(messageKey):(summary.totalAttempts?'':t('progressEmpty'));
  }
  function render(){applyLanguage();el('anatomy-panel').hidden=state.quizMode;el('workspace').classList.toggle('quiz-active',state.quizMode);renderDisplayMode();renderList();renderViewer();renderDetails();renderTriPlanar();renderProgress();}
  listEl.addEventListener('click',function(event){
    const toggle=event.target.closest('[data-toggle-structure]');
    if(toggle){const id=toggle.dataset.toggleStructure;state.visible[id]=!state.visible[id];if(state.quizMode&&state.question&&!state.visible[state.question.id])startQuiz();else{if(!state.visible[state.selectedId])state.selectedId=(DATA.items.find(function(item){return state.visible[item.id];})||DATA.items[0]).id;render();}return;}
    const select=event.target.closest('[data-select-structure]');
    if(select&&!state.quizMode){state.selectedId=select.dataset.selectStructure;state.visible[state.selectedId]=true;render();}
  });
  searchEl.addEventListener('input',function(){state.query=searchEl.value;renderList();});
  searchEl.addEventListener('keydown',function(event){if(event.key==='Escape'){searchEl.value='';state.query='';renderList();searchEl.blur();}});
  langButton.addEventListener('click',function(){state.lang=state.lang==='fa'?'en':'fa';safeSet('ctedu-lang',state.lang);render();});
  el('visibility-all').addEventListener('click',function(){
    const available=getSliceItems();
    if(!available.length){DATA.items.forEach(function(item){state.visible[item.id]=true;});render();return;}
    const allVisible=available.every(function(item){return state.visible[item.id];});available.forEach(function(item){state.visible[item.id]=!allVisible;});
    if(state.quizMode&&(!state.visible[state.question.id]||available.filter(function(item){return state.visible[item.id];}).length<4))startQuiz();
    else{if(!allVisible&&available.length)state.selectedId=available[0].id;render();}
  });
  overlaysToggle.addEventListener('change',function(){state.overlaysOn=overlaysToggle.checked;renderViewer();renderTriPlanar();});
  labelsToggle.addEventListener('change',function(){state.labelsOn=labelsToggle.checked;renderViewer();});
  el('window-width-slider').addEventListener('input',function(){el('window-width-value').textContent=number(Math.round(Number(el('window-width-slider').value)));});
  el('window-level-slider').addEventListener('input',function(){el('window-level-value').textContent=number(Math.round(Number(el('window-level-slider').value)));});
  el('window-width-slider').addEventListener('change',applyWindowLevel);
  el('window-level-slider').addEventListener('change',applyWindowLevel);
  el('window-level-reset').addEventListener('click',resetWindowLevel);
  el('zoom-in').addEventListener('click',function(){state.zoom=Math.min(220,state.zoom+10);applyCanvasTransform();el('zoom-value').textContent=number(state.zoom)+'%';});
  el('zoom-out').addEventListener('click',function(){state.zoom=Math.max(70,state.zoom-10);applyCanvasTransform();el('zoom-value').textContent=number(state.zoom)+'%';});
  el('zoom-reset').addEventListener('click',function(){state.zoom=100;state.panX=0;state.panY=0;applyCanvasTransform();el('zoom-value').textContent=number(state.zoom)+'%';});
  function goToSlice(index){
    const info=Viewer.getVolumeInfo(state.plane);
    if(!info.isVolume||state.quizMode)return;
    state.sliceIndex=Math.max(0,Math.min(info.sliceCount-1,Math.trunc(Number(index)||0)));
    state.slicePositions[info.indexAxis]=state.sliceIndex;
    renderSliceNavigation();
    Viewer.loadSlice(state.sliceIndex,state.plane);
  }
  document.querySelectorAll('.plane-tab').forEach(function(button){button.addEventListener('click',function(){
    const targetPlane=button.dataset.plane,info=Viewer.getVolumeInfo(targetPlane);
    if(state.quizMode||!info.isVolume)return;
    state.zoom=100;state.panX=0;state.panY=0;
    state.plane=targetPlane;state.sliceIndex=Number(state.slicePositions[info.indexAxis]??info.defaultSliceIndex);
    Viewer.loadSlice(state.sliceIndex,targetPlane);
    render();
  });});
  el('slice-slider').addEventListener('input',function(){goToSlice(el('slice-slider').value);});
  el('slice-prev').addEventListener('click',function(){goToSlice(state.sliceIndex-1);});
  el('slice-next').addEventListener('click',function(){goToSlice(state.sliceIndex+1);});
  canvasEl.addEventListener('keydown',function(event){
    if(state.quizMode)return;
    const info=Viewer.getVolumeInfo(state.plane);
    if(event.key==='Home'){event.preventDefault();goToSlice(0);return;}
    if(event.key==='End'){event.preventDefault();goToSlice(info.sliceCount-1);return;}
    const delta=event.key==='ArrowDown'||event.key==='PageDown'?1:event.key==='ArrowUp'||event.key==='PageUp'?-1:0;
    if(!delta)return;
    event.preventDefault();goToSlice(state.sliceIndex+delta*(event.key==='PageUp'||event.key==='PageDown'?10:1));
  });
  el('schematic-canvas').addEventListener('wheel',function(event){
    if(event.target.closest('button'))return;
    const info=Viewer.getVolumeInfo(state.plane);
    if(state.quizMode||!info.isVolume||Math.abs(event.deltaY)<6)return;
    event.preventDefault();goToSlice(state.sliceIndex+(event.deltaY>0?1:-1));
  },{passive:false});
  document.querySelectorAll('.level-button').forEach(function(button){button.addEventListener('click',function(){state.level=button.dataset.level;renderViewer();renderTriPlanar();});});
  el('display-single').addEventListener('click',function(){setDisplayMode('single');});
  el('display-triplanar').addEventListener('click',function(){setDisplayMode('tri');});
  el('tri-planar-return').addEventListener('click',function(){setDisplayMode('single');});
  triPlaneConfigs.forEach(function(config){
    el('tri-'+config.plane+'-slider').addEventListener('input',function(){
      state.slicePositions[config.axis]=Math.max(0,Math.min(config.count-1,Math.trunc(Number(this.value)||0)));
      renderTriPlanar();
    });
    const triCanvas=el('tri-'+config.plane+'-canvas');
    triCanvas.addEventListener('keydown',function(event){
      if(state.displayMode!=='tri'||state.quizMode)return;
      const current=state.slicePositions[config.axis];
      let next=current;
      if(event.key==='Home')next=0;
      else if(event.key==='End')next=config.count-1;
      else if(event.key==='ArrowDown')next=current+1;
      else if(event.key==='ArrowUp')next=current-1;
      else if(event.key==='PageDown')next=current+10;
      else if(event.key==='PageUp')next=current-10;
      else return;
      event.preventDefault();
      state.slicePositions[config.axis]=Math.max(0,Math.min(config.count-1,next));
      renderTriPlanar();
    });
    const card=document.querySelector('[data-tri-plane="'+config.plane+'"]');
    card.querySelector('[data-open-plane]').addEventListener('click',function(){openTriPlane(config.plane);});
  });
  el('learn-mode').addEventListener('click',exitQuiz);
  el('quiz-mode').addEventListener('click',function(){if(DATA.items.filter(function(item){return state.visible[item.id];}).length<4)DATA.items.slice(0,4).forEach(function(item){state.visible[item.id]=true;});startQuiz();});
  el('next-question').addEventListener('click',nextQuestion);
  el('reset-quiz').addEventListener('click',function(){state.score=0;state.answered=0;state.answeredCurrent=false;if(state.quizMode)state.question=Quiz.createQuestion(getSliceItems().filter(function(item){return state.visible[item.id];}),null);render();el('answer-feedback').textContent=t('scoreReset');});
  el('export-local-progress').addEventListener('click',function(){
    const payload=Progress.exportData();
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='ct-edu-progress-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    renderProgress('progressExported');
  });
  el('restore-local-progress').addEventListener('click',function(){
    el('restore-local-progress-file').click();
  });
  el('restore-local-progress-file').addEventListener('change',async function(){
    const input=this,file=input.files&&input.files[0];
    if(!file)return;
    try{
      if(file.size>1024*1024){renderProgress('progressFileTooLarge');return;}
      if(!window.confirm(t('progressRestoreConfirm')))return;
      const payload=JSON.parse(await file.text());
      const result=Progress.importData(payload);
      if(!result.imported){
        renderProgress(result.reason==='invalid-backup'||result.reason==='invalid-attempt'?'progressImportInvalid':'progressImportFailed');
        return;
      }
      renderProgress(result.truncated?'progressRestoredTruncated':'progressRestored');
    }catch(error){
      renderProgress('progressImportInvalid');
    }finally{
      input.value='';
    }
  });
  el('reset-local-progress').addEventListener('click',function(){
    const cleared=Progress.clear();
    renderProgress(cleared?'progressSaved':'progressResetFailed');
  });
  canvasEl.addEventListener('pointerdown',function(event){
    if(event.button!==0||state.quizMode||Viewer.getStatus().state!=='ready')return;
    pointerDrag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,panX:state.panX,panY:state.panY,moved:false};
    try{canvasEl.setPointerCapture(event.pointerId);}catch(error){}
  });
  canvasEl.addEventListener('pointermove',function(event){
    if(!pointerDrag||pointerDrag.pointerId!==event.pointerId)return;
    const dx=event.clientX-pointerDrag.startX,dy=event.clientY-pointerDrag.startY;
    if(Math.abs(dx)>3||Math.abs(dy)>3)pointerDrag.moved=true;
    if(pointerDrag.moved){
      state.panX=pointerDrag.panX+dx;state.panY=pointerDrag.panY+dy;
      applyCanvasTransform();canvasEl.style.cursor='grabbing';
    }
  });
  function finishPointerDrag(event){
    if(!pointerDrag||pointerDrag.pointerId!==event.pointerId)return;
    suppressCanvasClick=pointerDrag.moved;
    pointerDrag=null;
    applyCanvasTransform();
    if(suppressCanvasClick)window.setTimeout(function(){suppressCanvasClick=false;},120);
    try{canvasEl.releasePointerCapture(event.pointerId);}catch(error){}
  }
  canvasEl.addEventListener('pointerup',finishPointerDrag);
  canvasEl.addEventListener('pointercancel',finishPointerDrag);
  canvasEl.addEventListener('click',function(event){
    if(suppressCanvasClick){suppressCanvasClick=false;return;}
    if(state.quizMode||Viewer.getStatus().state!=='ready')return;
    const segmentId=Viewer.hitTest(canvasEl,event.clientX,event.clientY);
    const item=DATA.bySegmentId(segmentId);
    if(item&&state.visible[item.id]){state.selectedId=item.id;render();}
  });
  window.addEventListener('ctedu:assets-ready',function(){const status=Viewer.getStatus();if(status.state==='ready'){state.plane=status.plane||state.plane;state.sliceIndex=status.sliceIndex;const info=Viewer.getVolumeInfo(state.plane);if(info.indexAxis)state.slicePositions[info.indexAxis]=status.sliceIndex;if(state.windowLevelStatus==='note'&&Viewer.getWindowLevelInfo&&Viewer.getWindowLevelInfo().rawAvailable)state.windowLevelStatus='applied';const available=getSliceItems();if(available.length&&!available.some(function(item){return item.id===state.selectedId;}))state.selectedId=available[0].id;render();}else renderViewer();});
  document.addEventListener('keydown',function(event){if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){event.preventDefault();searchEl.focus();}if(event.key==='Escape'&&state.quizMode)exitQuiz();});
  render();
})();
