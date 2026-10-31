'use strict';
/* Real Node, synthetic official-shape CrUX JSON; never a live Google lookup. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs'),POLICY=require('../lib/crawl-policy.cjs');
const FIELD=require('../lib/seo-field-performance.cjs');
const VIEW=require('../lib/seo-field-performance-view.cjs');
const PACKET=require('../lib/seo-private-lead-integrity.cjs');
const WORK=require('../lib/seo-operator-workspace.cjs');
const CLI=require('../bin/build-seo-operator-workspace.cjs');
const json=x=>JSON.stringify(x,null,2)+'\n';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const bp=BP.checkBlueprint(JSON.parse(fs.readFileSync(
 path.join(__dirname,'../fixtures/industrial.blueprint.json'),'utf8')));
const site={format:'manufact-ai-site-v1',schemaVersion:1,siteId:bp.siteId,
 pages:bp.pages.map(x=>({id:x.id,path:x.path,seo:{...x.seo},sections:[]})),redirects:[]};
const base='https://example.org/';
const span={firstDate:{year:2026,month:10,day:2},lastDate:{year:2026,month:10,day:29}};
const metric=value=>({percentiles:{p75:value}});
const page={record:{key:{formFactor:'PHONE',url:base},metrics:{
 largest_contentful_paint:metric(4700),interaction_to_next_paint:metric(240),
 cumulative_layout_shift:metric('0.11')},collectionPeriod:span},
 urlNormalizationDetails:{SECRET_CLIENT_NOTE:'never copy this'} };
const origin={record:{key:{formFactor:'DESKTOP',origin:'https://example.org'},metrics:{
 largest_contentful_paint:metric(1800),cumulative_layout_shift:metric('0.05')},
 collectionPeriod:span}};
const source=[page,origin];
const options={source,sourceSha256:hash(json(source)),siteId:bp.siteId,
 base,paths:bp.pages.map(p=>p.path),referenceDate:'2026-10-31'};
const review=FIELD.review(options);
assert.equal(review.summary.records,2);
assert.equal(review.summary.pageRecords,1);
assert.equal(review.summary.originRecords,1);
assert.equal(review.summary.representedApprovedPages,1);
assert.equal(review.summary.unrepresentedApprovedPages,bp.pages.length-1);
assert.equal(review.summary.poorMetricValues,1);
assert.equal(review.summary.needsImprovementMetricValues,2);
assert.equal(review.summary.unknownMetricValues,1);
assert.equal(review.summary.P1,1);
assert.equal(review.releaseAuthorized,false);
assert(review.findings.some(f=>f.code==='field:lcp-poor'));
assert(review.findings.some(f=>f.code==='field:metric-coverage-incomplete'));
assert(!json(review).includes('SECRET_CLIENT_NOTE'));
assert(!json(review).includes('urlNormalizationDetails'));
const rendered=VIEW.render(review);
assert(rendered.html.includes('default-src &#39;none&#39;'));
assert(rendered.markdown.includes('origin-wide'));
assert(!rendered.html.includes('<script'));
assert(!rendered.html.includes('SECRET_CLIENT_NOTE'));
assert(!rendered.markdown.includes('SECRET_CLIENT_NOTE'));
const mustReject=source=>assert.throws(()=>FIELD.review({...options,source}),
 /CrUX|performance|duplicate|p75/);
mustReject([{record:{...page.record,key:{formFactor:'PHONE',url:'https://other.example/'}}}]);
mustReject([{record:{...page.record,key:{formFactor:'PHONE',url:base+'?tracker=1'}}}]);
mustReject([page,page]);
mustReject([{record:{...page.record,metrics:{
 largest_contentful_paint:metric(-2)}}}]);
mustReject([{record:{...page.record,metrics:{
 cumulative_layout_shift:metric('not-a-number')}}}]);
mustReject([{record:{...page.record,collectionPeriod:{firstDate:span.lastDate,
 lastDate:span.firstDate}}}]);
const missing=FIELD.review({...options,source:{record:{key:{url:base},metrics:{}}}});
assert.equal(missing.summary.unknownMetricValues,3);
assert.equal(missing.summary.missingPeriodRecords,1);
const stale=FIELD.review({...options,referenceDate:'2026-12-15'});
assert.equal(stale.summary.stalePeriodRecords,2);
const future=FIELD.review({...options,referenceDate:'2026-10-20'});
assert.equal(future.summary.futurePeriodRecords,2);
const submount=FIELD.review({...options,base:'https://example.org/tenant/',
 paths:['/'],source:{record:{key:{origin:'https://example.org'},metrics:{},
  collectionPeriod:span}}});
assert(submount.findings.some(f=>f.code==='field:origin-exceeds-approved-mount'));
assert.equal(submount.summary.unrepresentedApprovedPages,1);
assert.equal(FIELD.review({...options,source:{record:{key:{url:base},
 metrics:{},collectionPeriod:span}}}).records[0].device,'ALL');
const boundary=FIELD.review({...options,source:{record:{key:{url:base},metrics:{
 largest_contentful_paint:metric(4000),interaction_to_next_paint:metric(500),
 cumulative_layout_shift:metric('0.25')},collectionPeriod:span}}});
assert.equal(boundary.summary.poorMetricValues,0,
 'Google CWV poor thresholds are strictly greater than 4000/500/0.25');
assert.equal(boundary.summary.needsImprovementMetricValues,3);
const robotsText='User-agent: *\nAllow: /\n';
const sitemapXml='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
 bp.pages.map(p=>'<url><loc>'+base+p.path.slice(1)+'</loc></url>').join('')+'</urlset>';
const policy=POLICY.analyze({blueprint:bp,base,robotsText,sitemapXml,
 agents:['Googlebot','Bingbot','*'],scope:'complete'});
const crawl={policy,cmsBlueprint:bp,cmsSite:site,crux:source,
 digests:{policy:hash(json(policy)),cmsBlueprint:hash(json(bp)),
  cmsSite:hash(json(site)),crux:hash(json(source))}};
const workspace=WORK.build({crawl});
assert.equal(workspace.overview.fieldPerformanceIncluded,true);
assert.equal(workspace.overview.fieldPerformancePoor,1);
assert(workspace.crawlHtml.includes('field-performance.html'));
assert(workspace.fieldPerformanceJson.includes('"sourceAuthenticated": false'));
assert(!workspace.homeHtml.includes('href="field-performance.html"'),
 'no additional operator home/dashboard card');
const lead=JSON.parse(workspace.leadReadinessJson);
assert(lead.gates.some(g=>g.key==='search-performance-followup'&&
 g.status==='LEAD-REVIEW-REQUIRED'&&g.cruxPoorMetrics===1));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-seo-crux-'));
try{
 const put=(name,value)=>{const file=path.join(dir,name);fs.writeFileSync(file,json(value));return file};
 const config=put('config.json',{format:CLI.CONFIG,crawl:{
  policy:put('policy.json',policy),cmsBlueprint:put('blueprint.json',bp),
  cmsSite:put('site.json',site),crux:put('crux.json',source)}});
 const output=path.join(dir,'workspace');
 CLI.main(['--config',config,'--out',output]);
 for(const file of ['field-performance.html','field-performance.md','field-performance.json'])
  assert(fs.existsSync(path.join(output,file)),file);
 const receipt=JSON.parse(fs.readFileSync(path.join(output,'LEAD-PACKET-INTEGRITY.json')));
 assert(receipt.files.some(f=>f.name==='field-performance.json'));
 const verified=PACKET.verify(output);
 assert.equal(verified.validAsSaved,true);
 assert.equal(verified.authenticatedHost,false);
 assert.equal(verified.releaseAuthorized,false);
 assert.throws(()=>CLI.main(['--config',config,'--out',output]),/exists|occupied/i);
 fs.appendFileSync(path.join(output,'field-performance.md'),'tampering test\n');
 assert.throws(()=>PACKET.verify(output),/changed|replaced|bytes/i);
}finally{fs.rmSync(dir,{recursive:true,force:true})}
process.stdout.write('Real Node offline CrUX field performance and existing Workspace smoke PASS.\n');
