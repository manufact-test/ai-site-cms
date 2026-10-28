'use strict';
// Before/after public route migration policy, using only existing Site v1 redirect aliases.
// Does NOT make HTTP requests, create 301s, edit nav links or change CMS.
const {auditSite}=require('./analyze.cjs');
const {checkBlueprint}=require('./blueprint.cjs');
const FORMAT='manufact-seo-route-migration-v1';
function scanAuthoredLinks(site){
 const results=[];
 const add=(page,path,where,href)=>{
  if(typeof href!=='string'||!href.startsWith('/')||href.startsWith('//'))return;
  const pure=href.split(/[?#]/)[0];
  results.push({pageId:page.id,pagePath:page.path,source:where,href,targetPath:pure});
 };
 function graph(nodes,p,sectionId){
  if(!Array.isArray(nodes))return;
  for(const node of nodes){
   if(node?.type==='button')add(p,p.path,'designGraph:'+sectionId+':'+node.id,node.href);
   graph(node?.children,p,sectionId);
  }
 }
 for(const page of site.pages){
  for(const section of page.sections||[]){
   for(const element of [...(section.elements||[]),...(section.items||[])]){
    add(page,page.path,section.id+':'+element.id,element.values?.['behavior.href']);
   }
   graph(section.designGraph?.nodes,page,section.id);
  }
 }
 return results;
}
function review(before,after,manifests,blueprint){
 const b=checkBlueprint(blueprint);
 if(!before||!after||before.siteId!==after.siteId||after.siteId!==b.siteId)
  throw Error('Route migration needs two same-project Site v1 revisions');
 auditSite(before,manifests,b);
 auditSite(after,manifests,b);
 const oldPages=new Map(before.pages.map(x=>[x.id,x]));
 const current=new Map(after.pages.map(x=>[x.id,x]));
 const finalRoutes=new Map(after.pages.map(x=>[x.path,x.id]));
 const redirects=new Map((after.redirects||[]).map(x=>[x.from,x.to]));
 const oldAliases=new Map((before.redirects||[]).map(x=>[x.from,x.to]));
 const authored=scanAuthoredLinks(after),changed=[],removed=[],newPages=[],probes=[],findings=[];
 const add=(code,severity,pageId,path,message,extra={})=>findings.push({
  code,severity,pageId:pageId??null,path:path??null,message,
  evidence:'two-caller-supplied-site-v1-revisions',automatic:false,...extra});
 for(const [id,prev] of oldPages){
  const now=current.get(id);
  if(!now){
   removed.push({pageId:id,oldPath:prev.path,oldIndexation:prev.seo?.robots||'index',
    reviewRequired:true,canonicalTargetUnknown:true});
   if((prev.seo?.robots||'index')==='index')
    add('migration:indexable-page-removed','warning',id,prev.path,
     'Previously indexable page was removed; do not invent a 301 target or silently drop it.');
   continue;
  }
  if(prev.path===now.path)continue;
  const redirect=redirects.get(prev.path)||null,matched=redirect===now.path;
  const status=matched?'mapped':!redirect?'missing-redirect':'wrong-destination';
  changed.push({pageId:id,previousPath:prev.path,currentPath:now.path,
   previousIndexation:prev.seo?.robots||'index',currentIndexation:now.seo?.robots||'index',
   aliasTarget:redirect,expectedAliasTarget:now.path,status,
   leadApprovalRequired:true,automaticRedirectCreated:false});
  probes.push({kind:'old-route-redirect',pageId:id,requestPath:prev.path,
   expectedHttpStatus:301,expectedLocationPath:now.path,
   expectedCanonicalOnDestination:now.path,actualHttpVerified:false});
  if(!matched)add('migration:renamed-route-without-matching-301','error',id,prev.path,
   'Moved page has no matching Site v1 301 alias to its new route.',
   {expectedPath:now.path,actualAliasTarget:redirect});
  if((prev.seo?.robots||'index')==='index'&&(now.seo?.robots||'index')==='noindex')
   add('migration:renamed-page-noindex','error',id,now.path,
    'Indexable old page moved to a currently noindex route; review the SEO/consolidation intent.');
  if(finalRoutes.has(prev.path)&&finalRoutes.get(prev.path)!==id)
   add('migration:old-route-reassigned','warning',id,prev.path,
    'Former route is now owned by a different page; a redirect alias cannot occupy it.');
 }
 for(const [id,page] of current)if(!oldPages.has(id))newPages.push({pageId:id,path:page.path});
 for(const [source,destination] of redirects){
  const previous=oldPages.get([...oldPages.keys()].find(id=>oldPages.get(id).path===source));
  if(!previous&&!oldAliases.has(source)){
   add('migration:new-unrelated-redirect','recommendation',null,source,
    'New alias has no matching previous Site v1 route; confirm its origin and business reason.',
    {to:destination});
  }
 }
 const movedOldRoutes=new Set(changed.map(x=>x.previousPath));
 for(const link of authored)if(movedOldRoutes.has(link.targetPath)){
  add('migration:authored-link-uses-old-route','warning',link.pageId,link.pagePath,
   'A current page still links to a former route; update its source field instead of relying on a redirect.',
   {href:link.href,fieldSource:link.source});
 }
 for(const ch of changed)probes.push({kind:'destination-page',pageId:ch.pageId,
  requestPath:ch.currentPath,expectedHttpStatus:200,
  expectedCanonicalOnDestination:ch.currentPath,actualHttpVerified:false});
 const blocking=findings.filter(x=>x.severity==='error').length;
 return {format:FORMAT,version:1,siteId:after.siteId,readOnly:true,
  summary:{previousPages:before.pages.length,currentPages:after.pages.length,
   renamedPages:changed.length,correctMappedAliases:changed.filter(x=>x.status==='mapped').length,
   missingOrWrongAliases:changed.filter(x=>x.status!=='mapped').length,
   removedPages:removed.length,addedPages:newPages.length,
   staleInternalLinks:findings.filter(x=>x.code==='migration:authored-link-uses-old-route').length,
   blockingFindings:blocking,realHttpProbesPerformed:0},
  changed,removed,added:newPages,probes,findings,
  releaseAuthorized:false,redirectsCreated:0,
  limitations:'Only authoring snapshots and declared redirect aliases are compared. A matching alias in Site v1 does not prove 301 status, Location header, cache behavior, traffic recovery, actual host canonical, link graph, or search index handling. Removed pages require an explicit lead choice; never auto-redirect all removed pages to home.'};
}
module.exports=Object.freeze({FORMAT,review,scanAuthoredLinks});
