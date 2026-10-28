'use strict';
// Read-only before/after SEO contract regression. Uses the authoritative Site v1 validator.
const {auditSite}=require('./analyze.cjs');
const {checkBlueprint}=require('./blueprint.cjs');
const FORMAT='manufact-seo-regression-v1',order={blocker:0,error:1,warning:2,recommendation:3};
function key(x){
 return [x.code,x.pageId||'',x.sectionId||'',x.elementId||'',x.nodeId||'',
  x.targetPageId||'',x.field||'',x.topic||'',x.assetId||'',x.path||'',
  x.expected??'',x.proposedAnchor||''].join('|');
}
const clone=x=>JSON.parse(JSON.stringify(x));
function compare(before,after,manifests,blueprint){
 const plan=checkBlueprint(blueprint);
 if(!before||!after||before.siteId!==after.siteId||after.siteId!==plan.siteId)
  throw Error('SEO regression requires two Site v1 versions for the same siteId');
 const previous=auditSite(before,manifests,plan),current=auditSite(after,manifests,plan);
 const oldMap=new Map(previous.issues.map(x=>[key(x),x])),newMap=new Map(current.issues.map(x=>[key(x),x]));
 const introduced=[],resolved=[],escalated=[],improved=[],persistent=[];
 for(const [k,x] of newMap){
  const old=oldMap.get(k);
  if(!old)introduced.push(x);
  else if(order[x.severity]<order[old.severity])escalated.push({before:old,after:x});
  else if(order[x.severity]>order[old.severity])improved.push({before:old,after:x});
  else persistent.push(x);
 }
 for(const [k,x] of oldMap)if(!newMap.has(k))resolved.push(x);
 const previousPages=new Map(before.pages.map(p=>[p.id,p])),currentPages=new Map(after.pages.map(p=>[p.id,p]));
 const pageChanges=[],seoChanges=[];
 for(const id of [...new Set([...previousPages.keys(),...currentPages.keys()])].sort()){
  const a=previousPages.get(id),b=currentPages.get(id);
  if(!a||!b){
   pageChanges.push({pageId:id,kind:a?'removed':'added',
    before:a?.path??null,after:b?.path??null,reviewRequired:true});continue;
  }
  if(a.path!==b.path)pageChanges.push({pageId:id,kind:'route-changed',before:a.path,after:b.path,reviewRequired:true});
  for(const field of ['title','description','robots','ogTitle','ogDescription','ogImage']){
   // Effective indexation, not absent versus explicit index, for robots.
   const x=a.seo?.[field]??(field==='robots'?'index':null),y=b.seo?.[field]??(field==='robots'?'index':null);
   if(x!==y)seoChanges.push({pageId:id,pagePath:b.path,field:'seo.'+field,
    before:x,after:y,reviewRequired:true,automatic:false,
    potentialIndexationRegression:field==='robots'&&x==='index'&&y==='noindex'});
  }
 }
 const critical=introduced.filter(x=>order[x.severity]<=order.error).length+
  escalated.filter(x=>order[x.after.severity]<=order.error).length+
  seoChanges.filter(x=>x.potentialIndexationRegression).length;
 return {format:FORMAT,version:1,siteId:after.siteId,readOnly:true,
  summary:{introduced:introduced.length,resolved:resolved.length,
   escalated:escalated.length,improved:improved.length,persistent:persistent.length,
   routeChanges:pageChanges.length,seoFieldChanges:seoChanges.length,criticalReviewItems:critical},
  introduced,escalated,resolved,improved,persistentCount:persistent.length,
  pageChanges,seoChanges,
  evidence:'validated Site v1 before/after contract and identical canonical SEO blueprint',
  limitations:'Static evidence only; changes in rules, template implementation, published HTML, cache, layout, browser behavior, rankings or traffic are not measured. A new warning is not automatically a regression in business outcomes. No changes are applied.'};
}
module.exports=Object.freeze({FORMAT,compare});
