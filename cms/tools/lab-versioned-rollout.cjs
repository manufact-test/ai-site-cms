'use strict';
// Stage2 disposable, local-only code-switch rehearsal. NO production deployment,
// NO real DB upgrade, NO site data/credentials, NO signed publisher verification.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {verify}=require('./build-internal-package.cjs');
const present=file=>{try{fs.lstatSync(file);return true}catch(e){if(e.code==='ENOENT')return false;throw e;}};
function realDirectory(file){
  const st=fs.lstatSync(file);
  if(!st.isDirectory()||st.isSymbolicLink())throw Error('Unsafe laboratory directory/symlink');
  return st;
}
const versionPattern=/^0\.\d+\.\d+-stage2\.\d+$/;
const validVersion=v=>{if(typeof v!=='string'||!versionPattern.test(v))throw Error('Unapproved lab release version');return v;};
class LabRollout {
  constructor(){
    this.root=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-rollout-lab-'));
    fs.mkdirSync(path.join(this.root,'releases'),{mode:0o700});
  }
  assertRoot(){
    if(path.dirname(this.root)!==fs.realpathSync(os.tmpdir())||
       !path.basename(this.root).startsWith('ai-site-cms-rollout-lab-'))
      throw Error('Non-laboratory root refused');
    realDirectory(this.root);realDirectory(path.join(this.root,'releases'));
  }
  releases(){this.assertRoot();return path.join(this.root,'releases');}
  slot(v){return path.join(this.releases(),validVersion(v));}
  pointerPath(){this.assertRoot();return path.join(this.root,'active.json');}
  verifySlot(version){
    const slot=this.slot(version);
    if(!present(slot))throw Error('Release slot missing');
    realDirectory(slot);
    const info=verify(slot);
    if(info.releaseVersion!==version)throw Error('Release slot version mismatch');
    return info;
  }
  withActivationLock(work){
    this.assertRoot();
    const lock=path.join(this.root,'active-exclusive.lock');
    try{fs.mkdirSync(lock,{mode:0o700});}
    catch(e){
      if(e.code==='EEXIST')throw Error('Activation lock held or stale: explicit operator review required');
      throw e;
    }
    const st=fs.lstatSync(lock);
    try{return work();}
    finally{
      const current=fs.lstatSync(lock);
      if(!current.isDirectory()||current.isSymbolicLink()||current.ino!==st.ino||current.dev!==st.dev)
        throw Error('Activation lock path changed: manual review required');
      fs.rmdirSync(lock);
    }
  }
  state(){
    const p=this.pointerPath();
    if(!present(p))return {current:null,previous:null,sequence:0};
    const st=fs.lstatSync(p);
    if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size>1024)
      throw Error('Unsafe activation pointer file');
    const data=JSON.parse(fs.readFileSync(p,'utf8'));
    if(!data||Object.keys(data).sort().join(',')!=='current,previous,sequence'||!Number.isSafeInteger(data.sequence)||data.sequence<1)throw Error('Corrupt activation pointer');
    for(const v of [data.current,data.previous])if(v!==null)validVersion(v);
    if(data.current===null)throw Error('Invalid active pointer');
    return data;
  }
  stage(source){
    this.assertRoot();
    realDirectory(source);
    const packageInfo=verify(source),v=validVersion(packageInfo.releaseVersion);
    const slot=this.slot(v);
    if(present(slot))throw Error('Refusing to overwrite immutable version slot');
    const partial=path.join(this.releases(),'.staging-'+v);
    if(present(partial))throw Error('Incomplete staging residue: manual lab cleanup required');
    try{
      fs.cpSync(source,partial,{recursive:true,errorOnExist:true,force:false});
      if(verify(partial).releaseVersion!==v)throw Error('Staged manifest version mismatch');
      fs.renameSync(partial,slot);
    }catch(e){
      if(fs.existsSync(partial))fs.rmSync(partial,{recursive:true,force:true});
      throw e;
    }
    return v;
  }
  switchTo(version,expectedCurrent,failAt){
    return this.withActivationLock(()=>this._switchTo(version,expectedCurrent,failAt));
  }
  _switchTo(version,expectedCurrent,failAt){
    validVersion(version);
    const old=this.state();
    if(old.current!==expectedCurrent)throw Error('Stale active generation / concurrency mismatch');
    const slot=this.slot(version);
    this.verifySlot(version);
    if(old.current===version)throw Error('Already active');
    if(failAt==='before-pointer')throw Error('Injected failure BEFORE activation');
    const next={current:version,previous:old.current,sequence:old.sequence+1};
    const tmp=path.join(this.root,'active.json.tmp');
    if(present(tmp))throw Error('Unresolved pointer temporary file');
    const fd=fs.openSync(tmp,'wx',0o600);
    try{fs.writeFileSync(fd,JSON.stringify(next)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    fs.renameSync(tmp,this.pointerPath()); // atomic pointer within same filesystem
    if(failAt==='after-pointer')throw Error('Injected failure AFTER activation; explicit rollback required');
    return next;
  }
  rollback(expectedCurrent){
    const old=this.state();
    if(old.current!==expectedCurrent||old.previous===null)throw Error('No valid matching rollback target');
    // Verify the previous slot fully before touching current pointer.
    this.verifySlot(old.previous);
    return this.switchTo(old.previous,old.current);
  }
  dispose(){
    if(!path.basename(this.root).startsWith('ai-site-cms-rollout-lab-')||path.dirname(this.root)!==fs.realpathSync(os.tmpdir()))throw Error('Non-laboratory cleanup refused');
    fs.rmSync(this.root,{recursive:true,force:true});
  }
}
module.exports={LabRollout,validVersion};
