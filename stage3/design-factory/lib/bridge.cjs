'use strict';
// D6 immutable bridge, not a CMS publish service. 100% first-party validators.
const sdk=require('../../sdk/contract.cjs');
const compiler=require('./compiler.cjs');
const adapter=require('./composition-adapter.cjs');
const catalog=require('../catalog/compositions.cjs');
const WORKSPACE='manufact-design-factory-workspace-v1';
const EXPORT='manufact-design-factory-export-v1';
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function exact(value,allowed,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).some(k=>!allowed.includes(k)))throw Error('D6: unknown '+label+' field');
}
function workspace(raw){
 if(raw&&raw.format===WORKSPACE){
  exact(raw,['format','version','project','composition'],'workspace');
  if(raw.version!==1)throw Error('D6: unsupported workspace version');
  const project=compiler.validateProject(raw.project);
  const id=raw.composition;
  if(id!==null)catalog.get(id);
  return {format:WORKSPACE,version:1,project,composition:id};
 }
 const project=compiler.migrate(raw);
 return {format:WORKSPACE,version:1,project,composition:null};
}
function build(input){
 const w=workspace(input);
 const compiled=compiler.compile(w.project);
 const reg=compiler.loadRegistry();
 let site=compiled.site,comp=null;
 if(w.composition){
  const section=adapter.sectionFor(w.composition,'df-selected-composition',w.project.language,reg);
  site.pages[0].sections[site.pages[0].sections.length-1]=section;
  site=sdk.validateSite(site,reg);
  comp=adapter.compare(w.composition);
 }
 const inspection=sdk.inspectSite(site,reg);
 if(inspection.errors.length)throw Error('D6: invalid local routes');
 const compatibility={
  format:'manufact-design-factory-compatibility-v1',
  supported:['registered components','typed values','repeater bounds','stable IDs','CMS theme','page SEO','navigation','local links'],
  integration_required:['pixel parity for CSS compositions','responsive custom design tokens','future image adapters and galleries','motion, if approved'],
  blocked:['unverified owner facts','unchecked contact channels','fabricated reviews or awards','unlicensed media','public release without manual acceptance'],
  composition:comp,source:['stage3/sdk/contract.cjs','stage3/components/*.json','stage3/server/PublicRenderer.php'],
  previewOnly:true,publishGate:'owner_review_required'
 };
 return {
  format:EXPORT,version:1,workspace:w,site,
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
 if(raw.format!==EXPORT||raw.version!==1)throw Error('D6: unsupported export version');
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
