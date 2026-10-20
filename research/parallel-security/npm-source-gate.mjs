#!/usr/bin/env node
// Installed npm archive review, NOT an upstream legal opinion.
// Run in a complete and trusted npm ci checkout. No network or mutations.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function fail(message,code=1){console.error('NPM ARCHIVE EVIDENCE '+message);process.exitCode=code;throw new Error(message);}
function file(base,options){
  let found=options.map(x=>path.join(base,x)).filter(x=>fs.existsSync(x));
  if(!found.length)fail('BLOCKED missing installed file in '+base,2);
  const target=found[0],stat=fs.lstatSync(target);
  if(stat.isSymbolicLink()||!stat.isFile()||stat.size<70||stat.size>1024*1024)fail('Unsafe license/notice node '+target);
  return fs.readFileSync(target,'utf8');
}
function check(){
  if(process.argv.length!==2)fail('Usage: node npm-source-gate.mjs (no args)',2);
  const editor=path.join(root,'cms/editor');
  if(!fs.existsSync(path.join(editor,'node_modules')))fail('BLOCKED: trusted npm ci installation required',2);
  const lock=JSON.parse(fs.readFileSync(path.join(editor,'package-lock.json'),'utf8'));
  const required={jedison:'1.27.1',esbuild:'0.25.12','playwright-core':'1.55.1'};
  for(const [name,version] of Object.entries(required))
    if(lock.packages['node_modules/'+name]?.version!==version)fail('Unreviewed package version '+name);
  const nm=path.join(editor,'node_modules');
  const jedison=file(path.join(nm,'jedison'),['LICENSE','LICENSE.md']);
  if(!jedison.includes('German Bisurgi')||!jedison.includes('MIT License'))fail('Jedison upstream MIT attribution missing');
  const bundled=file(editor,['THIRD_PARTY_LICENSES.txt']);
  if(!bundled.includes('German Bisurgi')||!bundled.includes('MIT License'))fail('Jedison bundle attribution missing');
  const esbuild=file(path.join(nm,'esbuild'),['LICENSE.md','LICENSE']);
  if(!esbuild.includes('Evan Wallace')||!esbuild.includes('MIT License'))fail('esbuild MIT attribution missing');
  const playwright=file(path.join(nm,'playwright-core'),['LICENSE','LICENSE.md']);
  if(!playwright.includes('Apache License')||!playwright.includes('Version 2.0'))fail('Playwright Apache license missing');
  const notices=file(path.join(nm,'playwright-core'),['ThirdPartyNotices.txt']);
  if(!notices.includes('THIRD-PARTY SOFTWARE NOTICES')||!notices.includes('agent-base@'))fail('Playwright embedded third party notices missing');
  const entries=[...notices.matchAll(/^-\s*([^\n(]+)/gm)].length;
  if(entries<30)fail('Playwright third party attribution unexpectedly short');
  console.log(JSON.stringify({status:'installed-archive-legal-text-present',checked:['jedison/LICENSE','editor/THIRD_PARTY_LICENSES.txt',
    'esbuild/LICENSE.md','playwright-core/LICENSE','playwright-core/ThirdPartyNotices.txt'],entries,
    note:'Not verification of tarball original bytes or embedded licenses; build-only playwright/esbuild not distributed by current CMS package',
    independentlyApproved:false}));
}
try{check()}catch(e){if(!process.exitCode)process.exitCode=1;}
