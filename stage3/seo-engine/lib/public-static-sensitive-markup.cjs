'use strict';
// Detect changed action destinations, resource loaders, security attributes and
// static form HMAC/release markers at the actual public HTTPS host. Report
// categories only: NEVER serialize token, HMAC or sensitive input values.
const crypto=require('node:crypto');
const {decode}=require('./php-local-components.cjs');
const FORMAT='manufact-seo-public-static-sensitive-markup-v1';
const MAX=450000;
const sum=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const attrs=raw=>{
 const a={};
 for(const m of raw.matchAll(/([a-z][a-z0-9:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gi))
  a[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
 return a;
};
function inventory(html){
 if(typeof html!=='string'||html.length>MAX)
  throw Error('Public sensitive markup is outside bounded static HTML');
 const result={scriptLoaders:[],styleLoaders:[],embeddedFrames:[],
  formDestinations:[],formSecurityMarkers:[],linkOpenerPolicy:[],
  imageLoadingPolicy:[]};
 const max=200;
 const collect=(name,row)=>{
  if(result[name].length>=max)throw Error('Too many elements in static public sensitive markup');
  result[name].push(row);
 };
 const body=html.replace(/<!--[\s\S]*?-->/g,'');
 const scan=body.replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 for(const m of body.matchAll(/<script\b([^>]*?)>/gi)){
  const a=attrs(m[1]);
  collect('scriptLoaders',[a.src||'',a.type||'',a.async!==undefined,a.defer!==undefined,
   a.integrity||'',a.crossorigin||'',a.referrerpolicy||'',a.nonce?'nonce-present':'']);
 }
 for(const m of body.matchAll(/<link\b([^>]*?)>/gi)){
  const a=attrs(m[1]),rel=(a.rel||'').toLowerCase();
  if(!['stylesheet','modulepreload','preload','prefetch','preconnect','dns-prefetch'].some(x=>rel.split(/\s+/).includes(x)))continue;
  collect('styleLoaders',[rel,a.href||'',a.as||'',a.integrity||'',a.crossorigin||'',
   a.media||'',a.referrerpolicy||'']);
 }
 for(const m of scan.matchAll(/<(iframe|object|embed)\b([^<>]*?)>/gi)){
  const tag=m[1].toLowerCase(),a=attrs(m[2]);
  collect('embeddedFrames',[tag,a.src||a.data||'',a.sandbox||'',a.loading||'',
   a.referrerpolicy||'']);
 }
 for(const m of scan.matchAll(/<form\b([^<>]*?)>/gi)){
  const a=attrs(m[1]);
  collect('formDestinations',[a.id||'',a.action||'',(a.method||'get').toLowerCase(),
   a.enctype||'',a['accept-charset']||'',a.target||'']);
 }
 for(const m of scan.matchAll(/<input\b([^<>]*?)>/gi)){
  const a=attrs(m[1]);
  if(!['_release','_token'].includes(a.name))continue;
  collect('formSecurityMarkers',[a.name,a.type||'',sum(a.value||''),a.value?.length||0]);
 }
 for(const m of scan.matchAll(/<a\b([^<>]*?)>/gi)){
  const a=attrs(m[1]);
  if(!a.target&&!a.rel&&!a.download)continue;
  collect('linkOpenerPolicy',[a.href||'',a.target||'',a.rel||'',a.download!==undefined]);
 }
 for(const m of scan.matchAll(/<img\b([^<>]*?)>/gi)){
  const a=attrs(m[1]);
  collect('imageLoadingPolicy',[a.src||'',a.loading||'',a.decoding||'',
   a.fetchpriority||'',a.referrerpolicy||'']);
 }
 return result;
}
function review(official,publicHtml){
 const a=inventory(official),b=inventory(publicHtml),changed=[];
 for(const key of Object.keys(a))
  if(JSON.stringify(a[key])!==JSON.stringify(b[key]))changed.push(key);
 return Object.freeze({format:FORMAT,matched:changed.length===0,
  changedCategories:Object.freeze(changed),comparedCategories:Object.keys(a).length,
  scriptLoaderCount:b.scriptLoaders.length,publicFormsChecked:b.formDestinations.length,
  hiddenTokenValuesReturned:false,rawMarkupReturned:false,
  limitations:'Parses bounded static HTML attributes, not JS execution or actual form POST.'});
}
module.exports=Object.freeze({FORMAT,inventory,review});
