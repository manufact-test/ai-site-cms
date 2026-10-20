#!/usr/bin/env node
// Independent synthetic online evidence regression; NO real network requests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {verifyOsvEvidence,verifyRegistryEvidence} from './online-evidence-proof.mjs';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cms-online-evidence-'));
let count=0;
const check=(ok,label)=>{assert.ok(ok,label);count++;console.log('PASS ONLINE PROOF '+label);};
const reject=(label,fn)=>{assert.throws(fn,/ONLINE_EVIDENCE_UNVERIFIED|ENOENT/);count++;console.log('PASS ONLINE PROOF '+label+' rejected');};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const stamp=()=>new Date().toISOString();
const composer={packages:Array.from({length:14},(_,i)=>({
  name:'vendor/pkg-'+String(i).padStart(2,'0'),version:'1.0.0',source:{reference:'a'.repeat(40)},dist:{reference:'a'.repeat(40)}
})),'packages-dev':[]};
const npm={lockfileVersion:3,packages:{'':{name:'fixture'}}};
for(let i=0;i<29;i++)
  npm.packages['node_modules/npm-'+String(i).padStart(2,'0')]=
    {version:'2.0.0',integrity:'sha512-'+'A'.repeat(86)+'=='};
const cFile=path.join(dir,'cms/composer.lock');
const nFile=path.join(dir,'cms/editor/package-lock.json');
function copy(x){return structuredClone(x);}
function mutate(before,fn,restore=true){const raw=fs.readFileSync(before);try{fn();}finally{if(restore)fs.writeFileSync(before,raw);}}
try{
  fs.mkdirSync(path.dirname(cFile),{recursive:true});
  fs.mkdirSync(path.dirname(nFile),{recursive:true});
  fs.writeFileSync(cFile,JSON.stringify(composer));
  fs.writeFileSync(nFile,JSON.stringify(npm));
  const locks={'cms/composer.lock':hash(fs.readFileSync(cFile)),
    'cms/editor/package-lock.json':hash(fs.readFileSync(nFile))};
  const rows=[
    ...composer.packages.map(x=>({ecosystem:'Packagist',name:x.name,version:x.version})),
    ...Object.entries(npm.packages).filter(([k])=>k).map(([k,x])=>({ecosystem:'npm',name:k.slice(13),version:x.version}))
  ].sort((a,b)=>(a.ecosystem+'/'+a.name).localeCompare(b.ecosystem+'/'+b.name));
  const emptyRows=rows.map(x=>({...x,advisoryIds:[],count:0}));
  const makeOsv=()=>({
    format:'ai-site-cms-point-in-time-osv-v1',source:'https://api.osv.dev/v1/querybatch',
    checkedAt:stamp(),completeQueryResponse:true,covered:43,composer:14,npm:29,
    lockSha256:copy(locks),lockSnapshotVerifiedUnchanged:true,
    packagesWithAdvisories:0,advisoryReferences:0,
    qualifiedApproval:false,notSecurityClearance:true,results:copy(emptyRows)
  });
  const validate=o=>verifyOsvEvidence(JSON.stringify(o),dir);
  const good=validate(makeOsv());
  check(good.covered===43&&good.advisoryReferences===0&&good.securityApproved===false,
    'legitimate complete OSV report is independently accepted');
  check(good.lockSha256['cms/composer.lock']===locks['cms/composer.lock'],
    'reported lock SHA-256 preserved');
  reject('empty zero-exit process stdout',()=>verifyOsvEvidence('',dir));
  reject('junk zero-exit process stdout',()=>verifyOsvEvidence('SUCCESS',dir));
  reject('empty JSON object',()=>validate({}));
  reject('corrupted JSON',()=>verifyOsvEvidence('{',dir));
  reject('unsafe oversized stdout',()=>verifyOsvEvidence(' '.repeat(3*1024*1024+1),dir));
  for(const [label,change] of [
    ['wrong output format',r=>r.format='unknown'],
    ['incorrect OSV source',r=>r.source='https://example.invalid'],
    ['fake complete flag',r=>r.completeQueryResponse=false],
    ['missing unchanged-lock evidence',r=>delete r.lockSnapshotVerifiedUnchanged],
    ['42 row query count',r=>r.covered=42],
    ['wrong npm coverage count',r=>r.npm=28],
    ['wrong reported Composer digest',r=>r.lockSha256['cms/composer.lock']='a'.repeat(64)],
    ['extra unreviewed lock digest',r=>r.lockSha256.unknown='a'.repeat(64)],
    ['swapped package row order',r=>[r.results[0],r.results[1]]=[r.results[1],r.results[0]]],
    ['unexpected package name',r=>r.results[0].name='untrusted'],
    ['misreported pinned version',r=>r.results[0].version='0.0.0'],
    ['dropped package row',r=>r.results.pop()],
    ['duplicate package row',r=>r.results[1]=copy(r.results[0])],
    ['nonzero actual advisory record',r=>{r.results[0].advisoryIds=['GHSA-aaaa-bbbb-cccc'];r.results[0].count=1;}],
    ['false one advisory count',r=>r.advisoryReferences=1],
    ['forged security approval',r=>r.qualifiedApproval=true],
    ['stale online timestamp',r=>r.checkedAt='2023-01-01T00:00:00.000Z'],
    ['far future-dated timestamp',r=>r.checkedAt='2099-01-01T00:00:00.000Z'],
    ['non-ISO timestamp',r=>r.checkedAt='yesterday']
  ]){
    const value=makeOsv();change(value);reject(label,()=>validate(value));
  }
  mutate(cFile,()=>fs.appendFileSync(cFile,' '));
  // Previous mutation restored the file but it was changed DURING the check.
  mutate(cFile,()=>{
    fs.appendFileSync(cFile,' ');
    reject('Composer lock changed after OSV subprocess',()=>validate(makeOsv()));
  });
  mutate(nFile,()=>{
    fs.appendFileSync(nFile,' ');
    reject('npm lock changed after OSV subprocess',()=>validate(makeOsv()));
  });
  const registry=()=>{
    const unsorted=[...composer.packages.map(x=>({ecosystem:'Packagist',name:x.name,locked:x.version})),
      ...Object.entries(npm.packages).filter(([name])=>name).map(([name,x])=>
        ({ecosystem:'npm',name:name.slice(13),locked:x.version}))];
    const reported=unsorted.map(x=>({...x,latest:'3.0.0',upgradeCandidate:true,
      source:x.ecosystem==='npm'
        ? 'https://registry.npmjs.org/'+encodeURIComponent(x.name)+'/latest'
        : 'https://repo.packagist.org/p2/'+x.name+'.json'}));
    return {checkedAt:stamp(),count:43,outdated:43,
      note:'Registry latest only; not a security/compatibility upgrade recommendation',results:reported};
  };
  const registryValidate=x=>verifyRegistryEvidence(JSON.stringify(x),dir);
  check(registryValidate(registry()).covered===43,'unsorted actual registry report accepted');
  for(const [label,alter] of [
    ['registry empty zero-exit output',r=>r.results=[]],
    ['registry wrong coverage',r=>r.count=42],
    ['registry wrong pinned version',r=>r.results[0].locked='0.0.1'],
    ['registry changed package',r=>r.results[1].name='attack'],
    ['registry duplicate entry',r=>r.results[1]=copy(r.results[0])],
    ['registry wrong source host',r=>r.results[0].source='https://evil.invalid'],
    ['registry inconsistent outdated count',r=>r.outdated=7],
    ['registry missing safety wording',r=>r.note='safe to deploy'],
    ['registry missing latest',r=>delete r.results[2].latest],
    ['registry false future timestamp',r=>r.checkedAt='2099-01-01T00:00:00.000Z']
  ]){const x=registry();alter(x);reject(label,()=>registryValidate(x));}
  check(validate(makeOsv()).covered===43,'source snapshots still valid after negative mutations');
  console.log('Online OSV and registry evidence offline regression PASS '+count+
    ' assertions; synthetic data only, no live OSV lookup or production approval');
}finally{fs.rmSync(dir,{recursive:true,force:true,maxRetries:2});}
