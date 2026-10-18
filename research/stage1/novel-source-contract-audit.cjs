/* Stage 1 research ONLY. Independent-from-manifest source inventory for a
 * newly authored uninstrumented site. NOT blinded second-model generation,
 * universal CSS/JS analysis or product CMS acceptance. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'fixtures/cedar-lab-standalone.html'),'utf8');
const key=(id,prop)=>id+'::'+prop;
const textTags=new Set(['h1','h2','h3','p','summary','a','button','label','span','small']);
const supported=new Set(['text','fragment','boolean','color']);
const reviewerOracle=[
 key('hero-title','content.text'),key('hero-cta','behavior.href'),
 key('hero-image','media.alt'),key('hero-mobile','media.srcset'),
 key('newsletter-form','behavior.action'),key('newsletter-email','content.placeholder'),
 key('faq-first','behavior.open'),key('weather-icon','media.svg'),
 key('document','seo.description'),key('document','seo.canonical'),
 key('hero','style.gradient'),key('field-notes','layout.grid'),
 key('hero-title','style.responsiveFontSize'),key('document','behavior.script')];
const candidate=[
 ['hero-title','content.text','text'],['hero-deck','content.text','text'],
 ['hero-cta','behavior.href','fragment'],['soil-title','content.text','text'],
 ['wind-title','content.text','text'],['faq-first','behavior.open','boolean'],
 ['newsletter-title','content.text','text'],['newsletter-submit','content.text','text'],
 ['hero-image','media.alt','text'],['hero','style.gradient','gradient'],
 ['document','seo.description','text'],['document','seo.title','text']
].map(([id,prop,type])=>({id,prop,type}));
let parse;
function discover(html){
 const errors=[],doc=parse(html,{sourceCodeLocationInfo:true,onParseError:e=>errors.push(e.code)});
 const fields=new Map(),ids=new Map(),unkeyed=[],risks=[];
 const add=(id,p,t)=>{if(id)fields.set(key(id,p),t);};
 const attrs=n=>Object.fromEntries((n.attrs||[]).map(a=>[a.name,a.value]));
 function walk(n){
  if(n.tagName){
   const t=n.tagName,a=attrs(n),id=a.id;
   if(id)ids.set(id,(ids.get(id)||0)+1);
   for(const [k,v] of Object.entries(a)){
    if(/^on[a-z]+$/i.test(k))risks.push('inline-event');
    if(['href','src','srcset','action','poster'].includes(k)&&
      /(?:javascript:|data:text\/html|https?:\/\/evil\.invalid)/i.test(v))risks.push('unsafe-url');
   }
   const text=(n.childNodes||[]).filter(c=>c.nodeName==='#text').map(c=>c.value).join('').trim();
   const children=(n.childNodes||[]).filter(c=>c.tagName).length;
   if(text&&!children&&textTags.has(t)){if(id)add(id,'content.text','text');else unkeyed.push(t);}
   if(t==='title'&&text)add('document','seo.title','text');
   if(t==='a'&&a.href)add(id,'behavior.href',a.href.startsWith('#')?'fragment':'url');
   if(t==='img'){
    if(a.src)add(id,'media.src','media');
    if('alt'in a)add(id,'media.alt','text');else risks.push('missing-image-alt');
   }
   if(t==='source'){
    if(a.srcset)add(id,'media.srcset','media');
    if(a.src)add(id,'media.src','media');
   }
   if(t==='video'){
    if(a.poster)add(id,'media.poster','media');
    if('controls'in a)add(id,'behavior.controls','boolean');
   }
   if(t==='svg')add(id,'media.svg','svg');
   if(t==='form'){
    if(a.action)add(id,'behavior.action','form-action');
    if(a.method)add(id,'behavior.method','enum');
   }
   if(t==='input'){
    if('placeholder'in a)add(id,'content.placeholder','text');
    if('required'in a)add(id,'behavior.required','boolean');
   }
   if(t==='details'||t==='dialog')add(id,'behavior.open','boolean');
   if(t==='button'){
    if(a.type)add(id,'behavior.type','enum');
    if('aria-expanded'in a)add(id,'behavior.ariaExpanded','boolean');
   }
   if(t==='meta'&&a.name==='description')add('document','seo.description','text');
   if(t==='link'&&a.rel==='canonical')add('document','seo.canonical','url');
  }
  for(const c of n.childNodes||[])walk(c);
 }
 walk(doc);
 const collect=(t)=>{const out=[];function run(n){
  if(n.tagName===t)out.push((n.childNodes||[]).filter(x=>x.nodeName==='#text').map(x=>x.value).join(''));
  for(const c of n.childNodes||[])run(c);
 }run(doc);return out.join('\n');};
 const css=collect('style'),js=collect('script');
 // Heuristic flags only. Missing CSS patterns cannot prove absence of use.
 if(/#hero\s*\{[^}]*linear-gradient\(/s.test(css))add('hero','style.gradient','gradient');
 if(/\.cards\s*\{[^}]*display\s*:\s*grid/s.test(css))add('field-notes','layout.grid','layout');
 if(/#hero-title\s*\{[^}]*font-size\s*:/s.test(css))add('hero-title','style.responsiveFontSize','responsive-number');
 if(/--[a-z-]+\s*:/.test(css))add('document','style.tokens','tokens');
 if(/@keyframes/.test(css))add('document','style.keyframes','animation');
 if(js.trim()){
  add('document','behavior.script','script');
  if(/addEventListener\s*\(/.test(js))add('document','behavior.events','script');
  if(/\bfetch\s*\(/.test(js))add('document','behavior.network','network');
 }
 if(!/<html\b[^>]*lang="[a-z]{2}"/i.test(html))risks.push('missing-lang');
 if(!/<\/html>\s*$/i.test(html))risks.push('missing-html-closure');
 return {fields,ids,errors,unkeyed,risks,duplicates:[...ids].filter(([,n])=>n>1).map(([id])=>id)};
}
function audit(html,manifest,oracle=reviewerOracle){
 const s=discover(html),declared=new Map(),bad=[];
 for(const f of manifest){
  if(!f||typeof f.id!=='string'||typeof f.prop!=='string'||typeof f.type!=='string'){bad.push('invalid-item');continue;}
  const k=key(f.id,f.prop);
  if(declared.has(k))bad.push('duplicate:'+k);
  declared.set(k,f.type);
  if(!s.fields.has(k))bad.push('orphan:'+k);
  else if(s.fields.get(k)!==f.type)bad.push('type:'+k);
  if(f.id!=='document'&&!s.ids.has(f.id))bad.push('orphan-id:'+k);
 }
 const missing=[...s.fields].filter(([k])=>!declared.has(k)).map(([k])=>k);
 const unsupported=[...s.fields].filter(([,t])=>!supported.has(t)).map(([k])=>k);
 const expectedMissing=oracle.filter(k=>!s.fields.has(k)||!declared.has(k));
 const publishable=!s.errors.length&&!s.unkeyed.length&&!s.risks.length&&!s.duplicates.length&&
   !bad.length&&!missing.length&&!unsupported.length&&!expectedMissing.length;
 return {publishable,found:s.fields.size,missing,unsupported,expectedMissing,
  errors:s.errors,unkeyed:s.unkeyed,risks:s.risks,duplicates:s.duplicates,bad};
}
(async()=>{
 parse=(await import('parse5')).parse;
 const baseline=audit(source,candidate);
 assert.equal(baseline.publishable,false);
 assert.ok(baseline.found>=30,'too few extracted fields: '+baseline.found);
 assert.ok(baseline.missing.length>=15,'missing contract not reported');
 assert.ok(baseline.unsupported.length>=10,'unsupported media/behavior not reported');
 assert.ok(baseline.expectedMissing.length>=5);
 assert.equal(baseline.unkeyed.length,1);
 const full=[...discover(source).fields].map(([k,type])=>({id:k.split('::')[0],prop:k.split('::')[1],type}));
 const complete=audit(source,full);
 assert.equal(complete.missing.length,0);
 assert.equal(complete.expectedMissing.length,0);
 assert.equal(complete.publishable,false,'unknown executable media and script must remain quarantined');
 let negatives=0,correlated=0;
 function detect(name,html,fields,predicate){
  const x=audit(html,fields);assert.equal(x.publishable,false,name+' unexpectedly publishable');
  assert.ok(predicate(x),name+' did not raise the required diagnostic');negatives++;
 }
 detect('duplicate id',source.replace('id="wind-title"','id="soil-title"'),full,x=>x.duplicates.includes('soil-title'));
 detect('inline event',source.replace('id="hero-image"','id="hero-image" onerror="alert(1)"'),full,x=>x.risks.includes('inline-event'));
 detect('script href',source.replace('href="#field-notes"','href="javascript:alert(1)"'),full,x=>x.risks.includes('unsafe-url'));
 detect('missing alt',source.replace('alt="Cedar grove at morning light"',''),full,x=>x.risks.includes('missing-image-alt'));
 detect('lang',source.replace('<html lang="en">','<html>'),full,x=>x.risks.includes('missing-lang'));
 detect('truncated html',source.replace('</html>',''),full,x=>x.risks.includes('missing-html-closure'));
 detect('rename',source.replace('id="hero-title"','id="new-hero-title"'),full,x=>x.expectedMissing.includes(key('hero-title','content.text')));
 detect('correlated omission title',source.replace('<h1 id="hero-title">Signals in the forest.</h1>',''),
  full.filter(f=>f.id!=='hero-title'),x=>x.expectedMissing.includes(key('hero-title','content.text')));correlated++;
 detect('correlated omission form',
  source.replace(/<form id="newsletter-form"[\s\S]*?<\/form>/,'<p id="form-placeholder">Coming soon</p>'),
  full.filter(f=>!['newsletter-form','newsletter-email','newsletter-submit'].includes(f.id)),
  x=>x.expectedMissing.includes(key('newsletter-form','behavior.action')));correlated++;
 assert.ok(audit(source,[...full,full[0]]).bad.some(x=>x.startsWith('duplicate:')));negatives++;
 assert.ok(audit(source,full.map(x=>x.id==='hero-title'&&x.prop==='content.text'?{...x,type:'boolean'}:x)).bad.some(x=>x.startsWith('type:')));negatives++;
 assert.ok(audit(source,[...full,{id:'ghost',prop:'content.text',type:'text'}]).bad.some(x=>x.startsWith('orphan:')));negatives++;
 // Explicit epistemic limit: no analyzer can infer a component absent from
 // source, manifest, AND the separate reviewer oracle.
 console.log('STAGE1_NOVEL_SITE_COVERAGE='+JSON.stringify({pass:true,
  fixture:'cedar-lab-standalone.html',blindedSecondModel:false,
  extractedFields:baseline.found,declaredFields:candidate.length,
  missingFields:baseline.missing.length,unsupportedFields:baseline.unsupported.length,
  expectedMissingAgainstOracle:baseline.expectedMissing.length,unkeyedText:baseline.unkeyed.length,
  negativeMutationCases:negatives,correlatedOmissionsCaught:correlated,
  sourceJSNeverExecuted:true,completedManifestStillBlocked:true,
  limitations:'new researcher-authored fixture, NOT second LLM; manually specified reviewer oracle; heuristic CSS/JS coverage; jointly absent item also absent from oracle is undetectable, no production CMS'}));
})().catch(e=>{console.error('STAGE1_NOVEL_SITE_COVERAGE_FAIL='+String(e.stack||e));process.exitCode=1});
