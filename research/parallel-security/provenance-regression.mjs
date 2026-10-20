#!/usr/bin/env node
// Negative mutation suite on entirely synthetic lock fixture: no network / no real npm installs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
const sourceDir=path.dirname(fileURLToPath(import.meta.url));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-cms-provenance-'));
const names=['aix-ppc64','android-arm','android-arm64','android-x64','darwin-arm64','darwin-x64','freebsd-arm64','freebsd-x64','linux-arm','linux-arm64','linux-ia32','linux-loong64','linux-mips64el','linux-ppc64','linux-riscv64','linux-s390x','linux-x64','netbsd-arm64','netbsd-x64','openbsd-arm64','openbsd-x64','openharmony-arm64','sunos-x64','win32-arm64','win32-ia32','win32-x64'];
function specimen(){
 const manifest={private:true,dependencies:{jedison:'1.27.1'},devDependencies:{esbuild:'0.25.12','playwright-core':'1.55.1'}};
 const packages={'':{dependencies:{...manifest.dependencies},devDependencies:{...manifest.devDependencies}}};
 const sri='sha512-'+Buffer.alloc(64,123).toString('base64');
 const optionalDependencies={};
 for(const part of names)optionalDependencies['@esbuild/'+part]='0.25.12';
 for(const [name,version] of Object.entries({...optionalDependencies,...manifest.dependencies,...manifest.devDependencies})){
  const short=name.split('/').at(-1),platform=name.startsWith('@esbuild/');
  packages['node_modules/'+name]={version,resolved:'https://registry.npmjs.org/'+name+'/-/'+short+'-'+version+'.tgz',integrity:sri,
   license:name==='playwright-core'?'Apache-2.0':'MIT', ...(platform?{optional:true,dev:true,os:['linux'],cpu:['x64']}:{}), ...(name==='esbuild'?{hasInstallScript:true,optionalDependencies}:{})};
 }
 const composer={packages:Array.from({length:14},(_,i)=>({name:'vendor/package'+i,version:'1.2.3',license:[i===0?'Apache-2.0':i===1?'BSD-3-Clause':'MIT'],source:{url:'https://github.com/vendor/library.git',reference:'a'.repeat(40)},dist:{reference:'a'.repeat(40)}})),'packages-dev':[]};
 return {manifest,npm:{lockfileVersion:3,packages},composer};
}
function run(f){
 fs.writeFileSync(path.join(temp,'cms/composer.lock'),JSON.stringify(f.composer));
 fs.writeFileSync(path.join(temp,'cms/editor/package-lock.json'),JSON.stringify(f.npm));
 fs.writeFileSync(path.join(temp,'cms/editor/package.json'),JSON.stringify(f.manifest));
 return cp.spawnSync(process.execPath,[path.join(temp,'research/parallel-security/lock-provenance.mjs')],{encoding:'utf8'});
}
function assertion(ok,why){if(!ok)throw Error('FAIL '+why);console.log('PASS '+why);}
function rejection(name,change,pattern){const f=specimen();change(f);const r=run(f);assertion(r.status===1&&pattern.test(r.stderr),name+' negative');}
try{
 for(const p of ['cms/editor','research/parallel-security'])fs.mkdirSync(path.join(temp,p),{recursive:true});
 fs.copyFileSync(path.join(sourceDir,'lock-provenance.mjs'),path.join(temp,'research/parallel-security/lock-provenance.mjs'));
 let r=run(specimen());assertion(r.status===0,'baseline synthetic metadata '+r.stderr);
 const x=JSON.parse(r.stdout);assertion(x.php===14&&x.npm===29&&x.sha512Integrities===29,'14+29 real schema checks');
 rejection('forged npm tarball origin',f=>f.npm.packages['node_modules/jedison'].resolved='https://attacker.invalid/x',/unexpected npm source URL/);
 rejection('malformed SRI',f=>f.npm.packages['node_modules/jedison'].integrity='sha512-fake',/invalid npm SHA512 SRI/);
 rejection('Composer mismatched source and dist',f=>f.composer.packages[0].dist.reference='b'.repeat(40),/PHP source\/dist commit mismatch/);
 rejection('Composer unpinned source',f=>f.composer.packages[0].source.reference='bad',/non-SHA PHP ref/);
 rejection('new untracked optional platform',f=>f.npm.packages['node_modules/esbuild'].optionalDependencies['@esbuild/fake']='0.25.12',/optional manifest mismatch/);
 rejection('unreviewed CPU filter removal',f=>delete f.npm.packages['node_modules/@esbuild/aix-ppc64'].cpu,/CPU\/OS filters/);
 rejection('direct dependency shadowed',f=>f.npm.packages[''].dependencies.jedison='1.27.2',/npm root pin mismatch/);
 rejection('postinstall behavior changed',f=>delete f.npm.packages['node_modules/esbuild'].hasInstallScript,/postinstall behavior changed/);
 console.log(JSON.stringify({suite:'synthetic-provenance-regression',passed:true,checks:10,actualRepoLocksValidated:false}));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
