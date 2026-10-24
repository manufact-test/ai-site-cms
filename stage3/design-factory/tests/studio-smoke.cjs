#!/usr/bin/env node
'use strict';
// D5 contract + optional real Chromium walkthrough. Node stdlib only.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const cp=require('node:child_process');
const sdk=require('../../sdk/contract.cjs');
const root=path.resolve(__dirname,'..');
const studio=path.join(root,'studio');
const read=name=>fs.readFileSync(path.join(studio,name),'utf8');
const bundle=read('runtime.generated.js'),app=read('studio.js'),markup=read('index.html'),css=read('studio.css');
const build=cp.spawnSync(process.execPath,[path.join(root,'bin/build-browser-bundle.cjs'),'--check'],{encoding:'utf8'});
assert.equal(build.status,0,'Browser bundle must match actual local CMS source: '+build.stderr);
new Function(app);
assert.ok(markup.includes('runtime.generated.js')&&markup.includes('studio.js'));
assert.ok(!/@import|url\(\s*["']?https?:\/\//i.test(css));
assert.ok(css.includes('prefers-reduced-motion')&&css.includes('max-width:730px'));
for(const id of ['kit-list','theme-list','site-preview','page-list','title','headline','description',
 'services-list','composition','undo','redo','save-project','save-site','save-workspace','project-file','checklist'])
 assert.ok(markup.includes('id="'+id+'"'),'UI control '+id);
assert.ok(markup.includes('sandbox="allow-scripts"'));
assert.ok(!markup.includes('allow-same-origin'));
const ctx={structuredClone:global.structuredClone,console};
ctx.globalThis=ctx;
vm.runInNewContext(bundle,ctx,{timeout:10000});
const api=ctx.DesignFactory;
assert.ok(api&&api.compiler&&api.sdk&&api.preview&&api.compositions);
assert.equal(Object.keys(api.kits).length,12);
assert.equal(Object.keys(api.themes).length,12);
assert.equal(api.compositions.compositions.length,42);
const reg=require('../lib/compiler.cjs').loadRegistry();
let count=0;
for(const kit of Object.keys(api.kits))for(const theme of Object.keys(api.themes))for(const language of ['ru','en']){
 const result=api.compiler.compile({format:api.compiler.FORMAT,version:1,kit,theme,language,facts:{}});
 const normal=JSON.parse(JSON.stringify(result.site));
 sdk.validateSite(normal,reg);
 assert.equal(normal.pages.length,4);
 assert.equal(sdk.inspectSite(normal,reg).errors.length,0);
 count++;
}
const sample=api.compiler.compile({format:api.compiler.FORMAT,version:1,kit:'agency',theme:'minimal',language:'en',
 facts:{title:'Client & Craft',headline:'<script>alert(1)</script>',description:'Verified description'}});
const doc=JSON.parse(JSON.stringify(sample.site));
doc.pages[0].sections[doc.pages[0].sections.length-1]=
 api.adapter.sectionFor('gallery-mosaic','df-selected-composition','en',api.compiler.loadRegistry());
sdk.validateSite(doc,reg);
const html=api.preview.pageHtml(doc,doc.pages[0],'minimal','en');
assert.ok(html.includes('&lt;script&gt;')&&!html.includes('<script>alert(1)</script>'));
assert.ok(html.includes('photo-gallery-preview'));
assert.ok(!/<iframe\b/i.test(html));
console.log('DESIGN_FACTORY_D5_NODE PASS: '+count+' browser bundle/real CMS parity, 42 compositions, safe preview escaping, bundle reproducibility');
// Optional: Chromium is invoked only when explicitly selected by the reviewer.
const bin=process.env.DF_CHROMIUM_BIN;
if(!bin){console.log('DESIGN_FACTORY_D5_CHROMIUM SKIP: set DF_CHROMIUM_BIN=/usr/bin/chromium to run browser E2E');process.exit(0);}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'df-studio-chromium-'));
try{
 const fixture=path.join(temp,'studio');fs.cpSync(studio,fixture,{recursive:true});
 let page=fs.readFileSync(path.join(fixture,'index.html'),'utf8');
 const probe=[
 '<script>',
 "window.addEventListener('load',function(){",
 "const ready=()=>{const frame=document.getElementById('site-preview');return Boolean(frame.getAttribute('srcdoc'))};",
 "const mark=(result)=>{const el=document.createElement('div');el.id='d5-browser-result';el.textContent=result;document.body.appendChild(el);};",
 "setTimeout(function(){",
 "try{",
 "if(!ready())throw Error('initial preview missing');",
 "const items=document.querySelectorAll('.kit-item');if(items.length!==12)throw Error('kit selector');",
 "items[3].click();if(items[3].getAttribute('aria-pressed')!=='true')throw Error('industry selection');",
 "const themes=document.querySelectorAll('.theme-card');if(themes.length!==12)throw Error('theme selector');",
 "themes[7].click();if(themes[7].getAttribute('aria-pressed')!=='true')throw Error('theme selection');",
 "document.querySelector('[data-device=mobile]').click();",
 "if(document.getElementById('preview-shell').dataset.device!=='mobile')throw Error('mobile view');",
 "const t=document.getElementById('title');t.focus();t.value='Verified Demo Company';",
 "t.dispatchEvent(new Event('input',{bubbles:true}));t.dispatchEvent(new Event('change',{bubbles:true}));",
 "const c=document.getElementById('composition');c.value='gallery-mosaic';c.dispatchEvent(new Event('change',{bubbles:true}));",
 "if(document.getElementById('composition').value!=='gallery-mosaic')throw Error('composition selection');",
 "if(!document.getElementById('site-preview').srcdoc.includes('photo-gallery-preview'))throw Error('gallery preview');",
 "document.getElementById('undo').click();",
 "if(document.getElementById('composition').value==='gallery-mosaic')throw Error('undo failure');",
 "document.getElementById('redo').click();",
 "if(document.getElementById('composition').value!=='gallery-mosaic')throw Error('redo failure');",
 "mark('D5_BROWSER_E2E_PASS');",
 "}catch(e){mark('D5_BROWSER_E2E_FAIL: '+e.message)}",
 "},600);",
 "});",
 '</script>'
 ].join('\n');
 page=page.replace('</body>',probe+'</body>');
 fs.writeFileSync(path.join(fixture,'index.html'),page);
 const run=cp.spawnSync(bin,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run',
  '--disable-background-networking','--allow-file-access-from-files','--virtual-time-budget=8000','--dump-dom',
  'file://'+path.join(fixture,'index.html')],{encoding:'utf8',timeout:30000,maxBuffer:15*1024*1024});
 assert.equal(run.status,0,'Chromium exit: '+run.stderr.slice(-1000));
 assert.ok(run.stdout.includes('D5_BROWSER_E2E_PASS'),'Chromium UI E2E: '+run.stdout.slice(-900));
 console.log('DESIGN_FACTORY_D5_CHROMIUM PASS: kit→theme→mobile→edit→gallery→undo→redo');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
