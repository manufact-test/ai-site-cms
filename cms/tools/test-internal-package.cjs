'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {STAGE,assertAllowed,collect,verify} = require('./build-internal-package.cjs');
const manifest=verify();
let checks=0;
function check(value,why){assert.ok(value,why);checks++;}
check(manifest.files.length>20,'Vendor-complete package inventory');
check(manifest.writeEndpointsAvailable===false && manifest.productionReady===false,'No production or admin claim');
check(manifest.hostingComposerOrNodeRequired===false,'Static package needs no build tools at runtime');
check(fs.existsSync(path.join(STAGE,'private/editor/editor.js')),'Bundled browser JS private');
check(!fs.existsSync(path.join(STAGE,'public/editor.js')),'Public editor JS inaccessible');
check(fs.existsSync(path.join(STAGE,'vendor/autoload.php')),'Composer runtime vendor included');
check(manifest.files.some(x=>x.path==='bin/hostinger-stage2-once.php'),
  'One-shot Hostinger operator is packaged off-web only');
check(manifest.files.some(x=>x.path==='src/Hosting/HostingerStage2OneShot.php'),
  'One-shot implementation is inventoried');
for(const unsafe of ['public/hostinger-stage2-once.php','cms-stage2-local/once.json',
  'public/once.json','public/receipt.json','private/once.json']){
  check(!manifest.files.some(x=>x.path===unsafe),
    'No operator credentials, tasks or receipts in source package: '+unsafe);
}
check(manifest.files.some(x=>x.path==='public/.htaccess'),
  'Apache fallback/security rules are fully inventoried in shipped public root');
for(const dangerous of ['.env','../etc/shadow','private/../public/bad','storage/main.sqlite','private/editor/.npmrc','public/server.key']){
  assert.throws(()=>assertAllowed(dangerous));
  checks++;
}
const initial=verify();check(initial.files.length===manifest.files.length,'Manifest verifies all files');
const filename=path.join(STAGE,'private/editor/meta.json');
const original=fs.readFileSync(filename);
fs.appendFileSync(filename,'CORRUPTED');
assert.throws(()=>verify(),/mismatch/);checks++;
fs.writeFileSync(filename,original);check(verify().files.length===initial.files.length,'Restoration detects tamper and recovers');
const ht=path.join(STAGE,'public','.htaccess');
const htBefore=fs.readFileSync(ht);
try{
 fs.appendFileSync(ht,'\n# CI tampering\n');
 assert.throws(()=>verify(),/mismatch/);
 checks++;
}finally{fs.writeFileSync(ht,htBefore);}
check(verify().files.length===initial.files.length,
 'original Apache routing rules restore entire verified package');
const garbage=path.join(STAGE,'public','extra-secret.txt');
fs.writeFileSync(garbage,'UNLISTED');
assert.throws(()=>verify(),/Unlisted/);checks++;
fs.unlinkSync(garbage);check(verify().files.length===initial.files.length,'Extraneous file removable');
const trap=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-package-symlink-'));
try{
  fs.writeFileSync(path.join(trap,'ordinary.txt'),'content');
  fs.symlinkSync(path.join(trap,'ordinary.txt'),path.join(trap,'symlink.txt'));
  assert.throws(()=>collect(path.join(trap,'symlink.txt'),'private/editor/malicious.txt',[]),/symbolic link/);checks++;
}finally{fs.rmSync(trap,{recursive:true,force:true})}
check(manifest.files.some(f=>f.path==='private/editor/THIRD_PARTY_LICENSES.txt'),'Upstream license included privately');
const index=JSON.parse(fs.readFileSync(path.join(STAGE,'private/compliance/compliance-index.json'),'utf8'));
const sbom=JSON.parse(fs.readFileSync(path.join(STAGE,'private/compliance/sbom.cdx.json'),'utf8'));
check(index.componentCount===43 && sbom.components.length===43,'43 lock-tracked components SBOM');
check(sbom.components.filter(c=>c.properties.some(p=>p.name==='ai-site-cms:scope'&&p.value==='php-runtime')).length===14,'14 shipped Composer libraries');
check(sbom.components.filter(c=>c.properties.some(p=>p.name==='ai-site-cms:scope'&&p.value==='browser-runtime')).length===1,'Only Jedison shipped as browser-runtime npm library');
check(fs.readFileSync(path.join(STAGE,'private/compliance/THIRD_PARTY_NOTICES.txt'),'utf8').includes('Apache License'),'Composer Apache notices retained');
const sbomPath=path.join(STAGE,'private/compliance/sbom.cdx.json'),saved=fs.readFileSync(sbomPath);
fs.writeFileSync(sbomPath,'{"invalid":true}');
assert.throws(()=>verify(),/mismatch/);checks++;
fs.writeFileSync(sbomPath,saved);
check(verify().files.length===manifest.files.length,'SBOM damage recovery');
console.log('Stage2 internal package security/integrity PASS: '+checks+' assertions; no network, host or customer data');
