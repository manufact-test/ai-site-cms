'use strict';
/* Bounded browser-computed CSS layout observations. No customer text or
 * unapproved full URLs are returned; not Google or accessibility proof.
 */
const METHOD='computed-css-layout-v1';
const REASONS=Object.freeze(['sampling-error','element-limit',
 'dom-changed-during-sampling','css-changing-during-sampling']);
const SHA=/^[a-f0-9]{64}$/;
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(x)&&Number.isFinite(Date.parse(x));
const fail=m=>{throw Error('Rendered CSS visibility: '+m)};
function sample(targets){
 /* Serialized by Playwright page.evaluate: no closure or Node dependencies. */
 if(!Array.isArray(targets)||targets.length>60)
  return {status:'unavailable',reason:'element-limit'};
 const headings=[...document.querySelectorAll('h1')];
 const secondary=[...document.querySelectorAll('h2,h3,h4,h5,h6')];
 const mains=[...document.querySelectorAll('main,[role="main"]')];
 const anchors=[...document.querySelectorAll('a[href]')];
 if(headings.length>100||secondary.length>200||mains.length>100||anchors.length>2000)
  return {status:'unavailable',reason:'element-limit'};
 function shown(el,depth=0){
  try{
   if(!el.isConnected)return false;
   const style=getComputedStyle(el);
   if(style.display==='none'||style.visibility==='hidden'||
    style.visibility==='collapse'||Number(style.opacity)<=0)return false;
   if(style.display==='contents'&&depth<3)
    return [...(el.children||[])].slice(0,30).some(x=>shown(x,depth+1));
   if(typeof el.checkVisibility==='function'&&
    !el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))return false;
   for(const r of el.getClientRects())if(r.width>0&&r.height>0)return true;
   return false;
  }catch{return false}
 }
 const excluded=el=>{try{return Boolean(el.closest('[aria-hidden="true"],[inert]'))}catch{return false}};
 const tally=nodes=>({total:nodes.length,layoutVisible:nodes.filter(shown).length,
  visiblyExcluded:nodes.filter(x=>shown(x)&&excluded(x)).length});
 const routes=targets.map(t=>{
  const matching=anchors.filter(a=>{
   try{return new URL(a.getAttribute('href'),document.baseURI).href===t.href}
   catch{return false}
  });
  return {path:t.path,anchors:matching.length,layoutVisible:matching.filter(shown).length,
   visiblyExcluded:matching.filter(x=>shown(x)&&excluded(x)).length};
 });
 return {status:'observed',h1:tally(headings),main:tally(mains),
  secondaryHeadings:tally(secondary),routes};
}
function assertObservation(v,htmlSha,paths=null){
 if(!v||v.method!==METHOD||!iso(v.checkedAt)||!['observed','unavailable'].includes(v.status))
  fail('invalid observation envelope');
 if(v.status==='unavailable'){
  if(!REASONS.includes(v.reason)||Object.keys(v).sort().join(',')!==
   'checkedAt,method,reason,status')fail('invalid unavailable observation');
  return v;
 }
 if(!SHA.test(htmlSha||'')||v.htmlSha256!==htmlSha||
  Object.keys(v).sort().join(',')!==
  'checkedAt,h1,htmlSha256,main,method,routes,secondaryHeadings,status')
  fail('CSS observation belongs to another DOM snapshot');
 function checkTally(x){
  if(!x||typeof x!=='object'||Array.isArray(x)||
   Object.keys(x).sort().join(',')!=='layoutVisible,total,visiblyExcluded')
   fail('invalid CSS tally');
  for(const k of ['total','layoutVisible','visiblyExcluded'])
   if(!Number.isInteger(x[k])||x[k]<0||x[k]>2000)fail('invalid CSS count');
  if(x.layoutVisible>x.total||x.visiblyExcluded>x.layoutVisible)
   fail('CSS visibility exceeds DOM count');
 }
 checkTally(v.h1);checkTally(v.main);checkTally(v.secondaryHeadings);
 if(!Array.isArray(v.routes)||v.routes.length>60)fail('too many approved routes');
 const seen=new Set();
 for(const r of v.routes){
  if(!r||!ROUTE.test(r.path)||seen.has(r.path)||Object.keys(r).sort().join(',')!==
   'anchors,layoutVisible,path,visiblyExcluded')fail('invalid approved-route observation');
  seen.add(r.path);
  checkTally({total:r.anchors,layoutVisible:r.layoutVisible,visiblyExcluded:r.visiblyExcluded});
 }
 if(paths!==null&&[...paths].sort().join(',')!==[...seen].sort().join(','))
  fail('CSS routes differ from approved Blueprint destinations');
 return v;
}
module.exports=Object.freeze({METHOD,REASONS,sample,assertObservation});