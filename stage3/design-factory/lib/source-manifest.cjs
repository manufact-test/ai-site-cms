'use strict';
// Shared deterministic inventory rules for the D7 audit and release candidate.
// Read-only: never writes to the checkout and refuses symlinks/unknown artifacts.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
function walk(base,prefix=''){
 const output=[];
 for(const entry of fs.readdirSync(base,{withFileTypes:true})
  .sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
  if(entry.name==='node_modules'||entry.name==='.git'||entry.name==='.DS_Store'||entry.name.startsWith('.'))
   throw Error('Unapproved file/directory: '+entry.name);
  const relative=prefix?prefix+'/'+entry.name:entry.name;
  const absolute=path.join(base,entry.name),stat=fs.lstatSync(absolute);
  if(stat.isSymbolicLink())throw Error('Symlink not allowed: '+relative);
  if(entry.isDirectory())output.push(...walk(absolute,relative));
  else if(stat.isFile()){
   if(!/\.(cjs|js|json|md|html|css)$/.test(entry.name))
    throw Error('Unexpected asset type: '+relative);
   if(stat.size>2*1024*1024)throw Error('Oversized artifact: '+relative);
   output.push({path:relative,bytes:stat.size,
    sha256:crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')});
  }else throw Error('Unsupported file: '+relative);
 }
 return output;
}
function manifestForDesignFactory(root){
 return walk(root).filter(entry=>!entry.path.startsWith('handoffs/'));
}
function manifestDigest(manifest){
 return crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
}
function sameManifest(expected,actual){
 if(!Array.isArray(expected)||!Array.isArray(actual)||expected.length!==actual.length)return false;
 return expected.every((item,index)=>item&&actual[index]&&
  item.path===actual[index].path&&item.bytes===actual[index].bytes&&
  item.sha256===actual[index].sha256);
}
module.exports=Object.freeze({walk,manifestForDesignFactory,manifestDigest,sameManifest});
