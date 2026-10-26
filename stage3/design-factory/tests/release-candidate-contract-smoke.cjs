#!/usr/bin/env node
'use strict';
// Focused contract tests for the D7 orchestration gate. This is safe inside
// release-audit because it never launches release-candidate.cjs recursively.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {walk,manifestForDesignFactory,manifestDigest}=require('../lib/source-manifest.cjs');
const {sourceFingerprint,inputPaths}=require('../lib/render-source-fingerprint.cjs');
const {options,expectedAuditChecks,auditReportIsValid,localAuditStillMatches}=
 require('../bin/release-candidate.cjs');
const ROOT=path.resolve(__dirname,'..'),REPO=path.resolve(ROOT,'../..');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const entries=walk(ROOT),manifest=manifestForDesignFactory(ROOT);
const auditSource=fs.readFileSync(path.join(ROOT,'bin/release-audit.cjs'),'utf8');
function fixture(chromium=false){
 const checks=expectedAuditChecks(chromium).map(suite=>({suite,passed:true,exitCode:0,error:null,
  stdout:chromium&&suite==='studio-smoke.cjs'?'DESIGN_FACTORY_D5_CHROMIUM PASS':
   chromium&&suite==='visual-pipe-smoke.cjs'?'DESIGN_FACTORY_D7_VISUAL_PIPE PASS':''}));
 return {format:'manufact-design-factory-release-check-v2',version:2,
  fileCount:entries.length,sourceManifest:structuredClone(manifest),
  sourceManifestSha256:manifestDigest(manifest),checks,nodePassed:true,
  browserRequested:chromium,browserPassed:chromium,
  automatedChecksPassed:chromium,humanVisualAcceptance:'pending',releaseReady:false};
}
try{
 assert.equal(expectedAuditChecks(false).length,10,'bundle parity, eight Node suites and final inventory stability');
 assert.ok(expectedAuditChecks(false).includes('source-inventory-stability'));
 assert.equal(expectedAuditChecks(true).length,11,'Chromium adds exactly the visual pipe suite');
 assert.equal(manifest.length,entries.length,'Release manifest must cover every packaged file');
 assert.ok(manifest.some(item=>item.path.startsWith('handoffs/')),'Handoff documentation is part of the packaged source inventory');
 assert.ok(auditSource.includes('inventoryStable=sameManifest(entries,finalEntries)'), 'Final stability gate must compare every file, including handoffs');
 const base=fixture(false);
 assert.equal(auditReportIsValid(base,false),true);
 assert.equal(localAuditStillMatches(base),true);
 const browser=fixture(true);
 assert.equal(auditReportIsValid(browser,true),true);
 assert.equal(localAuditStillMatches(browser),true);
 for(const [label,mutate] of [
  ['missing suite',x=>x.checks.pop()],
  ['duplicate/wrong suite',x=>{x.checks[1].suite=x.checks[0].suite;}],
  ['failed check with contradictory summary',x=>{x.checks[0].passed=false;}],
  ['contradictory exit code',x=>{x.checks[0].exitCode=2;}],
  ['wrong source digest',x=>{x.sourceManifestSha256='0'.repeat(64);}],
  ['false release-ready claim',x=>{x.releaseReady=true;}],
  ['wrong browser request',x=>{x.browserRequested=true;}],
  ['unsafe manifest path',x=>{x.sourceManifest[0].path='../outside.cjs';x.sourceManifestSha256=manifestDigest(x.sourceManifest);}]
 ]){
  const candidate=structuredClone(base);mutate(candidate);
  assert.equal(auditReportIsValid(candidate,false),false,label);
 }
 const failedAudit=structuredClone(base);
 failedAudit.checks[0].passed=false;failedAudit.checks[0].exitCode=1;
 failedAudit.nodePassed=false;failedAudit.automatedChecksPassed=false;
 assert.equal(auditReportIsValid(failedAudit,false),true,'A failed but internally consistent audit is a valid report, not a malformed report');
 assert.equal(localAuditStillMatches(failedAudit),true,'A failed test must not be misreported as source drift when the manifest is unchanged');
 const failedBrowser=structuredClone(browser);
 const failedVisual=failedBrowser.checks.find(x=>x.suite==='visual-pipe-smoke.cjs');
 failedVisual.passed=false;failedVisual.exitCode=1;failedVisual.stdout='';
 failedBrowser.nodePassed=false;failedBrowser.browserPassed=false;failedBrowser.automatedChecksPassed=false;
 assert.equal(auditReportIsValid(failedBrowser,true),true,'Browser failure should be recorded as a failed gate, not invalid schema');
 assert.equal(localAuditStillMatches(failedBrowser),true,'Browser failure must not imply source changed');
 for(const [label,mutate] of [
  ['removed source entry',x=>{x.sourceManifest.pop();x.fileCount--;x.sourceManifestSha256=manifestDigest(x.sourceManifest);}],
  ['unreviewed extra source entry',x=>{x.sourceManifest.push({path:'extra.cjs',bytes:1,sha256:'0'.repeat(64)});x.fileCount++;x.sourceManifestSha256=manifestDigest(x.sourceManifest);}],
  ['changed source digest',x=>{x.sourceManifest[0].sha256='0'.repeat(64);x.sourceManifestSha256=manifestDigest(x.sourceManifest);}]
 ]){
  const candidate=structuredClone(base);mutate(candidate);
  assert.equal(auditReportIsValid(candidate,false),true,label+' should be structurally valid');
  assert.equal(localAuditStillMatches(candidate),false,label+' must fail exact current-source comparison');
 }
 assert.deepEqual(options(['--out','/tmp/df-candidate','--chromium','/usr/bin/chromium']),
  {out:'/tmp/df-candidate',chromium:'/usr/bin/chromium',leadSdk:null,leadPhp:null,evidence:null,review:null});
 assert.throws(()=>options(['--chromium','/usr/bin/chromium']),/Expected --out/);
 assert.throws(()=>options(['--out','/tmp/df','--out','/tmp/other']),/Usage/);
 assert.throws(()=>options(['--out','/tmp/df','--lead-php','/tmp/Graph.php']),/requires --lead-sdk/);
 assert.throws(()=>options(['--out','/tmp/df','--review','/tmp/review.json']),/requires --evidence/);
 const handoffIndex=base.sourceManifest.findIndex(item=>item.path.startsWith('handoffs/'));
 assert.notEqual(handoffIndex,-1,'Audit manifest must include handoff documentation');
 const handoffTampered=structuredClone(base);
 handoffTampered.sourceManifest[handoffIndex].sha256='0'.repeat(64);
 handoffTampered.sourceManifestSha256=manifestDigest(handoffTampered.sourceManifest);
 assert.equal(auditReportIsValid(handoffTampered,false),true,'Changed handoff manifest remains structurally well formed');
 assert.equal(localAuditStillMatches(handoffTampered),false,'Handoff byte changes between audit and packaging must invalidate the candidate');
 const inputs=inputPaths(REPO);
 for(const required of [
  'stage3/sdk/contract.cjs','stage3/components/image-showcase.json',
  'stage3/design-factory/bin/visual-qa.cjs',
  'stage3/design-factory/lib/chromium-pipe.cjs',
  'stage3/design-factory/lib/visual-review.cjs',
  'stage3/design-factory/studio/runtime.generated.js'
 ])assert.ok(inputs.includes(required),'Fingerprint must bind '+required);
 assert.equal(sourceFingerprint(REPO),sourceFingerprint(REPO),'Fingerprint must be deterministic');
 console.log('DESIGN_FACTORY_D7_RELEASE_CONTRACT PASS: exact audit schema, bundle + 8-suite inventory + final source stability, optional Chromium inventory, source additions/removals/tampering, option validation and complete visual-tooling fingerprint');
}catch(error){
 console.error('DESIGN_FACTORY_D7_RELEASE_CONTRACT FAIL: '+error.message);
 throw error;
}
