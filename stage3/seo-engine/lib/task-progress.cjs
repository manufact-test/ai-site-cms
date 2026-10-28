'use strict';
// Compare like-for-like Site v1 authoring backlogs across revisions.
// Evidence from the current deployment is intentionally excluded from this comparison.
const {checkBlueprint}=require('./blueprint.cjs');
const {work}=require('./remediation.cjs');
const {reconcile}=require('./triage.cjs');
const FORMAT='manufact-seo-task-progress-v1';
function compare(before,after,manifests,blueprint,priorDecisions=null){
 const plan=checkBlueprint(blueprint);
 if(!before||!after||before.siteId!==after.siteId||after.siteId!==plan.siteId)
  throw Error('Task progress needs two same-site Site v1 revisions');
 if(!Array.isArray(manifests))throw Error('Task progress requires authoritative component manifests');
 // Same blueprint, same manifests, same evidence scope (none).
 // This prevents "resolved" caused only by a missing capture in a different run.
 const old=work(before,manifests,plan,{}),current=work(after,manifests,plan,{});
 const previous=new Map(old.tasks.map(t=>[t.key,t]));
 const active=new Map(current.tasks.map(t=>[t.key,t]));
 const decisions=priorDecisions?reconcile(old,priorDecisions):null;
 const decisionById=new Map();
 for(const type of ['approved','rejected','deferred'])
  for(const d of decisions?.[type]||[])decisionById.set(d.taskId,type);
 const repaired=[],introduced=[],persistent=[],modified=[];
 const value=v=>JSON.stringify(v);
 const record=(task,state,prior=null)=>({
  taskId:task.taskId,key:task.key,pageId:task.pageId,field:task.field,
  priority:task.priority,phase:task.phase,owner:task.owner,state,
  priorDecision:prior?decisionById.get(prior.taskId)||'undecided':null,
  previousValue:prior?.before??null,previousProposedAfter:prior?.after??null,
  currentValue:task.before??null,currentProposedAfter:task.after??null,
  automatic:false,closureVerified:false});
 for(const [key,task] of previous){
  const now=active.get(key);
  if(!now)repaired.push(record(task,'no-longer-in-current-site-only-backlog',task));
  else if(value(task.before)!==value(now.before)||value(task.after)!==value(now.after)||
   value(task.locator)!==value(now.locator))
    modified.push(record(now,'changed-task-preconditions',task));
  else persistent.push(record(now,'still-open',task));
 }
 for(const [key,task] of active)if(!previous.has(key))
  introduced.push(record(task,'new-site-only-task'));
 // Cross-link only old field proposals with actual new authored value for task closure hint.
 const oldPages=new Map(before.pages.map(p=>[p.id,p]));
 const newPages=new Map(after.pages.map(p=>[p.id,p]));
 function actualField(page,task){
  if(!page)return undefined;
  if(task.key.startsWith('cms-seo|'))return page.seo?.[task.field.slice(4)]??(task.field==='seo.robots'?'index':'');
  if(task.key.startsWith('cms-content|')){
   const loc=task.locator;return page.sections?.find(s=>s.id===loc?.sectionId)
    ?.elements?.find(x=>x.id===loc.elementId)?.values?.[task.field];
  }
  return undefined;
 }
 const changes=repaired.filter(x=>x.field).map(x=>{
  const task=previous.get(x.key),nowPage=newPages.get(task.pageId),
   previousActual=actualField(oldPages.get(task.pageId),task),
   currentActual=actualField(nowPage,task);
  return {...x,expectedBeforeMatched:value(previousActual)===value(task.before),
   currentEqualsProposed:value(currentActual)===value(task.after),
   currentObservedValue:currentActual??null,
   closureCandidate:value(previousActual)===value(task.before)&&
    value(currentActual)===value(task.after),
   closureVerified:false};
 });
 const hints=new Map(changes.map(x=>[x.taskId,x]));
 const resolved=repaired.map(x=>hints.get(x.taskId)||x);
 const approvedResolved=resolved.filter(x=>x.priorDecision==='approved'&&x.closureCandidate).length;
 return {format:FORMAT,version:1,siteId:after.siteId,readOnly:true,
  scope:'like-for-like-site-v1-authoring-only',
  summary:{previousSiteTasks:old.tasks.length,currentSiteTasks:current.tasks.length,
   noLongerPresent:resolved.length,introduced:introduced.length,persistent:persistent.length,
   changedPreconditions:modified.length,
   approvedFieldClosureCandidates:approvedResolved,
   provenCompletedTasks:0,productionVerifiedClosures:0},
  noLongerPresent:resolved,introduced,persistent,changedPreconditions:modified,
  decisionReconciliation:decisions?decisions.summary:null,
  historyRestored:false,automaticChanges:0,releaseAuthorized:false,
  limitations:'A vanished task or a matching authored field is only a closure candidate. Cannot prove approved intent, real rendered HTML, manual overrides, HTTP publication, regression safety or release. Supplied deployment evidence is deliberately excluded from both revisions to prevent false resolution.'};
}
module.exports=Object.freeze({FORMAT,compare});
