#!/usr/bin/env node
// Exact CLI/exit-status OSV contract regression. All HTTP responses are
// generated in a sandboxed child process via --import, NEVER fetched online.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'research/parallel-security/osv-strict-snapshot.mjs');
const lab = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-osv-cli-'));
const sub = path.join(lab, 'research/parallel-security');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
let count = 0;
function check(condition, label) {
  assert.ok(condition, label);
  count++;
  console.log('PASS CLI '+label);
}
function invoke(scenario, args = []) {
  const r = cp.spawnSync(process.execPath, [
    '--import', path.join(lab, 'offline-preload.mjs'),
    path.join(sub, 'osv-strict-snapshot.mjs'), ...args
  ], {encoding:'utf8',timeout:12000,maxBuffer:6*1024*1024,
    env:{...process.env, OSV_CLI_FAKE_SCENARIO:scenario}});
  assert.equal(r.error, undefined, String(r.error));
  return r;
}
function report(r) {
  try { return JSON.parse(r.stdout); }
  catch { throw Error('Missing structured 43-row report: '+r.stdout.slice(0,250)+' '+r.stderr.slice(0,250)); }
}
try {
  fs.mkdirSync(path.join(lab,'cms/editor'),{recursive:true});
  fs.mkdirSync(sub,{recursive:true});
  const original = fs.readFileSync(source);
  const target = path.join(sub,'osv-strict-snapshot.mjs');
  fs.copyFileSync(source,target);
  assert.equal(sha(fs.readFileSync(target)),sha(original),'exact OSV script bytes');
  const composer = {packages:Array.from({length:14},(_,i)=>({
    name:'vendor/package-'+String(i).padStart(2,'0'),version:'1.0.0',
    source:{reference:'a'.repeat(40)},dist:{reference:'a'.repeat(40)}
  })),'packages-dev':[]};
  const npm = {lockfileVersion:3,packages:{'':{name:'fixture',version:'1.0.0'}}};
  for(let i=0;i<29;i++)npm.packages['node_modules/pkg-'+String(i).padStart(2,'0')]
    ={version:'2.0.0',integrity:'sha512-'+'A'.repeat(86)+'=='};
  const cPath=path.join(lab,'cms/composer.lock');
  const nPath=path.join(lab,'cms/editor/package-lock.json');
  fs.writeFileSync(cPath,JSON.stringify(composer));
  fs.writeFileSync(nPath,JSON.stringify(npm));
  const preload = `// Fake OSV querybatch; no outbound network possible in this fixture.
const kind=process.env.OSV_CLI_FAKE_SCENARIO;
globalThis.fetch=async (url, options)=>{
  if(url!=='https://api.osv.dev/v1/querybatch' || options.method!=='POST' ||
     options.redirect!=='error' ||
     options.headers['content-type']!=='application/json')
    throw Error('OSV_INCOMPLETE: unsafe HTTP request policy');
  const {queries}=JSON.parse(options.body);
  if(queries.length!==43 || !queries.every(x=>x.version && x.package?.name && x.package.ecosystem))
    throw Error('OSV_INCOMPLETE: incomplete query contract');
  let results=Array.from({length:43},()=>({}));
  if(kind==='advisory'||kind==='csv-advisory')results[7]={vulns:[{id:'GHSA-aaaa-bbbb-cccc'}]};
  if(kind==='partial')results.pop();
  if(kind==='unread')results[7]={next_page_token:'more'};
  if(kind==='duplicate')results[7]={vulns:[{id:'GHSA-aaaa-bbbb-cccc'},{id:'GHSA-aaaa-bbbb-cccc'}]};
  if(kind==='wrong-type')results[7]={vulns:{id:'GHSA-aaaa-bbbb-cccc'}};
  let bytes=new TextEncoder().encode(JSON.stringify({results}));
  if(kind==='broken-json')bytes=new TextEncoder().encode('broken json');
  if(kind==='invalid-utf8')bytes=new Uint8Array([255,254]);
  if(kind==='oversize')bytes=new Uint8Array(4*1024*1024+1);
  return {ok:kind!=='http-error',status:kind==='http-error'?429:200,
    body:new ReadableStream({start(controller){controller.enqueue(bytes);controller.close();}})};
};
`;
  fs.writeFileSync(path.join(lab,'offline-preload.mjs'),preload);
  const clean=invoke('clean');
  check(clean.status===0&&clean.stderr.includes('OSV_EXACT_PIN_COVERAGE'),'full clean response exits zero');
  const data=report(clean);
  check(data.completeQueryResponse===true&&data.covered===43&&data.composer===14&&data.npm===29&&
    data.results.length===43&&data.packagesWithAdvisories===0,'all 43 exact rows included');
  check(data.lockSha256['cms/composer.lock']===sha(fs.readFileSync(cPath))&&
    data.lockSha256['cms/editor/package-lock.json']===sha(fs.readFileSync(nPath)),
    'exact lock byte digests retained');
  check(data.qualifiedApproval===false&&data.notSecurityClearance===true,
    'no accidental security or legal approval');
  check(!Number.isNaN(Date.parse(data.checkedAt)),'machine-parsable snapshot time');
  const advisory=invoke('advisory',['--fail-on-advisory']);
  check(advisory.status===4&&report(advisory).packagesWithAdvisories===1,
    'complete advisory response fails gate with exit four');
  check(report(advisory).advisoryReferences===1&&
    report(advisory).results.some(x=>x.advisoryIds.includes('GHSA-aaaa-bbbb-cccc')),
    'full advisory ID retained');
  const csv=invoke('csv-advisory',['--csv','--fail-on-advisory']);
  check(csv.status===4&&csv.stdout.trimEnd().split('\n').length===44&&
    csv.stdout.includes('GHSA-aaaa-bbbb-cccc'), 'CSV has exactly 43 package rows and advisory');
  for(const scenario of ['partial','unread','duplicate','wrong-type','broken-json',
    'invalid-utf8','oversize','http-error']) {
    const r=invoke(scenario);
    check(r.status===1&&r.stderr.includes('OSV_EXACT_PIN_FAILED')&&
      !r.stdout.includes('completeQueryResponse'),scenario+' cannot claim complete coverage');
  }
  const invalid=invoke('clean',['--unsupported']);
  check(invalid.status===1&&invalid.stderr.includes('OSV_EXACT_PIN_FAILED'),
    'unexpected option rejected before query');
  fs.writeFileSync(nPath,JSON.stringify({...npm,packages:{'':{name:'fixture'}}}));
  const missing=invoke('clean');
  check(missing.status===1&&missing.stderr.includes('OSV_EXACT_PIN_FAILED')&&
    !missing.stdout.includes('completeQueryResponse'),'missing pin inventory never reports clean');
  check(sha(fs.readFileSync(source))===sha(original),'source unchanged after all hostile fixtures');
  console.log('OSV exact CLI offline subprocess regression PASS '+count+' assertions; no HTTP requests, no live audit');
} finally {
  fs.rmSync(lab,{recursive:true,force:true,maxRetries:2});
}
