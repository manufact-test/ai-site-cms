#!/usr/bin/env node
// CI-only proof for genuinely extension-free PHP; disabling a function is NOT enough.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
const binary=process.env.PHP_NO_SODIUM_BIN;
const dir=path.dirname(fileURLToPath(import.meta.url));
const report={schema:'ai-site-cms-true-no-native-sodium-v1',nativeFreeProven:false,
 compatVerified:false,hostingerVerified:false,productionApproved:false,tests:[]};
function finish(code,message){report.message=message;console.log(JSON.stringify(report,null,2));process.exitCode=code;}
if(process.argv.length!==2)finish(2,'Usage: PHP_NO_SODIUM_BIN=/absolute/php node runtime-sodium-proof.mjs');
else if(!binary||!path.isAbsolute(binary)||!fs.existsSync(binary))
 finish(3,'BLOCKED: independent absolute PHP binary required');
else{
 const p=cp.spawnSync(binary,['-n','-r',
  "echo json_encode(['version'=>PHP_VERSION,'size'=>PHP_INT_SIZE,'ext'=>extension_loaded('sodium'),'verify'=>function_exists('sodium_crypto_sign_verify_detached'),'sapi'=>PHP_SAPI],JSON_THROW_ON_ERROR);"
 ],{encoding:'utf8',timeout:10000});
 if(p.error||p.status!==0)finish(3,'BLOCKED: cannot inspect PHP binary: '+(p.error?.message||p.stderr));
 else{
  try{
   const env=JSON.parse(p.stdout);
   report.runtime={...env,binary:fs.realpathSync(binary)};
   if(env.size!==8||env.sapi!=='cli'||!/^8\.3\.[0-9]+$/.test(env.version)||env.ext!==false||env.verify!==false)
    finish(3,'BLOCKED: only genuinely extension-free PHP 8.3 64-bit CLI is accepted (no simulated passes)');
   else{
    report.nativeFreeProven=true;
    const proof=(name,stdout)=>{
      const lines=stdout.trimEnd().split('\n');
      let final;
      try{final=JSON.parse(lines.at(-1));}catch{final=null;}
      switch(name){
        case 'RFC8032 absent rejects':
          return lines.includes('PASS strict backend availability')&&
            lines.includes('PASS missing backend fails closed')&&
            lines.includes('NO_CRYPTO_TEST: absent mode correctly rejects all signatures');
        case 'Signed-envelope absent rejects':
          return lines.some(s=>s.startsWith('PASS missing verifier fails closed'))&&
            final?.mode==='absent'&&final?.status==='passed'&&
            final?.securityApproved===false;
        case 'Pinned compat RFC8032':
          return lines.includes('PASS RFC 8032 Ed25519 valid detached')&&
            lines.includes('PASS short signature rejected')&&
            lines.includes('PASS domain mismatch rejected')&&
            final?.backend==='compat'&&final?.checks==='passed'&&
            final?.verifications===8&&final?.productionApproved===false;
        case 'Pinned compat signed envelope':
          return lines.some(s=>s.startsWith('PASS genuine signed envelope accepted'))&&
            lines.some(s=>s.startsWith('PASS genuine signed envelope still accepted'))&&
            final?.mode==='compat'&&final?.status==='passed'&&
            final?.securityApproved===false;
        default:return false;
      }
    };
    const test=(name,exe,args)=>{
      const r=cp.spawnSync(exe,args,{encoding:'utf8',timeout:120000,
       env:{...process.env,PHP_BINARY:binary},maxBuffer:2*1024*1024});
      const ok=!r.error&&!r.signal&&r.status===0&&proof(name,r.stdout||'');
      report.tests.push({name,exitCode:r.status,passed:ok,
        proofCompleted:ok,stderr:(r.stderr||r.error?.message||'').slice(-250)});
      return ok;
    };
    const absent=[
      test('RFC8032 absent rejects',binary,['-n',path.join(dir,'ed25519-lab.php'),'absent']),
      test('Signed-envelope absent rejects',process.execPath,[path.join(dir,'release-fixture.mjs'),'absent'])
    ];
    if(absent.includes(false))finish(1,'Native-free verification did not fail closed');
    else if(!process.env.SODIUM_COMPAT_AUTOLOAD||!fs.existsSync(process.env.SODIUM_COMPAT_AUTOLOAD))
      finish(3,'Verified no native sodium; independently sourced exact-pinned sodium_compat 2.5.2 still missing');
    else{
      // A path called "autoload.php" is insufficient evidence of pinned 2.5.2.
      // Require an independently reviewed whole-tree source digest AND a lock
      // referring to the upstream verified v2.5.2 commit before loading PHP.
      const source=cp.spawnSync(process.execPath,[path.join(dir,'sodium-compat-attest.mjs')],{
        encoding:'utf8',timeout:30000,maxBuffer:1024*1024,env:process.env
      });
      if(source.error||source.status!==0){
        finish(3,'BLOCKED: exact sodium_compat source provenance unavailable: '+
          (source.error?.message||(source.stderr||'').slice(-450)));
      }else{
        report.sourceAttestation=JSON.parse(source.stdout);
        const checks=[
         test('Pinned compat RFC8032',binary,['-n',path.join(dir,'ed25519-lab.php'),'compat']),
         test('Pinned compat signed envelope',process.execPath,[path.join(dir,'release-fixture.mjs'),'compat'])
        ];
        if(checks.includes(false))finish(1,'Genuine native-free compat cryptographic checks failed');
        else{
          // A reviewed source snapshot is not a durable lock: the files may
          // have changed between attestation and PHP autoload. Re-attest
          // AFTER both subprocesses and fail closed on changed/missing code.
          const after=cp.spawnSync(process.execPath,[path.join(dir,'sodium-compat-attest.mjs')],{
            encoding:'utf8',timeout:30000,maxBuffer:1024*1024,env:process.env
          });
          if(after.error||after.status!==0)
            finish(3,'BLOCKED: source changed or disappeared after compat verification: '+
              (after.error?.message||(after.stderr||'').slice(-450)));
          else {
            const finalSource=JSON.parse(after.stdout);
            if(JSON.stringify(finalSource)!==JSON.stringify(report.sourceAttestation))
              finish(3,'BLOCKED: sodium_compat attested evidence changed across verifier subprocesses');
            else{
              report.sourceAttestationRechecked=true;
              report.compatVerified=true;
              finish(0,'Native-free RFC and envelope verified with before/after source attestation; host unverified');
            }
          }
        }
      }
    }
   }
  }catch(e){finish(2,'Invalid PHP probe output: '+e.message);}
 }
}
