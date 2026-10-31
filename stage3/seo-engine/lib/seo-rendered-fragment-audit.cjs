'use strict';
/* Cross-page same-viewport fragment resolution for source-pinned rendered DOM.
 * Never exports a raw href, fragment ID, anchor label or customer HTML.
 * Uninspected target pages are UNKNOWN, never declared broken.
 */
const MAX_ANCHORS=2500;
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const fail=m=>{throw Error('Rendered fragment links: '+m)};
function review({parsed,served,origin,targetByPath}={}){
 if(!parsed||!Array.isArray(parsed.anchors)||typeof served!=='string'||
  typeof origin!=='string'||!(targetByPath instanceof Map)||
  targetByPath.size>60||[...targetByPath.keys()].some(x=>!ROUTE.test(x)))
  fail('approved rendered DOM target inventory required');
 if(parsed.anchors.length>MAX_ANCHORS)
  return {status:'unavailable',reason:'anchor-limit'};
 let mount,base;
 try{
  mount=new URL(origin);
  base=new URL(served);
  if(parsed.baseHref){
   const override=new URL(parsed.baseHref,served);
   if(override.protocol!=='https:'||override.origin!==mount.origin||
    !override.pathname.startsWith(mount.pathname))
    return {status:'unavailable',reason:'unsafe-base-href'};
   base=override;
  }
 }catch{return {status:'unavailable',reason:'unsafe-base-href'}}
 let checked=0,missing=0,unknown=0;
 const affected=new Set();
 for(const a of parsed.anchors){
  const href=String(a?.attrs?.href||'').trim();
  if(!href.includes('#')||href==='#')continue;
  if(href.length>2048){unknown++;continue}
  let url;
  try{url=new URL(href,base)}catch{unknown++;continue}
  if(url.protocol!=='https:'||url.origin!==mount.origin||
   !url.pathname.startsWith(mount.pathname)||!url.hash)continue;
  const path='/'+url.pathname.slice(mount.pathname.length);
  if(!targetByPath.has(path))continue;
  if(url.search){unknown++;continue}
  let fragment;
  try{fragment=decodeURIComponent(url.hash.slice(1))}
  catch{unknown++;continue}
  if(!fragment||fragment.length>160){unknown++;continue}
  if(fragment.toLowerCase()==='top')continue;
  const dest=targetByPath.get(path);
  if(!dest?.inspected||!(dest.ids instanceof Set)){
   unknown++;continue;
  }
  checked++;
  if(!dest.ids.has(fragment)){missing++;affected.add(path)}
 }
 return {status:'observed',checked,missing,unknown,affectedApprovedPaths:[...affected].sort()};
}
module.exports=Object.freeze({MAX_ANCHORS,review});
