'use strict';
/* Read-only browser image loading/priority observation for approved rendered DOM.
 * Returns only bounded counts, never client image src/alt text or foreign URLs.
 * No lab/field Core Web Vitals or Google ranking claims.
 */
const METHOD='browser-image-loading-v1';
const REASONS=Object.freeze(['sampling-error','element-limit',
 'dom-changed-during-sampling','image-state-changing-during-sampling']);
const SHA=/^[a-f0-9]{64}$/;
const COUNT_KEYS=Object.freeze(['total','visible','visibleFailed','visiblePending',
 'aboveFold','aboveFoldLazy','largeAboveFold','largeAboveFoldFailed',
 'largeAboveFoldLazy','visibleMissingAlt','visibleEmptyAlt',
 'visibleMissingDimensions','visibleUpscaled']);
const fail=m=>{throw Error('Rendered image observation: '+m)};
const iso=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s));
function sample(viewport){
 /* Playwright page.evaluate serializes this self-contained function. */
 if(!viewport||!Number.isInteger(viewport.width)||!Number.isInteger(viewport.height)||
  viewport.width<1||viewport.height<1)
  return {status:'unavailable',reason:'sampling-error'};
 const images=[...document.querySelectorAll('img')];
 if(images.length>1000)return {status:'unavailable',reason:'element-limit'};
 const m={total:images.length,visible:0,visibleFailed:0,visiblePending:0,
  aboveFold:0,aboveFoldLazy:0,largeAboveFold:0,largeAboveFoldFailed:0,
  largeAboveFoldLazy:0,visibleMissingAlt:0,visibleEmptyAlt:0,
  visibleMissingDimensions:0,visibleUpscaled:0};
 for(const img of images){
  let visible=false,rect;
  try{
   if(!img.isConnected)continue;
   const style=getComputedStyle(img);
   if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||
    Number(style.opacity)<=0)continue;
   if(typeof img.checkVisibility==='function'&&
    !img.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
   rect=img.getBoundingClientRect();
   visible=Number.isFinite(rect.width)&&Number.isFinite(rect.height)&&
    rect.width>0&&rect.height>0;
  }catch{continue}
  if(!visible)continue;
  m.visible++;
  const source=Boolean(img.currentSrc||img.getAttribute('src')||img.getAttribute('srcset'));
  const loaded=img.complete===true&&Number(img.naturalWidth)>0;
  const failed=source&&img.complete===true&&!loaded;
  const pending=source&&img.complete!==true;
  if(failed)m.visibleFailed++;
  if(pending)m.visiblePending++;
  /* Count large first-screen candidates by actual viewport intersection.
   * A giant image with a 1px strip at the fold is not a large visible hero.
   */
  const foldWidth=Math.max(0,Math.min(rect.right,viewport.width)-Math.max(rect.left,0));
  const foldHeight=Math.max(0,Math.min(rect.bottom,viewport.height)-Math.max(rect.top,0));
  const fold=Number.isFinite(foldWidth)&&Number.isFinite(foldHeight)&&
   foldWidth>0&&foldHeight>0;
  const large=fold&&foldWidth*foldHeight>=viewport.width*viewport.height*.15;
  const lazy=String(img.loading||img.getAttribute('loading')||'').toLowerCase()==='lazy';
  if(fold){m.aboveFold++;if(lazy)m.aboveFoldLazy++}
  if(large){
   m.largeAboveFold++;if(failed)m.largeAboveFoldFailed++;
   if(lazy)m.largeAboveFoldLazy++;
  }
  if(!img.hasAttribute('alt'))m.visibleMissingAlt++;
  else if(img.getAttribute('alt')==='')m.visibleEmptyAlt++;
  if(!img.hasAttribute('width')||!img.hasAttribute('height'))
   m.visibleMissingDimensions++;
  if(loaded&&Number(img.naturalWidth)>0&&rect.width>Number(img.naturalWidth)*1.5)
   m.visibleUpscaled++;
 }
 return {status:'observed',counts:m};
}
function assertObservation(v,htmlSha){
 if(!v||v.method!==METHOD||!iso(v.checkedAt)||
  !['observed','unavailable'].includes(v.status))
  fail('invalid image observation envelope');
 if(v.status==='unavailable'){
  if(!REASONS.includes(v.reason)||
   Object.keys(v).sort().join(',')!=='checkedAt,method,reason,status')
   fail('invalid unavailable image observation');
  return v;
 }
 if(!SHA.test(htmlSha||'')||v.htmlSha256!==htmlSha||
  Object.keys(v).sort().join(',')!=='checkedAt,counts,htmlSha256,method,status')
  fail('image observations belong to a different DOM snapshot');
 const m=v.counts;
 if(!m||typeof m!=='object'||Array.isArray(m)||
  Object.keys(m).sort().join(',')!==COUNT_KEYS.slice().sort().join(','))
  fail('invalid image counter keys');
 for(const k of COUNT_KEYS)if(!Number.isInteger(m[k])||m[k]<0||m[k]>1000)
  fail('invalid bounded image count '+k);
 for(const k of COUNT_KEYS.filter(k=>k!=='total'))
  if(m[k]>m.total)fail('image count exceeds total '+k);
 if(m.visible>m.total||m.aboveFold>m.visible||m.largeAboveFold>m.aboveFold||
  m.largeAboveFoldFailed>m.visibleFailed||m.largeAboveFoldFailed>m.largeAboveFold||
  m.largeAboveFoldLazy>m.aboveFoldLazy||m.largeAboveFoldLazy>m.largeAboveFold||
  m.visibleFailed+m.visiblePending>m.visible||
  m.aboveFoldLazy>m.aboveFold||m.visibleMissingAlt>m.visible||
  m.visibleEmptyAlt>m.visible||m.visibleMissingDimensions>m.visible||
  m.visibleUpscaled>m.visible||
  m.visibleMissingAlt+m.visibleEmptyAlt>m.visible)
  fail('inconsistent image subset counts');
 return v;
}
module.exports=Object.freeze({METHOD,REASONS,COUNT_KEYS,sample,assertObservation});