#!/usr/bin/env node
// Verify the EVIDENCE from an opt-in online subprocess; exit 0 alone is NEVER
// proof of 43 exact-lock OSV queries or freshness coverage. Research only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function demand(ok,why){if(!ok)throw Error('ONLINE_EVIDENCE_UNVERIFIED: '+why);}
function record(stdout,label){
  demand(typeof stdout==='string'&&stdout.length>2&&stdout.length<=3*1024*1024,
    label+' JSON missing or oversize');
  try {
    const value=JSON.parse(stdout);
    demand(value!==null&&typeof value==='object'&&!Array.isArray(value),
      label+' output not an object');
    return value;
  }catch(e){
    if(String(e.message).includes('ONLINE_EVIDENCE_UNVERIFIED'))throw e;
    throw Error('ONLINE_EVIDENCE_UNVERIFIED: '+label+' output is not single JSON');
  }
}
function versionTuple(input){
  if(typeof input!=='string')return null;
  const value=input.replace(/^v/,'');
  if(!/^\d+\.\d+(?:\.\d+)?$/.test(value))return null;
  const parts=value.split('.').map(Number);
  if(parts.length===2)parts.push(0);
  return parts;
}
function comparesNewer(latest,locked){
  const a=versionTuple(latest),b=versionTuple(locked);
  if(!a||!b)return false; // mirrors version-check.mjs's unknown semantics
  for(let i=0;i<3;i++){
    if(a[i]!==b[i])return a[i]>b[i];
  }
  return false;
}
function withinWindow(iso){
  demand(typeof iso==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(iso),
    'missing UTC ISO millisecond timestamp');
  const millis=Date.parse(iso);
  demand(Number.isFinite(millis)&&Math.abs(Date.now()-millis)<=300000,
    'stale or future-dated online evidence');
}
function locks(root){
  demand(typeof root==='string'&&path.isAbsolute(root),'invalid absolute checkout root');
  const paths=['cms/composer.lock','cms/editor/package-lock.json'];
  const data=paths.map(file=>{
    const full=path.join(root,file),s=fs.lstatSync(full);
    demand(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=16*1024*1024,
      'unsafe lockfile '+file);
    const raw=fs.readFileSync(full);
    demand(raw.length===s.size, 'lockfile changed during evidence read '+file);
    return {file,hash:sha(raw),json:JSON.parse(raw.toString('utf8'))};
  });
  const [composer,npm]=data.map(x=>x.json);
  demand(Array.isArray(composer.packages)&&composer.packages.length===14,
    'Composer runtime inventory not 14');
  demand(Array.isArray(composer['packages-dev'])&&composer['packages-dev'].length===0,
    'unexpected Composer development pins');
  demand(npm?.lockfileVersion===3&&typeof npm.packages==='object'&&npm.packages!==null,
    'npm lock v3 missing');
  const php=composer.packages.map(x=>({ecosystem:'Packagist',name:x.name,version:x.version}));
  const js=Object.entries(npm.packages).filter(([key])=>key).map(([key,value])=>{
    demand(key.startsWith('node_modules/'),'unexpected npm lock key '+key);
    return {ecosystem:'npm',name:key.slice('node_modules/'.length),version:value.version};
  });
  const rows=[...php,...js].sort((a,b)=>[a.ecosystem,a.name].join('/').localeCompare([b.ecosystem,b.name].join('/')));
  demand(js.length===29&&rows.length===43,'not 29 npm plus 14 Composer exact locked versions');
  demand(rows.every(x=>typeof x.name==='string'&&x.name.length>0&&typeof x.version==='string'&&x.version.length>0),
    'invalid exact lock metadata');
  demand(new Set(rows.map(x=>x.ecosystem+':'+x.name)).size===43,'duplicate locked package');
  return {sha256:Object.fromEntries(data.map(x=>[x.file,x.hash])),rows};
}
function exactRows(actual,expected,map){
  demand(Array.isArray(actual)&&actual.length===43,'not 43 reported rows');
  const seen=new Set();
  for(let i=0;i<43;i++){
    const r=actual[i],e=expected[i];
    demand(r&&typeof r==='object'&&!Array.isArray(r),'missing result row '+i);
    demand(r.ecosystem===e.ecosystem&&r.name===e.name&&
      map(r)===e.version,'wrong pinned package/version or order at '+i);
    const key=r.ecosystem+':'+r.name;
    demand(!seen.has(key),'repeated online result '+key);
    seen.add(key);
  }
}
export function verifyOsvEvidence(stdout,root){
  const r=record(stdout,'OSV');
  const source=locks(root);
  demand(r.format==='ai-site-cms-point-in-time-osv-v1'&&
    r.source==='https://api.osv.dev/v1/querybatch'&&
    r.completeQueryResponse===true&&r.lockSnapshotVerifiedUnchanged===true,
    'OSV exact-query response not independently completed');
  withinWindow(r.checkedAt);
  demand(r.covered===43&&r.composer===14&&r.npm===29,
    'OSV query coverage must exactly equal 43');
  demand(r.lockSha256&&typeof r.lockSha256==='object'&&
    Object.keys(r.lockSha256).length===2&&
    Object.entries(source.sha256).every(([name,hash])=>r.lockSha256[name]===hash),
    'OSV queried package digests differ from current unchanged original locks');
  demand(r.qualifiedApproval===false&&r.notSecurityClearance===true,
    'OSV incorrectly claims production/security approval');
  exactRows(r.results,source.rows,x=>x.version);
  let count=0,advisories=0;
  for(const x of r.results){
    demand(Array.isArray(x.advisoryIds)&&x.advisoryIds.every(k=>typeof k==='string'),
      'missing/invalid advisory ID collection');
    demand(x.count===x.advisoryIds.length,'inconsistent advisory count');
    if(x.count){count++;advisories+=x.count;}
  }
  // --fail-on-advisory must exit 4 when real advisories are present, so
  // zero-exit path must never be accepted alongside nonzero findings.
  demand(r.packagesWithAdvisories===count&&r.advisoryReferences===advisories&&
    count===0&&advisories===0,
    'OSV has findings but reported a successful fail-on-advisory exit');
  return {proof:'43 exact locked packages, complete OSV querybatch, matching SHA256, no reported advisories',
    checkedAt:r.checkedAt,lockSha256:source.sha256,covered:43,advisoryReferences:0,
    securityApproved:false,legalApproved:false};
}
export function verifyRegistryEvidence(stdout,root){
  const r=record(stdout,'registry');
  const source=locks(root);
  withinWindow(r.checkedAt);
  demand(r.count===43&&Number.isInteger(r.outdated)&&r.outdated>=0&&r.outdated<=43,
    'registry coverage/outdated counts invalid');
  demand(r.note==='Registry latest only; not a security/compatibility upgrade recommendation',
    'registry freshness report missing safety qualifier');
  const expected=source.rows.map(x=>({...x}));
  demand(Array.isArray(r.results),'registry result rows missing');
  const ordered=[...r.results].sort((a,b)=>[a.ecosystem,a.name].join('/').localeCompare([b.ecosystem,b.name].join('/')));
  exactRows(ordered,expected,x=>x.locked);
  let outdated=0;
  for(const x of r.results){
    demand(typeof x.latest==='string'&&/^\d+\.\d+(?:\.\d+)?$/.test(x.latest.replace(/^v/,'')),
      'registry latest not numeric semver for '+x.name);
    demand(typeof x.upgradeCandidate==='boolean',
      'registry upgrade candidate flag missing for '+x.name);
    demand(x.upgradeCandidate===comparesNewer(x.latest,x.locked),
      'registry upgrade classification contradicts pinned and latest versions for '+x.name);
    const prefix=x.ecosystem==='npm'
      ? 'https://registry.npmjs.org/'+encodeURIComponent(x.name)+'/latest'
      : 'https://repo.packagist.org/p2/'+x.name+'.json';
    demand(x.source===prefix,'unexpected registry endpoint '+x.name);
    if(x.upgradeCandidate)outdated++;
  }
  demand(outdated===r.outdated,'registry outdated count does not match results');
  return {proof:'43 exact locked package versions with registry freshness evidence',
    checkedAt:r.checkedAt,covered:43,outdated,securityApproved:false};
}
