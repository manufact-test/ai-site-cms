'use strict';
/* Read-only, bounded browser responsive-layout observation.
 * No customer text, URLs, element selectors, screenshots or coordinates leave
 * page.evaluate. These counters are UX investigation prompts, not Google CWV.
 */
const METHOD='browser-responsive-layout-v1';
const REASONS=Object.freeze(['sampling-error','element-limit',
 'dom-changed-during-sampling','layout-changing-during-sampling']);
const SHA=/^[a-f0-9]{64}$/;
const KEYS=Object.freeze(['viewportMetaPresent','viewportMetaDeviceWidth',
 'viewportMetaMultiple','viewportMetaFixedWidth',
 'viewportMetaZoomRestricted','horizontalOverflowPx','prominentVisible',
 'prominentClipped','interactiveVisible','interactiveUnder24',
 'interactiveUnder44','interactiveMissingName','textBlocksVisible','textBlocksUnder12',
 'largeFixedOverlayCandidates']);
const MAX=Object.freeze({elements:3500,prominent:1600,interactive:1800,text:1600,overflow:200000});
const fail=m=>{throw Error('Rendered responsive observation: '+m)};
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(x)&&Number.isFinite(Date.parse(x));
function sample(viewport){
 /* This function is serialized alone by Playwright; no external constants. */
 if(!viewport||!Number.isInteger(viewport.width)||!Number.isInteger(viewport.height)||
  viewport.width<1||viewport.height<1)
  return {status:'unavailable',reason:'sampling-error'};
 try{
  const all=document.querySelectorAll('*');
  const prominent=[...document.querySelectorAll('main,[role="main"],h1,h2,h3,h4,h5,h6,p,li')];
  const interactive=[...document.querySelectorAll(
   'a[href],button,input:not([type="hidden"]),select,textarea,[role="button"]')];
  const textBlocks=[...document.querySelectorAll('p,li')];
  if(all.length>3500||prominent.length>1600||interactive.length>1800||
   textBlocks.length>1600)return {status:'unavailable',reason:'element-limit'};
  const viewportMeta=[...document.querySelectorAll('meta[name]')].filter(x=>
   String(x.getAttribute('name')||'').toLowerCase()==='viewport');
  if(viewportMeta.length>5)return {status:'unavailable',reason:'element-limit'};
  const metaContent=viewportMeta.map(x=>String(x.getAttribute('content')||'').toLowerCase()).join(',');
  const metaDevice=/(?:^|[,;\s])width\s*=\s*device-width(?:[,;\s]|$)/i.test(metaContent);
  const metaFixed=/(?:^|[,;\s])width\s*=\s*\d+/i.test(metaContent);
  const metaZoom=/(?:^|[,;\s])user-scalable\s*=\s*(?:no|0)(?:[,;\s]|$)/i.test(metaContent)||
   /(?:^|[,;\s])maximum-scale\s*=\s*(?:1(?:\.0+)?|0(?:\.\d+)?)(?:[,;\s]|$)/i.test(metaContent);
  // A missing/unreadable scrollWidth is unknown, not a zero-overflow pass.
  const widths=[Number(document.documentElement?.scrollWidth),
   Number(document.body?.scrollWidth)];
  if(widths.some(x=>!Number.isInteger(x)||x<0||x>200000))
   return {status:'unavailable',reason:'sampling-error'};
  const overflow=Math.max(0,Math.ceil(Math.max(...widths)-viewport.width));
  if(overflow>200000)return {status:'unavailable',reason:'sampling-error'};
  const counts={viewportMetaPresent:viewportMeta.length?1:0,
   viewportMetaDeviceWidth:metaDevice?1:0,
   viewportMetaMultiple:viewportMeta.length>1?1:0,
   viewportMetaFixedWidth:metaFixed?1:0,
   viewportMetaZoomRestricted:metaZoom?1:0,horizontalOverflowPx:overflow,
   prominentVisible:0,prominentClipped:0,interactiveVisible:0,
   interactiveUnder24:0,interactiveUnder44:0,interactiveMissingName:0,textBlocksVisible:0,
   textBlocksUnder12:0,largeFixedOverlayCandidates:0};
  function geometry(el){
   try{
    if(!el.isConnected)return null;
    const css=getComputedStyle(el);
    if(css.display==='none'||css.visibility==='hidden'||
     css.visibility==='collapse'||Number(css.opacity)<=0)return null;
    if(typeof el.checkVisibility==='function'&&
     !el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))return null;
    const r=el.getBoundingClientRect();
    if(!Number.isFinite(r.left)||!Number.isFinite(r.right)||
     !Number.isFinite(r.top)||!Number.isFinite(r.bottom)||
     !Number.isFinite(r.width)||!Number.isFinite(r.height)||
     r.width<=0||r.height<=0)return null;
    return {r,css};
   }catch{return null}
  }
  function named(el){
   try{
    if(String(el.textContent||'').trim())return true;
    for(const a of ['aria-label','aria-labelledby','title'])
     if(String(el.getAttribute?.(a)||'').trim())return true;
    if(el.labels?.length)return true;
    const type=String(el.getAttribute?.('type')||'').toLowerCase();
    if(['submit','reset','button','image'].includes(type)&&
     String(el.getAttribute?.('value')||el.getAttribute?.('alt')||'').trim())return true;
    const img=el.querySelector?.('img[alt]');
    if(img&&String(img.getAttribute('alt')||'').trim())return true;
   }catch{}
   return false;
  }
  for(const el of prominent){
   const item=geometry(el);if(!item)continue;
   counts.prominentVisible++;
   // A tiny subpixel rounding difference must not flag a responsive defect.
   if(item.r.left < -8||item.r.right>viewport.width+8)
    counts.prominentClipped++;
  }
  for(const el of interactive){
   const item=geometry(el);if(!item)continue;
   counts.interactiveVisible++;
   if(Math.min(item.r.width,item.r.height)<24)counts.interactiveUnder24++;
   if(Math.min(item.r.width,item.r.height)<44)counts.interactiveUnder44++;
   if(!named(el))counts.interactiveMissingName++;
  }
  for(const el of textBlocks){
   const item=geometry(el);if(!item)continue;
   // Reading only length of text, never returning the actual words.
   if(String(el.textContent||'').trim().length<10)continue;
   counts.textBlocksVisible++;
   const px=Number.parseFloat(item.css.fontSize);
   if(Number.isFinite(px)&&px>0&&px<12)counts.textBlocksUnder12++;
  }
  for(const el of all){
   let css;try{css=getComputedStyle(el)}catch{continue}
   if(css.position!=='fixed')continue;
   const item=geometry(el);if(!item)continue;
   const width=Math.max(0,Math.min(item.r.right,viewport.width)-Math.max(item.r.left,0));
   const height=Math.max(0,Math.min(item.r.bottom,viewport.height)-Math.max(item.r.top,0));
   if(width*height>=viewport.width*viewport.height*.3)
    counts.largeFixedOverlayCandidates++;
  }
  return {status:'observed',counts};
 }catch{return {status:'unavailable',reason:'sampling-error'}}
}
function assertObservation(value,htmlSha){
 if(!value||value.method!==METHOD||!iso(value.checkedAt)||
  !['observed','unavailable'].includes(value.status))
  fail('invalid layout observation envelope');
 if(value.status==='unavailable'){
  if(!REASONS.includes(value.reason)||
   Object.keys(value).sort().join(',')!=='checkedAt,method,reason,status')
   fail('invalid unavailable layout observation');
  return value;
 }
 if(!SHA.test(htmlSha||'')||value.htmlSha256!==htmlSha||
  Object.keys(value).sort().join(',')!=='checkedAt,counts,htmlSha256,method,status')
  fail('responsive observation belongs to another rendered DOM');
 const m=value.counts;
 if(!m||typeof m!=='object'||Array.isArray(m)||
  Object.keys(m).sort().join(',')!==KEYS.slice().sort().join(','))
  fail('unrecognized responsive counters');
 for(const k of KEYS)if(!Number.isInteger(m[k])||m[k]<0||m[k]>200000)
  fail('unbounded responsive counter '+k);
 for(const k of ['viewportMetaPresent','viewportMetaDeviceWidth','viewportMetaMultiple',
  'viewportMetaFixedWidth','viewportMetaZoomRestricted'])
  if(m[k]>1)fail('invalid responsive flag '+k);
 for(const k of ['prominentVisible','prominentClipped','interactiveVisible',
  'interactiveUnder24','interactiveUnder44','interactiveMissingName','textBlocksVisible',
  'textBlocksUnder12','largeFixedOverlayCandidates'])
  if(m[k]>3500)fail('element count exceeds sampling limit');
 if(m.prominentVisible>MAX.prominent||m.interactiveVisible>MAX.interactive||
  m.textBlocksVisible>MAX.text||
  m.prominentClipped>m.prominentVisible||
  m.interactiveUnder24>m.interactiveUnder44||
  m.interactiveUnder44>m.interactiveVisible||
  m.interactiveMissingName>m.interactiveVisible||
  m.textBlocksUnder12>m.textBlocksVisible||
  (!m.viewportMetaPresent&&(m.viewportMetaDeviceWidth||m.viewportMetaMultiple||
   m.viewportMetaFixedWidth||m.viewportMetaZoomRestricted)))
  fail('inconsistent responsive counter subsets');
 return value;
}
module.exports=Object.freeze({METHOD,REASONS,KEYS,MAX,sample,assertObservation});
