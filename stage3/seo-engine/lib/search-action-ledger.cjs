'use strict';
/* Private, source-pinned editorial task ledger. Human declarations never modify CMS or establish release success. */
const {FORMAT:HISTORY}=require('./search-history.cjs');
const FORMAT='manufact-seo-search-action-ledger-v1',REVIEW='manufact-seo-search-action-review-v1';
const STATES=['unreviewed','accepted','in-progress','completed-reported','deferred','rejected'];
const HASH=/^[a-f0-9]{64}$/,ID=/^[a-z][a-z0-9-]+:[a-z][a-z0-9-]+$/;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  !Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const safe=x=>String(x??'').replace(/[|<>\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').slice(0,200);
function validateHistory(h,sha){
 if(h?.format!==HISTORY||h.version!==1||h.readOnly!==true||!HASH.test(sha||'')||
    !HASH.test(h.blueprintSha256||'')||!Array.isArray(h.actions)||
    !Array.isArray(h.pages)||!Array.isArray(h.periods)||!h.declaredSearchContext?.comparabilityKey)
  throw Error('Ledger needs an original read-only Search History report and its file SHA256');
 const ids=new Set();
 for(const a of h.actions){
  if(!ID.test(a.id||'')||ids.has(a.id)||!['P1','P2'].includes(a.priority)||
     typeof a.pageId!=='string'||typeof a.path!=='string')
   throw Error('Unrecognized or duplicated Search History action');
  ids.add(a.id);
 }
 return h;
}
function template(history,sha,previous=null){
 validateHistory(history,sha);
 const previousMap=previous?.actions?new Map(previous.actions.map(x=>[x.actionId,x])):new Map();
 return {format:FORMAT,version:1,siteId:history.siteId,historySha256:sha,
  blueprintSha256:history.blueprintSha256,contextKey:history.declaredSearchContext.comparabilityKey,
  latestPeriodEnd:history.periods.at(-1).period.end,
  actions:history.actions.map(a=>({
   actionId:a.id,pageId:a.pageId,path:a.path,priority:a.priority,signal:a.type,
   status:'unreviewed',assignedTo:'',reason:'',decisionAt:null,targetDate:null,
   evidenceRefs:[],manualChangeDescription:'',
   ...(previousMap.has(a.id)?{previousDecisionForReferenceOnly:{
    status:previousMap.get(a.id).status,decisionAt:previousMap.get(a.id).decisionAt||null,
    warning:'Prior decision is informational; new period requires fresh owner review.'}}:{})
  })),
  boundaries:['This is an editable private template, NOT an approved work order.',
   'Action IDs are pinned to exact Search History bytes. New history invalidates prior decisions.',
   'Reported completion does not establish implemented CMS change, ranking gain or public deployment.']};
}
function validateDecision(record,expected){
 if(!record||typeof record!=='object'||Array.isArray(record)||
    !STATES.includes(record.status)||record.actionId!==expected.id||
    record.pageId!==expected.pageId||record.path!==expected.path||
    record.priority!==expected.priority||record.signal!==expected.type)
  throw Error('Ledger action does not match exact history task '+expected.id);
 if(typeof record.assignedTo!=='string'||record.assignedTo.length>120||
    typeof record.reason!=='string'||record.reason.length>700||
    typeof record.manualChangeDescription!=='string'||record.manualChangeDescription.length>1000||
    (record.targetDate!==null&&!validDate(record.targetDate))||
    (record.decisionAt!==null&&!validDate(record.decisionAt)))
  throw Error('Invalid human task decision fields: '+expected.id);
 if(!Array.isArray(record.evidenceRefs)||record.evidenceRefs.length>12||
    record.evidenceRefs.some(x=>typeof x!=='string'||x.length>250||/[\u0000-\u001f]/.test(x)))
  throw Error('Invalid private task evidence references');
 if(record.status!=='unreviewed'&&(!record.assignedTo.trim()||!record.reason.trim()||!record.decisionAt))
  throw Error('Reviewed task requires assignee, reason and decisionAt: '+expected.id);
 if(record.status==='completed-reported'&&
   (!record.manualChangeDescription.trim()||!record.evidenceRefs.length))
  throw Error('Reported completion needs manual change description and private evidence ref: '+expected.id);
 if(record.status==='unreviewed'&&(record.decisionAt||record.reason||record.evidenceRefs.length||
    record.manualChangeDescription))throw Error('Unreviewed task cannot contain an approval or completion: '+expected.id);
}
function review(history,sha,ledger){
 validateHistory(history,sha);
 if(ledger?.format!==FORMAT||ledger.version!==1||ledger.siteId!==history.siteId||
  ledger.historySha256!==sha||ledger.blueprintSha256!==history.blueprintSha256||
  ledger.contextKey!==history.declaredSearchContext.comparabilityKey||
  ledger.latestPeriodEnd!==history.periods.at(-1).period.end||
  !Array.isArray(ledger.actions)||ledger.actions.length!==history.actions.length)
  throw Error('Stale or incompatible SEO action ledger; refresh decisions for new history');
 const expected=new Map(history.actions.map(x=>[x.id,x])),seen=new Set();
 const detail=[];
 for(const d of ledger.actions){
  if(seen.has(d.actionId)||!expected.has(d.actionId))throw Error('Duplicate or unrecognized action in ledger');
  seen.add(d.actionId);
  validateDecision(d,expected.get(d.actionId));
  const a=expected.get(d.actionId);
  detail.push({actionId:d.actionId,path:d.path,priority:d.priority,status:d.status,
   assignee:d.assignedTo||null,reason:d.reason||null,decisionAt:d.decisionAt||null,
   targetDate:d.targetDate||null,manualChangeDescription:d.manualChangeDescription||null,
   evidenceRefCount:d.evidenceRefs.length,nextStep:a.nextStep,
   verification:'not-independently-verified',releasePermission:false});
 }
 const count=Object.fromEntries(STATES.map(s=>[s,detail.filter(x=>x.status===s).length]));
 return {format:REVIEW,version:1,siteId:history.siteId,sourceHistorySha256:sha,
  readOnly:true,status:'MANUAL-SEO-OPERATIONS-ONLY',
  summary:{total:detail.length,byState:count,
   awaitingHumanReview:count.unreviewed,manualWorkQueue:count.accepted+count['in-progress'],
   reportedCompleteNotVerified:count['completed-reported']},
  actions:detail,
  warnings:['Not an authenticated owner approval, CMS completion audit or public site verification.',
   'Even completed-reported requires real CMS revision and public HTTPS evidence from lead.',
   'Rejected or deferred editorial prompts do not authorize ignoring technical launch gates.']};
}
function markdown(result){
 if(result.format!==REVIEW)throw Error('Invalid SEO action decision review');
 const lines=['# Search visibility action ledger — private human decisions','',
  'Status: '+result.status+' | Site: '+safe(result.siteId),
  'Unreviewed: '+result.summary.awaitingHumanReview+' | Work queue: '+result.summary.manualWorkQueue+
  ' | Reported complete (NOT verified): '+result.summary.reportedCompleteNotVerified,'',
  '| Priority | Page | Status | Owner | Next manual step |',
  '|---|---|---|---|---|'];
 for(const a of result.actions)lines.push('| '+a.priority+' | '+safe(a.path)+' | '+a.status+
  ' | '+safe(a.assignee||'—')+' | '+safe(a.nextStep)+' |');
 lines.push('','## Limitations','');
 for(const w of result.warnings)lines.push('- '+safe(w));
 return lines.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,REVIEW,STATES,template,review,markdown});
