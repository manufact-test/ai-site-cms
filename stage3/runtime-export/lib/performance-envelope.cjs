'use strict';
/**
 * Actual FILE-INVENTORY performance envelope for a verified immutable D4 ZIP.
 * Not Lighthouse / real-host TTFB / LCP / an assertion that media is downloaded.
 * No network. No arbitrary path reads. All inputs are archive-verified bytes.
 */
const zlib=require('node:zlib');
const limits=Object.freeze({
  htmlBytes:160*1024, htmlGzipBytes:50*1024, stylesheetBytes:100*1024,
  eagerImageCandidateBytes:1500*1024, referencedMediaBytes:8*1024*1024,
  unusedMediaBytes:2*1024*1024, eagerImageCount:4
});
const attr=(tag,key)=>tag.match(new RegExp('\\b'+key+'\\s*=\\s*["\\x27]([^"\\x27]*)["\\x27]','i'))?.[1]??null;
const localMedia=/(?:^|[^a-z0-9/.:-])(\/assets\/[a-z][a-z0-9-]{2,79}\.(?:png|jpg|webp|mp4))(?=$|[^a-z0-9.-])/gi;
const stylesIn=(html)=>[...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
function inspectPerformance(entries,publication,technology){
  const directory=['php','next-ssr'].includes(technology)?'deploy/data/':'deploy/';
  const styles=(publication.stylesheets??[]).map(s=>{
    const bytes=entries.get(directory+s.file);
    return {file:s.file,bytes:bytes?.length??0,gzipBytes:bytes?zlib.gzipSync(bytes,{level:6}).length:0};
  });
  const css=styles.reduce((n,x)=>n+x.bytes,0);
  const cssGzip=styles.reduce((n,x)=>n+x.gzipBytes,0);
  const byUrl=new Map(publication.assets.map(a=>['/'+a.file,{
    id:a.id,file:a.file,mime:a.mime,bytes:(entries.get(directory+a.file)||Buffer.alloc(0)).length
  }]));
  const seen=new Set(),findings=[],pages=[];
  const add=(code,route,description)=>findings.push({severity:'warning',code,route,description});
  for(const page of publication.pages){
    const bytes=entries.get(directory+page.file);
    if(!bytes)continue; // Existing ZIP integrity verifier emits the structural failure.
    const html=bytes.toString('utf8'),htmlGzipBytes=zlib.gzipSync(bytes,{level:6}).length;
    const inlineCss=stylesIn(html);
    const inlineCssBytes=Buffer.byteLength(inlineCss,'utf8');
    const declaredMedia=new Set(),eagerMedia=new Set();
    for(const match of html.matchAll(localMedia)){
      const item=byUrl.get(match[1]);
      if(item){declaredMedia.add(match[1]);seen.add(match[1]);}
    }
    let imageCount=0,eagerImageCount=0,lazyImageCount=0,highPriorityImageCount=0;
    let imagesMissingDimensions=0;
    for(const match of html.matchAll(/<img\b[^>]*>/gi)){
      const tag=match[0],src=attr(tag,'src'),loading=attr(tag,'loading');
      imageCount++;
      if(attr(tag,'width')===null||attr(tag,'height')===null)imagesMissingDimensions++;
      if(attr(tag,'fetchpriority')==='high')highPriorityImageCount++;
      if(loading==='lazy'){lazyImageCount++;continue;}
      eagerImageCount++;
      if(src&&byUrl.has(src))eagerMedia.add(src);
      // srcset candidates are alternatives; sum is an upper bound, not transfer.
      const srcset=attr(tag,'srcset');
      if(srcset)for(const token of srcset.split(',')){
        const uri=token.trim().split(/\s+/)[0];if(byUrl.has(uri))eagerMedia.add(uri);
      }
    }
    const mediaBytes=[...declaredMedia].reduce((sum,u)=>sum+byUrl.get(u).bytes,0);
    const eagerImageCandidateBytes=[...eagerMedia].reduce((sum,u)=>sum+byUrl.get(u).bytes,0);
    const pageCssBytes=css+inlineCssBytes;
    if(bytes.length>limits.htmlBytes)add('PERF_HTML_RAW_HIGH',page.path,'HTML '+bytes.length+' B exceeds default '+limits.htmlBytes+' B');
    if(htmlGzipBytes>limits.htmlGzipBytes)add('PERF_HTML_GZIP_ESTIMATE_HIGH',page.path,'Estimated gzip HTML '+htmlGzipBytes+' B exceeds '+limits.htmlGzipBytes+' B');
    if(pageCssBytes>limits.stylesheetBytes)add('PERF_CSS_RAW_HIGH',page.path,'Shared + inline CSS '+pageCssBytes+' B exceeds '+limits.stylesheetBytes+' B');
    if(eagerImageCandidateBytes>limits.eagerImageCandidateBytes)
      add('PERF_EAGER_IMAGE_CANDIDATES_HIGH',page.path,'Eager image candidate bytes '+eagerImageCandidateBytes+' exceed '+limits.eagerImageCandidateBytes);
    if(eagerImageCount>limits.eagerImageCount)
      add('PERF_TOO_MANY_EAGER_IMAGES',page.path,'Eager images '+eagerImageCount+' exceed '+limits.eagerImageCount);
    if(mediaBytes>limits.referencedMediaBytes)
      add('PERF_PAGE_MEDIA_HIGH',page.path,'All media referenced by published HTML total '+mediaBytes+' B');
    if(imagesMissingDimensions>0)
      add('PERF_IMAGE_LAYOUT_UNRESERVED',page.path,imagesMissingDimensions+' HTML images lack width or height');
    pages.push({
      route:page.path,htmlBytes:bytes.length,htmlGzipEstimateBytes:htmlGzipBytes,
      sharedCssBytes:css,sharedCssGzipEstimateBytes:cssGzip,
      inlineCssBytes,pageCssBytes,
      referencedMediaCount:declaredMedia.size,referencedMediaBytes:mediaBytes,
      eagerImageCandidateBytes,eagerImageCount,lazyImageCount,highPriorityImageCount,
      imageCount,imagesMissingDimensions
    });
  }
  const allMediaBytes=[...byUrl.values()].reduce((sum,x)=>sum+x.bytes,0);
  const unusedMedia=[...byUrl].filter(([k])=>!seen.has(k)).map(([,v])=>v);
  const unusedMediaBytes=unusedMedia.reduce((sum,x)=>sum+x.bytes,0);
  if(unusedMediaBytes>limits.unusedMediaBytes)
    add('PERF_UNUSED_RELEASE_MEDIA_HIGH','/',unusedMedia.length+' published assets not directly referenced in HTML; '+unusedMediaBytes+' B (may be used dynamically, do not auto-delete)');
  return {
    format:'manufact-offline-performance-envelope-v1',
    scope:'PUBLISHED_SOURCE_BYTES_ONLY',budgets:limits,
    totals:{pageCount:pages.length,publishedMediaBytes:allMediaBytes,
      referencedMediaBytes:allMediaBytes-unusedMediaBytes,
      unreferencedInHtmlMediaBytes:unusedMediaBytes,
      unreferencedInHtmlMediaCount:unusedMedia.length,
      sharedCssBytes:css,sharedCssGzipEstimateBytes:cssGzip,
      publishedHtmlBytes:pages.reduce((sum,p)=>sum+p.htmlBytes,0),
      publishedHtmlGzipEstimateBytes:pages.reduce((sum,p)=>sum+p.htmlGzipEstimateBytes,0)},
    pages,findings,
    notice:'Offline inventory only. gzip is an estimate, image srcset candidates are alternatives, and HTML-only analysis cannot certify actual browser requests, dynamically loaded media, LCP, CWV, TTFB, network transfer or host caching.'
  };
}
module.exports={inspectPerformance};
