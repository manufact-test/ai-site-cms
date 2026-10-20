'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const cp=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
const {prepare}=require('./stage2-hostinger-private-stage.cjs');
const home=fs.mkdtempSync(path.join(os.tmpdir(),'stage2-private-git-'));
try{
 const dest=path.join(home,'cms-stage2-offweb-runtime');
 const original=verify(STAGE),result=prepare(STAGE,dest);
 assert.equal(result.activated,false);
 assert.equal(result.productionReady,false);
 assert.equal(result.files,original.files.length+1);
 assert.deepEqual(verify(dest),original);
 for(const p of ['vendor/autoload.php','private/editor/editor.js','public/index.php','public/.htaccess'])
   assert.ok(fs.isFileSync?fs.isFileSync(path.join(dest,p)):fs.statSync(path.join(dest,p)).isFile());
 for(const p of ['index.php','.git','.env','private/secret.ini'])
   assert.equal(fs.existsSync(path.join(dest,p)),false);
 // Test the ACTUAL compiled CMS package against the exact standalone
 // PHP probe used in the owner-authorized Hostinger preflight branch.
 // No HTTP, Hostinger, DB, network or secret configuration is involved.
 const web=path.join(home,'public_html');
 fs.mkdirSync(web,{mode:0o700});
 const gate=path.join(web,'index.php');
 fs.copyFileSync(path.join(__dirname,'../hosting/hostinger-readonly/index.php'),gate);
 const phpCheck=(route='/__stage2/offweb-package')=>{
   const code='$_SERVER["REQUEST_METHOD"]="GET";'+
     '$_SERVER["REQUEST_URI"]='+JSON.stringify(route)+';'+
     '$_SERVER["DOCUMENT_ROOT"]='+JSON.stringify(web)+';'+
     '$_SERVER["SCRIPT_FILENAME"]='+JSON.stringify(gate)+';'+
     'include '+JSON.stringify(gate)+';';
   return JSON.parse(cp.execFileSync('php',['-r',code],{encoding:'utf8',timeout:25000}));
 };
 let actual=phpCheck();
 assert.equal(actual.state,'verified_unsigned_package');
 const smoke=phpCheck('/__stage2/kernel/smoke');
 assert.equal(smoke.result,'health_only_pass');
 assert.equal(smoke.realSlimKernelHealthPassed,true);
 assert.equal(smoke.fullyHashedUnsignedPackage,true);
 assert.equal(smoke.testOnly,true);
 assert.equal(smoke.publicCmsActivated,false);
 assert.equal(smoke.signedRelease,false);
 assert.equal(smoke.schemaInitialized,false);
 assert.equal(smoke.stage2Accepted,false);
 assert.equal(actual.offwebPackageIntegrityVerified,true);
 assert.equal(actual.verifiedFiles,result.files-1);
 assert.equal(actual.signatureVerified,false);
 assert.equal(actual.phpFromPackageExecuted,false);
 assert.equal(actual.databaseConnected,false);
 assert.equal(actual.stage2Accepted,false);
 // A FULL packaged runtime must refuse files missing from the manifest.
 const extraCode=path.join(dest,'vendor/rogue-extra.php');
 fs.writeFileSync(extraCode,'<?php throw new Exception("MUST_NOT_EXECUTE");');
 actual=phpCheck();
 assert.equal(actual.state,'incomplete');
 assert.equal(actual.offwebPackageIntegrityVerified,false);
 assert.equal(phpCheck('/__stage2/kernel/smoke').realSlimKernelHealthPassed,false);
 fs.unlinkSync(extraCode);
 const localSecret=path.join(dest,'private/.env');
 fs.writeFileSync(localSecret,'FIXTURE_NOT_REAL_PASSWORD');
 assert.equal(phpCheck().state,'incomplete');
 fs.unlinkSync(localSecret);
 const injectedLink=path.join(dest,'vendor/foreign-alias');
 fs.symlinkSync(path.join(dest,'private'),injectedLink,'dir');
 assert.equal(phpCheck().state,'incomplete');
 fs.unlinkSync(injectedLink);
 assert.equal(phpCheck().state,'verified_unsigned_package');
 const editorAsset=path.join(dest,'private/editor/editor.js');
 fs.appendFileSync(editorAsset,'// corrupt');
 actual=phpCheck();
 assert.equal(actual.state,'incomplete');
 assert.equal(actual.offwebPackageIntegrityVerified,false);
 const tamper=phpCheck('/__stage2/kernel/smoke');
 assert.equal(tamper.result,'not_ready');
 assert.equal(tamper.realSlimKernelHealthPassed,false);
 fs.copyFileSync(path.join(STAGE,'private/editor/editor.js'),editorAsset);
 assert.equal(phpCheck().state,'verified_unsigned_package');
 assert.equal(phpCheck('/__stage2/kernel/smoke').result,'health_only_pass');
 assert.equal(fs.existsSync(path.join(web,'vendor/autoload.php')),false);
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
