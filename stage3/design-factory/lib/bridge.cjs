'use strict';
// D6 immutable bridge, not a CMS publish service. 100% first-party validators.
const sdk=require('../../sdk/contract.cjs');
const compiler=require('./compiler.cjs');
const adapter=require('./composition-adapter.cjs');
const catalog=require('../catalog/compositions.cjs');
const sectionPlan=require('./section-plan.cjs');
const pageSettings=require('./page-settings.cjs');
const WORKSPACE='manufact-design-factory-workspace-v1';
const EXPORT='manufact-design-factory-export-v2';
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function exact(value,allowed,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).some(k=>!allowed.includes(k)))throw Error('D6: unknown '+label+' field');
}
function workspace(raw){
 if(raw&&raw.format===WORKSPACE){
  if(![1,2,3].includes(raw.version))throw Error('D6: unsupported workspace version');
  exact(raw,raw.version===3
   ?['format','version','project','composition','sectionPlan','pageSettings']
   :raw.version===2?['format','version','project','composition','sectionPlan']
    :['format','version','project','composition'],'workspace');
  const project=compiler.validateProject(raw.project),id=raw.composition;
  if(id!==null)catalog.get(id);
  if(raw.version===1)return {format:WORKSPACE,version:1,project,composition:id};
  if(raw.version===2&&!raw.sectionPlan)throw Error('D6: missing versioned section plan');
  if(raw.version===3&&!own(raw,'pageSettings'))throw Error('D6: missing page settings');
  const reg=compiler.loadRegistry(),original=compiler.compile(project,reg).site;
  const planned=raw.sectionPlan?sectionPlan.applyToSite(original,project.language,id,raw.sectionPlan,reg):null;
  if(raw.version===2)return {format:WORKSPACE,version:2,project,composition:id,sectionPlan:planned.plan};
  const overlay=pageSettings.apply(compiler.compile(project,reg).site,raw.pageSettings);
  return {format:WORKSPACE,version:3,project,composition:id,
   ...(planned?{sectionPlan:planned.plan}:{}),pageSettings:overlay.settings};
 }
 const project=compiler.migrate(raw);
 return {format:WORKSPACE,version:1,project,composition:null};
}
function build(input){
 const w=workspace(input);
 const compiled=compiler.compile(w.project);
 const reg=compiler.loadRegistry();
 const planned=sectionPlan.applyToSite(compiled.site,w.project.language,w.composition,
  w.sectionPlan||null,reg);
 let site=planned.site;
 const meta=w.version===3?pageSettings.apply(site,w.pageSettings):null;
 const comp=w.composition?adapter.compare(w.composition):null;
 // An edited page or section must not inherit earlier approval for unrelated copy.
 if(planned.added||planned.edited||meta?.changed){
  compiled.checklist={...compiled.checklist,readyForPublish:false,
   requiresOwnerReview:true,indexing:'noindex',
   publicationStatus:meta?.changed&&!planned.added&&!planned.edited
    ?'page_metadata_requires_owner_review':'section_drafts_require_owner_review'};
  for(const page of site.pages)page.seo.robots='noindex';
 }
 site=sdk.validateSite(site,reg);
 const inspection=sdk.inspectSite(site,reg);
 if(inspection.errors.length)throw Error('D6: invalid local routes');
 const compatibility={
  format:'manufact-design-factory-compatibility-v2',
  supported:['registered components','typed values','repeater bounds','stable IDs','CMS theme','page SEO','navigation','local links'],
  integration_required:['pixel parity for CSS compositions','responsive custom design tokens','future image adapters and galleries','motion, if approved'],
  blocked:[
   ...(compiled.checklist.readyForPublish?[]:['unverified owner facts','unchecked contact channels','owner review not confirmed']),
   'fabricated reviews or awards','unlicensed media','production publication without CMS/integrator approval'
  ],
  composition:comp,
  ...(w.sectionPlan?{sectionPlan:{format:sectionPlan.FORMAT,addedDrafts:planned.added,editedSections:planned.edited,
   pages:sectionPlan.PAGES.map(key=>({page:key,sections:w.sectionPlan.pages[key].length}))}}:{}),
  ...(meta?{pageSettings:{format:pageSettings.FORMAT,changedPages:meta.changed}}:{}),
  source:['stage3/sdk/contract.cjs','stage3/components/*.json','stage3/server/PublicRenderer.php'],
  previewOnly:true,
  publishGate:compiled.checklist.readyForPublish?'owner_review_confirmed_by_exporter':'owner_review_required',
  indexing:compiled.checklist.indexing
 };
 return {
  format:EXPORT,version:2,workspace:w,site,
  designSpec:compiled.designSpec,ownerChecklist:compiled.checklist,
  inspection,compatibility
 };
}
// JSON object member order is not meaningful. CMS importers may reserialize
// an unchanged bundle with sorted keys; arrays and primitive types are meaningful.
// Reject non-JSON values rather than coercing undefined/NaN to null.
function canonical(value){
 if(value===null)return 'null';
 if(typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){
  if(!Number.isFinite(value))throw Error('D6: invalid JSON number');
  return JSON.stringify(value);
 }
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object'){
  // Accept plain JSON objects from another JS realm (Node vm/iframe), too.
  if(Object.prototype.toString.call(value)!=='[object Object]')
   throw Error('D6: invalid JSON object');
  return '{'+Object.keys(value).sort().map(key=>{
   if(key==='__proto__'||key==='constructor'||key==='prototype')
    throw Error('D6: forbidden JSON member');
   return JSON.stringify(key)+':'+canonical(value[key]);
  }).join(',')+'}';
 }
 throw Error('D6: non-JSON value');
}
function validateBundle(raw){
 exact(raw,['format','version','workspace','site','designSpec','ownerChecklist','inspection','compatibility'],'export');
 if(raw.format!==EXPORT||raw.version!==2)throw Error('D6: unsupported export version');
 const normalized=build(raw.workspace);
 // Exact reproducibility is an integrity gate: no injecting unknown CMS fields,
 // undetected changes or replacing owner data after validation.
 for(const key of ['workspace','site','designSpec','ownerChecklist','inspection','compatibility'])
  if(canonical(raw[key])!==canonical(normalized[key]))throw Error('D6: changed '+key+' since generation');
 return normalized;
}
function importForCMS(raw){
 const validated=validateBundle(raw);
 return sdk.validateSite(validated.site,compiler.loadRegistry());
}
module.exports=Object.freeze({WORKSPACE,EXPORT,workspace,build,validateBundle,importForCMS});
