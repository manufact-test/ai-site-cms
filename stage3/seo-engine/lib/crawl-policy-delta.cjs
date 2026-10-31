'use strict';
/* Difference between TWO independently recomputed, same Blueprint crawl policy observations.
 * No traffic proof, host-authenticated change, release GO or automatic file edits.
 */
const POLICY=require('./crawl-policy.cjs');
const FORMAT='manufact-seo-crawl-policy-delta-v1';
const safe=x=>String(x??'').replace(/[\u0000-\u001f|<>]/g,' ').slice(0,280);
const priority={P0:0,P1:1,P2:2};
function compare(before,after){
 if(before?.format!==POLICY.FORMAT||after?.format!==POLICY.FORMAT||
  before.readOnly!==true||after.readOnly!==true||
  before.publicationAuthorized!==false||after.publicationAuthorized!==false||
  before.publicHostAuthenticated!==false||after.publicHostAuthenticated!==false||
  before.siteId!==after.siteId||before.blueprintSha256!==after.blueprintSha256||
  before.base!==after.base||before.scope!==after.scope||
  JSON.stringify(before.agents)!==JSON.stringify(after.agents)||
  !Array.isArray(before.pages)||!Array.isArray(after.pages)||
  before.pages.length!==after.pages.length)
  throw Error('Crawl policy delta needs two source-pinned, same-site, same-Blueprint agent/scope reviews');
 const current=new Map(after.pages.map(p=>[p.pageId,p]));
 const changes=[],tasks=[],seen=new Set();
 const push=(id,kind,p,priorityValue,message,info={})=>{
  if(seen.has(id))throw Error('Duplicate policy delta event identity');
  seen.add(id);
  changes.push({id,kind,priority:priorityValue,pageId:p?.pageId||null,
   path:p?.path||null,message,automatic:false,...info});
  tasks.push({id:'review:'+id,priority:priorityValue,pageId:p?.pageId||null,
   instruction:kind==='new-robots-block'?
    'Compare previous/new original robots rule and actual owner-approved public URL; confirm served policy before any correction.':
    kind==='sitemap-omission'?
    'Verify complete public sitemap source and approved canonical URL before re-adding.':
    'Review exact changed page/agent/sitemap evidence with the owner and independently verify the public site.',
   independentProofRequired:true,automatic:false});
 };
 for(const prev of before.pages){
  const p=current.get(prev.pageId);
  if(!p||p.path!==prev.path||p.publicUrl!==prev.publicUrl||
   p.plannedRobots!==prev.plannedRobots||p.canonicalTarget!==prev.canonicalTarget||
   p.indexableCanonical!==prev.indexableCanonical||
   p.crawlerDecisions.length!==prev.crawlerDecisions.length)
   throw Error('Crawl policy delta cannot compare changed route identities or approved Blueprint pages');
  for(let i=0;i<p.crawlerDecisions.length;i++){
   const old=prev.crawlerDecisions[i],next=p.crawlerDecisions[i];
   if(old.agent!==next.agent||old.agent!==after.agents[i]||
    typeof old.allowed!=='boolean'||typeof next.allowed!=='boolean')
    throw Error('Crawler evidence agent inventory mismatch');
   if(old.allowed===next.allowed)continue;
   const lost=old.allowed&&!next.allowed;
   const critical=lost&&p.indexableCanonical;
   const status=lost?'new-robots-block':'robots-access-restored';
   const priorityValue=critical&&next.agent.toLowerCase()==='googlebot'?'P0':
    critical?'P1':'P2';
   push('robots:'+p.pageId+':'+next.agent,status,p,priorityValue,
    lost?'Supplied policy change now denies a previously allowed page for '+next.agent+'.':
     'Supplied policy change now allows a previously denied page for '+next.agent+'.',
    {agent:next.agent,beforeAllowed:old.allowed,afterAllowed:next.allowed,
     beforeRule:old.matchedRule||null,afterRule:next.matchedRule||null,
     publishedSiteChangeAuthenticated:false});
  }
  if(prev.sitemap!==p.sitemap&&before.sitemapMeta.kind==='urlset'&&
   after.sitemapMeta.kind==='urlset'){
   const oldIncluded=prev.sitemap==='observed-in-supplied-xml',
    newIncluded=p.sitemap==='observed-in-supplied-xml';
   const reliable=before.scope==='complete'&&after.scope==='complete';
   const loss=oldIncluded&&!newIncluded;
   const kind=loss?'sitemap-omission':'sitemap-inclusion';
   const priorityValue=loss&&p.indexableCanonical&&reliable?'P1':'P2';
   push('sitemap:'+p.pageId,kind,p,priorityValue,
    loss?'Route disappeared from supplied new XML sitemap.':
     'Route appeared in supplied new XML sitemap.',
    {beforeIncluded:oldIncluded,afterIncluded:newIncluded,
     completenessAsserted:reliable,
     missingIndexabilityClaimAllowed:Boolean(loss&&p.indexableCanonical&&reliable)});
  }
 }
 if(before.sitemapMeta.kind!==after.sitemapMeta.kind){
  push('sitemap:structure','sitemap-format-transition',null,'P1',
   'Source changed between URL list and sitemap index; child sitemap coverage is not automatically comparable.',
   {beforeKind:before.sitemapMeta.kind,afterKind:after.sitemapMeta.kind});
 }
 const beforePointer=before.robotsMeta.sitemapPointers.map(x=>x.url).sort(),
  afterPointer=after.robotsMeta.sitemapPointers.map(x=>x.url).sort();
 if(JSON.stringify(beforePointer)!==JSON.stringify(afterPointer))
  push('robots:sitemap-pointers','robots-sitemap-pointer-change',null,'P1',
   'Robots.txt Sitemap directives changed; confirm exact intended public origin/mount.',
   {beforePointers:beforePointer,afterPointers:afterPointer});
 changes.sort((a,b)=>priority[a.priority]-priority[b.priority]||a.id.localeCompare(b.id));
 tasks.sort((a,b)=>priority[a.priority]-priority[b.priority]||a.id.localeCompare(b.id));
 const counts={P0:changes.filter(x=>x.priority==='P0').length,
  P1:changes.filter(x=>x.priority==='P1').length,P2:changes.filter(x=>x.priority==='P2').length};
 return {format:FORMAT,version:1,siteId:before.siteId,readOnly:true,
  base:before.base,agents:after.agents,scope:after.scope,
  blueprintSha256:after.blueprintSha256,
  beforeSources:{robotsSha256:before.robotsSha256,sitemapSha256:before.sitemapSha256,
   sitemapKind:before.sitemapMeta.kind},
  afterSources:{robotsSha256:after.robotsSha256,sitemapSha256:after.sitemapSha256,
   sitemapKind:after.sitemapMeta.kind},
  summary:{pagesCompared:after.pages.length,events:changes.length,priorities:counts,
   newGoogleBlocks:changes.filter(c=>c.kind==='new-robots-block'&&
    c.agent.toLowerCase()==='googlebot'&&c.priority==='P0').length,
   indexableSitemapOmissions:changes.filter(c=>c.kind==='sitemap-omission'&&
    c.missingIndexabilityClaimAllowed).length,
   networkRequests:0},
  changes,tasks,
  newSourceReportFindings:after.findings,
  comparisonCompleteness:before.sitemapMeta.kind==='urlset'&&
   after.sitemapMeta.kind==='urlset'&&after.scope==='complete'?
   'same-complete-urlset-declared':'partial-or-index-not-exhaustive',
  publicHostAuthenticated:false,clientSignoffAuthenticated:false,publicationAuthorized:false,
  limitations:[
   'Both original robots and sitemap byte sets are operator supplied; no deployed change was verified.',
   'The comparison holds the canonical Blueprint, site mount, agents and evidence scope constant.',
   'A sitemap-index/partial export cannot establish that child pages were omitted.',
   'Even zero regressions does not establish SEO readiness, crawler access to JS, server health or permission to publish.',
   'A separate lead-run actual HTTPS capture, owner approval and manual implementation are still required.'
  ]};
}
function markdown(report){
 if(report?.format!==FORMAT||report.publicationAuthorized!==false)
  throw Error('Original nonauthorizing crawl policy delta required');
 const lines=['# MANUFACT SEO — Crawl Policy Regression','',
  'Read-only original-source comparison; NOT live host or authenticated deployment proof.','',
  'Site: '+safe(report.siteId)+' · '+safe(report.base),
  'Canonical Blueprint SHA256: '+report.blueprintSha256,
  'P0 '+report.summary.priorities.P0+' | P1 '+report.summary.priorities.P1+
   ' | P2 '+report.summary.priorities.P2,'',
  '| Priority | Changed URL | Event | Before | After |',
  '|---|---|---|---|---|'];
 for(const c of report.changes)lines.push('| '+c.priority+' | '+safe(c.path||'site')+
  ' | '+safe(c.kind)+' | '+safe(c.beforeAllowed??c.beforeIncluded??'—')+
  ' | '+safe(c.afterAllowed??c.afterIncluded??'—')+' |');
 if(!report.changes.length)lines.push('| — | — | No policy/access difference in supplied inputs | — | — |');
 lines.push('','## Lead work before implementation','');
 for(const task of report.tasks)lines.push('- '+task.priority+' '+safe(task.id)+': '+safe(task.instruction));
 lines.push('','## Boundaries','');report.limitations.forEach(v=>lines.push('- '+safe(v)));
 return lines.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,compare,markdown});
