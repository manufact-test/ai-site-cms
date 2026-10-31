'use strict';
/* Real Node offline rendered SEO integration smoke. Synthetic customer sources only. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const CRAWL=require('../lib/crawl-policy.cjs');
const QA=require('../lib/seo-rendered-content-audit.cjs');
const SCHEMA=require('../lib/seo-structured-data-audit.cjs');
const LINKS=require('../lib/seo-rendered-link-semantics.cjs');
const COLLISIONS=require('../lib/seo-published-content-collision.cjs');
const COVERAGE=require('../lib/seo-first-client-coverage.cjs');
const HTML=require('../lib/html-evidence.cjs');
const FRAGMENTS=require('../lib/seo-rendered-fragment-audit.cjs');
const VIEW=require('../lib/seo-rendered-content-view.cjs');
const WORK=require('../lib/seo-operator-workspace.cjs');
const PACKET=require('../lib/seo-private-lead-integrity.cjs');
const CLI=require('../bin/review-rendered-content.cjs');
const WCLI=require('../bin/build-seo-operator-workspace.cjs');
const json=x=>JSON.stringify(x,null,2)+'\n';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const bp=BP.checkBlueprint(JSON.parse(fs.readFileSync(
 path.join(__dirname,'../fixtures/industrial.blueprint.json'),'utf8')));
const site={format:'manufact-ai-site-v1',schemaVersion:1,siteId:bp.siteId,
 pages:bp.pages.map(p=>({id:p.id,path:p.path,seo:{...p.seo},sections:[]})),redirects:[]};
const base='https://example.org/custom/';
const url=p=>base+p.slice(1);
const schema='<script type="application/ld+json">'+JSON.stringify({
 '@context':'https://schema.org','@type':'Organization',name:'NEVER-REPEAT-CUSTOMER-FACT'
})+'</script>';
function body(p){
 const heads=p.sections.map(s=>'<h'+s.level+'>'+s.heading+'</h'+s.level+'>').join('');
 const links=[...p.links.map(l=>l.toPath),...p.sections.filter(s=>s.cta)
  .map(s=>bp.pages.find(t=>t.id===s.cta.toPageId).path)];
 return '<html><head><title>Private content '+p.id+'</title><meta name="description" content="Synthetic snippet '+p.id+'"><link rel="canonical" href="'+
  url(p.path)+'"><meta name="robots" content="index,follow">'+
  (p.path==='/'?schema:'')+'</head><body><main>'+heads+
  links.map(l=>'<a href="'+url(l)+'">Go</a>').join('')+'</main></body></html>';
}
function http(){
 return {format:'manufact-seo-delivery-evidence-v1',siteId:bp.siteId,origin:base,
  capturedAt:'2026-10-30T18:00:00Z',
  pages:bp.pages.map(p=>({id:p.id,path:p.path,requestUrl:url(p.path),
   responseUrl:url(p.path),status:200,headers:{'content-type':'text/html'},
   html:body(p)}))};
}
function dom(){
 return {format:'manufact-seo-viewport-evidence-v1',siteId:bp.siteId,
  pages:bp.pages.map(p=>({id:p.id,path:p.path,captures:Object.fromEntries(
   ['desktop','tablet','mobile'].map(device=>[device,{method:'rendered-dom',html:body(p)}]))}))};
}
const evidence=http(),captures=dom();
const input=(h=evidence,v=captures)=>({blueprint:bp,blueprintRawSha256:hash(json(bp)),
 site,siteRawSha256:hash(json(site)),capture:h,captureRawSha256:hash(json(h)),
 viewports:v,viewportsRawSha256:hash(json(v)),expectedBase:base});
const clean=QA.analyze(input());
assert.equal(clean.summary.fullyComparedPages,bp.pages.length);
assert.equal(clean.summary.inspectedDevicePairs,6);
assert.equal(clean.summary.P0,0);
assert.equal(clean.summary.P1,0);
assert.equal(clean.summary.P2,0);
assert.equal(clean.summary.schemaRuntimeObservedPairs,6);
assert.equal(clean.summary.linkSemanticObservedPairs,6);
assert.equal(clean.summary.linkRestrictedRoutePairs,0);
assert.equal(clean.summary.fragmentMissingTotal,0);
assert.equal(clean.summary.fragmentObservedPairs,6);
assert.equal(clean.summary.schemaClaimChangedPairs,0);
assert.equal(clean.summary.publishedGraphObservedScopes,4);
assert.equal(clean.summary.publishedGraphStrongOrphans,0);
assert.equal(clean.summary.publishedGraphStrongUnreachable,0);
assert.equal(clean.summary.publishedDuplicateMetadataPairs,0);
assert.equal(clean.summary.publishedDuplicateMainPairs,0);
assert.equal(clean.summary.publishedCollisionComparablePairs,1);
const duplicateMeta=h=>h.replace(/<title>[^<]*<\/title>/,'<title>Shared client private SEO title</title>')
 .replace(/<meta name="description" content="[^"]*">/,
  '<meta name="description" content="Shared client private meta description">');
const duplicateHttp=http(),duplicateDom=dom();
for(const row of duplicateHttp.pages)row.html=duplicateMeta(row.html);
for(const row of duplicateDom.pages)for(const d of ['desktop','tablet','mobile'])
 row.captures[d].html=duplicateMeta(row.captures[d].html);
const repeatedMetadata=QA.analyze(input(duplicateHttp,duplicateDom));
assert.equal(repeatedMetadata.summary.publishedDuplicateMetadataPairs,1);
assert(repeatedMetadata.findings.some(f=>f.code==='rendered:published-duplicate-metadata-confirmed'&&
 f.priority==='P1'&&f.toPageId));
const privateMain='Distinct route content not actually published. '.repeat(12);
const duplicateMain=h=>h.replace(/<main>[\s\S]*?<\/main>/,
 '<main><h1>Private repeated content</h1><p>'+privateMain+'</p></main>');
const mainHttp=http(),mainDom=dom();
for(const row of mainHttp.pages)row.html=duplicateMain(row.html);
for(const row of mainDom.pages)for(const d of ['desktop','tablet','mobile'])
 row.captures[d].html=duplicateMain(row.captures[d].html);
const repeatedMain=QA.analyze(input(mainHttp,mainDom));
assert.equal(repeatedMain.summary.publishedDuplicateMainPairs,1);
assert(repeatedMain.findings.some(f=>f.code==='rendered:published-duplicate-main-confirmed'&&
 f.priority==='P1'));
assert(!JSON.stringify(repeatedMain).includes(privateMain));
assert(!VIEW.render(repeatedMain).html.includes(privateMain));
const mobileDuplicate=dom();
for(const row of mobileDuplicate.pages)row.captures.mobile.html=duplicateMeta(row.captures.mobile.html);
const runtimeCollision=QA.analyze(input(evidence,mobileDuplicate));
assert.equal(runtimeCollision.summary.publishedRuntimeCollisionSignals,1);
assert(runtimeCollision.findings.some(f=>f.code==='rendered:published-duplicate-runtime-drift'&&
 f.priority==='P2'));
const partialMeta=dom();partialMeta.pages.pop();
const incompleteDuplicate=QA.analyze(input(duplicateHttp,partialMeta));
assert.equal(incompleteDuplicate.summary.publishedDuplicateMetadataPairs,0);
assert(incompleteDuplicate.findings.some(f=>f.code==='rendered:published-duplicate-metadata-candidate'&&
 f.priority==='P2'));
const untrustedScope=COLLISIONS.review({pages:bp.pages,origin:base,scopes:{
 http:new Map(duplicateHttp.pages.map(p=>[p.id,p])),
 desktop:new Map(),tablet:new Map(),mobile:new Map()}});
assert.equal(untrustedScope.counts.metadata,0);
assert(untrustedScope.findings.some(f=>f.code==='published-duplicate-metadata-candidate'));
assert(!JSON.stringify(untrustedScope).includes('Shared client private SEO title'));
const xRobotsBlocked=structuredClone(duplicateHttp.pages);
xRobotsBlocked[1].headers['X-Robots-Tag']='googlebot: noindex';
const headerUnknown=COLLISIONS.review({pages:bp.pages,origin:base,scopes:{
 http:new Map(xRobotsBlocked.map(p=>[p.id,p])),desktop:new Map(),
 tablet:new Map(),mobile:new Map()}});
assert.equal(headerUnknown.observedRoutes.http,1);
assert.equal(headerUnknown.counts.metadata,0,
 'HTTP noindex must not corroborate an indexable canonical duplicate');
xRobotsBlocked[1].headers['X-Robots-Tag']='none';
assert.equal(COLLISIONS.review({pages:bp.pages,origin:base,scopes:{
 http:new Map(xRobotsBlocked.map(p=>[p.id,p])),desktop:new Map(),
 tablet:new Map(),mobile:new Map()}}).observedRoutes.http,1,
 'X-Robots-Tag none also excludes a page from strong indexable collision claims');
const clusterPages=Array.from({length:6},(_,i)=>({id:'page-cluster-'+i,
 path:'/cluster-'+i+'/',seo:{robots:'index',canonicalPath:'/cluster-'+i+'/'}}));
const sharedCluster=new Map(clusterPages.map(p=>[p.id,{html:'<html><head><title>Shared private title</title>'+
 '<meta name="description" content="Shared private description">'+
 '<link rel="canonical" href="'+url(p.path)+'"></head><body><main><h1>'+p.id+'</h1></main></body></html>'}]));
const cluster=COLLISIONS.review({pages:clusterPages,origin:base,
 scopes:{http:sharedCluster,desktop:sharedCluster,tablet:sharedCluster,mobile:sharedCluster}});
assert.equal(cluster.counts.metadata,15,
 'all colliding approved route pairs contribute to the numeric summary');
assert(cluster.findings.length<=5,
 'a shared fallback title across six routes must not produce fifteen redundant manual tickets');
assert.equal(new Set(cluster.findings.flatMap(f=>[f.pageId,f.toPageId])).size,6,
 'representative findings still implicate every canonical route');
const stripContact=h=>h.replaceAll('<a href="'+url('/contact/')+'">Go</a>','');
const orphanHttp=http(),orphanDom=dom();
orphanHttp.pages[0].html=stripContact(orphanHttp.pages[0].html);
for(const d of ['desktop','tablet','mobile'])
 orphanDom.pages[0].captures[d].html=stripContact(orphanDom.pages[0].captures[d].html);
const orphan=QA.analyze(input(orphanHttp,orphanDom));
assert.equal(orphan.summary.publishedGraphStrongOrphans,1);
assert(orphan.findings.some(f=>f.code==='rendered:published-indexable-page-orphaned'&&
 f.pageId==='page-contact'&&f.priority==='P1'));
assert(!JSON.stringify(orphan).includes('outside.example'));
const nofollowHttp=http(),nofollowDom=dom();
const restrict=h=>h.replaceAll('<a href="'+url('/contact/')+'">',
 '<a rel="nofollow" href="'+url('/contact/')+'">');
nofollowHttp.pages[0].html=restrict(nofollowHttp.pages[0].html);
for(const d of ['desktop','tablet','mobile'])
 nofollowDom.pages[0].captures[d].html=restrict(nofollowDom.pages[0].captures[d].html);
assert.equal(QA.analyze(input(nofollowHttp,nofollowDom)).summary.publishedGraphStrongOrphans,1,
 'nofollow-only inbound route is not counted as a normal crawlable graph edge');
const protocolHttp=http(),protocolDom=dom();
const protocol=h=>h.replaceAll('<a href="'+url('/contact/')+'">',
 '<a href="//example.org/custom/contact/">');
protocolHttp.pages[0].html=protocol(protocolHttp.pages[0].html);
for(const d of ['desktop','tablet','mobile'])
 protocolDom.pages[0].captures[d].html=protocol(protocolDom.pages[0].captures[d].html);
assert.equal(QA.analyze(input(protocolHttp,protocolDom)).summary.publishedGraphStrongOrphans,0,
 'same-host protocol-relative anchors are ordinary crawlable route edges');
const baseHttp=http(),baseDom=dom();
baseHttp.pages[0].html=baseHttp.pages[0].html.replace('<head>',
 '<head><base href="https://outside.example/SECRET-BASE/">');
for(const d of ['desktop','tablet','mobile'])baseDom.pages[0].captures[d].html=
 baseDom.pages[0].captures[d].html.replace('<head>',
  '<head><base href="https://outside.example/SECRET-BASE/">');
const unknownBase=QA.analyze(input(baseHttp,baseDom));
assert.equal(unknownBase.summary.publishedGraphObservedScopes,0);
assert.equal(unknownBase.summary.publishedGraphStrongOrphans,0);
assert(!JSON.stringify(unknownBase).includes('SECRET-BASE'));
const mobileGraph=dom();
mobileGraph.pages[0].captures.mobile.html=stripContact(mobileGraph.pages[0].captures.mobile.html);
const mobileReach=QA.analyze(input(evidence,mobileGraph));
assert.equal(mobileReach.summary.publishedGraphStrongOrphans,0);
assert.equal(mobileReach.summary.publishedGraphMobileReachLoss,1);
assert(mobileReach.findings.some(f=>f.code==='rendered:published-mobile-navigation-loss'&&
 f.priority==='P2'));
const partialGraph=dom();partialGraph.pages.pop();
const incompleteGraph=QA.analyze(input(orphanHttp,partialGraph));
assert.equal(incompleteGraph.summary.publishedGraphObservedScopes,1);
assert.equal(incompleteGraph.summary.publishedGraphStrongOrphans,0,
 'partial DOM must not become a confirmed orphan signal');
assert(incompleteGraph.findings.some(f=>f.code==='rendered:published-link-graph-partial'));
assert.equal(clean.releaseAuthorized,false);
assert.equal(clean.sameReleaseRevisionProven,false);
const report=VIEW.render(clean);
assert(report.html.includes('default-src &#39;none&#39;'));
assert(!json(clean).includes('NEVER-REPEAT-CUSTOMER-FACT'));
assert(!report.html.includes('NEVER-REPEAT-CUSTOMER-FACT'));
assert(report.html.includes('JSON-LD semantic pairs'));
assert(report.html.includes('Published approved-route link graph'));
assert(report.html.includes('Published route content collisions'));
// A client script can mutate facts inside the SAME @type without changing
// type inventory. The existing semantic parser must catch the delta and
// redact all original values from the private output.
const originalSchema=JSON.parse(schema.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
const jsonld=x=>'<script type="application/ld+json">'+JSON.stringify(x)+'</script>';
const changedClaim=dom();
changedClaim.pages[0].captures.mobile.html=body(bp.pages[0]).replace(schema,
 jsonld({...originalSchema,aggregateRating:{
  '@type':'AggregateRating',ratingValue:'SECRET-RATING-NOT-FOR-REPORT'}}));
const added=QA.analyze(input(evidence,changedClaim));
assert(added.findings.some(x=>x.code==='rendered:jsonld-owner-claim-mutated'&&
 x.device==='mobile'));
assert.equal(added.summary.schemaClaimChangedPairs,1);
assert(!JSON.stringify(added).includes('SECRET-RATING-NOT-FOR-REPORT'));
assert(!VIEW.render(added).html.includes('SECRET-RATING-NOT-FOR-REPORT'));
const changedValueHttp=http();
const published={...originalSchema,price:'FIRST-PRIVATE-PRICE'};
changedValueHttp.pages[0].html=body(bp.pages[0]).replace(schema,jsonld(published));
const sameTypePrice=dom();
sameTypePrice.pages[0].captures.mobile.html=changedValueHttp.pages[0].html
 .replace('FIRST-PRIVATE-PRICE','SECOND-PRIVATE-PRICE');
for(const device of ['desktop','tablet'])
 sameTypePrice.pages[0].captures[device].html=changedValueHttp.pages[0].html;
const priceDelta=QA.analyze(input(changedValueHttp,sameTypePrice));
assert.equal(priceDelta.summary.schemaClaimChangedPairs,1);
assert(priceDelta.findings.some(x=>x.code==='rendered:jsonld-owner-claim-mutated'));
assert(!JSON.stringify(priceDelta).includes('PRIVATE-PRICE'));
const unapproved=dom();
unapproved.pages[0].captures.mobile.html=body(bp.pages[0]).replace(schema,
 jsonld({'@context':'https://schema.org','@graph':[
  originalSchema,{'@type':'Product',offers:{'@type':'Offer',price:'SECRET-PRICE'}}]}));
const unapprovedReport=QA.analyze(input(evidence,unapproved));
assert(unapprovedReport.findings.some(x=>x.code==='rendered:jsonld-unapproved-type-injected'));
assert.equal(unapprovedReport.summary.schemaUnapprovedTypePairs,1);
assert(!JSON.stringify(unapprovedReport).includes('SECRET-PRICE'));
const unsafe=dom();
unsafe.pages[0].captures.mobile.html=body(bp.pages[0]).replace(schema,
 jsonld({...originalSchema,url:'https://outside.example/secret/'}));
assert(QA.analyze(input(evidence,unsafe)).findings.some(x=>
 x.code==='rendered:jsonld-semantic-regression'));
const malformedSchema=dom();
malformedSchema.pages[0].captures.mobile.html=body(bp.pages[0]).replace(schema,
 '<script type="application/ld+json">{invalid-json}</script>');
const incomplete=QA.analyze(input(evidence,malformedSchema));
assert.equal(incomplete.pages[0].devices.mobile.schemaRuntimeStatus,'incomplete');
assert(incomplete.findings.some(x=>x.code==='rendered:jsonld-semantic-comparison-incomplete'));
assert.equal(incomplete.summary.schemaRuntimeUnknownPairs,1);
// Key reordering must not trigger a false factual mutation.
const canonicalDelta=SCHEMA.compareRenderedSemantics({sourceHtml:jsonld({
 '@context':'https://schema.org','@type':'Organization',price:{currency:'EUR',amount:12}}),
 renderedHtml:jsonld({'@type':'Organization',price:{amount:12,currency:'EUR'},
  '@context':'https://schema.org'}),page:bp.pages[0],base,knownPaths:new Set(bp.pages.map(p=>p.path))});
assert.equal(canonicalDelta.status,'observed');
assert.deepEqual(canonicalDelta.changedClaimFields,[]);
const factBlocked=SCHEMA.compareRenderedSemantics({sourceHtml:'<html></html>',
 renderedHtml:jsonld(originalSchema),
 page:{...bp.pages[0],schemaCandidates:[{type:'Organization',eligible:false}]},
 base,knownPaths:new Set(bp.pages.map(p=>p.path))});
assert.equal(factBlocked.addedUnconfirmedTypes,1);
const removedClaim=SCHEMA.compareRenderedSemantics({sourceHtml:jsonld(published),
 renderedHtml:jsonld(originalSchema),page:bp.pages[0],base,
 knownPaths:new Set(bp.pages.map(p=>p.path))});
assert.deepEqual(removedClaim.removedClaimFields,['price']);
const breadcrumbDelta=SCHEMA.compareRenderedSemantics({
 sourceHtml:jsonld(originalSchema),
 renderedHtml:jsonld({'@context':'https://schema.org','@graph':[originalSchema,{
  '@type':'BreadcrumbList',itemListElement:[{
   '@type':'ListItem',position:2,item:'https://outside.example/'}]}]}),
 page:bp.pages[0],base,knownPaths:new Set(bp.pages.map(p=>p.path))});
assert(breadcrumbDelta.addedBreadcrumbProblems>0);
const relRestricted=dom();
relRestricted.pages[0].captures.mobile.html=body(bp.pages[0])
 .replace(/<a href=/g,'<a rel="nofollow" href=');
const linkReport=QA.analyze(input(evidence,relRestricted));
assert(linkReport.findings.some(x=>x.code==='rendered:approved-link-rel-restricted'&&
 x.device==='mobile'));
assert.equal(linkReport.summary.linkRestrictedRoutePairs,1);
const noncrawlable=dom();
noncrawlable.pages[0].captures.mobile.html=body(bp.pages[0]).replace(
 '</main>','<a href="#">Fake</a><a href="javascript:alert(SECRET-LINK)">Unsafe</a>'+
 '<a href="http://SECRET-HTTP.example/">Untrusted</a></main>');
const unsafeLinks=QA.analyze(input(evidence,noncrawlable));
assert(unsafeLinks.findings.some(x=>x.code==='rendered:noncrawlable-anchors-increased'));
assert(unsafeLinks.findings.some(x=>x.code==='rendered:external-or-offmount-links-increased'));
assert(!JSON.stringify(unsafeLinks).includes('SECRET-LINK'));
assert(!JSON.stringify(unsafeLinks).includes('SECRET-HTTP'));
const queryOnly=LINKS.compare({sourceParsed:HTML.inspect(body(bp.pages[0])),
 renderedParsed:HTML.inspect(body(bp.pages[0]).replace(
  'href="'+url('/contact/')+'"','href="'+url('/contact/')+'?from=link"')),
 served:url('/'),origin:base,approvedPaths:['/contact/']});
// The same route also exists in the approved CTA: partial query linking
// remains crawlable, so query-only is not inferred from a single changed href.
assert.equal(queryOnly.status,'observed');
assert.equal(queryOnly.queryOnlyPaths.length,0);
const allQuery=LINKS.compare({sourceParsed:HTML.inspect(body(bp.pages[0])),
 renderedParsed:HTML.inspect(body(bp.pages[0]).replaceAll(
  'href="'+url('/contact/')+'"','href="'+url('/contact/')+'?from=link"')),
 served:url('/'),origin:base,approvedPaths:['/contact/']});
assert.deepEqual(allQuery.queryOnlyPaths,['/contact/']);
const foreignBase=LINKS.compare({sourceParsed:HTML.inspect(body(bp.pages[0])),
 renderedParsed:HTML.inspect(body(bp.pages[0]).replace('<head>',
  '<head><base href="https://foreign.example/">')),
 served:url('/'),origin:base,approvedPaths:['/contact/']});
assert.equal(foreignBase.status,'unavailable');
const fragmentBroken=dom();
fragmentBroken.pages[0].captures.mobile.html=body(bp.pages[0]).replace(
 'href="'+url('/contact/')+'"','href="'+url('/contact/')+'#SECRET-FRAGMENT"');
const fragmentReport=QA.analyze(input(evidence,fragmentBroken));
assert(fragmentReport.findings.some(x=>x.code==='rendered:fragment-target-missing'&&
 x.device==='mobile'));
assert.equal(fragmentReport.summary.fragmentMissingTotal,1);
assert(!JSON.stringify(fragmentReport).includes('SECRET-FRAGMENT'));
const fragmentRestored=structuredClone(fragmentBroken);
fragmentRestored.pages[1].captures.mobile.html=body(bp.pages[1]).replace(
 '<main>','<main><span id="SECRET-FRAGMENT"></span>');
assert.equal(QA.analyze(input(evidence,fragmentRestored)).summary.fragmentMissingTotal,0);
const fragmentPartial=structuredClone(fragmentBroken);
fragmentPartial.pages.pop();
const fragmentUnknown=QA.analyze(input(evidence,fragmentPartial));
assert.equal(fragmentUnknown.summary.fragmentMissingTotal,0);
assert.equal(fragmentUnknown.summary.fragmentUnverifiedTotal,1);
assert(fragmentUnknown.findings.some(x=>x.code==='rendered:fragment-target-unverified'));
const topFragment=FRAGMENTS.review({parsed:HTML.inspect('<a href="#top">Top</a>'),
 served:url('/'),origin:base,
 targetByPath:new Map([['/',{inspected:true,ids:new Set()}]])});
assert.equal(topFragment.missing,0);
const broken=dom();
broken.pages[0].captures.mobile.html=body(bp.pages[0])
 .replace('<meta name="robots" content="index,follow">','<meta name="robots" content="noindex">')
 .replace('href="'+url('/')+'"','href="https://unapproved.example/"')
 .replace(/<h1>[\s\S]*?<\/h1>/,'').replace(/<a\b[^>]*>Go<\/a>/g,'');
broken.pages[0].captures.tablet.method='static-html';
const diff=QA.analyze(input(evidence,broken));
for(const code of ['rendered:robots-mutated-after-render','rendered:canonical-mutated-after-render',
 'rendered:rendered-h1-count','rendered:approved-internal-route-absent','rendered:not-rendered-dom',
 'rendered:jsonld-types-removed'].filter(x=>x!=='rendered:jsonld-types-removed'))
 assert(diff.findings.some(f=>f.code===code),code);
assert(diff.summary.P0>=2);
assert.equal(diff.pages[0].devices.tablet.inspected,false);
const missing=http();missing.pages.pop();
assert.equal(QA.analyze(input(missing,captures)).summary.fullyComparedPages,1);
const foreign=dom();foreign.siteId='other';
assert.throws(()=>QA.analyze(input(evidence,foreign)),/same-site/);
const malformed=dom();malformed.pages[0].path='/different/';
assert.throws(()=>QA.analyze(input(evidence,malformed)),/identity/);
const escaped=http();escaped.origin='https://outside.example/';
assert.throws(()=>QA.analyze(input(escaped,captures)),/mount/);
const robots='User-agent: Googlebot\nAllow: /\nUser-agent: *\nAllow: /\n';
const sitemap='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
 bp.pages.map(p=>'<url><loc>'+url(p.path)+'</loc></url>').join('')+'</urlset>';
const policy=CRAWL.analyze({blueprint:bp,base,robotsText:robots,sitemapXml:sitemap,
 agents:['Googlebot','Bingbot','*'],scope:'complete'});
const collisionRoutes=COVERAGE.build({policy,renderedContent:repeatedMetadata});
assert(collisionRoutes.rows.every(r=>r.signals.P1>0),
 'both approved canonical routes implicated in a duplicate pair need route-level P1 visibility');
const workspace=WORK.build({crawl:{policy,cmsBlueprint:bp,cmsSite:site,
 publicCapture:evidence,renderedCapture:broken,
 digests:{policy:hash(json(policy)),cmsBlueprint:hash(json(bp)),cmsSite:hash(json(site)),
  publicCapture:hash(json(evidence)),renderedCapture:hash(json(broken))}}});
assert(workspace.homeHtml.includes('rendered-content.html'));
assert(workspace.crawlHtml.includes('rendered-content.html'));
assert(workspace.renderedContentJson.includes('approved-internal-route-absent'));
assert.equal(workspace.overview.renderedContentIncluded,true);
assert(workspace.renderedContentJson.includes('"siteGraph"'));
assert.equal(typeof workspace.overview.renderedLinkGraphObservedScopes,'number');
assert(workspace.crawlHtml.includes('published link-graph scopes'));
const graphWorkspace=WORK.build({crawl:{policy,cmsBlueprint:bp,cmsSite:site,
 publicCapture:orphanHttp,renderedCapture:orphanDom,
 digests:{policy:hash(json(policy)),cmsBlueprint:hash(json(bp)),cmsSite:hash(json(site)),
  publicCapture:hash(json(orphanHttp)),renderedCapture:hash(json(orphanDom))}}});
assert.equal(graphWorkspace.overview.renderedLinkGraphOrphanRoutes,1);
assert(graphWorkspace.crawlHtml.includes('published-indexable-page-orphaned'),
 'same existing crawl human queue must include corroborated source-bound orphan signal');
assert(graphWorkspace.crawlLeadMarkdown.includes('published-indexable-page-orphaned'));
const collisionWorkspace=WORK.build({crawl:{policy,cmsBlueprint:bp,cmsSite:site,
 publicCapture:duplicateHttp,renderedCapture:duplicateDom,
 digests:{policy:hash(json(policy)),cmsBlueprint:hash(json(bp)),cmsSite:hash(json(site)),
  publicCapture:hash(json(duplicateHttp)),renderedCapture:hash(json(duplicateDom))}}});
assert.equal(collisionWorkspace.overview.renderedDuplicateMetadataPairs,1);
assert(collisionWorkspace.crawlHtml.includes('published-duplicate-metadata-confirmed'),
 'same existing crawl manual queue must include corroborated published duplicate metadata');
assert(collisionWorkspace.crawlLeadMarkdown.includes('published-duplicate-metadata-confirmed'));
assert(collisionWorkspace.overview.renderedCollisionProvisionalSignals===0);
assert(!collisionWorkspace.renderedContentJson.includes('Shared client private SEO title'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-rendered-seo-'));
try{
 const put=(name,value)=>{const file=path.join(tmp,name);fs.writeFileSync(file,json(value));return file;};
 const b=put('blueprint.json',bp),s=put('site.json',site),h=put('public.json',evidence),
  v=put('viewports.json',broken),p=put('policy.json',policy);
 const dest=path.join(tmp,'rendered-report');
 CLI.main(['--blueprint',b,'--site',s,'--public-http',h,'--viewports',v,'--out',dest]);
 const saved=JSON.parse(fs.readFileSync(path.join(dest,'rendered-content.json'),'utf8'));
 assert.equal(saved.summary.P0,diff.summary.P0);
 assert.throws(()=>CLI.main(['--blueprint',b,'--site',s,'--public-http',h,
  '--viewports',v,'--out',dest]),/already exists|overwrite/);
 const conf=put('config.json',{format:WCLI.CONFIG,
  crawl:{policy:p,cmsBlueprint:b,cmsSite:s,publicCapture:h,renderedCapture:v}});
 const combined=path.join(tmp,'combined');
 WCLI.main(['--config',conf,'--out',combined]);
 for(const name of ['rendered-content.html','rendered-content.md','rendered-content.json'])
  assert(fs.existsSync(path.join(combined,name)),name);
 const check=PACKET.verify(combined);
 assert.equal(check.validAsSaved,true);
 assert(check.filesChecked>=3);
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
process.stdout.write('Real Node rendered-content source-pair smoke PASS.\n');
