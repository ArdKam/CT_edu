(function (root) {
  'use strict';
  function shuffle(items, random) {
    const copy=items.slice(), rng=random || Math.random;
    for(let i=copy.length-1;i>0;i-=1){const j=Math.floor(rng()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
    return copy;
  }
  function createQuestion(items, previousId, random) {
    if(!Array.isArray(items)||items.length<4) throw new Error('Quiz needs at least four structures.');
    const pool=items.filter(function(item){return item.id!==previousId;});
    const target=shuffle(pool.length?pool:items,random)[0];
    const distractors=shuffle(items.filter(function(item){return item.id!==target.id;}),random).slice(0,3);
    return {id:target.id,options:shuffle([target].concat(distractors),random).map(function(item){return {id:item.id,nameEn:item.nameEn,nameFa:item.nameFa};}),answered:false,selectedId:null};
  }
  function evaluateAnswer(question, selectedId) {
    if(!question||question.answered) return {correct:false,accepted:false};
    return {correct:question.id===selectedId,accepted:true};
  }
  const api={shuffle:shuffle,createQuestion:createQuestion,evaluateAnswer:evaluateAnswer};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.CTEduQuiz=api;
})(typeof window!=='undefined'?window:globalThis);
