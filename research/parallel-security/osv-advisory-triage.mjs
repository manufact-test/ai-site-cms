#!/usr/bin/env node
// Independently check a complete OSV JSON transcript, including advisories.
// Never performs network calls, never writes project files, no auto-upgrades.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyOsvEvidence} from './online-evidence-proof.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2);
const historical=args.includes('--historical');
const candidates=args.filter(x=>x!=='--historical');
if(candidates.length!==1||args.length!==(historical?2:1)||
   !path.isAbsolute(candidates[0])||args.some(x=>x.startsWith('--')&&x!=='--historical')){
  console.error('Usage: node osv-advisory-triage.mjs /absolute/path/to/osv-exact-43.json [--historical]');
  process.exitCode=2;
}else{
  try{
    const file=candidates[0],s=fs.lstatSync(file);
    if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<3||s.size>3*1024*1024)
      throw Error('Unsafe input: require a bounded independent regular OSV JSON evidence file');
    const bytes=fs.readFileSync(file);
    if(bytes.byteLength!==s.size)throw Error('OSV evidence changed during read');
    const evidence=verifyOsvEvidence(bytes.toString('utf8'),root,
      {allowFindings:true,historical});
    const result={
      schema:'ai-site-cms-researched-osv-triage-v1',
      status:evidence.advisoryReferences?'needs-human-triage':'no-database-advisories-at-checked-time',
      inputSha256:crypto.createHash('sha256').update(bytes).digest('hex'),
      checkedAt:evidence.checkedAt,generatedAt:new Date().toISOString(),
      historicalSnapshot:historical,
      verifiedExactPins:43,lockSha256:evidence.lockSha256,
      packagesWithAdvisories:evidence.packagesWithAdvisories,
      advisoryReferences:evidence.advisoryReferences,
      findings:evidence.findings,
      liveNetworkCallMade:false,
      humanReviewCompleted:false,
      securityApproved:false,legalApproved:false,stage2Accepted:false,
      caveat:'Only independently reconciles saved OSV response against CURRENT exact locks. Does not prove its authenticity, authorize deployment, or rerun OSV.'
    };
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(result.advisoryReferences>0)process.exitCode=4;
  }catch(e){
    console.error('OSV_TRIAGE_UNVERIFIED '+String(e.message||e));
    process.exitCode=3;
  }
}