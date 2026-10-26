#!/usr/bin/env node
'use strict';
// D7 one-command integration smoke; execute manually on the real feature checkout.
// Not part of release-audit (it invokes release-audit itself; avoid recursion).
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const cp=require('node:child_process'),crypto=require('node:crypto');
const {verify}=require('../bin/verify-release-zip.cjs');
const {sourceFingerprint}=require('../lib/render-source-fingerprint.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'df-release-pipeline-'));
const target=path.join(dir,'candidate');
try{
 const script=path.resolve(__dirname,'../bin/release-candidate.cjs');
 const cmd=cp.spawnSync(process.execPath,[script,'--out',target],{
  encoding:'utf8',timeout:900000,maxBuffer:1024*1024});
 assert.equal(cmd.status,3,'Without Chromium/Lead PHP/review, candidate must be a verified engineering package but NOT an accepted D7 release: '+cmd.stderr+' '+cmd.stdout);
 const report=JSON.parse(fs.readFileSync(path.join(target,'release-candidate.json'),'utf8'));
 const audit=JSON.parse(fs.readFileSync(path.join(target,'node-audit.json'),'utf8'));
 assert.equal(audit.nodePassed,true,'Bundle parity, eight Node suites and source stability must pass on a real checkout');
 assert.equal(report.format,'manufact-design-factory-release-candidate-v2');
 assert.equal(report.version,2);
 assert.equal(report.renderSourceSha256,sourceFingerprint(path.resolve(__dirname,'../../..')));
 assert.equal(report.node.status,'pass');
 assert.equal(report.leadInputs.status,'not-configured');
 assert.equal(report.node.suites,8,'Exactly eight stable Node suites must run');
 assert.equal(report.node.checks,10,'Bundle parity + eight suites + final source stability');
 assert.equal(report.bundleParity.status,'pass');
 assert.equal(report.gate.bundleParity,true);
 assert.equal(audit.checks.at(-1).suite,'source-inventory-stability');
 assert.equal(audit.checks.at(-1).passed,true);
 assert.equal(report.git.stable,true);
 assert.equal(report.gate.gitVerified,true);
 assert.equal(report.zip.status,'pass');
 assert.equal(report.gate.node,true);
 assert.equal(report.gate.sourceExact,true);
 assert.equal(report.gate.chromium,false);
 assert.equal(report.gate.fullVisualMatrix,false);
 assert.equal(report.gate.phpParity,false);
 assert.equal(report.gate.readyForLeadReview,false);
 assert.equal(report.gate.productionReady,false);
 assert.equal(report.gate.stage2,'NO-GO');
 assert.equal(report.gate.mandatoryAccepted,'0/135');
 assert.equal(report.zip.sourceUnchangedSinceNodeAudit,true);
 const zip=path.join(target,'design-factory-candidate.zip');
 const actual=verify(zip);
 assert.equal(actual.zipSha256,report.zip.sha256);
 assert.equal(actual.sourceSha256,report.zip.sourceSha256);
 assert.equal(sha(fs.readFileSync(zip)),report.zip.sha256);
 const oldReport=fs.readFileSync(path.join(target,'release-candidate.json'));
 const repeat=cp.spawnSync(process.execPath,[script,'--out',target],{encoding:'utf8'});
 assert.notEqual(repeat.status,0,'Pipeline must refuse to replace existing candidate');
 assert.deepEqual(fs.readFileSync(path.join(target,'release-candidate.json')),oldReport);
 const bad=path.join(dir,'mutated.zip'),bytes=Buffer.from(fs.readFileSync(zip));
 bytes[bytes.length-22+8]^=1;
 fs.writeFileSync(bad,bytes);
 assert.throws(()=>verify(bad),/Central directory count\/bounds mismatch/);
 console.log('DESIGN_FACTORY_D7_RELEASE_PIPELINE PASS: real checkout eight-suite Node audit plus bundle parity, candidate archive, independent SHA256/source/CRC verification, explicit pending gates and no overwrite');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
