'use strict';
// Framework-neutral, immutable Stage3 draft operations. Not a site publisher,
// server API, browser HTML injector or autosave. Offline local session only.
const C=require('./contract.cjs');
const SESSION='manufact-ai-editor-session-v1',MAX_UNDO=30;
const copy=x=>structuredClone(x),isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
function select(doc,pageId,sectionId,elementId){
  const page=doc.pages.find(p=>p.id===pageId);
  const section=page?.sections.find(s=>s.id===sectionId);
  const element=section?.elements.find(e=>e.id===elementId);
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
function changes(raw,manifests){
  const s=verifySession(raw,manifests);
  const result=[];
  for(const [pageIndex,page] of s.current.pages.entries()){
    const initial=s.base.pages[pageIndex];
    if(initial.id!==page.id||initial.sections.length!==page.sections.length)
      throw Error('Structural edits require another explicit operation');
    for(const [sectionIndex,sec] of page.sections.entries()){
      const original=initial.sections[sectionIndex];
      if(original.id!==sec.id||sec.elements.length!==original.elements.length)
        throw Error('Structural edits require another explicit operation');
      for(const el of sec.elements){
        const before=original.elements.find(x=>x.id===el.id);
        if(!before)throw Error('Stable element ID changed');
        for(const [path,value] of Object.entries(el.values))
          if(JSON.stringify(before.values[path])!==JSON.stringify(value))
            result.push({pageId:page.id,sectionId:sec.id,elementId:el.id,path,
              original:copy(before.values[path]),current:copy(value)});
      }
    }
  }
  return result;
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
  return {format:'manufact-ai-block-preview-data-v1',siteId:s.current.siteId,
    pageId,sectionId,component:section.component,breakpoint,
    elements,notPublished:true,hasExecutableHtml:false};
}
module.exports=Object.freeze({begin,edit,undo,redo,changes,blockPreview});
