'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const cp=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
const {prepare}=require('./stage2-hostinger-private-stage.cjs');
const home=fs.mkdtempSync(path.join(os.tmpdir(),'stage2-private-git-'));
try{
 const dest=path.join(home,'runtime');
 const original=verify(STAGE),result=prepare(STAGE,dest);
 assert.equal(result.activated,false);
 assert.equal(result.productionReady,false);
 assert.equal(result.files,original.files.length+1);
 assert.deepEqual(verify(dest),original);
 for(const p of ['vendor/autoload.php','private/editor/editor.js','public/index.php','public/.htaccess'])
   assert.ok(fs.isFileSync?fs.isFileSync(path.join(dest,p)):fs.statSync(path.join(dest,p)).isFile());
 for(const p of ['index.php','.git','.env','private/secret.ini'])
   assert.equal(fs.existsSync(path.join(dest,p)),false);
 assert.throws(()=>prepare(STAGE,dest),/UNSAFE/);
 assert.throws(()=>prepare(STAGE,path.join(STAGE,'injected')),/UNSAFE/);
 const entry=path.join(dest,'public/index.php');
 fs.appendFileSync(entry,'tampered');
 assert.throws(()=>verify(dest),/mismatch|digest|length|changed/i);
 fs.copyFileSync(path.join(STAGE,'public/index.php'),entry);
 cp.execFileSync('git',['init','-q',dest]);
 cp.execFileSync('git',['-C',dest,'add','--all']);
 const names=cp.execFileSync('git',['-C',dest,'ls-files'],{encoding:'utf8'}).trim().split('\n');
 assert.equal(names.length,result.files);
 assert.ok(names.includes('vendor/autoload.php'));
 assert.ok(names.includes('private/package-manifest.json'));
 assert.ok(!names.includes('.git/config'));
 console.log('Stage2 inactive private Git tree exact content / isolation / tamper PASS. No host deploy.');
}finally{fs.rmSync(home,{recursive:true,force:true});}
