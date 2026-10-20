#!/usr/bin/env node
// Exact-pin, complete-response, strictly bounded OSV.dev snapshot.
// Standalone research ONLY: never edits Composer/npm locks or authorizes deployment.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function assert(ok,message){if(!ok)throw Error('OSV_INCOMPLETE: '+message);}
function read(file){return JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));}
export function makeRows(composer,npm){
  assert(Array.isArray(composer?.packages)&&composer.packages.length===14,'expected exactly 14 Composer packages');
  assert(Array.isArray(composer['packages-dev'])&&composer['packages-dev'].length===0,'unreviewed Composer dev dependencies');
  assert(npm?.lockfileVersion===3&&typeof npm.packages==='object','npm lock v3 required');
  const php=composer.packages.map(p=>{
    assert(typeof p.name==='string'&&/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(p.name),'invalid Composer package');
    assert(typeof p.version==='string'&&p.version.length>0,'missing Composer pin: '+p.name);
    assert(/^[0-9a-f]{40}$/.test(p.source?.reference||'')&&p.source.reference===p.dist?.reference,'mismatched Composer source pin');
    return {ecosystem:'Packagist',name:p.name,version:p.version};
  });
  const npmRows=Object.entries(npm.packages).filter(([name])=>name).map(([name,item])=>{
    assert(name.startsWith('node_modules/')&&typeof item.version==='string'&&item.version.length>0,'invalid npm pin');
    assert(/^sha512-[A-Za-z0-9+/]{86}==$/.test(item.integrity||''),'missing SHA-512 npm integrity');
    return {ecosystem:'npm',name:name.slice(13),version:item.version};
  });
  assert(npmRows.length===29,'expected exactly 29 npm packages');
  const rows=[...php,...npmRows].sort((a,b)=>(a.ecosystem+'/'+a.name).localeCompare(b.ecosystem+'/'+b.name));
  assert(new Set(rows.map(x=>x.ecosystem+':'+x.name)).size===43,'duplicate package in exact-lock inventory');
  return rows;
}
export function evaluateBatch(rows,data){
  assert(Array.isArray(rows)&&rows.length>0,'missing planned exact versions');
  assert(data&&Array.isArray(data.results)&&data.results.length===rows.length,
    'OSV response count does not match every requested exact package');
  return rows.map((row,i)=>{
    const response=data.results[i];
    assert(response&&typeof response==='object'&&!Array.isArray(response),
      'missing OSV result object at '+i);
    assert(!response.next_page_token,
      'OSV page token remains unread for '+row.ecosystem+':'+row.name);
    assert(response.vulns===undefined||Array.isArray(response.vulns),
      'OSV vulns field invalid for '+row.name);
    const vulns=response.vulns||[];
    const ids=vulns.map(v=>{
      assert(typeof v?.id==='string'&&/^[A-Za-z0-9._:-]{4,128}$/.test(v.id),
        'bad vulnerability identifier for '+row.name);
      return v.id;
    });
    assert(new Set(ids).size===ids.length,'duplicate advisory IDs for '+row.name);
    return {...row,advisoryIds:ids.sort(),count:ids.length};
  });
}
function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');}
export async function snapshot(rows,post=fetch){
  const queries=rows.map(p=>({package:{ecosystem:p.ecosystem,name:p.name},version:p.version}));
  const response=await post('https://api.osv.dev/v1/querybatch',{
    method:'POST',redirect:'error',headers:{'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify({queries}),signal:AbortSignal.timeout(60000)
  });
  assert(response&&response.ok,'OSV HTTP '+(response?.status??'unreachable'));
  assert(response.body&&typeof response.body.getReader==='function','OSV response has no readable body');
  const stream=response.body.getReader(), chunks=[];
  let total=0;
  try{
    while(true){
      const {done,value}=await stream.read();
      if(done)break;
      total+=value.byteLength;
      if(total>4*1024*1024){
        await stream.cancel();
        throw Error('OSV_INCOMPLETE: response exceeds 4 MiB streaming size limit');
      }
      chunks.push(Buffer.from(value));
    }
  }finally{stream.releaseLock();}
  assert(total>1,'empty OSV response');
  let data;
  try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,total)));}
  catch(e){throw Error('OSV_INCOMPLETE: invalid OSV JSON/UTF-8: '+e.message);}
  return evaluateBatch(rows,data);
}
async function main(){
  const args=process.argv.slice(2);
  assert(args.every(a=>['--csv','--fail-on-advisory'].includes(a))&&new Set(args).size===args.length,
    'Usage: node osv-strict-snapshot.mjs [--csv] [--fail-on-advisory]');
  const files=['cms/composer.lock','cms/editor/package-lock.json'];
  const rows=makeRows(read(files[0]),read(files[1]));
  const results=await snapshot(rows);
  const affected=results.filter(r=>r.count>0);
  const report={format:'ai-site-cms-point-in-time-osv-v1',source:'https://api.osv.dev/v1/querybatch',
    checkedAt:new Date().toISOString(),completeQueryResponse:true,covered:results.length,
    composer:14,npm:29,lockSha256:Object.fromEntries(files.map(f=>[f,sha(f)])),
    packagesWithAdvisories:affected.length,advisoryReferences:results.reduce((n,r)=>n+r.count,0),
    qualifiedApproval:false,notSecurityClearance:true,
    note:'Database lookup at this time only. No offline claim or source/tarball/legal approval; all findings need explicit human triage.',
    results};
  if(args.includes('--csv')){
    process.stdout.write('ecosystem,name,version,advisory_count,advisory_ids\n'+
      results.map(r=>[r.ecosystem,r.name,r.version,String(r.count),r.advisoryIds.join(';')]
        .map(s=>'"'+s.replaceAll('"','""')+'"').join(',')).join('\n')+'\n');
  }else console.log(JSON.stringify(report,null,2));
  console.error('OSV_EXACT_PIN_COVERAGE '+JSON.stringify({
    queried:43,received:results.length,packagesWithAdvisories:affected.length,
    timestamps:report.checkedAt,legalApproval:false}));
  if(args.includes('--fail-on-advisory')&&affected.length)process.exitCode=4;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error('OSV_EXACT_PIN_FAILED '+e.message);process.exitCode=1;});
