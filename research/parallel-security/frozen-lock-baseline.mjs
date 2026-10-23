#!/usr/bin/env node
// Read-only dual-checksum baseline gate for EXACT reviewed Composer/npm locks.
// SHA-256 expected digests were computed from the ORIGINAL checked-in 43-pin
// release dependency manifests. Not an upstream archive audit or signed SBOM.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const projectRoot=path.resolve(here,'../..');
export const BASELINE=Object.freeze({
  'cms/composer.lock':{
    sha256:'873918bfbe8ba55cf33f298e0ad46a688d54075dac55c87e696a1ad5e654a6e1',
    gitBlob:'fe4d35b16ef0576ac8a818ce861ea8480601b9fb'
  },
  'cms/editor/package-lock.json':{
    sha256:'d045ae0f50635f9c544b856c3d4fa139f04ae3c30cb115c4d8d9b0e840827db1',
    gitBlob:'ab73c0cb516e7b053dbef0502ee88d658a654037'
  },
  'cms/editor/package.json':{
    sha256:'3b0c55cc432c44214870437e94e23ffc6f84dbae4df5aeebdf1587130918b059',
    gitBlob:'b0d964fca02d44249f9fbb8ed3ac5b2f9b50bc00'
  }
});
const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
const gitBlob=x=>crypto.createHash('sha1').update(Buffer.from('blob '+x.length))
  .update(Buffer.from([0])).update(x).digest('hex');
