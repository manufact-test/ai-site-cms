'use strict';
// Framework-neutral, immutable Stage3 draft operations. Not a site publisher,
// server API, browser HTML injector or autosave. Offline local session only.
const C=require('./contract.cjs');
const SESSION='manufact-ai-editor-session-v1',MAX_UNDO=30;
const copy=x=>structuredClone(x),isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
function select(doc,pageId,sectionId,elementId){
  const page=doc.pages.find(p=>p.id===pageId);
  const section=page?.sections.find(s=>s.id===sectionId);
  const element=section?.elements.find(e=>e.id===elementId)||section?.items?.find(e=>e.id===elementId);
  if(!element)throw Error('Unrecognized editor selection');
  return {page,section,element};
}
function verifySession(raw,manifests){
  if(!isObj(raw)||raw.format!==SESSION||!Array.isArray(raw.undo)||!Array.isArray(raw.redo)||
    !Number.isSafeInteger(raw.revision)||raw.revision<0||
    raw.undo.length>MAX_UNDO||raw.redo.length>MAX_UNDO)throw Error('Invalid local draft session');
  C.validateSite(raw.base,manifests);C.validateSite(raw.current,manifests);
  return raw;
}
function begin(site,manifests){
  const checked=C.validateSite(site,manifests);
  return {format:SESSION,revision:0,base:checked,current:copy(checked),
    undo:[],redo:[]};
}
function edit(raw,manifests,{pageId,sectionId,elementId,path,value,breakpoint=null,expectedRevision}){
  const session=verifySession(raw,manifests);
  if(expectedRevision!==session.revision)throw Error('Draft changed: refuse stale editor update');
  const control=C.controls(session.current,manifests,pageId,sectionId,elementId)
    .find(x=>x.path===path);
  if(!control)throw Error('Property not declared in this component');
  if(breakpoint!==null&&(!control.responsive||!C.BREAKPOINTS.includes(breakpoint)))
    throw Error('Unexpected responsive edit');
  const candidate=copy(session.current),element=select(candidate,pageId,sectionId,elementId).element;
  if(breakpoint===null)element.values[path]=copy(value);
  else element.values[path][breakpoint]=copy(value);
  C.validateSite(candidate,manifests);
  if(JSON.stringify(candidate)===JSON.stringify(session.current))return copy(session);
  return {format:SESSION,revision:session.revision+1,base:copy(session.base),
    current:candidate,undo:[...session.undo,copy(session.current)].slice(-MAX_UNDO),redo:[]};
}
function undo(raw,manifests){
  const s=verifySession(raw,manifests);
  if(!s.undo.length)return copy(s);
  const history=s.undo.slice(),prior=history.pop();
  C.validateSite(prior,manifests);
  return {format:SESSION,revision:s.revision+1,base:copy(s.base),
    current:prior,undo:history,redo:[...s.redo,copy(s.current)].slice(-MAX_UNDO)};
}
function redo(raw,manifests){
  const s=verifySession(raw,manifests);
  if(!s.redo.length)return copy(s);
  const future=s.redo.slice(),next=future.pop();
  C.validateSite(next,manifests);
  return {format:SESSION,revision:s.revision+1,base:copy(s.base),
    current:next,undo:[...s.undo,copy(s.current)].slice(-MAX_UNDO),redo:future};
}

