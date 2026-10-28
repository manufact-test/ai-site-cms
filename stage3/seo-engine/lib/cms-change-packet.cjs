'use strict';
// Lead-facing, guarded CMS change packet. Absolutely no writes, no apply callbacks.
// Derives every field value from the approved blueprint and the authoritative current Site v1.
const {checkBlueprint}=require('./blueprint.cjs');
const {compile:execution}=require('./execution-plan.cjs');
const FORMAT='manufact-seo-cms-change-packet-v1';
const SEO_FIELDS=new Set(['seo.title','seo.description','seo.robots','seo.ogTitle','seo.ogDescription']);
function build(site,manifests,blueprint,backlog,decisions=null){
 const plan=checkBlueprint(blueprint);
 if(!site||site.siteId!==plan.siteId||!Array.isArray(site.pages)||!Array.isArray(manifests)||
  backlog?.siteId!==site.siteId||backlog?.format!=='manufact-seo-remediation-v1'||!backlog.readOnly)
  throw Error('CMS packet requires same-site validated Site v1, blueprint and read-only backlog');
 const queue=execution(backlog,decisions);
 const taskStatus=new Map(queue.items.map(t=>[t.taskId,t]));
 const approved=new Set(decisions?.approved.map(x=>x.taskId)||[]);
 const pages=new Map(site.pages.map(p=>[p.id,p]));
 const planned=new Map(plan.pages.map(p=>[p.id,p]));
 const registry=new Map(manifests.map(m=>[m.id,m]));
 const operations=[],blocked=[],pending=[];
 for(const task of backlog.tasks){
  if(!task.field||!task.key.startsWith('cms-'))continue;
  const state=taskStatus.get(task.taskId);
  const result={taskId:task.taskId,taskKey:task.key,pageId:task.pageId,
   sectionId:task.sectionId||null,field:task.field,owner:task.owner,
   priority:task.priority,decision:state?.decision||'undecided',automatic:false,
   currentSiteWritePerformed:false,requiresManualOverrideReview:true,
   source:'approved-blueprint-and-current-site-v1'};
  const fail=(code,explain)=>blocked.push({...result,reasonCode:code,explanation:explain});
  if(state?.status==='excluded-by-human-decision'||state?.status==='deferred-by-human-decision'){
   pending.push({...result,reasonCode:state.status});continue;
  }
  if(!approved.has(task.taskId)||state?.status==='refresh-stale-decision'){
   pending.push({...result,reasonCode:state?.status||'not-approved'});continue;
  }
  if(state?.dependencies.length){
   fail('dependencies-unresolved','One or more dependency tasks remain in the current backlog. Human approval alone is not completion.');continue;
  }
  const page=pages.get(task.pageId),spec=planned.get(task.pageId);
  if(!page||!spec||page.path!==spec.path){
   fail('page-or-route-changed','Page stable ID or approved route differs from current Site v1.');continue;
  }
  if(task.key.startsWith('cms-seo|')){
   if(!SEO_FIELDS.has(task.field)||task.key!==['cms-seo',task.pageId,task.field].join('|')){
    fail('unsupported-seo-field','Only the existing five editable page SEO fields are supported.');continue;
   }
   const key=task.field.slice(4);
   const current=page.seo?.[key]??(key==='robots'?'index':'');
   if(current!==task.before||spec.seo[key]!==task.after){
    fail('source-value-drift','Current field value or approved blueprint value changed since this task was proposed.');continue;
   }
   operations.push({...result,target:{pageId:page.id,property:task.field},
    expectedBefore:task.before,proposedAfter:task.after,
    manifestGuard:null,application:'existing-cms-manual-field-review'});
   continue;
  }
  if(!task.key.startsWith('cms-content|')||
   !['content.text','behavior.href'].includes(task.field)||
   task.key.split('|').length!==5){
   fail('unsupported-content-mapping','Not a supported exact content field task.');continue;
  }
  const loc=task.locator,section=page.sections?.find(x=>x.id===task.sectionId);
  const planSection=spec.sections.find(x=>x.id===task.sectionId);
  const element=section?.elements?.find(x=>x.id===loc?.elementId);
  const manifest=registry.get(section?.component);
  if(!section||!planSection||!element||!manifest||manifest.version!==section.manifestVersion||
   loc?.pageId!==page.id||loc?.sectionId!==section.id||loc?.property!==task.field){
   fail('component-or-manifest-drift','Stable IDs, locator or exact component manifest version do not match.');continue;
  }
  const definition=manifest.elements?.find(x=>x.slot===element.slot)?.fields?.find(x=>x.path===task.field);
  const expectedType=task.field==='behavior.href'?'url':'text';
  if(definition?.type!==expectedType){
   fail('manifest-field-not-editable','Current manifest does not permit this exact typed field.');continue;
  }
  // Reconstruct the *same exact candidates* as field-proposals.cjs; do not
  // infer an editable CTA merely because some element happens to have an href.
  const headingCandidates=(section.elements||[]).filter(e=>e.slot==='heading');
  const ctaCandidates=(section.elements||[]).filter(e=>{
   const spec=manifest.elements?.find(x=>x.slot===e.slot);
   return spec?.fields?.some(x=>x.path==='content.text'&&x.type==='text')&&
    spec.fields.some(x=>x.path==='behavior.href'&&x.type==='url')&&
    typeof e.values?.['behavior.href']==='string';
  });
  const isHeading=element.slot==='heading'&&headingCandidates.length===1&&
   headingCandidates[0].id===element.id;
  const isCta=planSection.cta&&ctaCandidates.length===1&&
   ctaCandidates[0].id===element.id;
  let expected;
  if(isHeading&&task.field==='content.text')expected=planSection.heading;
  else if(isCta){
   const target=planned.get(planSection.cta.toPageId);
   const authoredTarget=pages.get(planSection.cta.toPageId);
   if(!target||!authoredTarget||authoredTarget.path!==target.path){
    fail('blueprint-cta-unavailable','Approved target is missing or the actual destination route differs.');continue;
   }
   expected=task.field==='behavior.href'?target.path:planSection.cta.label;
  }else{
   fail('ambiguous-copy-mapping',
    'Only one exact heading slot and one unambiguous manifest-declared CTA can receive human review.');continue;
  }
  if(task.key!==['cms-content',page.id,section.id,element.id,task.field].join('|')||
   element.values?.[task.field]!==task.before||expected!==task.after){
   fail('source-value-drift','Current value or approved target differs from recorded proposal.');continue;
  }
  if(typeof expected!=='string'||(expectedType==='text'&&expected.length>definition.maxLength)){
   fail('value-outside-manifest','Proposed value is outside current typed manifest bounds.');continue;
  }
  operations.push({...result,target:{pageId:page.id,sectionId:section.id,
   component:section.component,elementId:element.id,property:task.field},
   expectedBefore:task.before,proposedAfter:task.after,
   manifestGuard:{component:section.component,version:section.manifestVersion,fieldType:definition.type},
   application:'existing-cms-manual-field-review'});
 }
 return {format:FORMAT,version:1,siteId:site.siteId,readOnly:true,
  automaticApplication:false,releaseAuthorized:false,
  summary:{eligibleForManualReview:operations.length,blocked:blocked.length,
   pendingDecisionOrDeferred:pending.length,actualWrites:0},
  operations,blocked,pending,
  instructions:['Compare every expectedBefore to the currently saved CMS value and manual override history.',
   'Reconfirm source facts, current component manifest and client-approved prototype revision.',
   'Use only existing CMS field editor; Save does not mean Publish.',
   'Re-export Site v1, regenerate backlog and verify the intended change and all dependencies.',
   'Obtain browser, live HTTP, security, mobile and user approval independently.'],
  limitations:'These are guarded source-value proposals, not an executable patch or transaction. Even eligible operations require a human and may already be stale relative to newer CMS saves.'};
}
function markdown(packet){
 if(!packet||packet.format!==FORMAT||!packet.readOnly)throw Error('Invalid CMS change packet');
 const safe=x=>String(x??'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\\/g,'\\\\')
  .replace(/[<>&*_[\](){}#!|]/g,c=>'\\'+c).replace(/\x60/g,'\\'+String.fromCharCode(96)).slice(0,250);
 const lines=['# Approved SEO fields for human CMS review','',
  'Site: '+safe(packet.siteId)+'; current eligible operations: '+packet.operations.length+
   '; blocked: '+packet.blocked.length+'; pending: '+packet.pending.length+'.','',
  'These are proposals only. Never paste values without rechecking the saved manual override and exact source value.','',
  '## Eligible for manual consideration',''];
 for(const op of packet.operations){
  lines.push('### '+safe(op.taskId)+' · '+safe(op.field),'',
   '- Target: '+safe(op.pageId)+(op.sectionId?' / '+safe(op.sectionId):'')+'.',
   '- Expected current field: '+safe(JSON.stringify(op.expectedBefore))+'.',
   '- Proposed approved value: '+safe(JSON.stringify(op.proposedAfter))+'.',
   '- Exact manifest version: '+safe(op.manifestGuard?.version||'page SEO field')+'.',
   '- Review and edit in existing CMS; Save/Publish, browser and rollback must be confirmed manually.','');
 }
 lines.push('## Blocked and pending proposals','');
 for(const op of [...packet.blocked,...packet.pending])
  lines.push('- '+safe(op.taskId)+' · '+safe(op.reasonCode)+' (no changes allowed).');
 lines.push('','## Mandatory lead checks','');
 for(const item of packet.instructions)lines.push('- [ ] '+safe(item));
 lines.push('','Read-only handoff. No CMS writes, no deployment authorization.');
 return lines.join('\n');
}
module.exports=Object.freeze({FORMAT,build,markdown});
