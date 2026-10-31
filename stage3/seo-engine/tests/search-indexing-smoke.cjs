'use strict';
/* Real Blueprint fixture → private normalized GSC index CSV → search/index guardrails → snapshot history → local operator workspace. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs'),GSC=require('../lib/gsc-performance.cjs');
const CONTEXT=require('../lib/search-evidence-context.cjs');
const INDEX=require('../lib/search-indexing.cjs'),VIEW=require('../lib/search-indexing-view.cjs');
const HIST=require('../lib/search-indexing-history.cjs'),WORK=require('../lib/seo-operator-workspace.cjs');
const raw=fs.readFileSync(path.resolve(__dirname,'../fixtures/industrial.blueprint.json'));
const blueprint=BP.checkBlueprint(JSON.parse(raw.toString('utf8')));
const sha=crypto.createHash('sha256').update(raw).digest('hex');
const context=CONTEXT.validate({format:CONTEXT.FORMAT,property:'sc-domain:example.com',searchType:'web',
 country:'ALL',device:'ALL',filters:[],exportMethod:'gsc-ui',exportedAt:'2026-10-29T16:00:00Z',dataState:'final'});
const perf=GSC.analyze({blueprint,origin:'https://example.com/',period:{start:'2026-10-01',end:'2026-10-07'},
 current:{pages:GSC.readCsv('Page,Clicks,Impressions,Position\nhttps://example.com/,75,700,8\n','pages')}});
perf.blueprintSha256=sha;perf.searchContext=context;
function report(csv,day){
 return INDEX.analyze({blueprint,blueprintSha256:sha,origin:'https://example.com/',context,
  observedAt:day,exportScope:'selected-urls',table:INDEX.parseExport(csv),
  performance:perf,performanceSha256:'e'.repeat(64)});
}
const home='https://example.com/',contact='https://example.com/contact/';
const headers='URL,Status,Reason,Last crawled\n';
const first=report(headers+home+',indexed,,2026-10-06\n'+contact+',indexed,,2026-10-08\n','2026-10-09');
const second=report(headers+home+',not indexed,Crawled - currently not indexed,2026-10-15\n','2026-10-18');
const third=report(headers+home+',not indexed,Crawled - currently not indexed,2026-10-24\n','2026-10-27');
assert.equal(second.summary.approvedPages,2);
assert.equal(second.summary.reportedNotIndexed,1);
assert.equal(second.summary.notObserved,1);
assert(second.actions.some(x=>x.priority==='P1'&&x.pageId==='page-home'));
assert(second.actions.some(x=>x.type==='review-search-performance-indexing-disagreement'));
const view=VIEW.render(second);
assert(view.html.includes('URL Indexing Intelligence')&&view.html.includes('Crawled - currently not indexed'));
assert(!view.html.includes('<script'));
const history=HIST.build([first,second,third].map((data,i)=>({report:data,sha256:String(i+1).repeat(64)})));
assert.equal(history.summary.snapshots,3);
assert.equal(history.pages.find(p=>p.pageId==='page-contact').latestTransition,
 'insufficient-comparable-url-observations');
assert.equal(history.pages.find(p=>p.pageId==='page-home').latestTransition,'unchanged-reported-status');
const workspace=WORK.build({indexing:second});
assert.equal(workspace.overview.indexingIncluded,true);
assert(workspace.homeHtml.includes('indexing.html')&&workspace.indexingHtml.includes('URL Indexing Intelligence'));
assert.throws(()=>WORK.build({indexing:{...second,siteId:'another-site'},
 firstSite:{summary:{format:'manufact-seo-first-site-check-v1',siteId:second.siteId,
  sourceSiteSha256:sha,automaticRelease:false,
  release:{blockingGates:0,blockerIds:[],mandatoryManualChecks:6}},summarySha:sha}}),/different customer sites/);
assert.throws(()=>INDEX.parseExport(headers+home+',indexing,,2026-10-25\n'),/Unrecognized indexing status/);
assert.throws(()=>HIST.build([{report:first,sha256:'1'.repeat(64)},{report:{...second,blueprintSha256:'a'.repeat(64)},sha256:'2'.repeat(64)}]),/mixing/);
process.stdout.write('SEO indexing and private workspace product smoke PASS.\n');
