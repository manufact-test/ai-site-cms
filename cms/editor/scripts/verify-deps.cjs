'use strict';
const fs=require('node:fs');
const path=require('node:path');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const expected={jedison:'1.27.1',esbuild:'0.25.12','playwright-core':'1.55.1'};
const nodes=lock.packages;
if(lock.lockfileVersion!==3||!nodes||!nodes[''])throw Error('Unrecognized npm lock');
for(const [name,version] of Object.entries(expected)){
  const declared=pkg.dependencies?.[name]??pkg.devDependencies?.[name];
  if(declared!==version||nodes['node_modules/'+name]?.version!==version){
    throw Error('Unpinned or mismatched runtime/build dependency '+name);
  }
}
let approved=0;
const allowed=['MIT','Apache-2.0','BSD-3-Clause'];
for(const [key,info] of Object.entries(nodes)){
  if(!key)continue;
  if(!key.startsWith('node_modules/')||typeof info.version!=='string'||!info.integrity||!info.resolved){
    throw Error('Non-locked/npm-integrity package '+key);
  }
  if(!allowed.includes(info.license))throw Error('Review package license before build '+key+': '+info.license);
  approved++;
}
if(approved!==29)throw Error('Review transitive dependency additions/removals, got '+approved);
const legal=fs.readFileSync(path.resolve(__dirname,'../THIRD_PARTY_LICENSES.txt'),'utf8');
if(!legal.includes('German Bisurgi')||!legal.includes('MIT License'))throw Error('Jedison license attribution missing');
console.log('Stage2 exact NPM dependency lock PASS: '+approved+' packages (including build-only optional platforms), approved declared metadata licenses, integrity pins and bundled upstream attribution');
