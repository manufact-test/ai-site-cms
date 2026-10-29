'use strict';
/* End-to-end private workspace composition from the existing launch/search report contracts. */
const assert=require('node:assert/strict');
const WORK=require('../lib/seo-operator-workspace.cjs');
const sourceSha='a'.repeat(64),manifestSha='b'.repeat(64),historySha='c'.repeat(64);
const summary={format:'manufact-seo-first-site-check-v1',siteId:'site-demo',
 sourceSiteSha256:sourceSha,publishedVersion:3,automaticRelease:false,
 release:{blockingGates:1,blockerIds:['needs-live-form-post'],mandatoryManualChecks:6},
 staticExport:{staticManifestSha256:manifestSha},htmlPages:2};
const bundle={format:'manufact-seo-review-bundle-v1',siteId:'site-demo',readOnly:true,
 approvedSiteSource:{fileSha256:sourceSha},release:{blockers:[{gateId:'needs-live-form-post'}]}};
const periods=[
 {period:{start:'2026-09-01',end:'2026-09-07',days:7},observedPages:1,measuredPageClicks:20,
  measuredPageImpressions:200,gapDays:null},
 {period:{start:'2026-09-08',end:'2026-09-14',days:7},observedPages:1,measuredPageClicks:15,
  measuredPageImpressions:250,gapDays:0}
];
const series=periods.map((x,i)=>({period:x.period,observed:true,
 metrics:{clicks:i?15:20,impressions:i?250:200,ctr:i?15/250:.1,averagePosition:8}}));
const history={format:'manufact-seo-search-history-v1',version:1,siteId:'site-demo',
 readOnly:true,publicOrigin:'https://example.com/',blueprintSha256:'d'.repeat(64),
 periods,pages:[{pageId:'page-home',path:'/',periods:series}],
 actions:[],summary:{observedPagePeriodCells:2,unobservedPagePeriodCells:0}};
const workspace=WORK.build({firstSite:{summary,bundle,summarySha:sourceSha},
 search:{history,historySha}});
assert.equal(workspace.overview.launchIncluded,true);
assert.equal(workspace.overview.searchIncluded,true);
assert.equal(workspace.overview.technicalBlockers,1);
assert.equal(workspace.overview.releaseAuthorized,false);
assert(workspace.homeHtml.includes('launch.html'));
assert(workspace.homeHtml.includes('search.html'));
assert(workspace.launchHtml.includes('BLOCKED BY FIRST-SITE GATES'));
assert(workspace.searchHtml.includes('Search Operations Dashboard'));
assert.throws(()=>WORK.build({firstSite:{summary,summarySha:sourceSha},
 search:{history:{...history,siteId:'different-site'},historySha}}),/different customer sites/);
const only=WORK.build({firstSite:{summary,summarySha:sourceSha}});
assert.equal(only.overview.searchIncluded,false);
assert(!only.homeHtml.includes('search.html'));
process.stdout.write('Unified private SEO operator workspace smoke PASS.\n');
