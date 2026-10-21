'use strict';
// CI-only: SAME Node-signed permit/receipt/settlement chain verified by
// original CMS PHP under native Sodium and actual Sodium-free PHP 8.3.
// No real publisher key, host, DB, activation or installation.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto'),cp=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const runner=path.join(root,'tests/stage2-cross-backend-settlement.php');
const domains={
  permit:Buffer.from('AI-SITE-CMS-STAGE2-PREACTIVATION-V1\0'),
  receipt:Buffer.from('AI-SITE-CMS-STAGE2-OPERATOR-RECEIPT-V1\0'),
  settlement:Buffer.from('AI-SITE-CMS-STAGE2-SETTLEMENT-V1\0')
};
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const canonical=x=>Buffer.from(JSON.stringify(x)+'\n');
function phpStatus(binary,options=[]){
  const r=cp.spawnSync(binary,[...options,'-r','echo json_encode([PHP_VERSION_ID,PHP_INT_SIZE,extension_loaded("sodium"),function_exists("sodium_crypto_sign_verify_detached"),PHP_SAPI]);'],{encoding:'utf8',timeout:15000});
  if(r.error||r.status!==0)throw Error('PHP runtime probe failed: '+(r.stderr||r.error?.message));
  return JSON.parse(r.stdout);
}
function assertBackendSource(){
  const source=fs.readFileSync(path.join(root,'src/Release/LabSettledUpgradeGate.php'),'utf8');
  assert.match(source,/Ed25519Backend::verifyDetached\(\$sig, self::DOMAIN \. \$raw, \$public\)/);
  assert.doesNotMatch(source,/!\s*sodium_crypto_sign_verify_detached\(/);
}
function main(){
  assertBackendSource();
  if(process.argv[2]==='--self-test'){
    assert.equal(Object.keys(domains).length,3);
    for(const value of Object.values(domains))assert.equal(value.at(-1),0);
    console.log('Stage2 signed-chain static backend/domain assertions PASS 4; no Hostinger');return;
  }
  const nativeOnly=process.argv[2]==='--native';
  assert.equal(process.argv.length,nativeOnly?3:2,'Unknown CLI input');
  const php=process.env.CMS_NATIVE_PHP_BINARY||'php';
  const noSodium=process.env.CMS_PHP83_NO_SODIUM_BINARY;
  const autoload=process.env.SODIUM_COMPAT_AUTOLOAD;
  if(!nativeOnly){
    assert.ok(noSodium&&path.isAbsolute(noSodium)&&fs.existsSync(noSodium));
    assert.ok(autoload&&path.isAbsolute(autoload)&&fs.existsSync(autoload));
  }
  const a=phpStatus(php),b=nativeOnly?null:phpStatus(noSodium,['-n']);
  assert.ok(a[2]===true&&a[4]==='cli','Native PHP verifier required');
  if(!nativeOnly)assert.ok(b[0]>=80300&&b[0]<80400&&b[1]===8&&b[2]===false
    &&b[3]===false&&b[4]==='cli','True no-Sodium PHP 8.3/64-bit required');
  const base=path.join(os.tmpdir(),'ai-site-cms-trusted-upgrade-fixture-'+crypto.randomBytes(8).toString('hex'));
  fs.mkdirSync(base,{mode:0o700});
  let checks=0;
  try{
    const dirs=['receipts','settlements','approved-permit-proofs','approved-permit-proofs/permit-000001','approved-permit-proofs/permit-000002'];
    for(const name of dirs)fs.mkdirSync(path.join(base,name),{mode:0o700});
    const receipts=path.join(base,'receipts'),settlements=path.join(base,'settlements');
    const permits=path.join(base,'approved-permit-proofs');
    const input=path.join(base,'fixture.json');
    const kp=crypto.generateKeyPairSync('ed25519');
    const der=kp.publicKey.export({type:'spki',format:'der'});
    assert.equal(der.length,44);
    assert.equal(der.subarray(0,12).toString('hex'),'302a300506032b6570032100');
    const operatorPin=sha(der),publisherPin='a'.repeat(64);
    const siteId='stage2-cross-backend',v1='0.2.0-stage2.1',v2='0.2.1-stage2.1';
    const publicPem=path.join(base,'operator.pem');
    fs.writeFileSync(publicPem,kp.publicKey.export({type:'spki',format:'pem'}),{mode:0o600});
    const make=(kind,stem,obj)=>{
      const message=canonical(obj),sig=crypto.sign(null,Buffer.concat([domains[kind],message]),kp.privateKey);
      fs.writeFileSync(stem+'.json',message,{mode:0o600});
      fs.writeFileSync(stem+'.sig',sig,{mode:0o600});
      return sha(Buffer.concat([domains[kind],message,sig]));
    };
    const p1file=path.join(permits,'permit-000001','permit');
    const p2file=path.join(permits,'permit-000002','permit');
    const r1file=path.join(receipts,'receipt-000001');
    const r2file=path.join(receipts,'receipt-000002');
    const s1file=path.join(settlements,'settlement-000001');
    const s2file=path.join(settlements,'settlement-000002');
    const r1={format:'ai-site-cms-stage2-operator-activation-receipt-v1',
      siteId,sequence:1,fromVersion:null,version:v1,minimumVersion:v1,
      publisherFingerprint:publisherPin,manifestSha256:'b'.repeat(64),
      archiveSha256:'c'.repeat(64),dbCheckpoint:{codeVersion:v1},
      previousReceiptSha256:null,productionReady:false};
    const p1={format:'ai-site-cms-stage2-preactivation-approval-v1',
      siteId,nonce:'1'.repeat(32),switchRootSha256:'d'.repeat(64),
      sequence:1,fromVersion:null,version:v1,minimumVersion:v1,
      previousReceiptSha256:null,publisherFingerprint:publisherPin,
      manifestSha256:r1.manifestSha256,archiveSha256:r1.archiveSha256,
      dbCheckpoint:{codeVersion:v1},productionReady:false};
    const p1Head=make('permit',p1file,p1),r1Head=make('receipt',r1file,r1);
    const p2={...p1,nonce:'2'.repeat(32),sequence:2,fromVersion:v1,
      version:v2,previousReceiptSha256:r1Head,dbCheckpoint:{codeVersion:v2}};
    const r2={...r1,sequence:2,fromVersion:v1,version:v2,
      previousReceiptSha256:r1Head,dbCheckpoint:{codeVersion:v2}};
    const p2Head=make('permit',p2file,p2),r2Head=make('receipt',r2file,r2);
    const s1={format:'ai-site-cms-stage2-settlement-v1',siteId,sequence:1,
      version:v1,permitSha256:p1Head,receiptSha256:r1Head,
      previousSettlementSha256:null,productionReady:false};
    const s1Head=make('settlement',s1file,s1);
    const s2={...s1,sequence:2,version:v2,permitSha256:p2Head,
      receiptSha256:r2Head,previousSettlementSha256:s1Head};
    const s2Head=make('settlement',s2file,s2);
    const passed={native:[],compat:[]};
    const invoke=(mode,label,expected,overrides={})=>{
      const options={settlements,receipts,permits,publicPem,operatorPin,
        publisherPin,receiptHead:r2Head,settlementHead:s2Head,siteId,...overrides};
      fs.writeFileSync(input,canonical(options),{mode:0o600});
      const bin=mode==='native'?php:noSodium;
      const result=cp.spawnSync(bin,[...(mode==='native'?[]:['-n']),runner,mode,input],{
        encoding:'utf8',timeout:30000,maxBuffer:32768,
        env:{...process.env,CI:'true',CMS_ALLOW_PHP_INSTALL_LAB:'1',
          SODIUM_COMPAT_AUTOLOAD:mode==='compat'?autoload:''}
      });
      if(result.error||result.status!==0)throw Error(mode+' '+label+' INFRA: '+(result.stderr||result.error?.message||result.stdout));
      let outcome;
      try{outcome=JSON.parse(result.stdout);}catch{throw Error(mode+' '+label+' invalid JSON '+result.stdout);}
      assert.equal(outcome.status,expected,mode+' '+label);
      assert.equal(outcome.nativeExtension,mode==='native',mode+' wrong runtime');
      if(expected==='ACCEPTED'){
        assert.equal(outcome.count,2);
        assert.equal(outcome.head,options.settlementHead);
        assert.equal(outcome.version,v2);
        assert.equal(outcome.productionReady,false);
      }
      if(mode!=='absent')passed[mode].push(label+':'+outcome.status);
      checks++;return outcome;
    };
    const deny=(mode,label,overrides)=>invoke(mode,label,'REJECTED',overrides);
    const edit=(file,modified,fn)=>{
      const original=fs.readFileSync(file);
      try{fs.writeFileSync(file,modified);return fn();}
      finally{fs.writeFileSync(file,original);}
    };
    const suite=mode=>{
      const good=invoke(mode,'valid dual-generation signed chain','ACCEPTED');
      deny(mode,'wrong operator key pin',{operatorPin:'0'.repeat(64)});
      deny(mode,'wrong publisher identity',{publisherPin:'e'.repeat(64)});
      deny(mode,'cross-site replay',{siteId:'another-site'});
      deny(mode,'prior external receipt highwater',{receiptHead:r1Head});
      deny(mode,'prior external settlement highwater',{settlementHead:s1Head});
      edit(s2file+'.sig',Buffer.alloc(64),()=>deny(mode,'forged settlement signature'));
      edit(p2file+'.sig',Buffer.alloc(64),()=>deny(mode,'forged permit signature'));
      edit(r2file+'.sig',Buffer.alloc(64),()=>deny(mode,'forged receipt signature'));
      edit(s2file+'.json',Buffer.concat([fs.readFileSync(s2file+'.json'),Buffer.from(' ')]),
        ()=>deny(mode,'altered settlement metadata'));
      edit(p2file+'.json',Buffer.concat([fs.readFileSync(p2file+'.json'),Buffer.from(' ')]),
        ()=>deny(mode,'altered permit metadata'));
      const unexpected=path.join(receipts,'unexpected.json');
      fs.writeFileSync(unexpected,'{}');
      try{deny(mode,'extra receipt file');}finally{fs.unlinkSync(unexpected);}
      const existing=fs.readFileSync(s2file+'.sig');
      fs.unlinkSync(s2file+'.sig');
      try{deny(mode,'missing settlement signature');}
      finally{fs.writeFileSync(s2file+'.sig',existing);}
      const toRestore=[p2file+'.json',p2file+'.sig',s2file+'.json',s2file+'.sig'];
      const bytes=toRestore.map(f=>fs.readFileSync(f));
      try{
        const forged=make('permit',p2file,{...p2,nonce:p1.nonce});
        const forgedHead=make('settlement',s2file,{...s2,permitSha256:forged});
        deny(mode,'correctly signed reused permit nonce',{settlementHead:forgedHead});
      }finally{toRestore.forEach((f,i)=>fs.writeFileSync(f,bytes[i]));}
      try{
        const forged=make('permit',p2file,{...p2,manifestSha256:'f'.repeat(64)});
        const forgedHead=make('settlement',s2file,{...s2,permitSha256:forged});
        deny(mode,'correctly signed contradictory manifest',{settlementHead:forgedHead});
      }finally{toRestore.forEach((f,i)=>fs.writeFileSync(f,bytes[i]));}
      invoke(mode,'original chain restored','ACCEPTED');
      return good;
    };
    const native=suite('native');
    if(!nativeOnly){
      const compat=suite('compat');
      assert.equal(native.head,compat.head,'Native and compat heads diverged');
      assert.deepEqual(passed.native,passed.compat,'Signed policy transcript mismatch');
      deny('absent','no cryptographic verifier must fail closed');
    }
    console.log(JSON.stringify({evidence:'signed-permit-receipt-settlement-parity',
      checks,nativePHP:a[0],noSodiumPHP:b?.[0]??null,sameSignedBytes:true,
      sameSignedHead:nativeOnly?null:true,
      signatureBackends:nativeOnly?['native']:['native','pinned userland 2.5.2'],
      policy:'original CMS PHP',hostingerTested:false,
      publisherIdentityIndependentlyVerified:false,stage2Accepted:false},null,2));
  }finally{fs.rmSync(base,{recursive:true,force:true});}
}
try{main()}catch(e){console.error('STAGE2_SIGNED_CHAIN_PARITY_REFUSED '+e.stack);process.exitCode=1;}
