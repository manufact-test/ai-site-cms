'use strict';
// Disposable, no-host Ed25519 signing workflow, plus adversarial file/CLI cases.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const scope=require('./stage2-operator-scope.cjs');
const consent=require('./stage2-owner-consent.cjs');
const script=path.join(__dirname,'stage2-owner-consent-sign.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
let n=0;
const ok=(v,name)=>{assert.ok(v,name);n++;};
const denied=(call,name)=>{assert.throws(call,undefined,name);n++;};
const root=fs.mkdtempSync(path.join(os.tmpdir(),'cms-stage2-owner-sign-'));
try {
  fs.chmodSync(root,0o700);
  const dirs={};
  for(const d of ['operator','owner','trust','receipts']){
    dirs[d]=path.join(root,d);fs.mkdirSync(dirs[d],{mode:0o700});
  }
  const now=Date.now(),utc=t=>new Date(Math.floor(t/1000)*1000)
    .toISOString().slice(0,19)+'Z';
  const record={
    format:scope.FORMAT,repository:'manufact-test/ai-site-cms',
    scope:'target-readonly-https-get',
    cmsOrigin:'https://cms.example.net',
    siteOrigin:'https://visitors.example.net',
    reference:'stage2-privately-authorized-example',
    issuedAt:utc(now-120000),expiresAt:utc(now+600000)
  };
  const sc=path.join(dirs.operator,'scope.json'),
    priv=path.join(dirs.owner,'private.pem'),
    pub=path.join(dirs.trust,'pinned.pem'),
    output=path.join(dirs.receipts,'consent.json');
  const kp=crypto.generateKeyPairSync('ed25519');
  const attacker=crypto.generateKeyPairSync('ed25519');
  const pem=kp.publicKey.export({type:'spki',format:'pem'});
  const pin=sha(kp.publicKey.export({type:'spki',format:'der'}));
  fs.writeFileSync(sc,JSON.stringify(record),{mode:0o600});
  fs.writeFileSync(priv,kp.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
  fs.writeFileSync(pub,pem,{mode:0o600});
  const cli=(more=[],env={})=>cp.spawnSync(process.execPath,[script,'--sign',
    '--scope-file='+sc,'--owner-private-key='+priv,
    '--trusted-owner-pubkey='+pub,
    '--trusted-owner-spki-sha256='+pin,
    '--output='+output,...more],{
    encoding:'utf8',timeout:10000,
    env:{...process.env,CMS_ENV:'test',
      CMS_STAGE2_OWNER_SIGNING:'offline-explicit-owner-action',...env}
  });
  const refused=(r,label)=>ok(r.status===3 &&r.stdout==='' &&
    r.stderr==='STAGE2_OFFLINE_OWNER_CONSENT_REFUSED\n',label);
  refused(cli([], {CMS_STAGE2_OWNER_SIGNING:''}),
    'implicit key use refused before writing');
  refused(cli([], {CMS_ENV:'production'}),'production cannot sign offline permits');
  refused(cli(['--extra=x']),'unknown CLI input denied');
  refused(cli(['--sign']),'duplicate sign flag denied');
  refused(cli(['--output='+output]),'duplicate output option denied');
  refused(cli(['--trusted-owner-spki-sha256=0']),
    'cannot inject substitute pin after explicit trusted pin');
  ok(!fs.existsSync(output),'refused CLI leaves no owner permit');
  const signed=cli();
  ok(signed.status===0&&signed.stderr===''&&
    signed.stdout.startsWith('STAGE2_OFFLINE_OWNER_CONSENT_WRITTEN'),
    'explicit signing succeeds locally without a host call');
  ok(!signed.stdout.includes(priv)&&!signed.stdout.includes(pem)&&
    !signed.stdout.includes(record.cmsOrigin),'stdout discloses no key or hostname');
  const checked=scope.readScope(sc,{
    cmsOrigin:record.cmsOrigin,siteOrigin:record.siteOrigin},now);
  const proof=consent.verify(output,pub,pin,checked,now);
  ok(proof.cryptographicScopeSignatureVerified===true&&
    proof.consentScopeSha256===checked.operatorScopeRecordSha256 &&
    proof.consentOriginsSha256===checked.originPairSha256,
    'independently re-opened verified permit pins exact approved origins and scope');
  const bytes=fs.readFileSync(output),obj=JSON.parse(bytes.toString('utf8'));
  ok(Buffer.from(JSON.stringify(obj)+'\n').equals(bytes)&&
    obj.payload.permission==='stage2-single-readonly-https-observation'&&
    obj.payload.productionReady===false,'canonical grant cannot authorize write/deploy');
  ok((fs.lstatSync(output).mode&0o077)===0 &&
    fs.lstatSync(output).nlink===1,'owner receipt stays single-linked mode 0600');
  refused(cli(),'pre-existing receipt cannot be silently overwritten');
  ok(fs.readFileSync(output).equals(bytes),'failed re-sign cannot change existing receipt');
  const replaced=JSON.parse(bytes);
  replaced.payload.originsSha256='e'.repeat(64);
  fs.writeFileSync(output,JSON.stringify(replaced)+'\n',{mode:0o600});
  denied(()=>consent.verify(output,pub,pin,checked,now),
    'tampered signed origin cannot be independently accepted');
  fs.writeFileSync(output,bytes);
  const fresh=path.join(dirs.receipts,'fresh.json');
  const goodArgs={
    '--scope-file':sc,'--owner-private-key':priv,
    '--trusted-owner-pubkey':pub,'--trusted-owner-spki-sha256':pin,
    '--output':fresh
  };
  const runDirect=(changed={})=>cp.spawnSync(process.execPath,[script,'--sign',
    ...Object.entries({...goodArgs,...changed}).map(([k,v])=>k+'='+v)],{
    encoding:'utf8',timeout:10000,
    env:{...process.env,CMS_ENV:'test',
      CMS_STAGE2_OWNER_SIGNING:'offline-explicit-owner-action'}
  });
  refused(runDirect({'--trusted-owner-spki-sha256':'0'.repeat(64)}),
    'wrong out-of-band pin blocked before any file output');
  const evilPub=path.join(dirs.trust,'attacker.pem');
  fs.writeFileSync(evilPub,attacker.publicKey.export({type:'spki',format:'pem'}),
    {mode:0o600});
  refused(runDirect({'--trusted-owner-pubkey':evilPub}),
    'substituted public signer rejected');
  const evilPrivate=path.join(dirs.owner,'attacker.pem');
  fs.writeFileSync(evilPrivate,attacker.privateKey.export({type:'pkcs8',format:'pem'}),
    {mode:0o600});
  refused(runDirect({'--owner-private-key':evilPrivate}),
    'substituted private signer rejected');
  const aliased=path.join(dirs.owner,'alias.pem');fs.symlinkSync(priv,aliased);
  refused(runDirect({'--owner-private-key':aliased}),
    'private-key symlink rejected');
  fs.unlinkSync(aliased);
  fs.chmodSync(priv,0o644);
  refused(runDirect(),'world-readable owner private key refused');
  fs.chmodSync(priv,0o600);
  fs.chmodSync(dirs.trust,0o755);
  refused(runDirect(),'unprotected independent trust directory refused');
  fs.chmodSync(dirs.trust,0o700);
  const invalid=path.join(dirs.operator,'invalid.json');
  fs.writeFileSync(invalid,JSON.stringify({...record,
    siteOrigin:'https://attacker.example.net'}),{mode:0o600});
  // A distinct target scope can be signed, but is NOT interchangeable with
  // the original; verify against the original scope pin MUST fail.
  const other=path.join(dirs.receipts,'other.json');
  const otherRun=runDirect({'--scope-file':invalid,'--output':other});
  ok(otherRun.status===0,'independently explicitly chosen alternate scope signs only itself');
  denied(()=>consent.verify(other,pub,pin,checked,now),
    'owner permit for another visitor domain cannot replay to original sites');
  const expired=path.join(dirs.operator,'expired.json');
  fs.writeFileSync(expired,JSON.stringify({...record,
    issuedAt:utc(now-3600000),expiresAt:utc(now-1800000)}),{mode:0o600});
  refused(runDirect({'--scope-file':expired}),
    'expired grant cannot be signed into a future-valid consent');
  const far=path.join(dirs.operator,'future.json');
  fs.writeFileSync(far,JSON.stringify({...record,issuedAt:utc(now+3600000),
    expiresAt:utc(now+7200000)}),{mode:0o600});
  refused(runDirect({'--scope-file':far}),
    'future unapproved time window blocked');
  const keyCo=path.join(dirs.operator,'owner.pem');
  fs.copyFileSync(priv,keyCo);fs.chmodSync(keyCo,0o600);
  refused(runDirect({'--owner-private-key':keyCo}),
    'signing key may not be colocated with untrusted scope');
  const outputCo=path.join(dirs.owner,'output.json');
  refused(runDirect({'--output':outputCo}),
    'owner private-key folder cannot hold consent receipts');
  ok(!fs.existsSync(fresh)&&!fs.existsSync(outputCo),
    'failed signed outputs never leave phantom consents');
  console.log('Stage2 offline owner Ed25519 signing and independent verification '+
    n+' assertions PASS; isolated keys, no host and no production approval');
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
