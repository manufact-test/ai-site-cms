'use strict';
// Snapshot the exact optional Lead SDK/PHP inputs consumed by cross-branch
// compatibility checks. This is provenance evidence, not authentication.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const MAX_FILE=2*1024*1024,MAX_TOTAL=32*1024*1024,MAX_FILES=512;
const MAX_ENTRIES=1024,MAX_DEPTH=32;
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
 const files=[],budget={bytes:0,entries:0};
 function visit(directory,relative='',depth=0){
  if(depth>MAX_DEPTH)throw Error('Lead SDK exceeds maximum directory depth');
  const directoryBefore=fs.lstatSync(directory);
  if(directoryBefore.isSymbolicLink()||!directoryBefore.isDirectory()||fs.realpathSync(directory)!==directory)
   throw Error('Lead SDK directory is not canonical: '+(relative||'.'));
  const entries=fs.readdirSync(directory,{withFileTypes:true})
   .sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  for(const entry of entries){
   budget.entries++;
   if(budget.entries>MAX_ENTRIES)throw Error('Lead SDK has too many filesystem entries');
   if(entry.name.startsWith('.')||entry.name==='node_modules')
    throw Error('Unapproved Lead SDK entry: '+(relative?relative+'/':'')+entry.name);
   const rel=relative?relative+'/'+entry.name:entry.name;
   const absolute=path.join(directory,entry.name),before=fs.lstatSync(absolute);
   if(before.isSymbolicLink())throw Error('Lead SDK symlink is not allowed: '+rel);
   if(entry.isDirectory()){
    if(depth>=MAX_DEPTH)throw Error('Lead SDK exceeds maximum directory depth: '+rel);
    if(fs.realpathSync(absolute)!==absolute)
     throw Error('Lead SDK directory is not canonical: '+rel);
    visit(absolute,rel,depth+1);
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
  const directoryAfter=fs.lstatSync(directory);
  if(directoryAfter.isSymbolicLink()||!directoryAfter.isDirectory()||
   fs.realpathSync(directory)!==directory||!sameStat(directoryBefore,directoryAfter))
   throw Error('Lead SDK directory changed while fingerprinting: '+(relative||'.'));
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
function sameExternalInputContent(a,b){
 return Boolean(a&&b&&a.format==='manufact-design-factory-external-input-manifest-v1'&&
  b.format===a.format&&a.version===b.version&&
  JSON.stringify(a.sdkFiles)===JSON.stringify(b.sdkFiles)&&
  ((a.phpFile===null&&b.phpFile===null)||
   (a.phpFile&&b.phpFile&&path.basename(a.phpFile.path)===path.basename(b.phpFile.path)&&
    a.phpFile.bytes===b.phpFile.bytes&&a.phpFile.sha256===b.phpFile.sha256)));
}
function createExternalInputSnapshot(baseline,snapshotRoot){
 if(!baseline||baseline.format!=='manufact-design-factory-external-input-manifest-v1')
  throw Error('A valid Lead input baseline is required');
 const root=path.resolve(snapshotRoot),rootStat=fs.lstatSync(root);
 if(rootStat.isSymbolicLink()||!rootStat.isDirectory()||fs.realpathSync(root)!==root||
  fs.readdirSync(root).length!==0)
  throw Error('Lead input snapshot target must be a canonical empty directory');
 const current=captureExternalInputs(baseline.sdkPath,baseline.phpFile?baseline.phpFile.path:null);
 if(!sameExternalInputs(baseline,current))
  throw Error('Lead inputs changed before isolated snapshot creation');
 const sdkPath=path.join(root,'sdk');
 let phpCopy=null;
 try{
  fs.mkdirSync(sdkPath,{mode:0o700});
  for(const item of baseline.sdkFiles){
   if(typeof item.path!=='string'||!item.path||item.path.includes('\\')||
    path.posix.isAbsolute(item.path)||item.path.split('/').some(part=>!part||part==='.'||part==='..'))
    throw Error('Unsafe relative Lead SDK snapshot path');
   const source=path.join(baseline.sdkPath,...item.path.split('/'));
   const before=fs.lstatSync(source);
   if(before.isSymbolicLink()||!before.isFile()||fs.realpathSync(source)!==source)
    throw Error('Lead SDK input is no longer a canonical regular file: '+item.path);
   const bytes=fs.readFileSync(source),after=fs.lstatSync(source);
   if(after.isSymbolicLink()||!after.isFile()||fs.realpathSync(source)!==source||
    !sameStat(before,after)||bytes.length!==item.bytes||sha(bytes)!==item.sha256)
    throw Error('Lead SDK input changed during snapshot creation: '+item.path);
   const destination=path.join(sdkPath,...item.path.split('/'));
   fs.mkdirSync(path.dirname(destination),{recursive:true,mode:0o700});
   fs.writeFileSync(destination,bytes,{flag:'wx',mode:0o400});
   fs.chmodSync(destination,0o400);
  }
  if(baseline.phpFile){
   const source=baseline.phpFile.path,before=fs.lstatSync(source);
   if(before.isSymbolicLink()||!before.isFile()||fs.realpathSync(source)!==source)
    throw Error('Lead PHP input is no longer a canonical regular file');
   const bytes=fs.readFileSync(source),after=fs.lstatSync(source);
   if(after.isSymbolicLink()||!after.isFile()||fs.realpathSync(source)!==source||
    !sameStat(before,after)||bytes.length!==baseline.phpFile.bytes||
    sha(bytes)!==baseline.phpFile.sha256)
    throw Error('Lead PHP input changed during snapshot creation');
   const phpDirectory=path.join(root,'php');
   fs.mkdirSync(phpDirectory,{mode:0o700});
   phpCopy=path.join(phpDirectory,path.basename(source));
   fs.writeFileSync(phpCopy,bytes,{flag:'wx',mode:0o400});
   fs.chmodSync(phpCopy,0o400);
  }
  function seal(directory){
   for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const child=path.join(directory,entry.name),stat=fs.lstatSync(child);
    if(stat.isSymbolicLink())throw Error('Unexpected symlink in Lead snapshot');
    if(stat.isDirectory())seal(child);
    else if(stat.isFile())fs.chmodSync(child,0o400);
    else throw Error('Unsupported entry in Lead snapshot');
   }
   fs.chmodSync(directory,0o500);
  }
  seal(root);
  const copied=captureExternalInputs(sdkPath,phpCopy);
  if(!sameExternalInputContent(baseline,copied))
   throw Error('Isolated Lead snapshot does not match the original input content');
  return Object.freeze({root,sdkPath,phpFile:phpCopy,manifestSha256:copied.sha256});
 }catch(error){
  try{removeExternalInputSnapshot(root);}catch{}
  throw error;
 }
}
function removeExternalInputSnapshot(snapshotRoot){
 const root=path.resolve(snapshotRoot);
 let rootStat;
 try{rootStat=fs.lstatSync(root);}
 catch(error){if(error.code==='ENOENT')return;throw error;}
 if(rootStat.isSymbolicLink()){fs.unlinkSync(root);return;}
 if(!rootStat.isDirectory()||fs.realpathSync(root)!==root)
  throw Error('Refusing to clean an untrusted Lead snapshot path');
 function makeWritable(directory){
  fs.chmodSync(directory,0o700);
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
   const child=path.join(directory,entry.name),stat=fs.lstatSync(child);
   if(stat.isSymbolicLink())fs.unlinkSync(child);
   else if(stat.isDirectory())makeWritable(child);
   else if(stat.isFile())fs.chmodSync(child,0o600);
   else fs.unlinkSync(child);
  }
 }
 makeWritable(root);
 fs.rmSync(root,{recursive:true,force:false});
}
module.exports=Object.freeze({captureExternalInputs,sameExternalInputs,
 sameExternalInputContent,createExternalInputSnapshot,removeExternalInputSnapshot});
