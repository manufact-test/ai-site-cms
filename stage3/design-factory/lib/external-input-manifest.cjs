'use strict';
// Snapshot the exact optional Lead SDK/PHP inputs consumed by cross-branch
// compatibility checks. This is provenance evidence, not authentication.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const MAX_FILE=2*1024*1024,MAX_TOTAL=32*1024*1024,MAX_FILES=512;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function canonicalDirectory(requested,label){
 if(typeof requested!=='string'||!requested.trim())throw Error(label+' path required');
 const absolute=path.resolve(requested),stat=fs.lstatSync(absolute);
 if(stat.isSymbolicLink()||!stat.isDirectory()||fs.realpathSync(absolute)!==absolute)
  throw Error(label+' must be a canonical regular directory');
 return absolute;
}
function sameStat(a,b){
 return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&
  a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
}
function captureExternalInputs(sdkDirectory,phpFile=null){
 const sdkPath=canonicalDirectory(sdkDirectory,'Lead SDK');
 const files=[],budget={bytes:0};
 function visit(directory,relative=''){
  const entries=fs.readdirSync(directory,{withFileTypes:true})
   .sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  for(const entry of entries){
   if(entry.name.startsWith('.')||entry.name==='node_modules')
    throw Error('Unapproved Lead SDK entry: '+(relative?relative+'/':'')+entry.name);
   const rel=relative?relative+'/'+entry.name:entry.name;
   const absolute=path.join(directory,entry.name),before=fs.lstatSync(absolute);
   if(before.isSymbolicLink())throw Error('Lead SDK symlink is not allowed: '+rel);
   if(entry.isDirectory()){
    if(fs.realpathSync(absolute)!==absolute)
     throw Error('Lead SDK directory is not canonical: '+rel);
    visit(absolute,rel);
    continue;
   }
   if(!before.isFile())throw Error('Unsupported Lead SDK entry: '+rel);
   if(before.size>MAX_FILE)throw Error('Oversized Lead SDK file: '+rel);
   if(files.length>=MAX_FILES)throw Error('Lead SDK has too many files');
   const bytes=fs.readFileSync(absolute),after=fs.lstatSync(absolute);
   if(!after.isFile()||after.isSymbolicLink()||fs.realpathSync(absolute)!==absolute||
    !sameStat(before,after)||bytes.length!==after.size)
    throw Error('Lead SDK file changed while fingerprinting: '+rel);
   budget.bytes+=bytes.length;
   if(budget.bytes>MAX_TOTAL)throw Error('Lead SDK exceeds total fingerprint size limit');
   files.push({path:rel,bytes:bytes.length,sha256:sha(bytes)});
  }
 }
 visit(sdkPath);
 const byName=new Set(files.map(item=>item.path));
 for(const required of ['contract.cjs','design-graph.cjs'])
  if(!byName.has(required))throw Error('Lead SDK is missing required runtime input: '+required);
 let php=null;
 if(phpFile!==null){
  if(typeof phpFile!=='string'||!phpFile.trim())throw Error('Lead PHP path must be a non-empty string');
  const absolute=path.resolve(phpFile),before=fs.lstatSync(absolute);
  if(before.isSymbolicLink()||!before.isFile()||fs.realpathSync(absolute)!==absolute||
   !/\.php$/i.test(absolute))throw Error('Lead PHP input must be a canonical regular .php file');
  if(before.size>MAX_FILE)throw Error('Lead PHP input exceeds 2 MiB');
  const bytes=fs.readFileSync(absolute),after=fs.lstatSync(absolute);
  if(!after.isFile()||after.isSymbolicLink()||fs.realpathSync(absolute)!==absolute||
   !sameStat(before,after)||bytes.length!==after.size)
   throw Error('Lead PHP input changed while fingerprinting');
  php={path:absolute,bytes:bytes.length,sha256:sha(bytes)};
 }
 const payload={format:'manufact-design-factory-external-input-manifest-v1',version:1,
  sdkPath,sdkFiles:files,phpFile:php};
 return Object.freeze({...payload,sdkFiles:Object.freeze(files.map(Object.freeze)),
  sha256:sha(Buffer.from(JSON.stringify(payload)))});
}
function sameExternalInputs(a,b){
 return Boolean(a&&b&&a.format==='manufact-design-factory-external-input-manifest-v1'&&
  b.format===a.format&&a.version===b.version&&a.sha256===b.sha256&&
  a.sdkPath===b.sdkPath&&JSON.stringify(a.sdkFiles)===JSON.stringify(b.sdkFiles)&&
  JSON.stringify(a.phpFile)===JSON.stringify(b.phpFile));
}
module.exports=Object.freeze({captureExternalInputs,sameExternalInputs});
