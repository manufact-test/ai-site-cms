#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const __dirname = require('node:path').dirname(fileURLToPath(import.meta.url));
'use strict';
// Read-only reproducible lock ledger and optional live OSV.dev batch query.
// Node >=22. Never installs, changes locks, or writes secrets.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const ALLOWED = new Set(['MIT','BSD-3-Clause','Apache-2.0']);
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const composer = read('cms/composer.lock');
const npm = read('cms/editor/package-lock.json');
function assert(ok, why) { if (!ok) throw new Error(why); }
function ledger() {
  assert(Array.isArray(composer.packages), 'composer.packages absent');
  assert(Array.isArray(composer['packages-dev']) && composer['packages-dev'].length===0, 'Unexpected PHP dev dependency');
  assert(npm.lockfileVersion===3 && npm.packages && npm.packages[''], 'Bad npm lock');
  const items = [];
  for (const p of composer.packages) {
    assert(Array.isArray(p.license) && p.license.length===1 && ALLOWED.has(p.license[0]), 'Review PHP SPDX: '+p.name);
    assert(p.source?.reference && p.dist?.reference, 'Missing PHP source pin: '+p.name);
    items.push({ecosystem:'Packagist',name:p.name,version:p.version,spdx:p.license[0],scope:'php-runtime',
      source:p.source.url,reference:p.source.reference,integrity:'source-ref '+p.dist.reference});
  }
  for (const [key,p] of Object.entries(npm.packages)) {
    if (!key) continue;
    assert(key.startsWith('node_modules/') && p.version && p.resolved && p.integrity, 'Missing npm provenance: '+key);
    assert(ALLOWED.has(p.license), 'Review npm SPDX: '+key);
    const name=key.slice('node_modules/'.length);
    const scope=name==='jedison'?'browser-runtime':p.optional?'build-optional-platform':'build/test';
    items.push({ecosystem:'npm',name,version:p.version,spdx:p.license,scope,source:p.resolved,
      reference:'',integrity:p.integrity});
  }
  assert(composer.packages.length===14,'Expected 14 PHP runtime packages');
  assert(items.filter(x=>x.ecosystem==='npm').length===29,'Expected 29 npm locked packages');
  assert(items.length===43,'Expected 43 total locked components');
  assert(new Set(items.map(x=>x.ecosystem+'/'+x.name)).size===43,'Duplicate component');
  return items.sort((a,b)=>(a.ecosystem+'/'+a.name).localeCompare(b.ecosystem+'/'+b.name));
}
function csv(rows){
  const fields=['ecosystem','name','version','spdx','scope','source','reference','integrity'];
  const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
  return fields.join(',')+'\n'+rows.map(r=>fields.map(k=>quote(r[k])).join(',')).join('\n')+'\n';
}
async function osv(rows){
  const queries=rows.map(r=>({package:{ecosystem:r.ecosystem,name:r.name},version:r.version}));
  const response=await fetch('https://api.osv.dev/v1/querybatch',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({queries}),signal:AbortSignal.timeout(30000)
  });
  if(!response.ok)throw Error('OSV querybatch HTTP '+response.status);
  const data=await response.json();
  assert(Array.isArray(data.results) && data.results.length===rows.length,'Incomplete OSV results');
  const entries=data.results.map((result,i)=>{
    assert(!result.next_page_token,'Unconsumed OSV pagination for '+rows[i].name);
    return {name:rows[i].name,ecosystem:rows[i].ecosystem,version:rows[i].version,
      advisoryIds:(result.vulns||[]).map(x=>x.id),count:(result.vulns||[]).length};
  });
  return entries;
}
async function main() {
  const rows=ledger(), args=process.argv.slice(2), online=args.includes('--online');
  assert(args.every(x=>['--online','--csv'].includes(x)),'Usage: node inventory-audit.mjs [--csv] [--online]');
  const hashes=['cms/composer.lock','cms/editor/package-lock.json'].map(f=>({
    file:f,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex')
  }));
  if(args.includes('--csv'))process.stdout.write(csv(rows));
  else process.stdout.write(JSON.stringify({status:'lock-metadata-only-not-legal-approval',componentCount:rows.length,
    composerRuntime:14,npmLocked:29,hashes,licenses:Object.fromEntries([...ALLOWED].map(x=>[x,rows.filter(r=>r.spdx===x).length])),
    components:rows},null,2)+'\n');
  if(online){
    // A successful query proves only a point-in-time database lookup, not absence of defects.
    const findings=await osv(rows);
    console.error(JSON.stringify({source:'OSV.dev/v1/querybatch',checkedAt:new Date().toISOString(),
      coverage:findings.length, findings:findings.filter(x=>x.count)},null,2));
  } else console.error('OFFLINE ONLY: vulnerability, source LICENSE/NOTICE and latest-version queries NOT performed.');
}
main().catch(e=>{console.error('INCOMPLETE AUDIT: '+e.message);process.exitCode=1;});