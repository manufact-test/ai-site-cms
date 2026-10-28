'use strict';
// Non-executing, manifest-aware proposals only. The actual CMS may have user
// overrides/history. All changes require the lead's explicit review and Save/Publish.
const {checkBlueprint}=require('./blueprint.cjs');
const FORMAT='manufact-seo-content-field-proposals-v1';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function propose(site,manifests,blueprint){
 const plan=checkBlueprint(blueprint);
 if(site.siteId!==plan.siteId)throw Error('SEO content proposal: siteId mismatch');
 const byPage=new Map(site.pages.map(p=>[p.id,p]));
 const manifestsById=new Map(manifests.map(m=>[m.id,m]));
 const proposed=[],blocked=[],unchanged=[];
 const fail=(pageId,sectionId,field,reason,details={})=>
  blocked.push({pageId,sectionId,field,reason,...details});
 for(const bp of plan.pages){
  const page=byPage.get(bp.id);
  if(!page){fail(bp.id,null,null,'page-not-implemented');continue;}
  for(const section of bp.sections){
   const actual=page.sections.find(s=>s.id===section.id);
   if(!actual){fail(bp.id,section.id,null,'section-not-mapped');continue;}
   const manifest=manifestsById.get(actual.component);
   if(!manifest){fail(bp.id,section.id,null,'component-manifest-unavailable',{component:actual.component});continue;}
   if(actual.manifestVersion!==manifest.version){
    fail(bp.id,section.id,null,'manifest-version-mismatch',{component:actual.component,sectionManifestVersion:actual.manifestVersion,manifestVersion:manifest.version});
    continue;
   }
   function editable(element,field,value,reason,reasonCode){
    const definition=manifest.elements?.find(el=>el.slot===element.slot)
     ?.fields?.find(f=>f.path===field);
    if(!definition||!(definition.type==='text'&&field==='content.text'||definition.type==='url'&&field==='behavior.href')){
     fail(bp.id,section.id,field,'field-not-supported-by-manifest',{elementId:element.id,component:manifest.id});return;
    }
    const before=element.values?.[field];
    if(typeof before!=='string'){
     fail(bp.id,section.id,field,'original-field-not-string',{elementId:element.id});return;
    }
    if(typeof value!=='string'||value.length>(definition.maxLength||300)&&definition.type==='text'){
     fail(bp.id,section.id,field,'value-exceeds-manifest-limit',{elementId:element.id,maxLength:definition.maxLength});return;
    }
    if(definition.type==='url'&&!/^\/(?:[a-z0-9-]+\/)*$/.test(value)){
     fail(bp.id,section.id,field,'invalid-target-url',{elementId:element.id});return;
    }
    if(before===value){unchanged.push({pageId:bp.id,sectionId:section.id,elementId:element.id,field});return;}
    proposed.push({
     proposalId:[bp.id,section.id,element.id,field].join(':'),
     pageId:bp.id,pagePath:page.path,sectionId:section.id,componentId:manifest.id,
     elementId:element.id,field,locator:{pageId:bp.id,sectionId:section.id,elementId:element.id,property:field},
     preconditions:{siteId:site.siteId,sectionManifestVersion:actual.manifestVersion,expectedBefore:before},
     before,after:value,reason,reasonCode,
     manifestField:{type:definition.type,maxLength:definition.maxLength||null},
     automatic:false,reviewRequired:true,
     safety:'Proposal only; review manual/approved overrides before applying in the existing CMS.'
    });
   }
   const headings=(actual.elements||[]).filter(e=>e.slot==='heading');
   if(headings.length!==1)fail(bp.id,section.id,'content.text','ambiguous-heading-element',{candidateCount:headings.length});
   else editable(headings[0],'content.text',section.heading,
    'Approved section-heading wording differs from implemented content; check whether intentional.','approved-heading-diff');
   if(!section.cta)continue;
   const candidates=(actual.elements||[]).filter(e=>{
    const def=manifest.elements?.find(t=>t.slot===e.slot);
    return def?.fields?.some(f=>f.path==='content.text'&&f.type==='text')&&
           def.fields.some(f=>f.path==='behavior.href'&&f.type==='url')&&
           typeof e.values?.['behavior.href']==='string';
   });
   if(candidates.length!==1){
    fail(bp.id,section.id,'behavior.href','ambiguous-cta-element',{candidateCount:candidates.length});
    continue;
   }
   const target=byPage.get(section.cta.toPageId);
   if(!target){fail(bp.id,section.id,'behavior.href','target-page-not-implemented',{targetPageId:section.cta.toPageId});continue;}
   if(target.path!==plan.pages.find(x=>x.id===target.id)?.path){
    fail(bp.id,section.id,'behavior.href','target-path-differs-from-blueprint',{targetPageId:target.id,actualPath:target.path});
    continue;
   }
   editable(candidates[0],'content.text',section.cta.label,
    'Proposed CTA label from approved blueprint; verify clear, accessible wording.','cta-label-diff');
   editable(candidates[0],'behavior.href',target.path,
    'Proposed CTA destination from approved blueprint; verify destination and interaction semantics.','cta-route-diff');
  }
 }
 return {format:FORMAT,version:1,siteId:site.siteId,readOnly:true,
  proposals:proposed,blocked,unchangedCount:unchanged.length,
  boundaries:'Only unambiguous existing section/element IDs, exact manifest versions, and fields already in the existing CMS contract. All proposals non-executing and subject to manual override/conflict review; no images, schema, canonical, page creation, node layout or CMS data mutation.'};
}
module.exports=Object.freeze({FORMAT,propose});
