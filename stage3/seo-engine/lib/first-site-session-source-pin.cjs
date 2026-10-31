'use strict';
/* Immutable source snapshot for a multi-stage operator session. Always private.
 * Raw source paths never appear in the resulting session JSON.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const SHA=/^[a-f0-9]{64}$/;
const MAX_JSON=36000000,MAX_ZIP=190000000,CHUNK=1024*1024;
function files(config){
 if(!config||!config.inputs||!['local','public','public-capture','search','human-review'].includes(config.phase))
  throw Error('Source pinning requires a validated first-site phase');
 const o=config.inputs,x={};
 const push=(key,file)=>{if(file)x[key]=file};
 for(const [k,v] of Object.entries(o)){
  if(k==='provider'||k==='origin')continue;
  if(['candidate','approvedSite','staticExport','previousReport','previousUpload'].includes(k))continue;
  push(k,v);
 }
 if(o.approvedSite)push('approvedHandoff',path.join(o.approvedSite,'handoff.json'));
 if(o.staticExport)push('officialStaticManifest',path.join(o.staticExport,'release-manifest.json'));
 if(o.candidate){
  for(const [k,relative] of Object.entries({
   originalCandidateStatus:'CANDIDATE-STATUS.json',
   originalPhpSummary:'seo-report/summary.json',
   originalPhpBundle:'seo-report/bundle.json',
   verifiedPublicInventory:'static-upload/upload-inventory.json',
   publicOnlyArchive:'public-site.zip'}))
   push(k,path.join(o.candidate,relative));
  // Upgrade comparison carries a second rollback archive. Freeze it as well
  // when present, but do not assume all candidates have upgrades.
  const upgrade=path.join(o.candidate,'UPGRADE-IMPACT.json');
  if(fs.existsSync(upgrade)){
   push('upgradeImpact',upgrade);
   push('upgradeRollbackPublicArchive',path.join(o.candidate,'rollback-public-site.zip'));
  }
 }
 return Object.freeze(x);
}
function shaFile(file){
 if(typeof file!=='string'||!path.isAbsolute(file))
  throw Error('Source evidence file must have an absolute path');
 const stat=fs.lstatSync(file),large=file.endsWith('.zip');
 const max=large?MAX_ZIP:MAX_JSON;
 if(stat.isSymbolicLink()||!stat.isFile()||stat.size<1||stat.size>max)
  throw Error('Source evidence must be an ordinary bounded private file');
 const h=crypto.createHash('sha256'),fd=fs.openSync(file,'r'),block=Buffer.alloc(CHUNK);
 try {
  for(;;){
   const size=fs.readSync(fd,block,0,CHUNK,null);
   if(!size)break;
   h.update(block.subarray(0,size));
  }
 }finally{fs.closeSync(fd);}
 return Object.freeze({sha256:h.digest('hex'),bytes:stat.size});
}
function capture(config){
 const list=files(config),digests={};
 for(const [k,v] of Object.entries(list))digests[k]=shaFile(v);
 return Object.freeze({format:'manufact-seo-first-site-source-pin-v1',sha256ByRole:Object.freeze(digests),
  pinnedRoles:Object.keys(digests).sort(),untrustedSnapshot:true,outputWriteAuthorized:false});
}
function unchanged(a,b){
 if(a?.format!=='manufact-seo-first-site-source-pin-v1'||
  b?.format!=='manufact-seo-first-site-source-pin-v1')throw Error('Source pin format mismatch');
 const x=a.sha256ByRole,y=b.sha256ByRole;
 const keys=Object.keys(x).sort(),compare=Object.keys(y).sort();
 if(JSON.stringify(keys)!==JSON.stringify(compare)||
  keys.some(k=>!SHA.test(x[k].sha256||'')||!SHA.test(y[k].sha256||'')||
   x[k].sha256!==y[k].sha256||x[k].bytes!==y[k].bytes))
  throw Error('First-site source evidence changed during integration session; discard results and rerun');
 return true;
}
module.exports=Object.freeze({files,shaFile,capture,unchanged});
