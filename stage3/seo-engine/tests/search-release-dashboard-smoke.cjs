'use strict';
/* One practical offline scenario: actual sample Blueprint -> measured GSC -> history -> release followup -> local dashboard. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const GSC=require('../lib/gsc-performance.cjs');
const BP=require('../lib/blueprint.cjs');
const CONTEXT=require('../lib/search-evidence-context.cjs');
const HIST=require('../lib/search-history.cjs');
const RELEASE=require('../lib/search-release-followup.cjs');
const DASH=require('../lib/search-ops-dashboard.cjs');
const bytes=fs.readFileSync(path.resolve(__dirname,'../fixtures/industrial.blueprint.json'));
const blueprint=BP.checkBlueprint(JSON.parse(bytes.toString('utf8')));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const blueprintSha256=hash(bytes);
const context=CONTEXT.validate({format:CONTEXT.FORMAT,property:'sc-domain:example.com',
 searchType:'web',country:'ALL',device:'ALL',filters:[],exportMethod:'gsc-ui',
 exportedAt:'2026-10-29T12:00:00Z',dataState:'final'});
function measured(start,end,clicks,impressions){
 const pages=GSC.readCsv('Page,Clicks,Impressions,Position\n'+
  'https://example.com/,'+clicks+','+impressions+',8\n'+
  'https://example.com/contact/,10,200,5\n','pages');
 const report=GSC.analyze({blueprint,origin:'https://example.com/',
  current:{pages},period:{start,end}});
 report.blueprintSha256=blueprintSha256;
 report.searchContext=context;
 return {report,sha256:hash(JSON.stringify(report))};
}
const history=HIST.build([
 measured('2026-09-01','2026-09-07',100,800),
 measured('2026-09-08','2026-09-14',70,850),
 measured('2026-09-16','2026-09-22',45,900)
]);
const sourceSha=hash(JSON.stringify(history));
const journal=RELEASE.template(history,sourceSha);
journal.releases.push({
 id:'release-demo-oct',publishedDate:'2026-09-15',
 siteRevisionFingerprint:'a'.repeat(64),cmsPublishedVersion:'v13',
 pageIds:['page-home'],changeKinds:['metadata','content'],
 changeSummary:'Confirmed <img src=x onerror=alert(1)> template update',
 evidenceReferences:['private://client-revision-note'],ownerRecordedBy:'Editor'
});
const followup=RELEASE.build(history,sourceSha,journal);
assert.equal(followup.results[0].cohortStatus,'adjacent-observation-windows-no-other-declared-release');
assert.equal(followup.results[0].pages[0].changes.clicks,-25);
assert.equal(followup.results[0].pages[0].changes.ctrPercentagePoints<0,true);
const dash=DASH.render(history,sourceSha,null,followup);
assert(dash.html.startsWith('<!doctype html>'));
assert(dash.html.includes('Confirmed &lt;img src=x onerror=alert(1)&gt; template update'));
assert(!dash.html.includes('<img src=x onerror='));
assert(dash.html.includes('Content-Security-Policy'));
assert(!dash.html.includes('<script'));
assert.equal(dash.summary.pages,2);
const forged={...followup,sourceHistorySha256:'b'.repeat(64)};
assert.throws(()=>DASH.render(history,sourceSha,null,forged),/source-bound/);
const extra=JSON.parse(JSON.stringify(journal));
extra.releases.push({...extra.releases[0],id:'another-editorial-release'});
const conflicting=RELEASE.build(history,sourceSha,extra);
assert(conflicting.results.every(x=>x.pages.every(y=>y.changes===null)));
assert.throws(()=>RELEASE.build(history,'c'.repeat(64),journal),/stale/);
process.stdout.write('SEO release + private dashboard smoke PASS; 2 measured pages, comparison guards and escaping.\n');
