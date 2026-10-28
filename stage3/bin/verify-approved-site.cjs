'use strict';
// Read-only preflight for a portable AI-authored site, before CMS import.
// This script neither approves mockups nor executes code from the folder.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const contract=require('../sdk/contract.cjs');
const components=path.resolve(__dirname,'../components');
const names=fs.readdirSync(components).filter(name=>/^[a-z][a-z0-9-]+\.json$/.test(name));
const manifests=names.map(name=>JSON.parse(fs.readFileSync(path.join(components,name),'utf8')));
const SIGNATURES={
  'image/png':buffer=>buffer.length>=24&&buffer.subarray(0,8).equals(
    Buffer.from([137,80,78,71,13,10,26,10])),
  'image/jpeg':buffer=>buffer.length>=4&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255,
  'image/webp':buffer=>buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&
    buffer.toString('ascii',8,12)==='WEBP'
};
const MIME={'png':'image/png','jpeg':'image/jpeg','jpg':'image/jpeg','webp':'image/webp'};
function preflight(folder){
  const root=fs.realpathSync(folder),stat=fs.statSync(root);
  if(!stat.isDirectory())throw Error('Expected a handoff folder');
  let total=0;
  function read(file,limit){
    if(typeof file!=='string'||file.length>200||
      !/^[a-zA-Z0-9_/-]+\.(?:json|md|txt|png|jpe?g|webp)$/.test(file)||
      file.split('/').includes('..'))
      throw Error('Unsafe or unsupported handoff path: '+String(file));
    const target=path.resolve(root,file),resolved=fs.realpathSync(target);
    if(!resolved.startsWith(root+path.sep))throw Error('File escapes handoff folder: '+file);
    const fileStat=fs.statSync(resolved);
    if(!fileStat.isFile()||fileStat.size>limit||fileStat.size===0)
      throw Error('Unexpected file size or type: '+file);
    total+=fileStat.size;
    if(total>24*1024*1024)throw Error('Handoff exceeds 24MB read budget');
    return fs.readFileSync(resolved);
  }
  const descriptor=read('handoff.json',12000);
  const handoff=JSON.parse(descriptor.toString('utf8'));
  if(handoff.format!=='manufact-approved-site-handoff-v1'||
    handoff.status!=='approved'||typeof handoff.version!=='string'||
    !/^[a-zA-Z0-9._-]{1,64}$/.test(handoff.version)||
    !handoff.files||typeof handoff.files!=='object')
    throw Error('Missing approved versioned handoff.json');
  const refs=handoff.files;
  const prototypes=new Set();
  for(const size of ['desktop','tablet','mobile']){
    const file=refs[size],bytes=read(file,8*1024*1024);
    if(bytes.length<64||!verifyRaster(bytes,MIME[file.split('.').pop().toLowerCase()]))
      throw Error('Missing or invalid '+size+' design prototype');
    prototypes.add(file);
  }
  if(prototypes.size!==3)throw Error('Three independent prototype files are required');
  for(const name of ['clientExplanation','implementationSpec']){
    const file=refs[name],bytes=read(file,200000);
    if(!/\.(md|txt|json)$/.test(file)||bytes.length<10)
      throw Error('Missing client explanation or portable specification: '+name);
  }
  if(!/\.json$/.test(refs.site))throw Error('site.json expected');
  const source=read(refs.site,500000);
  if(source.length<10)throw Error('Empty site.json');
  const site=JSON.parse(source.toString('utf8'));
  contract.validateSite(site,manifests); // Every field, graph, media ID and component.
  if(site.assets.length>300)throw Error('Too many media assets');
  for(const asset of site.assets){
    if(!SIGNATURES[asset.mime])
      throw Error('Handoff accepts PNG/JPEG/WebP only; upload video/SVG in Studio: '+asset.id);
    const ext=asset.mime==='image/jpeg'?'jpg':asset.mime.split('/')[1];
    const file=asset.src.replace(/^\/assets\//,'assets/');
    if(file===asset.src)throw Error('Asset path not site-scoped: '+asset.id);
    const bytes=read(file,450000);
    if(bytes.length<20||!verifyRaster(bytes,asset.mime))
      throw Error('Image bytes and declared MIME do not match: '+file);
    if(asset.mime==='image/png'&&asset.width!==undefined){
      if(bytes.readUInt32BE(16)!==asset.width||bytes.readUInt32BE(20)!==asset.height)
        throw Error('PNG dimensions differ from site.json: '+file);
    }
    for(const variant of asset.variants||[]){
      const vfile=variant.src.replace(/^\/assets\//,'assets/');
      const b=read(vfile,450000);
      if(b.length<20||!verifyRaster(b,asset.mime))
        throw Error('Invalid responsive image: '+vfile);
      const digest=crypto.createHash('sha256').update(b).digest('hex');
      if(digest!==variant.sha256)throw Error('Responsive SHA256 mismatch: '+vfile);
      if(asset.mime==='image/png'&&
        (b.readUInt32BE(16)!==variant.width||b.readUInt32BE(20)!==variant.height))
        throw Error('Responsive PNG dimensions mismatch: '+vfile);
    }
  }
  const graphs=site.pages.flatMap(p=>p.sections).filter(s=>s.designGraph).length;
  const custom=site.pages.flatMap(p=>p.sections).filter(s=>s.component==='custom-section').length;
  return Object.freeze({siteId:site.siteId,version:handoff.version,pages:site.pages.length,
    assets:site.assets.length,designGraphs:graphs,customSections:custom,
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
module.exports=Object.freeze({preflight});
