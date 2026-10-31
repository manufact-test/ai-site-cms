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
function heading(section,expected){
 const list=nodes(section).filter(x=>x.type==='heading');
 const matches=list.filter(x=>normalize(x.text)===normalize(expected));
 if(matches.length)return {status:'authoring-match',value:matches[0].text,nodeId:matches[0].id,candidates:list.length};
 if(list.length===1)return {status:'authoring-diff',value:list[0].text,nodeId:list[0].id,candidates:1};
 return {status:list.length?'ambiguous-heading':'missing-heading',value:null,nodeId:null,candidates:list.length};
}
function cta(section,expectedPath,expectedLabel){
 const list=nodes(section).filter(x=>x.type==='button');
 const routed=list.filter(x=>x.href===expectedPath);
 const chosen=routed.length===1?routed[0]:list.length===1?list[0]:null;
 return {status:!chosen?(list.length?'ambiguous-cta':'missing-cta'):
  chosen.href!==expectedPath?'route-diff':
  normalize(chosen.text)!==normalize(expectedLabel)?'label-diff':'matching',
  nodeId:chosen?.id||null,href:chosen?.href||null,label:chosen?.text||null,
  candidateCount:list.length,routeMatches:routed.length};
}
module.exports=Object.freeze({nodes,heading,cta});
