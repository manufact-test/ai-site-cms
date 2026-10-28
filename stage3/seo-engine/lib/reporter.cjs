'use strict';
// Plain Markdown for a lead handoff. Escapes all untrusted owner/site text.
const FORMAT='manufact-seo-remediation-v1';
function safe(value){
 return String(value??'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\\/g,'\\\\')
  .replace(/[<>&*_\u0060\[\](){}#!|]/g,c=>'\\'+c)
  .replace(/https?:\/\/\S+/gi,match=>match.slice(0,220));
}
function short(value,max=160){
 const s=safe(value);return s.length>max?s.slice(0,max)+'…':s;
}
function write(plan,release,options={}){
 if(!plan||plan.format!==FORMAT||!Array.isArray(plan.tasks))throw Error('Expected SEO remediation plan');
 if(release&&release.siteId!==plan.siteId)throw Error('Release review siteId mismatch');
 const max=Number.isInteger(options.maxTasks)?Math.max(1,Math.min(500,options.maxTasks)):80;
 const lines=[
  '# SEO implementation & remediation handoff','',
  '**Project:** '+safe(plan.siteId),
  '**Source:** approved SEO blueprint + validated Site v1'+(plan.inputs.htmlSnapshotProvided?' + supplied static HTML snapshot':''),
  '**Status:** read-only proposals; no CMS edit, branch merge or production deployment was performed.','',
  '## Delivery overview','',
  '- Proposed review tasks: **'+plan.summary.total+'** (P0 '+plan.summary.byPriority.P0+
    ', P1 '+plan.summary.byPriority.P1+', P2 '+plan.summary.byPriority.P2+', P3 '+plan.summary.byPriority.P3+').',
  '- Existing CMS field proposals: **'+plan.summary.cmsFieldProposals+'**; evidence requests: **'+plan.summary.evidenceRequired+'**.',
  '- Priorities are workflow triage, not SEO scores or ranking predictions.',''
 ];
 if(release){
  lines.push('## Prepublication gate','',
   'Decision: **'+safe(release.decision)+'**; automatic release approval: **never**.','');
  if(release.blockers.length){
   lines.push('Blocking observations:');
   for(const b of release.blockers)lines.push('- **'+safe(b.title)+'** — '+short(b.detail,230));
   lines.push('');
  }
  lines.push('Mandatory human acceptance remains required for three prototypes, visual fidelity, forms/actions, live host metadata, accessibility, performance and rollback.','');
 }
 lines.push('## Action packages','');
 const grouped=new Map(plan.packages.map(p=>[p.phase,p.taskIds]));
 const byId=new Map(plan.tasks.map(t=>[t.taskId,t]));
 let printed=0;
 for(const [phase,ids] of grouped){
  const remain=max-printed;if(remain<=0)break;
  lines.push('### '+safe(phase)+' ('+ids.length+')','');
  for(const id of ids.slice(0,remain)){
   const t=byId.get(id);
   lines.push('- **'+safe(t.taskId)+' · '+safe(t.priority)+' · '+safe(t.category)+'** · '+safe(t.owner)+
    ' · page '+safe(t.pageId||'site')+(t.sectionId?' / section '+safe(t.sectionId):'')+'.');
   lines.push('  - '+short(t.instruction,260));
   if(t.field)lines.push('  - Field: '+safe(t.field)+
    (t.locator?.elementId?', element '+safe(t.locator.elementId):'')+'.');
   if(t.before!==null||t.after!==null)lines.push('  - Observed: '+short(t.before,130)+
    ' → suggested: '+short(t.after,130)+'.');
   if(t.sources.length)lines.push('  - Evidence: '+t.sources.slice(0,4).map(s=>safe(s.code||s.reasonCode||s.reason||s.field||s.kind)).join(', ')+'.');
   const details=t.sources.filter(s=>s.topic||s.proposedAnchor||s.assetId||s.factIds).slice(0,5)
    .map(s=>[s.topic?'topic '+short(s.topic,70):null,
      s.proposedAnchor?'anchor '+short(s.proposedAnchor,70):null,
      s.assetId?'asset '+short(s.assetId,70):null,
      s.factIds?'facts '+short(s.factIds.join(', '),90):null].filter(Boolean).join('; '));
   if(details.length)lines.push('  - Specific context: '+details.join(' | ')+'.');
   if(t.dependsOn.length)lines.push('  - Depends on: '+t.dependsOn.map(safe).join(', ')+'.');
   printed++;
  }
  lines.push('');
 }
 if(printed<plan.tasks.length)lines.push('**'+(plan.tasks.length-printed)+' additional tasks omitted from this display; the complete JSON plan retains all of them.**','');
 lines.push('## Integration safety','',
  'No task here is executable without review. The lead must check the specific site version and manual overrides before editing existing CMS fields. Unsupported canonical overrides, JSON-LD implementation, new pages and unmapped sections remain developer work.','',
  'No promises about organic traffic, rankings, conversion lift, Core Web Vitals, or browser-rendered mobile content are made.','');
 return lines.join('\n');
}
module.exports=Object.freeze({write});
