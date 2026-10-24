'use strict';
// Design Factory D1 — deterministic author-fact compiler.
// Reads first-party Stage3 manifests and SDK; never writes to the CMS.
const fs = require('node:fs');
const path = require('node:path');
const sdk = require('../../sdk/contract.cjs');

const FORMAT = 'manufact-design-factory-v1';
const VERSION = 1;
const ROOT = path.resolve(__dirname, '../../components');
const COMPONENTS = Object.freeze([
  'company-hero','feature-highlights','service-grid','media-story','faq-accordion',
  'cta-banner','contact-panel'
]);
const THEMES = require('../catalog/themes.cjs');
const KITS = Object.freeze({
  agency: {
    label: {ru:'Креативная студия',en:'Creative studio'},
    archetype: 'editorial',
    sequences: {
      home:['company-hero','feature-highlights','service-grid','cta-banner'],
      services:['company-hero','service-grid','media-story','cta-banner'],
      approach:['company-hero','feature-highlights','faq-accordion','cta-banner'],
      contact:['company-hero','contact-panel','faq-accordion']
    }
  },
  industrial: {
    label: {ru:'Производство / B2B',en:'Manufacturing / B2B'},
    archetype: 'technical',
    sequences: {
      home:['company-hero','media-story','feature-highlights','cta-banner'],
      services:['company-hero','service-grid','feature-highlights','cta-banner'],
      approach:['company-hero','media-story','faq-accordion'],
      contact:['company-hero','contact-panel','faq-accordion']
    }
  },
  consulting: {
    label: {ru:'Профессиональные услуги',en:'Professional services'},
    archetype: 'minimal',
    sequences: {
      home:['company-hero','feature-highlights','cta-banner'],
      services:['company-hero','service-grid','faq-accordion','cta-banner'],
      approach:['company-hero','media-story','feature-highlights','cta-banner'],
      contact:['company-hero','contact-panel','faq-accordion']
    }
  }
});
const COPY = Object.freeze({
  ru: {
    pages: {home:'Главная',services:'Услуги',approach:'Подход',contact:'Контакты'},
    emptyTitle:'Новый сайт — требуется название',
    hero: 'Опишите ваше предложение',
    summary:'Добавьте проверенные сведения о компании и задаче, которую она решает.',
    action:'Обсудить задачу',
    services:'Направления работы',
    serviceOne:'Направление 1 — уточните у владельца',
    serviceTwo:'Направление 2 — уточните у владельца',
    serviceDescription:'Опишите услугу на основе подтверждённых данных.',
    features:'Что важно знать',
    featureOne:'Добавьте проверенную информацию о подходе к работе.',
    featureTwo:'Уточните сроки, состав услуг и условия у владельца.',
    story:'О процессе работы',
    storyCopy:'Добавьте реальные материалы, этапы или примеры вашей работы.',
    storyImage:'Подключите изображение только после согласования прав.',
    faq:'Частые вопросы',
    faqQ1:'Как уточнить объём проекта?',
    faqA1:'Оставьте описание задачи, чтобы согласовать детали.',
    faqQ2:'Где узнать условия сотрудничества?',
    faqA2:'Уточните актуальные условия у представителя организации.',
    call:'Начнём с задачи',
    callDescription:'Опишите цель и ожидаемый результат, чтобы обсудить дальнейшие действия.',
    secondary:'Посмотреть услуги',
    contact:'Контактная информация',
    contactAction:'Перейти к контактам',
    seo:'Информация о направлениях, подходе и способах связи. Данные требуют проверки владельцем.',
    missing:'Не заполнены подтверждённые данные',
  },
  en: {
    pages: {home:'Home',services:'Services',approach:'Approach',contact:'Contact'},
    emptyTitle:'New website — add your name',
    hero:'Describe what you offer',
    summary:'Add verified information about the organization and the needs it serves.',
    action:'Discuss a project',
    services:'Areas of work',
    serviceOne:'Service area 1 — confirm with owner',
    serviceTwo:'Service area 2 — confirm with owner',
    serviceDescription:'Describe the service using verified owner-provided details.',
    features:'What to know',
    featureOne:'Add confirmed information about your working process.',
    featureTwo:'Ask the owner to confirm scope, timelines and terms.',
    story:'How the work is done',
    storyCopy:'Add real projects, steps or examples of work.',
    storyImage:'Add an image only with the necessary permissions.',
    faq:'Frequently asked questions',
    faqQ1:'How can we clarify project scope?',
    faqA1:'Describe the task so its details can be discussed.',
    faqQ2:'Where can I check cooperation terms?',
    faqA2:'Ask the organization for up-to-date terms.',
    call:'Start with the brief',
    callDescription:'Share your goal and expected outcome to discuss the next steps.',
    secondary:'Explore services',
    contact:'Contact information',
    contactAction:'Contact details',
    seo:'Overview of services, approach and ways to get in touch. Verify details with the owner.',
    missing:'Verified owner details missing',
  }
});
function fail(message){throw new Error('DESIGN_FACTORY: '+message);}
const has = (o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object = v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function keys(o, allowed, where){
  if(!object(o)||Object.keys(o).some(k=>!allowed.includes(k))) fail('Unexpected '+where+' keys');
}
function value(v,max,name){
  if(typeof v!=='string'||v.length>max||/[\u0000-\u001f\u007f]/.test(v)) fail('Invalid '+name);
}
function safeId(v){return typeof v==='string'&&/^[a-z][a-z0-9-]{2,79}$/.test(v);}
function cleanFacts(input){
  keys(input,['siteId','title','headline','description','services','ctaLabel','contactText'],'facts');
  const f={};
  for(const k of ['siteId','title','headline','description','ctaLabel','contactText']){
    if(has(input,k)){value(input[k],k==='description'||k==='contactText'?400:k==='siteId'?80:120,k);f[k]=input[k];}
  }
  if(has(f,'siteId')&&!safeId(f.siteId)) fail('Invalid facts.siteId');
  if(has(input,'services')){
    if(!Array.isArray(input.services)||input.services.length>12)fail('Invalid services count');
    f.services=input.services.map((s,i)=>{
      keys(s,['title','description'],'service #'+i);
      value(s.title,120,'service.title');value(s.description,320,'service.description');
      if(!s.title.trim())fail('Empty service title');
      return {title:s.title,description:s.description};
    });
  }
  return f;
}
function migrate(input){
  if(input==null)return {format:FORMAT,version:VERSION,kit:'agency',theme:'editorial',language:'ru',facts:{}};
  if(!object(input)||input.format!==FORMAT)fail('Unsupported design-factory format');
  if(input.version===0){
    keys(input,['format','version','kit','theme','language','facts'],'legacy project');
    const old={...input,version:1};
    return validateProject(old);
  }
  return validateProject(input);
}
function validateProject(input){
  keys(input,['format','version','kit','theme','language','facts'],'project');
  if(input.format!==FORMAT||input.version!==VERSION)fail('Unsupported project version');
  if(!has(KITS,input.kit)||!has(THEMES,input.theme)||!['ru','en'].includes(input.language))
    fail('Unknown kit, theme or language');
  return {format:FORMAT,version:VERSION,kit:input.kit,theme:input.theme,language:input.language,facts:cleanFacts(input.facts)};
}
function loadRegistry(){
  const entries=COMPONENTS.map(n=>{
    const p=path.join(ROOT,n+'.json');
    return JSON.parse(fs.readFileSync(p,'utf8'));
  });
  return sdk.registry(entries);
}
function pagePath(key){return key==='home'?'/':'/'+key+'/';}
function pageId(key){return 'df-page-'+key;}
function sectionId(page,index){return 'df-'+page+'-'+String(index+1).padStart(2,'0');}
function apply(section,slot,values){
  const el=section.elements.find(x=>x.slot===slot);
  if(!el)fail('Missing registered slot: '+section.component+'/'+slot);
  for(const [key,val] of Object.entries(values)){
    if(!has(el.values,key))fail('Undeclared slot property: '+key);
    el.values[key]=val;
  }
}
function setItems(section, items){
  if(!Array.isArray(section.items))fail('Component has no registered repeater');
  const prototype=section.items[0].values;
  section.items=items.map((row,i)=>({
    id:section.id+'-item-'+(i+1),
    values:{...structuredClone(prototype),...row}
  }));
}
function makeSection(component,id,page,project,reg){
  const theme=THEMES[project.theme], c=COPY[project.language], f=project.facts;
  const def=reg.get(component);
  if(!def)fail('Missing component '+component);
  const section=sdk.sectionFrom(def,id);
  section.appearance={...theme.appearance};
  if(component==='company-hero'){
    const title=page==='home'?(f.headline||f.title||c.hero):c.pages[page];
    const summary=page==='home'?(f.description||c.summary):(page==='contact'?(f.contactText||c.summary):c.seo);
    apply(section,'heading',{'content.text':title,'style.fontSize':theme.headline,'style.color':theme.cms.text});
    apply(section,'summary',{'content.text':summary});
    apply(section,'action',{'content.text':f.ctaLabel||c.action,'behavior.href':'/contact/'});
  } else if(component==='feature-highlights'){
    apply(section,'heading',{'content.text':c.features});
    apply(section,'first',{'content.text':c.featureOne,'style.color':theme.cms.text});
    apply(section,'second',{'content.text':c.featureTwo});
  } else if(component==='service-grid'){
    apply(section,'heading',{'content.text':c.services});
    const rows=(f.services&&f.services.length?f.services.slice(0,12):[
      {title:c.serviceOne,description:c.serviceDescription},
      {title:c.serviceTwo,description:c.serviceDescription}
    ]);
    // The registered service-grid repeater requires at least 2 items.
    // Do not invent a second service: clearly label its owner-review placeholder.
    if(rows.length===1)rows.push({title:c.serviceTwo,description:c.serviceDescription});
    setItems(section,rows.map(x=>({'content.title':x.title,'content.text':x.description,'behavior.href':'/contact/'})));
  } else if(component==='media-story'){
    apply(section,'heading',{'content.text':c.story});
    apply(section,'copy',{'content.text':c.storyCopy});
    apply(section,'action',{'content.text':c.action,'behavior.href':'/contact/'});
  } else if(component==='faq-accordion'){
    apply(section,'heading',{'content.text':c.faq});
    setItems(section,[
      {'content.question':c.faqQ1,'content.answer':c.faqA1},
      {'content.question':c.faqQ2,'content.answer':c.faqA2}
    ]);
  } else if(component==='cta-banner'){
    apply(section,'heading',{'content.text':c.call});
    apply(section,'summary',{'content.text':c.callDescription});
    apply(section,'primary',{'content.text':f.ctaLabel||c.action,'behavior.href':'/contact/'});
    apply(section,'secondary',{'content.text':c.secondary,'behavior.href':'/services/'});
  } else if(component==='contact-panel'){
    apply(section,'heading',{'content.text':c.contact});
    apply(section,'action',{'content.text':c.contactAction,'behavior.href':'/contact/'});
  }
  return section;
}
function checklist(project){
  const f=project.facts,c=COPY[project.language],missing=[];
  if(!f.title)missing.push('facts.title');
  if(!f.headline)missing.push('facts.headline');
  if(!f.description)missing.push('facts.description');
  if(!f.services||!f.services.length)missing.push('facts.services');
  if(!f.contactText)missing.push('facts.contactText');
  return {label:c.missing,missing,readyForPublish:missing.length===0,requiresOwnerReview:true};
}
function compile(input,providedRegistry){
  const project=migrate(input),reg=providedRegistry||loadRegistry(),theme=THEMES[project.theme],
    kit=KITS[project.kit], c=COPY[project.language], facts=project.facts;
  const siteId=facts.siteId||('df-'+project.kit);
  const title=facts.title||c.emptyTitle;
  const pages=Object.keys(kit.sequences).map(key=>{
    const pathValue=pagePath(key);
    const sections=kit.sequences[key].map((comp,i)=>makeSection(comp,sectionId(key,i),key,project,reg));
    return {
      id:pageId(key),path:pathValue,title:c.pages[key],
      navigation:{label:c.pages[key],hidden:false},
      seo:{title:(key==='home'?title:c.pages[key]+' | '+title).slice(0,160),
        description:(facts.description||c.seo).slice(0,300),robots:'index'},
      sections
    };
  });
  const site={format:sdk.FORMAT,siteId,title,schemaVersion:1,assets:[],pages,theme:structuredClone(theme.cms)};
  const validated=sdk.validateSite(site,reg);
  const findings=sdk.inspectSite(validated,reg);
  if(findings.errors.length)fail('Invalid local links/anchors: '+JSON.stringify(findings.errors));
  return {project,site:validated,checklist:checklist(project),inspection:findings,designSpec:{
    format:FORMAT,version:VERSION,kit:project.kit,theme:project.theme,
    archetype:kit.archetype,previewParity:'integration_required',
    cmsTheme:structuredClone(theme.cms),cmsAppearance:structuredClone(theme.appearance),
    previewDesign:structuredClone(theme.design),
    contrast:structuredClone(theme.contrast),
    integration_required:['custom-layout-css','custom-type-scale','media-workbench-assets']
  }};
}
function serialize(v){return JSON.stringify(v,null,2)+'\n';}
function jsonParse(text){
  if(typeof text!=='string'||text.length>1024*1024)fail('Input JSON exceeds 1 MiB');
  try{return JSON.parse(text);}catch{fail('Invalid JSON');}
}
module.exports=Object.freeze({
  FORMAT,VERSION,KITS,THEMES,COPY,migrate,validateProject,loadRegistry,compile,
  checklist,serialize,jsonParse
});
