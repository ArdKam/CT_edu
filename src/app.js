(function () {
  'use strict';
  const DATA=window.CTEduAnatomy, Viewer=window.CTEduViewer, Quiz=window.CTEduQuiz;
  if(!DATA||!Viewer||!Quiz) return;
  const copy={
    fa:{
      moduleCrumb:'آناتومی مقطعی',moduleName:'شکم · نمای محوری',educationalOnly:'صرفاً آموزشی',eyebrow:'FOUNDATIONS · NORMAL ANATOMY',pageTitle:'از برش تا شناخت ساختار',pageIntro:'ساختارهای طبیعی شکم را بشناس، لایه‌های رنگی را بررسی کن و بعد خودت را به چالش بکش.',pathLearn:'یادگیری',pathIdentify:'شناسایی',pathRecall:'یادآوری فعال',structuresLabel:'ساختار در این نما',sessionHint:'یک نمای شماتیک برای شروع',libraryKicker:'ANATOMY LIBRARY',anatomyTitle:'ساختارها',hideAll:'مخفی‌کردن همه',showAll:'نمایش همه',searchPlaceholder:'جست‌وجوی ساختار…',selectStructure:'برای انتخاب، نام ساختار را بزن',colorNote:'هر رنگ نمایندهٔ یک ساختار در نمونه است',viewerTitle:'نمای محوری شکم',viewerSubtitle:'پیکربندی آموزشی · غیرتشخیصی',learnMode:'مطالعه',quizMode:'تمرین',recallKicker:'ACTIVE RECALL',quizPrompt:'ساختار برجسته‌شده کدام است؟',sessionScore:'امتیاز این جلسه',schematicBadge:'نمونهٔ شماتیک · CT واقعی نیست',patientRight:'راست بیمار',patientLeft:'چپ بیمار',notToScale:'شماتیک · غیرمقیاس‌دار',viewPreset:'تأکید آموزشی',levelOrgans:'اندام‌ها',levelVessels:'عروق',levelPosterior:'ساختارهای خلفی',colorOverlays:'رنگ‌بندی',anatomyLabels:'برچسب‌ها',provenanceTitle:'دربارهٔ این تصویر',provenanceText:'این نمایش صرفاً شماتیک است؛ هنوز هیچ CT بیمار یا ماسک قطعه‌بندی بارگذاری نشده است. موقعیت‌ها برای آموزش مفهومی‌اند.',inspectorKicker:'STRUCTURE INSPECTOR',detailTitle:'اطلاعات ساختار',selectedStructure:'ساختار انتخاب‌شده',demoStructure:'ساختار آموزشی نمونه',anatomicalNote:'نکتهٔ آناتومیک',orientationTitle:'جهت‌یابی',orientationNote:'سمت راست بیمار در سمت چپ تصویر نمایش داده می‌شود.',nextQuestion:'سؤال بعدی ←',resetQuiz:'شروع دوبارهٔ امتیاز',learnNudge:'یک ساختار را از فهرست انتخاب کن تا رنگ، نام و نکتهٔ آن را بررسی کنی.',footerDisclaimer:'مناسب یادگیری آناتومی؛ برای تشخیص یا تصمیم‌گیری بالینی استفاده نشود.',dataReviewLink:'وضعیت داده و مجوز',noResults:'ساختاری با این نام پیدا نشد.',quizCorrect:'درست بود. خوب شناسایی کردی.',quizWrong:'این پاسخ درست نیست. به نشانگرهای جهت و محل ساختار توجه کن.',optionsInstruction:'یک گزینه را انتخاب کن.',scoreReset:'امتیاز این جلسه پاک شد.',selected:'انتخاب شده',hidden:'مخفی',visible:'نمایان'
    },
    en:{
      moduleCrumb:'Cross-sectional anatomy',moduleName:'Abdomen · Axial view',educationalOnly:'Educational only',eyebrow:'FOUNDATIONS · NORMAL ANATOMY',pageTitle:'From slice to structure',pageIntro:'Learn normal abdominal anatomy, explore color overlays, then challenge your recall.',pathLearn:'Learn',pathIdentify:'Identify',pathRecall:'Active recall',structuresLabel:'structures in this view',sessionHint:'A schematic view to begin',libraryKicker:'ANATOMY LIBRARY',anatomyTitle:'Structures',hideAll:'Hide all',showAll:'Show all',searchPlaceholder:'Search structures…',selectStructure:'Select a name to inspect it',colorNote:'Each color represents one demo structure',viewerTitle:'Axial abdomen',viewerSubtitle:'Teaching schematic · non-diagnostic',learnMode:'Explore',quizMode:'Practice',recallKicker:'ACTIVE RECALL',quizPrompt:'Which structure is highlighted?',sessionScore:'Session score',schematicBadge:'SCHEMATIC DEMO · NOT A REAL CT',patientRight:'Patient right',patientLeft:'Patient left',notToScale:'Schematic · not to scale',viewPreset:'Teaching emphasis',levelOrgans:'Organs',levelVessels:'Vessels',levelPosterior:'Posterior',colorOverlays:'Color overlays',anatomyLabels:'Labels',provenanceTitle:'About this image',provenanceText:'This is a schematic demonstration. No patient CT or segmentation mask has been loaded. Locations are conceptual teaching cues.',inspectorKicker:'STRUCTURE INSPECTOR',detailTitle:'Structure details',selectedStructure:'SELECTED STRUCTURE',demoStructure:'Demonstration anatomy',anatomicalNote:'Anatomical note',orientationTitle:'Orientation',orientationNote:'Patient right is displayed on the viewer’s left.',nextQuestion:'Next question →',resetQuiz:'Reset score',learnNudge:'Choose a structure from the list to inspect its color, name, and note.',footerDisclaimer:'For anatomy learning only; not for diagnosis or clinical decisions.',dataReviewLink:'Data & license status',noResults:'No structures match this search.',quizCorrect:'Correct. Well identified.',quizWrong:'Not quite. Check the orientation markers and anatomical position.',optionsInstruction:'Choose one option.',scoreReset:'Session score has been reset.',selected:'Selected',hidden:'Hidden',visible:'Visible'
    }
  };
  const el=function(id){return document.getElementById(id);};
  function safeGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function safeSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  const state={lang:safeGet('ctedu-lang')==='en'?'en':'fa',selectedId:'liver',overlaysOn:true,labelsOn:true,previousLabelsOn:true,zoom:100,level:'organs',query:'',quizMode:false,question:null,score:0,answered:0,lastQuestionId:null,answeredCurrent:false,visible:Object.fromEntries(DATA.items.map(function(i){return [i.id,true];}))};
  const langButton=el('language-toggle'),listEl=el('structure-list'),searchEl=el('structure-search'),canvasEl=el('schematic-canvas'),overlaysToggle=el('toggle-overlays'),labelsToggle=el('toggle-labels');
  function t(k){return (copy[state.lang]&&copy[state.lang][k])||copy.en[k]||k;}
  function displayName(item){return state.lang==='fa'?item.nameFa:item.nameEn;}
  function number(value){return state.lang==='fa'?String(value).replace(/[0-9]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'[Number(d)];}):String(value);}
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function applyLanguage(){
    const fa=state.lang==='fa';document.documentElement.lang=state.lang;document.documentElement.dir=fa?'rtl':'ltr';document.body.classList.toggle('lang-fa',fa);document.body.classList.toggle('lang-en',!fa);
    document.querySelectorAll('[data-i18n]').forEach(function(node){const key=node.getAttribute('data-i18n');if(t(key))node.textContent=t(key);});
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(node){node.placeholder=t(node.getAttribute('data-i18n-placeholder'));});
    langButton.innerHTML=fa?'EN <span aria-hidden="true">↔</span> فا':'فا <span aria-hidden="true">↔</span> EN';
    langButton.setAttribute('aria-label',fa?'Switch to English':'تغییر زبان به فارسی');
  }
  function renderList(){
    const matching=DATA.search(state.query);listEl.innerHTML='';
    matching.forEach(function(item){
      const li=document.createElement('li');li.className='structure-row'+(state.selectedId===item.id?' active':'');
      const select=document.createElement('button');select.type='button';select.className='structure-select';select.dataset.selectStructure=item.id;select.setAttribute('aria-pressed',String(state.selectedId===item.id));
      select.innerHTML='<span class="structure-swatch" style="--swatch:'+item.color+'"></span><span class="structure-name"><strong>'+escapeHtml(displayName(item))+'</strong><small>'+escapeHtml(state.lang==='fa'?item.nameEn:item.nameFa)+'</small></span><span class="row-chevron" aria-hidden="true">'+(state.lang==='fa'?'‹':'›')+'</span>';
      const eye=document.createElement('button');eye.type='button';eye.className='visibility-button'+(state.visible[item.id]?'':' is-off');eye.dataset.toggleStructure=item.id;eye.setAttribute('aria-label',(state.visible[item.id]?t('hidden'):t('visible'))+' · '+displayName(item));eye.setAttribute('aria-pressed',String(state.visible[item.id]));eye.innerHTML=state.visible[item.id]?'<span aria-hidden="true">◉</span>':'<span aria-hidden="true">○</span>';
      li.append(select,eye);listEl.appendChild(li);
    });
    if(!matching.length)listEl.innerHTML='<li class="empty-results">'+t('noResults')+'</li>';
    const visible=DATA.items.filter(function(item){return state.visible[item.id];}).length;
    el('structure-count').textContent=number(DATA.items.length);el('visible-count').textContent=number(visible)+'/'+number(DATA.items.length);
    el('visibility-all').textContent=visible===DATA.items.length?t('hideAll'):t('showAll');
  }
  function renderViewer(){
    canvasEl.innerHTML=Viewer.buildSvg({items:DATA.items,visible:state.visible,overlaysOn:state.overlaysOn,labelsOn:state.labelsOn&&!state.quizMode,selectedId:state.selectedId,quizId:state.quizMode&&state.question?state.question.id:null,zoom:state.zoom,language:state.lang,level:state.level});
    canvasEl.querySelectorAll('[data-structure]').forEach(function(group){
      const activate=function(){if(!state.quizMode){state.selectedId=group.dataset.structure;render();}};
      group.addEventListener('click',activate);group.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
    });
    el('zoom-value').textContent=number(state.zoom)+'%';overlaysToggle.checked=state.overlaysOn;labelsToggle.checked=state.labelsOn;
    document.querySelectorAll('.level-button').forEach(function(button){button.classList.toggle('active',button.dataset.level===state.level);});
  }
  function renderDetails(){
    const target=state.quizMode&&state.question?DATA.byId(state.question.id):DATA.byId(state.selectedId),hidden=Boolean(state.quizMode&&!state.answeredCurrent);
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
    state.question.selectedId=id;state.question.answered=true;state.answeredCurrent=true;state.answered+=1;if(result.correct)state.score+=1;renderViewer();renderDetails();
  }
  function startQuiz(){
    state.quizMode=true;state.lastQuestionId=state.question?state.question.id:null;
    const visible=DATA.items.filter(function(item){return state.visible[item.id];});
    if(visible.length<4)DATA.items.slice(0,4).forEach(function(item){state.visible[item.id]=true;});
    state.question=Quiz.createQuestion(DATA.items.filter(function(item){return state.visible[item.id];}),state.lastQuestionId);state.answeredCurrent=false;
    state.previousLabelsOn=state.labelsOn;state.labelsOn=false;el('app').dataset.mode='quiz';render();
  }
  function nextQuestion(){
    if(!state.quizMode||!state.answeredCurrent)return;
    state.lastQuestionId=state.question.id;const pool=DATA.items.filter(function(item){return state.visible[item.id];});
    if(pool.length<4){el('answer-feedback').textContent=state.lang==='fa'?'برای تمرین، دست‌کم چهار ساختار را نمایش بده.':'Show at least four structures to practice.';return;}
    state.question=Quiz.createQuestion(pool,state.lastQuestionId);state.answeredCurrent=false;render();
  }
  function exitQuiz(){state.quizMode=false;state.question=null;state.answeredCurrent=false;state.labelsOn=state.previousLabelsOn;el('app').dataset.mode='learn';render();}
  function render(){applyLanguage();renderList();renderViewer();renderDetails();canvasEl.setAttribute('aria-label',t('schematicBadge'));}
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
    const allVisible=DATA.items.every(function(item){return state.visible[item.id];});DATA.items.forEach(function(item){state.visible[item.id]=!allVisible;});
    if(state.quizMode&&(!state.visible[state.question.id]||DATA.items.filter(function(item){return state.visible[item.id];}).length<4))startQuiz();
    else{if(!allVisible)state.selectedId=DATA.items[0].id;render();}
  });
  overlaysToggle.addEventListener('change',function(){state.overlaysOn=overlaysToggle.checked;renderViewer();});
  labelsToggle.addEventListener('change',function(){state.labelsOn=labelsToggle.checked;renderViewer();});
  el('zoom-in').addEventListener('click',function(){state.zoom=Math.min(140,state.zoom+10);renderViewer();});
  el('zoom-out').addEventListener('click',function(){state.zoom=Math.max(70,state.zoom-10);renderViewer();});
  el('zoom-reset').addEventListener('click',function(){state.zoom=100;renderViewer();});
  document.querySelectorAll('.level-button').forEach(function(button){button.addEventListener('click',function(){state.level=button.dataset.level;renderViewer();});});
  el('learn-mode').addEventListener('click',exitQuiz);
  el('quiz-mode').addEventListener('click',function(){if(DATA.items.filter(function(item){return state.visible[item.id];}).length<4)DATA.items.slice(0,4).forEach(function(item){state.visible[item.id]=true;});startQuiz();});
  el('next-question').addEventListener('click',nextQuestion);
  el('reset-quiz').addEventListener('click',function(){state.score=0;state.answered=0;state.answeredCurrent=false;if(state.quizMode)state.question=Quiz.createQuestion(DATA.items.filter(function(item){return state.visible[item.id];}),null);render();el('answer-feedback').textContent=t('scoreReset');});
  document.addEventListener('keydown',function(event){if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){event.preventDefault();searchEl.focus();}if(event.key==='Escape'&&state.quizMode)exitQuiz();});
  render();
})();
