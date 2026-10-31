'use strict';
// Compare actual published static <head> against the SAME SHA256-checked
// official static HTML. Unlike superficial type-count checks this catches
// changed OG/Twitter image, locale, description and JSON-LD claim values.
// No collected secret, token or page HTML is emitted in findings.
const {decode}=require('./php-local-components.cjs');
const FORMAT='manufact-seo-public-static-head-parity-v1';
const MAX=450000,MAX_META=180,MAX_SCHEMA=60;
const attrs=s=>{
 const result={};
 for(const m of String(s).matchAll(/([a-z][a-z0-9:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gi))
  result[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
 return result;
};
const canonicalJson=(o,depth=0)=>{
 if(depth>24)throw Error('JSON-LD nested too deeply for public parity');
 if(Array.isArray(o))return o.map(x=>canonicalJson(x,depth+1));
 if(o===null||typeof o!=='object')return o;
 const result={};
 for(const key of Object.keys(o).sort())result[key]=canonicalJson(o[key],depth+1);
 return result;
};
function readHead(html){
 if(typeof html!=='string'||html.length>MAX)
  throw Error('Public/static head input exceeds supported bounded HTML size');
 const head=/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html)?.[1];
 if(typeof head!=='string')throw Error('Complete HTML head missing from public/static compare');
 const meta=[],schemas=[],jsonErrors=[];
 for(const m of head.matchAll(/<meta\b([^>]*)>/gi)){
  const a=attrs(m[1]),id= a.property?'property:'+a.property.toLowerCase():
   a.name?'name:'+a.name.toLowerCase():
   a['http-equiv']?'http-equiv:'+a['http-equiv'].toLowerCase():
   a.charset?'charset':'other';
  meta.push([id,a.content??a.charset??'']);
  if(meta.length>MAX_META)throw Error('Too many public HTML head meta declarations');
 }
 for(const match of head.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if((attrs(match[1]).type||'').toLowerCase()!=='application/ld+json')continue;
  if(schemas.length>=MAX_SCHEMA||match[2].length>100000)
   throw Error('Too many or oversized JSON-LD scripts');
  try{
   schemas.push(JSON.stringify(canonicalJson(JSON.parse(match[2]))));
  }catch{jsonErrors.push('invalid-json-ld');}
 }
 const alternates=[];
 for(const m of head.matchAll(/<link\b([^>]*)>/gi)){
  const a=attrs(m[1]);if(!a.rel)continue;
  if(['canonical','alternate','preload','icon'].some(x=>a.rel.toLowerCase().split(/\s+/).includes(x)))
   alternates.push([a.rel.toLowerCase(),a.hreflang||'',a.as||'',a.href||'']);
  if(alternates.length>MAX_META)throw Error('Too many public HTML head link declarations');
 }
 return {meta,alternates,jsonLd:schemas,errors:jsonErrors};
}
function review(expected,actual){
 const a=readHead(expected),b=readHead(actual);
 const differences=[];
 for(const key of ['meta','alternates','jsonLd','errors'])
  if(JSON.stringify(a[key])!==JSON.stringify(b[key]))differences.push(key);
 return Object.freeze({format:FORMAT,deepHeadMatched:!differences.length,
  changedHeadFields:Object.freeze(differences),
  examinedMetaCount:b.meta.length,examinedJsonLdScripts:b.jsonLd.length,
  // Deliberately no values, scripts, HMAC or original HTML stored.
  reportedHeadContent:false});
}
module.exports=Object.freeze({FORMAT,readHead,review});
