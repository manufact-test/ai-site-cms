'use strict';
// Read-only check of actual public PHP lead forms: NEVER submit data or expose tokens.
const FORMAT='manufact-seo-local-php-forms-v1';
function attrs(s){
 const out={};
 for(const m of String(s).matchAll(/([a-z][a-z0-9_-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gi))
  out[m[1].toLowerCase()]=m[2]??m[3]??m[4]??'';
 return out;
}
function tags(s,tag){
 const re=new RegExp('<'+tag+'\\b([^>]*?)\\/?\\s*>','gi');
 return [...s.matchAll(re)].map(m=>attrs(m[1]));
}
function strip(s){return s.replace(/<!--[\s\S]*?-->/g,'').replace(/<(?:script|style|template)\b[^>]*>[\s\S]*?<\/(?:script|style|template)\s*>/gi,'');}
function forms(s){
 return [...strip(s).matchAll(/<form\b([^>]*?)>([\s\S]*?)<\/form\s*>/gi)]
  .map(m=>({attrs:attrs(m[1]),inputs:tags(m[2],'input'),
   textareas:tags(m[2],'textarea'),selects:tags(m[2],'select'),
   fieldsets:tags(m[2],'fieldset'),divs:tags(m[2],'div'),
   paragraphs:tags(m[2],'p'),buttons:tags(m[2],'button')}));
}
function sectionForms(html,id){
 const wrappers=[...strip(html).matchAll(/<section\b([^>]*?)>([\s\S]*?)<\/section\s*>/gi)]
  .filter(m=>attrs(m[1]).id===id);
 return wrappers.length===1?forms(wrappers[0][2]):[];
}
function validAction(action,siteId,sectionId){
 if(typeof action!=='string'||(!action.startsWith('/')&&!/^https?:\/\//i.test(action))||action.startsWith('//'))return false;
 let url;try{url=new URL(action,'https://source.invalid');}catch{return false;}
 return (url.protocol==='https:'||(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))&&
  !url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/forms/'+siteId+'/'+sectionId;
}
function review(site,snapshot,publishedVersion=null){
 if(!site||!Array.isArray(site.pages)||!snapshot||snapshot.siteId!==site.siteId||
   !Array.isArray(snapshot.pages)||snapshot.pages.length!==site.pages.length)
  throw Error('PHP form audit requires matching full Site v1 HTML capture');
 const pages=[],findings=[],releases=new Set();
 const add=(p,section,code,message,severity='error')=>findings.push(Object.freeze({
  code:'php-form:'+code,severity,pageId:p.id,path:p.path,sectionId:section,
  message,evidence:'hash-checked-local-php-html',automatic:false}));
 for(const observed of snapshot.pages){
  const page=site.pages.find(p=>p.id===observed.id&&p.path===observed.path);
  if(!page)throw Error('PHP form page identity mismatch');
  const expected=page.sections.filter(s=>['lead-form','lead-form-flex'].includes(s.component));
  const actual=forms(observed.html);let checked=0;
  if(actual.length!==expected.length)add(page,null,'count-drift','Published form count differs from sealed Site v1.');
  for(const section of expected){
   const found=sectionForms(observed.html,section.id);
   if(found.length!==1){add(page,section.id,'markup-drift','Published section has no unique lead form.');continue;}
   checked++;
   const form=found[0],a=form.attrs,of=name=>form.inputs.filter(x=>x.name===name);
   if(a.method?.toLowerCase()!=='post'||a['accept-charset']?.toLowerCase()!=='utf-8')
    add(page,section.id,'method-encoding','Lead form must submit POST UTF-8.');
   if(!validAction(a.action,site.siteId,section.id))
    add(page,section.id,'action-drift','Published form action does not target own site/section.');
   else if(/^https?:\/\//i.test(a.action))
    add(page,section.id,'collector-origin-review','Verify absolute collector origin and allowlist.','recommendation');
   const rel=of('_release'),token=of('_token');
   if(rel.length!==1||rel[0].type!=='hidden'||!/^[1-9][0-9]{0,8}$/.test(rel[0].value||''))
    add(page,section.id,'release-marker','Published release marker absent or invalid.');
   else releases.add(Number(rel[0].value));
   if(token.length!==1||token[0].type!=='hidden'||!/^[a-f0-9]{64}$/.test(token[0].value||''))
    add(page,section.id,'token-marker','Published HMAC marker absent or malformed (value redacted).');
   if(of('website').length!==1)add(page,section.id,'honeypot-absent','Anti-spam honeypot absent.');
   const consent=of('consent');
   if(consent.length!==1||consent[0].type!=='checkbox'||!Object.hasOwn(consent[0],'required'))
    add(page,section.id,'consent-absent','Required consent checkbox missing.');
   for(const [name,type] of [['name','text'],['email','email']]){
    const f=of(name);
    if(f.length!==1||f[0].type!==type||!Object.hasOwn(f[0],'required'))
     add(page,section.id,'required-field-drift','Required '+name+' input missing.');
   }
   const msg=form.textareas.filter(x=>x.name==='message');
   if(msg.length!==1||!Object.hasOwn(msg[0],'required'))
    add(page,section.id,'message-absent','Required message textarea missing.');
   if(!form.buttons.some(x=>x.type==='submit'))add(page,section.id,'submit-absent','Submit button missing.');
   // Lead's new FlexForm builder is part of the *same* immutable form contract.
   // Old legacy extra slots and new additive fields are both checked.
   const definitions=[];
   if(section.component==='lead-form-flex'){
    for(const [index,slot] of ['extra-one','extra-two','extra-three'].entries()){
     const values=section.elements?.find(el=>el.slot===slot)?.values||{};
     const kind=values['behavior.kind'];
     if(kind&&kind!=='off')definitions.push({
      id:'extra'+(index+1),kind,required:values['behavior.required']===true,
      options:kind==='select'?String(values['content.options']||'').split(/\r?\n/):[],when:null
     });
    }
    for(const x of section.formFields||[])definitions.push(x);
   }
   for(const field of definitions){
    const name=field.id,kind=field.kind;
    const matching=kind==='textarea'?form.textareas.filter(x=>x.name===name):
     kind==='select'?form.selects.filter(x=>x.name===name):of(name);
    const count=kind==='radio'?(field.options||[]).length:1;
    if(matching.length!==count){
     add(page,section.id,'extra-field-drift','Published flexible field '+name+' is missing or has incorrect option count.');
     continue;
    }
    if(!['textarea','select'].includes(kind)&&matching.some(x=>x.type!==(kind==='text'?'text':kind)))
     add(page,section.id,'extra-field-type-drift','Published flexible field '+name+' has the wrong input type.');
    const required=field.required&&!field.when;
    if(matching.some(x=>Object.hasOwn(x,'required')!==Boolean(required)))
     add(page,section.id,'extra-field-required-drift','Published flexible field '+name+' has incorrect required behavior.');
    if(field.when){
     const div=form.divs.filter(x=>(x.class||'').split(/\s+/).includes('lead-conditional-'+name));
     if(div.length!==1||div[0]['data-condition-source']!==field.when.field||
       div[0]['data-condition-option']!==String(field.when.option)||
       div[0]['data-condition-required']!==(field.required?'yes':'no'))
      add(page,section.id,'conditional-field-drift','Conditional field '+name+' lost its published selector and requirement attributes.');
    }
   }
   const steps=section.formSteps||[];
   const actualSteps=form.fieldsets.filter(x=>(x.class||'').split(/\s+/).includes('lead-step'));
   if(actualSteps.length!==steps.length||Boolean(steps.length)!==(a['data-multi-step']==='yes'))
    add(page,section.id,'step-layout-drift','Published multi-step fieldsets or marker differ from sealed form steps.');
   if(steps.length){
    const next=form.buttons.filter(x=>Object.hasOwn(x,'data-step-next'));
    const back=form.buttons.filter(x=>Object.hasOwn(x,'data-step-back'));
    if(next.length!==steps.length-1||back.length!==steps.length-1||
       !form.paragraphs.some(x=>(x.class||'').split(/\s+/).includes('lead-step-progress')))
     add(page,section.id,'step-navigation-drift','Published step navigation or progress status is incomplete.');
   }
  }
  pages.push(Object.freeze({pageId:page.id,path:page.path,expectedForms:expected.length,actualForms:actual.length,checkedFormSections:checked}));
 }
 if(publishedVersion!==null&&(!Number.isSafeInteger(publishedVersion)||publishedVersion<1))
  throw Error('Invalid expected published form version');
 if(publishedVersion!==null&&releases.size&&(
    releases.size!==1||![...releases].includes(publishedVersion)))
  findings.push(Object.freeze({code:'php-form:release-version-drift',severity:'error',
   pageId:null,path:null,sectionId:null,
   message:'Actual PHP form release does not match the owner-supplied published version.',
   evidence:'hash-checked-local-php-html',automatic:false}));
 if(releases.size>1)findings.push(Object.freeze({code:'php-form:mixed-releases',severity:'error',pageId:null,path:null,sectionId:null,
  message:'Published forms expose inconsistent release versions.',evidence:'hash-checked-local-php-html',automatic:false}));
 return Object.freeze({format:FORMAT,siteId:site.siteId,readOnly:true,pages:Object.freeze(pages),findings:Object.freeze(findings),
  expectedForms:pages.reduce((n,p)=>n+p.expectedForms,0),observedForms:pages.reduce((n,p)=>n+p.actualForms,0),
  checkedFormSections:pages.reduce((n,p)=>n+p.checkedFormSections,0),
  consistentRelease:releases.size===1?[...releases][0]:null,
  expectedPublishedVersion:publishedVersion,
  actualPostPerformed:false,collectorChecked:false,deliveriesProven:false,servedRevisionAuthenticated:false,
  limitations:'HTML markup and marker shape only. Does not POST, disclose tokens, authenticate PHP revision, validate collector or prove delivery.'});
}
module.exports=Object.freeze({FORMAT,attrs,tags,forms,validAction,review});
