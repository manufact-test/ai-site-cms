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
const {resolveOutsideRepository}=require('../lib/output-path.cjs');
const visualQA=require('../bin/visual-qa.cjs');
const {fileURLToPath}=require('node:url');
const cli=path.join(__dirname,'../bin/design-factory.cjs');
const project=(kit,theme,language,facts={})=>({
  format:'manufact-design-factory-v1',version:1,kit,theme,language,facts
});
const expectError=(fn,label)=>assert.throws(fn,undefined,label);
let count=0;
const registry=loadRegistry();
const root=fs.mkdtempSync(path.join(os.tmpdir(),'df-d1-smoke-'));
try{
  const repository=path.resolve(__dirname,'../../..');
  const safeOutput=path.join(root,'report.json');
  assert.equal(resolveOutsideRepository(safeOutput,repository),safeOutput);
  assert.throws(()=>resolveOutsideRepository(path.join(repository,'df-output-guard-'+process.pid),repository),/outside repository/);
  const alias=path.join(root,'repository-alias');
  let symlinkSupported=true;
  try{fs.symlinkSync(repository,alias,'dir');}catch(error){
    if(['EPERM','EACCES','ENOTSUP','EINVAL'].includes(error.code))symlinkSupported=false;
    else throw error;
  }
  if(symlinkSupported)assert.throws(()=>resolveOutsideRepository(path.join(alias,'df-output-guard.json'),repository),/outside repository/);
  if(symlinkSupported)assert.throws(()=>resolveOutsideRepository(alias,repository),/symlink/,
    'A final output-path symlink must be rejected, not just symlinked parents');
  const previousChromium=process.env.DF_CHROMIUM_BIN;
  try{
    process.env.DF_CHROMIUM_BIN='/bin/true';
    const parsed=visualQA.args(['--out',path.join(root,'qa # 1'),'--chromium','/bin/false','--quick']);
    assert.equal(parsed.bin,'/bin/false','Explicit Chromium path must override environment default');
    assert.equal(parsed.output,path.join(root,'qa # 1'));
    assert.equal(parsed.quick,true);
    assert.throws(()=>visualQA.args(['--out',path.join(root,'qa'),'--chromium']),/--chromium/);
  }finally{
    if(previousChromium===undefined)delete process.env.DF_CHROMIUM_BIN;
    else process.env.DF_CHROMIUM_BIN=previousChromium;
  }
  const specialPath=path.join(root,'preview # 1.html');
  const specialUrl=visualQA.localFileUrl(specialPath);
  assert.equal(fileURLToPath(specialUrl),specialPath);
  assert.ok(specialUrl.includes('%20')&&specialUrl.includes('%23'),'Local QA file URLs must encode spaces and #');
  const visualSource=fs.readFileSync(path.join(__dirname,'../bin/visual-qa.cjs'),'utf8');
  assert.ok(!/screenshot\(\s*['"]file:\/\//.test(visualSource),
    'Every Visual QA screenshot URL must be built with pathToFileURL');
  const quickMatrix=visualQA.expectedFiles(true),fullMatrix=visualQA.expectedFiles(false);
  assert.equal(quickMatrix.length,30,'Quick visual evidence must cover 30 screenshots');
  assert.equal(new Set(quickMatrix).size,30,'Quick matrix paths must be unique');
  assert.equal(fullMatrix.length,54,'Full visual evidence must cover 54 screenshots');
  assert.equal(new Set(fullMatrix).size,54,'Full matrix paths must be unique');
  assert.ok(fullMatrix.includes('screenshots/sector-saas-en-services-mobile.png'),
    'Full matrix must include English internal-page mobile captures');
  assert.equal(visualQA.assessMatrix(fullMatrix,fullMatrix.map(file=>({file,viewportMatch:true}))).complete,true);
  const missingMatrix=visualQA.assessMatrix(fullMatrix,fullMatrix.slice(1).map(file=>({file,viewportMatch:true})));
  assert.equal(missingMatrix.complete,false);assert.equal(missingMatrix.missing.length,1);
  const duplicateMatrix=visualQA.assessMatrix(fullMatrix,[...fullMatrix.map(file=>({file,viewportMatch:true})),
    {file:fullMatrix[0],viewportMatch:true}]);
  assert.equal(duplicateMatrix.complete,false);assert.equal(duplicateMatrix.duplicates,1);
  const wrongDimensions=visualQA.assessMatrix(fullMatrix,fullMatrix.map((file,i)=>({file,viewportMatch:i!==0})));
  assert.equal(wrongDimensions.complete,false);assert.equal(wrongDimensions.dimensionMismatches,1);
  const guardedOutput=path.join(repository,'df-visual-qa-guard-'+process.pid);
  try{
    assert.throws(()=>visualQA.run({output:guardedOutput,bin:'/bin/false',quick:true}),/outside repository/);
    assert.equal(fs.existsSync(guardedOutput),false,'Visual QA must refuse to create output in the repository');
  }finally{fs.rmSync(guardedOutput,{recursive:true,force:true});}
  const auditCli=path.join(__dirname,'../bin/release-audit.cjs');
  const auditOutput=path.join(repository,'df-audit-guard-'+process.pid+'.json');
  try{
    const audit=cp.spawnSync(process.execPath,[auditCli,'--out',auditOutput],{encoding:'utf8',timeout:10000});
    assert.notEqual(audit.status,0,'Release audit must refuse report paths inside the repository');
    assert.match(audit.stderr,/outside repository/);
    assert.equal(fs.existsSync(auditOutput),false);
  }finally{fs.rmSync(auditOutput,{force:true});}
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
      assert.equal(result.checklist.factsComplete,false);
      assert.equal(result.checklist.ownerReviewConfirmed,false);
      assert.equal(result.checklist.indexing,'noindex');
      assert.ok(result.site.pages.every(page=>page.seo.robots==='noindex'));
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
  const serviceSection=compiled.site.pages.flatMap(p=>p.sections).find(s=>s.component==='service-grid');
  assert.equal(serviceSection.items.length,2);
  assert.equal(serviceSection.items[0].values['content.title'],'Одна реальная услуга');
  assert.match(serviceSection.items[1].values['content.title'],/Пример \(подтвердить\):/);
  assert.ok(compiled.checklist.missing.includes('facts.services'));
  assert.equal(compiled.checklist.readyForPublish,false);
  // Studio's default service rows are draft prompts, never verified owner facts.
  const completeBase={
    title:'Demo owner',headline:'Real owner headline',description:'Verified owner description',
    contactText:'Contact the owner for confirmed contact details'
  };
  for(const services of [
    [{title:'Уточните название',description:'Добавьте подтверждённое описание.'},
     {title:'Уточните название',description:'Добавьте подтверждённое описание.'}],
    [{title:'Actual service',description:'Confirmed service description'},
     {title:'Example (verify): draft',description:'Confirmed service description'}],
    [{title:'Actual service',description:'Confirmed service description'},
     {title:'Second service',description:''}]
  ]){
    const draft=compile(project('agency','editorial','en',{...completeBase,services}),registry);
    assert.ok(draft.checklist.missing.includes('facts.services'));
    assert.equal(draft.checklist.readyForPublish,false);
  }
  const realTwo=compile(project('agency','editorial','en',{...completeBase,services:[
    {title:'Service one',description:'Owner confirmed service one'},
    {title:'Service two',description:'Owner confirmed service two'}
  ]}),registry);
  assert.ok(!realTwo.checklist.missing.includes('facts.services'));
  assert.equal(realTwo.checklist.factsComplete,true);
  assert.equal(realTwo.checklist.ownerReviewConfirmed,false);
  assert.equal(realTwo.checklist.readyForPublish,false);
  assert.equal(realTwo.checklist.requiresOwnerReview,true);
  assert.equal(realTwo.checklist.indexing,'noindex');
  assert.ok(realTwo.site.pages.every(page=>page.seo.robots==='noindex'));
  const approvedProject={...project('agency','editorial','en',{...completeBase,services:[
    {title:'Service one',description:'Owner confirmed service one'},
    {title:'Service two',description:'Owner confirmed service two'}
  ]}),version:2,ownerReviewConfirmed:true};
  const approved=compile(approvedProject,registry);
  assert.equal(approved.checklist.factsComplete,true);
  assert.equal(approved.checklist.readyForPublish,true);
  assert.equal(approved.checklist.requiresOwnerReview,false);
  assert.equal(approved.checklist.indexing,'index');
  assert.ok(approved.site.pages.every(page=>page.seo.robots==='index'));
  assert.equal(approved.inspection.indexable,4);
  // Real owner contact facts must appear in the generated HTML contact section.
  const verifiedContactPage=approved.site.pages.find(p=>p.path==='/contact/');
  const verifiedContactHtml=require('../lib/preview.cjs').pageHtml(
    approved.site,verifiedContactPage,'editorial','en');
  const contactCard=verifiedContactHtml.match(/<section[^>]*class="section contact"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(contactCard&&contactCard.includes('Contact the owner for confirmed contact details'));
  assert.ok(!/<a\b/.test(contactCard),'Contact panel must not link back to itself');
  const draftContactSite=compile(project('agency','editorial','en'),registry);
  const draftContactPage=draftContactSite.site.pages.find(p=>p.path==='/contact/');
  const draftContactHtml=require('../lib/preview.cjs').pageHtml(
    draftContactSite.site,draftContactPage,'editorial','en');
  assert.ok(draftContactHtml.includes('Add verified contact information before publication.'));
  assert.throws(()=>compile({...approvedProject,facts:{title:'Incomplete'}},registry),/Owner review requires all required facts/);
  assert.throws(()=>compile({...approvedProject,ownerReviewConfirmed:'yes'},registry),/Invalid owner review confirmation/);
  assert.equal(migrate(approvedProject).ownerReviewConfirmed,true);
  const migrated=migrate(project('agency','editorial','en'));
  assert.deepEqual(migrated,{...project('agency','editorial','en'),version:2,ownerReviewConfirmed:false});
  assert.deepEqual(migrate(migrated),migrated);
  const legacyFormat=migrate({...project('agency','editorial','en'),format:'manufact-design-factory-v1',version:1});
  assert.equal(legacyFormat.format,FORMAT);
  assert.equal(legacyFormat.version,2);
  assert.equal(legacyFormat.ownerReviewConfirmed,false);
  const legacyZero=migrate({...project('agency','editorial','en'),format:'manufact-design-factory-v1',version:0});
  assert.equal(legacyZero.format,FORMAT);
  assert.equal(legacyZero.version,2);
  assert.equal(migrate({...project('agency','editorial','en'),version:0}).version,2);
  assert.equal(migrate({...project('agency','editorial','en'),version:0}).ownerReviewConfirmed,false);
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
  for(const name of ['generated-agency-site-v1.json','generated-consulting-site-v1.json','generated-industrial-site-v1.json']){
    const example=JSON.parse(fs.readFileSync(path.join(__dirname,'../examples',name),'utf8'));
    assert.ok(example.pages.every(page=>page.seo.robots==='noindex'),name+' must remain non-indexable until explicit owner review');
  }
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
