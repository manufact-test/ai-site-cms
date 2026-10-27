#!/usr/bin/env node
'use strict';
/**
 * D3 local-only release rehearsal. No network client, deployment service,
 * DNS, Git operations, CMS DB or hosting credentials.
 * Slots are immutable snapshots; the atomic pointer ONLY changes the
 * local 127.0.0.1 inspection router, never actual production traffic.
 */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {inspect}=require('../lib/verify.cjs');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const die=msg=>{throw Error('D3 release manager: '+msg);};
const exists=p=>{try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const SLOT=/^[a-z][a-z0-9-]{1,49}$/;
const SITE=/^[a-z][a-z0-9-]{2,79}$/;
const MAX_FILES=4000,MAX_BYTES=180000000;
const [cmd,rootArg,...args]=process.argv.slice(2);
function resolveRoot(){
  if(!path.isAbsolute(rootArg??''))die('registry path must be absolute');
  const root=path.resolve(rootArg);
  if(!fs.existsSync(root)||fs.realpathSync(root)!==root||!fs.statSync(root).isDirectory()
    ||fs.lstatSync(root).isSymbolicLink())die('existing canonical registry path required');
  return root;
}
function statePath(root){return path.join(root,'registry.json');}
function state(root){
  const s=JSON.parse(fs.readFileSync(statePath(root),'utf8'));
  if(s.format!=='manufact-local-cutover-v1'||!Number.isSafeInteger(s.generation)||s.generation<0
    ||typeof s.slots!=='object'||!s.slots||Array.isArray(s.slots)
    ||(s.siteId!==null&&!SITE.test(s.siteId))
    ||(s.active!==null&&!SLOT.test(s.active))
    ||(s.previous!==null&&!SLOT.test(s.previous))
    ||!Array.isArray(s.history))die('invalid local registry');
  return s;
}
function write(root,data){
  const target=statePath(root);
  const temp=path.join(root,'.stage3-state-'+crypto.randomBytes(10).toString('hex'));
  try{
    fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
    fs.renameSync(temp,target);
  }finally{if(exists(temp))fs.rmSync(temp,{force:true});}
}
function locked(root,run){
  const lock=path.join(root,'.stage3-local-lock');
  let fd;
  try{fd=fs.openSync(lock,'wx',0o600);}catch(e){if(e.code==='EEXIST')die('registry is already locked');throw e;}
  try{return run();}finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
function scan(source){
  if(!fs.statSync(source).isDirectory()||fs.lstatSync(source).isSymbolicLink())die('invalid package root');
  const list=[];let bytes=0;
  function walk(base,rel){
    for(const d of fs.readdirSync(base,{withFileTypes:true})){
      if(d.isSymbolicLink()||(!d.isFile()&&!d.isDirectory()))die('symlinks and device files are forbidden');
      const name=rel?rel+'/'+d.name:d.name;
      if(name.length>240||!(/^[a-zA-Z0-9._@/[\]()+-]+$/).test(name)
        ||name.split('/').some(s=>s==='.'||s==='..'||s===''))die('unsafe package path: '+name);
      const p=path.join(base,d.name);
      if(d.isDirectory()){walk(p,name);continue;}
      const b=fs.readFileSync(p);bytes+=b.length;
      if(list.length+1>MAX_FILES||bytes>MAX_BYTES)die('package exceeds safety limits');
      list.push({path:name,size:b.length,sha256:digest(b)});
    }
  }
  walk(source,'');
  list.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  return {files:list,bytes};
}
function fingerprint(x){return digest(Buffer.from(JSON.stringify(x)));}
function inspectPackage(source){
  const adapter=exists(path.join(source,'runtime-build.json'));
  const dataRoot=adapter?path.join(source,'data'):source;
  const obj=inspect(dataRoot);
  const manifest=obj.manifest;
  let technology='html';
  if(adapter){
    const raw=JSON.parse(fs.readFileSync(path.join(source,'runtime-build.json'),'utf8'));
    technology=raw.technology;
    if(raw.format!=='manufact-runtime-adapter-v1'
      ||!['php','next-static','next-ssr'].includes(technology)
      ||raw.siteId!==manifest.siteId||raw.publishedVersion!==manifest.publishedVersion
      ||raw.sourceRevision!==manifest.sourceRevision||raw.releaseManifestSha256!==obj.sha256)
      die('runtime adapter mismatches published manifest');
    if(technology==='php'&&!exists(path.join(source,'public/index.php')))
      die('PHP adapter lacks visitor front controller');
    if(technology.startsWith('next-')&&!exists(path.join(source,'package.json')))
      die('Next adapter lacks package.json');
  }
  const inventory=scan(source);
  return {technology,siteId:manifest.siteId,publishedVersion:manifest.publishedVersion,
    sourceRevision:manifest.sourceRevision,manifestSha256:obj.sha256,
    origin:manifest.publicOrigin??null,formCollector:manifest.formCollector??null,
    paths:[...obj.pages.keys()],redirects:[...obj.redirects.keys()],
    assets:manifest.assets.length,files:inventory.files,bytes:inventory.bytes};
}
function verifySlot(root,s,id){
  if(!SLOT.test(id)||!Object.hasOwn(s.slots,id))die('unknown slot '+id);
  const slot=path.join(root,'slots',id),dir=path.join(slot,'site');
  if(!fs.existsSync(slot)||fs.lstatSync(slot).isSymbolicLink()||fs.lstatSync(dir).isSymbolicLink())die('linked slot');
  const metaFile=path.join(slot,'slot.json'),raw=fs.readFileSync(metaFile);
  if(digest(raw)!==s.slots[id].sha256)die('slot descriptor modified: '+id);
  const meta=JSON.parse(raw.toString('utf8'));
  if(meta.id!==id||meta.siteId!==s.siteId)die('slot/site identity mismatch');
  const current=inspectPackage(dir);
  if(fingerprint(current)!==meta.fingerprint)die('staged package modified: '+id);
  return meta;
}
function output(x){process.stdout.write(JSON.stringify(x,null,2)+'\n');}
function init(){
  if(!path.isAbsolute(rootArg??'')||exists(rootArg))die('init requires NEW absolute empty output location');
  const parent=path.dirname(rootArg);
  if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory())die('registry parent does not exist');
  if(fs.realpathSync(parent)!==parent)die('registry parent may not be a symlink');
  fs.mkdirSync(rootArg,{mode:0o700});
  fs.mkdirSync(path.join(rootArg,'slots'),{mode:0o700});
  fs.mkdirSync(path.join(rootArg,'public'),{mode:0o700});
  const router=path.resolve(__dirname,'../templates/release-lab/router.php');
  fs.copyFileSync(router,path.join(rootArg,'public/router.php'),fs.constants.COPYFILE_EXCL);
  write(rootArg,{format:'manufact-local-cutover-v1',siteId:null,generation:0,
    active:null,previous:null,slots:{},pending:null,history:[]});
  output({initialized:true,registry:rootArg,visitor:'localhost ONLY; never production'});
}
function stage(root){
  if(args.length<2||args.length>3||!SLOT.test(args[0])
    ||!path.isAbsolute(args[1]))die('stage ABSOLUTE-registry SLOT ABSOLUTE-published-package-or-handoff.json [html|php|next-static|next-ssr]');
  const [id,source,target]=args;
  if(target!==undefined&&!['html','php','next-static','next-ssr'].includes(target))die('unknown target');
  const original=fs.realpathSync(source);
  if(original===root||original.startsWith(root+path.sep))die('cannot stage the registry itself');
  return locked(root,()=>{
    const s=state(root);
    if(Object.hasOwn(s.slots,id)||exists(path.join(root,'slots',id)))die('slot already exists; immutable revisions require a new slot name');
    let scratch=null,packageDir=original,slotTemp=null;
    try{
      if(fs.statSync(original).isFile()){
        if(!target)die('handoff JSON needs an explicit technology');
        scratch=fs.mkdtempSync(path.join(root,'.stage3-handoff-'));
        packageDir=path.join(scratch,'built');
        const child=spawnSync(process.execPath,
          [path.resolve(__dirname,'build-handoff.cjs'),original,target,packageDir],
          {encoding:'utf8',timeout:120000});
        if(child.status!==0)die('handoff reconstruction failed: '+(child.stderr||child.stdout||'unknown').slice(0,300));
      } else if(target) die('technology selection is only for JSON handoffs');
      const proof=inspectPackage(packageDir);
      if(s.siteId!==null&&s.siteId!==proof.siteId)die('cannot mix different sites in one release registry');
      slotTemp=fs.mkdtempSync(path.join(root,'slots','.stage3-slot-'));
      fs.cpSync(packageDir,path.join(slotTemp,'site'),{recursive:true,errorOnExist:true,force:false});
      const copy=inspectPackage(path.join(slotTemp,'site'));
      if(fingerprint(proof)!==fingerprint(copy))die('copy differs from verified source');
      const meta={id,siteId:proof.siteId,technology:proof.technology,
        publishedVersion:proof.publishedVersion,sourceRevision:proof.sourceRevision,
        manifestSha256:proof.manifestSha256,origin:proof.origin,formCollector:proof.formCollector,
        paths:proof.paths,redirects:proof.redirects,assets:proof.assets,
        bytes:proof.bytes,files:proof.files.length,fingerprint:fingerprint(proof)};
      const raw=Buffer.from(JSON.stringify(meta,null,2)+'\n');
      fs.writeFileSync(path.join(slotTemp,'slot.json'),raw,{flag:'wx',mode:0o600});
      fs.renameSync(slotTemp,path.join(root,'slots',id));slotTemp=null;
      s.siteId=proof.siteId;
      s.slots[id]={sha256:digest(raw),technology:proof.technology,version:proof.publishedVersion};
      s.generation++;s.pending=null;
      write(root,s);
      output({staged:id,version:proof.publishedVersion,technology:proof.technology,
        siteId:proof.siteId,files:proof.files.length,bytes:proof.bytes,
        next:'plan then activate locally; NO DEPLOY'});
    }finally{
      if(slotTemp)fs.rmSync(slotTemp,{recursive:true,force:true});
      if(scratch)fs.rmSync(scratch,{recursive:true,force:true});
    }
  });
}
function status(root,deep=false){
  const s=state(root);
  const details={format:s.format,siteId:s.siteId,generation:s.generation,
    active:s.active,previous:s.previous,
    releases:Object.keys(s.slots).sort().map(id=>({id,...s.slots[id]})),
    history:s.history.slice(-16),pending:s.pending?{kind:s.pending.kind,expiresAt:s.pending.expiresAt}:null};
  if(deep){for(const id of Object.keys(s.slots))verifySlot(root,s,id);details.integrity='verified';}
  output(details);
}
function prepare(root,rollback=false){
  const chosen=args[0];
  if((rollback&&args.length!==0)||(!rollback&&(args.length!==1||!SLOT.test(chosen))))
    die(rollback?'plan-rollback takes no slot':'plan requires exactly one staged slot');
  return locked(root,()=>{
    const s=state(root);
    const id=rollback?s.previous:chosen;
    if(!id)die('there is no previous active release');
    if(id===s.active)die('candidate is already active');
    const next=verifySlot(root,s,id);
    const prev=s.active?verifySlot(root,s,s.active):null;
    if(prev&&next.siteId!==prev.siteId)die('site identity differs');
    const changed={
      addedRoutes:next.paths.filter(x=>!prev?.paths.includes(x)),
      removedRoutes:prev?prev.paths.filter(x=>!next.paths.includes(x)):[],
      redirectChange:prev?JSON.stringify(prev.redirects)!==JSON.stringify(next.redirects):next.redirects.length>0,
      canonicalOriginChange:prev?prev.origin!==next.origin:false,
      formCollectorChange:prev?prev.formCollector!==next.formCollector:false,
      technologyChange:prev?prev.technology!==next.technology:false
    };
    const token=crypto.randomBytes(32).toString('hex');
    s.pending={token,kind:rollback?'rollback':'activate',slot:id,
      expectedGeneration:s.generation,expectedActive:s.active,
      proof:s.slots[id].sha256,expiresAt:Date.now()+15*60*1000};
    write(root,s);
    output({plan:rollback?'rollback':'activation',from:s.active,to:id,
      technology:next.technology,siteId:next.siteId,version:next.publishedVersion,
      generation:s.generation,changes:changed,confirmationToken:token,
      expiresInSeconds:900,notice:'ONLY local loopback inspector changes; never remote production traffic'});
  });
}
function switchSlot(root,rollback=false){
  if(args.length!==1||!(/^[a-f0-9]{64}$/).test(args[0]))
    die('activate or rollback requires the plan confirmation token');
  return locked(root,()=>{
    const s=state(root),p=s.pending;
    if(!p||p.kind!==(rollback?'rollback':'activate')||p.expiresAt<Date.now()
      ||p.expectedGeneration!==s.generation||p.expectedActive!==s.active
      ||!crypto.timingSafeEqual(Buffer.from(p.token,'hex'),Buffer.from(args[0],'hex')))
      die('missing, expired or stale confirmation');
    if(s.slots[p.slot]?.sha256!==p.proof)die('candidate changed since preflight');
    verifySlot(root,s,p.slot);
    if(s.active)verifySlot(root,s,s.active);
    s.previous=s.active;s.active=p.slot;s.generation++;s.pending=null;
    s.history.push({action:rollback?'rollback':'activate',from:s.previous,
      to:s.active,version:s.slots[s.active].version,generation:s.generation,
      at:new Date().toISOString()});
    if(s.history.length>100)s.history=s.history.slice(-100);
    write(root,s);
    output({active:s.active,previous:s.previous,generation:s.generation,
      action:rollback?'rollback':'activate',scope:'LOCAL LAB ONLY'});
  });
}
try{
  if(cmd==='init'){if(args.length)die('init takes no extra arguments');init();}
  else {
    const root=resolveRoot();
    if(!exists(statePath(root)))die('not an initialized D3 local registry');
    if(cmd==='stage')stage(root);
    else if(cmd==='status')status(root,false);
    else if(cmd==='verify')status(root,true);
    else if(cmd==='plan')prepare(root,false);
    else if(cmd==='activate')switchSlot(root,false);
    else if(cmd==='plan-rollback')prepare(root,true);
    else if(cmd==='rollback')switchSlot(root,true);
    else die('commands: init, stage, status, verify, plan, activate, plan-rollback, rollback');
  }
}catch(error){console.error(error.message);process.exitCode=1;}
