#!/usr/bin/env node
'use strict';
/**
 * Offline consumer of the Studio published-release handoff.
 * No CMS, credentials, database, network or deployment.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {inspect}=require('../lib/verify.cjs');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=m=>{throw Error('Published handoff refused: '+m);};
const [source,target,destination]=process.argv.slice(2);
let staging=null;
try{
  if(process.argv.length!==5||!['html','php','next-static','next-ssr'].includes(target)
    ||!path.isAbsolute(source??'')||!path.isAbsolute(destination??'')
    ||fs.existsSync(destination)||!fs.existsSync(source))
    fail('Usage: build-handoff.cjs ABSOLUTE-capsule.json html|php|next-static|next-ssr ABSOLUTE-new-output');
  const maxJson=41000000;
  if(fs.statSync(source).size>maxJson)fail('Capsule exceeds 41 MB');
  const capsule=JSON.parse(fs.readFileSync(source,'utf8'));
  if(capsule.format!=='manufact-runtime-handoff-v1'||!Array.isArray(capsule.files)
    ||capsule.files.length>3000||capsule.files.length<2
    ||typeof capsule.siteId!=='string'||!Number.isInteger(capsule.version)
    ||!Number.isInteger(capsule.sourceRevision)
    ||typeof capsule.manifestSha256!=='string'||!(/^[a-f0-9]{64}$/).test(capsule.manifestSha256))
    fail('Invalid capsule contract');
  const parent=fs.realpathSync(path.dirname(destination));
  if(!fs.statSync(parent).isDirectory())fail('Output parent must exist');
  staging=fs.mkdtempSync(path.join(parent,'.stage3-handoff-'));
  const seen=new Set;
  let sum=0;
  for(const file of capsule.files){
    if(!file||typeof file.path!=='string'||file.path.length>240
      ||!(/^[a-z0-9./-]+$/).test(file.path)||file.path.startsWith('/')
      ||file.path.includes('..')||seen.has(file.path)
      ||typeof file.sha256!=='string'||!(/^[a-f0-9]{64}$/).test(file.sha256)
      ||typeof file.base64!=='string'||!(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).test(file.base64))
      fail('Unsafe capsule file');
    const bytes=Buffer.from(file.base64,'base64');
    sum+=bytes.length;
    if(sum>28000000||digest(bytes)!==file.sha256)fail('Capsule byte or checksum mismatch');
    const filename=path.join(staging,file.path);
    fs.mkdirSync(path.dirname(filename),{recursive:true});
    fs.writeFileSync(filename,bytes,{flag:'wx'});
    seen.add(file.path);
  }
  if(sum!==capsule.rawBytes)fail('Capsule declared byte count mismatch');
  const m=inspect(staging);
  if(m.sha256!==capsule.manifestSha256
    ||m.manifest.siteId!==capsule.siteId
    ||m.manifest.publishedVersion!==capsule.version
    ||m.manifest.sourceRevision!==capsule.sourceRevision)
    fail('Published manifest identity mismatch');
  if(target==='html'){
    if(fs.existsSync(destination))fail('Target already exists');
    fs.renameSync(staging,destination);
    staging=null;
  }else{
    const child=spawnSync('node',[path.resolve(__dirname,'build.cjs'),staging,target,destination],
      {encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000});
    if(child.status!==0)fail('Technology export failed: '+(child.stderr||child.stdout||'unknown').slice(0,500));
  }
  process.stdout.write('Verified historical published version '+capsule.version+
    ' -> '+target+' in '+destination+' (no deployment)\n');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(staging)fs.rmSync(staging,{recursive:true,force:true});}
