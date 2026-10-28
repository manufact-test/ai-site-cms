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
assert.equal(migrated.summary.noLongerObservedOccurrences,1); // semantics removed; not verified repair
assert.ok(migrated.comparisonCoverage.noLongerInstrumented.includes('localPhpStaticExport'));
assert.ok(migrated.comparisonCoverage.newlyInstrumented.includes('localPhpStaticExport'));
console.log('First-site delta group/identity/changed-version smoke PASS');
