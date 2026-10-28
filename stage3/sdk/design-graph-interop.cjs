'use strict';
// Version-pinned, loss-aware bridge between a Design Factory lead-graph candidate
// and the CMS site-v1 contract. It preserves the source candidate as a baseline;
// it never converts arbitrary HTML/CSS/JS, authorizes publication, or signs data.
const FACTORY_FORMAT='manufact-design-factory-lead-graph-candidate-v1';
const SESSION_FORMAT='manufact-ai-design-graph-session-v1';
const HANDOFF_FORMAT='manufact-ai-design-graph-handoff-v1';
const AUDIT_FORMAT='manufact-ai-design-graph-interop-audit-v1';
const IDENT=/^[a-z][a-z0-9-]{2,79}$/;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const clone=o=>JSON.parse(JSON.stringify(o));
function fail(message){throw Error('Design Graph interop: '+message);}
function exactKeys(value,allowed,where){
  if(!object(value)||Object.keys(value).some(key=>!allowed.includes(key))||
    allowed.some(key=>!own(value,key)))fail('Invalid '+where+' keys');
}
function stableValue(value){
  if(Array.isArray(value))return value.map(stableValue);
  if(object(value)){const out={};for(const key of Object.keys(value).sort())out[key]=stableValue(value[key]);return out;}
  return value;
}
function stable(value){return JSON.stringify(stableValue(value));}
function same(a,b){return stable(a)===stable(b);}
function stringList(value,maxItems,maxLength,where){
  if(!Array.isArray(value)||value.length>maxItems||
    value.some(item=>typeof item!=='string'||item.length<1||item.length>maxLength))
    fail('Invalid '+where);
}
function selectedSection(site){
  const page=site.pages&&site.pages[0];
  return page&&Array.isArray(page.sections)?
    page.sections.find(section=>section.id==='df-selected-composition')||null:null;
}
function flattenGraph(graph){
  const entries=new Map(),childrenByParent=new Map();
  if(!graph||!Array.isArray(graph.nodes))return {entries,childrenByParent};
  const visit=(nodes,parentId)=>{
    childrenByParent.set(parentId,nodes.map(node=>node.id));
    nodes.forEach((node,index)=>{
      entries.set(node.id,{node,parentId,index});
      if(['container','disclosure','tabs','tab','list'].includes(node.type)&&Array.isArray(node.children))visit(node.children,node.id);
    });
  };
  visit(graph.nodes,'$root');return {entries,childrenByParent};
}
function validateBindings(bindings,section){
  if(!Array.isArray(bindings)||bindings.length>80)fail('Invalid content bindings');
  const index=flattenGraph(section.designGraph).entries,seen=new Set();
  for(const binding of bindings){
    if(!object(binding)||Object.keys(binding).some(k=>!['nodeId','property','source'].includes(k))||
      !own(binding,'nodeId')||!own(binding,'source')||
      (own(binding,'property')&&!['text','href'].includes(binding.property)))
      fail('Invalid binding shape');
    if(typeof binding.nodeId!=='string'||!IDENT.test(binding.nodeId)||!index.has(binding.nodeId))
      fail('Binding points to a missing graph node');
    const property=binding.property||'text',signature=binding.nodeId+':'+property;
    if(seen.has(signature))fail('Duplicate binding for '+signature);
    seen.add(signature);
    const node=index.get(binding.nodeId).node;
    if(property==='href'?(node.type!=='button'||!own(node,'href')):
      (!['heading','text','button','disclosure','tab','list-item'].includes(node.type)||typeof node.text!=='string'))
      fail('Binding property is incompatible with its graph node');
    const source=binding.source;
    if(!object(source)||Object.keys(source).some(k=>!['slot','itemId','field'].includes(k))||
      !own(source,'field')||typeof source.field!=='string'||
      !/^[a-z][a-z0-9.-]{1,79}$/.test(source.field)||
      (own(source,'slot')===own(source,'itemId')))fail('Invalid binding source');
    let record;
    if(own(source,'slot')){
      if(typeof source.slot!=='string'||!/^[a-z][a-z0-9-]{0,79}$/.test(source.slot))fail('Invalid binding slot');
      record=(section.elements||[]).find(item=>item.slot===source.slot);
    }else{
      if(typeof source.itemId!=='string'||!IDENT.test(source.itemId))fail('Invalid binding item ID');
      record=(section.items||[]).find(item=>item.id===source.itemId);
    }
    if(!record||!object(record.values)||!own(record.values,source.field)||typeof record.values[source.field]!=='string')
      fail('Binding source does not resolve to a declared string field');
    if(property==='href'&&source.field!=='behavior.href')fail('Link binding must point to behavior.href');
    if(property==='text'&&source.field==='behavior.href')fail('URL field cannot be bound to visible text');
  }
}
function validateCandidate(candidate,hostSdk,registry){
  exactKeys(candidate,['format','version','site','ownerChecklist','mapping','expectedSdk'],'candidate');
  if(candidate.format!==FACTORY_FORMAT||candidate.version!==1)
    fail('Unsupported Design Factory candidate format/version');
  if(!hostSdk||typeof hostSdk.validateSite!=='function'||typeof hostSdk.inspectSite!=='function'||!registry)
    fail('Current CMS SDK and registered component manifests are required');
  if(!(object(candidate.ownerChecklist)||Array.isArray(candidate.ownerChecklist))||
    typeof candidate.expectedSdk!=='string'||candidate.expectedSdk.length<1||candidate.expectedSdk.length>240)
    fail('Invalid source checklist or SDK descriptor');
  const mapping=candidate.mapping;
  exactKeys(mapping,['composition','theme','language','contentBindings','semanticContentMode',
    'editable','fidelity','approvedForPublish','integration_required'],'candidate mapping');
  if(typeof mapping.composition!=='string'||!/^[a-z][a-z0-9-]{1,79}$/.test(mapping.composition)||
    typeof mapping.theme!=='string'||!/^[a-z][a-z0-9-]{1,39}$/.test(mapping.theme)||
    !['ru','en'].includes(mapping.language)||
    mapping.semanticContentMode!=='snapshot-requires-host-reconciliation'||
    !['partial','full'].includes(mapping.fidelity)||mapping.approvedForPublish!==false)
    fail('Unsupported mapping contract or publish claim');
  stringList(mapping.editable,80,160,'editable capability list');
  stringList(mapping.integration_required,80,240,'integration gap list');
  const site=hostSdk.validateSite(clone(candidate.site),registry);
  if(!site.designTokens)fail('Candidate has no explicit design token set');
  const inspection=hostSdk.inspectSite(site,registry);
  if(inspection.errors.length)fail('Candidate site has invalid internal routes');
  const graphSections=site.pages.flatMap(page=>page.sections).filter(section=>own(section,'designGraph'));
  const section=selectedSection(site);
  if(graphSections.length!==1||!section||!own(section,'designGraph'))
    fail('Candidate must contain exactly one selected graph on the first page');
  validateBindings(mapping.contentBindings,section);
  return {candidate:clone(candidate),site,section,inspection};
}
function validateWorkingSite(candidate,rawSite,hostSdk,registry,requireSameGraph){
  const baseline=validateCandidate(candidate,hostSdk,registry);
  const site=hostSdk.validateSite(clone(rawSite),registry);
  if(site.siteId!==baseline.site.siteId||!site.pages[0]||site.pages[0].id!==baseline.site.pages[0].id)
    fail('Working site must retain the source site and first-page identity');
  const oldSection=selectedSection(baseline.site),newSection=selectedSection(site);
  if(!newSection||newSection.component!==oldSection.component)
    fail('Working site must retain the selected registered section identity');
  const oldGraph=oldSection.designGraph,newGraph=newSection.designGraph;
  if(requireSameGraph&&(!newGraph||newGraph.id!==oldGraph.id))
    fail('The selected Design Graph was removed or its stable ID changed');
  const inspection=hostSdk.inspectSite(site,registry);
  if(inspection.errors.length)fail('Working site has invalid internal routes');
  return {site,section:newSection,inspection,graphCompatible:!!newGraph&&newGraph.id===oldGraph.id};
}
function createSession(candidate,hostSdk,registry){
  const checked=validateCandidate(candidate,hostSdk,registry);
  return {format:SESSION_FORMAT,version:1,sourceCandidate:clone(candidate),workingSite:clone(checked.site)};
}
function resumeSession(input,hostSdk,registry){
  if(!object(input))fail('Expected an interop session or handoff package');
  if(input.format===SESSION_FORMAT){
    exactKeys(input,['format','version','sourceCandidate','workingSite'],'session');
    if(input.version!==1)fail('Unsupported session version');
    validateCandidate(input.sourceCandidate,hostSdk,registry);
    const checked=validateWorkingSite(input.sourceCandidate,input.workingSite,hostSdk,registry,false);
    return {format:SESSION_FORMAT,version:1,sourceCandidate:clone(input.sourceCandidate),workingSite:clone(checked.site)};
  }
  if(input.format===HANDOFF_FORMAT){
    exactKeys(input,['format','version','sourceCandidate','editedSite','audit'],'handoff');
    if(input.version!==1||!object(input.audit)||input.audit.format!==AUDIT_FORMAT||input.audit.version!==1)
      fail('Unsupported handoff package version');
    validateCandidate(input.sourceCandidate,hostSdk,registry);
    const checked=validateWorkingSite(input.sourceCandidate,input.editedSite,hostSdk,registry,true);
    return {format:SESSION_FORMAT,version:1,sourceCandidate:clone(input.sourceCandidate),workingSite:clone(checked.site)};
  }
  fail('Unsupported interop package format');
}
function refreshSession(session,workingSite,hostSdk,registry){
  const checked=resumeSession(session,hostSdk,registry);
  const current=validateWorkingSite(checked.sourceCandidate,workingSite,hostSdk,registry,false);
  return {format:SESSION_FORMAT,version:1,sourceCandidate:clone(checked.sourceCandidate),workingSite:clone(current.site)};
}
function graphStats(graph){
  const out={id:graph?.id||null,nodeCount:0,types:{},styleKeys:[],responsiveNodes:0,stateNodes:0,motionNodes:0,mediaNodes:0};
  if(!graph)return out;
  const keys=new Set();
  const visit=nodes=>(nodes||[]).forEach(node=>{
    out.nodeCount++;out.types[node.type]=(out.types[node.type]||0)+1;
    if(node.responsive&&Object.keys(node.responsive).length)out.responsiveNodes++;
    if(node.states&&Object.keys(node.states).length)out.stateNodes++;
    if(node.motion)out.motionNodes++;
    if(node.type==='image'||node.type==='video')out.mediaNodes++;
    for(const layer of [node.styles||{},...Object.values(node.responsive||{}),...Object.values(node.states||{})])
      Object.keys(layer).forEach(key=>keys.add(key));
    if(['container','disclosure','tabs','tab','list'].includes(node.type))visit(node.children);
  });
  visit(graph.nodes);out.styleKeys=Array.from(keys).sort();return out;
}
function describe(value){return value===undefined?{missing:true}:clone(value);}
function collectValueDiff(nodeId,path,before,after,changes,state){
  if(same(before,after))return;
  if(object(before)&&object(after)){
    const keys=Array.from(new Set([...Object.keys(before),...Object.keys(after)])).sort();
    for(const key of keys){if(state.truncated)return;collectValueDiff(nodeId,path?path+'.'+key:key,before[key],after[key],changes,state);}
    return;
  }
  changes.push({nodeId,path,before:describe(before),after:describe(after)});
  if(changes.length>=200)state.truncated=true;
}
function graphDiff(beforeGraph,afterGraph){
  const before=flattenGraph(beforeGraph),after=flattenGraph(afterGraph);
  const beforeIds=Array.from(before.entries.keys()),afterIds=Array.from(after.entries.keys());
  const addedNodeIds=afterIds.filter(id=>!before.entries.has(id)).sort();
  const removedNodeIds=beforeIds.filter(id=>!after.entries.has(id)).sort();
  const typeChangedNodeIds=[],reparentedNodeIds=[],changedProperties=[],state={truncated:false};
  for(const id of beforeIds){
    if(!after.entries.has(id))continue;
    const a=before.entries.get(id),b=after.entries.get(id);
    if(a.node.type!==b.node.type){typeChangedNodeIds.push(id);continue;}
    if(a.parentId!==b.parentId)reparentedNodeIds.push(id);
    const keys=Array.from(new Set([...Object.keys(a.node),...Object.keys(b.node)]))
      .filter(key=>!['id','type','children'].includes(key)).sort();
    for(const key of keys){collectValueDiff(id,key,a.node[key],b.node[key],changedProperties,state);if(state.truncated)break;}
    if(state.truncated)break;
  }
  const reorderedNodeIds=new Set(),parents=new Set([...before.childrenByParent.keys(),...after.childrenByParent.keys()]);
  for(const parent of parents){
    const oldList=(before.childrenByParent.get(parent)||[]).filter(id=>after.entries.has(id)&&after.entries.get(id).parentId===parent);
    const newList=(after.childrenByParent.get(parent)||[]).filter(id=>before.entries.has(id)&&before.entries.get(id).parentId===parent);
    if(oldList.join('|')===newList.join('|'))continue;
    oldList.forEach((id,index)=>{if(newList[index]!==id)reorderedNodeIds.add(id);});
    newList.forEach((id,index)=>{if(oldList[index]!==id)reorderedNodeIds.add(id);});
  }
  return {addedNodeIds,removedNodeIds,typeChangedNodeIds,reparentedNodeIds:reparentedNodeIds.sort(),
    reorderedNodeIds:Array.from(reorderedNodeIds).sort(),changedProperties,truncated:state.truncated};
}
function sourceValue(section,source){
  const record=own(source,'slot')?(section.elements||[]).find(item=>item.slot===source.slot):
    (section.items||[]).find(item=>item.id===source.itemId);
  if(!record||!object(record.values)||!own(record.values,source.field))return {exists:false};
  return {exists:true,value:clone(record.values[source.field])};
}
function inspectSession(session,workingSite,hostSdk,registry){
  const checked=resumeSession(session,hostSdk,registry);
  const current=validateWorkingSite(checked.sourceCandidate,workingSite===undefined?checked.workingSite:workingSite,
    hostSdk,registry,false);
  const baselineSection=selectedSection(checked.sourceCandidate.site),currentSection=current.section;
  const baselineGraph=baselineSection.designGraph,currentGraph=currentSection.designGraph||null;
  const bindings=checked.sourceCandidate.mapping.contentBindings.map(binding=>{
    const before=sourceValue(baselineSection,binding.source),after=sourceValue(currentSection,binding.source);
    if(same(before,after))return null;
    return {nodeId:binding.nodeId,property:binding.property||'text',source:clone(binding.source),before,after};
  }).filter(Boolean);
  return {
    format:AUDIT_FORMAT,version:1,
    compatibility:{canImport:true,canExportHandoff:current.graphCompatible,sourceCandidatePreserved:true,
      originalFactoryProjectPreserved:false,visualFidelity:checked.sourceCandidate.mapping.fidelity,
      requiresOwnerVisualReview:true,publishAuthorized:false,mode:'preserve-source-candidate-and-working-site-separately'},
    source:{format:checked.sourceCandidate.format,version:checked.sourceCandidate.version,
      expectedSdk:checked.sourceCandidate.expectedSdk},
    selectedSectionId:'df-selected-composition',baselineGraph:graphStats(baselineGraph),
    workingGraph:graphStats(currentGraph),graphDiff:graphDiff(baselineGraph,currentGraph),
    tokensChanged:!same(checked.sourceCandidate.site.designTokens,current.site.designTokens),
    assetsChanged:!same(checked.sourceCandidate.site.assets,current.site.assets),
    baselineAssetCount:checked.sourceCandidate.site.assets.length,workingAssetCount:current.site.assets.length,
    bindingChanges:bindings,integrationRequired:clone(checked.sourceCandidate.mapping.integration_required),
    notes:[
      'The source candidate is preserved as an unchanged baseline; editedSite is a separate document.',
      'This package does not reconstruct the original manufact-design-factory-v1 project/workspace.',
      'Visual fidelity remains limited by the source candidate fidelity and integration_required list.',
      'The audit is descriptive data, not a signature, permission, or publication approval.'
    ]
  };
}
function exportHandoff(session,workingSite,hostSdk,registry){
  const checked=resumeSession(session,hostSdk,registry);
  const current=validateWorkingSite(checked.sourceCandidate,workingSite,hostSdk,registry,true);
  const audit=inspectSession(checked,current.site,hostSdk,registry);
  if(!audit.compatibility.canExportHandoff)fail('The selected graph cannot be handed back without restoring its stable identity');
  return {format:HANDOFF_FORMAT,version:1,sourceCandidate:clone(checked.sourceCandidate),editedSite:clone(current.site),audit};
}
module.exports=Object.freeze({FACTORY_FORMAT,SESSION_FORMAT,HANDOFF_FORMAT,AUDIT_FORMAT,
  isCandidate:value=>object(value)&&value.format===FACTORY_FORMAT&&value.version===1,
  isHandoff:value=>object(value)&&value.format===HANDOFF_FORMAT&&value.version===1,
  createSession,resumeSession,refreshSession,inspectSession,exportHandoff});
