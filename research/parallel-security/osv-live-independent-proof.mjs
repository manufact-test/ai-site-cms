#!/usr/bin/env node
// Optional *real* 43/43 OSV HTTPS query performed in disposable CI only.
// Non-changing original locks; exact response independently reconciled.
// A complete query with advisories means HUMAN TRIAGE, not security clearance.
import cp from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyFrozenLocks} from './frozen-lock-baseline.mjs';
import {verifyOsvEvidence} from './online-evidence-proof.mjs';

const dirname=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dirname,'../..');
const blocker=(reason)=>{console.error('OSV_LIVE_NETWORK_BLOCKED: '+reason);process.exitCode=3};
const failure=(reason)=>{console.error('OSV_LIVE_EVIDENCE_INVALID: '+reason);process.exitCode=1};
if(process.argv.length!==2){
  console.error('Usage: node osv-live-independent-proof.mjs (public OSV API; no modification/install)');
  process.exitCode=2;
}else{
  try{
    const frozenBefore=verifyFrozenLocks(root);
    const r=cp.spawnSync(process.execPath,[path.join(dirname,'osv-strict-snapshot.mjs')],{
      cwd:root,encoding:'utf8',timeout:93000,maxBuffer:4*1024*1024,
      env:{...process.env}
    });
    const stderr=(r.stderr||'').slice(-800);
    if(r.error||r.signal)blocker('OSV HTTPS request interrupted or timed out; no query outcome accepted');
    else if(r.status!==0){
      if(/fetch failed|ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|OSV HTTP (?:403|408|429|500|502|503|504)/i.test(stderr))
        blocker('OSV network/API temporarily unavailable; no coverage assumed');
      else failure('OSV strict 43-row client rejected remote response: '+stderr);
    }else{
      const proof=verifyOsvEvidence(r.stdout,root,{allowFindings:true});
      const frozenAfter=verifyFrozenLocks(root);
      if(JSON.stringify(frozenBefore.sha256)!==JSON.stringify(frozenAfter.sha256)||
          proof.covered!==43||proof.lockSha256['cms/composer.lock']!==frozenBefore.sha256['cms/composer.lock']||
          proof.lockSha256['cms/editor/package-lock.json']!==frozenBefore.sha256['cms/editor/package-lock.json'])
        throw Error('original Composer/npm byte evidence changed during remote OSV query');
      const result={
        schema:'ai-site-cms-real-osv-exact-lock-43-v1',
        observedActualLiveHTTPS:true,source:'https://api.osv.dev/v1/querybatch',
        checkedAt:proof.checkedAt,completedPinCoverage:proof.covered,
        composerPackages:14,npmPackages:29,
        exactLockSha256:proof.lockSha256,
        underlyingOsvReportSha256:crypto.createHash('sha256').update(r.stdout,'utf8').digest('hex'),
        packagesWithAdvisories:proof.packagesWithAdvisories,
        advisoryReferences:proof.advisoryReferences,findings:proof.findings,
        noSecurityApproval:true,advisoryHumanTriageCompleted:false,
        legalReviewed:false,stage2Accepted:false,productionApproved:false,
        caveat:'One observed point-in-time live database response, not an independent vulnerability disclosure census; all findings require qualified human triage.'
      };
      console.log(JSON.stringify(result));
      console.log('REAL OSV HTTPS querybatch PASS 43 exact pins; '+
        result.advisoryReferences+' advisory references across '+
        result.packagesWithAdvisories+' packages; exact source lock SHA256 matched; reportSHA256='+result.underlyingOsvReportSha256+'; HUMAN TRIAGE REQUIRED, NOT production approval');
    }
  }catch(e){failure(String(e.message||e));}
}
