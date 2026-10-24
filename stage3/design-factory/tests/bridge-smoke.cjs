#!/usr/bin/env node
'use strict';
// D6 one true first-party integration gate, no network, external packages or CMS writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const sdk=require('../../sdk/contract.cjs');
const {KITS,THEMES,FORMAT,serialize,loadRegistry}=require('../lib/compiler.cjs');
const bridge=require('../lib/bridge.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'df-d6-'));
const cli=path.resolve(__dirname,'../bin/design-factory.cjs');
const run=args=>cp.spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
try{
 const reg=loadRegistry();
 let matrix=0;
 for(const kit of Object.keys(KITS))for(const theme of Object.keys(THEMES))for(const language of ['ru','en']){
  const project={format:FORMAT,version:1,kit,theme,language,facts:{}};
  const packageFile=bridge.build(project);
  assert.equal(packageFile.format,bridge.EXPORT);
  assert.equal(bridge.validateBundle(packageFile).site.pages.length,4);
  assert.equal(sdk.inspectSite(packageFile.site,reg).errors.length,0);
  assert.equal(JSON.stringify(bridge.importForCMS(packageFile)),JSON.stringify(packageFile.site));
  assert.equal(packageFile.compatibility.publishGate,'owner_review_required');
  assert.ok(packageFile.compatibility.integration_required.includes('pixel parity for CSS compositions'));
  matrix++;
 }
 assert.equal(matrix,288);
 for(const type of ['hero-center','gallery-mosaic','pricing-table','testimonials-quote']){
  const state={format:bridge.WORKSPACE,version:1,project:{format:FORMAT,version:1,kit:'agency',theme:'minimal',language:'en',facts:{}},
   composition:type};
  const packaged=bridge.build(state);
  assert.equal(packaged.compatibility.composition.composition,type);
  sdk.validateSite(bridge.importForCMS(packaged),reg);
  for(const mutation of [
   x=>{x.site.title='Injected';},
   x=>{x.site.unknown=true;},
   x=>{x.workspace.composition='gallery-rail';},
   x=>{x.designSpec.previewParity='supported';},
   x=>{x.compatibility.publishGate='ready';}
  ]){
   const changed=JSON.parse(JSON.stringify(packaged));
   mutation(changed);
   assert.throws(()=>bridge.validateBundle(changed),/D6: changed|Unexpected|Unregistered/);
  }
 }
 assert.throws(()=>bridge.workspace({format:bridge.WORKSPACE,version:1,project:{format:FORMAT,version:1,kit:'agency',theme:'minimal',language:'en',facts:{}},composition:null,unexpected:1}),/unknown workspace/);
 const project={format:FORMAT,version:1,kit:'agency',theme:'editorial',language:'ru',facts:{siteId:'df-contract-demo'}};
 const input=path.join(root,'project.json'),bundle=path.join(root,'integration.json'),site=path.join(root,'site.json');
 fs.writeFileSync(input,serialize(project));
 const exported=run(['bridge-export',input,bundle]);
 assert.equal(exported.status,0,exported.stderr);
 const imported=run(['bridge-validate',bundle,'--out',site]);
 assert.equal(imported.status,0,imported.stderr);
 assert.equal(JSON.parse(fs.readFileSync(site,'utf8')).format,sdk.FORMAT);
 assert.notEqual(run(['bridge-validate',bundle,'--out',site]).status,0,'Must refuse overwrite');
 assert.notEqual(run(['bridge-export',input,bundle]).status,0,'Must refuse overwrite');
 const corrupt=JSON.parse(fs.readFileSync(bundle,'utf8'));corrupt.site.title='tampered';
 const evil=path.join(root,'evil.json');fs.writeFileSync(evil,serialize(corrupt));
 assert.notEqual(run(['bridge-validate',evil,'--out',path.join(root,'evil-site.json')]).status,0);
 assert.ok(!fs.existsSync(path.join(root,'evil-site.json')));
 console.log('DESIGN_FACTORY_D6_SMOKE PASS: 288 complete CMS packages, 4 composed integrations, tamper refusal, offline CLI export/import');
}finally{fs.rmSync(root,{recursive:true,force:true});}
