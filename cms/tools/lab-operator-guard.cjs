'use strict';
// Stage2 operator-recovery REHEARSAL on disposable OS temp LabRollout only.
// This is a locally consistent anti-replay policy, NOT tamper-resistant secure storage,
// not a live updater and never a database migration/backup or hosting integration.
const fs=require('node:fs'), path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {verify}=require('./build-internal-package.cjs');
const {validVersion}=require('./lab-versioned-rollout.cjs');
const {verifyEnvelope,compare}=require('./lab-signed-offline-release.cjs');
const FORMAT='ai-site-cms-operator-guard-lab-v1';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function publicKeyHash(key){
  if(!key||key.type==='private')throw Error('Public trust anchor required');
  const pub=key.type==='public'?key:crypto.createPublicKey(key);
  if(pub.asymmetricKeyType!=='ed25519')throw Error('Ed25519 trust anchor required');
  return digest(pub.export({format:'der',type:'spki'}));
}
function exactObject(value,keys){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==keys.slice().sort().join('|'))throw Error('Invalid operator state shape');
}
function readStrict(file,max=4096){
  const st=fs.lstatSync(file);
  if(!st.isFile()||st.isSymbolicLink()||st.size<2||st.size>max)throw Error('Invalid operator state file');
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function safeTempLab(lab){
  if(!lab||!lab.root||path.dirname(lab.root)!==fs.realpathSync(os.tmpdir())||
    !path.basename(lab.root).startsWith('ai-site-cms-rollout-lab-')||
    !fs.lstatSync(lab.root).isDirectory()||fs.lstatSync(lab.root).isSymbolicLink())throw Error('Disposable laboratory required');
}
function writeAtomic(file,data){
  const tmp=file+'.new';
  const fd=fs.openSync(tmp,'wx',0o600);
  try{fs.writeFileSync(fd,JSON.stringify(data)+'\n');fs.fsyncSync(fd);}
  finally{fs.closeSync(fd);}
  fs.renameSync(tmp,file);
}
class LabOperatorGuard {
  constructor(lab,trustKey){
    safeTempLab(lab);
    this.lab=lab;
    this.trustKey=trustKey;
    this.fingerprint=publicKeyHash(trustKey);
    this.policyFile=path.join(lab.root,'operator-policy.json');
    this.pendingFile=path.join(lab.root,'operator-intent.json');
    if(!fs.existsSync(this.policyFile)){
      const state=lab.state();
      if(state.sequence!==0||state.current!==null||fs.existsSync(this.pendingFile))
        throw Error('Cannot bootstrap trust for existing activated lab; missing policy');
      writeAtomic(this.policyFile,{
        format:FORMAT,key:this.fingerprint,current:null,sequence:0,highest:null,receipts:{}
      });
    }
    this.inspect(); // verify before taking any action
  }
  policy(){
    const p=readStrict(this.policyFile);
    exactObject(p,['format','key','current','sequence','highest','receipts']);
    if(p.format!==FORMAT||p.key!==this.fingerprint||!Number.isSafeInteger(p.sequence)||p.sequence<0)
      throw Error('Trust anchor or operator policy inconsistent');
    if(p.current!==null)validVersion(p.current);
    if(p.highest!==null)validVersion(p.highest);
    if((p.sequence===0)!==(p.current===null)||p.current!==null&&
       (p.highest===null||compare(p.current,p.highest)>0))
      throw Error('Operator watermark/state invalid');
    if(!p.receipts||typeof p.receipts!=='object'||Array.isArray(p.receipts)||
       Object.keys(p.receipts).length>100)throw Error('Invalid operator receipt ledger');
    for(const [v,h] of Object.entries(p.receipts)){
      validVersion(v);
      if(typeof h!=='string'||!/^[0-9a-f]{64}$/.test(h))throw Error('Invalid recorded manifest receipt');
    }
    if(p.current!==null&&!p.receipts[p.current])throw Error('Active version lacks trusted signed receipt');
    return p;
  }
  pending(){
    if(!fs.existsSync(this.pendingFile))return null;
    const i=readStrict(this.pendingFile);
    exactObject(i,['format','kind','from','to','fromSequence','newHighest','envelopeSha256','receipt']);
    if(i.from!==null)validVersion(i.from);
    if(i.format!==FORMAT||!['upgrade','rollback'].includes(i.kind)||
       !Number.isSafeInteger(i.fromSequence)||i.fromSequence<0)
      throw Error('Invalid pending operator intent');
    validVersion(i.to);
    validVersion(i.newHighest);
    if(!/^[0-9a-f]{64}$/.test(i.envelopeSha256)||!/^[0-9a-f]{64}$/.test(i.receipt))throw Error('Invalid pending envelope/receipt hash');
    return i;
  }
  inspect(){
    const p=this.policy(),active=this.lab.state(),i=this.pending();
    if(fs.existsSync(this.policyFile+'.new'))throw Error('Unresolved policy write: manual intervention required');
    if(!i){
      if(fs.existsSync(this.lab.pointerPath()+'.tmp')||
         p.current!==active.current||p.sequence!==active.sequence)
        throw Error('Operator/active pointer mismatch without intent; refuse repair');
      return {status:'clean',current:p.current,sequence:p.sequence,highest:p.highest};
    }
    if(i.from!==p.current||i.fromSequence!==p.sequence) {
      // Crash after policy committed, before intent deletion.
      if(p.current===i.to&&p.sequence===i.fromSequence+1&&
         active.current===i.to&&active.sequence===p.sequence&&p.highest===i.newHighest&&p.receipts[i.to]===i.receipt)
        return {status:'committed-needs-cleanup',current:p.current,sequence:p.sequence,highest:p.highest};
      throw Error('Unreconcilable operator journal: preserve forensic evidence');
    }
    if(active.current===i.from&&active.sequence===i.fromSequence)
      return {status:'pending-before-switch',current:active.current,sequence:active.sequence,highest:p.highest};
    if(active.current===i.to&&active.sequence===i.fromSequence+1&&
       active.previous===i.from)
      return {status:'pending-after-switch',current:active.current,sequence:active.sequence,highest:i.newHighest};
    throw Error('Operator journal/activation conflict; fail closed');
  }
  assertClean(expectedCurrent,expectedSequence){
    const s=this.inspect();
    if(s.status!=='clean')throw Error('Unresolved operator intent; explicit recovery required');
    if(s.current!==expectedCurrent||s.sequence!==expectedSequence)
      throw Error('Stale operator state/ABA sequence mismatch');
    return this.policy();
  }
  execute({kind,version,expectedCurrent,expectedSequence,envelopeFolder=null,failAt=null}){
    const p=this.assertClean(expectedCurrent,expectedSequence);
    validVersion(version);
    if(kind!=='upgrade'&&kind!=='rollback')throw Error('Invalid operator action');
    let signedHash='0'.repeat(64), highest=p.highest, receipt;
    if(kind==='upgrade'){
      if(!envelopeFolder)throw Error('Signed release evidence required');
      const info=verifyEnvelope(envelopeFolder,this.trustKey,version);
      signedHash=digest(fs.readFileSync(path.join(envelopeFolder,'envelope.json')));
      if(highest!==null&&compare(version,highest)<=0)
        throw Error('Replay/downgrade blocked by persistent high watermark');
      if(p.current!==null&&compare(version,p.current)<=0)
        throw Error('Upgrade version must increase');
      highest=version;
      receipt=info.packageManifestSha256;
      if(!fs.existsSync(this.lab.slot(version))||
         verify(this.lab.slot(version)).releaseVersion!==info.version||
         digest(fs.readFileSync(path.join(this.lab.slot(version),'private/package-manifest.json')))!==info.packageManifestSha256)
        throw Error('Signed package not independently staged/verified');
    }else{
      const active=this.lab.state();
      if(active.previous===null||active.previous!==version||p.current===null||compare(version,p.current)>=0)
        throw Error('Explicit rollback only to recorded immediate previous version');
      receipt=p.receipts[version];
      if(!receipt||!fs.existsSync(this.lab.slot(version))||
         verify(this.lab.slot(version)).releaseVersion!==version||
         digest(fs.readFileSync(path.join(this.lab.slot(version),'private/package-manifest.json')))!==receipt)
        throw Error('Rollback package missing original signed receipt');
    }
    const intent={format:FORMAT,kind,from:p.current,to:version,fromSequence:p.sequence,
      newHighest:highest,envelopeSha256:signedHash,receipt};
    const fd=fs.openSync(this.pendingFile,'wx',0o600);
    try{fs.writeFileSync(fd,JSON.stringify(intent)+'\n');fs.fsyncSync(fd);}
    finally{fs.closeSync(fd);}
    if(failAt==='after-intent')throw Error('Injected fault AFTER durable operator intent');
    if(kind==='upgrade')this.lab.switchTo(version,p.current,failAt==='after-pointer'?'after-pointer':undefined);
    else{
      this.lab.rollback(p.current);
      if(failAt==='after-pointer')throw Error('Injected fault AFTER rollback pointer');
    }
    if(failAt==='after-activation')throw Error('Injected fault AFTER activation');
    this.recover({mode:'finalize'});
    return this.inspect();
  }
  recover({mode}){
    const s=this.inspect();
    if(s.status==='clean')throw Error('No pending operation to recover');
    if(s.status==='pending-before-switch'){
      if(mode!=='abort')throw Error('Operator must explicitly abort unchanged activation');
      // No activation occurred; clean only our intent/temp after validating no new pointer.
      if(fs.existsSync(this.lab.pointerPath()+'.tmp'))throw Error('Unresolved active pointer temp: manual investigation');
      fs.unlinkSync(this.pendingFile);
      return this.inspect();
    }
    if(mode!=='finalize')throw Error('Operator must explicitly finalize committed activation');
    const i=this.pending();
    if(!fs.existsSync(this.lab.slot(i.to))||
       verify(this.lab.slot(i.to)).releaseVersion!==i.to)
      throw Error('Cannot confirm target package; preserve pending evidence');
    if(digest(fs.readFileSync(path.join(this.lab.slot(i.to),'private/package-manifest.json')))!==i.receipt)
      throw Error('Pending target changed since signature; preserve evidence');
    if(s.status==='pending-after-switch'){
      const p=this.policy();
      if(p.sequence!==i.fromSequence||p.current!==i.from)throw Error('Operator state changed');
      writeAtomic(this.policyFile,{
        format:FORMAT,key:this.fingerprint,current:i.to,sequence:i.fromSequence+1,highest:i.newHighest,
        receipts:{...p.receipts,[i.to]:i.receipt}
      });
    }
    // If crash occurred after policy commit, it is now safe to remove intent.
    fs.unlinkSync(this.pendingFile);
    return this.inspect();
  }
}
module.exports={LabOperatorGuard, publicKeyHash};
