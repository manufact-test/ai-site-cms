'use strict';
// Pure, source-scoped consistency checks between real loopback PHP page HTTP
// headers, HTML head, Site v1 indexation and actual captured sitemap origin.
// This is NOT proof of a deployed public HTTPS host or of its served revision.
const {readHead}=require('./parity.cjs');
const crypto=require('node:crypto');
const PUBLISHER=require('./publisher-media.cjs');
const {decode}=require('./php-local-components.cjs');
const FORMAT='manufact-seo-local-php-head-v1';
// Mirrors PublicRenderer::html SEO fallback from the current lead PHP.
const normalized=x=>String(x??'').replace(/\s+/g,' ').trim().normalize('NFKC');
function expectedMeta(site,page){
 const seo=page.seo||{},title=seo.title?.trim()||page.title+' | '+site.title;
 const description=seo.description||'';
 return {title,description,ogTitle:seo.ogTitle?.trim()||title,
  ogDescription:seo.ogDescription?.trim()||description,
  language:site.language||'ru',robots:seo.robots||'index'};
}
const HEADER_NAMES=['content-security-policy','x-robots-tag','cache-control','content-language','x-content-type-options','etag'];
const MAX_HEADER=2048;
function assertHeaders(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).some(k=>!HEADER_NAMES.includes(k)))throw Error('Invalid local PHP page HTTP header map');
 for(const v of Object.values(value))if(typeof v!=='string'||v.length>MAX_HEADER||/[\x00-\x1f\x7f]/.test(v))
  throw Error('Unsafe local PHP HTTP header value');
 return true;
}
function headersOf(response){
 const headers={};
 for(const name of HEADER_NAMES){
  const v=response.headers[name];
  if(v===undefined)continue;
  const s=Array.isArray(v)?v.join(', '):String(v);
  if(s.length>MAX_HEADER||/[\x00-\x1f\x7f]/.test(s))throw Error('Unexpected local PHP page header');
  headers[name]=s;
 }
 return headers;
}
function ogUrl(html){
 const head=/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html)?.[1]||'';
 const withoutContent=head.replace(/<!--[\s\S]*?-->/g,'').replace(/<(?:script|style|template)\b[^>]*>[\s\S]*?<\/(?:script|style|template)\s*>/gi,'');
 const attrs=x=>{
  const a={};
  for(const m of x.matchAll(/([a-z][a-z0-9:_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi))
   a[m[1].toLowerCase()]=m[2]??m[3]??m[4];
  return a;
 };
 const urls=[];
 for(const m of withoutContent.matchAll(/<meta\b([^>]*?)\/?>/gi)){
  const a=attrs(m[1]);
  if((a.property||'').toLowerCase()==='og:url')urls.push(a.content||'');
 }
 return urls;
}
function socialMeta(html){
 const source=/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html)?.[1]||'';
 const clean=source.replace(/<!--[\s\S]*?-->/g,'')
  .replace(/<(?:script|style|template)\b[^>]*>[\s\S]*?<\/(?:script|style|template)\s*>/gi,'');
 const out=new Map();
 for(const tag of clean.matchAll(/<meta\b([^>]*?)\/?>/gi)){
  const a={};
  for(const m of tag[1].matchAll(/([a-z][a-z0-9:_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi))
   a[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]);
  const key=(a.property||a.name||'').toLowerCase();
  if(!key||!Object.hasOwn(a,'content'))continue;
  if(!out.has(key))out.set(key,[]);
  out.get(key).push(a.content);
 }
 return out;
}
function review(site,snapshot,records,publication){
 if(!site||!Array.isArray(site.pages)||!snapshot||
   snapshot.siteId!==site.siteId||!Array.isArray(snapshot.pages)||
   !Array.isArray(records)||records.length!==site.pages.length)
  throw Error('Incompatible local PHP page header evidence');
 const byPage=new Map(site.pages.map(p=>[p.id,p]));
 const findings=[],pages=[];
 const add=(code,severity,p,message,extra={})=>findings.push(Object.freeze({
  code,severity,pageId:p?.id||null,path:p?.path||null,message,
  evidence:'observed-local-php-head-and-headers',automatic:false,...extra}));
 const claimedOrigin=publication?.declaredPublicOrigin||null;
 const mount='/published/'+site.siteId+'/';
 let withHeaders=0;
 for(const [i,page] of snapshot.pages.entries()){
  const spec=byPage.get(page.id),record=records[i];
  if(!spec||spec.path!==page.path||record.pageId!==page.id||record.path!==page.path)
   throw Error('Local PHP page head route/ID mismatch');
  const headers=record.headers||{};
  assertHeaders(headers);
  if(record.headers)withHeaders++;
  const head=readHead(page.html);
  if(head.status!=='parsed-head')throw Error('Local PHP page lacks complete HTML head');
  const expected=expectedMeta(site,spec);
  const socialTags=socialMeta(page.html);
  const selected=PUBLISHER.select(site,spec);
  const expectedLocale=({ru:'ru_RU',en:'en_US',pl:'pl_PL',de:'de_DE',be:'be_BY',uk:'uk_UA'})[expected.language]||'ru_RU';
  const socialValue=key=>socialTags.get(key)||[];
  const expectSocial=(key,wanted)=>{
   const got=socialValue(key);
   if(wanted===null){
    if(got.length)add('php-head:social-unexpected','error',spec,
     'Published PHP includes unexpected social metadata '+key+'.',{field:key});
   }else if(got.length!==1||normalized(got[0])!==normalized(wanted))
    add('php-head:social-drift','error',spec,
     'Published PHP social metadata '+key+' is absent, duplicated or differs from Site v1.',
     {field:key,expected:normalized(wanted).slice(0,240),observed:got.map(x=>normalized(x).slice(0,240))});
  };
  for(const [field,wanted,seen] of [
   ['title',expected.title,head.title],
   ['description',expected.description,head.description],
   ['og:title',expected.ogTitle,head.ogTitle],
   ['og:description',expected.ogDescription,head.ogDescription],
   ['html:lang',expected.language,head.language]
  ])if(normalized(wanted)!==normalized(seen))
   add('php-head:metadata-drift','error',spec,
    'Local published PHP '+field+' differs from immutable Site v1 source or PHP fallback.',
    {field,expected:normalized(wanted).slice(0,240),observed:normalized(seen).slice(0,240)});
  expectSocial('og:type','website');
  expectSocial('og:locale',expectedLocale);
  expectSocial('twitter:title',expected.ogTitle);
  expectSocial('twitter:description',expected.ogDescription||null);
  const selectedImage=selected.asset||null;
  const actualOgImage=socialValue('og:image');
  const expectImage=claimedOrigin&&selectedImage
   ?claimedOrigin+'/published/'+site.siteId+selectedImage.src:null;
  if(claimedOrigin){
   expectSocial('og:image',expectImage);
   expectSocial('twitter:image',expectImage);
  }else if(actualOgImage.length){
   expectSocial('twitter:image',actualOgImage.length===1?actualOgImage[0]:null);
  }else expectSocial('twitter:image',null);
  const alt=(claimedOrigin?Boolean(expectImage):Boolean(actualOgImage.length))&&selectedImage?.alt
   ?selectedImage.alt:null;
  expectSocial('og:image:alt',alt);
  expectSocial('twitter:image:alt',alt);
  expectSocial('twitter:card',
   (claimedOrigin?Boolean(expectImage):Boolean(actualOgImage.length))?'summary_large_image':'summary');
  const metaNoindex=/(?:^|[,\s])noindex(?:$|[,\s])/i.test(head.robots||'');
  if(metaNoindex!==(expected.robots==='noindex'))
   add('php-head:meta-robots-drift','error',spec,
    'Real published meta robots indexation conflicts with immutable Site v1.',
    {expectedRobots:expected.robots,observedRobots:(head.robots||'').slice(0,120)});
  // Current lead PublicRenderer emits formStepsScript() only for multi-step forms,
  // and public Api.php allows its exact SHA-256 in CSP. Verify both bytes and
  // header against the response we actually fetched, without executing scripts.
  const wizardCount=spec.sections.filter(x=>!x.designGraph&&Array.isArray(x.formSteps)&&x.formSteps.length>=2).length;
  const inlineScripts=[...page.html.matchAll(/<script\b([^>]*?)>([\s\S]*?)<\/script\s*>/gi)]
   .filter(x=>!/\bsrc\s*=/i.test(x[1]));
  if(wizardCount&&!inlineScripts.length)
   add('php-head:wizard-script-absent','error',spec,
    'Sealed Site v1 requires multi-step form behavior, but published PHP lacks its inline wizard script.');
  const csp=headers['content-security-policy']||'';
  for(const script of inlineScripts){
   const hash=crypto.createHash('sha256').update(script[2],'utf8').digest('base64');
   if(!csp.includes("'sha256-"+hash+"'"))
    add('php-head:inline-script-csp-drift','error',spec,
     'Published PHP inline script does not match the actual response Content-Security-Policy SHA-256 allowance.');
  }
  const xrobots=headers['x-robots-tag']||'';
  const observedNoindex=/(?:^|[,\s])noindex(?:$|[,\s])/i.test(xrobots);
  const intendedNoindex=(spec.seo?.robots||'index')==='noindex';
  if(observedNoindex&&!intendedNoindex)
   add('php-head:x-robots-noindex-conflict','error',spec,
    'Local PHP X-Robots-Tag disallows indexation of a Site v1 page intended for indexing.',
    {observed:xrobots});
  if(record.headers&&headers['content-security-policy']===undefined)
   add('php-head:missing-csp','warning',spec,
    'Local PHP page does not supply a Content-Security-Policy response header; confirm isolated publisher routing.');
  else if(record.headers&&!/frame-ancestors\s+'none'/i.test(headers['content-security-policy']))
   add('php-head:frame-ancestors-review','recommendation',spec,
    'Review frame-ancestors policy for publicly rendered HTML.');
  const canonical=head.canonical,canonicalRaw=typeof canonical==='string'?canonical.trim():'';
  let canonicalUrl=null;
  if(canonicalRaw){
   try{
    canonicalUrl=new URL(canonicalRaw);
    if(!['http:','https:'].includes(canonicalUrl.protocol)||
       canonicalUrl.username||canonicalUrl.password||canonicalUrl.search||canonicalUrl.hash)
     throw Error('Unsafe canonical URL');
   }catch{
    canonicalUrl=null;
    add('php-head:canonical-invalid','error',spec,'Actual local PHP canonical is not a safe absolute URL.');
   }
  }
  const social=ogUrl(page.html);
  if(social.length>1)add('php-head:multiple-og-urls','warning',spec,
   'Actual local PHP HTML has multiple og:url values.');
  if(claimedOrigin){
   const expected=claimedOrigin+mount+page.path.slice(1);
   if(!canonicalRaw)
    add('php-head:canonical-absent','warning',spec,
     'Local PHP sitemap has a configured public origin but page canonical is missing.');
   else if(canonicalUrl&&canonicalUrl.href!==expected)
    add('php-head:canonical-origin-route-drift','error',spec,
     'Local PHP canonical differs from the actual public origin and mounted path declared in captured sitemap.',{expectedUrl:expected,observedUrl:canonicalUrl.href});
   if(!social.length)
    add('php-head:og-url-absent','recommendation',spec,'Actual PHP head is missing its expected og:url metadata.');
   for(const raw of social){
    if(raw!==expected)add('php-head:og-url-drift','error',spec,
     'Actual local PHP og:url does not match sitemap origin, mount and page path.',{expectedUrl:expected,observedUrl:raw.slice(0,240)});
   }
  }else if(canonicalUrl){
   add('php-head:origin-not-correlated','recommendation',spec,
    'A PHP canonical was captured, but sitemap origin is unavailable or inconsistent; do not infer public host acceptance.');
  }
  pages.push(Object.freeze({
   pageId:page.id,path:page.path,headersRecorded:Boolean(record.headers),
   etag:headers.etag||null,
   phpHtmlSha256:crypto.createHash('sha256').update(page.html,'utf8').digest('hex'),
   observedNoindexInXRobots:observedNoindex,siteNoindex:intendedNoindex,
   inlineScriptsCaptured:inlineScripts.length,wizardExpected:Boolean(wizardCount),
   metaRobotsMatched:metaNoindex===intendedNoindex,
   socialMetadataMatched:!findings.some(x=>x.pageId===page.id&&
    x.code.startsWith('php-head:social-')),
   twitterCard:socialValue('twitter:card')[0]||null,
   metadataMatches:!findings.some(x=>x.pageId===page.id&&
    ['php-head:metadata-drift','php-head:meta-robots-drift'].includes(x.code)),
   canonicalUrl:canonicalUrl?.href||null,ogUrlCount:social.length,
   sitemapOriginMatched:Boolean(claimedOrigin&&canonicalUrl&&
    canonicalUrl.href===claimedOrigin+mount+page.path.slice(1))}));
 }
 return Object.freeze({
  format:FORMAT,siteId:site.siteId,readOnly:true,observedLocalPages:pages.length,
  pagesWithRecordedHeaders:withHeaders,publicOriginObservedInSitemap:claimedOrigin,
  developmentOnlyOrigin:Boolean(claimedOrigin&&claimedOrigin.startsWith('http://')),
  pages:Object.freeze(pages),findings:Object.freeze(findings),
  sourceRevisionProven:false,publicHttpsProven:false,releaseAuthorized:false,
  limitations:'Only recorded localhost headers and page HTML, reconciled with a locally served sitemap. No browser JavaScript execution, PHP build identity, public DNS/TLS, CDN policies or real deployed HTTP origin was authenticated.'
 });
}
module.exports=Object.freeze({FORMAT,assertHeaders,headersOf,ogUrl,socialMeta,review});
