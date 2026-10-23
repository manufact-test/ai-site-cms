#!/usr/bin/env node
// Synthetic offline mutation tests; live-main independent Git blob validation
// happens separately. Comment/string lures must not produce false routing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const runtime=process.env.PHP_BINARY||'php',proof=path.join(here,'main-web-crypto-surface.php');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cms-web-release-mutation-'));
const at=p=>path.join(tmp,p);
const write=(p,s)=>{fs.mkdirSync(path.dirname(at(p)),{recursive:true});fs.writeFileSync(at(p),s)};
const web='cms/public/index.php',kernel='cms/src/HttpKernel.php',
  host='cms/hosting/hostinger-readonly/index.php',
  binRelease='cms/bin/verify-lab-release.php',binTrust='cms/bin/verify-lab-trust.php';
const intro='<?php\n';
const originalWeb=intro+'\\AiSiteCms\\HttpKernel::create()->run();\n';
const originalKernel=intro+"$app=AppFactory::create(); $app->get('/api/health',static function(){});\n";
const paths=['/api/health','/__stage2/offweb-package','/__stage2/kernel/smoke',
 '/__stage2/private-boundary','/__stage2/rewrite/proof','/','/__stage2/host'];
const originalHost=()=>intro+paths.map(p=>"if($path === '"+p+"') {}\n").join('');
const guarded=intro+"if(PHP_SAPI !== 'cli'){exit(2);}\n";
function reset(){
 fs.rmSync(at('cms'),{recursive:true,force:true});
 write(web,originalWeb);write(kernel,originalKernel);write(host,originalHost());
 write(binRelease,guarded);write(binTrust,guarded);
 for(let i=0;i<25;i++)write('cms/src/Fixture'+i+'.php',intro+'class Fixture'+i+'{}\n');
}
function run(){
 const r=cp.spawnSync(runtime,[proof,tmp],{encoding:'utf8',timeout:15000,maxBuffer:1048576});
 assert.equal(r.error,undefined,String(r.error));
 return r;
}
let cases=0;
function check(ok,name){assert.ok(ok,name);cases++;}
try{
 reset();
 const a=run(),j=JSON.parse(a.stdout.split('\n')[0]);
 check(a.status===0&&a.stdout.includes('ORIGINAL main static web-to-release route census PASS exact 1 health route, 7 Hostinger paths, 2 CLI guards;'),
   'original-shaped source complete final marker');
 check(j.slimRouteCount===1&&j.hostingerPreflightPathCount===7&&
   j.cliReleaseVerifiersChecked===2&&j.webEntrypointsAnalyzed===2&&
   j.hostingerTested===false&&j.productionApproved===false,'synthetic result still disclaims host/production');
 check(j.dynamicOrIndirectReachabilityExcludedFromProof===true&&j.remoteEd25519DoSProven===false,
   'cannot promote syntax audit to whole-program reachability or DoS');
 const mutations=[
  ['post route',kernel,originalKernel+"$app->post('/unsafe',static function(){});\n"],
  ['extra get route',kernel,originalKernel+"$app->get('/operator',static function(){});\n"],
  ['changed health',kernel,originalKernel.replace('/api/health','/api/debug')],
  ['dynamic path',kernel,originalKernel.replace("'/api/health'",'$name')],
  ['route after fake comment',kernel,originalKernel+"/* noop */ $app->post('/unsafe',static function(){});\n"],
  ['other kernel source app route','cms/src/Fixture0.php',intro+"$app->post('/unsafe',static function(){});\n"],
  ['other AppFactory source','cms/src/Fixture1.php',intro+"$app=AppFactory::create();\n"],
  ['public direct native wrapper',web,originalWeb+'\\AiSiteCms\\Release\\Ed25519Backend::available();\n'],
  ['public direct release verifier',web,originalWeb+'\\AiSiteCms\\Release\\OfflineReleaseVerifier::verify();\n'],
  ['host direct trust chain',host,originalHost()+'\\AiSiteCms\\Release\\TrustedChainVerifier::inspect();\n'],
  ['no real public kernel',web,intro+"echo 'health';\n"],
  ['wrong public kernel method',web,originalWeb.replace('->run()','->prepare()')],
  ['extra Hostinger path',host,originalHost()+"if($path === '/untrusted') {}\n"],
  ['removed Hostinger path',host,originalHost().replace("if($path === '/__stage2/rewrite/proof') {}\n",'')],
  ['missing Hostinger health',host,originalHost().replace("if($path === '/api/health') {}\n",'')],
  ['removed release CLI guard',binRelease,intro+"echo 'broken';\n"],
  ['removed trust CLI guard',binTrust,intro+"echo 'broken';\n"],
  ['symlink web entry',web,null]
 ];
 for(const [name,file,body] of mutations){
   reset();
   if(body===null){fs.unlinkSync(at(file));fs.symlinkSync(at(kernel),at(file));}
   else write(file,body);
   const v=run();
   check(v.status!==0&&(v.stderr.includes('WEB_SURFACE_REFUSED')||
         v.stderr.includes('WEB_SURFACE_CENSUS_INPUT_REFUSED')),
       'denied '+name+': '+v.status+' '+v.stderr.slice(-100));
 }
 reset();
 write(kernel,originalKernel+"/* $app->post('/fake',static function(){}); */\n");
 check(run().status===0,'comment-only route is not counted');
 reset();
 write(kernel,originalKernel+"$description=\"$app->post('/only a quoted string')\";\n");
 check(run().status===0,'quoted text is not counted as registered route');
 reset();
 write(host,originalHost()+"/* if($path === '/fake') {} */\n");
 check(run().status===0,'comment-only path is not counted');
 console.log('Original main static web/CLI Ed25519 surface regression PASS '+cases+
  ' assertions; synthetic fixtures only, actual original Git files verified in separate live main proof');
}catch(e){console.error('WEB_SURFACE_REGRESSION_FAILED '+String(e.stack||e));process.exitCode=1;}
finally{fs.rmSync(tmp,{force:true,recursive:true});}
