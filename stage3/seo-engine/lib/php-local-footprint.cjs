'use strict';
// Actual local PHP response footprint: byte accounting, not synthetic Core Web Vitals.
// Uses SHA256-verified HTML and PHP media resource inventory; never fetches URLs.
const FORMAT='manufact-seo-local-php-footprint-v1';
const HTML_SOFT=250000,CSS_SOFT=85000,IMAGE_SOFT=900000,VIDEO_SOFT=6000000,UPPER_SOFT=8000000;
const size=x=>Buffer.byteLength(String(x),'utf8');
function review(site,snapshot,localMedia){
 if(!site||!Array.isArray(site.pages)||!snapshot||snapshot.siteId!==site.siteId||
    !Array.isArray(snapshot.pages)||snapshot.pages.length!==site.pages.length||
    !localMedia||localMedia.siteId!==site.siteId||localMedia.verifiedLocalHttpBytes!==true||
    !Array.isArray(localMedia.resources))
  throw Error('PHP footprint requires matching SHA256-verified HTML and media evidence');
 const records=localMedia.resources,known=new Set(site.pages.map(p=>p.id));
 const pages=[],findings=[];
 for(const p of snapshot.pages){
  if(!known.has(p.id)||site.pages.find(q=>q.id===p.id)?.path!==p.path||typeof p.html!=='string')
   throw Error('PHP footprint page identity does not match Source Site v1');
  const htmlBytes=size(p.html),inlineStyleBytes=[...p.html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)]
   .reduce((n,m)=>n+size(m[1]),0);
  const inlineScriptBytes=[...p.html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)]
   .reduce((n,m)=>n+size(m[1]),0);
  const referenced=records.filter(r=>r.renderedPageIds.includes(p.id)&&r.status===200);
  const groups=new Map();
  for(const r of referenced){
   const key=r.variantOf||r.assetId,list=groups.get(key)||[];
   list.push(r);groups.set(key,list);
  }
  let lower=0,upper=0,maxImage=0,videoBytes=0;
  for(const variants of groups.values()){
   lower+=Math.min(...variants.map(r=>r.bodyBytes));
   upper+=Math.max(...variants.map(r=>r.bodyBytes));
   for(const r of variants){
    if(r.mime.startsWith('image/'))maxImage=Math.max(maxImage,r.bodyBytes);
    if(r.mime==='video/mp4')videoBytes+=r.bodyBytes;
   }
  }
  const images=[...p.html.matchAll(/<img\b([^>]*?)\/?>/gi)];
  const mainMarkup=/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i.exec(p.html)?.[1]||'';
  const firstImage=/<img\b([^>]*?)\/?>/i.exec(mainMarkup)?.[1]||null;
  const add=(code,message,detail={})=>findings.push(Object.freeze({
   code:'php-footprint:'+code,severity:'warning',pageId:p.id,path:p.path,
   message,evidence:'sha256-verified-local-php-html-and-media',automatic:false,...detail}));
  if(htmlBytes>HTML_SOFT)add('large-html','Actual uncompressed PHP HTML exceeds 250 kB; inspect markup and repeated inline CSS.',
   {observed:htmlBytes,property:'htmlBytes'});
  if(inlineStyleBytes>CSS_SOFT)add('large-inline-css','Actual inline CSS exceeds 85 kB on one page; review payload reuse and font/layout costs.',
   {observed:inlineStyleBytes,property:'inlineStyleBytes'});
  if(maxImage>IMAGE_SOFT)add('large-image','A page-referenced PHP image approaches the 1 MB original budget; inspect real responsive selection and optimization.',
   {observed:maxImage,property:'largestImageBytes'});
  if(videoBytes>VIDEO_SOFT)add('large-video','Rendered page references more than 6 MB of MP4 source bytes; verify user-perceived loading.',
   {observed:videoBytes,property:'videoSourceBytes'});
  if(upper>UPPER_SOFT)add('large-possible-media-footprint','Summed upper representative media bytes exceed 8 MB (not a browser transfer measurement).',
   {observed:upper,property:'mediaUpperBytes'});
  if(firstImage&&/\bloading\s*=\s*(?:"lazy"|'lazy'|lazy)(?:\s|$)/i.test(firstImage))
   add('first-image-lazy','The first image in main is lazy-loaded. Verify that the visible hero/LCP candidate is not delayed.',
    {property:'firstMainImageLoading'});
  const undimensioned=images.filter(x=>!/\bwidth\s*=/i.test(x[1])||!/\bheight\s*=/i.test(x[1])).length;
  if(undimensioned>0)add('image-dimensions-not-declared','Some img elements lack width/height attributes; verify CSS aspect-ratio or reserved space to avoid shifts.',
   {observed:undimensioned,property:'imagesWithoutDimensions'});
  pages.push(Object.freeze({pageId:p.id,path:p.path,htmlBytes,inlineStyleBytes,inlineScriptBytes,
   renderedAssetGroups:groups.size,renderedVariants:referenced.length,
   minimumRepresentativeMediaBytes:lower,maximumRepresentativeMediaBytes:upper,
   largestReferencedImageBytes:maxImage,videoSourceBytes:videoBytes,
   imagesWithoutDimensions:undimensioned,
   findings:findings.filter(x=>x.pageId===p.id).length}));
 }
 return Object.freeze({format:FORMAT,version:1,siteId:site.siteId,checkedPages:pages.length,
  pages:Object.freeze(pages),findings:Object.freeze(findings),
  thresholds:Object.freeze({htmlBytes:HTML_SOFT,inlineCssBytes:CSS_SOFT,
   imageBytes:IMAGE_SOFT,videoBytes:VIDEO_SOFT,possibleMediaBytes:UPPER_SOFT}),
  actualWebVitalsMeasured:false,compressedTransferMeasured:false,realBrowserSelectionMeasured:false,
  limitations:'Uncompressed local HTTP HTML bytes and verified saved media bytes only. Responsive candidates are grouped into lower/upper representative byte ranges; these are NOT actual selected resources, compressed network transfer, LCP, CLS, INP, Speed Index, visual approval or public HTTPS performance.'});
}
module.exports=Object.freeze({FORMAT,review});
