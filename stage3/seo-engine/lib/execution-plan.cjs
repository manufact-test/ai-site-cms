'use strict';
// Lead-facing dependency-aware manual execution plan. Triage approval is NOT task completion.
const FORMAT='manufact-seo-execution-plan-v1';
const PHASES=['verify-facts','plan-approval','developer-work','cms-review','validation'];
const PRIORITY={P0:0,P1:1,P2:2,P3:3};
const safe=x=>String(x??'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\\/g,'\\\\')
 .replace(/[<>&*_[\](){}#!|]/g,c=>'\\'+c).replace(/\x60/g,'\\'+String.fromCharCode(96)).slice(0,300);
function compile(backlog,decisions=null){
 if(!backlog||backlog.format!=='manufact-seo-remediation-v1'||!backlog.readOnly||
  !Array.isArray(backlog.tasks))throw Error('Expected current SEO read-only remediation backlog');
 if(decisions&&(decisions.siteId!==backlog.siteId||decisions.format!=='manufact-seo-triage-result-v1'||
  !decisions.readOnly||decisions.releaseAuthorized!==false))
  throw Error('Invalid reconciled human decisions');
 const recorded=new Map(),stale=new Map();
 for(const type of ['approved','rejected','deferred'])for(const d of decisions?.[type]||[])
  recorded.set(d.taskId,{type,reason:d.reason});
 for(const d of decisions?.stale||[])stale.set(d.taskId,d);
 const byId=new Map(backlog.tasks.map(t=>[t.taskId,t]));
 const items=backlog.tasks.map(t=>{
  const human=recorded.get(t.taskId);
  const invalid=stale.get(t.taskId);
  const state=invalid?'stale-decision':human?human.type:'undecided';
  const missingDependencies=(t.dependsOn||[]).filter(id=>!byId.has(id));
  const activeDependencies=(t.dependsOn||[]).filter(id=>byId.has(id));
  const blockers=activeDependencies.map(id=>{
   const ancestor=recorded.get(id),isStale=stale.has(id);
   return {taskId:id,phase:byId.get(id).phase,
    status:isStale?'stale-decision':ancestor?.type||'undecided',
    note:'Dependency still exists in current backlog; human approval does not mark it complete.'};
  });
  if(missingDependencies.length)for(const id of missingDependencies)
   blockers.push({taskId:id,phase:null,status:'unresolved-reference',
    note:'Dependency task ID is absent; review its resolution in current Site v1 and history.'});
  const eligible=state==='approved'&&blockers.length===0;
  const lane=state==='rejected'?'excluded-by-human-decision':
   state==='deferred'?'deferred-by-human-decision':
   state==='stale-decision'?'refresh-stale-decision':
   blockers.length?'blocked-on-unresolved-dependency':
   state==='approved'?'approved-for-manual-work':'awaiting-human-decision';
  return {taskId:t.taskId,key:t.key,pageId:t.pageId||null,pagePath:t.pagePath||null,
   sectionId:t.sectionId||null,priority:t.priority,phase:t.phase,owner:t.owner,
   category:t.category,field:t.field||null,requiresHumanReview:true,automatic:false,
   taskStillOpen:true,decision:state,decisionReason:human?.reason||null,
   status:lane,readyForManualAction:eligible,
   instruction:t.instruction,preconditions:t.preconditions||null,
   before:t.before??null,after:t.after??null,
   dependencies:blockers,sourceCodes:(t.sources||[]).map(x=>x.code||x.reason||x.kind).filter(Boolean),
   request:'Verify current Site v1, saved CMS overrides, source fact and actual outcome before applying any authorized change.'};
 });
 items.sort((a,b)=>(PRIORITY[a.priority]??99)-(PRIORITY[b.priority]??99)||
   (PHASES.indexOf(a.phase)+1||99)-(PHASES.indexOf(b.phase)+1||99)||
   a.taskId.localeCompare(b.taskId));
 const states=['approved-for-manual-work','awaiting-human-decision','blocked-on-unresolved-dependency',
  'refresh-stale-decision','deferred-by-human-decision','excluded-by-human-decision'];
 const lanes=Object.fromEntries(states.map(s=>[s,items.filter(x=>x.status===s).map(x=>x.taskId)]));
 const byPhase=PHASES.map(phase=>{
  const subset=items.filter(x=>x.phase===phase);
  return {phase,total:subset.length,
   approvedForManualWork:subset.filter(x=>x.readyForManualAction).length,
   decisionsPending:subset.filter(x=>x.decision==='undecided').length,
   dependencyBlocked:subset.filter(x=>x.dependencies.length>0).length,
   taskIds:subset.map(x=>x.taskId)};
 });
 const ownerGroups=[...new Set(items.map(x=>x.owner))].sort().map(owner=>({
  owner,total:items.filter(t=>t.owner===owner).length,
  approvedForManualWork:items.filter(t=>t.owner===owner&&t.readyForManualAction).length,
  taskIds:items.filter(t=>t.owner===owner).map(t=>t.taskId)
 }));
 const recommendations=[
  ...items.filter(x=>x.status==='refresh-stale-decision'),
  ...items.filter(x=>x.status==='approved-for-manual-work'),
  ...items.filter(x=>x.status==='awaiting-human-decision'),
  ...items.filter(x=>x.status==='blocked-on-unresolved-dependency')
 ].slice(0,30).map(t=>({taskId:t.taskId,status:t.status,priority:t.priority,
  owner:t.owner,phase:t.phase,pageId:t.pageId,
  instruction:t.instruction,dependencyCount:t.dependencies.length,
  automatic:false}));
 const summary={total:items.length,
  ...Object.fromEntries(states.map(s=>[s,lanes[s].length])),
  humanDecisionsRecorded:decisions?decisions.summary.approved+decisions.summary.rejected+
   decisions.summary.deferred:0,
  staleHumanDecisions:decisions?.summary.stale??0,
  tasksAutomaticallyApplied:0,releaseAuthorized:false};
 return {format:FORMAT,version:1,siteId:backlog.siteId,readOnly:true,
  summary,lanes,phases:byPhase,owners:ownerGroups,items,nextReviewActions:recommendations,
  decisionsSupplied:Boolean(decisions),
  interpretation:'Approval permits an explicitly reviewed manual change, not task completion. Any active dependency remains open until the site is changed and a new reviewed backlog confirms closure.',
  boundaries:'Does not mutate Site v1, validate a live site, mark dependencies complete, approve deployment, or provide ranking forecasts.'};
}
function markdown(plan){
 if(!plan||plan.format!==FORMAT||!plan.readOnly)throw Error('Expected execution plan');
 const lines=['# SEO implementation execution plan','',
  'Site: '+safe(plan.siteId)+' · read-only, no automatic CMS work or release.','',
  'Current tasks: '+plan.summary.total+
   '; approved/manual: '+plan.summary['approved-for-manual-work']+
   '; pending human decisions: '+plan.summary['awaiting-human-decision']+
   '; blocked: '+plan.summary['blocked-on-unresolved-dependency']+
   '; stale: '+plan.summary['refresh-stale-decision']+'.','',
  '## Workstreams',''];
 for(const phase of plan.phases){
  lines.push('### '+safe(phase.phase)+' ('+phase.total+' tasks)','',
   'Eligible for reviewed manual action: '+phase.approvedForManualWork+
   '; decisions pending: '+phase.decisionsPending+
   '; unresolved dependencies: '+phase.dependencyBlocked+'.','');
 }
 lines.push('## Next review actions','');
 for(const t of plan.nextReviewActions){
  lines.push('- **'+safe(t.taskId)+'** · '+safe(t.status)+' · '+safe(t.priority)+
   ' · '+safe(t.owner)+' · '+safe(t.phase)+
   (t.pageId?' · '+safe(t.pageId):'')+
   ' · '+safe(t.instruction)+
   (t.dependencyCount?' (blocked by '+t.dependencyCount+' dependencies)':''));
 }
 lines.push('','## Release boundary','',
  '- [ ] Verify and close remaining tasks against the updated Site v1, not approval records.',
  '- [ ] Run the public HTTP, browser, responsive, forms and actual CMS publication checks.',
  '- [ ] Obtain the site owner and lead developer acceptance before publishing.',
  '','No automated changes or automatic release are allowed.');
 return lines.join('\n');
}
module.exports=Object.freeze({FORMAT,compile,markdown});
