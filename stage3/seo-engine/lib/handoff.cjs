'use strict';
// Pure proposals only. The CMS source, database and live site never change.
const {checkBlueprint}=require('./blueprint.cjs');
const {auditSite}=require('./analyze.cjs');
const SUPPORTED=['title','description','robots','ogTitle','ogDescription'];
function propose(site,manifests,blueprint){
 const plan=checkBlueprint(blueprint);
 const audit=auditSite(site,manifests,plan);
 const byId=new Map(site.pages.map(p=>[p.id,p]));
 const changes=[],requires=[],pending=[];
 for(const page of plan.pages){
  const existing=byId.get(page.id);
  if(!existing){requires.push({pageId:page.id,kind:'page-development',path:page.path,reason:'AI developer must implement missing page and its stable IDs before CMS can edit it'});continue;}
  if(existing.path!==page.path)requires.push({pageId:page.id,kind:'path-review',current:existing.path,planned:page.path,reason:'Slug change/redirect must be planned by lead, not applied by SEO engine'});
  for(const key of SUPPORTED){
   const before=existing.seo?.[key]??(key==='robots'?'index':'');
   const after=page.seo[key];
   if(before===after)continue;
   changes.push({pageId:page.id,pagePath:existing.path,field:'seo.'+key,
    locator:{pageId:page.id,property:'seo.'+key},
    before,after,reviewRequired:Boolean(existing.seo&&Object.prototype.hasOwnProperty.call(existing.seo,key)&&String(before).trim()),
    reason:'SEO blueprint proposal; review against saved client overrides and published content'});
  }
  if(page.seo.canonicalPath!==page.path)
   requires.push({pageId:page.id,kind:'canonical-override',planned:page.seo.canonicalPath,
    reason:'Site v1 has no page.seo.canonical; renderer generates self-canonical from public origin and path'});
  for(const s of page.sections)if(!existing.sections.some(x=>x.id===s.id))
   requires.push({pageId:page.id,sectionId:s.id,kind:'section-coverage',
    reason:'Planned section ID not present: AI developer must map the approved visual specification to real site sections, not inject a template'});
  for(const c of page.schemaCandidates){
   if(!c.eligible)pending.push({pageId:page.id,kind:'unverified-schema-facts',type:c.type,factIds:c.factIds});
   else requires.push({pageId:page.id,kind:'structured-data-adapter',type:c.type,factIds:c.factIds,
    reason:'Verified candidate only; existing Site v1 SEO fields / renderer do not expose schema markup'});
  }
  for(const link of page.links)if(!byId.has(link.toPageId))
   requires.push({pageId:page.id,kind:'link-target',targetPageId:link.toPageId,reason:'Planned target page is absent'});
 }
 return {format:'manufact-seo-handoff-v1',version:1,siteId:site.siteId,readOnly:true,
  currentContract:'manufact-ai-site-v1',
  supportedChanges:changes,
  editorialReviewActions:audit.contentReview?.editorialActions||[],
  blueprintStructureReview:audit.contentReview?.blueprintReview?.issues||[],
  requiresLeadImplementation:requires,
  evidencePending:pending,
  alreadyAvailable:['page.seo.title','page.seo.description','page.seo.robots','page.seo.ogTitle','page.seo.ogDescription','page.seo.ogImage (existing media asset ID only)','assets[].alt','published sitemap.xml + robots.txt','self canonical where public origin is set','core.inspectSite warnings/errors'],
  unavailableInSiteV1:['editable page.seo.canonical override','arbitrary JSON-LD / Schema.org field','hreflang workflow','per-image contextual ALT without asset sharing decisions','real CWV lab or field observations'],
  outOfScope:['SEO CMS editor','search-volume measurements','SERP crawler','automatic DB writes','site generation'],
  audit,
  safety:'Do not automatically apply: page SEO may contain manual overrides; inspect reviewRequired and use existing CMS Save/Publish workflow.'};
}
module.exports=Object.freeze({propose});