// Explicit structure operations use the same validated document as field edits.
// Undo/redo and optimistic local revision checks therefore work for both.
function structure(raw,manifests,command){
  const s=verifySession(raw,manifests);
  if(!isObj(command)||s.revision!==command.expectedRevision)
    throw Error('Stale structure revision');
  const c=copy(s.current),reg=C.registry(manifests);
  const {action,pageId,sectionId}=command;
  const page=c.pages.find(p=>p.id===pageId);
  const index=c.pages.findIndex(p=>p.id===pageId);
  const sectionIndex=page?.sections.findIndex(t=>t.id===sectionId)??-1;
  const label=value=>{
    if(typeof value!=='string'||!value.trim()||value.length>160)throw Error('Invalid title');
    return value.trim();
  };
  const move=(items,position,delta)=>{
    if(!Number.isInteger(delta)||Math.abs(delta)!==1)throw Error('Move requires one position');
    const target=position+delta;
    if(position<0||target<0||target>=items.length)throw Error('Cannot move outside collection');
    [items[position],items[target]]=[items[target],items[position]];
  };
  const rekey=(source,newId)=>{
    if(typeof newId!=='string')throw Error('Fresh section ID required');
    return {...copy(source),id:newId,elements:source.elements.map(el=>({
      ...copy(el),id:newId+'-'+el.slot
    })),...(source.items?{items:source.items.map((item,i)=>({...copy(item),id:newId+'-item-'+(i+1)}))}:{})};
  };
  switch(action){
    case 'addPage': {
      if(typeof command.id!=='string'||!reg.has(command.component))throw Error('Unknown new page');
      c.pages.push({id:command.id,path:command.path,title:label(command.title),
        sections:[C.sectionFrom(reg.get(command.component),command.sectionId)]});
      break;
    }
    case 'updatePage':
      if(!page)throw Error('Unknown page');
      page.title=label(command.title);
      if(page.path==='/'&&command.path!=='/')throw Error('Home page must retain root path');
      page.path=command.path;
      break;
    case 'movePage':
      move(c.pages,index,command.delta);break;
    case 'removePage':
      if(!page||page.path==='/'||c.pages.length===1)throw Error('Cannot remove root/last page');
      c.pages.splice(index,1);break;
    case 'addSection':
      if(!page||typeof command.id!=='string'||!reg.has(command.component))throw Error('Unknown new section');
      page.sections.splice(sectionIndex>=0?sectionIndex+1:page.sections.length,0,
        C.sectionFrom(reg.get(command.component),command.id));
      break;
    case 'duplicateSection':
      if(!page||sectionIndex<0)throw Error('Unknown section to duplicate');
      page.sections.splice(sectionIndex+1,0,rekey(page.sections[sectionIndex],command.id));
      break;
    case 'applyTemplate':{
      if(!page||typeof command.id!=='string'||!isObj(command.template))
        throw Error('Unknown template');
      const source=command.template;
      const m=reg.get(source.component);
      if(!m||source.manifestVersion!==m.version)
        throw Error('Template component must match registered version');
      page.sections.splice(sectionIndex>=0?sectionIndex+1:page.sections.length,0,rekey(source,command.id));
      break;
    }
    case 'duplicatePage':{
      if(!page||typeof command.id!=='string')throw Error('Unknown source page');
      const cloned=copy(page);
      cloned.id=command.id;cloned.title=label(command.title);cloned.path=command.path;
      cloned.sections=page.sections.map((sec,i)=>rekey(sec,command.id+'-s'+(i+1)));
      c.pages.splice(index+1,0,cloned);
      break;
    }
    case 'addItem':
    case 'duplicateItem':
    case 'moveItem':
    case 'removeItem': {
      if(!page||sectionIndex<0)throw Error('Unknown repeat section');
      const sec=page.sections[sectionIndex],repeat=reg.get(sec.component)?.repeat;
      if(!repeat||!Array.isArray(sec.items))throw Error('Component has no declared repeater');
      const found=sec.items.findIndex(x=>x.id===command.itemId);
      if(action==='addItem'||action==='duplicateItem'){
        if(sec.items.length>=repeat.max)throw Error('Repeater is full');
        if(action==='duplicateItem'&&found<0)throw Error('Unknown repeat item to duplicate');
        if(typeof command.id!=='string')throw Error('New repeat item ID required');
        const item=action==='duplicateItem'&&found>=0?{...copy(sec.items[found]),id:command.id}:{
          id:command.id,values:Object.fromEntries(repeat.fields.map(f=>[f.path,copy(f.default)]))
        };
        sec.items.splice(found>=0?found+1:sec.items.length,0,item);
      }else{
        if(found<0)throw Error('Unknown repeat item');
        if(action==='moveItem')move(sec.items,found,command.delta);
        else{
          if(sec.items.length<=repeat.min)throw Error('Cannot remove required repeat item');
          sec.items.splice(found,1);
        }
      }
      break;
    }
    case 'moveSection':
      if(!page)throw Error('Unknown page');
      move(page.sections,sectionIndex,command.delta);break;
    case 'removeSection':
      if(!page||sectionIndex<0||page.sections.length===1)throw Error('Cannot remove last section');
      page.sections.splice(sectionIndex,1);break;
    default:throw Error('Unknown structure action');
  }
  C.validateSite(c,manifests); // complete schema + globally stable IDs + safe paths
  if(JSON.stringify(c)===JSON.stringify(s.current))return copy(s);
  return {format:SESSION,revision:s.revision+1,base:copy(s.base),
    current:c,undo:[...s.undo,copy(s.current)].slice(-MAX_UNDO),redo:[]};
}
function replaceSite(raw,manifests,site,expectedRevision){
  const s=verifySession(raw,manifests),candidate=C.validateSite(site,manifests);
  if(expectedRevision!==s.revision||candidate.siteId!==s.current.siteId)throw Error('Stale or different site composition');
  return {format:SESSION,revision:s.revision+1,base:copy(s.base),current:candidate,
    undo:[...s.undo,copy(s.current)].slice(-MAX_UNDO),redo:[]};
}
function changes(raw,manifests){
  const s=verifySession(raw,manifests),diff=[];
  const pages=new Map(s.base.pages.map(p=>[p.id,p]));
  if(JSON.stringify(s.base.theme)!==JSON.stringify(s.current.theme))diff.push({kind:'theme-updated'});
  const record=(kind,ids)=>diff.push({kind,...ids});
  s.base.pages.forEach(p=>{if(!s.current.pages.some(q=>q.id===p.id))record('page-removed',{pageId:p.id});});
  s.current.pages.forEach((page,position)=>{
    const prior=pages.get(page.id);
    if(!prior){record('page-added',{pageId:page.id});return;}
    if(prior.path!==page.path||prior.title!==page.title||JSON.stringify(prior.seo)!==JSON.stringify(page.seo)||JSON.stringify(prior.navigation)!==JSON.stringify(page.navigation))record('page-updated',{pageId:page.id});
    if(s.base.pages.findIndex(q=>q.id===page.id)!==position)record('page-moved',{pageId:page.id});
    const oldSections=new Map(prior.sections.map(t=>[t.id,t]));
    prior.sections.forEach(t=>{if(!page.sections.some(q=>q.id===t.id))record('section-removed',{pageId:page.id,sectionId:t.id});});
    page.sections.forEach((section,i)=>{
      const prev=oldSections.get(section.id);
      if(!prev){record('section-added',{pageId:page.id,sectionId:section.id});return;}
      if(prior.sections.findIndex(q=>q.id===section.id)!==i)
        record('section-moved',{pageId:page.id,sectionId:section.id});
      if(prev.component!==section.component||prev.manifestVersion!==section.manifestVersion){record('section-replaced',{pageId:page.id,sectionId:section.id});return;}
      if(JSON.stringify(prev.items)!==JSON.stringify(section.items))
        diff.push({kind:'items-updated',pageId:page.id,sectionId:section.id});
      for(const el of section.elements){
        const original=prev.elements.find(q=>q.id===el.id);
        if(!original)throw Error('Stable element ID changed');
        for(const [path,value] of Object.entries(el.values))
          if(JSON.stringify(original.values[path])!==JSON.stringify(value))
            diff.push({pageId:page.id,sectionId:section.id,elementId:el.id,path,
              original:copy(original.values[path]),current:copy(value)});
      }
    });
  });
  return diff;
}
function blockPreview(raw,manifests,pageId,sectionId,breakpoint='desktop'){
  if(!C.BREAKPOINTS.includes(breakpoint))throw Error('Invalid viewport');
  const s=verifySession(raw,manifests),page=s.current.pages.find(x=>x.id===pageId);
  const section=page?.sections.find(x=>x.id===sectionId);
  if(!section)throw Error('Section not found');
  const elements=section.elements.map(el=>{
    const fields=C.controls(s.current,manifests,pageId,sectionId,el.id);
    const props={content:{},style:{},behavior:{}};
    for(const field of fields){
      const [group,name]=field.path.split('.');
      // Data-only tree. HTML renderers must separately escape content.
      props[group][name]=C.effectiveValue(field.value,breakpoint);
    }
    return {id:el.id,slot:el.slot,props};
  });
  const items=(section.items||[]).map(item=>{
    const props={content:{},style:{},behavior:{}};
    for(const field of C.controls(s.current,manifests,pageId,sectionId,item.id)){
      const [group,name]=field.path.split('.');
      props[group][name]=C.effectiveValue(field.value,breakpoint);
    }
    return {id:item.id,props};
  });
  return {format:'manufact-ai-block-preview-data-v1',siteId:s.current.siteId,
    pageId,sectionId,component:section.component,breakpoint,
    elements,items,notPublished:true,hasExecutableHtml:false};
}
module.exports=Object.freeze({begin,edit,undo,redo,changes,structure,replaceSite,blockPreview});
