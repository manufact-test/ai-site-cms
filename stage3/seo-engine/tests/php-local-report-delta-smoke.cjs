'use strict';
// Focused regression of honest source-scoped report comparisons.
const assert=require('node:assert/strict');
const {build}=require('../lib/first-site-report-delta.cjs');
const SOURCE='manufact-seo-first-site-check-v1',BUNDLE='manufact-seo-review-bundle-v1';
const code=(key,extra={})=>({code:key,severity:'error',pageId:'home',path:'/',...extra});
const bundle=(version,includeSemantics,includeExport=true)=>({
 format:BUNDLE,siteId:'pilot',readOnly:true,
 release:{blockers:includeSemantics?[{gateId:'local-php-semantic-and-route-integrity',taskIds:[]}]:[]},
 localPhpHead:{findings:[]},
 ...(includeSemantics?{localPhpSemantics:{findings:[code('php-semantic:broken-local-fragment',{href:'/missing',fragment:'nope'})]}}:{}),
 ...(includeExport?{localPhpStaticExport:{publishedVersion:version,
  findings:[code('php-export:page-content-drift',{field:'title'})]}}:{})
});
const summary=version=>({format:SOURCE,siteId:'pilot',sourceSiteSha256:'a'.repeat(64),
 packageVersion:2,origin:'http://127.0.0.1:9001/published/pilot/',
 publishedVersion:version,capturedAt:'2026-10-28T20:00:00Z'});
const previous={summary:summary(1),bundle:bundle(1,false)};
const now=build(previous,summary(1),bundle(1,true));
assert.ok(now.comparisonCoverage.newlyInstrumented.includes('localPhpSemantics'));
assert.equal(now.summary.newFindingOccurrences,0);
assert.ok(now.gates.notComparable.includes('local-php-semantic-and-route-integrity'));
const same=build({summary:summary(1),bundle:bundle(1,true)},summary(1),bundle(1,true));
assert.equal(same.summary.newFindingOccurrences,0);
assert.equal(same.summary.noLongerObservedOccurrences,0);
assert.equal(same.summary.staticExportVersionsComparable,true);
const migrated=build({summary:summary(1),bundle:bundle(1,true)},summary(2),bundle(2,false));
assert.equal(migrated.summary.staticExportVersionsComparable,false);
assert.equal(migrated.summary.noLongerObservedOccurrences,0); // only incomparable cohorts; no false resolution
assert.ok(migrated.comparisonCoverage.noLongerInstrumented.includes('localPhpStaticExport'));
assert.ok(migrated.comparisonCoverage.newlyInstrumented.includes('localPhpStaticExport'));

const pReport={...bundle(1,true),deliveryEvidence:{findings:[code('delivery:non-success-status')]}};
const pSummary={...summary(1),publicTranscript:{httpsOriginClaim:'https://a.test/'}};
const nReport={...bundle(1,true),deliveryEvidence:{findings:[]}};
const nSummary={...summary(1),publicTranscript:{httpsOriginClaim:'https://b.test/'}};
const crossHost=build({summary:pSummary,bundle:pReport},nSummary,nReport);
assert.equal(crossHost.summary.noLongerObservedOccurrences,0);
assert.equal(crossHost.summary.publicEvidenceOriginsComparable,false);
assert.ok(crossHost.gates.notComparable.length===0);
const sameHost=build({summary:pSummary,bundle:pReport},
 {...nSummary,publicTranscript:{httpsOriginClaim:'https://a.test/'}},nReport);
assert.equal(sameHost.summary.noLongerObservedOccurrences,1);

const etagOld={...bundle(1,true),localPhpHead:{pages:[{
 pageId:'home',path:'/',etag:'"cms3-same"',phpHtmlSha256:'a'.repeat(64)}],findings:[]}};
const etagNew={...bundle(1,true),localPhpHead:{pages:[{
 pageId:'home',path:'/',etag:'"cms3-same"',phpHtmlSha256:'b'.repeat(64)}],findings:[]}};
const cacheConflict=build({summary:summary(1),bundle:etagOld},summary(1),etagNew);
assert.equal(cacheConflict.summary.sameEtagButDifferentHtml,1);
assert.equal(cacheConflict.phpCacheObservations.etagContentConflicts.length,1);
assert.equal(cacheConflict.phpBuildIdentityVerified,false);
const etagMoved={...bundle(1,true),localPhpHead:{pages:[{
 pageId:'home',path:'/',etag:'"cms3-new"',phpHtmlSha256:'a'.repeat(64)}],findings:[]}};
const configShift=build({summary:summary(1),bundle:etagOld},summary(1),etagMoved);
assert.equal(configShift.summary.observedPhpEtagOrHtmlChanges,1);
assert.equal(configShift.summary.sameEtagButDifferentHtml,0);
console.log('First-site delta group/identity/changed-version smoke PASS');
