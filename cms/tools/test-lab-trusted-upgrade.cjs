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

const operatorKeys=crypto.generateKeyPairSync('ed25519');
const operatorPem=path.join(temp,'external-operator-public.pem');
fs.writeFileSync(operatorPem,operatorKeys.publicKey.export({type:'spki',format:'pem'}));
const operatorPin=sha(operatorKeys.publicKey.export({type:'spki',format:'der'}));
const receipts=path.join(temp,'operator-receipts');
fs.mkdirSync(receipts,{mode:0o700});
const signedDomain=Buffer.from('AI-SITE-CMS-STAGE2-OPERATOR-RECEIPT-V1\\0'.replace('\\0','\0'));
function signActivation(result,checkpoint,previousVersion,previousHead,where=receipts){
  const record={
    format:'ai-site-cms-stage2-operator-activation-receipt-v1',
    siteId:'labsite',sequence:result.sequence,fromVersion:previousVersion,
    version:result.version,minimumVersion:v1,publisherFingerprint:fp,
    manifestSha256:result.manifestSha256,archiveSha256:result.archiveSha256,
    dbCheckpoint:JSON.parse(fs.readFileSync(checkpoint,'utf8')),
    previousReceiptSha256:previousHead,productionReady:false
  };
  const raw=Buffer.from(JSON.stringify(record)+'\n');
  const sig=crypto.sign(null,Buffer.concat([signedDomain,raw]),operatorKeys.privateKey);
  const base=path.join(where,'receipt-'+String(result.sequence).padStart(6,'0'));
  fs.writeFileSync(base+'.json',raw,{flag:'wx',mode:0o600});
  fs.writeFileSync(base+'.sig',sig,{flag:'wx',mode:0o600});
  return sha(Buffer.concat([signedDomain,raw,sig]));
}
const attested=(head,receiptDir=receipts,key=operatorPem,pin=operatorPin,publisherPin=fp)=>[
  'attested-serve',db,root,receiptDir,key,pin,head,publisherPin
];

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
  // No signed post-activation receipt: a code pointer alone is never trusted.
  denied(attested('f'.repeat(64)), 'signed read denies newly switched but unattested first generation');
  const head1=signActivation(first,cp1,null,null);
  ok(success(attested(head1),'first signed operator attestation').attested,
    'signed out-of-band receipt gates the first code plus foundation DB generation');
  denied(attested('0'.repeat(64)), 'untrusted externally supplied chain tip rejected');
  denied(attested(head1,receipts,operatorPem,'0'.repeat(64)), 'operator signing key substitution blocked');
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
  denied(attested(head1), 'older signed chain cannot authorize newer code pointer');
  const head2=signActivation(second,cp2,v1,head1);
  ok(success(attested(head2),'second signed operator receipt').sequence===2,
    'signed hash-linked version 2 receipt binds code digest and DB foundation');
  denied(attested(head1), 'independent high-water head rejects replay of previous receipt');
  const latest=path.join(receipts,'receipt-000002.json');
  const latestSig=path.join(receipts,'receipt-000002.sig');
  const origReceipt=fs.readFileSync(latest);
  const origSig=fs.readFileSync(latestSig);
  const altered=Buffer.from(origReceipt);
  altered[20]^=1;
  fs.writeFileSync(latest,altered);
  denied(attested(head2),'operator receipt JSON mutation is rejected');
  fs.writeFileSync(latest,origReceipt);
  const badSig=Buffer.from(origSig);badSig[0]^=1;
  fs.writeFileSync(latestSig,badSig);
  denied(attested(head2),'detached operator Ed25519 signature tampering is rejected');
  fs.writeFileSync(latestSig,origSig);
  // Invalid semantics must also fail when signed with a VALID operator key
  // and a matching newly pinned head, not only on signature mismatch.
  const signedBad=(patch,label)=>{
    const rec=JSON.parse(origReceipt.toString('utf8'));
    patch(rec);
    const bytes=Buffer.from(JSON.stringify(rec)+'\n');
    const signature=crypto.sign(null,Buffer.concat([signedDomain,bytes]),operatorKeys.privateKey);
    fs.writeFileSync(latest,bytes);
    fs.writeFileSync(latestSig,signature);
    denied(attested(sha(Buffer.concat([signedDomain,bytes,signature]))),label);
    fs.writeFileSync(latest,origReceipt);
    fs.writeFileSync(latestSig,origSig);
  };
  signedBad(x=>{x.previousReceiptSha256='f'.repeat(64)},
    'valid signature cannot conceal severed previous receipt link');
  signedBad(x=>{x.sequence=1},
    'valid operator signature cannot replay an earlier sequence number');
  signedBad(x=>{x.version=v1;x.dbCheckpoint.codeVersion=v1},
    'valid signature cannot authorize nonmonotonic code downgrade');
  signedBad(x=>{x.manifestSha256='f'.repeat(64)},
    'valid signature cannot attest code digest different from installed files');
  signedBad(x=>{x.dbCheckpoint.fingerprint='0'.repeat(64)},
    'valid signature cannot conceal tampered independent DB foundation checkpoint');
  signedBad(x=>{x.publisherFingerprint='e'.repeat(64)},
    'valid receipt signer cannot override separately pinned release publisher');
  fs.renameSync(latestSig,latestSig+'.disabled');
  denied(attested(head2),'missing signature or stray ledger file fails closed');
  fs.renameSync(latestSig+'.disabled',latestSig);
  const oldOnly=path.join(temp,'old-signed-receipts');
  fs.mkdirSync(oldOnly);
  fs.copyFileSync(path.join(receipts,'receipt-000001.json'),path.join(oldOnly,'receipt-000001.json'));
  fs.copyFileSync(path.join(receipts,'receipt-000001.sig'),path.join(oldOnly,'receipt-000001.sig'));
  denied(attested(head2,oldOnly),'replayed old chain cannot match independent head watermark');
  denied(attested(head2,receipts,pem,fp),'publisher key is not an operator receipt signing key');
  denied(attested(head2,receipts,operatorPem,operatorPin,'0'.repeat(64)),
    'receipt publisher identity cannot be substituted independently');
  ok(success(attested(head2),'restored operator receipt chain').version===v2,
    'verified chain recovers after restoring exactly authentic bytes');

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
  ok(success(attested(head2),'before direct old API attack').sequence===2,
    'attested read is healthy before legacy laboratory bypass demonstration');
  success(['raw-rollback',db,root,v1],'exercise old direct research rollback method');
  denied(attested(head2),'raw low-level rollback cannot bypass signed read gate');
  // Separate second switch sandbox: the NEW guarded write path requires
  // operator approval signed BEFORE touching code. Never reuses production data.
  const authorizedRoot=success(['new',db],'independent preauthorized sandbox').root;
  const approvedReceipts=path.join(temp,'approved-receipts');
  const pending=path.join(temp,'approval-pending');
  const archived=path.join(temp,'approval-archived');
  for(const d of [approvedReceipts,pending,archived])fs.mkdirSync(d,{mode:0o700});
  const permitDomain=Buffer.from('AI-SITE-CMS-STAGE2-PREACTIVATION-V1\0');
  const authorized=(x,permit,prior,current,seq,failAt='none',signerPin=operatorPin,
    publisherPin=fp,receiptDir=approvedReceipts)=>[
    'approved-activate',db,authorizedRoot,receiptDir,pending,operatorPem,signerPin,permit,
    prior??'none',x.bundle,x.extracted,pem,publisherPin,current??'none',String(seq),failAt
  ];
  const review=(permit,prior,x=a,publisherPin=fp)=>[
    'approval-review',db,authorizedRoot,approvedReceipts,pending,operatorPem,operatorPin,
    permit,prior??'none',x.bundle,pem,publisherPin
  ];
  const strictRead=(head,pendingDir=pending,chain=approvedReceipts)=>[
    'approval-serve',db,authorizedRoot,chain,pendingDir,operatorPem,operatorPin,head,fp
  ];
  const permitFile=path.join(pending,'permit.json'),signatureFile=path.join(pending,'permit.sig');
  function issuePermit(x,checkpoint,sequence,fromVersion,previousHead,patch=()=>{}){
    const record={
      format:'ai-site-cms-stage2-preactivation-approval-v1',
      siteId:'labsite',nonce:crypto.randomBytes(16).toString('hex'),
      sequence,fromVersion,version:x.metadata.version,minimumVersion:v1,
      previousReceiptSha256:previousHead,publisherFingerprint:fp,
      manifestSha256:x.metadata.packageManifestSha256,
      archiveSha256:x.metadata.archiveSha256,
      dbCheckpoint:JSON.parse(fs.readFileSync(checkpoint,'utf8')),
      productionReady:false
    };
    patch(record);
    const raw=Buffer.from(JSON.stringify(record)+'\n');
    const sig=crypto.sign(null,Buffer.concat([permitDomain,raw]),operatorKeys.privateKey);
    fs.writeFileSync(permitFile,raw,{flag:'wx',mode:0o600});
    fs.writeFileSync(signatureFile,sig,{flag:'wx',mode:0o600});
    return sha(Buffer.concat([permitDomain,raw,sig]));
  }
  function withdrawPermit(){
    for(const f of ['permit.json','permit.sig']){
      fs.renameSync(path.join(pending,f),
        path.join(archived,'permit-'+crypto.randomBytes(6).toString('hex')+'-'+f));
    }
  }
  const firstPermit=issuePermit(a,cp1,1,null,null);
  denied(authorized(a,'f'.repeat(64),null,null,0),
    'unsigned or independently unpinned permit cannot register a release');
  denied(authorized(a,firstPermit,null,null,0,'none','0'.repeat(64)),
    'approval signer must match out-of-band pinned operator key');
  denied(authorized(a,firstPermit,null,null,0,'none',operatorPin,'0'.repeat(64)),
    'preapproval cannot silently change release publisher identity');
  denied(authorized(b,firstPermit,null,null,0),
    'valid signed approval for version 1 cannot authorize version 2 archive');
  denied(review(firstPermit,null,a),
    'crash-review refuses to attest a code generation never activated');
  const rawPermit=fs.readFileSync(permitFile),rawPermitSig=fs.readFileSync(signatureFile);
  const changedPermit=Buffer.from(rawPermitSig);changedPermit[0]^=1;
  fs.writeFileSync(signatureFile,changedPermit);
  denied(authorized(a,firstPermit,null,null,0),
    'preactivation signature tamper rejected before staging');
  fs.writeFileSync(signatureFile,rawPermitSig);
  ok(success(['inspect',db,authorizedRoot,v1],'preauthorized clean switch').registered===0,
    'rejected operator permits never create a new release slot');
  const authFirst=success(authorized(a,firstPermit,null,null,0),
    'operator-authorized signed ZIP and matching independent DB');
  installedLabs.push(authFirst.installedLabRoot);
  ok(authFirst.sequence===1&&authFirst.operatorReceiptPending===true
    &&authFirst.preactivationPermitHead===firstPermit,
    'preauthorized activation keeps external pending marker after code switch');
  denied(strictRead('f'.repeat(64)),
    'code remains unreadable with pending operator receipt');
  const approvedHead1=signActivation(authFirst,cp1,null,null,approvedReceipts);
  denied(strictRead(approvedHead1),
    'even after signing receipt the unresolved external pending marker blocks reads');
  withdrawPermit();
  ok(success(strictRead(approvedHead1),'fully attested first authorized release').preauthorizedRead,
    'explicit operator clearance restores strictly gated request after first attestation');

  const secondPermit=issuePermit(b,cp2,2,v1,approvedHead1);
  denied(strictRead(approvedHead1),
    'pending next approval forces temporary maintenance before any switch');
  denied(authorized(b,secondPermit,'0'.repeat(64),v1,1),
    'preapproval cannot override independently pinned predecessor chain head');
  denied(authorized(b,secondPermit,approvedHead1,'none',0),
    'preapproval requires exact prior code generation CAS');
  denied(authorized(b,secondPermit,approvedHead1,v1,1,'none',operatorPin,'a'.repeat(64)),
    'valid operator signature cannot substitute another publisher archive');
  // Simulate CLI death immediately AFTER the real native PHP CAS switch and
  // BEFORE the new signed operator receipt. No implicit rollback or unblocking.
  denied(authorized(b,secondPermit,approvedHead1,v1,1,'after-activation'),
    'injected post-CAS operator crash provides no success receipt');
  const crashed=success(['inspect',db,authorizedRoot,v1],'crash aftermath');
  ok(crashed.current===v2&&crashed.sequence===2&&crashed.status==='clean',
    'code activation happened, but only independent operator can finalize trust');
  const registered=JSON.parse(fs.readFileSync(path.join(authorizedRoot,'releases.json'),'utf8'));
  installedLabs.push(registered.releases[v2].root);
  denied(strictRead(approvedHead1),
    'post-switch/pre-receipt crash prevents any strict read, including old head');
  denied(authorized(b,secondPermit,approvedHead1,v1,1),
    'replayed signed approval cannot activate once CAS has advanced');
  const brokenArchive=path.join(b.bundle,'package.zip');
  fs.appendFileSync(brokenArchive,Buffer.from('corrupted-package'));
  denied(review(secondPermit,approvedHead1,b),
    'interrupted activation cannot be approved while publisher ZIP has been tampered');
  fs.truncateSync(brokenArchive,fs.statSync(brokenArchive).size-'corrupted-package'.length);
  const previousSig=path.join(approvedReceipts,'receipt-000001.sig');
  const firstSigOriginal=fs.readFileSync(previousSig);
  const wrongPreviousSig=Buffer.from(firstSigOriginal);wrongPreviousSig[4]^=1;
  fs.writeFileSync(previousSig,wrongPreviousSig);
  denied(review(secondPermit,approvedHead1,b),
    'post-crash review requires intact signed previous activation lineage');
  fs.writeFileSync(previousSig,firstSigOriginal);
  const reviewed=success(review(secondPermit,approvedHead1,b),
    'read-only independent post-crash review of exact manifest, CAS and DB');
  ok(reviewed.version===v2&&reviewed.sequence===2
      &&reviewed.manifestSha256===b.metadata.packageManifestSha256,
    'crash review obtains independently verified code+DB evidence for later signing');
  const approvedHead2=signActivation(reviewed,cp2,v1,approvedHead1,approvedReceipts);
  denied(strictRead(approvedHead2),
    'operator-signed recovery receipt alone does not clear pending approval');
  withdrawPermit();
  ok(success(strictRead(approvedHead2),'manual explicit crash reconciliation').sequence===2,
    'manual signed receipt plus approval retirement resumes guarded CMS read');
  denied(strictRead(approvedHead1),
    'out-of-band head prevents serving older receipt after manually reconciled crash');

  // Validly signed, semantically hostile preapproval; never reuses old CAS.
  const stalePermit=issuePermit(b,cp2,2,v1,approvedHead1);
  denied(authorized(b,stalePermit,approvedHead1,v1,1),
    'signed replay after successful reconciliation fails on current generation');
  denied(strictRead(approvedHead2),
    'stale permit blocks reads until operator explicitly cancels/retires it');
  withdrawPermit();
  ok(success(strictRead(approvedHead2),'read after revoked stale permit').version===v2,
    'explicit operator rejection of old authorization restores same attested version');

  ok(count>=123,'signed preactivation, crash reconciliation and negative test suite executed');

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
