'use strict';
// Cross-source confidence audit: supplied HTML snapshot vs supplied HTTP HTML.
// Conflicts cannot establish which capture is accurate and NEVER count as real host verification.
const {readHead}=require('./parity.cjs');
const FORMAT='manufact-seo-evidence-consistency-v1';
const fields=['title','description','robots','canonical','ogTitle','ogDescription'];
function review(site,options={}){
 if(!site||!Array.isArray(site.pages)||typeof site.siteId!=='string'||
  !options||typeof options!=='object'||Array.isArray(options))
  throw Error('Invalid Site v1 evidence consistency request');
 const snapshot=options.snapshot||null,delivery=options.delivery||null,media=options.media||null;
 for(const [name,value,format] of [['snapshot',snapshot,'manufact-seo-html-snapshot-v1'],
  ['delivery',delivery,'manufact-seo-delivery-evidence-v1'],
  ['media',media,'manufact-seo-media-evidence-v1']]){
  if(value&&(value.format!==format||value.siteId&&value.siteId!==site.siteId))
   throw Error('Conflicting '+name+' evidence siteId');
 }
 const findings=[],compared=[],observedHtml=new Map();
 const add=(code,severity,pageId,path,message,detail={})=>findings.push({
  code,severity,pageId:pageId||null,path:path||null,message,
  evidence:'cross-source-caller-supplied-artifacts',automatic:false,...detail});
 for(const p of snapshot?.pages||[]){
  if(typeof p.html==='string'&&p.html.length<=500000)observedHtml.set(p.id,p);
 }
 const paths=new Map(site.pages.map(p=>[p.id,p.path]));
 for(const p of delivery?.pages||[]){
  const saved=observedHtml.get(p.id);
  if(!saved||!p.html)continue;
  if(paths.get(p.id)!==p.path||saved.path!==p.path){
   add('consistency:page-identity-conflict','warning',p.id,p.path,
    'Two supplied HTML sources use incompatible page ID/route combinations.');
   continue;
  }
  const left=readHead(saved.html),right=readHead(p.html);
  if(left.status!=='parsed-head'||right.status!=='parsed-head')continue;
  const differences=[];
  for(const field of fields){
   const fromSnapshot=(left[field]??'').trim(),fromDelivery=(right[field]??'').trim();
   if(fromSnapshot===fromDelivery)continue;
   differences.push(field);
   const robotsField=field==='robots';
   const noIndex=x=>/(?:^|[\s,])noindex(?:$|[\s,])/i.test(x);
   add('consistency:captured-'+field+'-diff',
    robotsField&&noIndex(fromSnapshot)!==noIndex(fromDelivery)?'error':'warning',
    p.id,p.path,'Supplied snapshot and HTTP-captured HTML differ for '+field+
    '; confirm same deployment, origin and build revision.',
    {field,snapshotValue:fromSnapshot.slice(0,200),httpValue:fromDelivery.slice(0,200)});
  }
  compared.push({pageId:p.id,path:p.path,headFieldsCompared:fields.length,divergentFields:differences,
   sourceOfTruthEstablished:false});
 }
 let originsCompatible=null;
 if(delivery&&media){
  originsCompatible=new URL(delivery.origin).href===new URL(media.origin).href;
  if(!originsCompatible)add('consistency:public-origin-conflict','error',null,null,
   'HTTP and media transcripts declare different public origins (host or mount).');
 }
 const snapshotCount=snapshot?.pages?.length??null,deliveryCount=delivery?.pages?.length??null;
 return {format:FORMAT,version:1,siteId:site.siteId,readOnly:true,
  coverage:{snapshotPages:snapshotCount,httpCapturePages:deliveryCount,
   comparableHtmlHeads:compared.length,mediaAndHttpOriginsAgree:originsCompatible,
   authenticatedCaptureSources:0},
  comparedPages:compared,findings,releaseAuthorized:false,
  limitations:'Two agreeing caller-supplied artifacts do not authenticate either capture. Different timestamps/builds, intended overrides and relative URL forms may explain non-indexation differences; reconcile with real deployed HTML before any release decision.'};
}
module.exports=Object.freeze({FORMAT,review});
