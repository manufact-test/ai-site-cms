/* AI Site CMS Stage1 research: actual PHP CLI separate processes, Ed25519
 * signatures, HMAC local trust journal, anti-replay and rollback limitations. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync,spawn}=require('node:child_process');
const file=path.join(__dirname,'persistent-capability-trust.php');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage1-php-trust-'));
const kp=crypto.generateKeyPairSync('ed25519'),evil=crypto.generateKeyPairSync('ed25519');
const env={...process.env,STAGE1_TRUST_ED25519_PUBLIC:kp.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('base64'),
 STAGE1_TRUST_HMAC:crypto.randomBytes(32).toString('base64'),STAGE1_TRUST_TEST_ADMIN:'1'};
let checks=0,rejected=0,processes=0;
function exec(dir,op,input={},extra={}){
 const r=spawnSync('php',[file,dir,op],{input:JSON.stringify(input),encoding:'utf8',env:{...env,...extra},timeout:15000});
 processes++;return r;
}
function ok(dir,op,input={},extra={}){
 const r=exec(dir,op,input,extra);
 assert.equal(r.status,0,op+': '+r.stderr);checks++;
 assert.ok(r.stdout.startsWith('STAGE1_TRUST_PHP='));checks++;
 return JSON.parse(r.stdout.replace('STAGE1_TRUST_PHP=',''));
}
function refuse(dir,op,input,needle,extra={}){
 const r=exec(dir,op,input,extra);
 assert.notEqual(r.status,0,op+' incorrectly accepted');checks++;rejected++;
 if(needle){assert.ok(r.stderr.includes(needle),needle+': '+r.stderr);checks++;}
}
function base(version='1.0.0'){
 return {publisher:'example-vendor',packId:'reviewed-site-visual',version,reviewTicket:'SEC-RESEARCH-ONLY',fields:{
 gradientFrom:{kind:'hex',target:'visual.background.gradient.start',default:'#112233'},
 motionDuration:{kind:'integer',target:'visual.animation.durationMs',default:1200},
 imageAlt:{kind:'text',target:'visual.media.alt',default:'Curated art'}}};
}
function seal(x,key=kp.privateKey){const raw=Buffer.from(JSON.stringify(x));
 return {base64Payload:raw.toString('base64'),signature:crypto.sign(null,raw,key).toString('base64')};}
async function parallel(dir,p,n){
 const all=Array.from({length:n},()=>new Promise((resolve,reject)=>{
  const cp=spawn('php',[file,dir,'install'],{env}),parts=[];
  cp.stdout.on('data',z=>parts.push(z));cp.on('error',reject);
  cp.on('close',status=>resolve(status));
  cp.stdin.end(JSON.stringify(p));
 }));
 const result=await Promise.all(all);processes+=n;return result;
}
(async()=>{
 try{
  const d=path.join(tmp,'live');fs.mkdirSync(d);
  ok(d,'init');assert.equal(ok(d,'read').state.version,'none');checks++;
  const v1=seal(base());ok(d,'install',v1);
  ok(d,'owner',{field:'gradientFrom',value:'#00bbcc'});
  ok(d,'owner',{field:'imageAlt',value:'Owner <img onerror=evil()> & reef'});
  const before=ok(d,'read').state;
  assert.equal(before.owner.gradientFrom,'#00bbcc');checks++;
  const v11=seal(base('1.1.0'));ok(d,'install',v11);
  const updated=ok(d,'read').state;
  assert.deepEqual(updated.owner,before.owner);checks++;
  refuse(d,'install',v1,'downgrade-or-replay');
  refuse(d,'install',v11,'downgrade-or-replay');
  refuse(d,'install',seal(base('2.0.0'),evil.privateKey),'invalid-publisher-signature');
  const tamper=seal(base('2.0.0'));
  const decoded=JSON.parse(Buffer.from(tamper.base64Payload,'base64').toString());
  decoded.fields.gradientFrom.default='#aabbcc';
  tamper.base64Payload=Buffer.from(JSON.stringify(decoded)).toString('base64');
  refuse(d,'install',tamper,'invalid-publisher-signature');
  const badTarget=base('2.0.0');badTarget.fields.gradientFrom.target='document.body.innerHTML';
  refuse(d,'install',seal(badTarget),'unapproved-operation');
  const permissions=base('2.0.0');permissions.permissions=['filesystem','network'];
  refuse(d,'install',seal(permissions),'unreviewed-pack');
  const unsafeCss=base('2.0.0');unsafeCss.fields.gradientFrom.default='url(//evil.invalid)';
  refuse(d,'install',seal(unsafeCss),'unapproved-operation');
  const deleted=base('2.0.0');delete deleted.fields.gradientFrom;
  refuse(d,'install',seal(deleted),'owner-migration-quarantine');
  const extension=base('2.0.0');delete extension.fields.motionDuration;
  extension.fields.script={kind:'js',target:'window.eval',default:'evil()'};
  refuse(d,'install',seal(extension),'unapproved-operation');
  refuse(d,'owner',{field:'imageAlt',value:{html:'<script>'}},'invalid-owner-edit');
  refuse(d,'owner',{field:'unregistered',value:'x'},'invalid-owner-edit');
  refuse(d,'revoke',{approved:true},'admin-required',{STAGE1_TRUST_TEST_ADMIN:'0'});
  assert.deepEqual(ok(d,'read').state.owner,before.owner);checks++;
  const attempts=await parallel(d,seal(base('1.2.0')),4);
  assert.equal(attempts.filter(x=>x===0).length,1);checks++;
  assert.equal(attempts.filter(x=>x!==0).length,3);checks++;rejected+=3;
  const settled=ok(d,'read').state;
  assert.equal(settled.version,'1.2.0');checks++;
  assert.deepEqual(settled.owner,before.owner);checks++;
  const oldState=fs.readFileSync(path.join(d,'state.json'));
  const oldAnchor=fs.readFileSync(path.join(d,'anchor.json'));
  ok(d,'revoke',{approved:true});
  refuse(d,'install',seal(base('2.0.0')),'publisher-revoked');
  assert.equal(ok(d,'read').state.revoked,true);checks++;
  fs.writeFileSync(path.join(d,'state.json'),oldState);
  refuse(d,'read',{},'monotonic-anchor-mismatch');
  // Important NEGATIVE result: reverting both locally HMAC-valid files can
  // restore pre-revocation status. External append-only anchor is missing.
  fs.writeFileSync(path.join(d,'anchor.json'),oldAnchor);
  assert.equal(ok(d,'read').state.revoked,false);checks++;
  const edited=JSON.parse(fs.readFileSync(path.join(d,'state.json'),'utf8'));
  edited.payload.owner.gradientFrom='#ff0033';
  fs.writeFileSync(path.join(d,'state.json'),JSON.stringify(edited));
  refuse(d,'read',{},'state-mac-rejected');
  const crash=path.join(tmp,'crash');fs.mkdirSync(crash);
  ok(crash,'init');ok(crash,'install',v1);
  refuse(crash,'install',v11,'injected-failure-after-state-before-anchor',
   {STAGE1_TRUST_FAILPOINT:'after-state-before-anchor'});
  refuse(crash,'read',{},'monotonic-anchor-mismatch');
  console.log('STAGE1_PERSISTENT_PACK_TRUST='+JSON.stringify({pass:true,checks,rejected,
   phpProcessInvocations:processes,concurrentWriters:4,concurrentWinners:1,
   ownerOverridesPreserved:2,verifiedCrossProcess:true,revocationPersisted:true,
   invalidSignatureOrUnapprovedOperationBlocked:true,partialRollbackDetected:true,
   wholeVolumeRollbackUndetected:true,partialWriteFailsClosed:true,
   limitations:'isolated PHP CLI local trust only, ephemeral env keys, no real auth, external anti-rollback anchor, fsync, distributed locking, key rotation or Hostinger proof'}));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error('STAGE1_PERSISTENT_PACK_TRUST_FAIL='+String(e.stack||e));process.exitCode=1});
