#!/usr/bin/env node
// Genuine Ed25519 signatures + original Ed25519Backend on a forced class
// dispatch route implemented with NATIVE sodium_crypto_sign_open only.
// Never classify as real ext-Sodium-free PHP or audited sodium_compat.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const original=path.resolve(here,'../../cms/src/Release/Ed25519Backend.php');
if(!fs.existsSync(original)){console.error('BLOCKED: original backend missing');process.exit(3);}
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const pub=publicKey.export({format:'der',type:'spki'}).subarray(12);
const other=crypto.generateKeyPairSync('ed25519').publicKey.export({format:'der',type:'spki'}).subarray(12);
const msg=Buffer.from('AI-SITE-CMS-STAGE2-RESEARCH-REAL-ED25519\0nonce-1');
const second=Buffer.from('AI-SITE-CMS-STAGE2-RESEARCH-REAL-ED25519\0nonce-2');
const sig=crypto.sign(null,msg,privateKey);
const sig2=crypto.sign(null,second,privateKey);
const forged=Buffer.from(sig);forged[14]^=1;
const tests=[
  [sig,msg,pub,true],[sig2,second,pub,true],
  [forged,msg,pub,false],[sig,Buffer.concat([msg,Buffer.from('x')]),pub,false],
  [sig,msg,other,false],[sig.subarray(0,63),msg,pub,false],
  [sig,msg,pub.subarray(0,31),false],[sig,second,pub,false]
];
const payload=JSON.stringify(tests.map(([s,m,k])=>[s.toString('base64'),m.toString('base64'),k.toString('base64')]));
const php=String.raw`
if(!extension_loaded('sodium') || function_exists('sodium_crypto_sign_verify_detached')
    || !function_exists('sodium_crypto_sign_open')) {
    fwrite(STDERR,"BLOCKED: PHP must have native sodium_crypto_sign_open and missing detached wrapper\n");
    exit(3);
}
require_once $argv[2];
require_once $argv[3];
$cases=json_decode($argv[1],true,20,JSON_THROW_ON_ERROR);
$out=[];
foreach($cases as $case) {
    $s=base64_decode($case[0],true);
    $m=base64_decode($case[1],true);
    $k=base64_decode($case[2],true);
    if($s===false||$m===false||$k===false)throw new RuntimeException('Bad base64 test input');
    $out[]=\AiSiteCms\Release\Ed25519Backend::verifyDetached($s,$m,$k);
}
echo json_encode(['nativeLoaded'=>extension_loaded('sodium'),
    'detachedGlobal'=>function_exists('sodium_crypto_sign_verify_detached'),
    'classCalls'=>\ParagonIE_Sodium_Compat::$verifyCalls,
    'results'=>$out,'productionApproved'=>false],JSON_THROW_ON_ERROR);
`;
const phpBin=process.env.PHP_BINARY||'php';
const r=cp.spawnSync(phpBin,['-n','-d',
  'disable_functions=sodium_crypto_sign_verify_detached','-r',php,'--',
  payload,path.join(here,'class-only-ed25519-shim.php'),original],{
    encoding:'utf8',timeout:12000,maxBuffer:512*1024,
    env:{...process.env,CI:'true',CMS_ALLOW_PHP_INSTALL_LAB:'1'}
});
if(r.error||r.status!==0){console.error(r.stderr||r.error?.message||'PHP unavailable');process.exit(r.status===3?3:1);}
let data;try{data=JSON.parse(r.stdout);}catch{console.error('Bad native route proof JSON');process.exit(1);}
if(data.nativeLoaded!==true||data.detachedGlobal!==false||
    data.productionApproved!==false||!Number.isSafeInteger(data.classCalls)||
    data.classCalls<6||!Array.isArray(data.results)||
    data.results.length!==tests.length||
    data.results.some((actual,i)=>actual!==tests[i][3])){
    console.error('Real Ed25519 class-only native dispatch assertion mismatch');
    process.exit(1);
}
console.log('Native Ed25519 forced class-only dispatch PASS 8 real signatures/forgeries; native crypto_sign_open ONLY, NOT physical Sodium-free or audited compat');
