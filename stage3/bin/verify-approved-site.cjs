'use strict';
// Read-only preflight for a portable AI-authored site, before CMS import.
// This script neither approves mockups nor executes code from the folder.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const contract=require('../sdk/contract.cjs');
const components=path.resolve(__dirname,'../components');
const names=fs.readdirSync(components).filter(name=>/^[a-z][a-z0-9-]+\.json$/.test(name));
const manifests=names.map(name=>JSON.parse(fs.readFileSync(path.join(components,name),'utf8')));
const HANDOFF_V2='manufact-approved-site-handoff-v2';
const SHA256=/^[a-f0-9]{64}$/;
// Optional extra *page-specific* approved mockups. The six existing files
// remain mandatory for backward-compatible sealed v2 handoffs.
function pagePrototypeEntries(site,refs){
  if(refs.pagePrototypes===undefined)return [];
  const entries=refs.pagePrototypes;
  if(!entries||typeof entries!=='object'||Array.isArray(entries)||
    !Object.keys(entries).length||Object.keys(entries).length>20)
    throw Error('Invalid page prototype map (1–20 interior pages)');
  const pages=new Map(site.pages.map(page=>[page.id,page]));
  const result=[];
  for(const pageId of Object.keys(entries).sort()){
    const page=pages.get(pageId),images=entries[pageId];
    if(!page||page.path==='/'||!images||typeof images!=='object'||
      Array.isArray(images)||Object.keys(images).length!==3||
      !['desktop','tablet','mobile'].every(bp=>typeof images[bp]==='string'))
      throw Error('Page-specific prototype must map to a real interior page and three images: '+pageId);
    result.push({pageId,images});
  }
  return result;
}
function namedFiles(site,refs){
  const names=[refs.site,refs.desktop,refs.tablet,refs.mobile,
    refs.clientExplanation,refs.implementationSpec];
  for(const {images} of pagePrototypeEntries(site,refs))
    for(const bp of ['desktop','tablet','mobile'])names.push(images[bp]);
  for(const asset of site.assets){
    names.push(asset.src.replace(/^\/assets\//,'assets/'));
    for(const variant of asset.variants||[])
      names.push(variant.src.replace(/^\/assets\//,'assets/'));
  }
  if(new Set(names).size!==names.length)throw Error('Duplicate file paths within approved package');
  return names;
}
const SIGNATURES={
  'image/png':buffer=>buffer.length>=24&&buffer.subarray(0,8).equals(
    Buffer.from([137,80,78,71,13,10,26,10])),
  'image/jpeg':buffer=>buffer.length>=4&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255,
  'image/webp':buffer=>buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&
    buffer.toString('ascii',8,12)==='WEBP'
};
const MIME={'png':'image/png','jpeg':'image/jpeg','jpg':'image/jpeg','webp':'image/webp'};
/* Keep the approved MP4 preflight aligned with the existing PHP VideoGuard.
   No decoding or executing untrusted media; only bounded top-level MP4 boxes. */
function verifyMp4(bytes){
  if(bytes.length<100||bytes.length>16777216)return false;
  let offset=0,brand=null;
  const counts={ftyp:0,moov:0,mdat:0};
  while(offset<bytes.length){
    if(bytes.length-offset<8)return false;
    const size=bytes.readUInt32BE(offset);
    const type=bytes.toString('ascii',offset+4,offset+8);
    if(size<8||size>bytes.length-offset||!['ftyp','moov','mdat','free'].includes(type))
      return false;
    if(offset===0){
      if(type!=='ftyp'||size<16||size>128)return false;
      brand=bytes.toString('ascii',offset+8,offset+12);
      if(!['isom','iso2','mp41','mp42','avc1'].includes(brand))return false;
    }
    if(type in counts)counts[type]++;
    offset+=size;
  }
  return counts.ftyp===1&&counts.moov===1&&counts.mdat===1;
}

function preflight(folder){
  const root=fs.realpathSync(folder),stat=fs.statSync(root);
  if(!stat.isDirectory())throw Error('Expected a handoff folder');
  let total=0;
  function read(file,limit){
    if(typeof file!=='string'||file.length>200||
      !/^[a-zA-Z0-9_/-]+\.(?:json|md|txt|png|jpe?g|webp|mp4)$/.test(file)||
      file.split('/').includes('..'))
      throw Error('Unsafe or unsupported handoff path: '+String(file));
    const target=path.resolve(root,file),resolved=fs.realpathSync(target);
    if(!resolved.startsWith(root+path.sep))throw Error('File escapes handoff folder: '+file);
    const fileStat=fs.statSync(resolved);
    if(!fileStat.isFile()||fileStat.size>limit||fileStat.size===0)
      throw Error('Unexpected file size or type: '+file);
    total+=fileStat.size;
    if(total>100*1024*1024)throw Error('Handoff exceeds 100MB read budget');
    return fs.readFileSync(resolved);
  }
  const descriptor=read('handoff.json',200000);
  const handoff=JSON.parse(descriptor.toString('utf8'));
  if(!['manufact-approved-site-handoff-v1',HANDOFF_V2].includes(handoff.format)||
    handoff.status!=='approved'||typeof handoff.version!=='string'||
    !/^[a-zA-Z0-9._-]{1,64}$/.test(handoff.version)||
    !handoff.files||typeof handoff.files!=='object')
    throw Error('Missing approved versioned handoff.json');
  const refs=handoff.files;
  const locked=handoff.format===HANDOFF_V2;
  const observed=new Map();
  const recorded=(name,bytes)=>{observed.set(name,crypto.createHash('sha256').update(bytes).digest('hex'));return bytes;};
  const prototypes=new Set();
  for(const size of ['desktop','tablet','mobile']){
    const file=refs[size],bytes=recorded(file,read(file,8*1024*1024));
    if(bytes.length<64||!verifyRaster(bytes,MIME[file.split('.').pop().toLowerCase()]))
      throw Error('Missing or invalid '+size+' design prototype');
    prototypes.add(file);
  }
  if(prototypes.size!==3)throw Error('Three independent prototype files are required');
  for(const name of ['clientExplanation','implementationSpec']){
    const file=refs[name],bytes=recorded(file,read(file,200000));
    if(!/\.(md|txt|json)$/.test(file)||bytes.length<10)
      throw Error('Missing client explanation or portable specification: '+name);
  }
  if(!/\.json$/.test(refs.site))throw Error('site.json expected');
  const source=recorded(refs.site,read(refs.site,500000));
  if(source.length<10)throw Error('Empty site.json');
  const site=JSON.parse(source.toString('utf8'));
  contract.validateSite(site,manifests); // Every field, graph, media ID and component.
  if(refs.pagePrototypes!==undefined&&handoff.format!==HANDOFF_V2)
    throw Error('Page-specific designs require sealed v2 integrity');
  const perPage=pagePrototypeEntries(site,refs);
  for(const {pageId,images} of perPage)for(const bp of ['desktop','tablet','mobile']){
    const file=images[bp],bytes=recorded(file,read(file,8*1024*1024));
    if(bytes.length<64||!verifyRaster(bytes,MIME[file.split('.').pop().toLowerCase()]))
      throw Error('Invalid '+bp+' prototype for page '+pageId);
  }
  if(site.assets.length>300)throw Error('Too many media assets');
  for(const asset of site.assets){
    if(asset.mime!=='video/mp4'&&!SIGNATURES[asset.mime])
      throw Error('Handoff accepts PNG/JPEG/WebP and MP4 only: '+asset.id);
    const file=asset.src.replace(/^\/assets\//,'assets/');
    if(file===asset.src)throw Error('Asset path not site-scoped: '+asset.id);
    const video=asset.mime==='video/mp4';
    const bytes=recorded(file,read(file,video?16777216:1000000));
    if(video){
      if(!verifyMp4(bytes))throw Error('Invalid MP4 structure or size: '+file);
      continue; // No dimensions or responsive variants for MP4 (typed contract enforces).
    }
    if(bytes.length<20||!verifyRaster(bytes,asset.mime))
      throw Error('Image bytes and declared MIME do not match: '+file);
    if(asset.mime==='image/png'&&asset.width!==undefined){
      if(bytes.readUInt32BE(16)!==asset.width||bytes.readUInt32BE(20)!==asset.height)
        throw Error('PNG dimensions differ from site.json: '+file);
    }
    for(const variant of asset.variants||[]){
      const vfile=variant.src.replace(/^\/assets\//,'assets/');
      const b=recorded(vfile,read(vfile,1000000));
      if(b.length<20||!verifyRaster(b,asset.mime))
        throw Error('Invalid responsive image: '+vfile);
      const digest=crypto.createHash('sha256').update(b).digest('hex');
      if(digest!==variant.sha256)throw Error('Responsive SHA256 mismatch: '+vfile);
      if(asset.mime==='image/png'&&
        (b.readUInt32BE(16)!==variant.width||b.readUInt32BE(20)!==variant.height))
        throw Error('Responsive PNG dimensions mismatch: '+vfile);
    }
  }
  if(locked){
    const actual=namedFiles(site,refs),integrity=handoff.integrity;
    if(!integrity||integrity.algorithm!=='sha256'||!integrity.files||
      typeof integrity.files!=='object'||Array.isArray(integrity.files))
      throw Error('V2 package has no SHA256 lockfile');
    const declared=Object.keys(integrity.files);
    if(declared.length!==actual.length||declared.some(x=>!actual.includes(x))||
      actual.some(x=>!SHA256.test(integrity.files[x])||observed.get(x)!==integrity.files[x]))
      throw Error('Approved handoff changed since SHA256 sealing');
  }
  // A real multi-page customer site can outgrow the single-file 64MB
  // backup. Report the lower bound before an operator tries to import it.
  const mockups=[refs.desktop,refs.tablet,refs.mobile,
    ...perPage.flatMap(({images})=>['desktop','tablet','mobile'].map(bp=>images[bp]))];
  const sourceMedia=site.assets.flatMap(asset=>[asset.src.slice(1),
    ...(asset.variants||[]).map(v=>v.src.slice(1))]);
  const byteSum=files=>files.reduce((n,p)=>n+fs.statSync(path.join(root,p)).size,0);
  const approvedPrototypeBytes=byteSum(mockups),sourceAssetBytes=byteSum(sourceMedia);
  const graphs=site.pages.flatMap(p=>p.sections).filter(s=>s.designGraph).length;
  const custom=site.pages.flatMap(p=>p.sections).filter(s=>s.component==='custom-section').length;
  return Object.freeze({siteId:site.siteId,version:handoff.version,pages:site.pages.length,
    assets:site.assets.length,approvedPrototypeBytes,sourceAssetBytes,pagePrototypeSets:perPage.length+1,
    designGraphs:graphs,customSections:custom,integrity:locked?'sha256-verified':'legacy-unlocked',
    status:'structurally-compatible-not-visual-approval'});
}
function verifyRaster(bytes,mime){
  return typeof SIGNATURES[mime]==='function'&&SIGNATURES[mime](bytes);
}
if(require.main===module){
  try{
    if(process.argv.length!==3)throw Error('Usage: node stage3/bin/verify-approved-site.cjs /absolute/path/to/approved-site');
    const result=preflight(process.argv[2]);
    process.stdout.write('APPROVED SITE PREFLIGHT PASS: '+JSON.stringify(result)+'\n');
  }catch(e){console.error('APPROVED SITE PREFLIGHT FAIL: '+e.message);process.exitCode=1;}
}
module.exports=Object.freeze({preflight,namedFiles,pagePrototypeEntries,HANDOFF_V2});
