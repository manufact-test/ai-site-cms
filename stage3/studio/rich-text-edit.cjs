'use strict';
// Preserve the approved styling and links of typed Design Graph text runs.
// Only a human can deliberately remove a rich-text run in the advanced editor;
// a site-wide search must never silently flatten a styled heading/paragraph.
const MAX_TEXT=3000;
const illegal=/[\x00-\x08\x0b\x0c\x0e-\x1f]/;
function checkRuns(node){
 if(!['heading','text'].includes(node?.type)||!Array.isArray(node.runs)||
  node.runs.length<2||node.runs.length>16||
  node.runs.some(run=>typeof run.text!=='string'||run.text.length<1||run.text.length>1500)||
  node.runs.map(run=>run.text).join('')!==node.text)
  throw Error('Оформленные фрагменты изменены или имеют неверную структуру');
}
function updateTexts(node,texts){
 checkRuns(node);
 if(!Array.isArray(texts)||texts.length!==node.runs.length||
  texts.some(s=>typeof s!=='string'||s.length<1||s.length>1500||illegal.test(s)))
  throw Error('Каждый фрагмент должен содержать 1–1500 безопасных символов');
 const text=texts.join('');
 if(text.length>MAX_TEXT)throw Error('Общий текст не может превышать 3000 символов');
 return {text,runs:node.runs.map((run,i)=>({...run,text:texts[i]}))};
}
const escapePattern=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function replaceLiteral(node,needle,replacement){
 if(typeof node?.text!=='string'||typeof needle!=='string'||needle.length<2||
  typeof replacement!=='string'||illegal.test(replacement))throw Error('Недопустимые параметры замены');
 const regex=new RegExp(escapePattern(needle),'gi');
 const expected=node.text.replace(regex,()=>replacement);
 if(!node.runs)return {after:expected,runTexts:null,blocked:false,reason:''};
 checkRuns(node);
 const texts=node.runs.map(run=>run.text.replace(regex,()=>replacement));
 const actual=texts.join('');
 if(expected!==actual)return {after:node.text,runTexts:null,blocked:true,
  reason:'Совпадение пересекает границу оформленных фрагментов. Откройте их для ручной правки.'};
 try{
  updateTexts(node,texts);
 }catch(error){return {after:node.text,runTexts:null,blocked:true,reason:error.message};}
 return {after:actual,runTexts:texts,blocked:false,reason:''};
}
module.exports=Object.freeze({updateTexts,replaceLiteral});
