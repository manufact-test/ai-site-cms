'use strict';
/* Real Node offline rendered SEO integration smoke. Synthetic customer sources only. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const CRAWL=require('../lib/crawl-policy.cjs');
const QA=require('../lib/seo-rendered-content-audit.cjs');
const SCHEMA=require('../lib/seo-structured-data-audit.cjs');
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
 return '<html><head><title>Private content</title><meta name="description" content="Synthetic snippet"><link rel="canonical" href="'+
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
assert.equal(clean.summary.schemaClaimChangedPairs,0);
assert.equal(clean.releaseAuthorized,false);
assert.equal(clean.sameReleaseRevisionProven,false);
const report=VIEW.render(clean);
assert(report.html.includes('default-src &#39;none&#39;'));
assert(!json(clean).includes('NEVER-REPEAT-CUSTOMER-FACT'));
assert(!report.html.includes('NEVER-REPEAT-CUSTOMER-FACT'));
assert(report.html.includes('JSON-LD semantic pairs'));
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
const workspace=WORK.build({crawl:{policy,cmsBlueprint:bp,cmsSite:site,
 publicCapture:evidence,renderedCapture:broken,
 digests:{policy:hash(json(policy)),cmsBlueprint:hash(json(bp)),cmsSite:hash(json(site)),
  publicCapture:hash(json(evidence)),renderedCapture:hash(json(broken))}}});
assert(workspace.homeHtml.includes('rendered-content.html'));
assert(workspace.crawlHtml.includes('rendered-content.html'));
assert(workspace.renderedContentJson.includes('approved-internal-route-absent'));
assert.equal(workspace.overview.renderedContentIncluded,true);
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
