'use strict';
/* Human-reviewed crawl CMS task decisions and two-period evidence comparison.
 * Operator-supplied evidence is NOT real publisher / owner authentication.
 */
const {FORMAT:WORKLIST}=require('./crawl-cms-implementation.cjs');
const LEDGER='manufact-seo-crawl-cms-decision-ledger-v1';
const RECHECK='manufact-seo-crawl-cms-recheck-v1';
const SHA=/^[a-f0-9]{64}$/;
const STATUSES=['unreviewed','accepted','in-progress','completed-reported','deferred','rejected'];
const PRIORITIES=['P0','P1','P2'];
const verify=(x,msg)=>{if(!x)throw Error('Crawl CMS lifecycle: '+msg);};
const safe=x=>String(x??'').replace(/[|<>\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,300);
const date=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&
 !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function checkWorklist(report,rawSha){
 verify(report?.format===WORKLIST&&report.version===1&&report.readOnly===true&&
  report.releaseAuthorized===false&&report.automaticApplication===false&&
  SHA.test(rawSha||'')&&SHA.test(report.approvedBlueprintCanonicalSha256||'')&&
  SHA.test(report.originalBlueprintRawSha256||'')&&SHA.test(report.originalSiteRawSha256||'')&&
  typeof report.siteId==='string'&&report.siteId.length>0&&
  typeof report.base==='string'&&/^https:\/\//.test(report.base)&&report.base.endsWith('/')&&
  Array.isArray(report.actions)&&report.actions.length<=2500&&
  report.originalSiteAuthenticated===false&&report.publicHostAuthenticated===false&&
  report.ownerApprovalAuthenticated===false,
 'private, nonauthorizing original worklist + raw input SHA256 required');
 const seen=new Set();
 for(const task of report.actions){
  verify(task&&typeof task.taskId==='string'&&/^crawl-cms:[0-9a-f]{24}$/.test(task.taskId)&&
   !seen.has(task.taskId)&&PRIORITIES.includes(task.priority)&&
   typeof task.category==='string'&&task.category.length<=80&&
   typeof task.ownerTeam==='string'&&
   ['CMS_EDITOR','PUBLISHER_LEAD','SEO_OPERATOR','OWNER_AND_LEAD'].includes(task.ownerTeam)&&
   (task.pageId===null||typeof task.pageId==='string')&&
   (task.path===null||typeof task.path==='string')&&
   typeof task.detail==='string'&&task.detail.length<=900&&
   typeof task.source==='string'&&task.source.length<=120&&
   (task.issueKey===undefined||/^crawl-topic:[0-9a-f]{24}$/.test(task.issueKey))&&
   task.automatic===false&&task.readyToImplement===false&&
   task.ownerApprovalRequired===true&&Array.isArray(task.evidenceRequired)&&
   task.evidenceRequired.length>=1&&task.evidenceRequired.length<=12,
   'malformed, unauthorized or duplicated task ID');
  seen.add(task.taskId);
 }
 return report;
}
function template(report,rawSha){
 checkWorklist(report,rawSha);
 return {format:LEDGER,version:1,siteId:report.siteId,base:report.base,
  sourceWorklistRawSha256:rawSha,
  approvedBlueprintCanonicalSha256:report.approvedBlueprintCanonicalSha256,
  sourceOriginalSiteRawSha256:report.originalSiteRawSha256,
  decisions:report.actions.map(a=>({
   taskId:a.taskId,pageId:a.pageId,path:a.path,priority:a.priority,
   category:a.category,ownerTeam:a.ownerTeam,status:'unreviewed',
   assignee:'',decisionDate:null,rationale:'',manualChangeDescription:'',
   evidenceRefs:[],claimedPublicVerified:false,claimedOwnerSignedOff:false
  })),
  warning:'EDITABLE HUMAN NOTES ONLY. Do not use as authorization for CMS/robots/sitemap publishing.'};
}
function checkDecisions(report,sha,ledger){
 checkWorklist(report,sha);
 verify(ledger?.format===LEDGER&&ledger.version===1&&ledger.siteId===report.siteId&&
  ledger.base===report.base&&ledger.sourceWorklistRawSha256===sha&&
  ledger.approvedBlueprintCanonicalSha256===report.approvedBlueprintCanonicalSha256&&
  ledger.sourceOriginalSiteRawSha256===report.originalSiteRawSha256&&
  Array.isArray(ledger.decisions)&&ledger.decisions.length===report.actions.length,
  'stale/mixed human decision ledger or worklist SHA256');
 const map=new Map(report.actions.map(x=>[x.taskId,x])),decisions=new Map();
 for(const d of ledger.decisions){
  const a=map.get(d.taskId);
  verify(a&&!decisions.has(d.taskId)&&d.pageId===a.pageId&&d.path===a.path&&
   d.priority===a.priority&&d.category===a.category&&d.ownerTeam===a.ownerTeam&&
   STATUSES.includes(d.status)&&typeof d.assignee==='string'&&d.assignee.length<=150&&
   typeof d.rationale==='string'&&d.rationale.length<=1200&&
   typeof d.manualChangeDescription==='string'&&d.manualChangeDescription.length<=1200&&
   (d.decisionDate===null||date(d.decisionDate))&&
   Array.isArray(d.evidenceRefs)&&d.evidenceRefs.length<=16&&
   d.evidenceRefs.every(x=>typeof x==='string'&&x.trim().length>0&&x.length<=400&&
    !/[\x00-\x1f]/.test(x))&&
   d.claimedPublicVerified===false&&d.claimedOwnerSignedOff===false,
   'human decision fields invalid or human claims spoof external authentication');
  if(d.status==='unreviewed'){
   verify(!d.decisionDate&&!d.assignee&&!d.rationale&&!d.manualChangeDescription&&
    d.evidenceRefs.length===0,'unreviewed task must not contain review or evidence claims');
  }else{
   verify(!!d.assignee.trim()&&!!d.rationale.trim()&&!!d.decisionDate,
    'human-reviewed task needs assignee, rationale and actual date');
  }
  if(d.status==='completed-reported')
   verify(!!d.manualChangeDescription.trim()&&d.evidenceRefs.length>0,
    'reported complete needs manual change description and evidence references');
  decisions.set(d.taskId,d);
 }
 verify(decisions.size===report.actions.length,'ledger task coverage mismatch');
 return decisions;
}
function compare(before,beforeSha,after,afterSha,ledger=null,ledgerSha=null){
 checkWorklist(before,beforeSha);checkWorklist(after,afterSha);
 verify(before.siteId===after.siteId&&before.base===after.base&&
  before.approvedBlueprintCanonicalSha256===after.approvedBlueprintCanonicalSha256,
  'comparison requires same client site, exact public mount and canonical approved Blueprint');
 const comparability=x=>({
  agents:Array.isArray(x.crawlerAgents)?x.crawlerAgents:null,
  scope:x.crawlCoverageScope||null,
  sitemapKind:x.sitemapSourceKind||null});
 const sourceBefore=comparability(before),sourceAfter=comparability(after);
 const sameCoverage=JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);
 verify(sameCoverage,
  'cannot compare changed crawler agents, sitemap evidence scope or sitemap XML source type');
 const legacyCoverageUnknown=!sourceBefore.agents||!sourceBefore.scope||!sourceBefore.sitemapKind;
 const decisions=ledger?checkDecisions(before,beforeSha,ledger):new Map();
 if(ledger)verify(SHA.test(ledgerSha||''),'original decision file raw SHA256 required');
 else verify(!ledgerSha,'ledger SHA256 cannot exist without original ledger');
 const old=new Map(before.actions.map(x=>[x.taskId,x])),
  fresh=new Map(after.actions.map(x=>[x.taskId,x]));
 const persistent=[],noLongerSeen=[],newlyObserved=[],changedObservation=[];
 const pRank={P0:0,P1:1,P2:2};
 const guard={};for(const s of STATUSES)guard[s]=0;
 const make=(a,state)=>{
  const decision=decisions.get(a.taskId),status=decision?.status||'unreviewed';
  guard[status]++;
  return {taskId:a.taskId,pageId:a.pageId,path:a.path,
   category:a.category,priority:a.priority,ownerTeam:a.ownerTeam,
   humanDecision:status,assignedTo:decision?.assignee||null,
   decisionDate:decision?.decisionDate||null,
   beforeObservation:a.detail,
   afterObservation:fresh.get(a.taskId)?.detail||null,
   classification:state,
   reportedCompleteIsNotVerified:true,ownerApprovalAuthenticated:false,
   publicHostAuthenticated:false,canAutoClose:false,releaseAuthorized:false};
 };
 const topicMap=(tasks)=>{const res=new Map();
  for(const a of tasks)if(a.issueKey){
   if(!res.has(a.issueKey))res.set(a.issueKey,[]);
   res.get(a.issueKey).push(a);
  }
  return res;
 };
 const beforeTopics=topicMap(before.actions),afterTopics=topicMap(after.actions);
 const pairedNew=new Set();
 for(const a of before.actions){
  if(fresh.has(a.taskId)){
   persistent.push(make(a,decisions.get(a.taskId)?.status==='completed-reported'?
    'OWNER-REPORTED-COMPLETE-BUT-ISSUE-STILL-OBSERVED':'PERSISTS-IN-BOTH-OPERATOR-SNAPSHOTS'));
   continue;
  }
  const candidates=a.issueKey&&beforeTopics.get(a.issueKey)?.length===1&&
   afterTopics.get(a.issueKey)?.length===1?afterTopics.get(a.issueKey):[];
  const changed=candidates[0];
  if(changed&&!old.has(changed.taskId)&&!pairedNew.has(changed.taskId)){
   pairedNew.add(changed.taskId);
   changedObservation.push({
    ...make(a,'SAME-ISSUE-CHANGED-OBSERVATION-REQUIRES-REVIEW'),
    taskId:changed.taskId,previousTaskId:a.taskId,issueKey:a.issueKey,
    beforePriority:a.priority,priority:changed.priority,ownerTeam:changed.ownerTeam,
    beforeObservation:a.detail,afterObservation:changed.detail,
    previousHumanDecision:decisions.get(a.taskId)?.status||'unreviewed',
    humanDecision:'unreviewed',priorDecisionTransferAllowed:false
   });
  }else noLongerSeen.push(make(a,'DISAPPEARED-FROM-NEW-OPERATOR-SNAPSHOT-NOT-PROVEN-FIXED'));
 }
 for(const a of after.actions)if(!old.has(a.taskId)&&!pairedNew.has(a.taskId))
  newlyObserved.push({...make(a,'NEW-OR-CHANGED-OBSERVATION-REQUIRES-REVIEW'),
   priorDecisionTransferAllowed:false});
 const sort=(a,b)=>pRank[a.priority]-pRank[b.priority]||
  (a.path||'').localeCompare(b.path||'')||a.taskId.localeCompare(b.taskId);
 for(const x of [persistent,noLongerSeen,newlyObserved,changedObservation])x.sort(sort);
 // Rechecks are NOT direct publish attestation. Even if every observed task disappears,
 // the absence is only in selected private input snapshots.
 const unresolvedReported=persistent.filter(a=>a.humanDecision==='completed-reported');
 const removedReported=noLongerSeen.filter(a=>a.humanDecision==='completed-reported');
 const newCritical=newlyObserved.filter(a=>a.priority==='P0');
 const changedCritical=changedObservation.filter(a=>a.priority==='P0');
 const byPriority=s=>Object.fromEntries(PRIORITIES.map(p=>[p,s.filter(x=>x.priority===p).length]));
 return {format:RECHECK,version:1,siteId:before.siteId,base:before.base,readOnly:true,
  approvedBlueprintCanonicalSha256:before.approvedBlueprintCanonicalSha256,
  sourceBeforeRawSha256:beforeSha,sourceAfterRawSha256:afterSha,
  sourceDecisionRawSha256:ledgerSha||null,
  beforeOriginalSiteRawSha256:before.originalSiteRawSha256,
  afterOriginalSiteRawSha256:after.originalSiteRawSha256,
  sameOriginalSiteBytes:before.originalSiteRawSha256===after.originalSiteRawSha256,
  beforeOriginalBlueprintRawSha256:before.originalBlueprintRawSha256,
  afterOriginalBlueprintRawSha256:after.originalBlueprintRawSha256,
  privateEvidenceOnly:true,sourceAuthentication:false,
  summary:{before:before.actions.length,after:after.actions.length,
   persistent:persistent.length,noLongerSeen:noLongerSeen.length,newlyObserved:newlyObserved.length,
   changedObservation:changedObservation.length,changedByPriority:byPriority(changedObservation),
   changedCriticalP0:changedCritical.length,coverageComparisonComplete:!legacyCoverageUnknown,
   persistentByPriority:byPriority(persistent),noLongerSeenByPriority:byPriority(noLongerSeen),
   newByPriority:byPriority(newlyObserved),newCriticalP0:newCritical.length,
   completedReportedStillObserved:unresolvedReported.length,
   completedReportedNowAbsentUnverified:removedReported.length,
   sourceSiteBytesChanged:before.originalSiteRawSha256!==after.originalSiteRawSha256,
   hasHumanLedger:!!ledger,humanStatusesOnBefore:guard},
  sourceCoverage:sourceBefore,
  persistent,noLongerSeen,newlyObserved,changedObservation,
  mandatoryFollowUp:[
   'Re-authenticate current owner-published CMS revision and each public HTTPS response before calling any issue fixed.',
   'Compare real X-Robots-Tag, meta robots, canonical, redirects and actual served robots/sitemap XML.',
   'Investigate new OR escalated/changed P0 immediately; previous human decision cannot be auto-transferred to new task IDs.',
   'A task missing from this snapshot is NOT a verified public fix, index recovery, ranking gain or owner acceptance.',
   'Completed-reported work still observed requires immediate independent investigation; do not mark GO.',
   'Only owner/lead separately approve any CMS Save/Publish or hosting change with rollback.'
  ],
  publicationAuthorized:false,releaseAuthorized:false,automaticStateTransition:false,
  ownerApprovalAuthenticated:false,publicHostAuthenticated:false,
  currentCmsRevisionAuthenticated:false};
}
function markdown(r){
 verify(r?.format===RECHECK&&r.releaseAuthorized===false,'nonpublishing comparison required');
 const out=['# MANUFACT SEO — private crawl/CMS post-edit recheck','',
  'OFFLINE OPERATOR EVIDENCE · NO AUTHENTICATED PUBLIC HOST · NO AUTOMATIC CLOSURE','',
  'Site '+safe(r.siteId)+' / '+safe(r.base),
  'Before worklist original byte SHA '+r.sourceBeforeRawSha256,
  'After worklist original byte SHA '+r.sourceAfterRawSha256,
  'Decisions original byte SHA '+safe(r.sourceDecisionRawSha256||'not provided'),
  'Before selected Site v1 SHA '+r.beforeOriginalSiteRawSha256,
  'After selected Site v1 SHA '+r.afterOriginalSiteRawSha256,'',
  'Persistent: '+r.summary.persistent+'; no longer observed (NOT verified): '+
   r.summary.noLongerSeen+'; new: '+r.summary.newlyObserved+
   '; changed existing issue: '+r.summary.changedObservation+
   '; new P0: '+r.summary.newCriticalP0+
   '; owner-reported complete but STILL observed: '+r.summary.completedReportedStillObserved,''];
 for(const [label,items] of [
  ['PERSISTENT — investigate reported completion',r.persistent],
  ['NEW — no inherited approvals',r.newlyObserved],
  ['SAME ISSUE BUT CHANGED DETAILS / PRIORITY — fresh decision required',r.changedObservation],
  ['NO LONGER OBSERVED — NOT verified closed',r.noLongerSeen]]){
  out.push('## '+label,'');
  for(const a of items)out.push('- **'+a.priority+'** '+safe(a.taskId)+' / '+safe(a.ownerTeam)+
   ' / '+safe(a.path||'site')+' / prior human status: '+safe(a.humanDecision)+
   ' / '+safe(a.classification));
  if(!items.length)out.push('- No tasks in this class.');
  out.push('');
 }
 out.push('## Required lead evidence','');
 for(const a of r.mandatoryFollowUp)out.push('- '+safe(a));
 return out.join('\n')+'\n';
}
module.exports=Object.freeze({LEDGER,RECHECK,STATUSES,checkWorklist,template,checkDecisions,compare,markdown});
