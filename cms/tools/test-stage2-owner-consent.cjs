'use strict';
// Standalone offline proof for the future signed owner read-only gate.
// Uses disposable ephemeral private keys and filenames ONLY; never asserts
// owner identity, Hostinger access, Stage2 acceptance, or production trust.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const scope=require('./stage2-operator-scope.cjs');
const signed=require('./stage2-owner-consent.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
let checks=0;
const ok=(v,n)=>{assert.ok(v,n);checks++;};
const denied=(fn,n)=>{assert.throws(fn,undefined,n);checks++;};
const root=fs.mkdtempSync(path.join(os.tmpdir(),'cms-owner-consent-'));
try{
  fs.chmodSync(root,0o700);
  const op=path.join(root,'operator'),independent=path.join(root,'trust');
  fs.mkdirSync(op,{mode:0o700});fs.mkdirSync(independent,{mode:0o700});
  const scopeFile=path.join(op,'scope.json');
  const file=path.join(op,'owner-consent.json'),publicFile=path.join(independent,'trusted.pem');
  const signer=crypto.generateKeyPairSync('ed25519');
  const attacker=crypto.generateKeyPairSync('ed25519');
  const pem=signer.publicKey.export({format:'pem',type:'spki'});
  const fingerprint=sha(signer.publicKey.export({format:'der',type:'spki'}));
  const now=Date.parse('2026-10-21T12:00:00Z');
  const origins={cmsOrigin:'https://cms.example.org',siteOrigin:'https://visitor.example.org'};
  const fields={format:scope.FORMAT,repository:'manufact-test/ai-site-cms',
    scope:'target-readonly-https-get',...origins,reference:'owner-approved-readonly-fixture',
    issuedAt:'2026-10-21T11:50:00Z',expiresAt:'2026-10-21T12:20:00Z'};
  fs.writeFileSync(scopeFile,JSON.stringify(fields),{mode:0o600});
  fs.writeFileSync(publicFile,pem,{mode:0o600});
  const inspected=scope.readScope(scopeFile,origins,now);
  const p={format:signed.FORMAT,scopeSha256:inspected.operatorScopeRecordSha256,
    originsSha256:inspected.originPairSha256,
    permission:'stage2-single-readonly-https-observation',
    expiresAt:inspected.scopeExpiresAt,nonce:'9'.repeat(32),productionReady:false};
  const sign=(payload,options={})=>{
    const message=Buffer.concat([signed.DOMAIN,Buffer.from(JSON.stringify(payload)+'\n')]);
    const signature=crypto.sign(null,message,options.key||signer.privateKey);
    return {format:signed.FORMAT,payload,signature:signature.toString('base64')};
  };
  const good=sign(p);
  const write=(value,bytes)=>fs.writeFileSync(file,bytes||JSON.stringify(value)+'\n',{mode:0o600});
  write(good);
  const verify=(other=inspected,pin=fingerprint)=>signed.verify(file,publicFile,pin,other,now);
  const evidence=verify();
  ok(evidence.cryptographicScopeSignatureVerified&&evidence.ownerPublicPinSha256===fingerprint
    &&!evidence.independentOwnerIdentityEstablished&&!evidence.productionReady
    &&!evidence.networkAttempted,'only pinned signature and scope can be established');
  denied(()=>signed.verify(file,publicFile,fingerprint,inspected,now+3600000),
    'expired consent cannot be reused');
  denied(()=>verify({...inspected,operatorScopeRecordSha256:'f'.repeat(64)}),
    'scope replay with different reference denied');
  denied(()=>verify({...inspected,originPairSha256:'a'.repeat(64)}),
    'cross-site origin replay denied');
  denied(()=>verify('bad'),'missing verified scope denied');
  denied(()=>verify(inspected,'a'.repeat(64)),'replaced trust fingerprint denied');
  const key=fs.readFileSync(publicFile);
  fs.writeFileSync(publicFile,attacker.publicKey.export({format:'pem',type:'spki'}));
  denied(()=>verify(),'public key substitution denied');
  fs.writeFileSync(publicFile,key);
  for(const [mut,name] of [
    [{...good,payload:{...p,productionReady:true}},'production ready spoof'],
    [{...good,payload:{...p,permission:'write-install'}},'write scope blocked'],
    [{...good,payload:{...p,scopeSha256:'0'.repeat(64)}},'scope hash substitution'],
    [{...good,payload:{...p,originsSha256:'0'.repeat(64)}},'origin substitution'],
    [{...good,payload:{...p,nonce:'short'}},'weak nonce refused'],
    [{...good,payload:{...p,expiresAt:'2026-10-21T12:19:00Z'}},'lifetime mismatch'],
    [{...good,signature:'A'.repeat(86)+'=='},'forged signature'],
    [{...good,signature:crypto.sign(null,Buffer.from(JSON.stringify(p)+'\n'),
        signer.privateKey).toString('base64')},'missing signing domain'],
    [sign(p,{key:attacker.privateKey}),'attacker correct format wrong signer'],
    [{...good,extra:true},'unreviewed consent field']
  ]){
    write(mut);denied(()=>verify(),name);
  }
  write(good,JSON.stringify(good)+' \n');
  denied(()=>verify(),'altered canonical whitespace refused');
  write(good,JSON.stringify(good).replace('"format"', '"format":"changed","format"')+'\n');
  denied(()=>verify(),'duplicate envelope JSON key refused');
  write(good,Buffer.from([0xef,0xbb,0xbf,...Buffer.from(JSON.stringify(good)+'\n')]));
  denied(()=>verify(),'BOM forbidden');
  write(good);
  fs.chmodSync(file,0o644);denied(()=>verify(),'world-readable consent refused');
  fs.chmodSync(file,0o600);
  const alias=path.join(op,'alias.json');fs.symlinkSync(file,alias);
  denied(()=>signed.verify(alias,publicFile,fingerprint,inspected,now),'symlink refused');
  fs.unlinkSync(alias);
  const hard=path.join(op,'hard.json');fs.linkSync(file,hard);
  denied(()=>verify(),'hardlinked consent refused');
  fs.unlinkSync(hard);
  fs.chmodSync(op,0o755);denied(()=>verify(),'group-accessible directory refused');
  fs.chmodSync(op,0o700);
  const outside=path.join(op,'trusted.pem');fs.copyFileSync(publicFile,outside);
  fs.chmodSync(outside,0o600);
  denied(()=>signed.verify(file,outside,fingerprint,inspected,now),
    'trust key co-located with untrusted operator scope refused');
  fs.unlinkSync(outside);
  for(const [raw,name] of [
    [JSON.stringify(fields)+'\n','trailing scope newline'],
    [JSON.stringify(fields).replace('"format"', '"format":"injected","format"'),'duplicate scope key'],
    [JSON.stringify({...fields,repository:'other/repository'}),'cross-project operator scope']
  ]){
    fs.writeFileSync(scopeFile,raw);
    denied(()=>scope.readScope(scopeFile,origins,now),name);
  }
  fs.writeFileSync(scopeFile,JSON.stringify(fields));
  ok(verify().cryptographicScopeSignatureVerified,
    'restored owner consent and scope validate');
  const marker=path.join(op,'owner-consent-consumed-'+evidence.ownerConsentSha256+'.json');
  const trap=path.join(root,'symlink-target');
  fs.writeFileSync(trap,'do not overwrite',{mode:0o600});
  fs.symlinkSync(trap,marker);
  denied(()=>signed.consumeOnce(file,evidence),
    'preexisting symlink consumption marker prevents access');
  ok(fs.readFileSync(trap,'utf8')==='do not overwrite',
    'symlink target stays unchanged');
  fs.unlinkSync(marker);
  denied(()=>signed.consumeOnce(file,{ownerConsentSha256:evidence.ownerConsentSha256}),
    'unverified grant cannot create a spent record');
  const spent=signed.consumeOnce(file,evidence);
  ok(spent.consentConsumedLocally&&spent.consumptionDigest===evidence.ownerConsentSha256
    &&spent.networkAttempted===false,'signed grant consumed before any network');
  denied(()=>signed.consumeOnce(file,evidence),
    'second invocation of same signed scope denied atomically');
  ok(fs.lstatSync(marker).isFile()&&
    (fs.lstatSync(marker).mode&0o077)===0,
    'private persistent consumption marker survives normal exit');
  console.log('Stage2 pinned owner read-only consent '+checks+
    ' offline signed/canonical/filesystem assertions PASS; no Hostinger, no owner identity claim');
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
