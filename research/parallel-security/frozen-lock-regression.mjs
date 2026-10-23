#!/usr/bin/env node
// Mutate COPIES of the exact real baseline lockfiles, never repo originals.
// Valid metadata pin substitutions can pass weak shape-only audits; a frozen
// external benchmark must reject them before a new release can be approved.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyFrozenLocks,BASELINE} from './frozen-lock-baseline.mjs';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-real-43-pin-mutations-'));
const locations=Object.keys(BASELINE);
let assertions=0;
function ok(label,condition){assert.ok(condition,label);assertions++;}
function bad(label,action){
  assert.throws(action,/FROZEN_LOCK_PROVENANCE_FAIL/,
    'Mutation incorrectly bypassed pinned source provenance: '+label);
  assertions++;
}
const file=p=>path.join(root,p);
function changeJson(target,label,action){
  const original=fs.readFileSync(file(target));
  try{
    const payload=JSON.parse(original.toString('utf8'));
    action(payload);
    fs.writeFileSync(file(target),JSON.stringify(payload,null,2)+'\n');
    bad(label,()=>verifyFrozenLocks(root));
  }finally{fs.writeFileSync(file(target),original);}
}
function changeBytes(target,label,action){
  const original=fs.readFileSync(file(target));
  try{fs.writeFileSync(file(target),action(original));
    bad(label,()=>verifyFrozenLocks(root));}
  finally{fs.writeFileSync(file(target),original);}
}
try{
  for(const name of locations){
    fs.mkdirSync(path.dirname(file(name)),{recursive:true});
    fs.copyFileSync(path.join(project,name),file(name));
  }
  const original=verifyFrozenLocks(root);
  ok('exact 14 PHP + 29 npm live lock manifest match',
    original.total===43&&original.exactOriginalBytes===true&&
    original.onlineAdvisoryQueried===false);
  ok('three external SHA-256s retained',
    Object.values(original.sha256).length===3&&
    Object.values(original.sha256).every(x=>/^[a-f0-9]{64}$/.test(x)));
  ok('Git lock IDs separate from stronger SHA-256 pins',
    Object.values(original.gitBlobIds).length===3&&
    Object.values(original.gitBlobIds).every(x=>/^[a-f0-9]{40}$/.test(x)));
  const c='cms/composer.lock',n='cms/editor/package-lock.json',p='cms/editor/package.json';
  changeJson(c,'Composer publisher redirected to attacker GitHub, same version/ref',
    x=>x.packages[0].source.url='https://github.com/evil/example.git');
  changeJson(c,'Composer dist mirror substituted with matching source SHA',
    x=>x.packages[0].dist.url='https://api.github.com/repos/evil/example/zipball/'+x.packages[0].source.reference);
  changeJson(c,'Composer re-pinned malicious but structurally valid 40-char SHA',
    x=>{x.packages[0].source.reference='a'.repeat(40);x.packages[0].dist.reference='a'.repeat(40);
      x.packages[0].dist.url=x.packages[0].dist.url.replace(/[a-f0-9]{40}$/,'a'.repeat(40));});
  changeJson(c,'Composer same declared MIT but altered package license',
    x=>x.packages[0].license=['Apache-2.0']);
  changeJson(c,'Composer unexpected additional dependency',
    x=>x.packages[0].require={...x.packages[0].require,'evil/example':'1.0.0'});
  changeJson(c,'Composer source package version changed',
    x=>x.packages[0].version='1.1.6');
  changeJson(c,'Composer dev-only shadow dependency',
    x=>x['packages-dev'].push({name:'evil/shadow',version:'1.0.0'}));
  changeJson(c,'Composer original array reorder (possible change in install order)',
    x=>x.packages.reverse());
  changeBytes(c,'Composer whitespace-only changed bytes',x=>Buffer.concat([x,Buffer.from(' ')]));
  changeJson(n,'npm matching-length SRI replaced with attacker computed checksum',
    x=>x.packages['node_modules/jedison'].integrity='sha512-'+'A'.repeat(86)+'==');
  changeJson(n,'npm source tarball switched to alternate registry',
    x=>x.packages['node_modules/jedison'].resolved='https://mirror.invalid/jedison.tgz');
  changeJson(n,'npm unexpected postinstall script switch',
    x=>x.packages['node_modules/jedison'].hasInstallScript=true);
  changeJson(n,'npm optional executable binary platform remapped',
    x=>x.packages['node_modules/@esbuild/aix-ppc64'].cpu=['x64']);
  changeJson(n,'npm optional binary platform made nonoptional',
    x=>x.packages['node_modules/@esbuild/aix-ppc64'].optional=false);
  changeJson(n,'npm version shifted without human approval',
    x=>x.packages['node_modules/jedison'].version='1.27.2');
  changeJson(n,'npm hidden extra transient package',
    x=>x.packages['node_modules/extra-unreviewed']={version:'1.0.0'});
  changeJson(n,'npm duplicate package root direct dependency shadow',
    x=>x.packages[''].dependencies.jedison='*');
  changeBytes(n,'npm newline-only formatting drift',x=>Buffer.concat([x,Buffer.from('\n')]));
  changeJson(p,'new code-execution npm script',
    x=>x.scripts.postinstall='node malicious.js');
  changeJson(p,'root editor dependencies expanded',
    x=>x.dependencies['another-lib']='1.0.0');
  changeJson(p,'root editor version changed without lock rotation',
    x=>x.version='0.0.1-stage2');
  changeBytes(p,'root manifest appended whitespace',x=>Buffer.concat([x,Buffer.from(' ')]));
  const link=file(n)+'.symlink';
  fs.symlinkSync(file(n),link);
  try{fs.renameSync(file(n),file(n)+'.original');fs.symlinkSync(file(n)+'.original',file(n));
    bad('symbolic linked npm lock rejected',()=>verifyFrozenLocks(root));
  }finally{fs.unlinkSync(file(n));fs.renameSync(file(n)+'.original',file(n));fs.unlinkSync(link);}
  const hard=file(c)+'.hardlink';
  fs.linkSync(file(c),hard);
  try{bad('hardlinked Composer lock rejected',()=>verifyFrozenLocks(root));}
  finally{fs.unlinkSync(hard);}
  const missing=file(p),saved=fs.readFileSync(missing);
  fs.unlinkSync(missing);
  try{bad('missing root editor manifest rejected',()=>verifyFrozenLocks(root));}
  finally{fs.writeFileSync(missing,saved);}
  const end=verifyFrozenLocks(root);
  ok('all three real original lockfiles restored',end.total===43&&end.exactOriginalBytes);
  assert.equal(assertions,29,'Unexpected positive/adversarial exact-lock regression count');
  console.log('Frozen exact real 43-pin lock source substitution offline regression PASS '+assertions+' assertions; original lock bytes restored, NO live registry/OSV or vendor endorsement');
} finally{
  fs.rmSync(root,{recursive:true,force:true});
}
