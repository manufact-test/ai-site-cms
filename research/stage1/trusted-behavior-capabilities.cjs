/* AI Site CMS Stage 1 RESEARCH ONLY.
 * A developer-reviewed site-specific capability pack, NOT automatic plugin execution.
 * Safe data fields for link, disclosure, dialog, preview-only form.
 * An original AI-site's script/style is NEVER copied into this projection.
 */
'use strict';
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const Ajv2020=require('ajv/dist/2020.js').default;
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const kinds=Object.freeze({
 text:{type:'string',maxLength:400},
 fragment:{type:'string',pattern:'^#[a-z][a-z0-9-]{0,50}$'},
 toggle:{type:'boolean'}
});
const names=/^[a-z][a-zA-Z0-9]{1,42}$/;
const ids=/^[a-z][a-z0-9-]{0,60}$/;
const approvedTargets=new Map([
 ['linkHref','hero-link|a|href|fragment'],
 ['linkText','hero-link|a|textContent|text'],
 ['faqOpen','faq-first|details|open|toggle'],
 ['dialogEnabled','modal|dialog|enabled|toggle'],
 ['dialogLabel','modal-open|button|textContent|text'],
 ['dialogBody','modal|dialog|textContent|text'],
 ['emailPlaceholder','signup-email|input|placeholder|text'],
 ['subscribeEnabled','signup-form|form|enabled|toggle']
]);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
function registry(){
 const records=new Map(),packs=new Map();
 function register(name,version,descriptions){
  if(typeof name!=='string'||!/^[a-z][a-z0-9-]{2,40}$/.test(name)||packs.has(name))throw Error('pack-name');
  if(typeof version!=='string'||!/^[1-9][0-9]*\.[0-9]+\.[0-9]+$/.test(version))throw Error('pack-version');
  if(!plain(descriptions)||Object.keys(descriptions).length===0||Object.keys(descriptions).length>16)throw Error('pack-fields');
  const staged=[];
  for(const [field,d] of Object.entries(descriptions)){
   if(!names.test(field)||records.has(field)||!plain(d)||Object.keys(d).sort().join(',')!=='default,id,kind,tag,target')throw Error('pack-shape-or-duplicate');
   if(!ids.test(d.id)||!['a','button','details','dialog','input','form'].includes(d.tag)||!Object.prototype.hasOwnProperty.call(kinds,d.kind))throw Error('pack-kind-or-target');
   if(approvedTargets.get(field)!==[d.id,d.tag,d.target,d.kind].join('|'))throw Error('capability-needs-review');
   if(!valueValid(d.kind,d.default))throw Error('bad-capability-default');
   staged.push([field,Object.freeze({...d})]);
  }
  for(const [k,v] of staged)records.set(k,v);
  packs.set(name,version);return true;
 }
 function definitions(){return Object.fromEntries([...records].map(([k,v])=>[k,{...v}]))}
 function schema(){
  const properties={};
  for(const [k,v] of records)properties[k]={...kinds[v.kind]};
  return {$schema:'https://json-schema.org/draft/2020-12/schema',type:'object',additionalProperties:false,required:Object.keys(properties),properties};
 }
 function validate(data){
  if(!plain(data)||Object.keys(data).length!==records.size)throw Error('capability-model-shape');
  for(const [key,d] of records){
   if(!Object.prototype.hasOwnProperty.call(data,key)||!valueValid(d.kind,data[key]))throw Error('invalid-'+key);
  }
  return true;
 }
 function migrate(oldFields,newFields,values,reviewedAliases={}){
  if(!plain(values)||!plain(reviewedAliases))throw Error('migration-shape');
  const before=new Map(Object.entries(oldFields)),after=new Map(Object.entries(newFields));
  const retained={},quarantine=[],dest=new Set();
  for(const [key,value] of Object.entries(values)){
   if(!before.has(key)){quarantine.push([key,'unknown-old']);continue}
   const mapping=reviewedAliases[key],newKey=mapping?.target||key;
   if(mapping&&(!plain(mapping)||mapping.approved!==true)){quarantine.push([key,'unreviewed-alias']);continue}
   if(!after.has(newKey)){quarantine.push([key,'missing-new']);continue}
   const old=before.get(key),newD=after.get(newKey);
   if(old.kind!==newD.kind||old.target!==newD.target){quarantine.push([key,'kind-or-target-changed']);continue}
   if(!valueValid(newD.kind,value)){quarantine.push([key,'invalid-value']);continue}
   if(dest.has(newKey)){quarantine.push([key,'target-collision']);continue}
   dest.add(newKey);retained[newKey]=value;
  }
  return {retained,quarantine,canPublish:quarantine.length===0};
 }
 return {register,definitions,schema,validate,migrate,installed:()=>Object.fromEntries(packs)};
}
function valueValid(kind,v){
 if(kind==='text')return typeof v==='string'&&v.length<=400;
 if(kind==='fragment')return typeof v==='string'&&/^#[a-z][a-z0-9-]{0,50}$/.test(v);
 if(kind==='toggle')return typeof v==='boolean';
 return false;
}
function sourceAndReviewedModel(){
 const source=readFileSync(join(__dirname,'fixtures/tide-atlas-standalone.html'),'utf8');
 const doc=new JSDOM(source,{runScripts:'outside-only'}).window.document;
 function lookup(id,tag){
  const el=doc.getElementById(id);
  if(!el||el.tagName.toLowerCase()!==tag||doc.querySelectorAll('[id="'+id+'"]').length!==1)throw Error('unapproved-source-element '+id);
  return el;
 }
 const link=lookup('hero-link','a'),faq=lookup('faq-first','details'),modal=lookup('modal','dialog');
 const opener=lookup('modal-open','button'),email=lookup('signup-email','input'),form=lookup('signup-form','form');
 if(!form.contains(email)||email.type!=='email'||link.getAttribute('href')?.startsWith('#')!==true)throw Error('source-binding-unexpected');
 const defaults={
  linkHref:link.getAttribute('href'),linkText:link.textContent.trim(),
  faqOpen:faq.open,dialogEnabled:true,dialogLabel:opener.textContent.trim(),
  dialogBody:modal.querySelector('p').textContent.trim(),
  emailPlaceholder:email.getAttribute('placeholder')||'',subscribeEnabled:true
 };
 const specs={
  linkHref:{id:'hero-link',tag:'a',target:'href',kind:'fragment',default:defaults.linkHref},
  linkText:{id:'hero-link',tag:'a',target:'textContent',kind:'text',default:defaults.linkText},
  faqOpen:{id:'faq-first',tag:'details',target:'open',kind:'toggle',default:defaults.faqOpen},
  dialogEnabled:{id:'modal',tag:'dialog',target:'enabled',kind:'toggle',default:defaults.dialogEnabled},
  dialogLabel:{id:'modal-open',tag:'button',target:'textContent',kind:'text',default:defaults.dialogLabel},
  dialogBody:{id:'modal',tag:'dialog',target:'textContent',kind:'text',default:defaults.dialogBody},
  emailPlaceholder:{id:'signup-email',tag:'input',target:'placeholder',kind:'text',default:defaults.emailPlaceholder},
  subscribeEnabled:{id:'signup-form',tag:'form',target:'enabled',kind:'toggle',default:defaults.subscribeEnabled}
 };
 const r=registry();r.register('reviewed-tide-actions', '1.0.0',specs);r.validate(defaults);
 // Explicitly constructed / audited view: original JS, CSS, SVG and form action
 // attributes are NOT copied; content only through HTML escaping.
 const faqLabel=faq.querySelector('summary').textContent.trim();
 const faqBody=faq.querySelector('p').textContent.trim();
 const title=lookup('hero-title','h1').textContent.trim();
 const deck=lookup('hero-deck','p').textContent.trim();
 const subtitle=lookup('signup-title','h2').textContent.trim();
 const section='<section id="home" data-component="reviewed-tide"><h1>'+esc(title)+'</h1><p>'+esc(deck)+'</p>'+
  '<a id="hero-link" href="'+esc(defaults.linkHref)+'">'+esc(defaults.linkText)+'</a>'+
  '<details id="faq-first"><summary>'+esc(faqLabel)+'</summary><p>'+esc(faqBody)+'</p></details>'+
  '<section id="join"><h2>'+esc(subtitle)+'</h2><form id="signup-form" method="post">'+
  '<label>Email <input id="signup-email" type="email" required placeholder="'+esc(defaults.emailPlaceholder)+'"></label>'+
  '<button id="signup-button" type="submit">Preview sign-up</button></form>'+
  '<p id="submit-message" role="status"></p><button id="modal-open" type="button">'+esc(defaults.dialogLabel)+'</button>'+
  '<dialog id="modal"><p id="modal-body">'+esc(defaults.dialogBody)+'</p><button id="modal-close" type="button">Close</button></dialog></section></section>';
 return {source,html:section,defaults,specs,r};
}
function unit(){
 const x=sourceAndReviewedModel(),r=x.r,ajv=new Ajv2020({strict:false,allErrors:true});
 const validator=ajv.compile(r.schema());
 assert.equal(validator(x.defaults),true);
 const forbidden=[
  {...x.defaults,linkHref:'javascript:alert(1)'},{...x.defaults,linkHref:'https://evil.invalid'},
  {...x.defaults,linkHref:'#UPPERCASE'},{...x.defaults,dialogLabel:'x'.repeat(401)},
  {...x.defaults,faqOpen:'yes'},{...x.defaults,dialogEnabled:1},
  {...x.defaults,emailPlaceholder:null},{...x.defaults,subscribeEnabled:'yes'},
  {...x.defaults,unknown:'value'}
 ];
 for(const v of forbidden){
  assert.throws(()=>r.validate(v));assert.equal(validator(v),false);
 }
 const all=r.definitions();
 assert.throws(()=>r.register('another-trusted','1.0.0',{foo:{id:'hero-link',tag:'a',target:'href',kind:'fragment',default:'#join'}}));
 assert.equal(Object.keys(r.definitions()).length,8,'unsafe registration cannot partially install');
 const same=r.migrate(all,all,{linkText:'Owner label',linkHref:'#faq'});assert.equal(same.canPublish,true);
 const removed={...all};delete removed.linkHref;
 const absent=r.migrate(all,removed,{linkHref:'#faq'});assert.equal(absent.canPublish,false);
 const altered={...all,linkHref:{...all.linkHref,kind:'text'}};
 assert.equal(r.migrate(all,altered,{linkHref:'#faq'}).canPublish,false);
 console.log('STAGE1_REVIEWED_CAPABILITY_UNIT='+JSON.stringify({pass:true,fields:Object.keys(all).length,sourceScriptAndStyleNeverCopied:!x.html.includes('<script')&&!x.html.includes('<style'),badValuesRefused:forbidden.length,reviewedStaticPack:true,migrationGuarded:true}));
}
module.exports={registry,sourceAndReviewedModel,valueValid,unit,esc};
