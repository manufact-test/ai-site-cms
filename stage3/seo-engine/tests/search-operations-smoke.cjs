'use strict';
/* One focused offline product smoke: measured GSC data -> history -> human ledger -> approved link audit. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BASE=path.resolve(__dirname,'..');
const {checkBlueprint}=require('../lib/blueprint.cjs');
const GSC=require('../lib/gsc-performance.cjs');
const CONTEXT=require('../lib/search-evidence-context.cjs');
const HISTORY=require('../lib/search-history.cjs');
const LEDGER=require('../lib/search-action-ledger.cjs');
const LINKS=require('../lib/search-link-opportunities.cjs');
const blueprintBytes=fs.readFileSync(path.join(BASE,'fixtures/industrial.blueprint.json'));
const blueprint=checkBlueprint(JSON.parse(blueprintBytes.toString('utf8')));
const blueprintSha256=crypto.createHash('sha256').update(blueprintBytes).digest('hex');
const site=JSON.parse(fs.readFileSync(path.resolve(BASE,'../fixtures/industrial-site.json'),'utf8'));
const searchContext=CONTEXT.validate({
 format:CONTEXT.FORMAT,property:'sc-domain:example.com',searchType:'web',country:'ALL',
 device:'ALL',filters:[],exportMethod:'gsc-ui',
 exportedAt:'2026-10-29T13:00:00Z',dataState:'final'
});
function report(start,end,clicks,impressions){
 const pages=GSC.readCsv('Top pages,Clicks,Impressions,CTR,Position\n'+
  'https://example.com/,'+clicks+','+impressions+','+(100*clicks/impressions).toFixed(2)+'%,9\n'+
  'https://example.com/contact/,11,180,6.11%,5\n','pages');
 const output=GSC.analyze({blueprint,origin:'https://example.com/',
  current:{pages},period:{start,end}});
 return {...output,searchContext,blueprintSha256};
}
const observations=[
 report('2026-09-01','2026-09-07',80,900),
 report('2026-09-08','2026-09-14',50,850),
 report('2026-09-15','2026-09-21',30,800)
];
const entries=observations.map(r=>({report:r,sha256:crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex')}));
const history=HISTORY.build(entries);
assert.equal(history.summary.periodCount,3);
assert.equal(history.summary.approvedPages,2);
assert(history.actions.some(a=>a.pageId==='page-home'&&a.priority==='P1'&&a.sustained));
assert(HISTORY.markdown(history).includes('Observed period summaries'));
const rawHash=crypto.createHash('sha256').update(JSON.stringify(history)).digest('hex');
const ledger=LEDGER.template(history,rawHash);
const untouched=LEDGER.review(history,rawHash,ledger);
assert.equal(untouched.summary.awaitingHumanReview,history.actions.length);
const assigned=JSON.parse(JSON.stringify(ledger));
assigned.actions[0].status='completed-reported';
assigned.actions[0].assignedTo='Manual SEO reviewer';
assigned.actions[0].reason='Owner asked for review; result not independently authenticated';
assigned.actions[0].decisionAt='2026-10-29';
assigned.actions[0].manualChangeDescription='Editorial change said to be applied in the CMS';
assigned.actions[0].evidenceRefs=['private://owner-review-1'];
const completed=LEDGER.review(history,rawHash,assigned);
assert.equal(completed.summary.reportedCompleteNotVerified,1);
assert.equal(completed.actions[0].releasePermission,false);
assert.throws(()=>LEDGER.review(history,'0'.repeat(64),assigned),/Stale/);
const links=LINKS.build(blueprint,observations[2],site);
assert(links.summary.approvedEdges>=2);
assert(links.recommendations.some(x=>x.type==='review-planned-link'));
const changed=JSON.parse(JSON.stringify(observations[2]));
changed.searchContext={...changed.searchContext,searchType:'image'};
assert.throws(()=>HISTORY.build([...entries.slice(0,2),{
 report:changed,sha256:'0'.repeat(64)}]),/signature|Incomparable/);
process.stdout.write('Search operations focused smoke PASS: multi-period history, source-locked decisions, approved internal-link evidence.\n');
