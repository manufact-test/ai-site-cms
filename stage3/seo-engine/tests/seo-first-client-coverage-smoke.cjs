'use strict';
/* Real Node, synthetic partial first-client SEO evidence. No live client request. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const POLICY=require('../lib/crawl-policy.cjs');
const COVERAGE=require('../lib/seo-first-client-coverage.cjs');
const FIELD=require('../lib/seo-field-performance.cjs');
const WORK=require('../lib/seo-operator-workspace.cjs');
const json=x=>JSON.stringify(x,null,2)+'\n';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const bp=BP.checkBlueprint(JSON.parse(fs.readFileSync(path.join(__dirname,
 '../fixtures/industrial.blueprint.json'),'utf8')));
const base='https://example.org/';
const robotsText='User-agent: *\nAllow: /\n';
const sitemapXml='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
 bp.pages.map(p=>'<url><loc>'+base+p.path.slice(1)+'</loc></url>').join('')+'</urlset>';
const policy=POLICY.analyze({blueprint:bp,base,robotsText,sitemapXml,
 agents:['Googlebot','Bingbot','*'],scope:'complete'});
const first=bp.pages[0];
const empty=COVERAGE.build({policy});
assert.equal(empty.summary.approvedPages,bp.pages.length);
assert.equal(empty.summary.approvedRouteInventoryAvailable,true);
assert.equal(empty.summary.preLaunchEvidenceIncomplete,bp.pages.length);
assert.equal(empty.summary.renderedThreeDevicePairs,0);
assert(empty.rows.every(r=>r.httpStatus==='not-supplied'&&r.cmsStatus==='not-supplied'&&
 r.cruxDevices.length===0));
assert(COVERAGE.render(empty).html.includes('CrUX exact URL'));
assert(COVERAGE.render(empty).markdown.includes('not supplied'));
const noRoutes=COVERAGE.build({policy:{...policy,pages:[]}});
assert.equal(noRoutes.summary.approvedRouteInventoryAvailable,false);
assert(COVERAGE.render(noRoutes).markdown.includes('coverage UNKNOWN'));
const site={format:'manufact-ai-site-v1',schemaVersion:1,siteId:bp.siteId,
 pages:bp.pages.map(p=>({id:p.id,path:p.path,seo:{...p.seo},sections:[]})),redirects:[]};
const source=[{record:{key:{origin:'https://example.org'},metrics:{},
 collectionPeriod:{firstDate:{year:2026,month:10,day:2},
  lastDate:{year:2026,month:10,day:29}}}},
 {record:{key:{url:base+first.path.slice(1),formFactor:'PHONE'},metrics:{
  largest_contentful_paint:{percentiles:{p75:4200}}}}}];
const field=FIELD.review({source,sourceSha256:sha(json(source)),siteId:bp.siteId,
 base,paths:bp.pages.map(p=>p.path),referenceDate:'2026-10-31'});
const fakeSource={siteId:bp.siteId,base,readOnly:true,releaseAuthorized:false};
const cms={...fakeSource,pages:bp.pages.map((p,i)=>({pageId:p.id,path:p.path,
 currentSite:i?null:{pageId:p.id},driftFields:i?['pageMissing']:[]})),actions:[]};
const schema={...fakeSource,pages:bp.pages.map((p,i)=>({pageId:p.id,path:p.path,
 htmlInspectible:i===0,rawHtml:'<script>PRIVATE PAYLOAD</script>'})),
 findings:[{pageId:first.id,priority:'P1',code:'synthetic-schema-review'}]};
const rendered={...fakeSource,pages:bp.pages.map((p,i)=>({pageId:p.id,path:p.path,
 evidenceState:i===0?'SOURCE-PAIR-OBSERVED':'UNVERIFIED',
 devices:Object.fromEntries(['desktop','tablet','mobile'].map(d=>[d,{inspected:i===0}]))})),
 findings:[{pageId:first.id,priority:'P0',code:'synthetic-render-conflict'}]};
const mixed=COVERAGE.build({policy,cmsReview:cms,structuredData:schema,
 renderedContent:rendered,fieldPerformance:field});
assert.equal(mixed.summary.cmsSelectedSourceMatch,1);
assert.equal(mixed.summary.httpInspectable,1);
assert.equal(mixed.summary.renderedThreeDevicePairs,1);
assert.equal(mixed.summary.preLaunchEvidenceIncomplete,bp.pages.length-1);
assert.equal(mixed.summary.fieldExactPageRepresented,1);
assert.equal(mixed.summary.fieldOriginOnlyRecords,1);
assert.equal(mixed.summary.routeP0SignalPages,1);
assert(mixed.rows[0].signals.P1>=2,'schema + poor CrUX field evidence');
assert(mixed.rows[0].signals.P0>=1);
assert.deepEqual(mixed.rows[0].cruxDevices,['PHONE']);
assert(mixed.rows.slice(1).every(r=>!r.cruxExactPage));
assert(mixed.rows.slice(1).every(r=>r.nextEvidence.some(x=>x.includes('HTTPS capture'))&&
 r.nextEvidence.some(x=>x.includes('desktop/tablet/mobile'))));
assert(mixed.rows[0].nextEvidence.some(x=>x.includes('P0 diagnostics')));
assert.deepEqual(mixed.suggestedRenderedBatches,[],
 'uninspectable HTTP must never be suggested for a direct browser recapture');
const partial=COVERAGE.build({policy,cmsReview:{...cms,pages:cms.pages.map((p,i)=>
 i===1?{...p,currentSite:{pageId:p.pageId},driftFields:[]}:p)},
 structuredData:{...schema,pages:schema.pages.map((p,i)=>i===1?{...p,htmlInspectible:true}:p)},
 renderedContent:rendered,fieldPerformance:field});
assert.equal(partial.summary.potentialRenderedRecaptureRoutes,1);
assert.deepEqual(partial.suggestedRenderedBatches,[[bp.pages[1].id]]);
assert(COVERAGE.render(partial).markdown.includes('--page-ids '+bp.pages[1].id));
const manyPages=Array.from({length:18},(_,i)=>({pageId:'approved-page-'+i,
 path:'/approved-'+i+'/'}));
const many=COVERAGE.build({policy:{...policy,pages:manyPages,findings:[]},
 cmsReview:{...fakeSource,pages:manyPages.map(p=>({...p,currentSite:{pageId:p.pageId},
  driftFields:[]})),actions:[]},
 structuredData:{...fakeSource,pages:manyPages.map(p=>({...p,htmlInspectible:true})),
  findings:[]}});
assert.deepEqual(many.suggestedRenderedBatches.map(x=>x.length),[8,8,2]);
const view=COVERAGE.render(mixed);
assert(view.html.includes('paired-three-devices'));
assert(view.html.includes('Next manual evidence'));
assert(!view.html.includes('PRIVATE PAYLOAD'));
assert(!view.markdown.includes('PRIVATE PAYLOAD'));
assert(!view.html.includes('href="https://example.org'));
assert.throws(()=>COVERAGE.build({...{policy,cmsReview:cms,structuredData:schema},
 renderedContent:{...rendered,siteId:'different-customer'}}),/cross-site/i);
assert.throws(()=>COVERAGE.build({policy,structuredData:{...schema,pages:
 schema.pages.map((p,i)=>i?{...p,path:'/unapproved/'}:p)}}),/unapproved/i);
// Existing read-only Operator Workspace includes the coverage table and summary;
// it remains one Crawl report, not another home card or a release gate.
const workspace=WORK.build({crawl:{policy,cmsBlueprint:bp,cmsSite:site,crux:source,
 digests:{policy:sha(json(policy)),cmsBlueprint:sha(json(bp)),
  cmsSite:sha(json(site)),crux:sha(json(source))}}});
assert(workspace.crawlHtml.includes('First-client approved route evidence coverage'));
assert(workspace.crawlLeadMarkdown.includes('First-client approved route evidence coverage'));
assert.equal(workspace.overview.firstClientApprovedRoutes,bp.pages.length);
assert.equal(workspace.overview.firstClientRoutesMissingPreLaunchEvidence,bp.pages.length);
assert(!workspace.homeHtml.includes('First-client approved route evidence coverage'));
const lead=JSON.parse(workspace.leadReadinessJson);
assert.equal(lead.releaseAuthorized,false);
process.stdout.write('Real Node first-client cross-evidence route coverage smoke PASS.\n');
