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
let projects=0,pages=0,archives=0,feedbackChecks=0,adapted=0,blocked=0;
const hostile='<script>alert("owner HTML must be text")</script> & multilingual 🌍';
for(const kit of kits)for(const theme of themes)for(const language of languages){
 const project={format:api.compiler.FORMAT,version:2,kit,theme,language,
  ownerReviewConfirmed:true,facts};
 const compiled=api.compiler.compile(project);
 assert.equal(compiled.site.pages.length,4);
 assert.equal(compiled.checklist.readyForPublish,true);
 // 288 corresponding owner-unapproved variants must fail the publication gate.
 // The static HTML demo remains noindex regardless of approval.
 const unapproved=api.compiler.compile({...project,ownerReviewConfirmed:false});
 assert.equal(unapproved.checklist.readyForPublish,false,
  'The same content must not become publishable without explicit owner review');
 assert.ok(unapproved.site.pages.every(page=>page.seo.robots==='noindex'),
  'An unapproved CMS site must not be indexable');
 assert.ok(compiled.site.pages.every(page=>page.seo.robots==='index'),
  'Approved owner facts must remain exportable under the CMS contract');
 blocked++;
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
 const changed=api.compiler.compile({...project,
  facts:{...facts,headline:facts.headline+' independently revised'}});
 assert.notEqual(feedback.context(changed,project,null),token,
  'A changed website needs a new client-feedback correlation');
 assert.throws(()=>feedback.validate(report,feedback.context(changed,project,null)),
  /different site snapshot/,'Old client feedback must be rejected after edits');
 feedbackChecks++;
 items.push({name:'assets/preview.css',content:styles[theme]},
  {name:'README.txt',content:'Offline preview only. Not a CMS release.'},
  {name:'preview-info.json',content:JSON.stringify({kit,theme,language,token})},
  {name:'review.html',content:feedback.reviewHtml(token)});
 const bytes=zip.build(items),inspected=zip.inspect(bytes);
 assert.equal(inspected.files,8);assert.equal(inspected.crcVerified,true);
 assert.deepEqual(zip.build(items),bytes,'Preview ZIP must be deterministic');
 // Corrupt the actual content while preserving the central directory.
 // This must never be accepted merely because filenames and lengths match.
 const corrupt=new Uint8Array(bytes);
 const firstNameLength=new DataView(corrupt.buffer).getUint16(26,true);
 corrupt[30+firstNameLength+5]^=1;
 assert.throws(()=>zip.inspect(corrupt),/CRC mismatch/,
  'Tampered ZIP data must fail CRC validation');
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
// Owner-supplied HTML is plain text in all four demos, including non-ASCII.
const hostileProject={format:api.compiler.FORMAT,version:2,
 kit:'agency',theme:'editorial',language:'ru',ownerReviewConfirmed:false,
 facts:{title:hostile,headline:hostile,description:hostile,
  contactText:hostile,services:[
   {title:'Контракт 🌍',description:hostile},
   {title:'Код безопасен',description:'Без внешних запросов'}]}};
const hostileCompiled=api.compiler.compile(hostileProject);
for(const page of hostileCompiled.site.pages){
 const html=api.preview.pageHtml(hostileCompiled.site,page,'editorial','ru');
 assert.ok(!html.includes('<script>alert('),
  'User-provided owner text must not become executable HTML');
 if(html.includes('owner HTML must be text'))
  assert.ok(html.includes('&lt;script&gt;alert('),'HTML special chars must be escaped');
 assert.ok(html.includes('<meta name="robots" content="noindex">'));
}
assert.equal(projects,288);assert.equal(blocked,288);
assert.equal(pages,1152);
assert.equal(archives,288);assert.equal(feedbackChecks,288);assert.equal(adapted,84);
console.log('DESIGN_FACTORY_D7_MATRIX PASS: 288 projects, 1152 offline pages, 288 deterministic CRC-verified ZIPs, 288 feedback exports, 288 blocked publication variants, 288 ZIP tamper rejections and 84 CMS adapter validations (no Chromium/visual approval)');
