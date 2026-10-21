'use strict';
// Stage2 internal package BUILDER only. Execute offline on CI/dev, never on client hosting.
// Produce a vendor-complete, static-JS bundle with NO publicly exposed editor routes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {generate:generateCompliance}=require('./generate-compliance.cjs');
const ROOT = path.resolve(__dirname, '..');
const STAGE = path.join(ROOT, '.build', 'internal-stage2-package');
const PARTS = [
  ['public', 'public'], ['src', 'src'], ['vendor', 'vendor'],
  ['bin/install.php', 'bin/install.php'],
  ['bin/hostinger-stage2-once.php', 'bin/hostinger-stage2-once.php'],
  ['bin/hostinger-stage2-preflight.php', 'bin/hostinger-stage2-preflight.php'],
  ['bin/hostinger-stage2-revoke.php', 'bin/hostinger-stage2-revoke.php'],
  ['bin/schema-preflight.php', 'bin/schema-preflight.php'],
  ['bin/doctor.php', 'bin/doctor.php'],
  ['bin/shared-host-preflight.php', 'bin/shared-host-preflight.php'],
  ['bin/site-runtime-topology.php', 'bin/site-runtime-topology.php'],
  ['bin/package-preflight.php', 'bin/package-preflight.php'],
  ['bin/startup-readiness.php', 'bin/startup-readiness.php'],
  ['bin/bind-empty-instance.php', 'bin/bind-empty-instance.php'],
  ['bin/lab-empty-installer.php', 'bin/lab-empty-installer.php'],
  ['bin/lab-fleet-operator.php', 'bin/lab-fleet-operator.php'],
  ['bin/lab-foundation-transfer.php', 'bin/lab-foundation-transfer.php'],
  ['bin/lab-deployment-blueprint.php', 'bin/lab-deployment-blueprint.php'],
  ['bin/lab-stage2-exit-review.php', 'bin/lab-stage2-exit-review.php'],
  ['bin/stage2-target-host-handoff.php', 'bin/stage2-target-host-handoff.php'],
  ['bin/stage2-mysql-ci-binding.php', 'bin/stage2-mysql-ci-binding.php'],
  ['composer.json', 'composer.json'], ['composer.lock', 'composer.lock'],
  ['editor/dist/editor.js', 'private/editor/editor.js'],
  ['editor/dist/meta.json', 'private/editor/meta.json'],
  ['editor/dist/THIRD_PARTY_LICENSES.txt', 'private/editor/THIRD_PARTY_LICENSES.txt'],
  ['editor/package-lock.json', 'private/compliance/npm-package-lock.json']
];
const forbiddenPart = /^(?:\.git|\.github|\.env(?:\..*)?|\.ssh|\.npmrc|\.user\.ini|secrets?|node_modules|\.build)$/i;
const forbiddenFile = /\.(?:pem|key|sqlite|sqlite3|db|p12|pfx)$/i;
function assertAllowed(relative) {
  if(typeof relative!=='string'||relative.length<1||relative.length>240||
     relative.includes('\\')||relative.includes('\0'))
    throw Error('Refusing malformed package relative path');
  const segments=relative.split('/');
  if(relative.startsWith('/')||segments.some(s=>!s||s==='.'||s==='..'||
     !/^[a-zA-Z0-9._-]+$/.test(s)||
     (relative.startsWith('public/') && s.startsWith('.')
       && relative!=='public/.htaccess')||forbiddenPart.test(s)||
     (s.toLowerCase()==='.htaccess'&&relative!=='public/.htaccess'))||
     relative.toLowerCase()==='storage'||relative.toLowerCase().startsWith('storage/')||
     forbiddenFile.test(relative)){
    throw Error('Refusing sensitive/unsafe package relative path: '+relative);
  }
}
function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function ensureRealRegular(file){
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink())throw Error('Refusing symlink in package source');
  if(!st.isFile())throw Error('Refusing nonregular source package file');
  if(st.nlink!==1)throw Error('Refusing hardlinked package source');
  if(st.size<1||st.size>8*1024*1024)throw Error('Invalid source file size');
}
function collect(source,destination,records){
  assertAllowed(destination);
  const st=fs.lstatSync(source);
  if(st.isSymbolicLink())throw Error('Refusing symbolic link in stage source');
  if(st.isDirectory()){
    for(const name of fs.readdirSync(source).sort()){
      // Excluded distribution metadata; no source-code execution or bundling from these.
      if(name==='.git'||name==='.github'||name==='node_modules'||name==='tests')continue;
      assertAllowed(destination+'/'+name);
      collect(path.join(source,name),destination+'/'+name,records);
    }
  } else {
    ensureRealRegular(source);
    const dest=path.join(STAGE,...destination.split('/'));
    fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
    fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);
    fs.chmodSync(dest,0o644);
    const copied=fs.lstatSync(dest);
    if(!copied.isFile()||copied.nlink!==1||copied.size!==st.size)
      throw Error('Source changed while copying internal release');
    records.push({path:destination,bytes:copied.size,sha256:sha(dest)});
  }
}
function verify(root=STAGE){
  const rootStat=fs.lstatSync(root);
  if(!rootStat.isDirectory()||rootStat.isSymbolicLink())
    throw Error('Untrusted package directory');
  const manifestFile=path.join(root,'private','package-manifest.json');
  ensureRealRegular(manifestFile);
  const raw=fs.readFileSync(manifestFile,'utf8');
  if(Buffer.byteLength(raw)>4*1024*1024)throw Error('Oversized package manifest');
  const manifest=JSON.parse(raw);
  const shape=['format','stage','releaseVersion','productionReady','documentRoot',
    'adminEditorAssets','hostingComposerOrNodeRequired','writeEndpointsAvailable','isSigned','files'];
  if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)||
     JSON.stringify(Object.keys(manifest))!==JSON.stringify(shape)||
     manifest.format!=='ai-site-cms-internal-stage2-v2'||manifest.stage!==2||
     manifest.productionReady!==false||manifest.documentRoot!=='public'||
     manifest.adminEditorAssets!=='private/editor'||
     manifest.hostingComposerOrNodeRequired!==false||
     manifest.writeEndpointsAvailable!==false||manifest.isSigned!==false||
     typeof manifest.releaseVersion!=='string'||
     !/^0\.[0-9]{1,9}\.[0-9]{1,9}-stage2\.[0-9]{1,9}$/.test(manifest.releaseVersion)||
     !Array.isArray(manifest.files)||manifest.files.length<4||manifest.files.length>1000||
     JSON.stringify(manifest,null,2)+'\n'!==raw){
    throw Error('Invalid/noncanonical package manifest');
  }
  const listed=new Set(),folded=new Set();
  let totalBytes=0;
  for(const record of manifest.files){
    if(!record||typeof record!=='object'||Array.isArray(record)||
       JSON.stringify(Object.keys(record))!==JSON.stringify(['path','bytes','sha256'])||
       !Number.isSafeInteger(record.bytes)||record.bytes<1||record.bytes>8*1024*1024||
       typeof record.sha256!=='string'||!/^[a-f0-9]{64}$/.test(record.sha256))
      throw Error('Invalid inventory record shape/size/hash');
    assertAllowed(record.path);
    const foldedPath=record.path.toLowerCase();
    if(listed.has(record.path)||folded.has(foldedPath)||
       record.path==='private/package-manifest.json')
      throw Error('Duplicate/case-colliding inventory path');
    listed.add(record.path);folded.add(foldedPath);
    const file=path.join(root,...record.path.split('/'));
    ensureRealRegular(file);
    if(sha(file)!==record.sha256||fs.lstatSync(file).size!==record.bytes)
      throw Error('Artifact hash/size mismatch for '+record.path);
    totalBytes+=record.bytes;
    if(totalBytes>32*1024*1024)throw Error('Oversized package inventory');
  }
  const discovered=[];
  function visit(dir,rel='',depth=0){
    if(depth>14)throw Error('Oversized package tree depth');
    for(const name of fs.readdirSync(dir).sort()){
      const dest=rel?rel+'/'+name:name;
      assertAllowed(dest);
      const p=path.join(dir,name),st=fs.lstatSync(p);
      if(st.isSymbolicLink())throw Error('Symlink injected into package');
      if(st.isDirectory())visit(p,dest,depth+1);
      else if(st.isFile()){
        ensureRealRegular(p);
        discovered.push(dest);
        if(discovered.length>1001)throw Error('Too many package files');
      }else throw Error('Unsupported package node');
    }
  }
  visit(root);
  const extra=discovered.filter(p=>p!=='private/package-manifest.json'&&!listed.has(p));
  if(extra.length||discovered.length!==manifest.files.length+1)
    throw Error('Unlisted/removed package file(s): '+extra.join(','));
  if(!listed.has('public/.htaccess')||listed.has('public/editor.js')||!listed.has('private/editor/editor.js')||!listed.has('vendor/autoload.php')||!listed.has('public/index.php')){
    throw Error('Editor exposure or missing executable package essentials');
  }
  // Stage2 is health-only. No research HTML, form handler, uploads, CSS or
  // editor assets belong in the public document root until a separately
  // authorized stage and full auth/CSRF/media/tenancy contract exist.
  // Check the manifest inventory, not just source-file names: a perfectly
  // checksummed foreign form.php or assets/ui.js must also be rejected.
  const publicPaths=[...listed].filter(p=>p.startsWith('public/')).sort();
  if(JSON.stringify(publicPaths)!==JSON.stringify(['public/.htaccess','public/index.php'])
    || manifest.writeEndpointsAvailable!==false
    || manifest.adminEditorAssets!=='private/editor'
    || manifest.hostingComposerOrNodeRequired!==false){
    throw Error('Stage2 public boundary forbids unapproved routes/assets or writable CMS claims');
  }
  const compliance=JSON.parse(fs.readFileSync(path.join(root,'private/compliance/compliance-index.json'),'utf8'));
  const sbom=JSON.parse(fs.readFileSync(path.join(root,'private/compliance/sbom.cdx.json'),'utf8'));
  const notices=fs.readFileSync(path.join(root,'private/compliance/THIRD_PARTY_NOTICES.txt'),'utf8');
  if(compliance.format!=='ai-site-cms-stage2-compliance-v1'||compliance.componentCount!==43||compliance.composerRuntime!==14||compliance.npmLocked!==29||compliance.noticeSha256!==sha(path.join(root,'private/compliance/THIRD_PARTY_NOTICES.txt'))||sbom.bomFormat!=='CycloneDX'||sbom.specVersion!=='1.5'||sbom.components?.length!==43||sbom.metadata?.component?.version!==manifest.releaseVersion||!notices.includes('German Bisurgi')){
    throw Error('Invalid compliance evidence');
  }
  return manifest;
}
function build(){
  fs.mkdirSync(path.dirname(STAGE),{recursive:true,mode:0o700});
  if(fs.lstatSync(path.dirname(STAGE)).isSymbolicLink())throw Error('Untrusted output path');
  // Stage is a well-defined, ignored local directory, never a production directory.
  if(fs.existsSync(STAGE)){
    if(fs.lstatSync(STAGE).isSymbolicLink())throw Error('Untrusted existing package output');
    fs.rmSync(STAGE,{recursive:true,force:true});
  }
  fs.mkdirSync(STAGE,{recursive:true,mode:0o700});
  const files=[];
  for(const [from,to] of PARTS){
    const origin=path.join(ROOT,...from.split('/'));
    if(!fs.existsSync(origin))throw Error('Required offline artifact absent: '+from);
    collect(origin,to,files);
  }
  const compliance=generateCompliance(STAGE);
  if(compliance.count!==43)throw Error('Incomplete third-party component accounting');
  for(const name of ['sbom.cdx.json','THIRD_PARTY_NOTICES.txt','compliance-index.json']){
    const relative='private/compliance/'+name;
    const absolute=path.join(STAGE,...relative.split('/'));
    ensureRealRegular(absolute);
    files.push({path:relative,bytes:fs.statSync(absolute).size,sha256:sha(absolute)});
  }
  files.sort((a,b)=>a.path.localeCompare(b.path));
  const release=JSON.parse(fs.readFileSync(path.join(ROOT,'release.json'),'utf8'));
  if(!/^0\.\d+\.\d+-stage2\.\d+$/.test(release.version)||release.channel!=='internal-laboratory'||release.productionReady!==false)throw Error('Unsafe/unreviewed release metadata');
  const packageInfo={
    format:'ai-site-cms-internal-stage2-v2',stage:2,releaseVersion:release.version,productionReady:false,
    documentRoot:'public',adminEditorAssets:'private/editor',
    hostingComposerOrNodeRequired:false,
    writeEndpointsAvailable:false,
    isSigned:false, // SHA-256 provides integrity of local files, not a trusted signature.
    files
  };
  fs.mkdirSync(path.join(STAGE,'private'),{recursive:true,mode:0o700});
  fs.writeFileSync(path.join(STAGE,'private','package-manifest.json'),JSON.stringify(packageInfo,null,2)+'\n',{mode:0o600,flag:'wx'});
  const tested=verify();
  const fingerprint=sha(path.join(STAGE,'private','package-manifest.json'));
  process.stdout.write('Stage2 internal package built/verified: '+tested.files.length+' files, document root public/, editor assets private/ only. NO production sign-off.\n');
  process.stdout.write('Stage2 unsigned package manifest SHA-256: '+fingerprint+' (integrity evidence, NOT signature)\n');
}
if(require.main===module)build();
module.exports={assertAllowed,collect,verify,build,STAGE,ROOT};
