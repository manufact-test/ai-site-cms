#!/usr/bin/env node
'use strict';
/**
 * Offline CMS ENGINE shipment, not a public-site release. Never modifies a
 * live installation, its database, environment, traffic, or an existing path.
 * Integrity inventory is a hash check, NOT a signature or owner approval.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const die=message=>{throw Error('CMS engine package refused: '+message);};
const exists=p=>{try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const ROOTS=['bin','components','media-motion','runtime-export','schemas','sdk','server','studio'];
const PHP_ROOTS=['components','media-motion','server','studio'];
const PROFILES=['full','php-host'];
const PHP_STUDIO=new Set(['index.html','bundle.js','studio.css','hosted.js','hosted.css','access.js','media-processing.js']);
const PHP_MEDIA=new Set(['lib/contract.cjs','lib/sha256.cjs','workbench/engine.js']);
function phpHostIncludes(relative) {
  if(relative.startsWith('stage3/studio/'))return PHP_STUDIO.has(relative.slice('stage3/studio/'.length));
  if(relative.startsWith('stage3/media-motion/'))return PHP_MEDIA.has(relative.slice('stage3/media-motion/'.length));
  if(relative.startsWith('stage3/components/'))return relative.endsWith('.json');
  if(relative.startsWith('stage3/server/'))return relative.endsWith('.php');
  return false;
}
const SKIP=new Set(['tests','fixtures','docs','node_modules','.git','coverage','screenshots','out']);
const EXT=/\.(?:php|cjs|js|jsx|mjs|css|html|json|txt|md)$/i;
const MAX_FILES=2000,MAX_BYTES=60000000;
const REQUIRED=[
  'stage3/server/bootstrap.php','stage3/server/public/index.php',
  'stage3/studio/bundle.js','stage3/studio/hosted.js',
  'stage3/sdk/contract.cjs','stage3/components/custom-section.json',
  'stage3/runtime-export/bin/build.cjs'
];
function canonical(dir) {
  if(!path.isAbsolute(dir??'')||!exists(dir)||fs.lstatSync(dir).isSymbolicLink()
    ||fs.realpathSync(dir)!==path.resolve(dir)||!fs.statSync(dir).isDirectory())
    die('expected existing canonical absolute directory without symlinks');
  return path.resolve(dir);
}
function collect(root,strict=false,profile='full'){
  if(!PROFILES.includes(profile))die('unsupported CMS package profile');
  const roots=profile==='php-host'?PHP_ROOTS:ROOTS;
  const files=[];let bytes=0;
  const visit=(folder,rel)=>{
    const nodes=fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'));
    for(const item of nodes){
      const name=item.name;
      if(!/^[a-zA-Z0-9._\[\]-]+$/.test(name)||name==='.'||name==='..')
        die('unsafe file or directory name');
      const relative=rel+'/'+name;
      const full=path.join(folder,name);
      if(item.isSymbolicLink()||(!item.isFile()&&!item.isDirectory())
        ||fs.lstatSync(full).isSymbolicLink())die('links and special files forbidden: '+relative);
      if(item.isDirectory()){
        if(SKIP.has(name)){if(strict)die('excluded directory in verified release: '+relative);continue;}
        visit(full,relative);continue;
      }
      if(profile==='php-host'&&!phpHostIncludes(relative)){
        if(strict)die('untracked file in hosted-PHP runtime: '+relative);
        continue;
      }
      if(!EXT.test(name)||/^(?:\.env|.*(?:secret|password|credentials?|private).*)/i.test(name))
        die('unexpected runtime file: '+relative);
      const buffer=fs.readFileSync(full);
      bytes+=buffer.length;
      if(++count.value>MAX_FILES||bytes>MAX_BYTES)die('runtime package is too large');
      files.push({path:relative,size:buffer.length,sha256:sha(buffer)});
    }
  };
  const count={value:0};
  const top=path.join(root,'stage3');
  if(!exists(top)||fs.lstatSync(top).isSymbolicLink()||!fs.statSync(top).isDirectory())die('missing or linked runtime root');
  for(const dir of roots){
    const folder=path.join(root,'stage3',dir);
    if(!exists(folder)||fs.lstatSync(folder).isSymbolicLink()||!fs.statSync(folder).isDirectory())
      die('missing required first-party runtime directory: '+dir);
    visit(folder,'stage3/'+dir);
  }
  files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  const requiredPaths=profile==='php-host'?REQUIRED.filter(p=>!p.startsWith('stage3/sdk/')&&!p.startsWith('stage3/runtime-export/')):REQUIRED;
  for(const required of requiredPaths)if(!files.some(f=>f.path===required))
    die('missing essential engine file: '+required);
  return {files,bytes,fingerprint:sha(Buffer.from(JSON.stringify(files)))};
}
function write(directory,manifest){
  const dest=path.join(directory,'cms-release.json');
  fs.writeFileSync(dest,JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
}
function pack(sourceArg,outputArg,profile='full'){
  const source=canonical(sourceArg);
  if(!path.isAbsolute(outputArg??'')||exists(outputArg)||outputArg.endsWith(path.sep))
    die('output must be a new absolute directory');
  const dest=path.resolve(outputArg);
  if(dest.startsWith(source+path.sep)||dest===source)
    die('output must be outside the source tree');
  const parent=canonical(path.dirname(dest));
  if(path.dirname(dest)!==parent)die('non-canonical output parent');
  const before=collect(source,false,profile);
  fs.mkdirSync(dest,{mode:0o700});
  try{
    for(const file of before.files){
      const from=path.join(source,file.path),to=path.join(dest,file.path);
      fs.mkdirSync(path.dirname(to),{recursive:true});
      fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);
      fs.chmodSync(to,0o600);
    }
    const after=collect(dest,true,profile);
    if(after.fingerprint!==before.fingerprint)die('source changed during packaging');
    const manifest={format:'manufact-cms-engine-release-v1',profile,
      files:after.files,bytes:after.bytes,fingerprint:after.fingerprint,
      sourceTrusted:false,ownerApprovalRequired:true,dbMigrated:false,deployed:false};
    write(dest,manifest);
    report({action:'pack',directory:dest,profile,files:after.files.length,bytes:after.bytes,
      fingerprint:after.fingerprint,deployed:false});
  }catch(e){fs.rmSync(dest,{recursive:true,force:true});throw e;}
}
function verify(directory){
  const root=canonical(directory);
  const file=path.join(root,'cms-release.json');
  if(!exists(file)||fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>400000)
    die('missing or oversized release descriptor');
  const m=JSON.parse(fs.readFileSync(file,'utf8'));
  if(m.format!=='manufact-cms-engine-release-v1'||!PROFILES.includes(m.profile)||m.sourceTrusted!==false
    ||m.ownerApprovalRequired!==true||m.dbMigrated!==false||m.deployed!==false
    ||!Array.isArray(m.files)||m.files.length>MAX_FILES
    ||!Number.isSafeInteger(m.bytes)||m.bytes<1
    ||!(/^[a-f0-9]{64}$/).test(m.fingerprint))die('invalid release descriptor');
  const current=collect(root,true,m.profile);
  if(current.fingerprint!==m.fingerprint||current.bytes!==m.bytes
    ||JSON.stringify(current.files)!==JSON.stringify(m.files))die('release files modified or incomplete');
  // Reject extras in release root, even if their paths would not be copied.
  const extra=fs.readdirSync(root).filter(n=>!['stage3','cms-release.json'].includes(n));
  if(extra.length)die('untracked files in release root');
  const roots=m.profile==='php-host'?PHP_ROOTS:ROOTS;
  const stage3extra=fs.readdirSync(path.join(root,'stage3')).filter(n=>!roots.includes(n));
  if(stage3extra.length)die('untracked runtime directories');
  return {root,manifest:m};
}
function compare(oldArg,newArg){
  const old=verify(oldArg).manifest,next=verify(newArg).manifest;
  if(old.profile!==next.profile)die('cannot compare different engine installation profiles');
  const a=new Map(old.files.map(x=>[x.path,x.sha256]));
  const b=new Map(next.files.map(x=>[x.path,x.sha256]));
  const changed=[...new Set([...a.keys(),...b.keys()])].sort()
    .filter(p=>a.get(p)!==b.get(p));
  report({action:'compare',profile:old.profile,oldFingerprint:old.fingerprint,newFingerprint:next.fingerprint,
    unchanged:old.fingerprint===next.fingerprint,
    added:changed.filter(p=>!a.has(p)),removed:changed.filter(p=>!b.has(p)),
    modified:changed.filter(p=>a.has(p)&&b.has(p)),
    oldBytes:old.bytes,newBytes:next.bytes,
    dbCompatibility:'not checked; inspect required migrations on isolated database',
    safeRollback:'old verified package remains immutable; DB rollback is NOT implied',
    deploymentPerformed:false,ownerApprovalRequired:true});
}
function report(x){process.stdout.write(JSON.stringify(x,null,2)+'\n');}
try{
  const [cmd,...args]=process.argv.slice(2);
  if(cmd==='pack'&&args.length===2)pack(args[0],args[1]);
  else if(cmd==='pack-php-host'&&args.length===2)pack(args[0],args[1],'php-host');
  else if(cmd==='verify'&&args.length===1){
    const x=verify(args[0]);report({action:'verify',profile:x.manifest.profile,fingerprint:x.manifest.fingerprint,
      files:x.manifest.files.length,bytes:x.manifest.bytes,valid:true});
  }else if(cmd==='compare'&&args.length===2)compare(args[0],args[1]);
  else die('usage: pack|pack-php-host ABS_SOURCE_REPO ABS_NEW_OUTPUT | verify ABS_RELEASE | compare ABS_OLD_RELEASE ABS_NEW_RELEASE');
}catch(error){console.error(error.message);process.exitCode=1;}
