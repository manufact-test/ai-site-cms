'use strict';
// Explicit human decision ledger. An approval is NOT a CMS mutation, verification
// of a repaired issue, or release authorization.
const FORMAT='manufact-seo-triage-v1';
function reconcile(backlog,ledger){
 if(!backlog||backlog.format!=='manufact-seo-remediation-v1'||!backlog.readOnly||!Array.isArray(backlog.tasks))
  throw Error('Expected current read-only SEO backlog');
 if(!ledger||ledger.format!==FORMAT||ledger.siteId!==backlog.siteId||
  !Array.isArray(ledger.decisions)||ledger.decisions.length>2000)
  throw Error('Invalid SEO triage ledger');
 const known=new Map(backlog.tasks.map(t=>[t.taskId,t])),seen=new Set(),accepted=[],rejected=[],deferred=[],stale=[];
 for(const d of ledger.decisions){
  if(!d||typeof d.taskId!=='string'||typeof d.taskKey!=='string'||
   !['approve','reject','defer'].includes(d.decision)||
   typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>500||
   Object.keys(d).some(k=>!['taskId','taskKey','decision','reason','expectedBefore','expectedAfter'].includes(k)))
   throw Error('Invalid triage decision');
  if(seen.has(d.taskId))throw Error('Duplicate triage decision');
  seen.add(d.taskId);
  const task=known.get(d.taskId);
  if(!task||task.key!==d.taskKey||
   (task.field&&( !Object.prototype.hasOwnProperty.call(d,'expectedBefore')||
    !Object.prototype.hasOwnProperty.call(d,'expectedAfter')))||
   (Object.prototype.hasOwnProperty.call(d,'expectedBefore')&&
      JSON.stringify(d.expectedBefore)!==JSON.stringify(task.before))||
   (Object.prototype.hasOwnProperty.call(d,'expectedAfter')&&
      JSON.stringify(d.expectedAfter)!==JSON.stringify(task.after))){
   stale.push({taskId:d.taskId,reason:'task-missing-or-proposal-changed',decision:d.decision});
   continue;
  }
  const item={taskId:task.taskId,taskKey:task.key,decision:d.decision,reason:d.reason,
   requiresHumanReview:true,automatic:false,status:'recorded-human-decision',
   note:'This decision does not verify the repair or permit an automatic release.'};
  if(d.decision==='approve')accepted.push(item);
  else if(d.decision==='reject')rejected.push(item);
  else deferred.push(item);
 }
 const undecided=backlog.tasks.filter(t=>!seen.has(t.taskId)).map(t=>({
  taskId:t.taskId,priority:t.priority,owner:t.owner,pageId:t.pageId}));
 return {format:'manufact-seo-triage-result-v1',version:1,siteId:backlog.siteId,
  readOnly:true,releaseAuthorized:false,automaticChanges:0,
  summary:{approved:accepted.length,rejected:rejected.length,deferred:deferred.length,
   stale:stale.length,undecided:undecided.length},
  approved:accepted,rejected,deferred,stale,undecided,
  limits:'A decision is an accountable review record only. Even approved field proposals must be rechecked against manual overrides and the current CMS state, then saved/published by authorized humans. Re-run regression and live acceptance to verify repairs.'};
}
module.exports=Object.freeze({FORMAT,reconcile});