function demand(condition,message){
  if(!condition)throw Error('FROZEN_LOCK_PROVENANCE_FAIL: '+message);
}
function safelyRead(root,relative){
  const filename=path.join(root,relative);
  let st;
  try{st=fs.lstatSync(filename);}catch(e){
    throw Error('FROZEN_LOCK_PROVENANCE_FAIL: missing required exact manifest '+relative);
  }
  demand(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&
    st.size>20&&st.size<=16*1024*1024,'unsafe original exact manifest '+relative);
  const fd=fs.openSync(filename,fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  let original,bytes,after;
  try {
    original=fs.fstatSync(fd);
    demand(original.dev===st.dev&&original.ino===st.ino&&
      original.size===st.size&&original.nlink===1,
      'original lock replaced at open '+relative);
    bytes=fs.readFileSync(fd);
    after=fs.fstatSync(fd);
  } finally {fs.closeSync(fd);}
  const final=fs.lstatSync(filename);
  demand(bytes.length===original.size&&
    final.isFile()&&!final.isSymbolicLink()&&final.nlink===1&&
    after.dev===original.dev&&after.ino===original.ino&&
    final.dev===original.dev&&final.ino===original.ino&&
    after.size===original.size&&final.size===original.size&&
    after.mtimeMs===original.mtimeMs&&final.mtimeMs===original.mtimeMs&&
    after.ctimeMs===original.ctimeMs&&final.ctimeMs===original.ctimeMs,
    'lock source changed during read '+relative);
  return bytes;
}
function sourceMetadata(composer,npm,manifest){
  demand(Array.isArray(composer?.packages)&&composer.packages.length===14&&
    Array.isArray(composer['packages-dev'])&&composer['packages-dev'].length===0,
    '14 exact Composer production packages required');
  const ids=new Set();
  for(const row of composer.packages){
    demand(typeof row.name==='string'&&
      /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(row.name)&&!ids.has(row.name),
      'unexpected duplicate Composer package name');
    ids.add(row.name);
    demand(typeof row.version==='string'&&row.version.length>0&&
      /^https:\/\/github\.com\/[^/]+\/[^/]+\.git$/.test(row.source?.url||'')&&
      /^[a-f0-9]{40}$/.test(row.source?.reference||'')&&
      row.dist?.type==='zip'&&row.dist.reference===row.source.reference&&
      /^https:\/\/api\.github\.com\/repos\/.+\/zipball\/[a-f0-9]{40}$/.test(row.dist?.url||''),
      'Composer source/dist provenance shape invalid: '+row.name);
  }
  demand(npm?.lockfileVersion===3&&npm.packages&&
    typeof npm.packages==='object'&&!Array.isArray(npm.packages),
    'npm exact lock v3 required');
  const npmEntries=Object.entries(npm.packages).filter(([k])=>k);
  demand(npmEntries.length===29,'29 exact npm entries required');
  const npmNames=new Set();
  for(const [entry,item] of npmEntries){
    demand(entry.startsWith('node_modules/')&&
      typeof item.version==='string'&&item.version.length>0,
      'unsafe npm lock row');
    const name=entry.slice('node_modules/'.length);
    demand(!npmNames.has(name),'duplicate npm library '+name);
    npmNames.add(name);
    const short=name.split('/').at(-1);
    demand(item.resolved===
      'https://registry.npmjs.org/'+name+'/-/'+short+'-'+item.version+'.tgz'&&
      /^sha512-[A-Za-z0-9+/]{86}==$/.test(item.integrity||''),
      'npm tarball source/integrity missing '+name);
  }
  demand(manifest?.private===true&&
    manifest.name==='@manufact/ai-site-cms-editor'&&
    npm.packages['']?.name===manifest.name&&
    npm.packages['']?.version===manifest.version&&
    JSON.stringify(npm.packages[''].dependencies)===JSON.stringify(manifest.dependencies)&&
    JSON.stringify(npm.packages[''].devDependencies)===JSON.stringify(manifest.devDependencies),
    'npm editor direct dependency pins diverged');
  return {composer:14,npm:29,total:43};
}
export function verifyFrozenLocks(root=projectRoot){
  demand(typeof root==='string'&&path.isAbsolute(root)&&
    fs.realpathSync(root)===root,
    'noncanonical or linked checkout root');
  const parsed={};
  for(const [file,expected] of Object.entries(BASELINE)){
    const bytes=safelyRead(root,file);
    const actualSha=sha256(bytes),actualGit=gitBlob(bytes);
    // A recognized URL or syntactically valid SRI is insufficient to accept a
    // changed vendor revision or substitute npm archive with its OWN checksum.
    demand(actualSha===expected.sha256&&actualGit===expected.gitBlob,
      'UNREVIEWED LOCK DRIFT: '+file+'; exact baseline SHA-256/Git blob differ; explicit security re-review required');
    try{parsed[file]=JSON.parse(bytes.toString('utf8'));}
    catch{throw Error('FROZEN_LOCK_PROVENANCE_FAIL: original lock JSON invalid '+file);}
  }
  const totals=sourceMetadata(parsed['cms/composer.lock'],
    parsed['cms/editor/package-lock.json'],parsed['cms/editor/package.json']);
  return {schema:'ai-site-cms-frozen-dependency-lock-evidence-v1',
    baselineMain:'59c5289b74cf85859711d9a248af8efe0762cd10',
    gitBlobIds:Object.fromEntries(Object.entries(BASELINE).map(([p,v])=>[p,v.gitBlob])),
    sha256:Object.fromEntries(Object.entries(BASELINE).map(([p,v])=>[p,v.sha256])),
    ...totals,exactOriginalBytes:true,onlineAdvisoryQueried:false,
    externalArchiveAuthenticated:false,sourceLicenseApproved:false,
    productionApproved:false,stage2Accepted:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==2){
    console.error('Usage: node frozen-lock-baseline.mjs (no arguments; read-only original exact locks)');
    process.exitCode=2;
  }else{
    try{
      const result=verifyFrozenLocks();
      console.log(JSON.stringify(result));
      console.log('Frozen exact 43-pin source+dist lock baseline PASS 3 independent SHA-256 and Git-blob identities; NO network or publisher approval');
    }catch(e){
      console.error(String(e.message||e));process.exitCode=1;
    }
  }
}
