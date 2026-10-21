'use strict';
// Stage2 A->B->C trust rotation. EXACT same Node-signed trust history fed into
// original PHP verifier using native and genuinely absent-ext Sodium backends.
// External epoch/root pin, dual signatures, journal recovery; CI-only, no host.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const cp=require('node:child_process'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const RUNNER=path.join(ROOT,'tests/stage2-cross-backend-rotation.php');
const FORMAT='ai-site-cms-stage2-trust-chain-lab-v1';
const DOMAIN=Buffer.from('AI-SITE-CMS-STAGE2-TRUST-ROTATION-V1\0');
const DER_PREFIX=Buffer.from('302a300506032b6570032100','hex');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const canonical=o=>Buffer.from(JSON.stringify(o)+'\n');
const fingerprint=k=>sha(k.publicKey.export({type:'spki',format:'der'}));
const pem=k=>k.publicKey.export({type:'spki',format:'pem'});
function runtime(binary,without=false){
  const r=cp.spawnSync(binary,[...(without?['-n']:[]),'-r',
    'echo json_encode([PHP_VERSION_ID,PHP_INT_SIZE,extension_loaded("sodium"),function_exists("sodium_crypto_sign_verify_detached"),PHP_SAPI]);'],
    {encoding:'utf8',timeout:15000});
  if(r.error||r.status!==0)throw Error('PHP runtime probe failed '+(r.stderr||r.error?.message));
  return JSON.parse(r.stdout);
}
function main(){
  assert.equal(DOMAIN.at(-1),0);
  if(process.argv[2]==='--self-test'){
    assert.equal(DER_PREFIX.length,12);
    assert.equal(canonical({a:1}).toString(),'{"a":1}\n');
    console.log('Stage2 dual-signature trust-rotation harness syntax/domains PASS 3');return;
  }
  const nativeOnly=process.argv[2]==='--native';
  assert.equal(process.argv.length,nativeOnly?3:2,'Usage: node test-stage2-trust-rotation-parity.cjs [--native|--self-test]');
  const native=process.env.CMS_NATIVE_PHP_BINARY||'php';
  const noSodium=process.env.CMS_PHP83_NO_SODIUM_BINARY,autoload=process.env.SODIUM_COMPAT_AUTOLOAD;
  const nativeProbe=runtime(native);
  assert.ok(nativeProbe[2]===true&&nativeProbe[4]==='cli','Need actual native Sodium PHP CLI');
  const compatProbe=nativeOnly?null:runtime(noSodium,true);
  if(!nativeOnly){
    assert.ok(path.isAbsolute(noSodium)&&fs.existsSync(noSodium),'A genuine Sodium-free binary is required');
    assert.ok(autoload&&path.isAbsolute(autoload)&&fs.existsSync(autoload),'A pinned candidate must be installed');
    assert.ok(compatProbe[0]>=80300&&compatProbe[0]<80400&&compatProbe[1]===8
      &&compatProbe[2]===false&&compatProbe[3]===false&&compatProbe[4]==='cli',
      'Refusing PHP with a native Sodium extension or function');
  }
  const keys=Array.from({length:4},()=>crypto.generateKeyPairSync('ed25519'));
  const [a,b,c,evil]=keys;
  for(const k of keys){
    const der=k.publicKey.export({type:'spki',format:'der'});
    assert.equal(der.length,44);
    assert.ok(der.subarray(0,12).equals(DER_PREFIX));
  }
  const rootPin=fingerprint(a),tmp=os.tmpdir();
  const root=fs.mkdtempSync(path.join(tmp,'ai-site-cms-trust-lab-'));
  const externalPem=path.join(tmp,'ai-site-cms-external-rotation-'+crypto.randomBytes(8).toString('hex')+'.pem');
  fs.writeFileSync(externalPem,pem(a),{mode:0o600});
  const chain=path.join(root,'trust-chain.json'),input=path.join(root,'query.json');
  const journal=path.join(root,'trust-intent.json'),lock=path.join(root,'trust-exclusive.lock');
  const temp=path.join(root,'trust-chain.json.new');
  const transition=(incumbent,successor,epoch,floor,overrides={})=>{
    const proposal={
      format:FORMAT,root:rootPin,from:fingerprint(incumbent),to:fingerprint(successor),
      epochFrom:epoch,epochTo:epoch+1,floorVersion:floor,
      newPublicDer:successor.publicKey.export({type:'spki',format:'der'}).toString('base64'),
      purpose:'scheduled-rotation',...overrides
    };
    const message=Buffer.concat([DOMAIN,canonical(proposal)]);
    return {proposal,oldSignature:crypto.sign(null,message,incumbent.privateKey).toString('hex'),
      newSignature:crypto.sign(null,message,successor.privateKey).toString('hex')};
  };
  const ab=transition(a,b,0,'0.2.0-stage2.1');
  const bc=transition(b,c,1,'0.2.0-stage2.2');
  const write=events=>fs.writeFileSync(chain,canonical({format:FORMAT,root:rootPin,events}),{mode:0o600});
  const backup=(filename,mutated,fn)=>{
    const original=fs.existsSync(filename)?fs.readFileSync(filename):null;
    try{
      if(mutated===null)fs.rmSync(filename,{force:true});
      else fs.writeFileSync(filename,mutated);
      return fn();
    }finally{
      if(original===null)fs.rmSync(filename,{force:true});
      else fs.writeFileSync(filename,original);
    }
  };
  const transcripts={native:[],compat:[]};
  let checks=0;
  const verify=(mode,label,expected,overrides={})=>{
    fs.writeFileSync(input,canonical({chain,rootPem:externalPem,rootPin,minEpoch:2,
      operation:'inspect',...overrides}),{mode:0o600});
    const proc=cp.spawnSync(mode==='native'?native:noSodium,
      [...(mode==='native'?[]:['-n']),RUNNER,mode,input],{
        encoding:'utf8',timeout:30000,maxBuffer:65536,
        env:{...process.env,CI:'true',CMS_ALLOW_PHP_INSTALL_LAB:'1',
          SODIUM_COMPAT_AUTOLOAD:mode==='compat'?autoload:''}
      });
    if(proc.error||proc.signal||proc.status!==0)throw Error(mode+' '+label+' PHP INFRASTRUCTURE '+(proc.error?.message||proc.stderr||proc.stdout));
    let proof;
    try{proof=JSON.parse(proc.stdout);}catch{throw Error(mode+' '+label+' invalid JSON '+proc.stdout);}
    assert.equal(proof.status,expected.status,mode+' '+label+' policy mismatch');
    assert.equal(proof.nativeExtension,mode==='native',mode+' '+label+' backend mismatch');
    if(expected.status==='ACCEPTED'){
      assert.equal(proof.epoch,expected.epoch,mode+' '+label+' epoch');
      assert.equal(proof.active,expected.active,mode+' '+label+' current signer');
      assert.equal(proof.floor,expected.floor,mode+' '+label+' release floor');
      assert.equal(proof.journal,expected.journal??'clean',mode+' '+label+' journal');
      assert.equal(proof.productionReady,false,'No Stage2 production approval');
    }
    if(mode!=='absent')transcripts[mode].push({
      case:label,status:proof.status,
      epoch:proof.epoch??null,active:proof.active??null,
      floor:proof.floor??null,journal:proof.journal??null
    });
    checks++;return proof;
  };
  const OK=(epoch,active,floor,journal='clean')=>({status:'ACCEPTED',epoch,active,floor,journal});
  const DENY={status:'REJECTED'};
  const assertSuite=mode=>{
    write([]);
    verify(mode,'genesis anchored root',OK(0,rootPin,null),{minEpoch:0});
    verify(mode,'genesis disallowed by external epoch',DENY,{minEpoch:1});
    write([ab]);
    verify(mode,'proper A to B signed rotation',OK(1,fingerprint(b),'0.2.0-stage2.1'),{minEpoch:1});
    write([ab,bc]);
    const good=verify(mode,'proper A-B-C double-signed rotation',
      OK(2,fingerprint(c),'0.2.0-stage2.2'));
    verify(mode,'untrusted external root pin',DENY,{rootPin:fingerprint(evil)});
    backup(externalPem,pem(evil),()=>verify(mode,'substituted public root key',DENY));
    verify(mode,'external epoch lower-bound blocks replay',DENY,{minEpoch:3});
    write([ab]);
    verify(mode,'full-chain truncation below independent epoch',DENY);
    write([ab,bc]);
    write([{...ab,oldSignature:'0'.repeat(128)},bc]);
    verify(mode,'corrupted incumbent signature',DENY);
    write([{...ab,newSignature:'0'.repeat(128)},bc]);
    verify(mode,'corrupted successor co-signature',DENY);
    write([{...ab,proposal:{...ab.proposal,to:fingerprint(evil)}},bc]);
    verify(mode,'unsigned successor key substitution',DENY);
    write([ab,{...bc,proposal:{...bc.proposal,purpose:'arbitrary-change'}}]);
    verify(mode,'unsigned purpose mutation',DENY);
    write([ab,transition(b,c,1,'0.1.0-stage2.0')]);
    verify(mode,'valid signatures cannot lower version floor',DENY);
    write([ab,transition(b,a,1,'0.2.0-stage2.2')]);
    verify(mode,'dual-signed retired root reuse forbidden',DENY);
    write([ab,transition(b,c,1,'0.2.0-stage2.2',{epochFrom:2,epochTo:3})]);
    verify(mode,'dual-signed skipped trust epoch',DENY);
    write([ab,transition(b,c,1,'0.2.0-stage2.2',{from:fingerprint(evil)})]);
    verify(mode,'dual-signed false predecessor identity',DENY);
    write([ab,bc]);
    backup(chain,Buffer.concat([fs.readFileSync(chain),Buffer.from(' ')]),
      ()=>verify(mode,'noncanonical outer journal whitespace',DENY));
    backup(chain,Buffer.from('{"format":"'+FORMAT+'","root":"'+rootPin+'","events":[],"events":'+JSON.stringify([ab,bc])+'}\n'),
      ()=>verify(mode,'duplicate top-level security property',DENY));
    const badIntent={format:FORMAT,fromEpoch:2,eventSha256:'f'.repeat(64)};
    backup(journal,canonical(badIntent),()=>{
      verify(mode,'pending-before-commit is reported but not cleared',
        OK(2,fingerprint(c),'0.2.0-stage2.2','pending-before-commit'));
      verify(mode,'cannot release with unresolved operator intent',DENY,{operation:'release'});
      backup(journal,Buffer.concat([fs.readFileSync(journal),Buffer.from(' ')]),
        ()=>verify(mode,'noncanonical recovery journal',DENY));
    });
    const committedIntent={format:FORMAT,fromEpoch:1,eventSha256:sha(canonical(bc))};
    backup(journal,canonical(committedIntent),()=>{
      verify(mode,'commit-before-cleanup retained as unresolved',
        OK(2,fingerprint(c),'0.2.0-stage2.2','committed-needs-cleanup'));
      verify(mode,'release forbidden before journal cleanup',DENY,{operation:'release'});
    });
    backup(journal,canonical({format:FORMAT,fromEpoch:0,eventSha256:'f'.repeat(64)}),
      ()=>verify(mode,'irreconcilable signed-epoch journal',DENY));
    backup(temp,Buffer.from('interrupted'),()=>verify(mode,'atomic file residue refused',DENY));
    fs.mkdirSync(lock,{mode:0o700});
    try{verify(mode,'operator trust lock residue refused',DENY);}
    finally{fs.rmdirSync(lock);}
    verify(mode,'clean state after all adversarial cases',
      OK(2,fingerprint(c),'0.2.0-stage2.2'));
    return good;
  };
  try{
    const n=assertSuite('native');
    if(!nativeOnly){
      const compat=assertSuite('compat');
      assert.deepEqual(transcripts.native,transcripts.compat,
        'Native versus genuine userland Ed25519 rotation decisions differ');
      assert.equal(n.active,compat.active);
      verify('absent','absent both crypto backends refuses trust',DENY);
    }
    console.log(JSON.stringify({
      evidence:'stage2-byte-identical-double-signed-rotation',
      checks,nativePHP:nativeProbe[0],noSodiumPHP:compatProbe?.[0]??null,
      sameNodeSignedEvidence:true,trustRootPinned:true,
      externalMinimumEpoch:true,retiredKeysRefused:true,
      ambiguousJournalRejected:true,backendParity:nativeOnly?null:true,
      hostingerTested:false,realPublisherIdentityProven:false,
      cryptographicReviewApproved:false,stage2Accepted:false
    },null,2));
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
    fs.rmSync(externalPem,{force:true});
  }
}
try{main()}catch(e){
  console.error('STAGE2_ROTATION_PARITY_REFUSED '+(e.stack||e));
  process.exitCode=1;
}
