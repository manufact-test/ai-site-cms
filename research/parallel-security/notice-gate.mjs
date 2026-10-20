#!/usr/bin/env node
// Audit *upstream NOTICE preservation* in the internally compiled release, not legal approval.
// Uses only local files after a trusted composer install and internal package build.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const required=['opis/json-schema','opis/string'];
const output=path.resolve(root,'cms/.build/internal-stage2-package/private/compliance/THIRD_PARTY_NOTICES.txt');
function readSafe(file){
 if(!fs.existsSync(file))throw Object.assign(Error('MISSING: '+file),{exitCode:2});
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<5||stat.size>1024*1024)
  throw Object.assign(Error('UNSAFE: '+file),{exitCode:2});
 return fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
}
function main(){
 if(process.argv.length!==2)throw Object.assign(Error('Usage: node notice-gate.mjs (no arguments)'),{exitCode:2});
 const notices=readSafe(output);
 let checked=0;
 for(const name of required){
  const original=readSafe(path.join(root,'cms/vendor',name,'NOTICE')).trim();
  if(!notices.includes(original))throw Object.assign(Error('MISSING UPSTREAM NOTICE in compiled third-party notices: '+name),{exitCode:1});
  checked++;
 }
 console.log(JSON.stringify({status:'NOTICE texts copied into compiled package',checked,source:'installed upstream vendor tree',legalApproval:false}));
}
try{main()}catch(e){console.error(e.message);process.exitCode=e.exitCode||1;}
