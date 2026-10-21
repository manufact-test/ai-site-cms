#!/usr/bin/env node
// Validate genuine current main PHP code in an ephemeral Git checkout.
// Forced class dispatch STILL uses native Sodium; no production approval.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const url='https://github.com/manufact-test/ai-site-cms.git';
const sourceDir='cms/src/Release/';
const names=['OfflineReleaseVerifier.php','TrustedChainVerifier.php',
 'LabPreauthorizedUpgradeGate.php','LabAttestedActivationGate.php',
 'LabSettledUpgradeGate.php','Ed25519Backend.php'];
const harness=['ed25519-callsite-audit.php','chain-backend-regression.mjs',
 'chain-backend-verifier.php','class-only-ed25519-shim.php'];
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length))
 .update(Buffer.from([0])).update(b).digest('hex');
const env={...process.env,GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'};
function run(command,args,cwd,timeout=30000){
 const r=cp.spawnSync(command,args,{cwd,env,encoding:'utf8',timeout,maxBuffer:3000000});
 if(r.error||r.signal||r.status!==0)throw Error((r.error?.message||r.stderr||r.stdout||'command failed').slice(-1000));
 return r.stdout.trim();
}
function main(){
 const m=/^([a-f0-9]{40})\s+refs\/heads\/main$/.exec(run('git',['ls-remote','--exit-code',url,'refs/heads/main']));
 if(!m)throw Error('unrecognized remote main head');
 return m[1];
}
let temporary;
try{
 if(process.argv.length!==2)throw Error('Usage: node main-head-independent-proof.mjs');
 const head=main();
 temporary=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-live-main-proof-'));
 const root=path.join(temporary,'main');
 run('git',['clone','--quiet','--depth','1','--single-branch','--branch','main','--no-tags',url,root],undefined,90000);
 if(run('git',['rev-parse','HEAD'],root)!==head)throw Error('main moved during checkout');
 const hashes={};
 for(const n of names){
   const f=path.join(root,sourceDir+n),stat=fs.lstatSync(f);
   const sha=run('git',['rev-parse','HEAD:'+sourceDir+n],root);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size<100||stat.size>300000||
      blob(fs.readFileSync(f))!==sha)throw Error('original main PHP Git blob mismatch: '+n);
   hashes[n]=sha;
 }
 const stage=path.join(root,'research/parallel-security');
 fs.mkdirSync(stage,{recursive:true});
 for(const n of harness){
   const from=path.join(here,n),to=path.join(stage,n);
   if(!fs.lstatSync(from).isFile())throw Error('missing own research harness '+n);
   fs.copyFileSync(from,to);
   if(blob(fs.readFileSync(to))!==blob(fs.readFileSync(from)))throw Error('research overlay changed '+n);
 }
 const php=process.env.PHP_BINARY||'php';
 for(const n of names)run(php,['-l',path.join(root,sourceDir+n)],root);
 const audit=run(php,[path.join(stage,'ed25519-callsite-audit.php')],root);
 if(!/Stage2 shared Ed25519 backend original source PASS 5 PHP verifiers;/.test(audit))
   throw Error('original five-verifier source invariant failed');
 const chain=run(process.execPath,[path.join(stage,'chain-backend-regression.mjs'),'forced-class'],root,150000);
 const lines=chain.split('\n');
 if(!/^Chain Ed25519 backend signed-chain regression PASS 60 assertions; mode=forced-class;/.test(lines.at(-1)))
   throw Error('live main signed chain did not complete 60 genuine assertions');
 const proof=JSON.parse(lines[0]);
 if(proof.mode!=='forced-class'||proof.assertions!==60||proof.productionApproved!==false||
    proof.transcript?.length!==60||
    proof.transcript.some(x=>x.backend!=='forced-class'||x.globalVerifier!==false))
   throw Error('live main cryptographic route evidence incomplete');
 for(const [n,sha] of Object.entries(hashes))
   if(blob(fs.readFileSync(path.join(root,sourceDir+n)))!==sha)
     throw Error('PHP source mutated during verification '+n);
 if(run('git',['status','--porcelain','--',sourceDir],root)!=='')
   throw Error('original main PHP modified');
 if(run('git',['rev-parse','HEAD'],root)!==head||main()!==head)
   throw Error('main moved during crypto proof');
 console.log(JSON.stringify({mainSha:head,gitBlobs:hashes,phpVerifierCount:5,
  genuineSignedChainAssertions:60,sourceUnchanged:true,nativeSodium:true,
  noSodium:false,compat:false,productionApproved:false}));
 console.log('EXACT current main SHA '+head+' original source Ed25519 backend PASS 5 PHP verifiers; not production approval');
 console.log('EXACT current main SHA '+head+' forced-class native signed-chain PASS 60 assertions; NOT true Sodium-free PHP or production approval');
}catch(e){
 const msg=String(e.message||e);
 const blocked=/Could not resolve host|Connection timed out|Failed to connect|Network is unreachable|main moved|unable to access|Authentication failed|SSL connection/i.test(msg);
 console.error((blocked?'BLOCKED':'FAILED')+' independent current-main proof: '+msg);
 process.exitCode=blocked?3:1;
}finally{
 if(temporary)fs.rmSync(temporary,{recursive:true,force:true});
}
