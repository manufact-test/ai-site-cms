#!/usr/bin/env node
'use strict';
// Focused contract tests for the D7 orchestration gate. This is safe inside
// release-audit because it never launches release-candidate.cjs recursively.
const assert=require('node:assert/strict');
const path=require('node:path'),crypto=require('node:crypto');
const {walk,manifestForDesignFactory,manifestDigest}=require('../lib/source-manifest.cjs');
const {sourceFingerprint,inputPaths}=require('../lib/render-source-fingerprint.cjs');
const {options,expectedAuditChecks,auditReportIsValid,localAuditStillMatches}=
 require('../bin/release-candidate.cjs');
const ROOT=path.resolve(__dirname,'..'),REPO=path.resolve(ROOT,'../..');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const entries=walk(ROOT),manifest=manifestForDesignFactory(ROOT);
function fixture(chromium=false){
 const checks=expectedAuditChecks(chromium).map(suite=>({suite,passed:true,exitCode:0}));
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
 const base=fixture(false);
 assert.equal(auditReportIsValid(base,false),true);
 assert.equal(localAuditStillMatches(base),true);
 const browser=fixture(true);
 assert.equal(auditReportIsValid(browser,true),true);
 assert.equal(localAuditStillMatches(browser),true);
 for(const [label,mutate] of [
  ['missing suite',x=>x.checks.pop()],
  ['duplicate/wrong suite',x=>{x.checks[1].suite=x.checks[0].suite;}],
  ['failed check',x=>{x.checks[0].passed=false;}],
  ['wrong source digest',x=>{x.sourceManifestSha256='0'.repeat(64);}],
  ['false release-ready claim',x=>{x.releaseReady=true;}],
  ['wrong browser request',x=>{x.browserRequested=true;}],
  ['unsafe manifest path',x=>{x.sourceManifest[0].path='../outside.cjs';x.sourceManifestSha256=manifestDigest(x.sourceManifest);}]
 ]){
  const candidate=structuredClone(base);mutate(candidate);
  assert.equal(auditReportIsValid(candidate,false),false,label);
 }
 for(const [label,mutate] of [
  ['removed source entry',x=>{x.sourceManifest.pop();x.sourceManifestSha256=manifestDigest(x.sourceManifest);}],
  ['unreviewed extra source entry',x=>{x.sourceManifest.push({path:'extra.cjs',bytes:1,sha256:'0'.repeat(64)});x.sourceManifestSha256=manifestDigest(x.sourceManifest);}],
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
