'use strict';
// End-to-end SINGLE authorized Stage2 lab upgrade path:
// Ed25519 signed true archive -> safe ZIP extraction -> native PHP inventory
// -> independent SQLite snapshot -> generation CAS -> pinned PHP read.
// All files/dbs ephemeral; no customer or hosting access.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
const {buildSignedLabBundle,metadata,writeEnvelope,runArchive}=require('./lab-signed-offline-release.cjs');
if(process.env.CI!=='true'||process.env.CMS_ALLOW_PHP_INSTALL_LAB!=='1'
  ||process.env.CMS_ALLOW_EPHEMERAL_SIGNING_LAB!=='1')
  throw Error('Explicit ephemeral CI release lab required');
const ROOT=path.resolve(__dirname,'..');
const FIX=path.join(ROOT,'tests/fixtures/trusted-upgrade-operator.php');
const temp=path.join(os.tmpdir(),'ai-site-cms-trusted-upgrade-fixture-'+crypto.randomBytes(8).toString('hex'));
fs.mkdirSync(temp,{mode:0o700});
const db=path.join(temp,'site.sqlite');
const installedLabs=[];
let count=0;
const ok=(v,m)=>{assert.ok(v,m);count++};
const run=(bin,args)=>{const p=spawnSync(bin,args,{encoding:'utf8',env:process.env,
  timeout:70000,maxBuffer:500000});if(p.error)throw p.error;return p};
