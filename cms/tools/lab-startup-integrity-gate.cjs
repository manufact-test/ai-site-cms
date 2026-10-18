'use strict';
// STAGE 2 DISPOSABLE LAB ONLY. No server route, no production boot hook,
// no host/site/database access, no repair writes. This is point-in-time
// startup-readiness evidence for a locally staged *code-only* release.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const existsLstat=p=>{try{fs.lstatSync(p);return true}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const decision=(status,reason,fields={})=>Object.freeze({status,reason,...fields});
const snapshot=(lab,guard)=>{
  const policy=guard.policy();
  const pointer=lab.state();
  return {policy,pointer,policyHash:sha(fs.readFileSync(guard.policyFile)),
    pointerHash:existsLstat(lab.pointerPath())?sha(fs.readFileSync(lab.pointerPath())):null};
};

class LabStartupGate {
  constructor(lab,guard){
    if(!lab||typeof lab.assertRoot!=='function'||!guard||guard.lab!==lab||
       typeof guard.inspect!=='function'||typeof lab.verifySlot!=='function')
      throw Error('Explicit existing disposable lab and enrolled operator guard required');
    this.lab=lab;this.guard=guard;
  }
  // Read-only, conservative startup decision. Caller must refuse to load code
  // unless this returns ready; merely having health.php respond is NOT sufficient.
  check(){
    const lab=this.lab,guard=this.guard;
    let snap,view;
    try {
      lab.assertRoot();
      if(existsLstat(guard.lockDir)||
         existsLstat(path.join(lab.root,'active-exclusive.lock')))
        return decision('blocked','operator-lock-present');
      if(existsLstat(lab.pointerPath()+'.tmp')||
         existsLstat(guard.policyFile+'.new'))
        return decision('blocked','incomplete-state-write');
      // Staged-but-uncommitted versions must not be mistaken for active code.
      for(const n of fs.readdirSync(lab.releases())){
        if(n.startsWith('.staging-'))return decision('blocked','incomplete-release-stage');
      }
      view=guard.inspect();
      if(view.status!=='clean')
        return decision('blocked','operator-recovery-required',{recoveryStatus:view.status});
      snap=snapshot(lab,guard);
      if(snap.policy.current===null)
        return decision('blocked','not-activated');
      if(snap.pointer.current!==snap.policy.current||
         snap.pointer.sequence!==snap.policy.sequence)
        return decision('blocked','operator-state-mismatch');
    }catch{
      // Deliberately do not expose sensitive filesystem paths in responses.
      return decision('blocked','operator-state-invalid');
    }
    const current=snap.pointer.current;
    const receipt=snap.policy.receipts[current];
    if(!receipt)return decision('blocked','missing-signed-receipt',{current});
    try{
      const slot=lab.slot(current);
      // All files are checked against the immutable manifest inventory, not only
      // public/index.php. The original signed manifest digest binds this slot.
      const manifest=lab.verifySlot(current);
      const manifestHash=sha(fs.readFileSync(path.join(slot,'private/package-manifest.json')));
      if(manifestHash!==receipt||manifest.releaseVersion!==current)
        throw Error('Receipt does not match activated release');
    }catch{
      return decision('blocked','active-release-corrupt',{
        current,rollbackCandidate:this.rollbackCandidate(snap.policy,snap.pointer)
      });
    }
    try{
      if(existsLstat(guard.lockDir)||
         existsLstat(path.join(lab.root,'active-exclusive.lock')))
        return decision('blocked','operator-lock-present');
      const after=guard.inspect(),second=snapshot(lab,guard);
      if(after.status!=='clean'||second.pointer.current!==current||
         second.pointer.sequence!==snap.pointer.sequence||
         second.pointer.previous!==snap.pointer.previous||
         second.policyHash!==snap.policyHash||
         second.pointerHash!==snap.pointerHash)
        return decision('blocked','startup-state-changed');
    }catch{
      return decision('blocked','startup-state-changed');
    }
    return decision('ready','verified-lab-code',{current,sequence:snap.pointer.sequence,
      releaseFilesVerified:true,manifestSha256:receipt});
  }
  // Advisory only: NEVER performs rollback or repairs a missing file.
  // Candidate MUST match both immediate predecessor pointer and original
  // receipt from the same enrolled trust policy.
  rollbackCandidate(policy,pointer){
    try{
      const previous=pointer.previous;
      if(!previous||!policy.receipts[previous])return null;
      const current=pointer.current;
      // A forward switch disguised as rollback is not an escape hatch.
      const {compare}=require('./lab-signed-offline-release.cjs');
      if(compare(previous,current)>=0)return null;
      const manifest=this.lab.verifySlot(previous);
      const actual=sha(fs.readFileSync(path.join(this.lab.slot(previous),'private/package-manifest.json')));
      if(manifest.releaseVersion!==previous||actual!==policy.receipts[previous])
        return null;
      return previous;
    }catch{return null}
  }
  requireReady(){
    const d=this.check();
    if(d.status!=='ready')throw Error('Stage2 code startup refused: '+d.reason);
    return d;
  }
}
module.exports={LabStartupGate};
