#!/usr/bin/env node
'use strict';
// D4: one end-to-end offline kit test. No external data, hosting or packages.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const sdk=require('../../sdk/contract.cjs');
const {compile,FORMAT,THEMES,KITS,loadRegistry,serialize}=require('../lib/compiler.cjs');
const gallery=require('../lib/kit-gallery.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-factory-d4-'));
const cmd=path.resolve(__dirname,'../bin/design-factory.cjs');
const run=args=>cp.spawnSync(process.execPath,[cmd,...args],{encoding:'utf8'});
const digest=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
try{
 assert.equal(Object.keys(KITS).length,12);
 assert.equal(Object.values(KITS).filter(x=>x.bilingual).length,4);
 const registry=loadRegistry();
 let checked=0,sections=0;
 for(const kit of Object.keys(KITS))for(const theme of Object.keys(THEMES))for(const language of ['ru','en']){
  const result=compile({format:FORMAT,version:1,kit,theme,language,facts:{}},registry);
  assert.equal(result.site.pages.length,4,kit);
  assert.ok(result.site.pages.every(p=>p.sections.length>=3));
  assert.deepEqual(sdk.validateSite(JSON.parse(serialize(result.site)),registry),result.site);
  assert.equal(sdk.inspectSite(result.site,registry).errors.length,0);
  assert.ok(result.checklist.missing.includes('facts.title'));
  sections+=result.site.pages.reduce((n,p)=>n+p.sections.length,0);
  checked++;
 }
 assert.equal(checked,288);
 const out=path.join(root,'gallery');
 const result=gallery.generate(out);
 assert.deepEqual([result.kitCount,result.siteCount,result.pageCount],[12,16,64]);
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'catalog-manifest.json'),'utf8'));
 assert.equal(manifest.format,'manufact-design-sector-gallery-v1');
 assert.equal(manifest.items.length,16);
 const paths=new Set();
 for(const item of manifest.items){
  assert.ok(!paths.has(item.folder));paths.add(item.folder);
  assert.equal(item.readyForPublish,false);
  const p=path.join(out,item.folder);
  const site=JSON.parse(fs.readFileSync(path.join(p,'site-v1.json'),'utf8'));
  sdk.validateSite(site,registry);
  assert.equal(site.pages.length,4);
  for(const [name,hash] of Object.entries(item.sha256)){
   const bytes=fs.readFileSync(path.join(p,name));
   assert.equal(digest(bytes),hash,item.folder+'/'+name);
  }
  for(const route of ['index.html','services/index.html','approach/index.html','contact/index.html']){
   const html=fs.readFileSync(path.join(p,route),'utf8');
   assert.ok(html.includes('<html lang="'+item.language+'">'));
   assert.ok(html.includes('noindex'));
   assert.ok(!html.includes('<script'));
   assert.ok(html.includes('href='));
  }
  const css=fs.readFileSync(path.join(p,'assets/preview.css'),'utf8');
  assert.ok(css.includes('prefers-reduced-motion'));
 }
 const catalog=fs.readFileSync(path.join(out,'index.html'),'utf8');
 assert.equal((catalog.match(/class="kit-card"/g)||[]).length,16);
 assert.ok(catalog.includes('max-width:900px')&&catalog.includes('max-width:580px'));
 assert.throws(()=>gallery.generate(out),/Existing directory/);
 const cliOut=path.join(root,'cli-gallery');
 const cli=run(['kit-gallery',cliOut]);
 assert.equal(cli.status,0,cli.stderr);
 assert.equal(JSON.parse(cli.stdout).pageCount,64);
 const region=run(['create','--kit','restaurant']);
 assert.equal(region.status,0,region.stderr);
 assert.equal(JSON.parse(region.stdout).theme.background,THEMES.copper.cms.background);
 assert.notEqual(run(['kit-gallery',cliOut]).status,0);
 console.log('DESIGN_FACTORY_D4_SMOKE PASS: 288 site-v1 contracts, 12 kits, 16 browser-ready sites / 64 HTML pages, 96 SHA256 matches, safe CLI');
}finally{fs.rmSync(root,{recursive:true,force:true});}
