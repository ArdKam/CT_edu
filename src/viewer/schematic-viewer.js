(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const SHAPES = {
    liver: '<path d="M150 142 C173 103 243 105 290 132 C320 149 326 176 301 198 C278 217 224 221 186 203 C155 189 135 169 150 142 Z"/>',
    spleen: '<path d="M495 151 C509 123 541 117 558 142 C577 170 563 204 541 216 C521 225 496 200 493 178 C491 167 491 159 495 151 Z"/>',
    'right-kidney': '<path d="M225 255 C202 238 183 255 183 283 C182 310 202 327 225 313 C242 303 249 278 236 260 C232 255 229 254 225 255 Z"/>',
    'left-kidney': '<path d="M477 258 C500 239 520 257 519 284 C519 309 499 328 477 313 C460 302 453 280 466 262 C469 259 473 257 477 258 Z"/>',
    ivc: '<ellipse cx="319" cy="314" rx="18" ry="25"/>',
    aorta: '<ellipse cx="374" cy="310" rx="21" ry="22"/>',
    vertebra: '<path d="M332 364 Q345 350 359 358 L389 358 Q402 350 415 365 L412 399 Q399 413 373 412 Q346 413 334 398 Z"/><path d="M354 369 Q373 359 393 370 L394 392 Q373 402 354 392 Z" class="bone-detail"/>',
    'right-psoas': '<path d="M291 355 C276 369 273 396 286 424 Q297 435 310 421 C315 399 314 374 307 357 Z"/>',
    'left-psoas': '<path d="M434 356 C448 371 451 396 438 424 Q427 435 414 421 C409 399 410 374 417 357 Z"/>',
    stomach: '<path d="M343 155 C366 146 400 153 410 176 C423 198 401 228 380 233 C361 237 346 219 351 200 C356 183 332 171 343 155 Z"/>'
  };
  const LABELS = {
    liver: [222,162], spleen: [532,174], 'right-kidney': [210,284], 'left-kidney': [492,286],
    ivc: [319,315], aorta: [374,311], vertebra: [374,385], 'right-psoas': [293,393],
    'left-psoas': [432,393], stomach: [377,190]
  };
  function esc(s) { return String(s).replace(/[<>&"']/g, function (c) { return ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'})[c]; }); }
  function buildSvg(args) {
    const items=args.items, visible=args.visible, overlaysOn=args.overlaysOn, labelsOn=args.labelsOn;
    const selectedId=args.selectedId, quizId=args.quizId, zoom=args.zoom, language=args.language, level=args.level;
    const isFa=language==='fa';
    const groups=items.map(function(item) {
      const shown=visible[item.id]!==false;
      const selected=(quizId || selectedId)===item.id;
      let opacity=shown ? 1 : 0.1;
      if (level==='organs' && item.region!=='organ') opacity*=0.48;
      if (level==='vessels' && item.region!=='vessel') opacity*=0.45;
      if (level==='posterior' && item.region!=='posterior') opacity*=0.45;
      const fill=overlaysOn ? item.color : '#71808d';
      const label=isFa ? item.nameFa : item.nameEn;
      const pos=LABELS[item.id] || [350,280];
      const labelVisible=labelsOn && shown && !quizId;
      const shortLabel=label.length>19 ? label.slice(0,18)+'…' : label;
      const accessibleLabel=quizId?(selected?(isFa?'ساختار برجسته‌شده':'Highlighted structure'):(isFa?'ساختار آناتومیک':'Anatomical structure')):label;
      const accessibility=quizId?' aria-label="'+esc(accessibleLabel)+'"':' tabindex="0" role="button" aria-label="'+esc(label)+'" aria-pressed="'+String(selected)+'"';
      let result='<g class="anatomy-shape'+(selected?' is-selected':'')+'" data-structure="'+esc(item.id)+'"'+accessibility+' style="opacity:'+opacity+';--structure-color:'+fill+'">';
      result+='<g class="shape-fill" fill="'+fill+'" stroke="'+(selected?'#FFD18A':'#182432')+'" stroke-width="'+(selected?4:2)+'" stroke-linejoin="round">'+(SHAPES[item.shape]||'')+'</g>';
      if(labelVisible) result+='<text class="shape-label" x="'+pos[0]+'" y="'+pos[1]+'" text-anchor="middle">'+esc(shortLabel)+'</text>';
      if(selected) result+='<circle class="selection-ring" cx="'+pos[0]+'" cy="'+pos[1]+'" r="28" fill="none" stroke="#FFD18A" stroke-dasharray="4 6" stroke-width="2"/>';
      return result+'</g>';
    }).join('');
    const caption=isFa ? 'شماتیک آموزشی · بدون مقیاس' : 'EDUCATIONAL SCHEMATIC · NOT TO SCALE';
    return '<svg class="ct-schematic-svg" viewBox="0 0 700 560" xmlns="'+NS+'" style="transform:scale('+(zoom/100)+')" role="img" aria-label="'+(isFa?'نمای شماتیک محوری شکم؛ CT واقعی نیست':'Schematic axial abdomen; not a real CT scan')+'">'+
      '<defs><radialGradient id="bodyTone"><stop offset="0" stop-color="#29394B"/><stop offset="1" stop-color="#192533"/></radialGradient><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#8DA0B4" stroke-opacity=".06" stroke-width="1"/></pattern></defs>'+
      '<rect width="700" height="560" fill="#101923"/><rect width="700" height="560" fill="url(#grid)"/>'+
      '<ellipse cx="352" cy="276" rx="264" ry="218" fill="url(#bodyTone)" stroke="#728397" stroke-opacity=".55" stroke-width="2"/>'+
      '<ellipse cx="352" cy="276" rx="245" ry="199" fill="none" stroke="#B7C4D0" stroke-opacity=".18" stroke-width="18"/>'+
      '<path d="M143 235 Q175 92 315 91 M394 92 Q535 113 564 232" fill="none" stroke="#95A6B8" stroke-opacity=".16" stroke-width="4"/>'+
      '<g class="anatomy-layer">'+groups+'</g><text x="350" y="510" class="schematic-caption" text-anchor="middle">'+caption+'</text></svg>';
  }
  const api={buildSvg:buildSvg};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  root.CTEduViewer=api;
})(typeof window!=='undefined'?window:globalThis);
