'use strict';
// Fingerprint the complete offline render + visual-evidence protocol and every
// first-party component manifest/SDK contract it consumes. Any relevant source
// change invalidates stale screenshots and review receipts. No writes or network.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const CODE=/\.(?:cjs|js|json|html|css)$/;
const SCAN_DIRS=Object.freeze([
 'stage3/design-factory/bin',
 'stage3/design-factory/catalog',
 'stage3/design-factory/lib',
 'stage3/design-factory/studio'
]);
const FIXED_INPUTS=Object.freeze(['stage3/sdk/contract.cjs']);
function collectCodeFiles(repositoryRoot,relative){
 const absolute=path.join(repositoryRoot,relative),stat=fs.lstatSync(absolute);
 if(stat.isSymbolicLink()||!stat.isDirectory()||fs.realpathSync(absolute)!==absolute)
  throw Error('Unsafe fingerprint directory: '+relative);
 const out=[];
 for(const entry of fs.readdirSync(absolute,{withFileTypes:true})
  .sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
  if(entry.name.startsWith('.')||entry.name==='node_modules')
   throw Error('Unsafe fingerprint entry: '+relative+'/'+entry.name);
  const childRelative=relative+'/'+entry.name,child=path.join(absolute,entry.name);
  const childStat=fs.lstatSync(child);
  if(childStat.isSymbolicLink())throw Error('Fingerprint symlink: '+childRelative);
  if(childStat.isDirectory())out.push(...collectCodeFiles(repositoryRoot,childRelative));
  else if(childStat.isFile()&&CODE.test(entry.name))out.push(childRelative);
  else if(!childStat.isFile())throw Error('Unsupported fingerprint entry: '+childRelative);
 }
 return out;
}
function inputPaths(repositoryRoot){
 const repo=fs.realpathSync(repositoryRoot);
 const components='stage3/components';
 const componentDir=path.join(repo,components),stat=fs.lstatSync(componentDir);
 if(stat.isSymbolicLink()||!stat.isDirectory()||fs.realpathSync(componentDir)!==componentDir)
  throw Error('Unsafe component manifest directory');
 const manifests=[];
 for(const entry of fs.readdirSync(componentDir,{withFileTypes:true})
  .sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
  const rel=components+'/'+entry.name,file=path.join(componentDir,entry.name),item=fs.lstatSync(file);
  if(item.isSymbolicLink())throw Error('Component manifest symlink: '+rel);
  if(item.isDirectory())throw Error('Unexpected component manifest directory: '+rel);
  if(item.isFile()&&entry.name.endsWith('.json'))manifests.push(rel);
 }
 const inputs=[...FIXED_INPUTS,...manifests,...SCAN_DIRS.flatMap(dir=>collectCodeFiles(repo,dir))];
 return [...new Set(inputs)].sort();
}
function sourceFingerprint(repositoryRoot){
 const repo=fs.realpathSync(repositoryRoot),hash=crypto.createHash('sha256');
 for(const rel of inputPaths(repo)){
  const absolute=path.join(repo,rel),stat=fs.lstatSync(absolute);
  if(!stat.isFile()||stat.isSymbolicLink()||fs.realpathSync(absolute)!==absolute)
   throw Error('Unsafe D7 render source file: '+rel);
  const data=fs.readFileSync(absolute),name=Buffer.from(rel),lengths=Buffer.alloc(8);
  if(name.length>0xffffffff||data.length>2*1024*1024)throw Error('Oversized D7 render source');
  lengths.writeUInt32BE(name.length,0);lengths.writeUInt32BE(data.length,4);
  hash.update(lengths);hash.update(name);hash.update(data);
 }
 return hash.digest('hex');
}
module.exports=Object.freeze({sourceFingerprint,inputPaths});
