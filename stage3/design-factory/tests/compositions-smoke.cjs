#!/usr/bin/env node
'use strict';
// One integrated D3 smoke: 42 mapped first-party components, full static
// HTML/CSS showroom, CLI and safe file-output gates. No network or npm.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const sdk=require('../../sdk/contract.cjs');
const catalog=require('../catalog/compositions.cjs');
const adapter=require('../lib/composition-adapter.cjs');
const showcase=require('../lib/showcase.cjs');
const {compile,FORMAT,loadRegistry,serialize}=require('../lib/compiler.cjs');

const root=fs.mkdtempSync(path.join(os.tmpdir(),'design-factory-d3-'));
const cli=path.resolve(__dirname,'../bin/design-factory.cjs');
const run=args=>cp.spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
try{
 assert.equal(catalog.FORMAT,'manufact-design-compositions-v1');
 assert.equal(catalog.compositions.length,42);
 assert.equal(new Set(catalog.compositions.map(x=>x.id)).size,42);
 assert.equal(new Set(catalog.compositions.map(x=>x.category)).size,14);
 assert.equal(catalog.GROUPS.length,14);
 assert.equal(adapter.validateFallbacks(),42);
 const reg=loadRegistry();
 for(const item of catalog.compositions){
  const section=adapter.sectionFor(item.id,'df-'+item.id,'en',reg);
  assert.equal(section.component,item.cmsComponent);
  assert.ok(section.elements.length>0);
  const site=compile({format:FORMAT,version:1,kit:'agency',theme:'editorial',language:'en',facts:{}},reg).site;
  site.pages[0].sections[site.pages[0].sections.length-1]=section;
  assert.deepEqual(sdk.validateSite(JSON.parse(serialize(site)),reg),site);
  assert.equal(sdk.inspectSite(site,reg).errors.length,0);
  const comparison=adapter.compare(item.id);
  assert.equal(comparison.composition,item.id);
  assert.ok(comparison.integration_required.length>0);
  assert.ok(comparison.blocked.includes('invented owner facts'));
 }
 assert.throws(()=>catalog.get('../escape'),/Unknown composition/);
 assert.throws(()=>catalog.list('../escape'),/Unknown category/);
 assert.throws(()=>adapter.sectionFor('pricing-table','../outside'),/Invalid section ID/);
 assert.throws(()=>adapter.sectionFor('hero-split','safe-section','invalid'),/Invalid language/);
 const exported=showcase.writeShowcase(path.join(root,'catalog'));
 assert.equal(exported.compositions,42);
 for(const filename of ['index.html','showcase.css','compositions.json','fallbacks.json'])
  assert.ok(fs.statSync(path.join(exported.directory,filename)).size>100,filename);
 const html=fs.readFileSync(path.join(exported.directory,'index.html'),'utf8');
 const css=fs.readFileSync(path.join(exported.directory,'showcase.css'),'utf8');
 assert.equal((html.match(/class="pattern layout-/g)||[]).length,42);
 assert.equal((html.match(/class="pattern-notes"/g)||[]).length,42);
 assert.ok(html.includes('noindex'));
 assert.ok(!html.includes('<script'));
 assert.ok(!/<img\b|<iframe\b/.test(html));
 assert.ok(!/@import|url\(/i.test(css));
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.ok(css.includes('max-width:900px')&&css.includes('max-width:600px'));
 assert.ok(css.includes('focus-visible'));
 assert.throws(()=>showcase.writeShowcase(path.join(root,'catalog')),/existing output/);
 const listing=run(['compositions']);
 assert.equal(listing.status,0,listing.stderr);
 assert.equal(JSON.parse(listing.stdout).count,42);
 const single=run(['compositions','portfolio']);
 assert.equal(single.status,0,single.stderr);
 assert.equal(JSON.parse(single.stdout).count,3);
 assert.notEqual(run(['compositions','inexistent']).status,0);
 const out=path.join(root,'site.json'),report=path.join(root,'bridge.json');
 const composed=run(['compose','gallery-mosaic','--out',out,'--report',report]);
 assert.equal(composed.status,0,composed.stderr);
 const site=JSON.parse(fs.readFileSync(out,'utf8'));
 assert.equal(site.pages[0].sections.at(-1).component,'photo-gallery');
 sdk.validateSite(site,reg);
 assert.equal(JSON.parse(fs.readFileSync(report,'utf8')).status,'integration_required');
 assert.notEqual(run(['compose','../escape','--out',path.join(root,'unsafe.json')]).status,0);
 assert.ok(!fs.existsSync(path.join(root,'unsafe.json')));
 assert.notEqual(run(['compose','gallery-mosaic','--out',out]).status,0);
 const viaCLI=run(['showcase',path.join(root,'cli-showcase')]);
 assert.equal(viaCLI.status,0,viaCLI.stderr);
 assert.ok(fs.existsSync(path.join(root,'cli-showcase','index.html')));
 console.log('DESIGN_FACTORY_D3_SMOKE PASS: 42/42 SDK fallbacks, 14 categories, HTML/CSS export, CLI, blocked unsafe paths, semantic parity');
}finally{fs.rmSync(root,{recursive:true,force:true});}
