'use strict';
/* Privacy-preserving rendered main-content footprint, not a text extractor.
 * Only numbers leave the isolated browser; no body text, words, labels,
 * snippets, element IDs or user information are returned.
 */
const METHOD='browser-main-text-footprint-v1';
const REASONS=Object.freeze(['sampling-error','element-limit',
 'dom-changed-during-sampling','text-changing-during-sampling']);
const SHA=/^[a-f0-9]{64}$/;
const KEYS=Object.freeze(['mainRegions','mainRawTextChars',
 'mainRenderedTextChars','mainRenderedWords','textBlocks',
 'visibleTextBlocks','hiddenTextBlocks']);
const fail=m=>{throw Error('Rendered main text footprint: '+m)};
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(x)&&Number.isFinite(Date.parse(x));
function sample(){
 /* Self-contained Playwright page.evaluate sampler. */
 try{
  const mains=[...document.querySelectorAll('main,[role="main"]')];
  if(mains.length>5)return {status:'unavailable',reason:'element-limit'};
  const blocks=[...document.querySelectorAll('main p,main li,[role="main"] p,[role="main"] li')];
  if(blocks.length>1500)return {status:'unavailable',reason:'element-limit'};
  const normalized=x=>String(x||'').replace(/\s+/g,' ').trim();
  let raw=0,rendered=0,words=0,visible=0,hidden=0;
  for(const main of mains){
   const txt=normalized(main.textContent);
   const display=normalized(main.innerText);
   raw+=txt.length;rendered+=display.length;
   words+=display?display.split(/\s+/).length:0;
   if(raw>250000||rendered>250000||words>250000)
    return {status:'unavailable',reason:'element-limit'};
  }
  for(const el of blocks){
   if(normalized(el.textContent).length<5)continue;
   let shown=false;
   try{
    const css=getComputedStyle(el);
    if(css.display!=='none'&&css.visibility!=='hidden'&&
     css.visibility!=='collapse'&&Number(css.opacity)>0&&
     (typeof el.checkVisibility!=='function'||el.checkVisibility({
      checkOpacity:true,checkVisibilityCSS:true}))){
     const r=el.getBoundingClientRect();
     shown=Number.isFinite(r.width)&&Number.isFinite(r.height)&&
      r.width>0&&r.height>0;
    }
   }catch{}
   if(shown)visible++;else hidden++;
  }
  return {status:'observed',counts:{
   mainRegions:mains.length,mainRawTextChars:raw,
   mainRenderedTextChars:rendered,mainRenderedWords:words,
   textBlocks:visible+hidden,visibleTextBlocks:visible,hiddenTextBlocks:hidden}};
 }catch{return {status:'unavailable',reason:'sampling-error'}}
}
function assertObservation(value,htmlSha){
 if(!value||value.method!==METHOD||!iso(value.checkedAt)||
  !['observed','unavailable'].includes(value.status))
  fail('invalid text footprint envelope');
 if(value.status==='unavailable'){
  if(!REASONS.includes(value.reason)||
   Object.keys(value).sort().join(',')!=='checkedAt,method,reason,status')
   fail('invalid unavailable text footprint');
  return value;
 }
 if(!SHA.test(htmlSha||'')||value.htmlSha256!==htmlSha||
  Object.keys(value).sort().join(',')!=='checkedAt,counts,htmlSha256,method,status')
  fail('main text footprint belongs to another rendered DOM');
 const m=value.counts;
 if(!m||typeof m!=='object'||Array.isArray(m)||
  Object.keys(m).sort().join(',')!==KEYS.slice().sort().join(','))
  fail('unrecognized text counters');
 for(const k of KEYS)
  if(!Number.isInteger(m[k])||m[k]<0||m[k]>(k==='mainRegions'?5:
   k.endsWith('Blocks')?1500:250000))
   fail('unbounded text count '+k);
 if(m.visibleTextBlocks+m.hiddenTextBlocks!==m.textBlocks||
  m.mainRenderedWords>m.mainRenderedTextChars||
  (m.mainRegions===0&&(m.mainRawTextChars||m.mainRenderedTextChars||
   m.mainRenderedWords||m.textBlocks)))
  fail('inconsistent text count subsets');
 return value;
}
module.exports=Object.freeze({METHOD,REASONS,KEYS,sample,assertObservation});
