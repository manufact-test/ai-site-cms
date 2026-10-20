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
   if(env.size!==8||env.sapi!=='cli'||env.ext!==false||env.verify!==false)
    finish(3,'BLOCKED: PHP is not genuinely extension-free (no simulated no-Sodium passes)');
   else{
    report.nativeFreeProven=true;
    const test=(name,exe,args)=>{
      const r=cp.spawnSync(exe,args,{encoding:'utf8',timeout:120000,
       env:{...process.env,PHP_BINARY:binary}});
      const ok=r.status===0;
      report.tests.push({name,exitCode:r.status,passed:ok,stderr:(r.stderr||'').slice(-250)});
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
      const checks=[
       test('Pinned compat RFC8032',binary,['-n',path.join(dir,'ed25519-lab.php'),'compat']),
       test('Pinned compat signed envelope',process.execPath,[path.join(dir,'release-fixture.mjs'),'compat'])
      ];
      if(checks.includes(false))finish(1,'Genuine native-free compat cryptographic checks failed');
      else{report.compatVerified=true;finish(0,'Native-free RFC and envelope verified locally; host deployment remains unverified');}
    }
   }
  }catch(e){finish(2,'Invalid PHP probe output: '+e.message);}
 }
}
