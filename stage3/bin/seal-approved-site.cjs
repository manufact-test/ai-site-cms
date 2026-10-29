'use strict';
// Offline sealing after EXPLICIT real human approval of three design mockups.
// No AI calls, no site publication, no network and no source file execution.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {preflight,namedFiles,pagePrototypeEntries,HANDOFF_V2}=require('./verify-approved-site.cjs');
function seal(folder,version,options={}){
  if(typeof version!=='string'||!/^[a-zA-Z0-9._-]{1,64}$/.test(version))
    throw Error('Invalid approved design version');
  if(!options.confirmedApproved)throw Error('Use --confirmed-approved only after actual client approval');
  const root=fs.realpathSync(folder);
  if(!fs.statSync(root).isDirectory())throw Error('Handoff folder required');
  const destination=path.join(root,'handoff.json');
  const backup=fs.existsSync(destination)?fs.readFileSync(destination):null;
  if(backup&&!options.replace)throw Error('handoff.json exists; --replace requires reconfirming the approved design');
  const refs=backup?JSON.parse(backup.toString('utf8')).files:{
    site:'site.json',desktop:'prototypes/desktop.png',tablet:'prototypes/tablet.png',
    mobile:'prototypes/mobile.png',clientExplanation:'client-explanation.md',
    implementationSpec:'implementation-spec.md'
  };
  if(!refs||typeof refs!=='object')throw Error('Invalid handoff file map');
  const siteFile=path.resolve(root,refs.site);
  if(typeof refs.site!=='string'||!/^([a-zA-Z0-9_/-]+)\.json$/.test(refs.site)||
    refs.site.split('/').includes('..')||!fs.realpathSync(siteFile).startsWith(root+path.sep))
    throw Error('Unsafe site.json path');
  if(fs.statSync(siteFile).size>500000)throw Error('site.json must be at most 500 KB');
  const site=JSON.parse(fs.readFileSync(siteFile,'utf8'));
  if(!Array.isArray(site.assets))throw Error('Site contract assets missing');
  const pageRefs=new Set(pagePrototypeEntries(site,refs).flatMap(({images})=>
    ['desktop','tablet','mobile'].map(bp=>images[bp])));
  const names=namedFiles(site,refs),hashes={};
  const videoPaths=new Set(site.assets.filter(asset=>asset.mime==='video/mp4')
    .map(asset=>asset.src.replace(/^\/assets\//,'assets/')));
  let bytesUsed=0;
  for(const relative of names){
    if(typeof relative!=='string'||relative.length>200||
      !/^[a-zA-Z0-9_/-]+\.(?:json|md|txt|png|jpe?g|webp|mp4)$/.test(relative)||
      relative.split('/').includes('..'))throw Error('Unsafe file path: '+String(relative));
    const actual=fs.realpathSync(path.resolve(root,relative));
    if(!actual.startsWith(root+path.sep)||!fs.statSync(actual).isFile())
      throw Error('File escapes bundle: '+relative);
    const max=relative===refs.site?500000:
      [refs.desktop,refs.tablet,refs.mobile].includes(relative)||pageRefs.has(relative)?8000000:
      [refs.clientExplanation,refs.implementationSpec].includes(relative)?200000:
      videoPaths.has(relative)?16777216:1000000;
    const length=fs.statSync(actual).size;bytesUsed+=length;
    if(length<1||length>max||bytesUsed>100*1024*1024)
      throw Error('Invalid handoff size or total exceeded 100MB: '+relative);
    hashes[relative]=crypto.createHash('sha256').update(fs.readFileSync(actual)).digest('hex');
  }
  const handoff={format:HANDOFF_V2,status:'approved',version,files:refs,
    integrity:{algorithm:'sha256',files:hashes}};
  const temp=path.join(root,'.handoff-next-'+process.pid);
  try{
    fs.writeFileSync(temp,JSON.stringify(handoff,null,2)+'\n',{flag:'wx',mode:0o600});
    fs.renameSync(temp,destination);
    const result=preflight(root);
    return {...result,lockedFiles:names.length};
  }catch(e){
    if(fs.existsSync(temp))fs.unlinkSync(temp);
    if(backup)fs.writeFileSync(destination,backup);
    else if(fs.existsSync(destination))fs.unlinkSync(destination);
    throw e;
  }
}
if(require.main===module){
  try{
    const [folder,version,...flags]=process.argv.slice(2);
    if(!folder||!version||flags.some(x=>!['--confirmed-approved','--replace'].includes(x)))
      throw Error('Usage: node stage3/bin/seal-approved-site.cjs FOLDER VERSION --confirmed-approved [--replace]');
    const result=seal(folder,version,{confirmedApproved:flags.includes('--confirmed-approved'),
      replace:flags.includes('--replace')});
    console.log('APPROVED SITE SEALED (offline, no publish): '+JSON.stringify(result));
  }catch(e){console.error('APPROVED SITE SEAL FAILED: '+e.message);process.exitCode=1;}
}
module.exports=Object.freeze({seal});
