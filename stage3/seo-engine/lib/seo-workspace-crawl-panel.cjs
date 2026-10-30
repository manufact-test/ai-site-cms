'use strict';
/* Strict, private crawl evidence panel for the EXISTING SEO operator workspace.
 * Reports are operator-supplied. No HTTP calls, automatic owner approvals or deployment.
 */
const crypto=require('node:crypto');
const CMS=require('./crawl-cms-implementation.cjs');
const CMS_VIEW=require('./crawl-cms-implementation-view.cjs');
const CYCLE=require('./crawl-cms-lifecycle.cjs');
const CYCLE_VIEW=require('./crawl-cms-recheck-view.cjs');
const HASH=/^[0-9a-f]{64}$/;
const hex=s=>crypto.createHash('sha256').update(s).digest('hex');
const escape=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const check=(test,message)=>{if(!test)throw Error('Crawl workspace: '+message);};
const priorities=['P0','P1','P2'];
function build(data){
 const policy=data?.policy,delta=data?.regression||null,
  correlation=data?.correlation||null,repair=data?.repair||null,
  manifest=data?.repairManifest||null;
 check(policy?.format==='manufact-seo-crawl-policy-v1'&&policy.readOnly===true&&
  policy.publicationAuthorized===false&&policy.publicHostAuthenticated===false,
  'original private crawl policy required, never a release');
 check(typeof policy.siteId==='string'&&policy.siteId.length>0&&
  typeof policy.base==='string'&&policy.base.startsWith('https://')&&
  policy.base.endsWith('/')&&HASH.test(policy.blueprintSha256)&&
  HASH.test(policy.robotsSha256)&&HASH.test(policy.sitemapSha256)&&
  Array.isArray(policy.pages)&&Array.isArray(policy.findings)&&
  Array.isArray(policy.actions)&&policy.summary&&policy.summary.priorities,
  'incomplete crawl policy source or canonical fingerprints');
 const same=r=>r.siteId===policy.siteId&&r.base===policy.base;
 const bound=(x,label)=>check(HASH.test(x||''),label+' must be SHA256');
 const hashes=data.digests||{};
 for(const [k,value] of Object.entries(hashes))bound(value,'input '+k);
 check(HASH.test(hashes.policy||''),'policy source bytes are not pinned');
 if(delta){
  check(delta.format==='manufact-seo-crawl-policy-delta-v1'&&delta.readOnly===true&&
   delta.publicationAuthorized===false&&delta.publicHostAuthenticated===false&&
   same(delta)&&delta.blueprintSha256===policy.blueprintSha256&&
   delta.beforeSources?.robotsSha256===policy.robotsSha256&&
   delta.beforeSources?.sitemapSha256===policy.sitemapSha256&&
   delta.scope===policy.scope&&JSON.stringify(delta.agents)===JSON.stringify(policy.agents)&&
   Array.isArray(delta.changes)&&Array.isArray(delta.tasks),
   'regression does not reference the supplied original crawl policy');
  check(HASH.test(hashes.regression||''),'regression bytes not pinned');
 }
 if(data.indexing)check(data.indexing.siteId===policy.siteId&&
  data.indexing.publicOrigin===policy.base&&data.indexing.readOnly===true,
  'GSC URL indexing report must use the same approved site and HTTPS mount');
 if(correlation){
  check(correlation.format==='manufact-seo-crawl-indexing-correlation-v1'&&
   correlation.readOnly===true&&correlation.publicationAuthorized===false&&
   correlation.causalExplanationEstablished===false&&same(correlation)&&
   correlation.approvedBlueprintSha256===policy.blueprintSha256&&
   correlation.suppliedRobotsSha256===policy.robotsSha256&&
   correlation.suppliedSitemapSha256===policy.sitemapSha256&&
   HASH.test(correlation.originalBlueprintSourceSha256)&&
   correlation.originalIndexingReportSha256===data.indexingReportSha256&&
   data.indexing?.blueprintSha256===correlation.originalBlueprintSourceSha256&&
   Array.isArray(correlation.actions)&&Array.isArray(correlation.pages),
   'indexing correlation must match exact original GSC report and crawl sources');
  check(HASH.test(hashes.correlation||''),'correlation bytes not pinned');
 }
 let candidate=null;
 if(repair||manifest||data.proposedRobots!==undefined||data.proposedSitemap!==undefined){
  check(repair&&manifest&&typeof data.proposedRobots==='string'&&
   typeof data.proposedSitemap==='string',
   'repair dossier needs both original proposed file bytes and its source manifest');
  check(repair.format==='manufact-seo-crawl-repair-plan-v1'&&
   repair.readOnly===true&&repair.releaseAuthorized===false&&
   repair.artifactsDraftOnly===true&&same(repair)&&
   repair.ownerReviewRequired===true&&
   repair.comparison?.format==='manufact-seo-crawl-policy-delta-v1'&&
   repair.comparison.publicationAuthorized===false&&
   repair.comparison.blueprintSha256===policy.blueprintSha256&&
   repair.comparison.beforeSources?.robotsSha256===policy.robotsSha256&&
   repair.comparison.beforeSources?.sitemapSha256===policy.sitemapSha256&&
   manifest.format==='manufact-seo-crawl-repair-sources-v1'&&
   manifest.publicationAuthorized===false&&
   manifest.ownerApprovalAuthenticated===false&&
   manifest.siteId===policy.siteId&&
   manifest.approvedBlueprintCanonicalSha256===policy.blueprintSha256&&
   manifest.sourceRawSha256?.robots===policy.robotsSha256&&
   (!data.indexing||manifest.sourceRawSha256?.blueprint===data.indexing.blueprintSha256)&&
   (!correlation||manifest.sourceRawSha256?.blueprint===correlation.originalBlueprintSourceSha256)&&
   manifest.sourceRawSha256?.sitemap===policy.sitemapSha256&&
   HASH.test(manifest.sourceRawSha256?.blueprint||'')&&
   HASH.test(manifest.sourceRawSha256?.site||''),
   'repair must match the same approved Blueprint and original policy with no release authorization');
  const rb=hex(data.proposedRobots),sm=hex(data.proposedSitemap);
  check(rb===repair.proposedRobotsSha256&&rb===manifest.proposedRobotsSha256&&
   sm===repair.proposedSitemapSha256&&sm===manifest.proposedSitemapSha256&&
   rb===repair.comparison.afterSources?.robotsSha256&&
   sm===repair.comparison.afterSources?.sitemapSha256,
   'proposed file bytes disagree with the original repair report or manifest');
  check(Array.isArray(repair.manualHolds)&&Array.isArray(repair.appliedSuggestions)&&
   Array.isArray(repair.generatedUrls)&&
   typeof repair.summary?.needsManualReview==='number'&&
   repair.summary.needsManualReview===repair.manualHolds.length,
   'incomplete repair holds or source inventory');
  for(const key of ['repair','repairManifest','proposedRobots','proposedSitemap'])
   check(HASH.test(hashes[key]||''),'missing pinned candidate input '+key);
  check(hashes.proposedRobots===rb&&hashes.proposedSitemap===sm,
   'source file digest does not match proposed bytes');
  if(delta)check(delta.afterSources?.robotsSha256===rb&&
   delta.afterSources?.sitemapSha256===sm,
   'provided regression must compare original policy to THESE candidate bytes');
  candidate={robots:'DRAFT-ONLY-robots.txt',sitemap:'DRAFT-ONLY-sitemap.xml',
   robotsSha256:rb,sitemapSha256:sm,holds:repair.manualHolds.length};
 }
 let cmsReview=null,cmsView=null;
 if(data.cmsBlueprint!==undefined||data.cmsSite!==undefined){
  check(data.cmsBlueprint&&data.cmsSite&&
   HASH.test(hashes.cmsBlueprint||'')&&HASH.test(hashes.cmsSite||''),
   'original approved Blueprint and Site v1 must BOTH be supplied and SHA256-pinned');
  cmsReview=CMS.build({blueprint:data.cmsBlueprint,
   blueprintRawSha256:hashes.cmsBlueprint,site:data.cmsSite,
   siteRawSha256:hashes.cmsSite,policy,regression:delta,correlation,repair,
   repairManifest:manifest,indexing:data.indexing||null});
  cmsView=CMS_VIEW.render(cmsReview);
 }
 let cmsTemplate=null,cmsRecheck=null,cmsRecheckView=null;
 if(data.cmsBaseline!==undefined||data.cmsDecisions!==undefined)
  check(cmsReview&&data.cmsBaseline&&HASH.test(hashes.cmsBaseline||'')&&
   (!data.cmsDecisions||HASH.test(hashes.cmsDecisions||'')),
   'crawl CMS recheck requires current Blueprint/Site and the original prior worklist');
 if(cmsReview){
  const renderedCurrent=JSON.stringify(cmsReview,null,2)+'\n';
  const currentRawSha=hex(renderedCurrent);
  cmsTemplate=CYCLE.template(cmsReview,currentRawSha);
  if(data.cmsBaseline){
   cmsRecheck=CYCLE.compare(data.cmsBaseline,hashes.cmsBaseline,
    cmsReview,currentRawSha,data.cmsDecisions||null,hashes.cmsDecisions||null);
   cmsRecheckView=CYCLE_VIEW.render(cmsRecheck);
  }
 }
 const items=[],ids=new Set();
 function add(source,id,priority,path,message,manual,agent){
  check(priorities.includes(priority),'invalid manual action priority');
  const key=source+':'+id;
  check(!ids.has(key),'duplicate action identity '+key);ids.add(key);
  items.push({source,id:key,priority,path:path||'site',agent:agent||'—',
   message:message||id,manual:manual||'Verify the original evidence and approved live host manually.'});
 }
 for(const f of policy.findings){
  check(f&&typeof f.id==='string'&&priorities.includes(f.priority),
   'invalid original crawl finding');
  const related=policy.actions.find(a=>a.pageId===f.pageId&&a.priority===f.priority&&
   (!f.agent||a.id?.endsWith(':'+f.agent)));
  add('policy',f.id,f.priority,f.path,f.message,
   related?.step||f.instruction||f.manualNext,f.agent);
 }
 if(delta)for(const d of delta.changes){
  const related=delta.tasks.find(t=>t.id==='review:'+d.id);
  add('regression',d.id,d.priority,d.path,d.message,
   related?.instruction||'Inspect old/new original rules and exact published host before correction.',d.agent);
 }
 if(correlation)for(const a of correlation.actions)
  add('correlation',a.id,a.priority,a.path,a.reason,a.manualNext,null);
 if(repair)for(let i=0;i<repair.manualHolds.length;i++){
  const h=repair.manualHolds[i];
  add('candidate','hold-'+i,'P1',h.path||h.pageId,
   h.reason,'Manual hold: '+String(h.detail||'Review robots group, noindex or route intent.'),h.agent);
 }
 items.sort((a,b)=>priorities.indexOf(a.priority)-priorities.indexOf(b.priority)||
  a.path.localeCompare(b.path)||a.id.localeCompare(b.id));
 const counts=Object.fromEntries(priorities.map(p=>[p,items.filter(x=>x.priority===p).length]));
 const limits=[
  'Original robots, XML, Search Console and Site v1 are operator supplied, NOT verified against a deployed live host.',
  'Correlation is NOT a causal explanation of indexation; missing URL observations remain unknown.',
  'Every proposed file is PRIVATE, UNAPPROVED and never ready for upload or publishing.',
  'Only the CMS lead and site owner can authorize implementation after independent HTTP, revision and privacy checks.'
 ];
 const css='*{box-sizing:border-box}body{margin:0;background:#f4f8fa;color:#173346;font:15px/1.6 system-ui,Arial,sans-serif}main{max-width:1160px;margin:auto;padding:24px 18px 70px}header{border-radius:24px;padding:30px;background:#123a4c;color:#fff}h1{margin:8px 0}header p{color:#d4e9f0}section{margin-top:18px;background:white;border:1px solid #d7e4ec;border-radius:19px;padding:24px}h2{margin:0 0 12px}code,pre{overflow-wrap:anywhere;white-space:pre-wrap}pre{background:#f0f5f8;padding:15px;border-radius:11px;max-height:400px;overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #e2eaf0;padding:10px}th{font-size:12px;color:#3c6473}a{color:#087b78}.tag{display:inline-block;border-radius:8px;background:#ffedcf;color:#704711;padding:2px 9px;font-weight:750}.important{border-left:5px solid #c45e26;padding:13px;background:#fff6ed}.small{color:#536c7b;font-size:13px}.scroll{overflow-x:auto}@media(max-width:720px){header,section{padding:18px}table{min-width:700px}}';
 const rows=items.map(x=>'<tr><td><b>'+escape(x.priority)+'</b></td><td>'+escape(x.source)+'</td><td><code>'+
  escape(x.path)+'</code><div class="small">'+escape(x.agent)+'</div></td><td>'+
  escape(x.message)+'</td><td>'+escape(x.manual)+'</td></tr>').join('');
 const provenance=[['Canonical Blueprint',policy.blueprintSha256],
  ['Original robots',policy.robotsSha256],['Original sitemap',policy.sitemapSha256],
  ...Object.entries(hashes).map(([k,v])=>['Private '+k+' input',v]),
  ...(candidate?[['Candidate robots',candidate.robotsSha256],
   ['Candidate sitemap',candidate.sitemapSha256]]:[])];
 const provenanceHtml=provenance.map(x=>'<tr><td>'+escape(x[0])+'</td><td><code>'+escape(x[1])+'</code></td></tr>').join('');
 let propose='';
 if(candidate){
  const preview=(body)=>escape(body.slice(0,12000))+(body.length>12000?'\n… preview truncated; see full private candidate file':'');
  propose='<section><h2>Unapproved file candidates</h2><p class="important">NOT FOR DEPLOYMENT. These source-pinned copies are private working proposals, NOT official robots.txt/sitemap.xml, even with zero manual holds.</p>'+
   '<p><a href="'+candidate.robots+'">View DRAFT-ONLY robots proposal</a> · <a href="'+candidate.sitemap+'">View DRAFT-ONLY sitemap proposal</a></p>'+
   '<h3>Proposed robots.txt</h3><pre>'+preview(data.proposedRobots)+'</pre>'+
   '<h3>Proposed sitemap.xml</h3><pre>'+preview(data.proposedSitemap)+'</pre>'+
   '<p>Manual holds: '+repair.manualHolds.length+'; explicit Allow suggestions: '+repair.appliedSuggestions.length+
   '; original Site v1 revision independently authenticated: NO.</p></section>';
 }
 const cmsLink=cmsView?'<section><h2>CMS / publisher implementation mapping</h2><p><a href="crawl-cms.html">Open source-bound CMS and publisher implementation worklist</a> · <a href="crawl-cms-worklist.md">Lead Markdown</a> · <a href="crawl-cms-worklist.json">Private JSON</a> · <a href="crawl-cms-decisions-TEMPLATE.json">NEW-cycle human decision template</a>'+
  (cmsRecheckView?' · <a href="crawl-cms-recheck.html">Compare old vs current tasks</a> · <a href="crawl-cms-recheck.md">Lead recheck summary</a>':'')+'</p><p>Source-drift pages: '+cmsReview.summary.driftPages+' · Extra pages: '+cmsReview.summary.unapprovedExtraPages+' · Manual implementation actions: '+cmsReview.summary.totalManualActions+'. No CMS Save or publishing is authorized.</p></section>':'';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;"><title>MANUFACT — Private Crawl Operations</title><style>'+css+'</style></head><body><main><header><div>MANUFACT · PRIVATE SEO OPERATOR WORKSPACE</div><h1>Search delivery &amp; crawl intelligence</h1><p>Site '+escape(policy.siteId)+' · '+escape(policy.base)+'</p><p>Original-source observations, not authenticated crawler traffic or Google URL Inspection.</p></header>'+
  '<section><h2>Manual review queue</h2><p><span class="tag">P0 '+counts.P0+' · P1 '+counts.P1+' · P2 '+counts.P2+'</span></p>'+
  '<p><a href="crawl-lead-worklist.md">Open private lead worklist</a></p><p>Regression '+(delta?'supplied':'not supplied')+' · GSC correlation '+(correlation?'supplied':'not supplied')+
  ' · candidate '+(candidate?'private draft only':'not supplied')+'</p><div class="scroll"><table><thead><tr><th>Priority</th><th>Source</th><th>Route / bot</th><th>Observation</th><th>Next manual check</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="5">No triggers in supplied input. This does NOT prove the public site is ready.</td></tr>')+
  '</tbody></table></div></section>'+cmsLink+propose+
  '<section><h2>Source fingerprints</h2><p>All original report bytes are pinned in the private workspace manifest. A matching hash is source consistency, not public-host authentication.</p><div class="scroll"><table><tbody>'+provenanceHtml+'</tbody></table></div></section>'+
  '<section><h2>Mandatory lead checks</h2><ol><li>Confirm approved site ID, Blueprint and current CMS revision with the owner.</li>'+
  '<li>Verify actual served HTTPS robots/sitemap, HTTP redirects, canonical and X-Robots-Tag before changes.</li>'+
  '<li>Review each P0/P1 and every candidate manual hold, privacy rule and crawler-specific exception.</li>'+
  '<li>Only in lead-owned publisher, after separate approval, implement a reviewed change with rollback; then verify the served bytes and Search Console manually.</li></ol>'+
  '<p class="important">Release authorized: NO. CMS edits: NONE. Network requests: NONE. Candidate upload authorized: NO.</p></section>'+
  '</main></body></html>';
 const md=['# MANUFACT — PRIVATE crawl handoff','',
  'SITE '+policy.siteId+' | HTTPS base '+policy.base,
  'NOT A RELEASE. Human owner + CMS lead approval and real HTTPS inspection required.',
  'Canonical Blueprint SHA256: '+policy.blueprintSha256,
  'Original robots SHA256: '+policy.robotsSha256,
  'Original sitemap SHA256: '+policy.sitemapSha256,
  'P0 '+counts.P0+' / P1 '+counts.P1+' / P2 '+counts.P2,'',
  ...items.map(x=>'- '+x.priority+' ['+x.source+'] '+x.path+' '+x.agent+
   ': '+String(x.message).replace(/[\r\n]+/g,' ')+' — '+String(x.manual).replace(/[\r\n]+/g,' ')),
  '',...(candidate?['DRAFT ONLY: '+candidate.robots+' / '+candidate.sitemap,
   'Proposed SHA256: '+candidate.robotsSha256+' / '+candidate.sitemapSha256,
   'Manual holds: '+candidate.holds,'']:[]),
  'Requires independent owner approval, source revision, actual public HTTPS and rollback review.',
  'No autonomous fixes, no release GO, no Google proof.',''].join('\n');
 return {siteId:policy.siteId,base:policy.base,blueprintSha256:policy.blueprintSha256,
  html,markdown:md,candidate,cmsReview,cmsView,cmsTemplate,cmsRecheck,cmsRecheckView,
  counts,sourceIdentity:{policyRobotsSha256:policy.robotsSha256,
   policySitemapSha256:policy.sitemapSha256,
   canonicalBlueprintSha256:policy.blueprintSha256,
   originalBlueprintFileSha256:hashes.cmsBlueprint||manifest?.sourceRawSha256?.blueprint||
    correlation?.originalBlueprintSourceSha256||null,
   siteSnapshotSha256:hashes.cmsSite||manifest?.sourceRawSha256?.site||null,
   cmsSelectedSiteFingerprint:cmsReview?.selectedSiteFingerprint||null,
   files:Object.assign({},hashes)},
  overview:{included:true,P0:counts.P0,P1:counts.P1,P2:counts.P2,
   candidateIncluded:!!candidate,manualHolds:candidate?.holds??null,
   cmsImplementationIncluded:!!cmsReview,
   cmsImplementationManualActions:cmsReview?.summary.totalManualActions??null,
   cmsImplementationDriftPages:cmsReview?.summary.driftPages??null,
   cmsLifecycleRecheckIncluded:!!cmsRecheck,
   cmsLifecyclePersistent:cmsRecheck?.summary.persistent??null,
   cmsLifecycleNewP0:cmsRecheck?.summary.newCriticalP0??null,
   cmsLifecycleCompletedStillObserved:cmsRecheck?.summary.completedReportedStillObserved??null,
   originalSiteAuthenticated:false,releaseAuthorized:false},
  limitations:limits};
}
module.exports=Object.freeze({build});
