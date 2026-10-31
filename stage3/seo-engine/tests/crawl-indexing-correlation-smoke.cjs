'use strict';
/* Prove source contract, human-only combined triage and no inferred Google causality. */
const assert=require('node:assert/strict'),crypto=require('node:crypto'),
 fs=require('node:fs'),path=require('node:path');
const BP=require('../lib/blueprint.cjs'),POLICY=require('../lib/crawl-policy.cjs');
const BRIDGE=require('../lib/crawl-indexing-correlation.cjs');
const VIEW=require('../lib/crawl-indexing-view.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
const blueprint=BP.compileBrief(raw),sourceText=JSON.stringify(blueprint),sourceSha=sha(sourceText);
const robots='User-agent: Googlebot\nDisallow: /contact/\nAllow: /\n'+
 'User-agent: *\nAllow: /\nSitemap: https://demo.example/sitemap.xml\n';
const sitemap='<?xml version="1.0"?><urlset><url><loc>https://demo.example/</loc></url>'+
 '<url><loc>https://demo.example/contact/</loc></url></urlset>';
const base='https://demo.example/';
function policy(bp=blueprint,robotsText=robots,sitemapXml=sitemap){
 return POLICY.analyze({blueprint:bp,base,robotsText,sitemapXml});
}
function indexing(bp=blueprint,oldHash=sourceSha){
 return {format:'manufact-seo-indexing-intelligence-v1',readOnly:true,
  siteId:bp.siteId,blueprintSha256:oldHash,publicOrigin:base,
  sourceType:'operator-normalized-gsc-export',exportScope:'selected-urls',
  observedAt:'2026-10-30',gscProperty:'sc-domain:demo.example',
  pages:bp.pages.map((p,i)=>({
   pageId:p.id,path:p.path,observationStatus:i?'not-indexed':'indexed',
   observationReason:i?'Not crawled':'',indexingEvidenceProvided:true}))};
}
const initial=BRIDGE.analyze({blueprint,blueprintRawSha256:sourceSha,
 policy:policy(),indexing:indexing(),indexingRawSha256:sha('private-original-indexing-report')});
assert.equal(initial.format,BRIDGE.FORMAT);
assert.equal(initial.summary.operatorTasks,1);
assert.equal(initial.summary.needsUrgentInspection,1);
assert.equal(initial.pages[1].reviewStatus,'robots-and-nonindexed-coobserved');
assert.equal(initial.pages[1].causalExplanationEstablished,false);
assert.equal(initial.publicationAuthorized,false);
assert.equal(initial.causalExplanationEstablished,false);
assert.equal(initial.summary.networkRequests,0);
assert(BRIDGE.markdown(initial).includes('Correlation does NOT prove causation'));
const html=VIEW.render(initial);
assert(html.includes('Crawl and Indexing Co-observations'));
assert(html.includes('connect-src &#39;none&#39;'));
assert(!html.includes('<script'));
const allowed=BRIDGE.analyze({blueprint,blueprintRawSha256:sourceSha,
 policy:policy(blueprint,'User-agent: *\nAllow: /\n'),
 indexing:indexing(),indexingRawSha256:sha('allowed')});
assert.equal(allowed.summary.needsUrgentInspection,0);
assert.equal(allowed.pages[1].reviewStatus,'notindexed-googlebot-allowed');
const noRows=indexing();
noRows.pages[1].observationStatus='unobserved';
noRows.pages[1].indexingEvidenceProvided=false;
const unknown=BRIDGE.analyze({blueprint,blueprintRawSha256:sourceSha,
 policy:policy(blueprint,'User-agent: *\nAllow: /\n'),
 indexing:noRows,indexingRawSha256:sha('unobserved')});
assert.equal(unknown.summary.reportedNotIndexed,0);
assert.equal(unknown.summary.noObservedIndexingRow,1);
assert(!unknown.actions.some(x=>x.type.includes('unindexed')));
const mismatch=indexing();mismatch.blueprintSha256='f'.repeat(64);
assert.throws(()=>BRIDGE.analyze({blueprint,blueprintRawSha256:sourceSha,
 policy:policy(),indexing:mismatch,indexingRawSha256:sha('wrong')}),/same-Blueprint/);
const differentOrigin=indexing();differentOrigin.publicOrigin='https://elsewhere.example/';
assert.throws(()=>BRIDGE.analyze({blueprint,blueprintRawSha256:sourceSha,
 policy:policy(),indexing:differentOrigin,indexingRawSha256:sha('elsewhere')}),/same-Blueprint/);
const fakeRoute=indexing();fakeRoute.pages[1].path='/other/';
assert.throws(()=>BRIDGE.analyze({blueprint,blueprintRawSha256:sourceSha,
 policy:policy(),indexing:fakeRoute,indexingRawSha256:sha('bad-path')}),/page inventory/);
const duplicate=indexing();duplicate.pages[1].pageId=duplicate.pages[0].pageId;
assert.throws(()=>BRIDGE.analyze({blueprint,blueprintRawSha256:sourceSha,
 policy:policy(),indexing:duplicate,indexingRawSha256:sha('duplicate')}),/page inventory/);
const forgedRow=indexing();forgedRow.pages[1].indexingEvidenceProvided=false;
assert.throws(()=>BRIDGE.analyze({blueprint,blueprintRawSha256:sourceSha,
 policy:policy(),indexing:forgedRow,indexingRawSha256:sha('bad-row')}),/Contradictory/);
const noindex=JSON.parse(JSON.stringify(raw));noindex.pages[1].seo.robots='noindex';
const noindexBp=BP.compileBrief(noindex),noindexSha=sha(JSON.stringify(noindexBp));
const anomalous=BRIDGE.analyze({blueprint:noindexBp,blueprintRawSha256:noindexSha,
 policy:policy(noindexBp),indexing:{...indexing(noindexBp,noindexSha),
  pages:noindexBp.pages.map(p=>({pageId:p.id,path:p.path,observationStatus:'indexed',
   indexingEvidenceProvided:true}))},indexingRawSha256:sha('noindex')});
assert(anomalous.actions.some(a=>a.type==='review-noindex-reported-indexed'));
console.log('SEO GSC + crawler policy correlation: matched Blueprint, missing data and noncausality PASS.');
