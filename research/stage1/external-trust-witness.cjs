/* Stage 1 only. Out-of-site signed witness boundary research.
 * WITNESS_SIGNER is privileged test process, not a live external service.
 * The separate receipt record + its writer are explicitly OUTSIDE the
 * attacker-controlled site volume. A rollback of both volumes is not caught.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const siteTool=path.join(__dirname,'persistent-capability-trust.php');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'stage1-outside-witness-'));
const dir=path.join(root,'site-volume'),witnessDir=path.join(root,'separate-witness-volume');
fs.mkdirSync(dir);fs.mkdirSync(witnessDir);
const witnessFile=path.join(witnessDir,'current-receipt.json');
const issuer=crypto.generateKeyPairSync('ed25519'),publisher=crypto.generateKeyPairSync('ed25519'),forger=crypto.generateKeyPairSync('ed25519');
const pub=publisher.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('base64');
const env={...process.env,STAGE1_TRUST_ED25519_PUBLIC:pub,STAGE1_TRUST_HMAC:crypto.randomBytes(32).toString('base64'),STAGE1_TRUST_TEST_ADMIN:'1'};
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
let assertions=0,refusals=0,cli=0;
function pass(x,msg){assert.ok(x,msg);assertions++;}
function equals(a,b,msg){assert.deepEqual(a,b,msg);assertions++;}
function throws(fn,msg){assert.throws(fn,undefined,msg);assertions++;refusals++;}
function php(op,input={},extra={}){
 const r=spawnSync('php',[siteTool,dir,op],{encoding:'utf8',input:JSON.stringify(input),env:{...env,...extra},timeout:15000});cli++;
 if(r.status!==0)throw Error('PHP '+op+': '+r.stderr);
 pass(r.stdout.startsWith('STAGE1_TRUST_PHP='),'PHP result prefix');
 return JSON.parse(r.stdout.slice('STAGE1_TRUST_PHP='.length));
}
function pack(version){
 const payload={publisher:'example-vendor',packId:'reviewed-site-visual',version,reviewTicket:'SEC-RESEARCH-ONLY',fields:{
 gradientFrom:{kind:'hex',target:'visual.background.gradient.start',default:'#102030'},
 motionDuration:{kind:'integer',target:'visual.animation.durationMs',default:800},
 imageAlt:{kind:'text',target:'visual.media.alt',default:'Field sample'}}};
 const raw=Buffer.from(JSON.stringify(payload));
 return {base64Payload:raw.toString('base64'),signature:crypto.sign(null,raw,publisher.privateKey).toString('base64')};
}
function siteState(){return php('read').state;}
function stateDigest(s){return sha(JSON.stringify(s));}
function proposal(s,last){
 return {domain:'ai-site-cms.stage1.witness.v1',site:'stage1-isolated-site',generation:s.generation,
 version:s.version,installedDigest:s.digest,revoked:s.revoked,
 ownerDigest:sha(JSON.stringify(s.owner)),stateDigest:stateDigest(s),previousReceiptHash:last?sha(JSON.stringify(last)):'GENESIS'};
}
function signedReceipt(p,key=issuer.privateKey){
 const raw=Buffer.from(JSON.stringify(p));
 return {payload:raw.toString('base64'),signature:crypto.sign(null,raw,key).toString('base64')};
}
function verifySignature(rec){
 if(!rec||typeof rec.payload!=='string'||typeof rec.signature!=='string')throw Error('invalid-receipt-envelope');
 const raw=Buffer.from(rec.payload,'base64'),sig=Buffer.from(rec.signature,'base64');
 if(!raw.length||raw.length>5000||sig.length!==64||!crypto.verify(null,raw,issuer.publicKey,sig))throw Error('invalid-receipt-signature');
 const p=JSON.parse(raw.toString('utf8'));
 const keys=['domain','site','generation','version','installedDigest','revoked','ownerDigest','stateDigest','previousReceiptHash'].sort();
 if(!p||Array.isArray(p)||Object.keys(p).sort().join(',')!==keys.join(',')||
 p.domain!=='ai-site-cms.stage1.witness.v1'||p.site!=='stage1-isolated-site'||
 !Number.isSafeInteger(p.generation)||p.generation<1||typeof p.revoked!=='boolean'||
 ![p.ownerDigest,p.stateDigest].every(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x))||
 typeof p.installedDigest!=='string'||typeof p.version!=='string'||typeof p.previousReceiptHash!=='string')throw Error('invalid-receipt-policy');
 return p;
}
function readWitness(){
 if(!fs.existsSync(witnessFile))throw Error('no-trusted-external-witness');
 const raw=fs.readFileSync(witnessFile,'utf8');
 if(raw.length>11000)throw Error('witness-too-large');
 const r=JSON.parse(raw);return {r,p:verifySignature(r)};
}
function checkpoint(){
 // Only the simulated PRIVILEGED WITNESS SIGNER calls this function. Real
 // implementation must accept approved authenticated transaction evidence.
 const s=siteState();
 let last=null,previous=null;
 if(fs.existsSync(witnessFile)){const x=readWitness();last=x.r;previous=x.p;}
 if(!previous){if(s.generation!==1||s.revoked||s.version!=='none')throw Error('not-genesis');}
 else{
  if(s.generation!==previous.generation+1)throw Error('witness-monotonic-generation');
  if(previous.revoked&&!s.revoked)throw Error('revocation-rollback');
  if(previous.version!=='none'&&s.version!=='none'&&
     (s.version.localeCompare(previous.version,undefined,{numeric:true})<0))throw Error('version-rollback');
 }
 const receipt=signedReceipt(proposal(s,last));
 fs.writeFileSync(witnessFile,JSON.stringify(receipt),{flag:'w'});
 return receipt;
}
function verifyCurrent(){
 const {r,p}=readWitness();
 const live=siteState();
 const expected=proposal(live,null);
 for(const k of ['domain','site','generation','version','installedDigest','revoked','ownerDigest','stateDigest']){
  if(p[k]!==expected[k])throw Error('site-versus-external-witness-'+k);
 }
 return {generation:p.generation,version:p.version,revoked:p.revoked,hash:sha(JSON.stringify(r))};
}
(async()=>{
 try{
  php('init');checkpoint();
  let v=verifyCurrent();equals(v.generation,1);pass(v.revoked===false);
  const genesis=fs.readFileSync(witnessFile);
  php('install',pack('1.0.0'));
  throws(()=>verifyCurrent(),'local transition before attestation fails closed');
  checkpoint();v=verifyCurrent();equals(v.version,'1.0.0');
  php('owner',{field:'gradientFrom',value:'#123456'});
  throws(()=>verifyCurrent(),'uncheckpointed owner update fails closed');
  checkpoint();v=verifyCurrent();equals(v.generation,3);
  const staleState=fs.readFileSync(path.join(dir,'state.json'));
  const staleAnchor=fs.readFileSync(path.join(dir,'anchor.json'));
  const oldWitness=fs.readFileSync(witnessFile);
  php('install',pack('1.1.0'));checkpoint();
  equals(verifyCurrent().version,'1.1.0');
  php('revoke',{approved:true});
  throws(()=>verifyCurrent(),'unconfirmed revoke not trusted yet');
  checkpoint();
  pass(verifyCurrent().revoked,'revocation witnessed');
  const revokedReceipt=fs.readFileSync(witnessFile);
  // v1.25 exploit of state.json AND anchor.json rollback is now detected
  // under the explicit assumption the separate witness cannot be rolled back.
  fs.writeFileSync(path.join(dir,'state.json'),staleState);
  fs.writeFileSync(path.join(dir,'anchor.json'),staleAnchor);
  throws(()=>verifyCurrent(),'full SITE volume rollback denied by independent receipt');
  throws(()=>checkpoint(),'privileged witness refuses older generation');
  fs.writeFileSync(path.join(witnessFile),oldWitness);
  equals(verifyCurrent().version,'1.0.0'); // INSECURE if external witness itself is replayable
  pass(verifyCurrent().revoked===false,'both volumes rollback remains exploitable');
  // Restore proper external witness, then repair only by restoring committed local state.
  fs.writeFileSync(witnessFile,revokedReceipt);
  throws(()=>verifyCurrent(),'restored latest witness still denies local rollback');
  // The local state was deliberately rolled back. Recreate the last-good
  // version by copying saved complete volume bytes from after revocation.
  // For test clarity use pre-revocation state+anchor then a fresh witness
  // cannot authorize another step. Leave it fail-closed.
  const forged=JSON.parse(fs.readFileSync(witnessFile,'utf8'));
  forged.signature=crypto.sign(null,Buffer.from(forged.payload,'base64'),forger.privateKey).toString('base64');
  fs.writeFileSync(witnessFile,JSON.stringify(forged));
  throws(()=>verifyCurrent(),'forged signing authority blocked');
  fs.writeFileSync(witnessFile,revokedReceipt);
  const corrupted=JSON.parse(revokedReceipt);
  const content=JSON.parse(Buffer.from(corrupted.payload,'base64').toString('utf8'));
  content.generation=3;
  corrupted.payload=Buffer.from(JSON.stringify(content)).toString('base64');
  fs.writeFileSync(witnessFile,JSON.stringify(corrupted));
  throws(()=>verifyCurrent(),'tampered witness body denied');
  fs.writeFileSync(witnessFile,revokedReceipt);
  fs.rmSync(witnessFile);
  throws(()=>verifyCurrent(),'missing witness is fail closed');
  fs.writeFileSync(witnessFile,genesis);
  throws(()=>verifyCurrent(),'old genesis witness cannot attest already advanced site state?');
  console.log('STAGE1_EXTERNAL_WITNESS='+JSON.stringify({pass:true,assertions,refusals,phpSeparateProcessCalls:cli,
   siteOnlyWholeVolumeRollbackDetected:true,externalWitnessTamperAndForgedKeyDenied:true,
   missingWitnessFailsClosed:true,replayOfBothSiteAndExternalWitnessUndetected:true,
   transitionBeforeWitnessCheckpointFailsClosed:true,
   limits:'Not a real independent online append-only witness or secure append-only counter. Privileged sign service simulated in Node memory, publisher/HMAC keys ephemeral, no production approval auth or cross-host durable transactions; full witness+site replay remains possible if trust boundary compromised.'}));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error('STAGE1_EXTERNAL_WITNESS_FAIL='+String(e.stack||e));process.exitCode=1});
