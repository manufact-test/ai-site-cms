#!/usr/bin/env node
'use strict';
// Full offline D7 source matrix; NOT Chromium pixels, PHP parity or human QA.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const feedback=require('../studio/client-feedback.js');
const zip=require('../studio/preview-zip.js');
const source=fs.readFileSync(path.join(__dirname,'../studio/runtime.generated.js'),'utf8');
const scope={structuredClone:global.structuredClone};
scope.globalThis=scope;
vm.runInNewContext(source,scope,{timeout:15000});
const api=scope.DesignFactory;
assert.ok(api?.sdk&&api?.compiler&&api?.preview&&api?.adapter);
const kits=Object.keys(api.kits),themes=Object.keys(api.themes),languages=['ru','en'];
assert.equal(kits.length,12);assert.equal(themes.length,12);
const routes={home:'index.html',services:'services/index.html',
 approach:'approach/index.html',contact:'contact/index.html'};
assert.deepEqual([...zip.files],['README.txt','approach/index.html','assets/preview.css',
 'contact/index.html','index.html','preview-info.json','review.html','services/index.html']);
const facts={title:'Confirmed Site',headline:'Owner approved headline',
 description:'Owner confirmed description',contactText:'Confirmed contact details',
 services:[{title:'Alpha',description:'Confirmed alpha'},{title:'Beta',description:'Confirmed beta'}]};
const styles=Object.fromEntries(themes.map(theme=>[theme,api.preview.css(theme)]));
let projects=0,pages=0,archives=0,feedbackChecks=0,adapted=0;
for(const kit of kits)for(const theme of themes)for(const language of languages){
 const project={format:api.compiler.FORMAT,version:2,kit,theme,language,
  ownerReviewConfirmed:true,facts};
 const compiled=api.compiler.compile(project);
 assert.equal(compiled.site.pages.length,4);
 assert.equal(compiled.checklist.readyForPublish,true);
 const items=[];
 for(const page of compiled.site.pages){
  const id=page.id.slice('df-page-'.length),local=routes[id];
  assert.ok(local,'Unknown local HTML route');
  const html=api.preview.pageHtml(compiled.site,page,theme,language);
  const prefix=id==='home'?'':'../';
  assert.ok(html.includes('<html lang="'+language+'">'),'Incorrect locale');
  assert.ok(html.includes('<meta name="robots" content="noindex">'),
   'Even approved owner content must be noindex in offline preview');
  assert.ok(html.includes('href="'+prefix+'assets/preview.css"'),'Broken local CSS');
  for(const target of Object.values(routes))
   assert.ok(html.includes('href="'+prefix+target+'"'),
    'Broken navigation '+kit+'/'+theme+'/'+language+'/'+id+': '+target);
  assert.ok(!html.includes('href="https://')&&!html.includes('href="http://')&&
   !html.includes('src="https://')&&!html.includes('src="http://'),
   'Offline preview references a remote resource');
  items.push({name:local,content:html});pages++;
 }
 const token=feedback.context(compiled,project,null);
 const report=feedback.create(token,'Reviewer',[
  {page:'contact',type:'issue',message:'Verify contact CTA',resolved:false}]);
 assert.equal(feedback.validate(report,token).notes.length,1);
 feedbackChecks++;
 items.push({name:'assets/preview.css',content:styles[theme]},
  {name:'README.txt',content:'Offline preview only. Not a CMS release.'},
  {name:'preview-info.json',content:JSON.stringify({kit,theme,language,token})},
  {name:'review.html',content:feedback.reviewHtml(token)});
 const bytes=zip.build(items),inspected=zip.inspect(bytes);
 assert.equal(inspected.files,8);assert.equal(inspected.crcVerified,true);
 assert.deepEqual(zip.build(items),bytes,'Preview ZIP must be deterministic');
 archives++;projects++;
}
const registry=api.compiler.loadRegistry();
assert.equal(api.compositions.compositions.length,42);
for(const composition of api.compositions.compositions)for(const language of languages){
 const section=api.adapter.sectionFor(composition.id,
  'df-matrix-'+composition.id,language,registry);
 assert.ok(section.component&&section.elements.length,'Missing CMS adapter');
 const draft=api.compiler.compile({format:api.compiler.FORMAT,version:2,
  kit:'agency',theme:'editorial',language,ownerReviewConfirmed:false,facts:{}});
 const site=JSON.parse(JSON.stringify(draft.site));
 site.pages[0].sections[site.pages[0].sections.length-1]=section;
 const validated=api.sdk.validateSite(site,registry);
 assert.equal(validated.pages.length,4);
 assert.equal(api.sdk.inspectSite(validated,registry).errors.length,0);
 adapted++;
}
assert.equal(projects,288);assert.equal(pages,1152);
assert.equal(archives,288);assert.equal(feedbackChecks,288);assert.equal(adapted,84);
console.log('DESIGN_FACTORY_D7_MATRIX PASS: 288 projects, 1152 offline pages, 288 deterministic CRC-verified ZIPs, 288 feedback exports and 84 CMS adapter validations (no Chromium/visual approval)');
