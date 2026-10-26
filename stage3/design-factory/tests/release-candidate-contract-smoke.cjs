#!/usr/bin/env node
'use strict';
// Focused contract tests for the D7 orchestration gate. This is safe inside
// release-audit because it never launches release-candidate.cjs recursively.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {walk,manifestForDesignFactory,manifestDigest}=require('../lib/source-manifest.cjs');
const {sourceFingerprint,inputPaths}=require('../lib/render-source-fingerprint.cjs');
const {captureExternalInputs,sameExternalInputs,sameExternalInputContent,
 createExternalInputSnapshot,removeExternalInputSnapshot}=require('../lib/external-input-manifest.cjs');
const {options,expectedAuditChecks,auditReportIsValid,localAuditStillMatches}=
 require('../bin/release-candidate.cjs');
const ROOT=path.resolve(__dirname,'..'),REPO=path.resolve(ROOT,'../..');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const entries=walk(ROOT),manifest=manifestForDesignFactory(ROOT);
function exerciseExternalInputManifest(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-external-inputs-'));
 let snapshotRoot=null;
 try{
  const sdk=path.join(dir,'sdk'),php=path.join(dir,'DesignGraph.php');
  fs.mkdirSync(sdk);
  const contract=path.join(sdk,'contract.cjs'),graph=path.join(sdk,'design-graph.cjs');
  const contractBytes=Buffer.from("'use strict'; module.exports={version:1};\n");
  const graphBytes=Buffer.from("'use strict'; module.exports={render(){return '';}};\n");
  fs.writeFileSync(contract,contractBytes);fs.writeFileSync(graph,graphBytes);
  fs.writeFileSync(path.join(sdk,'README.md'),'fixture SDK docs\n');
  fs.writeFileSync(php,'<?php // fixture\n');
  const base=captureExternalInputs(sdk,php);
  assert.equal(base.sdkFiles.length,3,'Fingerprint every regular SDK file, not just the entry points');
  assert.equal(base.phpFile.path,php);
  assert.match(base.sha256,/^[a-f0-9]{64}$/);
  assert.equal(sameExternalInputs(base,captureExternalInputs(sdk,php)),true,
   'Same SDK/PHP bytes and canonical paths must have a stable fingerprint');
  snapshotRoot=path.join(dir,'isolated-snapshot');fs.mkdirSync(snapshotRoot,{mode:0o700});
  const snapshot=createExternalInputSnapshot(base,snapshotRoot);
  const frozen=captureExternalInputs(snapshot.sdkPath,snapshot.phpFile);
  assert.equal(sameExternalInputContent(base,frozen),true,
   'The sealed isolated snapshot must match every original SDK/PHP byte');
  assert.equal((fs.statSync(path.join(snapshot.sdkPath,'contract.cjs')).mode&0o222),0,
   'Snapshot files must be read-only while compatibility checks consume them');
  fs.writeFileSync(contract,Buffer.concat([contractBytes,Buffer.from('// concurrent change\n')]));
  assert.equal(sameExternalInputs(base,captureExternalInputs(sdk,php)),false,
   'Changing the external checkout after snapshot creation must be detectable');
  assert.equal(sameExternalInputContent(base,captureExternalInputs(snapshot.sdkPath,snapshot.phpFile)),true,
   'The test snapshot must remain byte-identical even if the external checkout changes');
  fs.writeFileSync(contract,contractBytes);
  assert.equal(sameExternalInputs(base,captureExternalInputs(sdk,php)),true,
   'Restoring the original external checkout must restore the original manifest');
  fs.writeFileSync(contract,Buffer.concat([contractBytes,Buffer.from('// changed\n')]));
  assert.equal(sameExternalInputs(base,captureExternalInputs(sdk,php)),false,
   'An SDK source edit must invalidate the original input fingerprint');
  fs.writeFileSync(contract,contractBytes);
  fs.writeFileSync(php,'<?php // changed fixture\n');
  assert.equal(sameExternalInputs(base,captureExternalInputs(sdk,php)),false,
   'A PHP renderer edit must invalidate the original input fingerprint');
  fs.writeFileSync(php,'<?php // fixture\n');
  const extra=path.join(sdk,'extra.json');fs.writeFileSync(extra,'{}\n');
  assert.equal(sameExternalInputs(base,captureExternalInputs(sdk,php)),false,
   'Added SDK files must invalidate the input fingerprint');
  fs.unlinkSync(extra);
  assert.equal(sameExternalInputs(base,captureExternalInputs(sdk,php)),true,
   'Restoring the exact SDK/PHP bytes must restore the original fingerprint');
  const outside=path.join(dir,'outside.cjs');fs.writeFileSync(outside,'module.exports={};\n');
  let canSymlink=true;
  try{fs.symlinkSync(outside,path.join(sdk,'linked.cjs'),'file');}
  catch(error){if(['EPERM','EACCES','ENOTSUP','EINVAL'].includes(error.code))canSymlink=false;else throw error;}
  if(canSymlink){
   assert.throws(()=>captureExternalInputs(sdk,php),/symlink is not allowed/,
    'SDK symlinks must be rejected');
   fs.unlinkSync(path.join(sdk,'linked.cjs'));
   const sdkAlias=path.join(dir,'sdk-alias');
   let directoryLink=true;
   try{fs.symlinkSync(sdk,sdkAlias,'dir');}
   catch(error){if(['EPERM','EACCES','ENOTSUP','EINVAL'].includes(error.code))directoryLink=false;else throw error;}
   if(directoryLink){
    assert.throws(()=>captureExternalInputs(sdkAlias,php),/canonical regular directory/,
     'A symlinked SDK root must be rejected');
    fs.unlinkSync(sdkAlias);
   }
   const phpAlias=path.join(dir,'DesignGraph-link.php');
   let phpLink=true;
   try{fs.symlinkSync(php,phpAlias,'file');}
   catch(error){if(['EPERM','EACCES','ENOTSUP','EINVAL'].includes(error.code))phpLink=false;else throw error;}
   if(phpLink){
    assert.throws(()=>captureExternalInputs(sdk,phpAlias),/canonical regular \.php file/,
     'A symlinked PHP renderer must be rejected');
    fs.unlinkSync(phpAlias);
   }
  }
  const deepSdk=path.join(dir,'deep-sdk');fs.mkdirSync(deepSdk);
  let nested=deepSdk;
  for(let i=0;i<34;i++){nested=path.join(nested,'d'+i);fs.mkdirSync(nested);}
  assert.throws(()=>captureExternalInputs(deepSdk),/maximum directory depth/,
   'Excessively deep SDK directory trees must be rejected before recursive traversal can exhaust the stack');
  const crowdedSdk=path.join(dir,'crowded-sdk');fs.mkdirSync(crowdedSdk);
  for(let i=0;i<1025;i++)fs.mkdirSync(path.join(crowdedSdk,'d'+String(i).padStart(4,'0')));
  assert.throws(()=>captureExternalInputs(crowdedSdk),/too many filesystem entries/,
   'Empty directories must count toward the total traversal budget');
  const invalidSdk=path.join(dir,'incomplete-sdk');fs.mkdirSync(invalidSdk);
  assert.throws(()=>captureExternalInputs(invalidSdk),/missing required runtime input/,
   'A purported SDK must contain both runtime entry points');
  assert.throws(()=>captureExternalInputs(sdk,path.join(dir,'not-php.txt')),/ENOENT|regular \.php file/,
   'A PHP parity input must be an existing regular PHP file');
 }finally{
  if(snapshotRoot&&fs.existsSync(snapshotRoot))removeExternalInputSnapshot(snapshotRoot);
  fs.rmSync(dir,{recursive:true,force:true});
 }
}
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
 const candidateSource=fs.readFileSync(path.join(ROOT,'bin/release-candidate.cjs'),'utf8');
 assert.ok(candidateSource.includes('createExternalInputSnapshot(baseline,leadSnapshotRoot)'),
  'Lead compatibility must consume a private snapshot, not the mutable external checkout');
 assert.ok(candidateSource.includes('DF_LEAD_SDK_DIR:snapshot.sdkPath'),
  'The Lead test environment must point at the isolated SDK copy');
 assert.ok(candidateSource.includes('sameExternalInputs(snapshotManifest,snapshotAfter)'),
  'The isolated copy must be re-fingerprinted after the compatibility test');
 assert.ok(candidateSource.includes('finalSnapshotStable'),
  'The isolated copy must remain stable through the complete candidate run');
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
 exerciseExternalInputManifest();
 console.log('DESIGN_FACTORY_D7_RELEASE_CONTRACT PASS: exact audit schema, bundle + 8-suite inventory, bounded traversal, source stability, isolated Lead snapshot/immutability/drift checks and visual-tooling fingerprint');
}catch(error){
 console.error('DESIGN_FACTORY_D7_RELEASE_CONTRACT FAIL: '+error.message);
 throw error;
}
