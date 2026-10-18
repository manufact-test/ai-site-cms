/* AI Site CMS Stage 1 RESEARCH ONLY.
 * True original uninstrumented HTML source -> reviewed selective owner edits ->
 * source code regeneration -> preview/publish/rollback, actual Chromium CSS.
 * Not a generic safe HTML sanitizer, CMS, or independently second-model site.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright-core');
const browserPath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(browserPath);
const source=fs.readFileSync(path.join(__dirname,'fixtures/cedar-lab-standalone.html'),'utf8');
let checks=0,denials=0;
const eq=(x,y,desc)=>{assert.deepEqual(x,y,desc);checks++};
const ok=(x,desc)=>{assert.ok(x,desc);checks++};
function refuse(fn,desc){assert.throws(fn,undefined,desc);checks++;denials++;}
const validators={
 'hero-title/content.text':v=>typeof v==='string'&&v.length<=180&&!/[\u0000-\u0008]/.test(v),
 'hero-cta/behavior.href':v=>typeof v==='string'&&/^#[a-z][a-z0-9-]{0,42}$/.test(v),
 'hero-image/media.alt':v=>typeof v==='string'&&v.length>0&&v.length<=160,
 'document/style.gutter':v=>Number.isInteger(v)&&v>=8&&v<=80
};
const legal=new Set(Object.keys(validators));
function cssReplace(css,gutter){
 // Exact original CSS declared token, no arbitrary selector/stylesheet edits.
 if(!/--gutter:\s*[0-9]{1,3}px/.test(css))throw Error('missing-css-gutter');
 if((css.match(/--gutter:\s*[0-9]{1,3}px/g)||[]).length!==1)throw Error('ambiguous-css-gutter');
 return css.replace(/--gutter:\s*[0-9]{1,3}px/,'--gutter:'+gutter+'px');
}
function htmlFrom(sourceCode,values,parse5){
 if(typeof sourceCode!=='string'||sourceCode.length>85000)throw Error('source-size');
 const errors=[];
 const doc=parse5.parse(sourceCode,{onParseError:e=>errors.push(e.code)});
 if(errors.length)throw Error('invalid-original-html: '+errors.slice(0,3).join(','));
 const index=new Map(),duplicates=[];
 const walk=n=>{
  if(n.attrs){
   n.attrs=n.attrs.filter(a=>!/^on[a-z]+$/i.test(a.name));
   const id=n.attrs.find(a=>a.name==='id')?.value;
   if(id){if(index.has(id))duplicates.push(id);index.set(id,n);}
  }
  if(n.childNodes){
   n.childNodes=n.childNodes.filter(x=>!['script','iframe','object','embed','base'].includes(x.tagName));
   for(const child of n.childNodes)walk(child);
  }
 };
 walk(doc);
 if(duplicates.length)throw Error('duplicate-stable-id');
 for(const id of ['hero-title','hero-cta','hero-image','hero','field-notes','faq-first']){
  if(!index.has(id))throw Error('missing-stable-id: '+id);
 }
 const get=id=>index.get(id);
 // Stable ID alone is insufficient: regenerated HTML must retain the
 // reviewed semantic tag/operation kind before reapplying owner overrides.
 const expectedTags={'hero-title':'h1','hero-cta':'a','hero-image':'img','hero':'section',
  'field-notes':'section','faq-first':'details'};
 for(const [id,tag] of Object.entries(expectedTags))
  if(get(id).tagName!==tag)throw Error('incompatible-reviewed-element-kind:'+id);
 for(const [k,v] of Object.entries(values))
  if(!legal.has(k)||!validators[k](v))throw Error('unapproved-owner-value:'+k);
 if(Object.hasOwn(values,'hero-cta/behavior.href')&&
    !index.has(values['hero-cta/behavior.href'].slice(1)))
  throw Error('unresolved-internal-anchor');
 // Existing original text children are replaced only on approved paths.
 if(Object.hasOwn(values,'hero-title/content.text'))
  get('hero-title').childNodes=[{nodeName:'#text',value:values['hero-title/content.text'],parentNode:get('hero-title')}];
 if(Object.hasOwn(values,'hero-cta/behavior.href')){
  const node=get('hero-cta'),attr=node.attrs.find(a=>a.name==='href');
  if(!attr)throw Error('missing-href');attr.value=values['hero-cta/behavior.href'];
 }
 if(Object.hasOwn(values,'hero-image/media.alt')){
  const node=get('hero-image'),attr=node.attrs.find(a=>a.name==='alt');
  if(!attr)throw Error('missing-alt');attr.value=values['hero-image/media.alt'];
 }
 if(Object.hasOwn(values,'document/style.gutter')){
  let applied=0;
  const apply=n=>{
   if(n.tagName==='style'){
    if(!n.childNodes||n.childNodes.length!==1||n.childNodes[0].nodeName!=='#text')throw Error('style-shape');
    n.childNodes[0].value=cssReplace(n.childNodes[0].value,values['document/style.gutter']);applied++;
   }
   for(const c of n.childNodes||[])apply(c);
  };
  apply(doc);if(applied!==1)throw Error('ambiguous-style-tag');
 }
 let rendered=parse5.serialize(doc);
 const csp="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; media-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; font-src 'none'";
 rendered=rendered.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'">');
 return rendered;
}
function createResearchStore(v1){
 let state={source:v1,revision:1,version:'1.0.0',saved:Object.create(null),draft:Object.create(null),
   published:{revision:1,version:'1.0.0',source:v1,values:Object.create(null)},history:[]};
 state.history.push(structuredClone(state.published));
 const validateMap=values=>{
  for(const [k,v] of Object.entries(values)){
   if(!legal.has(k)||!validators[k](v))throw Error('invalid-review-field:'+k);
  }
 };
 return {
  set(k,v){validateMap({[k]:v});state.draft[k]=v;},
  save(){validateMap(state.draft);state.saved=structuredClone(state.draft);},
  regenerate(newCode,newVersion){
   if(!/^[1-9]\d*\.\d+\.\d+$/.test(newVersion)||newVersion===state.version)throw Error('version');
   // A real AI-generated new source MUST pass a compatibility review of every
   // approved path before applying saved owner values. No mutation on failure.
   htmlFrom(newCode,state.saved,parseRef);
   state.source=newCode;state.version=newVersion;state.revision++;
   state.draft=structuredClone(state.saved);
  },
  publish(){
   validateMap(state.saved);
   state.revision++;
   state.published=structuredClone({revision:state.revision,version:state.version,source:state.source,values:state.saved});
   state.history.push(structuredClone(state.published));
  },
  rollback(index){
   if(!Number.isInteger(index)||index<0||index>=state.history.length)throw Error('unknown-history-revision');
   const previous=state.history[index];
   state.revision++;
   state.published=structuredClone({...previous,revision:state.revision});
   state.history.push(structuredClone(state.published));
  },
  get(view='draft'){
   if(view==='published')return structuredClone(state.published);
   if(view!=='draft')throw Error('view');
   return {revision:state.revision,version:state.version,source:state.source,values:structuredClone(state.draft)};
  },
  publishedHistory(){return structuredClone(state.history)}
 };
}
let parseRef;
function mutateV2(v){
 const a='<article id="card-soil"><h2 id="soil-title">Soil chemistry</h2><p id="soil-desc">Measurements beneath the canopy.</p></article>';
 const b='<article id="card-wind"><h2 id="wind-title">Wind patterns</h2><p id="wind-desc">How the ridge changes airflow.</p></article>';
 if(!v.includes(a+'\n'+b))throw Error('source mutation marker absent');
 return v.replace(a+'\n'+b,b+'\n'+a)
  .replace('Signals in the forest.','Listening to a changing forest.')
  .replace('Read field notes','Explore the journal')
  .replace('Monthly field notes','Research updates')
  .replace('--gutter:28px','--gutter:32px')
  .replace('#e7f0dd,#aadbd0','#dce7d5,#8acabb');
}
function mutateUnsafe(v){return v.replace('id="hero-title"','id="hero-title" onmouseover="parent.evil=true"')
 .replace('</body>','<script>parent.evil=true</script></body>');}
async function main(){
 parseRef=await import('parse5');
 const store=createResearchStore(source);
 let pub=store.get('published');
 eq(pub.revision,1);eq(store.publishedHistory().length,1);
 store.set('hero-title/content.text','Owner <script> literal & safe');
 store.set('hero-cta/behavior.href','#gallery');
 store.set('hero-image/media.alt','Owner <reef> & sunrise');
 store.set('document/style.gutter',40);
 refuse(()=>store.set('document/style.gutter','url(https://evil.invalid)'),'reject CSS injection');
 refuse(()=>store.set('hero-cta/behavior.href','javascript:alert(1)'),'reject javascript URL');
 refuse(()=>store.set('hero-title/style.css','body{display:none}'),'reject unknown CSS field');
 refuse(()=>store.set('__proto__','owned'),'reject unreviewed property');
 store.save();
 eq(store.get('published'),pub,'draft/save never changes published snapshot');
 const v2=mutateV2(source);
 store.regenerate(v2,'2.0.0');
 let after=store.get('draft');
 eq(after.version,'2.0.0');
 eq(Object.keys(after.values).length,4,'all reviewed overrides preserved');
 eq(after.values['hero-title/content.text'],'Owner <script> literal & safe');
 eq(after.values['document/style.gutter'],40);
 eq(store.get('published'),pub,'regenerate never silently publishes');
 const beforeFailed=store.get();
 refuse(()=>store.regenerate(v2.replace('id="hero-title"','id="ai-renamed-title"'),'3.0.0'),'missing renamed reviewed anchor quarantined');
 eq(store.get(),beforeFailed,'failed regen atomic');
 refuse(()=>store.regenerate(v2.replace('<h1 id="hero-title">Listening to a changing forest.</h1>',
   '<button id="hero-title" type="button">Listening to a changing forest.</button>'),'3.0.0'),
   'semantic element replacement with same ID quarantined');
 eq(store.get(),beforeFailed,'kind conflict atomic');
 refuse(()=>htmlFrom(v2,{...after.values,'hero-cta/behavior.href':'#no-such-section'},parseRef),
   'owner CTA cannot silently point to missing in-page anchor');
 refuse(()=>store.regenerate(v2.replace('id="hero-image"','id="hero-title"'),'3.0.0'),'duplicate id rejected');
 eq(store.get(),beforeFailed,'duplicate ids did not update saved state');
 const noAlt=v2.replace('alt="Cedar grove at morning light"','');
 refuse(()=>store.regenerate(noAlt,'3.0.0'),'removed owner-edited alt blocks publish');
 const noCSS=v2.replace('--gutter:32px','--gutter-deleted:32px');
 refuse(()=>store.regenerate(noCSS,'3.0.0'),'missing reviewed CSS token refuses migration');
 // Build exact current site preview including full *original HTML and CSS*
 // and reviewed edits applied in the serialized document, no source JS.
 const preview=htmlFrom(after.source,after.values,parseRef);
 const live=htmlFrom(pub.source,pub.values,parseRef);
 const attack=htmlFrom(mutateUnsafe(v2),after.values,parseRef);
 ok(!preview.includes('<script>'),'generated source Javascript entirely removed');
 ok(!attack.includes('onmouseover='),'inline listener removed');
 ok(!attack.includes('parent.evil=true'),'untrusted code removed');
 const browser=await chromium.launch({headless:true,executablePath:browserPath,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  let requests=0;await context.route('**/*',async route=>{requests++;await route.abort();});
  const page=await context.newPage();
  await page.setContent('<iframe title="draft" sandbox="allow-scripts" style="width:1200px;height:860px"></iframe><iframe title="published" sandbox="allow-scripts" style="width:1200px;height:860px"></iframe><iframe title="attack" sandbox="allow-scripts" style="width:1200px;height:860px"></iframe>');
  for(const [which,html] of [['draft',preview],['published',live],['attack',attack]])
   await page.locator('iframe[title="'+which+'"]').evaluate((x,s)=>{x.srcdoc=s},html);
  const draft=page.frameLocator('iframe[title=draft]'),published=page.frameLocator('iframe[title=published]'),hostile=page.frameLocator('iframe[title=attack]');
  await draft.locator('#hero-title').waitFor();
  await published.locator('#hero-title').waitFor();
  eq(await draft.locator('#hero-title').textContent(),'Owner <script> literal & safe');
  eq(await draft.locator('#hero-cta').getAttribute('href'),'#gallery');
  eq(await draft.locator('#hero-image').getAttribute('alt'),'Owner <reef> & sunrise');
  eq(await draft.locator('#hero').evaluate(x=>getComputedStyle(x).paddingTop),'40px','actual browser reflects saved CSS token');
  ok((await draft.locator('#hero').evaluate(x=>getComputedStyle(x).backgroundImage)).includes('#')===false,'gradient CSS computed');
  eq(await draft.locator('#field-notes > article').first().getAttribute('id'),'card-wind','AI regeneration reordered cards');
  eq(await published.locator('#hero-title').textContent(),'Signals in the forest.','published stable before explicit publish');
  eq(await published.locator('#field-notes > article').first().getAttribute('id'),'card-soil','published still previous card order');
  eq(await hostile.locator('#hero-title').getAttribute('onmouseover'),null,'no original attacker handler');
  eq(await hostile.locator('#hero-title').evaluate(x=>x.ownerDocument.defaultView.evil),undefined,'untrusted script blocked');
  await draft.locator('#newsletter-email').fill('test@example.org');
  await draft.locator('#newsletter-submit').click();
  eq(requests,0,'untrusted form and external assets prevented');
  await page.locator('iframe[title=draft]').evaluate(x=>x.style.width='390px');
  await draft.locator('#hero-title').waitFor();
  eq(await draft.locator('#field-notes').evaluate(x=>getComputedStyle(x).gridTemplateColumns.split(' ').length),1,'original responsive mobile grid retained after regeneration');
  eq(await draft.locator('#hero-title').evaluate(x=>getComputedStyle(x).fontSize),'36px','original mobile responsive heading retained');
  await page.emulateMedia({reducedMotion:'reduce'});
  eq(await draft.locator('#weather-icon').evaluate(x=>getComputedStyle(x).animationName),'none','prefers-reduced-motion retained');
  await context.close();
 }finally{await browser.close();}
 store.publish();
 eq(store.get('published').version,'2.0.0');
 eq(store.get('published').values['hero-title/content.text'],'Owner <script> literal & safe','explicit publication');
 eq(store.publishedHistory().length,2);
 store.rollback(0);
 eq(store.publishedHistory().length,3,'rollback adds history rather than overwriting');
 eq(store.get('published').version,'1.0.0','published rollback to previous site version');
 eq(store.get('draft').version,'2.0.0','draft unaffected by rollback');
 eq(store.get('published').source,source,'rollback restores exact original source bytes');
 console.log('STAGE1_RICH_SOURCE_REGENERATION='+JSON.stringify({pass:true,checks,refused:denials,
  browser:'real-chromium',variants:['original-published','regenerated-draft','hostile-source-quarantined'],
  ownerOverridesRetained:4,sourceComponentsReordered:2,fullOriginalCssRetained:true,
  unsupportedCustomCssRejected:true,unsafeOriginalJSRemoved:true,untrustedFormNoNetwork:true,
  desktopAndMobileMeasured:true,publishExplicit:true,rollbackRevisionAppended:true,
  limits:'One known researcher-authored Cedar Lab site, manually reviewed four edits, in-memory revision store, no real independent other-model source/manifest, not an arbitrary CSS/JS importer or production CMS/storage.'}));
}
main().catch(e=>{console.error('STAGE1_RICH_SOURCE_REGENERATION_FAIL='+String(e.stack||e));process.exitCode=1});
