#!/usr/bin/env node
'use strict';
// Opt-in exact version freshness check. Read-only; never updates locks.
// Query registry metadata on trusted networked CI; network errors FAIL CLOSED.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const c=JSON.parse(fs.readFileSync(path.join(root,'cms/composer.lock'),'utf8'));
const n=JSON.parse(fs.readFileSync(path.join(root,'cms/editor/package-lock.json'),'utf8'));
const locked=[
 ...c.packages.map(p=>({ecosystem:'Packagist',name:p.name,locked:p.version})),
 ...Object.entries(n.packages).filter(([x])=>x).map(([x,p])=>({ecosystem:'npm',name:x.slice(13),locked:p.version}))
];
if(locked.length!==43)throw Error('Unexpected lock count');
const semver=v=>/^\d+\.\d+(?:\.\d+)?$/.test(v.replace(/^v/,''))?v.replace(/^v/,'').split('.').map(Number).concat(v.replace(/^v/,'').split('.').length===2?[0]:[]):null;
const compare=(a,b)=>{const x=semver(a),y=semver(b);if(!x||!y)return 0;for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]-y[i];return 0};
async function one(item){
 const url=item.ecosystem==='npm'
  ?'https://registry.npmjs.org/'+encodeURIComponent(item.name)+'/latest'
  :'https://repo.packagist.org/p2/'+item.name+'.json';
 const res=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error(item.name+' registry HTTP '+res.status);
 const x=await res.json();
 let latest;
 if(item.ecosystem==='npm')latest=x.version;
 else{
  const versions=x.packages?.[item.name]||[];
  const candidates=versions.map(v=>v.version).filter(v=>semver(v));
  candidates.sort(compare);
  latest=candidates.at(-1);
 }
 if(!latest||!semver(latest))throw Error('Cannot establish stable latest for '+item.name);
 return {...item,latest,upgradeCandidate:compare(item.locked,latest)<0,source:url};
}
async function main(){
 const concurrency=5, results=[];
 for(let i=0;i<locked.length;i+=concurrency){
  const batch=await Promise.all(locked.slice(i,i+concurrency).map(one));
  results.push(...batch);
 }
 process.stdout.write(JSON.stringify({checkedAt:new Date().toISOString(),count:results.length,
  note:'Registry latest only; not a security/compatibility upgrade recommendation',
  outdated:results.filter(x=>x.upgradeCandidate).length,results},null,2)+'\n');
}
main().catch(e=>{console.error('INCOMPLETE freshness check: '+e.message);process.exitCode=1;});