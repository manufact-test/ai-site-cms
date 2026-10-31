'use strict';
/* Exact-Blueprint, source-vs-DOM internal link semantics. Read-only.
 * No arbitrary href, anchor text or unapproved URL is returned or logged.
 * Does not fetch destinations or assert search-engine link interpretation.
 */
const METHOD='rendered-link-semantics-v1';
const MAX_ANCHORS=2500;
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const fail=m=>{throw Error('Rendered link semantics: '+m)};
const restricted=rel=>String(rel||'').toLowerCase().split(/\s+/)
 .some(x=>['nofollow','ugc','sponsored'].includes(x));
function inspect(parsed,{served,origin,approvedPaths}){
 if(!parsed||!Array.isArray(parsed.anchors)||parsed.anchors.length>MAX_ANCHORS)
  return {status:'unavailable',reason:'anchor-limit'};
 let mount,base;
 try{
  mount=new URL(origin);
  base=new URL(served);
  if(parsed.baseHref){
   const override=new URL(parsed.baseHref,served);
   if(override.protocol!=='https:'||override.origin!==mount.origin||
    !override.pathname.startsWith(mount.pathname))
    return {status:'unavailable',reason:'invalid-source-base'};
   base=override;
  }
 }catch{return {status:'unavailable',reason:'invalid-source-base'}}
 const known=new Set(approvedPaths);
 const byPath=new Map(approvedPaths.map(p=>[p,{anchors:0,follow:0,restricted:0,query:0}]));
 let placeholders=0,unsafeSchemes=0,httpLinks=0,offMount=0,invalidLinks=0;
 for(const a of parsed.anchors){
  const raw=String(a?.attrs?.href||'').trim(),rel=String(a?.attrs?.rel||'');
  if(raw===''||raw==='#'){placeholders++;continue}
  if(raw.length>2048){invalidLinks++;continue}
  if(/^(?:javascript|data|vbscript):/i.test(raw)){unsafeSchemes++;continue}
  let target;
  try{target=new URL(raw,base)}catch{invalidLinks++;continue}
  if(target.protocol==='http:'){httpLinks++;continue}
  if(target.protocol!=='https:')continue;
  if(target.origin!==mount.origin)continue;
  if(!target.pathname.startsWith(mount.pathname)){offMount++;continue}
  const path='/'+target.pathname.slice(mount.pathname.length);
  if(!known.has(path))continue;
  const info=byPath.get(path);
  info.anchors++;
  if(target.search)info.query++;
  if(restricted(rel))info.restricted++;
  else info.follow++;
 }
 return {status:'observed',byPath,placeholders,unsafeSchemes,httpLinks,
  offMount,invalidLinks};
}
function compare({sourceParsed,renderedParsed,served,origin,approvedPaths}={}){
 if(typeof served!=='string'||typeof origin!=='string'||!Array.isArray(approvedPaths)||
  approvedPaths.length>60||new Set(approvedPaths).size!==approvedPaths.length||
  approvedPaths.some(p=>typeof p!=='string'||!ROUTE.test(p)))
  fail('approved route context required');
 const before=inspect(sourceParsed,{served,origin,approvedPaths});
 const after=inspect(renderedParsed,{served,origin,approvedPaths});
 if(before.status!=='observed'||after.status!=='observed')
  return {status:'unavailable',reason:before.status!=='observed'?
   'http-link-inspection-unavailable':'rendered-link-inspection-unavailable'};
 const allRestrictedPaths=[],newlyRestrictedPaths=[],mixedRestrictedPaths=[],queryOnlyPaths=[];
 for(const path of approvedPaths){
  const old=before.byPath.get(path),current=after.byPath.get(path);
  if(!current.anchors)continue;
  if(current.restricted===current.anchors){
   allRestrictedPaths.push(path);
   if(old.follow>0)newlyRestrictedPaths.push(path);
  }else if(current.restricted>0)mixedRestrictedPaths.push(path);
  if(current.query===current.anchors)queryOnlyPaths.push(path);
 }
 // The only route values leaving the analyzer are approved Blueprint paths.
 const increased=key=>Math.max(0,after[key]-before[key]);
 return {status:'observed',allRestrictedPaths,newlyRestrictedPaths,
  mixedRestrictedPaths,queryOnlyPaths,
  newlyPlaceholderAnchors:increased('placeholders'),
  newlyUnsafeSchemes:increased('unsafeSchemes'),
  newlyHttpLinks:increased('httpLinks'),
  newlyOffMountLinks:increased('offMount'),
  newlyInvalidLinks:increased('invalidLinks'),
  totalRenderedAnchors:renderedParsed.anchors.length,
  missingApprovedRoutes:approvedPaths.filter(path=>after.byPath.get(path).anchors===0)};
}
module.exports=Object.freeze({METHOD,MAX_ANCHORS,compare});
