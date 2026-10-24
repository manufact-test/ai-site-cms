#!/usr/bin/env node
'use strict';
// One integrated offline D1 contract, CLI and preview smoke. No network or CMS writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const sdk=require('../../sdk/contract.cjs');
const {compile,migrate,validateProject,serialize,KITS,THEMES,loadRegistry}=require('../lib/compiler.cjs');
const {writePreview}=require('../lib/preview.cjs');
const cli=path.join(__dirname,'../bin/design-factory.cjs');
const project=(kit,theme,language,facts={})=>({
  format:'manufact-design-factory-v1',version:1,kit,theme,language,facts
});
const expectError=(fn,label)=>assert.throws(fn,undefined,label);
let count=0;
const registry=loadRegistry();
const root=fs.mkdtempSync(path.join(os.tmpdir(),'df-d1-smoke-'));
try{
  for(const kit of Object.keys(KITS)){
    for(const theme of Object.keys(THEMES))for(const language of ['ru','en']){
      const input=project(kit,theme,language);
      const result=compile(input,registry);
      assert.equal(result.site.format,sdk.FORMAT);
      assert.equal(result.site.pages.length,4);
      assert.equal(result.site.pages[0].path,'/');
      assert.deepEqual(sdk.validateSite(JSON.parse(serialize(result.site)),registry),result.site);
      assert.equal(sdk.inspectSite(result.site,registry).errors.length,0);
      assert.equal(result.checklist.readyForPublish,false);
      count++;
    }
  }
  const rich=project('industrial','minimal','ru',{
    siteId:'owner-demo',title:'Проект владельца',headline:'Настоящий заголовок',
    description:'Текст, предоставленный владельцем.',
    contactText:'Контакты добавляются после подтверждения.',
    services:[{title:'Одна реальная услуга',description:'Владелец подтвердил описание.'}]
  });
  const compiled=compile(rich,registry);
  assert.equal(compiled.site.siteId,'owner-demo');
  assert.ok(JSON.stringify(compiled.site).includes('Одна реальная услуга'));
  assert.ok(JSON.stringify(compiled.site).includes('Направление 2'));
  assert.deepEqual(migrate(project('agency','editorial','en')),project('agency','editorial','en'));
  assert.deepEqual(migrate({...project('agency','editorial','en'),version:0}).version,1);
  assert.notDeepEqual(
    compile(project('agency','editorial','ru'),registry).site.pages[0].sections.map(s=>s.component),
    compile(project('industrial','technical','ru'),registry).site.pages[0].sections.map(s=>s.component)
  );
  for(const invalid of [
    {...rich,bad:true}, {...rich,version:77}, {...rich,kit:'wrong'},
    {...rich,theme:'../../evil'}, {...rich,language:'js'},
    {...rich,facts:{siteId:'../wrong'}}, {...rich,facts:{services:[{title:'a'}]}},
    {...rich,facts:{headline:'<script>',unknown:1}}
  ])expectError(()=>compile(invalid,registry),'invalid project');
  for(const theme of Object.keys(THEMES)){
    const t=compile(project('agency',theme,'ru'),registry);
    sdk.validateSite(t.site,registry);
    count++;
  }
  const exported=writePreview(compiled,path.join(root,'output'));
  assert.equal(exported.pages,4);
  for(const file of ['site-v1.json','project.json','owner-checklist.json','design-spec.json',
    'inspection.json','assets/preview.css','index.html','services/index.html','approach/index.html','contact/index.html'])
    assert.ok(fs.statSync(path.join(exported.directory,file)).size>5,file);
  const html=fs.readFileSync(path.join(exported.directory,'index.html'),'utf8');
  assert.ok(html.includes('robots" content="noindex"'));
  assert.ok(html.includes('Настоящий заголовок'));
  assert.ok(html.includes('href="services/index.html"'));
  assert.ok(!html.includes('<script'));
  assert.equal(Object.keys(THEMES).length,12);
  assert.equal(new Set(Object.keys(THEMES).map(t=>require('../lib/preview.cjs').css(t))).size,12);
  for(const theme of Object.values(THEMES))assert.ok(theme.contrast.body>=4.5&&theme.contrast.card>=4.5);
  assert.ok(fs.readFileSync(path.join(exported.directory,'assets/preview.css'),'utf8').includes('prefers-reduced-motion'));
  expectError(()=>writePreview(compiled,path.join(root,'output')),'refuse overwrite');
  const cliRun=(args)=>cp.spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  const source=path.join(root,'brief.json');
  fs.writeFileSync(source,serialize(rich));
  const output=path.join(root,'site.json');
  const generated=cliRun(['create','--brief',source,'--out',output]);
  assert.equal(generated.status,0,generated.stderr);
  assert.equal(cliRun(['validate',output]).status,0);
  assert.equal(cliRun(['inspect',output]).status,0);
  assert.equal(cliRun(['export',source,path.join(root,'cli-export')]).status,0);
  const bad=path.join(root,'bad.json');
  fs.writeFileSync(bad,serialize({...compiled.site,unexpected:true}));
  assert.notEqual(cliRun(['validate',bad]).status,0);
  const injection=compile(project('agency','editorial','en',{headline:'<img src=x onerror=alert(1)>'}),registry);
  const escaped=writePreview(injection,path.join(root,'escaped'));
  const escapedHtml=fs.readFileSync(path.join(escaped.directory,'index.html'),'utf8');
  assert.ok(escapedHtml.includes('&lt;img'));
  assert.ok(!escapedHtml.includes('<img src=x'));
  console.log('DESIGN_FACTORY_D1_D2_SMOKE PASS: '+count+' combinations, real Stage3 validator, CLI create/validate/inspect/export, 4-page HTML, XSS escaping, safe overwrite policy');
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