const php=(args)=>run('php',[FIX,...args]);
const success=(args,label)=>{const r=php(args);if(r.status!==0)throw Error(label+': '+r.stderr);return JSON.parse(r.stdout)};
const denied=(args,label)=>{const r=php(args);ok(r.status===3,label);
  ok(!r.stdout.includes('installedLabRoot'),'refused action did not issue deployment receipt')};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function synthetic(folder,version){
  const assets={
    'public/index.php':'<?php echo "read-only";',
    'vendor/autoload.php':'<?php // synthetic',
    'private/editor/editor.js':'window.version='+JSON.stringify(version)+';',
    'composer.json':'{"require":{}}'
  };
  for(const [name,body] of Object.entries(assets)){
    const dest=path.join(folder,name);fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,body);
  }
  const manifest={format:'ai-site-cms-internal-stage2-v2',stage:2,
    releaseVersion:version,productionReady:false,documentRoot:'public',
    isSigned:false,writeEndpointsAvailable:false,
    files:Object.entries(assets).map(([p,v])=>({path:p,bytes:Buffer.byteLength(v),sha256:sha(Buffer.from(v))}))};
  fs.writeFileSync(path.join(folder,'private/package-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
function payload(version){
  const source=path.join(temp,'source-'+version);
  const bundle=path.join(temp,'signed-'+version);
  const extracted=path.join(temp,'extracted-'+version);
  fs.mkdirSync(source);fs.mkdirSync(bundle);fs.mkdirSync(extracted);
  const compiled=fs.existsSync(path.join(STAGE,'private/package-manifest.json'));
  if(compiled){
    fs.cpSync(STAGE,source,{recursive:true});
    const mf=path.join(source,'private/package-manifest.json');
    const sf=path.join(source,'private/compliance/sbom.cdx.json');
    const m=JSON.parse(fs.readFileSync(mf,'utf8'));
    const sbom=JSON.parse(fs.readFileSync(sf,'utf8'));
    m.releaseVersion=version;sbom.metadata.component.version=version;
    fs.writeFileSync(sf,JSON.stringify(sbom,null,2)+'\n');
    const newData=fs.readFileSync(sf);
    const sbomEntry=m.files.find(x=>x.path==='private/compliance/sbom.cdx.json');
    if(!sbomEntry)throw Error('Missing SBOM entry');
    sbomEntry.bytes=newData.length;sbomEntry.sha256=sha(newData);
    fs.writeFileSync(mf,JSON.stringify(m,null,2)+'\n');
  }else synthetic(source,version);
  const found=compiled ? verify(source) : JSON.parse(fs.readFileSync(
    path.join(source,'private/package-manifest.json'),'utf8'));
  ok(found.releaseVersion===version,'prepared release manifest binds selected code version');
  let info;
  if(compiled){
    info=buildSignedLabBundle(source,bundle,keys.privateKey,keys.publicKey);
  }else{
    // The PHP 8.1-8.4 matrix deliberately has no built Jedison bundle.
    // Sign a small *real ZIP* with the identical envelope format and Ed25519
    // verification path. Full inventory+SBOM tested on editor CI separately.
    const zip=path.join(bundle,'package.zip');
    runArchive('pack',source,zip);
    info=metadata(version,fs.readFileSync(zip),sha(fs.readFileSync(
      path.join(source,'private/package-manifest.json'))),keys.publicKey);
    writeEnvelope(bundle,info,keys.privateKey);
  }
  ok(info.version===version,'signed envelope pins selected release version');
  const result=run('python3',[path.join(ROOT,'tools/safe-offline-archive.py'),
    'extract',path.join(bundle,'package.zip'),extracted]);
  ok(result.status===0,'restricted archive extractor accepts signed '+version);
  return {source,bundle,extracted,metadata:info};
}
const keys=crypto.generateKeyPairSync('ed25519');
const pem=path.join(temp,'publisher-test-root.pem');
fs.writeFileSync(pem,keys.publicKey.export({type:'spki',format:'pem'}));
const fp=sha(keys.publicKey.export({type:'spki',format:'der'}));
let root=null;
const v1='0.2.0-stage2.1',v2='0.2.0-stage2.2';
try{
  const a=payload(v1),b=payload(v2);
  const setup=success(['setup',db],'prepare clean isolated SQLite foundation');
  ok(setup.first.codeVersion===v1&&setup.second.codeVersion===v2,
    'separate version-bound independent DB snapshots created');
  const cp1=path.join(temp,'approved-v1.json'),cp2=path.join(temp,'approved-v2.json');
  fs.writeFileSync(cp1,JSON.stringify(setup.first)+'\n');
  fs.writeFileSync(cp2,JSON.stringify(setup.second)+'\n');
  root=success(['new',db],'initialize empty switch lab').root;
  const activate=(x,checkpoint,current,seq,pin=fp,floor=v1,version=x.metadata.version,
    extracted=x.extracted,bundle=x.bundle)=>[
      'activate',db,root,checkpoint,bundle,extracted,pem,pin,version,floor,current,seq.toString()
    ];
  const inspect=()=>success(['inspect',db,root,v1],'inspect generation');
  const before=inspect();
  ok(before.registered===0&&before.sequence===0,'new code switcher is empty');

  denied(activate(a,cp1,'none',0,'0'.repeat(64)),
    'publisher key pin mismatch rejected before any stage');
  denied(activate(a,cp2,'none',0),
    'wrong version independent DB checkpoint rejected before any stage');
  denied(activate(a,cp1,'none',0,fp,'0.2.0-stage2.2'),
    'minimum version floor prevents signed downgrade');
  let state=inspect();
  ok(state.registered===0&&state.sequence===0,'bad signing/DB/floor never create a release slot');

  const first=success(activate(a,cp1,'none',0),'authenticated first release');
  installedLabs.push(first.installedLabRoot);
  ok(first.verification==='signed_inventory_and_db_checkpoint_passed'
    &&first.version===v1&&first.sequence===1&&!first.productionReady,
    'first activation binds Ed25519 signature, full inventory, DB baseline, generation');
  ok(first.manifestSha256===a.metadata.packageManifestSha256
    &&first.archiveSha256===a.metadata.archiveSha256,
    'native PHP result carries true signed archive/hash evidence');
  ok(success(['serve',db,root,v1,v1,cp1],'PHP runtime gate')['version']===v1,
    'separate PHP process independently gates active first version');

  denied(activate(b,cp2,'none',0),
    'stale current/version expected CAS rejected without staging second release');
  ok(inspect().registered===1,'stale CAS did not leave unintended installed code');
  // Corruption after safe ZIP extraction must be refused despite valid signature.
  const changed=path.join(b.extracted,'private/editor/editor.js');
  const original=fs.readFileSync(changed);
  fs.appendFileSync(changed,'\nmalicious');
  denied(activate(b,cp2,v1,1),
    'signed release refuses post-extraction modified editor payload');
  fs.writeFileSync(changed,original);
  denied(activate(b,cp2,v1,1,'f'.repeat(64)),
    'publisher substitution cannot activate');
  const changedArchive=path.join(b.bundle,'package.zip');
  const extra=Buffer.from('tamper');
  fs.appendFileSync(changedArchive,extra);
  denied(activate(b,cp2,v1,1),
    'archive bytes edited after detached signature are rejected');
  fs.truncateSync(changedArchive,fs.statSync(changedArchive).size-extra.length);
  ok(inspect().registered===1,'tampering not registered or activated');

  success(['mutate',db,'1'],'simulate out-of-band schema generation drift');
  denied(activate(b,cp2,v1,1),
    'non-matching DB storage generation refuses authenticated activation');
  ok(inspect().sequence===1,'DB-drift failed activation leaves current PHP generation unchanged');
  denied(['serve',db,root,v1,v1,cp1],
    'read-side DB checkpoint prevents serving stale foundation');
  success(['mutate',db,'0'],'synthetic approved DB state restored');
  ok(success(['serve',db,root,v1,v1,cp1],'restored PHP read')['sequence']===1,
    'only previously approved DB snapshot re-enables local request');

  const second=success(activate(b,cp2,v1,1),'authenticated upgrade to generation 2');
  installedLabs.push(second.installedLabRoot);
  ok(second.version===v2&&second.sequence===2&&second.files===first.files,
    'new immutable code slot installed only via integrated release+DB path');
  ok(success(['serve',db,root,v2,v1,cp2],'serve upgraded package').version===v2,
    'new release and matching DB checkpoint gate are both required');
  denied(['serve',db,root,v1,v1,cp1],
    'old version bound checkpoint cannot pretend to serve current release');
  denied(activate(b,cp2,v1,1),'repeat stale signed version blocked');
  ok(inspect().registered===2&&inspect().sequence===2,
    'no duplicate release registration or pointer replay');

  // Further unplanned DB mutation is detected after successful activation.
  success(['mutate',db,'2'],'simulate post-activation unexpected DB foundation change');
  denied(['serve',db,root,v2,v1,cp2],
    'post-activation DB drift blocks new request even if code hashes are intact');
  success(['mutate',db,'0'],'restore synthetic foundation from retained checkpoint');
  ok(success(['serve',db,root,v2,v1,cp2],'final release integrity').sequence===2,
    'separate PHP process resumes only with exact independently approved state');
  ok(inspect().status==='clean' && inspect().current===v2,
    'final pointer healthy after signed package and DB gates');
  ok(count>=39,'verified authentic release and negative cases executed');
  console.log('Stage2 Ed25519 ZIP -> safe extraction -> native PHP -> DB checkpoint -> CAS PASS: '+
    count+' checks; '+first.files+' files; CI disposable only, no real host or data migrations');
}finally{
  for(const lab of [...installedLabs,root]){
    if(typeof lab==='string' && path.dirname(lab)===fs.realpathSync(os.tmpdir())
      && /^ai-site-cms-php-(?:install|switch)-lab-[a-f0-9]{32}$/.test(path.basename(lab)))
      fs.rmSync(lab,{recursive:true,force:true});
  }
  if(path.dirname(temp)===fs.realpathSync(os.tmpdir())
    && /^ai-site-cms-trusted-upgrade-fixture-[a-zA-Z0-9]+$/.test(path.basename(temp)))
    fs.rmSync(temp,{recursive:true,force:true});
}
