'use strict';
// LAB ONLY: signed cross-key trust succession, never production publisher authority.
// Root public key and minimum accepted epoch are out-of-band inputs.
// Local files are NOT tamper-resistant and cannot independently prevent full-state rollback.
const fs=require('node:fs'), path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {verifyEnvelope,compare}=require('./lab-signed-offline-release.cjs');
const FORMAT='ai-site-cms-stage2-trust-chain-lab-v1';
const DOMAIN=Buffer.from('AI-SITE-CMS-STAGE2-TRUST-ROTATION-V1\0');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const canonical=x=>Buffer.from(JSON.stringify(x)+'\n');
const has=x=>{try{fs.lstatSync(x);return true}catch(e){if(e.code==='ENOENT')return false;throw e}};
function assertExact(obj,fields){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||
    Object.keys(obj).sort().join('|')!==fields.slice().sort().join('|'))
    throw Error('Invalid trust state fields');
}
function publicKey(value){
  if(!value||value.type==='private')throw Error('Out-of-band public key required');
  const key=value.type==='public'?value:crypto.createPublicKey(value);
  if(key.asymmetricKeyType!=='ed25519')throw Error('Only Ed25519 public trust anchors');
  return key;
}
const keyDer=key=>publicKey(key).export({type:'spki',format:'der'});
const fingerprint=key=>sha(keyDer(key));
function safeRoot(root){
  const parent=fs.realpathSync(os.tmpdir());
  if(path.dirname(root)!==parent||!path.basename(root).startsWith('ai-site-cms-trust-lab-'))
    throw Error('Disposable trust laboratory required');
  const st=fs.lstatSync(root);
  if(!st.isDirectory()||st.isSymbolicLink())throw Error('Untrusted trust root');
}
function readJson(file){
  const st=fs.lstatSync(file);
  if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<4||st.size>32768)
    throw Error('Unsafe trust record');
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function putNew(file,value){
  const fd=fs.openSync(file,'wx',0o600);
  try{fs.writeFileSync(fd,canonical(value));fs.fsyncSync(fd)}
  finally{fs.closeSync(fd)}
}
function atomic(file,value){
  const temp=file+'.new';
  putNew(temp,value);
  fs.renameSync(temp,file);
}
function verifyEvent(event,oldKey,rootFp,oldFp,epoch,floor,used){
  assertExact(event,['proposal','oldSignature','newSignature']);
  const p=event.proposal;
  assertExact(p,['format','root','from','to','epochFrom','epochTo','floorVersion','newPublicDer','purpose']);
  if(p.format!==FORMAT||p.purpose!=='scheduled-rotation'||p.root!==rootFp||
     p.from!==oldFp||p.epochFrom!==epoch||p.epochTo!==epoch+1||
     !Number.isSafeInteger(p.epochTo)||p.epochTo>16)
    throw Error('Untrusted key transition sequence or root');
  if(typeof p.floorVersion!=='string'||!/^0\.\d+\.\d+-stage2\.\d+$/.test(p.floorVersion)||
     (floor!==null&&compare(p.floorVersion,floor)<0))
    throw Error('Trust rotation may not lower the accepted release floor');
  if(typeof p.newPublicDer!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(p.newPublicDer))
    throw Error('Invalid successor public key bytes');
  const der=Buffer.from(p.newPublicDer,'base64');
  if(der.length!==44||der.toString('base64')!==p.newPublicDer)
    throw Error('Noncanonical successor public key');
  let next;
  try{next=publicKey(crypto.createPublicKey({key:der,type:'spki',format:'der'}))}
  catch{throw Error('Invalid Ed25519 successor key')}
  const nextFp=fingerprint(next);
  if(nextFp!==p.to||used.has(nextFp))throw Error('Re-enrolled or incorrectly identified key');
  if(typeof event.oldSignature!=='string'||! /^[a-f0-9]{128}$/.test(event.oldSignature)||
     typeof event.newSignature!=='string'||! /^[a-f0-9]{128}$/.test(event.newSignature))
    throw Error('Missing dual Ed25519 authorizations');
  const payload=Buffer.concat([DOMAIN,canonical(p)]);
  if(!crypto.verify(null,payload,oldKey,Buffer.from(event.oldSignature,'hex'))||
     !crypto.verify(null,payload,next,Buffer.from(event.newSignature,'hex')))
    throw Error('Trust rotation lacks BOTH old and successor signatures');
  return {key:next,fp:nextFp,floor:p.floorVersion};
}
class LabKeyLifecycle{
  static create(rootPublic,pinnedRootFingerprint){
    const pub=publicKey(rootPublic);
    if(fingerprint(pub)!==pinnedRootFingerprint)throw Error('Root key pin mismatch');
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-trust-lab-'));
    putNew(path.join(root,'trust-chain.json'),{
      format:FORMAT,root:pinnedRootFingerprint,events:[]
    });
    return new LabKeyLifecycle(root,pub,pinnedRootFingerprint,0);
  }
  constructor(root,rootPublic,pinnedRootFingerprint,minimumExternalEpoch=0){
    safeRoot(root);
    this.root=root;
    this.rootKey=publicKey(rootPublic);
    this.rootFp=fingerprint(this.rootKey);
    if(this.rootFp!==pinnedRootFingerprint||!Number.isSafeInteger(minimumExternalEpoch)||
       minimumExternalEpoch<0||minimumExternalEpoch>16)throw Error('Out-of-band trust pin/epoch invalid');
    this.minEpoch=minimumExternalEpoch;
    this.chainFile=path.join(root,'trust-chain.json');
    this.pendingFile=path.join(root,'trust-intent.json');
    this.lockDir=path.join(root,'trust-exclusive.lock');
    this.inspect();
  }
  derive(){
    safeRoot(this.root);
    const chain=readJson(this.chainFile);
    assertExact(chain,['format','root','events']);
    if(chain.format!==FORMAT||chain.root!==this.rootFp||!Array.isArray(chain.events)||
       chain.events.length>16)throw Error('Invalid pinned root/chain');
    let key=this.rootKey,fp=this.rootFp,floor=null;
    const used=new Set([fp]);
    for(let i=0;i<chain.events.length;i++){
      const result=verifyEvent(chain.events[i],key,this.rootFp,fp,i,floor,used);
      key=result.key;fp=result.fp;floor=result.floor;used.add(fp);
    }
    if(chain.events.length<this.minEpoch)throw Error('Trust-chain replay below external epoch checkpoint');
    return {chain,key,fp,floor,epoch:chain.events.length};
  }
  _inspect(){
    const d=this.derive();
    if(has(this.chainFile+'.new')||has(this.pendingFile+'.new'))
      throw Error('Interrupted trust write requires forensic review');
    if(!has(this.pendingFile))
      return {status:'clean',epoch:d.epoch,activeKey:d.fp,floorVersion:d.floor};
    const p=readJson(this.pendingFile);
    assertExact(p,['format','fromEpoch','eventSha256']);
    if(p.format!==FORMAT||!Number.isSafeInteger(p.fromEpoch)||p.fromEpoch<0||
       !/^[0-9a-f]{64}$/.test(p.eventSha256))throw Error('Invalid trust rotation journal');
    if(d.epoch===p.fromEpoch)return {status:'pending-before-commit',epoch:d.epoch,activeKey:d.fp,floorVersion:d.floor};
    if(d.epoch===p.fromEpoch+1&&
       sha(canonical(d.chain.events[d.epoch-1]))===p.eventSha256)
      return {status:'committed-needs-cleanup',epoch:d.epoch,activeKey:d.fp,floorVersion:d.floor};
    throw Error('Conflicting trust rotation journal; refuse automatic repair');
  }
  inspect(){
    if(has(this.lockDir))throw Error('Trust operator locked or stale; manual review required');
    return this._inspect();
  }
  withLock(work){
    safeRoot(this.root);
    try{fs.mkdirSync(this.lockDir,{mode:0o700})}
    catch(e){if(e.code==='EEXIST')throw Error('Trust operator locked or stale');throw e}
    const st=fs.lstatSync(this.lockDir);
    try{return work()}
    finally{
      const current=fs.lstatSync(this.lockDir);
      if(!current.isDirectory()||current.isSymbolicLink()||current.dev!==st.dev||
         current.ino!==st.ino||fs.readdirSync(this.lockDir).length!==0)
        throw Error('Trust lock modified during operation');
      fs.rmdirSync(this.lockDir);
    }
  }
  rotate({event,expectedEpoch,expectedActiveKey,failAt=null}){
    return this.withLock(()=>{
      const view=this._inspect();
      if(view.status!=='clean')throw Error('Pending rotation requires explicit recovery');
      if(view.epoch!==expectedEpoch||view.activeKey!==expectedActiveKey)
        throw Error('Stale trust epoch / signer compare-and-swap');
      const derived=this.derive();
      verifyEvent(event,derived.key,this.rootFp,derived.fp,derived.epoch,
        derived.floor,new Set([this.rootFp,...derived.chain.events.map(e=>e.proposal.to)]));
      putNew(this.pendingFile,{format:FORMAT,fromEpoch:derived.epoch,eventSha256:sha(canonical(event))});
      if(failAt==='after-intent')throw Error('Injected interruption after trust intent');
      atomic(this.chainFile,{...derived.chain,events:[...derived.chain.events,event]});
      if(failAt==='after-commit')throw Error('Injected interruption after trust chain commit');
      return this._recover('finalize');
    });
  }
  recover(mode){
    return this.withLock(()=>this._recover(mode));
  }
  _recover(mode){
    const view=this._inspect();
    if(view.status==='pending-before-commit'){
      if(mode!=='abort')throw Error('Cannot finalize uncommitted trust transition');
      fs.unlinkSync(this.pendingFile);
    }else if(view.status==='committed-needs-cleanup'){
      if(mode!=='finalize')throw Error('Cannot abort committed trust transition');
      fs.unlinkSync(this.pendingFile);
    }else throw Error('No trust rotation pending');
    return this._inspect();
  }
  verifyRelease(folder,expectedVersion){
    const view=this.inspect();
    if(view.status!=='clean')throw Error('Trust rotation pending; no release verification');
    const d=this.derive();
    if(d.floor===null)throw Error('Explicit release floor must be established before release verification');
    const info=verifyEnvelope(folder,d.key,expectedVersion,d.floor);
    return {version:info.version,signer:d.fp,epoch:d.epoch,floorVersion:d.floor,
      metadataVerified:true,publisherIdentityProven:false,productionReady:false};
  }
}
function signRotation({rootPublic,oldPublic,newPublic,oldPrivate,newPrivate,epoch,floorVersion}){
  if(process.env.CI!=='true'||process.env.CMS_ALLOW_EPHEMERAL_SIGNING_LAB!=='1')
    throw Error('Dual signing permitted only in disposable CI');
  if(!Number.isSafeInteger(epoch)||epoch<0||epoch>=16)throw Error('Invalid rotation epoch');
  const proposal={format:FORMAT,root:fingerprint(rootPublic),from:fingerprint(oldPublic),
    to:fingerprint(newPublic),epochFrom:epoch,epochTo:epoch+1,
    floorVersion,newPublicDer:keyDer(newPublic).toString('base64'),purpose:'scheduled-rotation'};
  const payload=Buffer.concat([DOMAIN,canonical(proposal)]);
  return {proposal,oldSignature:crypto.sign(null,payload,oldPrivate).toString('hex'),
    newSignature:crypto.sign(null,payload,newPrivate).toString('hex')};
}
module.exports={LabKeyLifecycle,signRotation,fingerprint,FORMAT,canonical};
