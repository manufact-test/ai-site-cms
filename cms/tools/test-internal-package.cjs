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
check(manifest.files.some(x=>x.path==='bin/hostinger-stage2-revoke.php'),
  'Emergency credential-only revoke is bundled outside the public webroot');
check(!manifest.files.some(x=>x.path==='public/hostinger-stage2-revoke.php'),
  'Emergency cleanup is not exposed via HTTP');
check(manifest.files.some(x=>x.path==='bin/hostinger-stage2-preflight.php'),
  'Credential-free Stage2 Hostinger CLI preflight is packaged off-web');
check(!manifest.files.some(x=>x.path==='public/hostinger-stage2-preflight.php'),
  'Credential-free CLI is NOT exposed through the webroot');
// Parallel research is integrated as non-runtime evidence only. It must never
// enter a downloadable CMS package or a shared-host public document root.
check(!manifest.files.some(x=>x.path.startsWith('research/')
  || x.path.includes('parallel-security/')
  || x.path.includes('parallel-components/')
  || x.path.includes('lab/public/')
  || x.path.includes('test_browser.py')),
  'Independent Security/Components research and standalone form lab cannot enter Hostinger distribution');
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

const crypto=require('node:crypto');
const manifestPath=path.join(STAGE,'private/package-manifest.json');
const originalManifest=fs.readFileSync(manifestPath);
function hostileManifestMutation(mutator,label){
  const fresh=JSON.parse(originalManifest.toString('utf8'));
  let cleanup=()=>{};
  try{
    cleanup=mutator(fresh)||cleanup;
    fs.writeFileSync(manifestPath,JSON.stringify(fresh,null,2)+'\n');
    assert.throws(()=>verify(),/Stage2 public boundary|unapproved routes|writable CMS claims/,
      label);
    checks++;
  }finally{
    cleanup();
    fs.writeFileSync(manifestPath,originalManifest);
  }
  check(verify().files.length===initial.files.length,
    'read-only boundary mutation restored original complete signed inventory: '+label);
}
for(const [filename,bytes] of [
  ['public/submit.php','<?php echo "form prototype";'],
  ['public/assets/ui.js','document.querySelector("form");'],
  ['public/upload.php','<?php echo "image upload";']
]){
  hostileManifestMutation(doc=>{
    const loc=path.join(STAGE,...filename.split('/'));
    fs.mkdirSync(path.dirname(loc),{recursive:true});
    fs.writeFileSync(loc,bytes);
    doc.files.push({path:filename,bytes:Buffer.byteLength(bytes),
      sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
    return ()=>{fs.rmSync(loc,{force:true});if(filename.includes('/assets/'))fs.rmdirSync(path.dirname(loc));};
  },'perfectly hash-inventoried unapproved public route '+filename);
}
for(const [field,value] of [
  ['writeEndpointsAvailable',true],
  ['adminEditorAssets','public/editor'],
  ['hostingComposerOrNodeRequired',true]
]){
  hostileManifestMutation(doc=>{doc[field]=value;},
    'manifest attempting to relax internal-only release claim '+field);
}


// Node and PHP must agree on the identity and limits of an internal release.
// A fresh manifest hash does not excuse malformed record types/field order,
// case-fold collisions, duplicate JSON keys, oversized files, or hardlinks.
function invalidShape(mutator,label,pattern=/Invalid|Duplicate|case-colliding|Unsafe|Refusing|Oversized|noncanonical/){
  const candidate=JSON.parse(originalManifest.toString('utf8'));
  mutator(candidate);
  try{
    fs.writeFileSync(manifestPath,JSON.stringify(candidate,null,2)+'\n');
    assert.throws(()=>verify(),pattern,label);checks++;
  }finally{fs.writeFileSync(manifestPath,originalManifest);}
  check(verify().files.length===initial.files.length,'restored canonical package after '+label);
}
for(const [change,label] of [
  [d=>{d.files.push({...d.files[0],path:d.files[0].path.toUpperCase()});},'case-fold collision'],
  [d=>{d.files[0].sha256='f'.repeat(63);},'invalid digest encoding'],
  [d=>{d.files[0].bytes=1.2;},'fractional inventory file size'],
  [d=>{d.files[0].bytes=0;},'zero-byte inventory file size'],
  [d=>{d.files[0].bytes=8*1024*1024+1;},'per-file 8MiB limit'],
  [d=>{d.files[0]={sha256:d.files[0].sha256,path:d.files[0].path,bytes:d.files[0].bytes};},'reordered inventory fields'],
  [d=>{d.files[0].extra='trusted';},'unknown inventory field'],
  [d=>{d.files=[];},'empty inventory'],
  [d=>{d.files[0].path='private/../public/index.php';},'parent traversal'],
  [d=>{d.files[0].path='private\\editor\\editor.js';},'nonportable Windows separators'],
  [d=>{d.files[0].path='private/.user.ini';},'PHP ini override'],
  [d=>{d.releaseVersion=3;},'wrong release version type'],
  [d=>{d.extra='approved';},'unknown manifest capability field'],
  [d=>{d.isSigned=true;},'forged source signature flag'],
  [d=>{d.files=[{path:'private/package-manifest.json',bytes:100,sha256:'f'.repeat(64)},...d.files];},'manifest self-reference']
])invalidShape(change,label);
for(const [raw,label] of [
  [originalManifest.toString('utf8').replace('"stage": 2,','"stage": 2,\n  "stage": 2,'),'duplicate stage JSON key'],
  [originalManifest.toString('utf8').replace('"format":','"\\u0066ormat":'),'escaped manifest key'],
  ['\n'+originalManifest.toString('utf8'),'leading whitespace'],
  [originalManifest.toString('utf8').replace('  "format":',' "format":'),'different indentation']
]){
  try{
    fs.writeFileSync(manifestPath,raw);
    assert.throws(()=>verify(),/Invalid|noncanonical/,label);checks++;
  }finally{fs.writeFileSync(manifestPath,originalManifest);}
}
check(verify().files.length===initial.files.length,'all deceptive manifest variants leave original intact');
const hardlinkedSource=fs.mkdtempSync(path.join(os.tmpdir(),'ai-cms-package-hardlink-'));
try {
  const target=path.join(hardlinkedSource,'original.js');
  const alias=path.join(hardlinkedSource,'alias.js');
  fs.writeFileSync(target,'console.log(42)');
  fs.linkSync(target,alias);
  assert.throws(()=>collect(alias,'private/editor/nonportable.js',[]),/hardlinked/);checks++;
}finally{fs.rmSync(hardlinkedSource,{recursive:true,force:true});}

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
// Exact pinned Apache package NOTICE files are separate from LICENSE.
// The original upstream text must be present, byte-for-byte, in our
// immutable offweb compliance output and have matching CycloneDX provenance.
const bundledNotices=fs.readFileSync(path.join(STAGE,'private/compliance/THIRD_PARTY_NOTICES.txt'),'utf8');
for(const [name,version] of [['opis/json-schema','2.6.0'],['opis/string','2.1.0']]){
  const installed=fs.readFileSync(path.join(STAGE,'vendor',name,'NOTICE'),'utf8');
  const header='===== composer '+name+' '+version+' (Apache-2.0) / NOTICE (UPSTREAM NOTICE) =====';
  check(bundledNotices.includes(header+'\n'+installed+'\n'),
    'Original pinned Apache NOTICE body retained exactly: '+name);
  const component=sbom.components.find(c=>c.name===name && c.version===version);
  const sha=require('node:crypto').createHash('sha256').update(installed).digest('hex');
  check(component?.properties.some(p=>p.name==='ai-site-cms:installed-notice-sha256:NOTICE'
    && p.value===sha),'NOTICE SHA recorded in SBOM: '+name);
}
check(index.composerNoticeFiles>=2
  && index.requiredApacheNoticesPreserved?.includes('opis/json-schema')
  && index.requiredApacheNoticesPreserved?.includes('opis/string'),
  'Stage2 compliance index explicitly gates both pinned Apache NOTICEs');
const sbomPath=path.join(STAGE,'private/compliance/sbom.cdx.json'),saved=fs.readFileSync(sbomPath);
fs.writeFileSync(sbomPath,'{"invalid":true}');
assert.throws(()=>verify(),/mismatch/);checks++;
fs.writeFileSync(sbomPath,saved);
check(verify().files.length===manifest.files.length,'SBOM damage recovery');
console.log('Stage2 internal package security/integrity PASS: '+checks+' assertions; no network, host or customer data');
