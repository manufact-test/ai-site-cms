'use strict';
// D3 adapter: supported subset ONLY, uses the actual Stage3 registered SDK.
// Richer D3 design/layout and proposed components are not injected into site-v1.
const sdk=require('../../sdk/contract.cjs');
const catalog=require('../catalog/compositions.cjs');
const {loadRegistry}=require('./compiler.cjs');
const {PROPOSALS}=catalog;
function fail(s){throw Error('COMPOSITION: '+s);}
function update(section,slot,key,value){
 const el=section.elements.find(x=>x.slot===slot);
 if(!el||!Object.hasOwn(el.values,key))fail('Undeclared value: '+slot+'/'+key);
 el.values[key]=value;
}
function defaultsFor(category,lang){
 const en=lang==='en';
 const text=(ru,english)=>en?english:ru;
 const common={
  heading:text('Подтвердите информацию','Confirm the details'),
  note:text('Замените демонстрационные подписи проверенными данными владельца.',
    'Replace sample copy with verified owner-provided facts.'),
  first:text('Пункт 1 — уточнить сведения','Item 1 — confirm details'),
  second:text('Пункт 2 — уточнить сведения','Item 2 — confirm details'),
  question:text('Как уточнить условия?','How can I confirm the terms?'),
  answer:text('Обратитесь за актуальной информацией.','Request the current details.')
 };
 const headings={
  hero:text('Опишите вашу работу','Describe your work'),
  benefits:text('С чем помогаем','How we can help'),
  services:text('Направления услуг','Service areas'),
  process:text('Как устроена работа','Our working process'),
  team:text('О команде','About the team'),
  portfolio:text('Примеры работ','Selected work'),
  pricing:text('Варианты сотрудничества','Working arrangements'),
  testimonials:text('Отзывы — только с согласия авторов','Testimonials — consent required'),
  faq:text('Частые вопросы','Frequently asked questions'),
  contact:text('Как связаться','How to get in touch'),
  cta:text('Обсудим вашу задачу','Discuss your project'),
  gallery:text('Медиатека','Image collection'),
  trust:text('Проверенные сведения','Verified information'),
  editorial:text('История и контекст','Story and context')
 };
 return {...common,heading:headings[category]};
}
function sectionFor(id,sectionId='df-showcase-section',language='ru',reg=loadRegistry()){
 const comp=catalog.get(id);
 if(typeof sectionId!=='string'||! /^[a-z][a-z0-9-]{2,79}$/.test(sectionId))fail('Invalid section ID');
 if(!['ru','en'].includes(language))fail('Invalid language');
 const def=reg.get(comp.cmsComponent);
 if(!def)fail('CMS component unavailable: '+comp.cmsComponent);
 const section=sdk.sectionFrom(def,sectionId);
 const t=defaultsFor(comp.category,language);
 const heading=section.elements.find(x=>x.slot==='heading');
 if(heading&&Object.hasOwn(heading.values,'content.text'))heading.values['content.text']=t.heading;
 if(comp.cmsComponent==='company-hero'){
  update(section,'summary','content.text',t.note);
  update(section,'action','content.text',language==='ru'?'Связаться':'Contact');
  update(section,'action','behavior.href','/contact/');
 }
 if(comp.cmsComponent==='feature-highlights'){
  update(section,'first','content.text',t.first);
  update(section,'second','content.text',t.second);
 }
 if(comp.cmsComponent==='service-grid'){
  // Honest editorial placeholders satisfy the registered repeater min=2.
  section.items=section.items.map((it,i)=>({
   id:sectionId+'-item-'+(i+1),
   values:{...it.values,'content.title':i?t.second:t.first,
    'content.text':t.note,'behavior.href':'/contact/'}
  }));
 }
 if(comp.cmsComponent==='media-story'){
  update(section,'copy','content.text',t.note);
  update(section,'action','content.text',language==='ru'?'Подробнее':'Learn more');
  update(section,'action','behavior.href','/contact/');
  // Blank media binding is permitted, but NEVER claim uploaded owner images.
 }
 if(comp.cmsComponent==='photo-gallery'){
  // Two properly typed empty slots. Real CMS export requires owner-approved photos.
  section.items=section.items.map((it,i)=>({id:sectionId+'-item-'+(i+1),
    values:{...it.values,'content.media':'','content.caption':''}}));
 }
 if(comp.cmsComponent==='faq-accordion'){
  section.items=section.items.map((it,i)=>({id:sectionId+'-item-'+(i+1),values:{
   ...it.values,'content.question':i?t.question:t.question,
   'content.answer':t.answer
  }}));
 }
 if(comp.cmsComponent==='cta-banner'){
  update(section,'summary','content.text',t.note);
  update(section,'primary','content.text',language==='ru'?'Связаться':'Contact');
  update(section,'primary','behavior.href','/contact/');
  update(section,'secondary','behavior.href','/services/');
 }
 if(comp.cmsComponent==='contact-panel'){
  update(section,'action','behavior.href','/contact/');
 }
 return section;
}
function compare(id){
 const c=catalog.get(id);
 return Object.freeze({
  composition:id,sourceFormat:catalog.FORMAT,targetFormat:sdk.FORMAT,
  status:c.status,component:c.cmsComponent,
  supportedFields:['component','manifestVersion','elements','items where declared',
    'section.id','page path and navigation assigned by host CMS'],
  integration_required:c.status==='integration_required'
   ?[c.adapterProposal,'layout token '+c.layout,'preview typography and media']:
    ['preview visual layout and CSS parity'],
  blocked:['invented owner facts','unknown site-v1 fields','unapproved media',
    'unverified prices and testimonials'],
  semanticFallback:'Can validate as registered component but NOT visually identical to rich standalone preview'
 });
}
function validateFallbacks(){
 const reg=loadRegistry();
 const siteCompiler=require('./compiler.cjs');
 let checked=0;
 for(const item of catalog.compositions){
  const site=siteCompiler.compile({format:siteCompiler.FORMAT,version:1,
    kit:'agency',theme:'editorial',language:'ru',facts:{}},reg).site;
  const suffix='df-'+item.id;
  // Replace first page's last section and its generated children, no global ID collision.
  site.pages[0].sections[site.pages[0].sections.length-1]=sectionFor(item.id,suffix,'ru',reg);
  sdk.validateSite(site,reg);
  if(sdk.inspectSite(site,reg).errors.length)fail('Broken fallback link: '+item.id);
  checked++;
 }
 return checked;
}
module.exports=Object.freeze({sectionFor,compare,validateFallbacks,PROPOSALS});
