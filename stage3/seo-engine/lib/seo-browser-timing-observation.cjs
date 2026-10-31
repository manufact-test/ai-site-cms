'use strict';
/* Chromium navigation timing / FCP / resource-count triage, read-only.
 * Never exports resource URLs, response bodies, timing entry names or user
 * values. No claim of Google Core Web Vitals, field/RUM, rankings or release.
 */
const METHOD='browser-navigation-timing-v1';
const REASONS=Object.freeze(['sampling-error','navigation-timing-unavailable',
 'resource-limit','dom-changed-during-sampling','timing-changing-during-sampling']);
const SHA=/^[a-f0-9]{64}$/;
const KEYS=Object.freeze(['responseStartMs','responseEndMs','domContentLoadedMs',
 'loadEventEndMs','firstContentfulPaintMs','resourceCount','resourceTransferBytes']);
const fail=m=>{throw Error('Rendered timing observation: '+m)};
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(x)&&Number.isFinite(Date.parse(x));
function sample(){
 /* Self-contained page.evaluate function, no Node closures. */
 try{
  if(typeof performance?.getEntriesByType!=='function')
   return {status:'unavailable',reason:'navigation-timing-unavailable'};
  const nav=performance.getEntriesByType('navigation');
  if(!Array.isArray(nav)||nav.length!==1)
   return {status:'unavailable',reason:'navigation-timing-unavailable'};
  const entry=nav[0],metrics={
   responseStartMs:Math.round(Number(entry.responseStart)),
   responseEndMs:Math.round(Number(entry.responseEnd)),
   domContentLoadedMs:Math.round(Number(entry.domContentLoadedEventEnd)),
   loadEventEndMs:Math.round(Number(entry.loadEventEnd)),
   firstContentfulPaintMs:null,resourceCount:0,resourceTransferBytes:0};
  if(['responseStartMs','responseEndMs','domContentLoadedMs','loadEventEndMs']
   .some(k=>!Number.isFinite(metrics[k])||metrics[k]<0||metrics[k]>120000))
   return {status:'unavailable',reason:'navigation-timing-unavailable'};
  if(metrics.responseStartMs<=0||metrics.responseEndMs<metrics.responseStartMs||
   metrics.domContentLoadedMs<metrics.responseEndMs||
   metrics.loadEventEndMs<metrics.domContentLoadedMs)
   return {status:'unavailable',reason:'navigation-timing-unavailable'};
  const paint=performance.getEntriesByType('paint');
  if(!Array.isArray(paint)||paint.length>20)
   return {status:'unavailable',reason:'sampling-error'};
  const fcp=paint.find(x=>x.name==='first-contentful-paint');
  if(fcp){
   const ms=Math.round(Number(fcp.startTime));
   if(!Number.isFinite(ms)||ms<0||ms>120000)
    return {status:'unavailable',reason:'sampling-error'};
   metrics.firstContentfulPaintMs=ms;
  }
  const resources=performance.getEntriesByType('resource');
  if(!Array.isArray(resources)||resources.length>250)
   return {status:'unavailable',reason:'resource-limit'};
  metrics.resourceCount=resources.length;
  for(const r of resources){
   const size=Number(r.transferSize);
   if(!Number.isFinite(size)||size<0)
    return {status:'unavailable',reason:'sampling-error'};
   metrics.resourceTransferBytes+=Math.round(size);
   if(metrics.resourceTransferBytes>50000000)
    return {status:'unavailable',reason:'resource-limit'};
  }
  return {status:'observed',counts:metrics};
 }catch{return {status:'unavailable',reason:'sampling-error'}}
}
function assertObservation(value,htmlSha){
 if(!value||value.method!==METHOD||!iso(value.checkedAt)||
  !['observed','unavailable'].includes(value.status))
  fail('invalid timing envelope');
 if(value.status==='unavailable'){
  if(!REASONS.includes(value.reason)||
   Object.keys(value).sort().join(',')!=='checkedAt,method,reason,status')
   fail('invalid unavailable timing');
  return value;
 }
 if(!SHA.test(htmlSha||'')||value.htmlSha256!==htmlSha||
  Object.keys(value).sort().join(',')!=='checkedAt,counts,htmlSha256,method,status')
  fail('timing observation belongs to another rendered DOM');
 const m=value.counts;
 if(!m||typeof m!=='object'||Array.isArray(m)||
  Object.keys(m).sort().join(',')!==KEYS.slice().sort().join(','))
  fail('unrecognized timing counters');
 for(const k of KEYS){
  if(k==='firstContentfulPaintMs'&&m[k]===null)continue;
  if(!Number.isInteger(m[k])||m[k]<0||m[k]>(
   k==='resourceTransferBytes'?50000000:
    k==='resourceCount'?250:120000))fail('unbounded timing '+k);
 }
 if(m.responseStartMs===0||m.responseEndMs<m.responseStartMs||
  m.domContentLoadedMs<m.responseEndMs||m.loadEventEndMs<m.domContentLoadedMs)
  fail('invalid navigation timing order');
 return value;
}
module.exports=Object.freeze({METHOD,REASONS,KEYS,sample,assertObservation});
