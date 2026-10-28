'use strict';
// Read-only reconciliation of a sealed AI site with the actual imported CMS
// Site v1. The official Studio importer retargets media IDs and replaces the
// asset inventory with server-issued IDs. No fuzzy content changes are allowed.
const SHA=/^[a-f0-9]{64}$/;
function stable(value){
 if(Array.isArray(value))return value.map(stable);
 if(value&&typeof value==='object')
  return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
 return value;
}
function correlate(sealed,published,sourceMediaSha256){
 if(!sealed||!published||!Array.isArray(sealed.assets)||
   !Array.isArray(published.assets)||sealed.siteId!==published.siteId||
   sealed.assets.length!==published.assets.length||
   !sourceMediaSha256||typeof sourceMediaSha256!=='object')
  throw Error('Published CMS Site v1 is not compatible with sealed Approved Site v2');
 const ids=new Map(),paths={},seen=new Set();
 const bind=(oldId,newId,oldSrc,newSrc)=>{
  if(!oldId||!newId||ids.has(oldId)||seen.has(newId)||
    typeof oldSrc!=='string'||typeof newSrc!=='string'||
    !/^\/assets\/[a-z][a-z0-9-]{2,79}\.(?:png|jpg|webp|mp4)$/.test(newSrc)||
    !SHA.test(sourceMediaSha256[oldSrc]||''))
   throw Error('Published CMS media mapping is ambiguous or not tied to sealed media source');
  ids.set(oldId,newId);seen.add(newId);
  paths[newSrc]=sourceMediaSha256[oldSrc];
 };
 for(let i=0;i<sealed.assets.length;i++){
  const from=sealed.assets[i],to=published.assets[i];
  if(from.mime!==to.mime||from.alt!==to.alt||
    from.width!==undefined&&from.width!==to.width||
    from.height!==undefined&&from.height!==to.height||
    (from.variants||[]).length!==(to.variants||[]).length)
   throw Error('Published CMS media order, MIME, ALT, dimensions or variant count differs from sealed source at '+from.id);
  bind(from.id,to.id,from.src,to.src);
  // Match variants by sealed SHA + size, not array order.
  const matched=new Set();
  for(const v of from.variants||[]){
   const choices=to.variants.filter(x=>x.sha256===v.sha256&&x.width===v.width&&
     (v.height===undefined||x.height===v.height)&&!matched.has(x.id));
   if(choices.length!==1)throw Error('Published responsive variant does not uniquely match sealed Site v1');
   const found=choices[0];matched.add(found.id);bind(v.id,found.id,v.src,found.src);
  }
 }
 if(Object.keys(paths).length!==Object.keys(sourceMediaSha256).length)
  throw Error('Published media map is incomplete or duplicate');
 const remap=x=>{
  if(typeof x==='string')return ids.get(x)||x;
  if(Array.isArray(x))return x.map(remap);
  if(x&&typeof x==='object')
   return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,remap(v)]));
  return x;
 };
 const predicted=remap(sealed);
 predicted.assets=published.assets; // precisely how Studio's sealed-v2 importer operates
 if(JSON.stringify(stable(predicted))!==JSON.stringify(stable(published)))
  throw Error('Published Site v1 content differs from sealed client-approved source after media-ID retargeting');
 return Object.freeze({publishedSite:published,mediaIdMap:Object.freeze(Object.fromEntries(ids)),
  sealedMediaSha256:Object.freeze(paths),
  identicalExceptServerMediaIds:true,
  mappedMediaCount:ids.size,
  approvedSiteId:sealed.siteId});
}
module.exports=Object.freeze({correlate});
