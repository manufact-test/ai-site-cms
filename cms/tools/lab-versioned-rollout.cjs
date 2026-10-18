'use strict';
// Stage2 disposable, local-only code-switch rehearsal. NO production deployment,
// NO real DB upgrade, NO site data/credentials, NO signed publisher verification.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {verify}=require('./build-internal-package.cjs');
const versionPattern=/^0\.\d+\.\d+-stage2\.\d+$/;
const validVersion=v=>{if(typeof v!=='string'||!versionPattern.test(v))throw Error('Unapproved lab release version');return v;};
class LabRollout {
  constructor(){
    this.root=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-rollout-lab-'));
    fs.mkdirSync(path.join(this.root,'releases'),{mode:0o700});
  }
  releases(){return path.join(this.root,'releases');}
  slot(v){return path.join(this.releases(),validVersion(v));}
  pointerPath(){return path.join(this.root,'active.json');}
  state(){
    const p=this.pointerPath();
    if(!fs.existsSync(p))return {current:null,previous:null,sequence:0};
    const data=JSON.parse(fs.readFileSync(p,'utf8'));
    if(!data||Object.keys(data).sort().join(',')!=='current,previous,sequence'||!Number.isSafeInteger(data.sequence)||data.sequence<1)throw Error('Corrupt activation pointer');
    for(const v of [data.current,data.previous])if(v!==null)validVersion(v);
    if(data.current===null)throw Error('Invalid active pointer');
    return data;
  }
  stage(source){
    const packageInfo=verify(source),v=validVersion(packageInfo.releaseVersion);
    const slot=this.slot(v);
    if(fs.existsSync(slot))throw Error('Refusing to overwrite immutable version slot');
    const partial=path.join(this.releases(),'.staging-'+v);
    if(fs.existsSync(partial))throw Error('Incomplete staging residue: manual lab cleanup required');
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
    validVersion(version);
    const old=this.state();
    if(old.current!==expectedCurrent)throw Error('Stale active generation / concurrency mismatch');
    const slot=this.slot(version);
    if(!fs.existsSync(slot)||verify(slot).releaseVersion!==version)throw Error('Release not staged or corrupt');
    if(old.current===version)throw Error('Already active');
    if(failAt==='before-pointer')throw Error('Injected failure BEFORE activation');
    const next={current:version,previous:old.current,sequence:old.sequence+1};
    const tmp=path.join(this.root,'active.json.tmp');
    if(fs.existsSync(tmp))throw Error('Unresolved pointer temporary file');
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
    if(!fs.existsSync(this.slot(old.previous))||verify(this.slot(old.previous)).releaseVersion!==old.previous)throw Error('Rollback target corrupt');
    return this.switchTo(old.previous,old.current);
  }
  dispose(){
    if(!path.basename(this.root).startsWith('ai-site-cms-rollout-lab-')||path.dirname(this.root)!==fs.realpathSync(os.tmpdir()))throw Error('Non-laboratory cleanup refused');
    fs.rmSync(this.root,{recursive:true,force:true});
  }
}
module.exports={LabRollout,validVersion};
