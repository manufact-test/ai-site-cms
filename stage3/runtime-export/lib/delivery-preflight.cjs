'use strict';
/**
 * D5 offline visitor preflight for a cryptographically verified D4 ZIP.
 * No DNS, browser, network access, remote collectors, production credentials.
 * Findings distinguish structural blockers, advisory warnings and operator gates.
 */
const fs=require('node:fs');
const path=require('node:path');
const {inspect}=require('../bin/verify-delivery.cjs');
const {readArchive,hash}=require('./delivery-zip.cjs');

const capture=(html,tag,attr)=> {
  const reg=new RegExp('<'+tag+'\\b[^>]*>','gi');
  return [...html.matchAll(reg)].map(x=>{
    const m=x[0].match(new RegExp('\\b'+attr+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'));
    return m?.[1]??m?.[2]??m?.[3]??null;
  });
};
const norm=(route)=>{
  try{
    const s=decodeURIComponent(route).replace(/\/+/g,'/');
    if(!s.startsWith('/')||s.startsWith('//')||s.includes('\\')||s.split('/').some(x=>x==='..'))return null;
    return s==='/index.html'?'/':s.endsWith('/index.html')?s.slice(0,-10):s;
  }catch{return null;}
};
function audit(zipFile,expectedOrigin=null){
  const verified=inspect(zipFile);
  const archive=readArchive(fs.readFileSync(zipFile));
  const m=JSON.parse(archive.get('handoff/delivery-manifest.json').toString('utf8'));
  const pub=JSON.parse(archive.get('handoff/source-release-manifest.json').toString('utf8'));
  const findings=[],routes=new Set([...m.pages,...Object.keys(m.redirects)]);
  const add=(severity,code,description,route=null)=>findings.push({severity,code,description,...(route?{route}:{})});
  if(expectedOrigin!==null){
    if(!/^https:\/\/[a-z0-9.-]+(?::\d{2,5})?$/i.test(expectedOrigin))
      add('blocker','EXPECTED_ORIGIN_INVALID','Expected origin must be an HTTPS scheme + host');
    else if(m.publicOrigin!==expectedOrigin)
      add('blocker','ORIGIN_MISMATCH','Published canonical origin does not match intended host');
  }
  if(!m.publicOrigin)add('blocker','ORIGIN_UNSET','Published site lacks an explicit canonical HTTPS origin');
  if(m.publicOrigin&&!m.publicOrigin.startsWith('https://'))
    add('blocker','ORIGIN_NOT_HTTPS','Canonical host is not HTTPS');
  if(m.technology==='next-ssr')
    add('blocker','SSR_BUILD_REQUIRED','SSR source project requires npm installation, a real Node build and a Node-capable host');
  if(m.technology==='php')add('manual','PRIVATE_DOCUMENT_ROOT','Web server document root MUST be deploy/public; deploy/data must stay private');
  if(['html','next-static'].includes(m.technology)&&Object.keys(m.redirects).length)
    add('manual','REDIRECT_SERVER_RULES','Host must activate Apache .htaccess or equivalent Nginx rules for HTTP 301');
  if(m.forms)add('manual','COLLECTOR_LIVE_CHECK','Confirm HTTPS form collector availability and actual submission/storage on staging');
  add('manual','OWNER_RELEASE_APPROVAL','Review TLS, canonical domain, analytics, redirects, forms, backups and staging before any production switch');

  let pagesSeen=0,formsSeen=0,linksSeen=0,externalLinks=0,mediaReferences=0;
  for(const page of pub.pages){
    const prefix=m.technology==='php'||m.technology==='next-ssr'?'deploy/data/':'deploy/';
    const bytes=archive.get(prefix+page.file);
    if(!bytes){
      // For Next Static, compiled HTML is verified by D4 packaging, and routes
      // may differ from raw source in fringe builds. Emit actionable blocker.
      add('blocker','PAGE_MISSING','Missing generated page '+page.file,page.path);continue;
    }
    const html=bytes.toString('utf8');pagesSeen++;
    const title=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()??'';
    if(!title)add('warning','TITLE_MISSING','No title tag on published page',page.path);
    const description=html.match(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/i);
    if(!description)add('warning','DESCRIPTION_MISSING','No meta description on published page',page.path);
    const canon=html.match(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i)?.[0];
    const canonical=canon?capture(canon,'link','href')[0]:null;
    if(!canonical)add('warning','CANONICAL_MISSING','No canonical URL',page.path);
    else if(m.publicOrigin&&canonical!==m.publicOrigin+page.path)
      add('blocker','CANONICAL_MISMATCH','Canonical URL differs from published public origin + page route',page.path);
    if(/<meta\b(?=[^>]*\bname\s*=\s*["']robots["'])[^>]*\bnoindex\b/i.test(html))
      add('warning','NOINDEX_PAGE','Published page declares noindex',page.path);

    for(const action of capture(html,'form','action')){
      formsSeen++;
      if(!action)add('blocker','FORM_NO_ACTION','Form does not have an action',page.path);
      else{
        try{
          const u=new URL(action,m.publicOrigin||'https://localhost.invalid');
          if(!m.formCollector)add('blocker','FORM_COLLECTOR_MISSING','Form exists but release has no collector',page.path);
          else{
            const configured=new URL(m.formCollector);
            if(u.origin!==configured.origin)
              add('blocker','FORM_COLLECTOR_ORIGIN','Form action points outside configured collector host',page.path);
            if(u.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(u.hostname))
              add('blocker','FORM_COLLECTOR_TLS','Form destination is not HTTPS',page.path);
          }
        }catch{add('blocker','FORM_ACTION_INVALID','Form action is not a valid URL',page.path);}
      }
    }
    // Only same-origin href/src are reliably audited without network access.
    for(const [tag,attr] of [['a','href'],['img','src'],['source','src'],['video','src']]){
      for(const raw of capture(html,tag,attr)){
        if(!raw||raw.startsWith('#')||raw.startsWith('data:')||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:'))continue;
        linksSeen++;
        let u;
        try{u=new URL(raw, m.publicOrigin?m.publicOrigin+page.path:'https://site.invalid'+page.path);}
        catch{add('warning','LINK_INVALID','Link cannot be parsed: '+String(raw).slice(0,80),page.path);continue;}
        if(u.protocol!=='http:'&&u.protocol!=='https:')continue;
        const origin=m.publicOrigin||'https://site.invalid';
        if(u.origin!==origin){externalLinks++;continue;}
        const route=norm(u.pathname);
        if(!route){add('warning','LINK_UNSAFE_PATH','Internal link has unusual path',page.path);continue;}
        if(route.startsWith('/assets/')){
          mediaReferences++;
          const asset=route.slice(1);
          if(!pub.assets.some(x=>x.file===asset))
            add('blocker','MEDIA_NOT_PUBLISHED','Media URL missing from published release: '+route,page.path);
          continue;
        }
        if(route==='/robots.txt'||route==='/sitemap.xml')continue;
        if(!routes.has(route)){
          const suggestion=route.endsWith('/')?route:route+'/';
          if(!routes.has(suggestion))
            add('warning','INTERNAL_LINK_UNRESOLVED','Unrecognized local link: '+route,page.path);
        }
      }
    }
  }
  if(m.forms!==formsSeen)
    add('warning','FORM_COUNT_DIFF','HTML form count differs from release handoff metadata');
  if(!pub.assets.length)add('warning','NO_MEDIA','Published release has no media assets');
  if(!archive.has('deploy/.htaccess')&&['html','next-static'].includes(m.technology))
    add('blocker','APACHE_RULES_MISSING','Missing generated Apache routing rules');
  if(m.technology==='php'&&archive.has('deploy/public/release-manifest.json'))
    add('blocker','PRIVATE_SNAPSHOT_EXPOSED','Private published manifest exposed in public directory');
  let sharedCssBytes=0,sharedCssFileCount=0;
  for(const style of pub.stylesheets??[]){
    const relative=m.technology==='php'||m.technology==='next-ssr'?'deploy/data/':'deploy/';
    const bytes=archive.get(relative+style.file);
    if(!bytes||hash(bytes)!==style.sha256){
      add('blocker','SHARED_CSS_INVALID','Immutable shared CSS file missing or altered');continue;
    }
    sharedCssBytes+=bytes.length;sharedCssFileCount++;
  }
  const publishedHtmlBytes=pub.pages.reduce((sum,p)=>{
    const dir=m.technology==='php'||m.technology==='next-ssr'?'deploy/data/':'deploy/';
    return sum+(archive.get(dir+p.file)?.length??0);
  },0);
  const counts={blockers:findings.filter(x=>x.severity==='blocker').length,
    warnings:findings.filter(x=>x.severity==='warning').length,
    manual:findings.filter(x=>x.severity==='manual').length};
  return {format:'manufact-delivery-preflight-v1',
    siteId:m.siteId,publishedVersion:m.publishedVersion,sourceRevision:m.sourceRevision,
    technology:m.technology,zipSha256:verified.sha256,
    readiness:counts.blockers?'blocked':'requires-operator-approval',
    counts,stats:{pages:pagesSeen,forms:formsSeen,links:linksSeen,externalLinks,mediaReferences,
      files:verified.files,zipBytes:verified.bytes,redirects:verified.redirects,
      sharedCssFileCount,sharedCssBytes,publishedHtmlBytes,
      repeatedInlineCssBytesAvoided:Math.max(0,pub.pages.length-1)*sharedCssBytes},
    expectedOrigin,publicOrigin:m.publicOrigin??null,
    findings:findings.slice(0,500),findingsTruncated:findings.length>500,
    notice:'Offline integrity and published-HTML audit only; no actual host, TLS, email, forms or production deployment verified.'};
}
module.exports={audit};
