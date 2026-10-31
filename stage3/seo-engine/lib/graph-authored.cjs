'use strict';
// The PHP renderer uses section.designGraph instead of legacy component markup.
// This helper reads validated, typed graph nodes without executing arbitrary code.
const normalize=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
function nodes(section){
 if(!section?.designGraph)return [];
 const out=[];
 const walk=children=>{for(const node of children||[]){out.push(node);if(Array.isArray(node.children))walk(node.children);}};
 walk(section.designGraph.nodes);
 return out;
}
function hasPublishedForm(section){
 if(!['lead-form','lead-form-flex'].includes(section?.component))return false;
 if(!section.designGraph)return true;
 return nodes(section).some(node=>node.type==='form-slot');
}
// Current PHP/JS Design Graph renders these links, including inline rich-text
// fragments. Return source locators so private SEO suggestions target the
// existing node editor, never hidden legacy component slots.
function links(section){
 const out=[];
 for(const node of nodes(section)){
  if(['button','link','image'].includes(node.type)&&!node.popupTarget&&
     typeof node.href==='string')
   out.push({nodeId:node.id,href:node.href,
    label:node.type==='image'?String(node.alt||''):String(node.text||''),fieldPath:'href'});
  if(['heading','text'].includes(node.type)&&Array.isArray(node.runs))
   node.runs.forEach((run,index)=>{
    if(typeof run.href==='string')out.push({nodeId:node.id,href:run.href,
     label:String(run.text||''),fieldPath:'runs['+index+'].href'});
   });
 }
 return out;
}
function heading(section,expected){
 const list=nodes(section).filter(x=>x.type==='heading');
 const matches=list.filter(x=>normalize(x.text)===normalize(expected));
 if(matches.length)return {status:'authoring-match',value:matches[0].text,nodeId:matches[0].id,candidates:list.length};
 if(list.length===1)return {status:'authoring-diff',value:list[0].text,nodeId:list[0].id,candidates:1};
 return {status:list.length?'ambiguous-heading':'missing-heading',value:null,nodeId:null,candidates:list.length};
}
function cta(section,expectedPath,expectedLabel){
 const list=links(section);
 const routed=list.filter(x=>x.href===expectedPath);
 const chosen=routed.length===1?routed[0]:list.length===1?list[0]:null;
 return {status:!chosen?(list.length?'ambiguous-cta':'missing-cta'):
  chosen.href!==expectedPath?'route-diff':
  normalize(chosen.label)!==normalize(expectedLabel)?'label-diff':'matching',
  nodeId:chosen?.nodeId||null,href:chosen?.href||null,label:chosen?.label||null,
  candidateCount:list.length,routeMatches:routed.length};
}
module.exports=Object.freeze({nodes,heading,cta,hasPublishedForm,links});
