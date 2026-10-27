'use strict';
// D7 editorial section order for all four fixed CMS routes. The plan stores only
// identities and registered D3 fallback references, never arbitrary CMS objects.
const sdk=require('../../sdk/contract.cjs');
const adapter=require('./composition-adapter.cjs');
const catalog=require('../catalog/compositions.cjs');
const FORMAT='manufact-design-factory-section-plan-v1';
const PAGES=Object.freeze(['home','services','approach','contact']);
const MAX_ADDED=8,MAX_SECTIONS=24;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function fail(message){throw Error('SECTION_PLAN: '+message);}
function exact(o,keys,where){
 if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k)))
  fail('Invalid '+where+' fields');
}
function composeBase(site,composition,language,reg){
 if(composition!==null){
  catalog.get(composition);
  if(site.pages[0].id!=='df-page-home')fail('Unexpected page order');
  const home=site.pages[0].sections;
  if(home.some(s=>s.id==='df-selected-composition'))fail('Duplicate legacy composition ID');
  const cta=home.findIndex(s=>s.component==='cta-banner');
  home.splice(cta<0?home.length:cta,0,
   adapter.sectionFor(composition,'df-selected-composition',language,reg));
 }
 return site;
}
function capture(site,composition){
 if(!site||!Array.isArray(site.pages)||site.pages.length!==PAGES.length)fail('Cannot capture incomplete site');
 const pages={};
 for(const key of PAGES){
  const page=site.pages.find(x=>x.id==='df-page-'+key);
  if(!page||!Array.isArray(page.sections))fail('Missing page '+key);
  pages[key]=page.sections.map(s=>s.id==='df-selected-composition'
   ?{id:s.id,composition}: {id:s.id});
 }
 return {format:FORMAT,version:1,pages};
}
function nextId(plan,page){
 if(!PAGES.includes(page))fail('Unknown page');
 if(!plan||!plan.pages||!Array.isArray(plan.pages[page]))fail('No section plan');
 for(let i=1;i<=99;i++){
  const id='df-added-'+page+'-'+String(i).padStart(2,'0');
  if(!plan.pages[page].some(s=>s.id===id))return id;
 }
 fail('No free composition IDs');
}
function applyToSite(site,language,composition,raw,reg){
 if(!site||site.format!=='manufact-ai-site-v1'||!Array.isArray(site.pages)||
    site.pages.length!==4)fail('Invalid base CMS site');
 if(!['ru','en'].includes(language))fail('Unknown language');
 if(composition!==null)catalog.get(composition);
 composeBase(site,composition,language,reg);
 if(raw===null)return {site,plan:null,added:0};
 exact(raw,['format','version','pages'],'plan');
 if(raw.format!==FORMAT||raw.version!==1)fail('Unsupported section plan version');
 exact(raw.pages,PAGES,'pages');
 if(Object.keys(raw.pages).length!==PAGES.length)fail('Four pages required');
 let added=0;
 const normalized={},allIds=new Set();
 for(const key of PAGES){
  const page=site.pages.find(p=>p.id==='df-page-'+key);
  if(!page)fail('Missing canonical page '+key);
  const source=new Map(page.sections.map(s=>[s.id,s]));
  const rawRows=raw.pages[key];
  if(!Array.isArray(rawRows)||rawRows.length<1||rawRows.length>MAX_SECTIONS)
   fail('Section count outside bounds on '+key);
  const used=new Set(),sections=[],rows=[];
  let pageAdded=0;
  for(const row of rawRows){
   exact(row,['id','composition'],'section');
   if(typeof row.id!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(row.id)||
      used.has(row.id)||allIds.has(row.id))fail('Invalid or duplicate section ID');
   used.add(row.id);allIds.add(row.id);
   if(source.has(row.id)){
    if(row.id==='df-selected-composition'){
     if(row.composition!==composition||composition===null)fail('Legacy composition mismatch');
     rows.push({id:row.id,composition});
    }else{
     if(own(row,'composition'))fail('Base section cannot change its CMS component');
     rows.push({id:row.id});
    }
    sections.push(source.get(row.id));
   }else{
    if(!new RegExp('^df-added-'+key+'-[0-9]{2}$').test(row.id)||
       typeof row.composition!=='string')fail('Unknown inserted section');
    catalog.get(row.composition);
    sections.push(adapter.sectionFor(row.composition,row.id,language,reg));
    rows.push({id:row.id,composition:row.composition});
    pageAdded++;added++;
   }
  }
  if(pageAdded>MAX_ADDED)fail('Too many inserted compositions on '+key);
  // Original site navigation and visitor action must not be silently removed.
  for(const s of source.values()){
   if(['company-hero','cta-banner'].includes(s.component)&&!used.has(s.id))
    fail('Protected original section missing: '+s.id);
  }
  if(composition!==null&&key==='home'&&!used.has('df-selected-composition'))
   fail('Legacy selection must be present or explicitly cleared');
  page.sections=sections;
  normalized[key]=rows;
 }
 const validated=sdk.validateSite(site,reg);
 const inspection=sdk.inspectSite(validated,reg);
 if(inspection.errors.length)fail('Broken local routes or anchors');
 return {site:validated,plan:{format:FORMAT,version:1,pages:normalized},added};
}
module.exports=Object.freeze({FORMAT,PAGES,MAX_ADDED,MAX_SECTIONS,capture,nextId,applyToSite});
