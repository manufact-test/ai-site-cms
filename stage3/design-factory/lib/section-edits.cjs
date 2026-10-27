'use strict';
// Registered text/url overrides only. Never trust arbitrary section JSON.
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function fail(message){throw Error('SECTION_EDIT: '+message);}
function exact(o,keys,where){
 if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k)))
  fail('Invalid '+where);
}
function apply(section,raw,registry){
 exact(raw,['elements','items'],'edit object');
 if(!Array.isArray(raw.elements)||raw.elements.length>32)fail('Invalid element edits');
 const manifest=registry.get(section.component);
 if(!manifest)fail('Unregistered component');
 const sources=new Map(manifest.elements.map(e=>[e.slot,e]));
 const destinations=new Map(section.elements.map(e=>[e.slot,e]));
 const seen=new Set(),elements=[];
 for(const change of raw.elements){
  exact(change,['slot','path','value'],'element change');
  if(typeof change.slot!=='string'||typeof change.path!=='string'||
     typeof change.value!=='string'||seen.has(change.slot+'|'+change.path))
   fail('Duplicate or invalid element change');
  seen.add(change.slot+'|'+change.path);
  const def=sources.get(change.slot)?.fields.find(f=>f.path===change.path);
  const dest=destinations.get(change.slot);
  if(!def||!dest||!['text','url'].includes(def.type)||!own(dest.values,change.path))
   fail('Field not editable');
  dest.values[change.path]=change.value;
  elements.push({slot:change.slot,path:change.path,value:change.value});
 }
 elements.sort((a,b)=>a.slot.localeCompare(b.slot,'en')||a.path.localeCompare(b.path,'en'));
 const edit={elements};
 if(own(raw,'items')){
  const repeat=manifest.repeat;
  if(!repeat||!Array.isArray(raw.items)||raw.items.length<repeat.min||
     raw.items.length>repeat.max)fail('Invalid repeater count');
  const baseline=new Map((section.items||[]).map(item=>[item.id,item]));
  const seenIds=new Set(),items=[];
  const paths=repeat.fields.map(f=>f.path);
  for(const row of raw.items){
   exact(row,['id','values'],'repeater item');
   if(typeof row.id!=='string'||seenIds.has(row.id)||
      (!baseline.has(row.id)&&!row.id.startsWith(section.id+'-item-'))||
      !/^[a-z][a-z0-9-]{2,79}$/.test(row.id))fail('Invalid item ID');
   seenIds.add(row.id);
   exact(row.values,paths,'repeater values');
   if(Object.keys(row.values).length!==paths.length)fail('Missing repeater field');
   const values={};
   for(const field of repeat.fields){
    const value=row.values[field.path];
    if(typeof value!=='string')fail('Invalid repeater value type');
    const original=baseline.get(row.id)?.values[field.path]??field.default;
    if(!['text','url'].includes(field.type)&&value!==original)
     fail('Media/style changes require separate approved asset workflow');
    values[field.path]=value;
   }
   items.push({id:row.id,values});
  }
  section.items=items;
  edit.items=items;
 }
 return edit;
}
module.exports=Object.freeze({apply});
