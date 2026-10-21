'use strict';
// Genuine internal native Sodium versus disabled function, userland spoof,
// and namespaced shadow. Disposable PHP CLI subprocesses, no target host.
const cp=require('node:child_process');
const path=require('node:path');
const assert=require('node:assert/strict');
const backend=path.resolve(__dirname,'../src/Release/Ed25519Backend.php');
const php=process.env.CMS_NATIVE_PHP_BINARY||'php';
const include='require_once '+JSON.stringify(backend)+';';
const cls='\\AiSiteCms\\Release\\Ed25519Backend';
const sig='e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155'+
  '5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b';
const key='d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a';
const vectors="$sig=hex2bin('"+sig+"');$key=hex2bin('"+key+"');";
const forged="str_repeat('A',64),'forged',str_repeat('B',32)";
const deny=include+" if("+cls+"::available()||"+cls+"::verifyDetached("+forged+
  "))throw new \\RuntimeException('spoofed provider accepted');";
const cases=[
  ['real-native',[],include+vectors+
    "if(!extension_loaded('sodium')||!"+cls+"::available()||!"+cls+
    "::verifyDetached($sig,'',$key)||"+cls+
    "::verifyDetached($sig,'changed',$key))throw new \\RuntimeException('native primitive failed');"],
  ['disabled-native',['-d','disable_functions=sodium_crypto_sign_verify_detached'],
    "if(function_exists('sodium_crypto_sign_verify_detached'))"+
    "throw new \\RuntimeException('native not disabled');"+deny],
  ['spoofed-global',['-d','disable_functions=sodium_crypto_sign_verify_detached'],
    "function sodium_crypto_sign_verify_detached($s,$m,$k): bool {return true;}"+
    "if(!(new \\ReflectionFunction('sodium_crypto_sign_verify_detached'))->isUserDefined())"+
    "throw new \\RuntimeException('not userland');"+deny],
  ['spoofed-namespace',[],
    "namespace AiSiteCms\\Release {function sodium_crypto_sign_verify_detached($s,$m,$k): bool {return true;}}"+
    " namespace {"+include+
    "if(!"+cls+"::available()||"+cls+"::verifyDetached("+forged+
    "))throw new \\RuntimeException('namespaced spoof accepted');}"]
];
for(const [name,flags,source] of cases){
  const p=cp.spawnSync(php,[...flags,'-r',source],{
    encoding:'utf8',timeout:15000,maxBuffer:32768
  });
  assert.equal(p.status,0,name+': '+(p.stderr||p.error?.message||p.stdout));
  assert.equal(p.stdout,'',name+': no hidden output expected');
}
console.log('Stage2 Ed25519 native provider provenance PASS 4 subprocess assertions; no real target approval');

