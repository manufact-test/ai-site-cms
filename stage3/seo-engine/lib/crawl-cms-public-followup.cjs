'use strict';
/* Read-only SEO issue-to-actual-HTTP-capture correlation. Inputs are private
 * operator-provided bytes; a transcript is NOT server provenance or Google proof.
 * No network, CMS writes, owner approval or automatic task closure.
 */
const crypto=require('node:crypto');
const BP=require('./blueprint.cjs');
const POLICY=require('./crawl-policy.cjs');
const DELIVERY=require('./delivery-evidence.cjs');
const LIFE=require('./crawl-cms-lifecycle.cjs');
const HEAD=require('./parity.cjs');
const FORMAT='manufact-seo-crawl-cms-public-followup-v1';
const HASH=/^[a-f0-9]{64}$/;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const check=(x,m)=>{if(!x)throw Error('Crawl/CMS public follow-up: '+m);};
const noindex=s=>/(?:^|[\s,])noindex(?:$|[\s,])/i.test(s||'');
const safe=s=>String(s??'').replace(/[\x00-\x1f\x7f|<>]/g,' ').trim().slice(0,260);
const P={P0:0,P1:1,P2:2};
const STATUSES=['OBSERVED-ALIGNED-NOT-VERIFIED','OBSERVED-CONFLICT','INSUFFICIENT-EVIDENCE'];
function review({worklist,worklistSha256,blueprint,blueprintRawSha256,
 site,siteRawSha256,capture,captureRawSha256,latestRecheck=null,latestRecheckRawSha256=null}={}){
 LIFE.checkWorklist(worklist,worklistSha256);
 const bp=BP.checkBlueprint(blueprint);
 check(HASH.test(blueprintRawSha256||'')&&HASH.test(siteRawSha256||'')&&
  HASH.test(captureRawSha256||''),'original private Blueprint / Site v1 / HTTPS receipt byte hashes required');
 check(bp.siteId===worklist.siteId&&
  worklist.approvedBlueprintCanonicalSha256===sha(JSON.stringify(bp))&&
  worklist.originalBlueprintRawSha256===blueprintRawSha256&&
  worklist.originalSiteRawSha256===siteRawSha256,
  'approved canonical Blueprint or exact original Blueprint/Site v1 bytes changed');
 check(site?.format==='manufact-ai-site-v1'&&site.schemaVersion===1&&
  site.siteId===bp.siteId&&Array.isArray(site.pages)&&
  site.pages.length<=80,'original selected Site v1 shape/identity mismatch');
 check(capture?.format===DELIVERY.FORMAT&&capture.siteId===bp.siteId&&
  capture.origin===worklist.base,'public HTTPS transcript must use exact site ID and mount');
 DELIVERY.assertEvidence(capture);
 const byId=new Map(),paths=new Set();
 for(const page of site.pages){
  check(page&&typeof page.id==='string'&&typeof page.path==='string'&&
   !byId.has(page.id)&&!paths.has(page.path),'duplicate or malformed Site v1 identity');
  byId.set(page.id,page);paths.add(page.path);
 }
 const bpById=new Map(bp.pages.map(p=>[p.id,p]));
 const captured=new Map(),capturedRoutes=new Set();
 for(const row of capture.pages){
  if(!bpById.has(row.id))continue;
  const expected=bpById.get(row.id);
  if(row.path!==expected.path)continue;
  if(captured.has(row.id))throw Error('Crawl/CMS public follow-up: duplicate captured approved page');
  captured.set(row.id,row);capturedRoutes.add(row.path);
 }
 const origin=worklist.base;
 const urlFor=route=>new URL(new URL(origin).pathname+route.slice(1),new URL(origin).origin).href;
 const goodCapture=x=>x&&x.status>=200&&x.status<300&&
  x.requestUrl===urlFor(x.path)&&x.responseUrl===urlFor(x.path);
 const HEADS=new Map();
 for(const [id,row] of captured)HEADS.set(id,row.html?HEAD.readHead(row.html):null);
 const delivery=DELIVERY.review(site,capture);
 const robots=capture.robots,sitemap=capture.sitemap;
 const robotsReady=robots&&robots.status===200&&robots.url===urlFor('/robots.txt')&&
  typeof robots.body==='string';
 const sitemapReady=sitemap&&sitemap.status===200&&sitemap.url===urlFor('/sitemap.xml')&&
  typeof sitemap.body==='string';
 let livePolicy=null,policyError=null;
 if(robotsReady&&sitemapReady){
  try{livePolicy=POLICY.analyze({blueprint:bp,base:origin,
   robotsText:robots.body,sitemapXml:sitemap.body,
   agents:worklist.crawlerAgents||['Googlebot','Bingbot','*'],
   scope:worklist.crawlCoverageScope||'sample'});}
  catch(e){policyError=String(e.message).slice(0,220);}
 }
 const indexed=new Map(livePolicy?.pages.map(p=>[p.pageId,p])||[]);
 const candidateDirect=livePolicy?.sitemapMeta.kind==='urlset'&&
  worklist.crawlCoverageScope==='complete';
 if(latestRecheck){
  check(latestRecheck.format===LIFE.RECHECK&&latestRecheck.readOnly===true&&
   latestRecheck.releaseAuthorized===false&&latestRecheck.siteId===bp.siteId&&
   latestRecheck.base===origin&&HASH.test(latestRecheckRawSha256||'')&&
   latestRecheck.approvedBlueprintCanonicalSha256===worklist.approvedBlueprintCanonicalSha256&&
   latestRecheck.sourceAfterRawSha256===worklistSha256,
   'optional prior/current task recheck must reference THIS exact current worklist');
 }else check(!latestRecheckRawSha256,'unexpected recheck digest without report');
 const tasks=[],summary={total:worklist.actions.length,
  alignedNotVerified:0,conflict:0,unknown:0,byPriority:{P0:0,P1:0,P2:0}};
 for(const task of worklist.actions){
  let observation=null,code='insufficient',state='INSUFFICIENT-EVIDENCE',
   reason='No independent public page, host policy or CMS revision proof for this task.';
  const plan=bpById.get(task.pageId),page=plan&&captured.get(plan.id);
  const head=page&&HEADS.get(plan.id);
  const good=page&&goodCapture(page);
  const current=indexed.get(plan?.id);
  const category=task.category;
  const outcome=(status,message,field,detail)=>{
   state=status;reason=message;code=field;observation=detail??null;
  };
  if(category==='publisher-robots-policy'&&plan){
   const agent=/for ([A-Za-z0-9_*-]+)\.$/.exec(task.detail)?.[1];
   const decision=agent&&current?.crawlerDecisions?.find(x=>x.agent?.toLowerCase()===agent.toLowerCase());
   if(robotsReady&&livePolicy&&decision){
    outcome(decision.allowed?'OBSERVED-ALIGNED-NOT-VERIFIED':'OBSERVED-CONFLICT',
     decision.allowed?'Supplied HTTP robots.txt permits the expected agent at the approved canonical URL.':
      'Supplied HTTP robots.txt STILL blocks the expected agent at the approved canonical URL.',
     'robots-agent-decision',{agent,allowed:decision.allowed,matchedRule:decision.matchedRule||null});
   }else reason='Cannot evaluate the originally blocked crawler group without HTTP 200 robots/sitemap and exact crawler agent evidence.';
  }else if(category==='publisher-sitemap'&&plan){
   if(sitemapReady&&livePolicy&&candidateDirect){
    const visible=current?.sitemap==='observed-in-supplied-xml';
    outcome(visible?'OBSERVED-ALIGNED-NOT-VERIFIED':'OBSERVED-CONFLICT',
     visible?'Approved canonical is in the supplied public XML URL list.':
      'Approved canonical is STILL absent from the supplied declared-complete direct XML sitemap.',
     'sitemap-canonical-presence',{url:urlFor(plan.path),inDirectXml:visible});
   }else reason='Sitemap observation incomplete: require successful direct XML urlset, complete scope and exact canonical URL.';
  }else if(category==='publisher-redirect-collision'){
   const row=capture.pages.find(x=>x.path===task.path&&x.requestUrl===urlFor(task.path));
   if(row){
    const ok=goodCapture(row)&&row.status===200;
    outcome(ok?'OBSERVED-ALIGNED-NOT-VERIFIED':'OBSERVED-CONFLICT',
     ok?'Supplied public response at approved canonical path is HTTP 200 without a redirect.':
       'Supplied response at approved canonical path is not stable HTTP 200.',
     'canonical-direct-response',{status:row.status,responseUrl:row.responseUrl});
   }else reason='The approved redirect-shadowed canonical URL was not included in the public HTTP transcript.';
  }else if(category==='cms-seo-robots'&&plan){
   if(good&&head?.status==='parsed-head'){
    const header=page.headers?.['x-robots-tag']||page.headers?.['X-Robots-Tag']||'';
    const observed=noindex(head.robots)||noindex(header),expected=plan.seo.robots==='noindex';
    outcome(observed===expected?'OBSERVED-ALIGNED-NOT-VERIFIED':'OBSERVED-CONFLICT',
     observed===expected?'Supplied public meta/HTTP indexability signal aligns with approved Blueprint.':
      'Supplied public indexability signal still contradicts the approved Blueprint.',
     'html-and-header-indexability',{expected:plan.seo.robots,observedNoindex:observed});
   }else reason='Exact approved page HTTP 2xx and parseable HTML head needed to inspect robots meta and X-Robots-Tag.';
  }else if(category==='cms-metadata'&&plan){
   const match=/Current seo\.(title|description|ogTitle|ogDescription) differs/.exec(task.detail);
   const field=match?.[1];
   if(field&&good&&head?.status==='parsed-head'){
    const observed=head[field],expected=plan.seo[field];
    const aligned=typeof observed==='string'&&observed===expected;
    outcome(aligned?'OBSERVED-ALIGNED-NOT-VERIFIED':'OBSERVED-CONFLICT',
     aligned?'Supplied public head metadata matches approved Blueprint field.':
      'Supplied public head metadata differs from the approved Blueprint field.',
     'public-html-'+field,{field,expected:expected??null,observed:observed??null});
   }else reason='Exact page HTTP 2xx, parsed HTML and source field name needed to compare metadata.';
  }else if(category==='cms-canonical-manual'&&plan){
   if(good&&head?.status==='parsed-head'){
    let canonical=null;
    try{if(head.canonical)canonical=new URL(head.canonical,head.baseHref?
      new URL(head.baseHref,page.responseUrl):page.responseUrl).href;}catch{}
    const target=urlFor(plan.seo.canonicalPath);
    outcome(canonical===target?'OBSERVED-ALIGNED-NOT-VERIFIED':'OBSERVED-CONFLICT',
     canonical===target?'Supplied public canonical resolves to approved target.':
      'Supplied public canonical is absent or differs from approved target.',
     'public-canonical',{expected:target,observed:canonical});
   }else reason='Exact approved path 2xx with parsed public HTML canonical required.';
  }else if(category.startsWith('cms-')){
   reason='Site v1 inventory/route differences require authenticated CMS revision; public GET cannot prove the editor source is corrected.';
  }else if(category==='search-console-inspection'){
   reason='Only authenticated Google Search Console URL Inspection can support this task; HTML/robots capture is insufficient.';
  }else if(category==='candidate-manual-hold'){
   reason='Owner privacy and crawler policy ambiguities require independent review; never discharge manual holds via an HTTP transcript.';
  }
  summary.byPriority[task.priority]++;
  summary[state==='OBSERVED-CONFLICT'?'conflict':
   state==='OBSERVED-ALIGNED-NOT-VERIFIED'?'alignedNotVerified':'unknown']++;
  tasks.push({taskId:task.taskId,issueKey:task.issueKey||null,category,ownerTeam:task.ownerTeam,
   pageId:task.pageId,path:task.path,priority:task.priority,
   status:state,reason,observationCode:code,
   observation,sourceCapturedAt:capture.capturedAt||null,
   publicHostAuthenticated:false,ownerApprovalAuthenticated:false,
   automaticClosure:false,releaseAuthorized:false});
 }
 tasks.sort((a,b)=>P[a.priority]-P[b.priority]||
  (a.path||'').localeCompare(b.path||'')||a.taskId.localeCompare(b.taskId));
 const blockers=delivery.findings.filter(x=>x.severity==='error').map(x=>({
  code:x.code,pageId:x.pageId,path:x.path,message:x.message,
  ownerAction:'Review exact supplied HTTPS capture and independently confirm the real public host.'}));
 return {format:FORMAT,version:1,readOnly:true,siteId:bp.siteId,base:origin,
  sourceWorklistRawSha256:worklistSha256,
  originalBlueprintRawSha256:blueprintRawSha256,
  originalSiteRawSha256:siteRawSha256,
  suppliedPublicCaptureRawSha256:captureRawSha256,
  sourceLatestRecheckRawSha256:latestRecheckRawSha256||null,
  capturedAt:capture.capturedAt||null,
  sourceRevisionAuthenticated:false,publicHostAuthenticated:false,
  clientApprovalAuthenticated:false,googleIndexationVerified:false,
  policy:{publicRobotsStatus:robots?.status??null,publicSitemapStatus:sitemap?.status??null,
   publicRobotsSha256:robots?.body!==undefined?sha(robots.body):null,
   publicSitemapSha256:sitemap?.body!==undefined?sha(sitemap.body):null,
   canAnalyzeBoth:!!livePolicy,parseFailure:policyError,
   sitemapCoverageComparable:!!candidateDirect},
  htmlCoverage:{selectedSitePages:site.pages.length,
   suppliedPages:capture.pages.length,approvedPagesCaptured:captured.size,
   rootRecheckStable:capture.rootRecheck?.matched??null,
   siteCaptureSiteIdMatched:true},
  summary:{...summary,independentDeliveryBlockers:blockers.length,
   publicPolicyAnalyzable:!!livePolicy},
  tasks,independentDeliveryBlockers:blockers,
  limitations:[
   'HTTP transcript is an operator-supplied recording; a source hash never authenticates its origin or the currently deployed CMS revision.',
   'OBSERVED-ALIGNED-NOT-VERIFIED means the supplied bytes look aligned; NEVER treat it as a verified fix, Google indexation or task closure.',
   'Missing HTML, failed policy parsing, sitemap-index/partial scope and unobserved pages remain insufficient evidence, not a positive result.',
   'No public observation validates private CMS source, human approval, form delivery, current SEO performance or ranking gain.',
   'Actual HTTPS origin, privacy intent and owner/canonical revision must be checked separately by the lead.'
  ],
  automaticTaskClosure:false,publicationAuthorized:false,releaseAuthorized:false};
}
function markdown(report){
 check(report?.format===FORMAT&&report.releaseAuthorized===false,'read-only private public follow-up required');
 const o=['# MANUFACT — Crawl/CMS public observation follow-up','',
  'OPERATOR-SUPPLIED HTTPS TRANSCRIPT · NO HOST AUTHENTICATION · NO AUTO-CLOSURE','',
  'Site '+safe(report.siteId)+' · '+safe(report.base),
  'Current worklist original SHA256 '+report.sourceWorklistRawSha256,
  'HTTPS transcript original SHA256 '+report.suppliedPublicCaptureRawSha256,
  'Original Site v1 SHA256 '+report.originalSiteRawSha256,
  'Capture time '+safe(report.capturedAt||'unknown'),
  'Observed conflicts '+report.summary.conflict+' · Aligned but UNVERIFIED '+
   report.summary.alignedNotVerified+' · Insufficient '+report.summary.unknown,
  'Independent delivery errors '+report.summary.independentDeliveryBlockers,''];
 for(const status of ['OBSERVED-CONFLICT','INSUFFICIENT-EVIDENCE','OBSERVED-ALIGNED-NOT-VERIFIED']){
  o.push('## '+status,'');
  const entries=report.tasks.filter(x=>x.status===status);
  for(const row of entries)o.push('- **'+row.priority+'** '+safe(row.taskId)+' ['+
   safe(row.ownerTeam)+'] '+safe(row.path||'site')+': '+safe(row.reason));
  if(!entries.length)o.push('- None in supplied files.');
  o.push('');
 }
 o.push('## Independent HTTP delivery errors', '');
 for(const row of report.independentDeliveryBlockers)o.push('- '+safe(row.code)+' / '+
  safe(row.path||'site')+': '+safe(row.message));
 if(!report.independentDeliveryBlockers.length)o.push('- No errors in the supplied transcript review; host provenance is still unverified.');
 o.push('','## Boundaries','');
 for(const item of report.limitations)o.push('- '+safe(item));
 return o.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,STATUSES,review,markdown});
