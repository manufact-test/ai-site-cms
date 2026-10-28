'use strict';
// One complete vertical smoke. Offline, no CMS writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),cli=path.join(root,'bin/seo-blueprint.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'seo-blueprint-smoke-'));
function command(op,opts){
 const args=[cli,op,...Object.entries(opts).flatMap(([k,v])=>['--'+k,v])];
 return spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:4000000});
}
function good(op,opts){const p=command(op,opts);assert.equal(p.status,0,op+': '+p.stderr);return p.stdout;}
function fixture(f){return path.join(root,'fixtures',f);}
try{
 for(const name of ['industrial','community']){
  const actual=JSON.parse(good('compile',{brief:fixture(name+'.brief.json')}));
  const expected=JSON.parse(fs.readFileSync(fixture(name+'.blueprint.json'),'utf8'));
  assert.deepEqual(actual,expected,name+' canonical blueprint');
  const explanation=good('explain',{blueprint:fixture(name+'.blueprint.json')});
  assert.match(explanation,/SEO/);
  assert.match(explanation,/mobile/i);
 }
 const site=path.resolve(root,'../fixtures/industrial-site.json'),bp=fixture('industrial.blueprint.json');
 const audit=JSON.parse(good('analyze-site',{site,blueprint:bp}));
 assert.equal(audit.format,'manufact-seo-analysis-v1');
 assert.equal(audit.mode,'site-v1');assert.equal(audit.siteId,'site-industrial-demo');
 assert.equal(audit.capabilities.coreInspector,'reused');
 const editorial=JSON.parse(good('analyze-content',{site,blueprint:bp}));
 assert.equal(editorial.format,'manufact-seo-content-review-v1');
 assert.equal(editorial.pages.length,2);
 assert.ok(editorial.findings.some(x=>x.code.startsWith('content:topic-')));
 const planReview=JSON.parse(good('review-blueprint',{blueprint:bp}));
 assert.equal(planReview.format,'manufact-seo-blueprint-review-v1');
 const structure=JSON.parse(good('review-architecture',{blueprint:bp}));
 assert.equal(structure.format,'manufact-seo-architecture-v1');
 assert.ok(structure.pages.every(p=>p.reachableFromHome));
 assert.ok(structure.schemaCandidates.every(c=>c.publicationApproved===false));
 const candidates=JSON.parse(good('propose-content',{site,blueprint:bp}));
 assert.equal(candidates.readOnly,true);
 assert.equal(candidates.proposals.length,0,'fixture headings and CTAs already match blueprint');
 const handoff=JSON.parse(good('handoff',{site,blueprint:bp}));
 assert.equal(handoff.readOnly,true);
 assert.equal(handoff.architectureReview.format,'manufact-seo-architecture-v1');
 assert.equal(handoff.contentFieldProposals.readOnly,true);
 assert.ok(Array.isArray(handoff.editorialReviewActions));
 assert.ok(handoff.editorialReviewActions.some(x=>x.automatic===false));
 assert.ok(handoff.supportedChanges.some(x=>x.field==='seo.title'));
 assert.ok(handoff.requiresLeadImplementation.some(x=>x.kind==='structured-data-adapter'));
 // Deliberate content regression: approved CTA route was changed in source data.
 const {collectReview,reviewBlueprint}=require('../lib/content-intelligence.cjs');
 const {compileBrief}=require('../lib/blueprint.cjs');
 const original=JSON.parse(fs.readFileSync(site,'utf8'));
 const plan=JSON.parse(fs.readFileSync(bp,'utf8'));
 const routeRegression=structuredClone(original);
 routeRegression.pages[0].sections[0].elements.find(x=>x.slot==='action').values['behavior.href']='/';
 const routeReport=collectReview(routeRegression,plan);
 assert.ok(routeReport.findings.some(x=>x.code==='content:planned-cta-missing'&&x.sectionId==='section-hero'));
 const shared=Array.from({length:5},()=> 'Verified editorial description of the same product category and customer requirements.').join(' ');
 const synthetic={siteId:plan.siteId,pages:[
  {id:'page-home',path:'/',sections:[{id:'section-hero',elements:[{id:'content-one',slot:'copy',values:{'content.text':shared}}]}]},
  {id:'page-contact',path:'/contact/',sections:[{id:'section-contact',elements:[{id:'content-two',slot:'copy',values:{'content.text':shared}}]}]}
 ]};
 assert.ok(collectReview(synthetic,plan).findings.some(x=>x.code==='content:duplicate-body'));
 const overlap=JSON.parse(fs.readFileSync(fixture('industrial.brief.json'),'utf8'));
 overlap.pages[1].intent.type=overlap.pages[0].intent.type;
 overlap.pages[1].intent.topics[0]=overlap.pages[0].intent.topics[0];
 assert.ok(reviewBlueprint(compileBrief(overlap)).issues.some(x=>x.code==='blueprint:primary-intent-overlap'));

 // Regressions in supported existing component slots produce precise read-only proposals.
 const {propose:proposeFields}=require('../lib/field-proposals.cjs');
 const manifests=fs.readdirSync(path.resolve(root,'../components')).filter(f=>f.endsWith('.json'))
  .map(f=>JSON.parse(fs.readFileSync(path.resolve(root,'../components',f),'utf8')));
 const changed=structuredClone(original);
 changed.pages[0].sections[0].elements.find(e=>e.slot==='heading').values['content.text']='Temporary heading';
 changed.pages[0].sections[0].elements.find(e=>e.slot==='action').values['behavior.href']='/';
 const fieldReport=proposeFields(changed,manifests,plan);
 assert.ok(fieldReport.proposals.some(p=>p.field==='content.text'&&p.before==='Temporary heading'
  &&p.after==='Производим технологическое оборудование'&&p.preconditions.expectedBefore===p.before));
 assert.ok(fieldReport.proposals.some(p=>p.field==='behavior.href'&&p.before==='/'&&p.after==='/contact/'));
 assert.ok(fieldReport.proposals.every(p=>p.reviewRequired&&p.automatic===false));
 const ambiguous=structuredClone(changed);
 ambiguous.pages[0].sections[0].elements.push({
  id:'another-cta',slot:'action',values:{'content.text':'Второе действие','behavior.href':'/'}
 });
 assert.ok(proposeFields(ambiguous,manifests,plan).blocked.some(x=>x.reason==='ambiguous-cta-element'));
 const noManifest=proposeFields(changed,[],plan);
 assert.equal(noManifest.proposals.length,0);
 assert.ok(noManifest.blocked.some(x=>x.reason==='component-manifest-unavailable'));
 const communityReview=JSON.parse(good('review-architecture',{blueprint:fixture('community.blueprint.json')}));
 assert.ok(communityReview.schemaCandidates.some(c=>c.status==='blocked-unverified-facts'));
 const unreachable=structuredClone(overlap);
 unreachable.pages[0].sections[0].cta.toPageId=overlap.pages[0].id;
 unreachable.pages[0].links=[];unreachable.pages[1].links=[];
 const isolated=compileBrief(unreachable);
 const {report:reviewArchitecture}=require('../lib/architecture.cjs');
 assert.ok(reviewArchitecture(isolated).findings.some(x=>x.code==='architecture:unreachable-from-home'));

 // Blueprint-only architecture regressions: canonical/indexation conflicts,
 // duplicate metadata, and meaningful heading hierarchy.
 const canonicalDraft=JSON.parse(fs.readFileSync(fixture('industrial.brief.json'),'utf8'));
 canonicalDraft.pages[0].seo.canonicalPath='/contact/';
 canonicalDraft.pages[1].seo.robots='noindex';
 assert.ok(reviewArchitecture(compileBrief(canonicalDraft)).findings
  .some(x=>x.code==='architecture:canonical-noindex-target'));
 const duplicateDraft=JSON.parse(fs.readFileSync(fixture('industrial.brief.json'),'utf8'));
 duplicateDraft.pages[1].seo.title=duplicateDraft.pages[0].seo.title;
 duplicateDraft.pages[0].sections[1].level=3;
 const structuralIssues=reviewArchitecture(compileBrief(duplicateDraft)).findings;
 assert.ok(structuralIssues.some(x=>x.code==='architecture:duplicate-title'));
 assert.ok(structuralIssues.some(x=>x.code==='architecture:heading-jump'));
 const stale=structuredClone(changed);
 stale.pages[0].sections[0].manifestVersion='0.0.0';
 assert.ok(proposeFields(stale,manifests,plan).blocked.some(x=>x.reason==='manifest-version-mismatch'));
 assert.ok(proposeFields(stale,manifests,plan).proposals.every(x=>x.sectionId!=='section-hero'));
 const normal=JSON.parse(good('analyze-html',{snapshot:fixture('normal.snapshot.json')}));
 assert.deepEqual(normal.issues,[],'normal HTML snapshot should have no static issues');
 const bad=JSON.parse(good('analyze-html',{snapshot:fixture('invalid.snapshot.json')}));
 const expected=JSON.parse(fs.readFileSync(fixture('invalid.expected-report.json'),'utf8'));
 for(const code of expected.requiredCodes)assert.ok(bad.issues.some(x=>x.code===code),code);

 // One integrated evidence-based remediation and release-review vertical.
 const htmlSite=fixture('industrial.html.snapshot.json');
 const htmlDrift=fixture('industrial.drift.snapshot.json');
 const parityGood=JSON.parse(good('html-parity',{site,blueprint:bp,snapshot:htmlSite}));
 assert.equal(parityGood.format,'manufact-seo-publication-parity-v1');
 assert.deepEqual(parityGood.findings,[]);
 const parityBroken=JSON.parse(good('html-parity',{site,blueprint:bp,snapshot:htmlDrift}));
 assert.ok(parityBroken.findings.some(x=>x.code==='parity:metadata-drift'&&x.field==='title'));
 assert.ok(parityBroken.findings.some(x=>x.code==='parity:indexation-drift'));
 const cleanPlan=JSON.parse(good('remediation-plan',{site,blueprint:bp,snapshot:htmlSite}));
 const rawPlan=good('remediation-plan',{site,blueprint:bp,snapshot:htmlSite});
 assert.deepEqual(cleanPlan,JSON.parse(rawPlan),'identical inputs produce deterministic plan');
 assert.equal(cleanPlan.format,'manufact-seo-remediation-v1');
 assert.equal(cleanPlan.readOnly,true);
 assert.ok(cleanPlan.summary.total>0);
 assert.ok(cleanPlan.tasks.every(x=>!x.automatic&&x.requiresHumanReview));
 assert.ok(cleanPlan.tasks.every(x=>x.taskId.startsWith('seo-')));
 assert.equal(new Set(cleanPlan.tasks.map(x=>x.taskId)).size,cleanPlan.tasks.length);
 const changedPlan=JSON.parse(good('remediation-plan',{site,blueprint:bp,snapshot:htmlDrift}));
 assert.ok(changedPlan.tasks.some(x=>x.sources.some(s=>s.code==='parity:indexation-drift')));
 const release=JSON.parse(good('release-review',{site,blueprint:bp,snapshot:htmlDrift}));
 assert.equal(release.format,'manufact-seo-release-review-v1');
 assert.equal(release.readyToPublish,false);
 assert.equal(release.automaticReleaseApproval,false);
 assert.equal(release.decision,'repair-required');
 assert.ok(release.blockers.some(x=>x.gateId==='publication-drift'));
 assert.equal(release.coverage.liveHostChecked,false);
 const md=good('remediation-md',{site,blueprint:bp,snapshot:htmlSite});
 assert.match(md,/SEO implementation/);
 assert.match(md,/automatic release approval: \*\*never\*\*/i);
 assert.match(md,/Existing CMS field proposals/);
 const {write:renderBacklog}=require('../lib/reporter.cjs');
 const protectedPlan=structuredClone(cleanPlan);
 protectedPlan.tasks[0].instruction='<script>alert("unsafe")</script>';
 const protectedMd=renderBacklog(protectedPlan);
 assert.ok(!protectedMd.includes('<script>'),'Markdown must not allow raw HTML from untrusted text');
 const {report:archReview}=require('../lib/architecture.cjs');
 assert.ok(!archReview(plan).findings.some(f=>f.code==='architecture:repeated-target'),
  'first contextual link to a target is not a repeated target');


 // Asset purpose and authored link evidence: warn without overwriting shared ALT values.
 const mediaBrief=JSON.parse(fs.readFileSync(fixture('community.brief.json'),'utf8'));
 mediaBrief.pages[0].sections[0].media={
  purpose:'informative',alt:'Карта расположения занятий',why:'Помогает ориентироваться'
 };
 const mediaPlan=compileBrief(mediaBrief);
 const mediaSite={siteId:mediaPlan.siteId,assets:[{id:'asset-map',alt:''}],pages:[
  {id:'page-guide',path:'/',sections:[
   {id:'section-guide-intro',component:'custom',elements:[
    {id:'media-image',slot:'photo',values:{'content.media':'asset-map'}}
   ]},
   {id:'section-guide-categories',component:'custom',elements:[
    {id:'media-action',slot:'action',values:{'content.text':'Подробнее','behavior.href':'/help/'}}
   ]}
  ]},
  {id:'page-help',path:'/help/',sections:[{id:'section-help',component:'custom',elements:[]}]}
 ]};
 const mediaReview=collectReview(mediaSite,mediaPlan);
 assert.ok(mediaReview.findings.some(x=>x.code==='content:informative-image-alt-review'));
 assert.ok(mediaReview.findings.some(x=>x.code==='content:generic-contextual-anchor'));
 assert.ok(mediaReview.editorialActions.every(x=>!x.automatic&&x.requiresHumanReview));
 const unpublishedGate=JSON.parse(good('release-review',{site,blueprint:bp}));
 assert.equal(unpublishedGate.automaticReleaseApproval,false);
 assert.equal(unpublishedGate.coverage.staticHtmlSupplied,false);


 // Large integrated semantic/viewport/regression acceptance using supplied evidence.
 const deep=JSON.parse(good('deep-html',{
  snapshot:fixture('community.deep.snapshot.json'),
  blueprint:fixture('community.blueprint.json')
 }));
 assert.equal(deep.format,'manufact-seo-html-evidence-v1');
 for(const code of ['evidence:duplicate-dom-id','evidence:unverified-schema-published',
  'evidence:broken-fragment','evidence:unlabelled-form-controls'])
  assert.ok(deep.findings.some(x=>x.code===code),code);
 const deviceClean=JSON.parse(good('viewport-parity',{
  viewports:fixture('industrial.viewports.json'),blueprint:bp
 }));
 assert.equal(deviceClean.format,'manufact-seo-viewport-review-v1');
 assert.deepEqual(deviceClean.findings,[],'three identical device HTML exports have no parity issues');
 const deviceDrift=JSON.parse(good('viewport-parity',{
  viewports:fixture('industrial.mobile-gap.viewports.json'),blueprint:bp
 }));
 assert.ok(deviceDrift.findings.some(x=>x.code==='viewport:h1-missing'&&x.device==='mobile'));
 assert.ok(deviceDrift.findings.some(x=>x.code==='viewport:planned-cta-route-absent'));
 const regSite=fixture('industrial.site.regression.json');
 const diff=JSON.parse(good('compare-site',{before:site,site:regSite,blueprint:bp}));
 assert.equal(diff.format,'manufact-seo-regression-v1');
 assert.ok(diff.seoChanges.some(x=>x.field==='seo.robots'&&x.potentialIndexationRegression));
 const evidencePlan=JSON.parse(good('remediation-plan',{
  site,blueprint:bp,snapshot:htmlSite,
  viewports:fixture('industrial.mobile-gap.viewports.json')
 }));
 assert.ok(evidencePlan.tasks.some(x=>x.sources.some(s=>s.code==='viewport:h1-missing')));
 assert.ok(evidencePlan.sourceReports.deepHtmlIssueCount!==null);
 const regPlan=JSON.parse(good('remediation-plan',{
  site:regSite,before:site,blueprint:bp
 }));
 assert.ok(regPlan.tasks.some(x=>x.sources.some(s=>s.code==='regression:indexation-decreased')));
 const regRelease=JSON.parse(good('release-review',{
  site:regSite,before:site,blueprint:bp
 }));
 assert.ok(regRelease.blockers.some(x=>x.gateId==='new-critical-regressions'));
 const bundle=JSON.parse(good('review-bundle',{
  site,blueprint:bp,snapshot:htmlSite,viewports:fixture('industrial.viewports.json')
 }));
 assert.equal(bundle.format,'manufact-seo-review-bundle-v1');
 assert.equal(bundle.release.automaticReleaseApproval,false);
 assert.equal(bundle.deviceEvidence.findings.length,0);
 assert.ok(bundle.siteAudit.issues.length>0);
 assert.ok(bundle.backlog.tasks.length>0);

 // Handoff-grade integration contract, honest partial coverage and change approvals.
 const fullBundle=JSON.parse(good('review-bundle',{
  site,blueprint:bp,snapshot:htmlSite,viewports:fixture('industrial.viewports.json')
 }));
 assert.equal(fullBundle.contract.site,'manufact-ai-site-v1');
 assert.equal(fullBundle.handoff.readOnly,true);
 assert.equal(fullBundle.capturePlan.summary.pagesToCapture,2);
 assert.equal(fullBundle.capturePlan.summary.httpResponsesActuallyCaptured,0);
 assert.equal(fullBundle.coverage.plannedPagesAbsentFromHtmlExport.length,0);
 assert.equal(fullBundle.coverage.plannedPagesAbsentFromThreeDeviceExport.length,0);
 assert.equal(fullBundle.release.readyToPublish,false);
 assert.match(fullBundle.markdownHandoff,/SEO implementation/);
 assert.ok(fullBundle.nextActions.every(x=>x.automatic===false));
 const snapshotPartial=JSON.parse(fs.readFileSync(fixture('invalid.snapshot.json'),'utf8'));
 delete snapshotPartial.completeness; // no claim of complete-site export
 const partialPath=path.join(tmp,'partial.html.snapshot.json');
 fs.writeFileSync(partialPath,JSON.stringify(snapshotPartial));
 const partial=JSON.parse(good('analyze-html',{snapshot:partialPath}));
 assert.ok(!partial.issues.some(x=>x.code==='html:broken-link'),
  'missing target outside partial export must not be asserted broken');
 assert.ok(partial.issues.some(x=>x.code==='html:target-not-in-snapshot'));
 const partialDevices=JSON.parse(fs.readFileSync(fixture('industrial.viewports.json'),'utf8'));
 partialDevices.pages=partialDevices.pages.slice(0,1);
 const devicesPath=path.join(tmp,'partial.viewports.json');
 fs.writeFileSync(devicesPath,JSON.stringify(partialDevices));
 const unchecked=JSON.parse(good('viewport-parity',{viewports:devicesPath,blueprint:bp}));
 assert.equal(unchecked.completeThreeDevices,false);
 assert.equal(unchecked.plannedPageCount,2);
 assert.equal(unchecked.missingPages.length,1);
 assert.ok(unchecked.findings.some(x=>x.code==='viewport:blueprint-page-unchecked'));
 const ledger={format:'manufact-seo-triage-v1',siteId:cleanPlan.siteId,decisions:[]};
 const task=cleanPlan.tasks.find(x=>x.field&&typeof x.key==='string');
 assert.ok(task,'at least one field proposal available for ledger precondition');
 const decision={taskId:task.taskId,taskKey:task.key,decision:'approve',
  reason:'Reviewed manually for the purpose of this test',
  expectedBefore:task.before,expectedAfter:task.after};
 ledger.decisions=[decision];
 const triageFile=path.join(tmp,'review.decisions.json');
 fs.writeFileSync(triageFile,JSON.stringify(ledger));
 const adjudicated=JSON.parse(good('triage',{site,blueprint:bp,snapshot:htmlSite,decisions:triageFile}));
 assert.equal(adjudicated.summary.approved,1);
 assert.equal(adjudicated.releaseAuthorized,false);
 assert.equal(adjudicated.automaticChanges,0);
 ledger.decisions[0].expectedBefore='stale or superseded field value';
 fs.writeFileSync(triageFile,JSON.stringify(ledger));
 const staleReview=JSON.parse(good('triage',{site,blueprint:bp,snapshot:htmlSite,decisions:triageFile}));
 assert.equal(staleReview.summary.approved,0);
 assert.equal(staleReview.summary.stale,1);
 // Publication-integrity: route-based sitemap evidence, honest completeness, and relative links.
 const PUBLISH=require('../lib/publication-integrity.cjs');
 const comprehensive=JSON.parse(fs.readFileSync(htmlSite,'utf8'));
 comprehensive.sitemapCompleteness='complete';
 const cleanIntegrity=PUBLISH.review(original,comprehensive);
 assert.deepEqual(cleanIntegrity.findings,[]);
 const indexDrift=structuredClone(original);
 indexDrift.pages[1].seo.robots='noindex';
 assert.ok(PUBLISH.review(indexDrift,comprehensive).findings.some(x=>x.code==='publication:sitemap-noindex'));
 const incompleteMap=structuredClone(comprehensive);
 incompleteMap.sitemapPaths=['/'];
 assert.ok(PUBLISH.review(original,incompleteMap).findings.some(x=>x.code==='publication:sitemap-indexable-missing'));
 delete incompleteMap.sitemapCompleteness;
 assert.ok(!PUBLISH.review(original,incompleteMap).findings.some(x=>x.code==='publication:sitemap-indexable-missing'));
 assert.ok(PUBLISH.wildcardRootBlock('User-agent: *\nDisallow: /\n'));
 assert.ok(!PUBLISH.wildcardRootBlock('User-agent: *\nDisallow: /\nAllow: /\n'));
 const integrityCli=JSON.parse(good('publication-integrity',{site,blueprint:bp,snapshot:htmlSite}));
 assert.equal(integrityCli.format,'manufact-seo-publication-integrity-v1');
 const integrityBundle=JSON.parse(good('review-bundle',{site,blueprint:bp,snapshot:htmlSite}));
 assert.equal(integrityBundle.publicationIntegrity.format,'manufact-seo-publication-integrity-v1');
 const brokenMapFile=path.join(tmp,'missing.sitemap.json');
 fs.writeFileSync(brokenMapFile,JSON.stringify(incompleteMap));
 const noMapPlan=JSON.parse(good('remediation-plan',{site,blueprint:bp,snapshot:brokenMapFile}));
 assert.ok(noMapPlan.sourceReports.publicationIntegrityFindingCount!==null);
 const noMapGate=JSON.parse(good('release-review',{site,blueprint:bp,snapshot:brokenMapFile}));
 assert.ok(!noMapGate.blockers.some(x=>x.gateId==='sitemap-indexation-integrity'));
 incompleteMap.sitemapCompleteness='complete';
 fs.writeFileSync(brokenMapFile,JSON.stringify(incompleteMap));
 const absentGate=JSON.parse(good('release-review',{site,blueprint:bp,snapshot:brokenMapFile}));
 assert.ok(absentGate.blockers.some(x=>x.gateId==='sitemap-indexation-integrity'));
 const relativeSnapshot={format:'manufact-seo-html-snapshot-v1',completeness:'complete',pages:[
  {id:'page-root',path:'/',html:'<html><head><title>Root</title></head><body><h1>Root</h1><a href="/help/">Help</a></body></html>'},
  {id:'page-help',path:'/help/',html:'<html><head><title>Help</title></head><body><h1>Help</h1><a href="more/">More</a></body></html>'},
  {id:'page-more',path:'/help/more/',html:'<html><head><title>More</title></head><body><h1>More</h1><a href="../">Help</a></body></html>'}
 ]};
 const relative=JSON.parse(fs.readFileSync(fixture('normal.snapshot.json'),'utf8'));
 relative.pages=relativeSnapshot.pages;
 delete relative.siteId;
 const {snapshotAudit}=require('../lib/analyze.cjs');
 assert.ok(!snapshotAudit(relative).issues.some(x=>x.code==='html:broken-link'));
 const {review:reviewHtml}=require('../lib/html-evidence.cjs');
 assert.ok(!reviewHtml(relative).findings.some(x=>x.code==='evidence:link-target-outside-snapshot'));
 // Ignore inert template/script markup in the baseline audit and honor wrapping labels and image link names.
 const trickyHtml={format:'manufact-seo-html-snapshot-v1',completeness:'complete',pages:[{
  id:'page-demo',path:'/',html:'<html><head><title>Actual page title</title><script>var fake = \'<title>Fake title</title><a href="/phantom/">Link</a>\';</script></head><body><h1>Actual H1</h1><a href="/"><img alt="Go home" src="/image.png"></a><label>Email <input name="email"></label><template><a href="/ghost/">Ghost</a></template></body></html>'
 }]};
 assert.ok(!snapshotAudit(trickyHtml).issues.some(x=>['html:broken-link','html:unlabeled-link'].includes(x.code)));
 assert.equal(require('../lib/parity.cjs').readHead(trickyHtml.pages[0].html).title,'Actual page title');
 assert.equal(require('../lib/html-evidence.cjs').inspect(trickyHtml.pages[0].html).unlabelledControls.length,0);
 // Relative CTA links are real links at all 3 widths. HTML <base> changes resolution.
 const relativeDevices=JSON.parse(fs.readFileSync(fixture('industrial.viewports.json'),'utf8'));
 for(const d of ['desktop','tablet','mobile'])
  relativeDevices.pages[0].captures[d].html=relativeDevices.pages[0].captures[d].html.replace('href="/contact/"','href="contact/"');
 const relativeDeviceResult=require('../lib/viewport-evidence.cjs').review(relativeDevices,plan);
 assert.ok(relativeDeviceResult.pages[0].captures.mobile.links.includes('/contact/'));
 assert.ok(!relativeDeviceResult.findings.some(x=>x.code==='viewport:planned-cta-route-absent'&&x.pageId==='page-home'));
 const baseSnapshot=structuredClone(relative);
 baseSnapshot.pages[1].html=baseSnapshot.pages[1].html.replace('<head>','<head><base href="/">').replace('href="more/"','href="help/more/"');
 assert.ok(!snapshotAudit(baseSnapshot).issues.some(x=>x.code==='html:broken-link'));
 assert.ok(!reviewHtml(baseSnapshot).findings.some(x=>x.code==='evidence:link-target-outside-snapshot'));
 assert.ok(!reviewHtml(trickyHtml).findings.some(x=>x.href==='/ghost/'));
 // First-site capture manifest has exact mounted public routes but never invents results.
 const plannedCapture=JSON.parse(good('capture-plan',{site,blueprint:bp,
  origin:'https://preview.example.test/site/'}));
 assert.equal(plannedCapture.format,'manufact-seo-capture-plan-v1');
 assert.equal(plannedCapture.pages[1].publicUrl,'https://preview.example.test/site/contact/');
 assert.equal(plannedCapture.media.length,0);
 assert.equal(plannedCapture.summary.httpResponsesActuallyCaptured,0);
 assert.ok(plannedCapture.pages.every(p=>p.evidenceState==='not-collected-by-toolkit'));
 // Three independent publication checks from a supplied HTTP transcript.
 const deliveryExample=fixture('industrial.delivery.evidence.json');
 const deliveryAudit=JSON.parse(good('delivery-review',{site,delivery:deliveryExample}));
 assert.equal(deliveryAudit.format,'manufact-seo-delivery-review-v1');
 assert.equal(deliveryAudit.coverage.capturedPages,2);
 assert.equal(deliveryAudit.coverage.sitemapKind,'urlset');
 assert.equal(deliveryAudit.coverage.independentlyVerifiedProvenance,false);
 assert.ok(!deliveryAudit.findings.some(x=>x.severity==='error'));
 // Ordinary tracking query parameters must be recorded as URL drift, not abort the audit.
 const queryDelivery=JSON.parse(fs.readFileSync(deliveryExample,'utf8'));
 queryDelivery.pages[0].requestUrl+='?utm_source=review';
 const queryDeliveryFile=path.join(tmp,'query-delivery.json');
 fs.writeFileSync(queryDeliveryFile,JSON.stringify(queryDelivery));
 const queryReport=JSON.parse(good('delivery-review',{site,delivery:queryDeliveryFile}));
 assert.ok(queryReport.findings.some(x=>x.code==='delivery:request-url-mismatch'));
 const deliveryBroken=JSON.parse(fs.readFileSync(deliveryExample,'utf8'));
 deliveryBroken.pages[0].status=404;
 deliveryBroken.pages[1].headers['X-Robots-Tag']='noindex, nofollow';
 deliveryBroken.sitemap.body=deliveryBroken.sitemap.body.replace(
  '<url><loc>https://cms-example.test/contact/</loc></url>','');
 const deliveryDriftFile=path.join(tmp,'delivery-drift.json');
 fs.writeFileSync(deliveryDriftFile,JSON.stringify(deliveryBroken));
 const driftDelivery=JSON.parse(good('delivery-review',{site,delivery:deliveryDriftFile}));
 for(const kind of ['delivery:non-success-status','delivery:indexability-drift','delivery:sitemap-indexable-absent'])
  assert.ok(driftDelivery.findings.some(x=>x.code===kind),kind);
 const deliveryBacklog=JSON.parse(good('remediation-plan',{site,blueprint:bp,delivery:deliveryDriftFile}));
 assert.ok(deliveryBacklog.sourceReports.httpDeliveryFindingCount>=3);
 const deliveryGate=JSON.parse(good('release-review',{site,blueprint:bp,delivery:deliveryDriftFile}));
 assert.ok(deliveryGate.blockers.some(g=>g.gateId==='captured-delivery-conflict'));
 const deliveryPackage=JSON.parse(good('review-bundle',{site,blueprint:bp,delivery:deliveryDriftFile}));
 const incompleteDelivery=structuredClone(deliveryBroken);
 incompleteDelivery.pages=incompleteDelivery.pages.slice(0,1);
 fs.writeFileSync(deliveryDriftFile,JSON.stringify(incompleteDelivery));
 const missingDelivery=JSON.parse(good('delivery-review',{site,delivery:deliveryDriftFile}));
 assert.ok(missingDelivery.findings.some(x=>x.code==='delivery:page-unchecked'&&x.pageId==='page-contact'));
 assert.equal(deliveryPackage.traceability.summary.suppliedHttpPages,2);
 const conflictingCaptures=JSON.parse(fs.readFileSync(deliveryExample,'utf8'));
 conflictingCaptures.pages[0].html=conflictingCaptures.pages[0].html.replace(
  '<head>','<head><meta name="robots" content="noindex">');
 const conflictingCaptureFile=path.join(tmp,'inconsistent-delivery.json');
 fs.writeFileSync(conflictingCaptureFile,JSON.stringify(conflictingCaptures));
 const consistency=JSON.parse(good('evidence-consistency',{
  site,snapshot:htmlSite,delivery:conflictingCaptureFile}));
 assert.ok(consistency.findings.some(x=>x.code==='consistency:captured-robots-diff'&&x.severity==='error'));
 const inconsistentRelease=JSON.parse(good('release-review',{
  site,blueprint:bp,snapshot:htmlSite,delivery:conflictingCaptureFile}));
 assert.ok(inconsistentRelease.blockers.some(x=>x.gateId==='conflicting-captured-indexation'));
 assert.equal(deliveryPackage.deliveryEvidence.coverage.independentlyVerifiedProvenance,false);
 assert.equal(deliveryPackage.release.coverage.callerSuppliedHttpTranscriptReviewed,true);
 const {sitemapPaths:parseXml}=require('../lib/delivery-evidence.cjs');
 assert.equal(parseXml('<sitemapindex><sitemap><loc>https://x.test/a.xml</loc></sitemap></sitemapindex>').kind,'index');
 assert.equal(parseXml('<urlset><url><loc>https://cms-example.test/</loc></url>').unverified,true,
  'a truncated sitemap may not create missing-page blockers');
 assert.equal(parseXml('<urlset><url><loc>https://cms-example.test/</loc></url>'+
  '<url><loc>https://cms-example.test/contact/</loc></url></urlset>').unverified,false);
 assert.equal(parseXml('<urlset><url><loc>https://cms-example.test/</loc></url>'+
  '<url><loc>https://cms-example.test/contact/</url></urlset>').unverified,true);
 const incompleteXml=structuredClone(deliveryBroken);
 incompleteXml.sitemap.body='<urlset><url><loc>https://cms-example.test/</loc></url>';
 fs.writeFileSync(deliveryDriftFile,JSON.stringify(incompleteXml));
 const untrustedXml=JSON.parse(good('delivery-review',{site,delivery:deliveryDriftFile}));
 assert.ok(!untrustedXml.findings.some(x=>x.code==='delivery:sitemap-indexable-absent'));
 // Third workstream: validate OG asset HTTP status and output URL, never fetch it.
 const capturedMediaSite=structuredClone(original);
 capturedMediaSite.assets.push({id:'asset-og-demo',src:'/assets/og-demo.png',mime:'image/png',
  alt:'Preview of industrial equipment',width:1200,height:630});
 capturedMediaSite.pages[0].seo={title:'',description:'',robots:'index',
  ...(capturedMediaSite.pages[0].seo||{}),ogImage:'asset-og-demo'};
 const capturedMediaSitePath=path.join(tmp,'captured-media-site.json');
 fs.writeFileSync(capturedMediaSitePath,JSON.stringify(capturedMediaSite));
 const capturedMedia={format:'manufact-seo-media-evidence-v1',siteId:plan.siteId,
  origin:'https://cms-example.test/',completeness:'complete',
  resources:[{assetId:'asset-og-demo',url:'https://cms-example.test/assets/og-demo.png',
   status:200,contentType:'image/png',contentLength:85000,width:1200,height:630}]};
 const capturedMediaPath=path.join(tmp,'captured-media.json');
 fs.writeFileSync(capturedMediaPath,JSON.stringify(capturedMedia));
 const mediaClean=JSON.parse(good('media-review',{site:capturedMediaSitePath,media:capturedMediaPath}));
 assert.equal(mediaClean.coverage.referencedOgImageAssets,1);
 assert.deepEqual(mediaClean.findings,[]);
 capturedMedia.resources[0].status=404;
 fs.writeFileSync(capturedMediaPath,JSON.stringify(capturedMedia));
 const mediaDamaged=JSON.parse(good('media-review',{site:capturedMediaSitePath,media:capturedMediaPath}));
 assert.ok(mediaDamaged.findings.some(x=>x.code==='media:resource-status-error'));
 const damagedGate=JSON.parse(good('release-review',{site:capturedMediaSitePath,blueprint:bp,media:capturedMediaPath}));
 assert.ok(damagedGate.blockers.some(x=>x.gateId==='captured-og-media-conflict'));
 const damagedPackage=JSON.parse(good('review-bundle',{site:capturedMediaSitePath,blueprint:bp,media:capturedMediaPath}));
 assert.equal(damagedPackage.mediaEvidence.coverage.capturedKnownResources,1);
 assert.equal(damagedPackage.traceability.pages[0].mediaEvidence.ogImageAssetId,'asset-og-demo');
  // The actual publisher picks fallback OG images from legacy fields and Design Graph.
 const SOCIAL=require('../lib/publisher-media.cjs');
 const mediaFallbackSite=JSON.parse(fs.readFileSync(fixture('industrial.social-fallback.site.json'),'utf8'));
 const mediaFallbackEvidence=fixture('industrial.social-fallback.media.json');
 const mediaFallbackHtml=fixture('industrial.social-fallback.html.snapshot.json');
 const fallbackSelect=SOCIAL.select(mediaFallbackSite,mediaFallbackSite.pages[0]);
 assert.equal(fallbackSelect.asset.id,'asset-social-demo');
 const realFallbackAudit=JSON.parse(good('media-review',{
  site:fixture('industrial.social-fallback.site.json'),media:mediaFallbackEvidence,
  snapshot:mediaFallbackHtml}));
 assert.equal(realFallbackAudit.coverage.referencedOgImageAssets,1);
 assert.ok(!realFallbackAudit.findings.some(x=>x.severity==='error'));
 const realFallbackPlan=JSON.parse(good('capture-plan',{
  site:fixture('industrial.social-fallback.site.json'),blueprint:bp,
  origin:'https://cms-example.test/'}));
 assert.deepEqual(realFallbackPlan.media[0].ogReferencedBy,['page-home']);
 assert.equal(fallbackSelect.source,'section-content.media');
 const socialEvidence=JSON.parse(fs.readFileSync(mediaFallbackEvidence,'utf8'));
 socialEvidence.resources[0].status=404;
 const fallbackBrokenPath=path.join(tmp,'fallback-broken.json');
 fs.writeFileSync(fallbackBrokenPath,JSON.stringify(socialEvidence));
 const fallbackResult=JSON.parse(good('media-review',{
  site:fixture('industrial.social-fallback.site.json'),media:fallbackBrokenPath}));
 assert.ok(fallbackResult.findings.some(x=>x.code==='media:resource-status-error'&&x.severity==='error'));
 const fallbackRelease=JSON.parse(good('release-review',{
  site:fixture('industrial.social-fallback.site.json'),blueprint:bp,media:fallbackBrokenPath}));
 assert.ok(fallbackRelease.blockers.some(x=>x.gateId==='captured-og-media-conflict'));
 const mediaGraphSite=structuredClone(capturedMediaSite);
 delete mediaGraphSite.pages[0].seo.ogImage;
 mediaGraphSite.pages[0].sections[0].designGraph={nodes:[{
  id:'demo-container',type:'container',children:[{id:'demo-image',type:'image',assetId:'asset-og-demo'}]
 }]};
 assert.equal(SOCIAL.select(mediaGraphSite,mediaGraphSite.pages[0]).source,'section-designGraph-image');
 const fallbackCapture=require('../lib/capture-plan.cjs').build(mediaFallbackSite,plan);
 assert.equal(fallbackCapture.media[0].ogReferencedBy[0],'page-home');
 // Social URLs in supplied captured markup cannot silently use javascript:, http: or empty content.
 const forgedMediaHtml={format:'manufact-seo-html-snapshot-v1',siteId:plan.siteId,
  pages:[{id:'page-home',path:'/',
   html:'<html><head><meta property="og:image" content="javascript:alert(1)">'+
    '<meta name="twitter:image" content="http://example.test/cover.png"></head><body></body></html>'}]};
 const blockedSocial=require('../lib/media-delivery.cjs').review(capturedMediaSite,capturedMedia,forgedMediaHtml);
 assert.ok(blockedSocial.findings.some(x=>x.code==='media:invalid-og-image-url'&&x.severity==='error'));
 assert.ok(blockedSocial.findings.some(x=>x.code==='media:invalid-twitter-image-url'&&x.severity==='error'));
 const misplacedSocialHtml=structuredClone(forgedMediaHtml);
 misplacedSocialHtml.pages[0].html='<html><head>'+
  '<meta property="og:image" content="https://cms-example.test/assets/og-demo.png">'+
  '<meta name="twitter:image" content="https://cms-example.test/assets/other.png"></head></html>';
 const socialDrift=require('../lib/media-delivery.cjs').review(capturedMediaSite,capturedMedia,misplacedSocialHtml);
 assert.ok(socialDrift.findings.some(x=>x.code==='media:twitter-image-drift'));
 // Non-OG asset failures must not become misleading social-card release blockers.
 const unusedMediaSite=structuredClone(capturedMediaSite);
 unusedMediaSite.assets.push({id:'asset-unused',src:'/assets/unused.jpg',mime:'image/jpeg',alt:''});
 const unusedEvidence=structuredClone(capturedMedia);
 unusedEvidence.resources.push({assetId:'asset-unused',
  url:'https://cms-example.test/assets/unused.jpg',status:404,contentType:'image/jpeg'});
 assert.ok(require('../lib/media-delivery.cjs').review(unusedMediaSite,unusedEvidence).findings
  .some(x=>x.code==='media:resource-status-error'&&x.assetId==='asset-unused'&&x.severity==='warning'));
 const ogDriftHtml={format:'manufact-seo-html-snapshot-v1',siteId:plan.siteId,
  pages:[{id:'page-home',path:'/',html:'<html><head><meta property="og:image" content="https://wrong.test/other.png"></head></html>'}]};
 assert.ok(require('../lib/media-delivery.cjs').review(capturedMediaSite,capturedMedia,ogDriftHtml).findings
  .some(x=>x.code==='media:og-html-url-drift'));
 // Per-page/section acceptance map and decision-aware integration envelope.
 const traceable=JSON.parse(good('traceability',{site,blueprint:bp,snapshot:htmlSite,
  viewports:fixture('industrial.viewports.json')}));
 assert.equal(traceable.format,'manufact-seo-traceability-v1');
 assert.equal(traceable.summary.implementedPages,2);
 assert.equal(traceable.summary.allThreeDeviceMarkupPages,2);
 assert.ok(traceable.summary.pagesWithBacklogTasks>0);
 assert.ok(traceable.pages.some(x=>x.taskIds.length>0));
 assert.ok(traceable.pages[0].sections.some(x=>x.cta&&x.cta.authoredRouteEvidence==='matching'));
 assert.ok(traceable.pages.every(x=>x.deviceEvidence.screenshotOrVisualVerified===false));
 const humanMap=good('traceability-md',{site,blueprint:bp,snapshot:htmlSite});
 assert.match(humanMap,/Human acceptance required/);
 // Restore valid decision preconditions after exercising the stale-ledger case above.
 ledger.decisions[0].expectedBefore=task.before;
 fs.writeFileSync(triageFile,JSON.stringify(ledger));
 const reviewedBundle=JSON.parse(good('review-bundle',{site,blueprint:bp,snapshot:htmlSite,
  decisions:triageFile}));
 assert.equal(reviewedBundle.decisions.releaseAuthorized,false);
 assert.ok(reviewedBundle.traceability.pages[0].tasks.length>0);
 assert.match(reviewedBundle.markdownHandoff,/SEO Blueprint to Site v1 implementation map/);
 assert.match(reviewedBundle.markdownHandoff,/Human decisions recorded: 1/);
 assert.equal(reviewedBundle.traceability.summary.decisionsRecorded,1);
 assert.ok(reviewedBundle.traceability.pages.flatMap(p=>p.tasks).some(x=>x.decision==='approved'));
 assert.equal(reviewedBundle.release.readyToPublish,false);
 assert.ok(reviewedBundle.nextActions.every(x=>x.automatic===false));
 const execution=JSON.parse(good('execution-plan',{site,blueprint:bp,snapshot:htmlSite,decisions:triageFile}));
 assert.equal(execution.format,'manufact-seo-execution-plan-v1');
 assert.equal(execution.summary.humanDecisionsRecorded,1);
 assert.ok(execution.items.some(t=>t.decision==='approved'));
 assert.ok(execution.items.every(t=>t.taskStillOpen&&t.automatic===false));
 assert.equal(execution.summary.releaseAuthorized,false);
 assert.equal(execution.summary.tasksAutomaticallyApplied,0);
 const executionText=good('execution-plan-md',{site,blueprint:bp,decisions:triageFile,snapshot:htmlSite});
 assert.match(executionText,/SEO implementation execution plan/);
 assert.ok(reviewedBundle.markdownHandoff.includes('## Next review actions'));
 assert.equal(reviewedBundle.executionPlan.summary.humanDecisionsRecorded,1);
 const cmsPacket=JSON.parse(good('cms-change-packet',{site,blueprint:bp,snapshot:htmlSite,decisions:triageFile}));
 assert.equal(cmsPacket.format,'manufact-seo-cms-change-packet-v1');
 assert.equal(cmsPacket.automaticApplication,false);
 assert.equal(cmsPacket.summary.actualWrites,0);
 assert.ok(cmsPacket.operations.some(x=>x.taskId===task.taskId&&x.application==='existing-cms-manual-field-review'));
 assert.equal(reviewedBundle.cmsChangePacket.summary.eligibleForManualReview,cmsPacket.summary.eligibleForManualReview);
 assert.match(reviewedBundle.markdownHandoff,/Approved SEO fields for human CMS review/);
 assert.match(good('cms-change-packet-md',{site,blueprint:bp,snapshot:htmlSite,decisions:triageFile}),/Mandatory lead checks/);
 const workflowPlan=require('../lib/execution-plan.cjs');
 const syntheticBacklog={format:'manufact-seo-remediation-v1',readOnly:true,siteId:plan.siteId,
  tasks:[
   {taskId:'parent',key:'parent',priority:'P1',phase:'verify-facts',owner:'site-owner',dependsOn:[],sources:[],instruction:'Verify facts'},
   {taskId:'child',key:'child',priority:'P1',phase:'developer-work',owner:'lead-developer',dependsOn:['parent'],sources:[],instruction:'Implement'},
   {taskId:'ignored',key:'ignored',priority:'P3',phase:'validation',owner:'editor',dependsOn:[],sources:[],instruction:'No action'}
  ]};
 const synthDecisions={format:'manufact-seo-triage-result-v1',readOnly:true,releaseAuthorized:false,
  siteId:plan.siteId,approved:[{taskId:'parent',reason:'approved'},{taskId:'child',reason:'approved'}],
  rejected:[{taskId:'ignored',reason:'irrelevant'}],deferred:[],stale:[],
  summary:{approved:2,rejected:1,deferred:0,stale:0}};
 const phases=workflowPlan.compile(syntheticBacklog,synthDecisions);
 assert.equal(phases.items.find(x=>x.taskId==='child').status,'blocked-on-unresolved-dependency');
 assert.equal(phases.items.find(x=>x.taskId==='ignored').status,'excluded-by-human-decision');
 assert.equal(phases.items.find(x=>x.taskId==='parent').status,'approved-for-manual-work');
 // Approval workflow: real revision fingerprints, three distinct prototypes and seven gates.
 const approvalDraft=JSON.parse(good('acceptance-template',{site,blueprint:bp}));
 assert.equal(approvalDraft.format,'manufact-seo-acceptance-v1');
 assert.equal(approvalDraft.prototype.images.length,3);
 assert.equal(approvalDraft.checks.length,7);
 assert.match(approvalDraft.blueprintSha256,/^[a-f0-9]{64}$/);
 const approvalPath=path.join(tmp,'approval-ledger.json');
 fs.writeFileSync(approvalPath,JSON.stringify(approvalDraft));
 const approvalPending=JSON.parse(good('acceptance-review',{site,blueprint:bp,acceptance:approvalPath}));
 assert.equal(approvalPending.summary.allSuppliedAssertionsComplete,false);
 assert.equal(approvalPending.readyToPublish,false);
 const approvalSigned=structuredClone(approvalDraft);
 approvalSigned.prototype={revision:'prototype-revision-r1',
  images:['desktop','tablet','mobile'].map((device,i)=>({
   device,artifact:'example-'+device+'.png',sha256:['a','b','c'][i].repeat(64)})),
  approvedBy:'Sample reviewer',approvedAt:'2026-10-28T11:00:00Z',
  evidenceReference:'fictional-approval-fixture'};
 for(const check of approvalSigned.checks){
  check.status='approved';check.reviewedBy='Sample reviewer';
  check.reviewedAt='2026-10-28T12:00:00Z';
  check.evidenceReference='fictional-evidence-'+check.id;check.note='Synthetic test';
 }
 fs.writeFileSync(approvalPath,JSON.stringify(approvalSigned));
 const approvalResult=JSON.parse(good('acceptance-review',{site,blueprint:bp,acceptance:approvalPath}));
 assert.equal(approvalResult.summary.allSuppliedAssertionsComplete,true);
 assert.equal(approvalResult.summary.authenticatedApprovals,0);
 assert.equal(approvalResult.readyToPublish,false);
 const releaseSigned=JSON.parse(good('release-review',{site,blueprint:bp,acceptance:approvalPath}));
 assert.equal(releaseSigned.readyToPublish,false);
 assert.ok(releaseSigned.manualChecks.every(x=>x.suppliedAttestationStatus==='approved'&&!x.sourceAuthenticated));
 const integrationApproved=JSON.parse(good('review-bundle',{
  site,blueprint:bp,snapshot:htmlSite,acceptance:approvalPath,before:site}));
 assert.equal(integrationApproved.acceptanceReview.summary.allSuppliedAssertionsComplete,true);
 assert.equal(integrationApproved.leadDossier.summary.historicalProvenFixes,0);
 assert.equal(integrationApproved.leadDossier.summary.approvedPrototypeAssertion,true);
 assert.equal(integrationApproved.leadDossier.summary.actualCmsWrites,0);
 assert.match(integrationApproved.markdownHandoff,/SEO release handoff — lead overview/);
 assert.match(good('review-bundle-md',{site,blueprint:bp,acceptance:approvalPath}),/Required handoff sequence/);
 assert.equal(integrationApproved.taskProgress.summary.noLongerPresent,0);
 assert.equal(integrationApproved.coverage.prototypeApprovalLedgerProvided,true);
 const sameRevisionProgress=JSON.parse(good('task-progress',{before:site,site,blueprint:bp}));
 assert.equal(sameRevisionProgress.summary.noLongerPresent,0);
 assert.equal(sameRevisionProgress.summary.introduced,0);
 assert.equal(sameRevisionProgress.summary.provenCompletedTasks,0);
 const progressSite=structuredClone(original);
 progressSite.pages[0].seo={title:plan.pages[0].seo.title,description:'',robots:'index'};
 const progressSitePath=path.join(tmp,'seo-field-edited.json');
 fs.writeFileSync(progressSitePath,JSON.stringify(progressSite));
 const closedCandidate=JSON.parse(good('task-progress',{
  before:site,site:progressSitePath,blueprint:bp}));
 assert.ok(closedCandidate.noLongerPresent.some(x=>x.field==='seo.title'&&x.closureCandidate));
 assert.equal(closedCandidate.summary.provenCompletedTasks,0);
 const staleApproval=JSON.parse(good('acceptance-review',{
  site:progressSitePath,blueprint:bp,acceptance:approvalPath}));
 assert.ok(staleApproval.blockers.includes('site-revision-mismatch'));
 const staleApprovalRelease=JSON.parse(good('release-review',{
  site:progressSitePath,blueprint:bp,acceptance:approvalPath}));
 assert.ok(staleApprovalRelease.blockers.some(x=>x.gateId==='acceptance-revision-stale'));
 const denialLedger=structuredClone(approvalSigned);
 denialLedger.checks[0].status='rejected';
 fs.writeFileSync(approvalPath,JSON.stringify(denialLedger));
 const deniedRelease=JSON.parse(good('release-review',{site,blueprint:bp,acceptance:approvalPath}));
 assert.ok(deniedRelease.blockers.some(x=>x.gateId==='explicit-acceptance-rejection'));
 denialLedger.checks[0].status='approved';denialLedger.checks[0].evidenceReference='';
 fs.writeFileSync(approvalPath,JSON.stringify(denialLedger));
 const incompleteSignoff=JSON.parse(good('acceptance-review',{site,blueprint:bp,acceptance:approvalPath}));
 assert.equal(incompleteSignoff.checks[0].status,'incomplete-attestation');
 // Public-route migration: exact Site v1 301 mappings are required after a slug change.
 const movedSite=structuredClone(original);
 movedSite.pages.find(p=>p.id==='page-contact').path='/team/';
 for(const page of movedSite.pages)for(const section of page.sections)
  for(const element of [...section.elements,...(section.items||[])])
   if(element.values?.['behavior.href']==='/contact/')element.values['behavior.href']='/team/';
 const movedPath=path.join(tmp,'site-moved-no-alias.json');
 fs.writeFileSync(movedPath,JSON.stringify(movedSite));
 const movedReport=JSON.parse(good('route-migration',{before:site,site:movedPath,blueprint:bp}));
 assert.equal(movedReport.summary.missingOrWrongAliases,1);
 assert.ok(movedReport.findings.some(x=>x.code==='migration:renamed-route-without-matching-301'));
 const movedRelease=JSON.parse(good('release-review',{before:site,site:movedPath,blueprint:bp}));
 assert.ok(movedRelease.blockers.some(x=>x.gateId==='unprotected-route-migration'));
 movedSite.redirects=[{from:'/contact/',to:'/team/'}];
 const aliasPath=path.join(tmp,'site-moved-with-301.json');
 fs.writeFileSync(aliasPath,JSON.stringify(movedSite));
 const mapped=JSON.parse(good('route-migration',{before:site,site:aliasPath,blueprint:bp}));
 assert.equal(mapped.summary.correctMappedAliases,1);
 assert.equal(mapped.summary.missingOrWrongAliases,0);
 const routeCapture=JSON.parse(good('capture-plan',{
  before:site,site:aliasPath,blueprint:bp,origin:'https://site.example.test/subsite/'}));
 assert.ok(routeCapture.redirectProbes.some(x=>x.expectedHttpStatus===301&&
  x.requestUrl==='https://site.example.test/subsite/contact/'&&
  x.expectedLocationUrl==='https://site.example.test/subsite/team/'));
 assert.equal(routeCapture.summary.httpResponsesActuallyCaptured,0);
 const migrationBundle=JSON.parse(good('review-bundle',{before:site,site:aliasPath,blueprint:bp}));
 assert.equal(migrationBundle.routeMigration.summary.correctMappedAliases,1);
 // Caller-supplied 301 evidence must agree with declared aliases and public mount.
 const goodMovedDelivery=JSON.parse(fs.readFileSync(deliveryExample,'utf8'));
 goodMovedDelivery.pages[1].path='/team/';
 goodMovedDelivery.pages[1].requestUrl='https://cms-example.test/team/';
 goodMovedDelivery.pages[1].responseUrl='https://cms-example.test/team/';
 goodMovedDelivery.sitemap.body=goodMovedDelivery.sitemap.body.replaceAll('/contact/','/team/');
 goodMovedDelivery.redirects=[{from:'/contact/',requestUrl:'https://cms-example.test/contact/',
  status:301,location:'https://cms-example.test/team/'}];
 const redirectEvidencePath=path.join(tmp,'redirect-delivery.json');
 fs.writeFileSync(redirectEvidencePath,JSON.stringify(goodMovedDelivery));
 const redirectDelivery=JSON.parse(good('delivery-review',{site:aliasPath,delivery:redirectEvidencePath}));
 assert.equal(redirectDelivery.coverage.redirectResponsesCaptured,1);
 assert.ok(!redirectDelivery.findings.some(x=>x.code.startsWith('delivery:redirect-')&&x.severity==='error'));
 goodMovedDelivery.redirects[0].status=302;
 goodMovedDelivery.redirects[0].location='https://cms-example.test/unexpected/';
 fs.writeFileSync(redirectEvidencePath,JSON.stringify(goodMovedDelivery));
 const wrongRedirect=JSON.parse(good('delivery-review',{site:aliasPath,delivery:redirectEvidencePath}));
 assert.ok(wrongRedirect.findings.some(x=>x.code==='delivery:redirect-status-drift'));
 assert.ok(wrongRedirect.findings.some(x=>x.code==='delivery:redirect-location-drift'));
 const wrongRedirectRelease=JSON.parse(good('release-review',{
  before:site,site:aliasPath,blueprint:bp,delivery:redirectEvidencePath}));
 assert.ok(wrongRedirectRelease.blockers.some(x=>x.gateId==='captured-delivery-conflict'));

 // An approved field proposal is safe to model on a clone but never applied to CMS.
 const impact=JSON.parse(good('change-impact',{site,blueprint:bp,snapshot:htmlSite,decisions:triageFile}));
 assert.equal(impact.format,'manufact-seo-change-impact-v1');
 assert.equal(impact.summary.actualCmsWrites,0);
 assert.equal(impact.hypotheticalSiteIncluded,false);
 assert.equal(impact.readyToPublish,false);
 assert.ok(impact.operations.some(x=>x.taskId===task.taskId&&x.simulationStatus==='applied-to-temporary-clone'));
 assert.equal(impact.summary.hypotheticalValidSiteV1,true);
 const reviewedImpact=JSON.parse(good('review-bundle',{
  site,blueprint:bp,snapshot:htmlSite,decisions:triageFile}));
 assert.equal(reviewedImpact.changeImpact.summary.actualCmsWrites,0);
 assert.ok(reviewedImpact.changeImpact.operations.length>0);
 const noDecisionImpact=JSON.parse(good('change-impact',{site,blueprint:bp}));
 assert.equal(noDecisionImpact.summary.approvedFieldOperationsSimulated,0);
 assert.equal(noDecisionImpact.status,'no-approved-unblocked-operations');
 const unsupported=command('review-bundle',{site,blueprint:bp,unknown:'invalid'});
 assert.notEqual(unsupported.status,0);
 const {inspect:inspectEvidence}=require('../lib/html-evidence.cjs');
 const nested=inspect('<html><body><script type="application/ld+json">'+JSON.stringify({
  '@context':'https://schema.org','@type':'Article',author:{'@type':'Person'}
 })+'</script></body></html>');
 assert.deepEqual(nested.structuredDataTypes,['Article','Person']);
 assert.deepEqual(nested.rootStructuredDataTypes,['Article']);
 const nestedPage={format:'manufact-seo-html-snapshot-v1',siteId:'site-industrial-demo',
  pages:[{id:'page-home',path:'/',html:'<html><head></head><body><main><script type="application/ld+json">'+
   JSON.stringify({'@context':'https://schema.org','@type':'Article',
    author:{'@type':'Person',name:'Editorial team'}})+
   '</script></main></body></html>'}]};
 const nestedReview=require('../lib/html-evidence.cjs').review(nestedPage,plan);
 assert.ok(!nestedReview.findings.some(x=>x.code==='evidence:unplanned-schema-type'&&x.schemaType==='Person'));

 const tampered=JSON.parse(fs.readFileSync(fixture('community.brief.json'),'utf8'));
 tampered.pages[0].sections[0].media={purpose:'informative',alt:'',why:'Missing'};
 const file=path.join(tmp,'tampered.json');fs.writeFileSync(file,JSON.stringify(tampered));
 const rejected=command('compile',{brief:file});
 assert.notEqual(rejected.status,0,'invalid accessibility alt must fail');
 assert.match(rejected.stderr,/informative image requires alt intent/);
 process.stdout.write('PASS: 2 briefs/plans, SEO content and blueprint review, evidence-backed handoff, Site v1 core inspection, clean/defective HTML, invalid input rejection.\n');
 process.stdout.write('Audit issues: '+audit.issues.length+'; supported SEO proposals: '+handoff.supportedChanges.length+'; invalid HTML findings: '+bad.issues.length+'.\n');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
