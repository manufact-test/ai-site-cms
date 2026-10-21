#!/usr/bin/env node
// Validate a SAVED, REAL integrator-owned GitHub Actions stdout extract.
// IMPORTANT: This verifies archived JSON and exact archived Git blob, NOT a
// second PHP execution, signed GitHub attestation, independently vetted source
// tree, or approval of production/Hostinger/legal distribution.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
export const ARCHIVE=path.join(here,'fixtures/archived-main-real-no-sodium-ci.json');
export const PINNED_ARCHIVE_BLOB='1b95e040aead41a30cb01fd814aff009a0b41f22';
const ORIGIN={
 repo:'manufact-test/ai-site-cms',runId:39571456888,jobId:119126388264,
 jobName:'Real Sodium-free PHP 8.3 Ed25519 candidate (CI-only)',
 headSha:'59c5289b74cf85859711d9a248af8efe0762cd10',
 workflowPath:'.github/workflows/stage2-core-bootstrap.yml',conclusion:'success',
 workflowBlobSha:'8098aaccd3c9184dfc063c9ca6cb84c8b59fca3d',
 runnerBlobSha:'2f06f692b982dca574880283101bf05e491c2e98',
 signedChainBlobSha:'9243b7ed1fd7ad3778e4ddbd41e0e3107cb5faee',
 rotationBlobSha:'6c6dbe7e0aa39de18d28094f5aabaaf990ecfc03',
 url:'https://github.com/manufact-test/ai-site-cms/actions/runs/39571456888/job/119126388264'
};
const RAW_CLASS={
 actualMainCiRecordedNoNative:true,independentlyReexecutedBySecurityPr:false,
 wholeTreeIndependentExternalHashAttested:false,targetHostTested:false,
 commercialLicenseApproved:false,researchSecurityApproved:false,
 stage2Accepted:false,productionApproved:false
};
function requireProof(ok,msg){if(!ok)throw Error('UPSTREAM_MAIN_CI_EVIDENCE_UNVERIFIED: '+msg);}
function equal(v,target,field){requireProof(v===target,field+' mismatch');}
function exactObject(obj,fields,label){
  requireProof(obj&&typeof obj==='object'&&!Array.isArray(obj),label+' must be an object');
  const left=Object.keys(obj).sort(),right=Object.keys(fields).sort();
  requireProof(JSON.stringify(left)===JSON.stringify(right),label+' field-set mismatch');
  for(const [key,value] of Object.entries(fields))equal(obj[key],value,label+'.'+key);
}
function exactSimpleFields(obj,template,label){
  requireProof(obj&&typeof obj==='object'&&!Array.isArray(obj),label+' object missing');
  for(const [k,v] of Object.entries(template))equal(obj[k],v,label+'.'+k);
}
function stringArrayMatch(actual,expected,label){
  requireProof(Array.isArray(actual)&&JSON.stringify(actual)===JSON.stringify(expected),
    label+' changed');
}
export function checkArchivedMainEvidence(document){
  requireProof(document?.schema==='ai-site-cms-archived-main-sodium-ci-evidence-v1',
    'archive schema mismatch');
  exactObject(document.origin,ORIGIN,'origin');
  exactObject(document.classification,RAW_CLASS,'classification');
  equal(document.logExcerpt?.format,
    'Job-log JSON stdout, original field order and values, GitHub timestamp prefixes removed',
    'log format');
  const raw=document.logExcerpt?.stdout;
  requireProof(typeof raw==='string'&&raw.length>600&&raw.length<20000,
    'saved raw CI JSON excerpt missing or outside bounded limits');
  let p;
  try{p=JSON.parse(raw);}
  catch{throw Error('UPSTREAM_MAIN_CI_EVIDENCE_UNVERIFIED: incomplete JSON excerpt');}
  requireProof(p&&typeof p==='object'&&!Array.isArray(p),'CI JSON root');
  exactSimpleFields(p,{
    evidence:'true-sodium-absent-php83',php:'8.3.6',bits:64,
    extensionLoadedBeforeCandidate:false,
    candidate:'paragonie/sodium_compat',version:'v2.5.2',
    sourceReference:'3246b36803c177847e677862fedeb7f937869adb',
    license:'ISC',absentVerification:'fail_closed',
    rfc8032:'passed',signedEnvelopeAdversarial:'passed',
    productionLockChanged:false,hostingerTested:false,
    publisherKeyOwnershipVerified:false,licenseApproved:false,
    cryptographicReviewApproved:false,stage2Accepted:false
  },'actual_main_CI');
  const chain=p.completeSignedChainParity,rotation=p.trustKeyRotationParity;
  exactSimpleFields(chain,{
    evidence:'signed-permit-receipt-settlement-parity',checks:33,
    nativePHP:80335,noSodiumPHP:80306,sameSignedBytes:true,
    sameSignedHead:true,policy:'original CMS PHP',
    hostingerTested:false,publisherIdentityIndependentlyVerified:false,
    stage2Accepted:false
  },'signed_chain');
  stringArrayMatch(chain.signatureBackends,['native','pinned userland 2.5.2'],
    'signed chain independently executed backend names');
  exactSimpleFields(rotation,{
    evidence:'stage2-byte-identical-double-signed-rotation',checks:55,
    nativePHP:80335,noSodiumPHP:80306,sameNodeSignedEvidence:true,
    trustRootPinned:true,externalMinimumEpoch:true,retiredKeysRefused:true,
    ambiguousJournalRejected:true,backendParity:true,
    hostingerTested:false,realPublisherIdentityProven:false,
    cryptographicReviewApproved:false,stage2Accepted:false
  },'trust_rotation');
  const perf=p.performance;
  exactSimpleFields(perf,{
    backend:'compat',testVector:'RFC8032/test1',checks:'passed',
    verifications:8,performance:'local-not-target-host',
    productionApproved:false
  },'performance');
  requireProof(Number.isFinite(perf.totalMs)&&perf.totalMs>0&&perf.totalMs<120000,
    'invalid benchmark duration');
  requireProof(Number.isFinite(perf.meanMs)&&perf.meanMs>0&&
    Math.abs(perf.meanMs*8-perf.totalMs)<0.01,
    'benchmark arithmetic mismatch');
  return {
    evidence:'archived genuine main-CI true-no-native PHP 8.3 positive record',
    php:p.php,nativeSodiumLoaded:false,
    originalMainCommit:ORIGIN.headSha,
    githubActionsRun:ORIGIN.runId,job:ORIGIN.jobId,
    signedChainChecks:chain.checks,trustRotationChecks:rotation.checks,
    sourceTreeIndependentlyAttested:false,
    reexecutedInThisSecurityJob:false,
    productionApproved:false,licenseApproved:false,stage2Accepted:false
  };
}
function blobSha(bytes){
  return crypto.createHash('sha1')
    .update(Buffer.from('blob '+bytes.length)).update(Buffer.from([0])).update(bytes).digest('hex');
}
export function readPinnedArchive(file=ARCHIVE){
  requireProof(file===ARCHIVE,'only the committed known archive is permitted');
  const st=fs.lstatSync(file);
  requireProof(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&
    st.size>=500&&st.size<=20000,'unsafe archived evidence file');
  const bytes=fs.readFileSync(file);
  requireProof(bytes.length===st.size&&blobSha(bytes)===PINNED_ARCHIVE_BLOB,
    'saved main CI evidence Git blob changed');
  let doc;try{doc=JSON.parse(bytes.toString('utf8'));}
  catch{throw Error('UPSTREAM_MAIN_CI_EVIDENCE_UNVERIFIED: invalid archive JSON');}
  return checkArchivedMainEvidence(doc);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==2){
    console.error('Usage: node archived-main-sodium-proof.mjs (read-only pinned built-in CI excerpt)');
    process.exitCode=2;
  }else{
    try{
      const result=readPinnedArchive();
      console.log(JSON.stringify(result));
      console.log('Archived real main GitHub CI sodium-free evidence PASS 33 chain + 55 rotation checks; ARCHIVE ONLY, NOT independent source-tree audit, Security CI runtime or production approval');
    }catch(e){
      console.error(String(e.message||e));process.exitCode=3;
    }
  }
}
