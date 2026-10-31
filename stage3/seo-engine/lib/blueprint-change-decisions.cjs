'use strict';
/* Human decision traceability over the original source-pinned Blueprint change packet.
 * An operator assertion NEVER authenticates a client or authorizes deployment.
 */
const FORMAT='manufact-seo-blueprint-change-decisions-v1';
const REVIEW='manufact-seo-blueprint-change-decision-review-v1';
const HEX=/^[0-9a-f]{64}$/;
const states=new Set(['pending','accepted','rejected','deferred']);
const limits=x=>typeof x==='string'&&x.length<=600&&!/[\x00-\x1f<>]/.test(x);
const id=x=>typeof x==='string'&&x.length<=240&&!/[\x00-\x1f]/.test(x);
function assert(ok,msg){if(!ok)throw Error('Blueprint owner decisions: '+msg);}
function date(x){
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const d=new Date(x+'T00:00:00Z');
 return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===x;
}
function template(report){
 assert(report?.format==='manufact-seo-blueprint-change-review-v1'&&report.readOnly===true&&
  report.publicationAuthorized===false&&Array.isArray(report.actions)&&
  HEX.test(report.beforeBlueprintSha256)&&HEX.test(report.afterBlueprintSha256),
  'only canonical non-authorizing Blueprint comparison can create decisions');
 return {format:FORMAT,version:1,siteId:report.siteId,
  beforeBlueprintSha256:report.beforeBlueprintSha256,
  afterBlueprintSha256:report.afterBlueprintSha256,
  actions:report.actions.map(a=>({id:a.id,priority:a.priority,decision:'pending',
   reviewer:'',reviewedAt:null,evidenceRef:'',notes:''})),
  releaseAuthorized:false,clientSignoffAuthenticated:false};
}
function evaluate(report,provided){
 const t=template(report);
 assert(provided?.format===FORMAT&&provided.version===1&&
  provided.siteId===t.siteId&&provided.releaseAuthorized===false&&
  provided.clientSignoffAuthenticated===false&&
  provided.beforeBlueprintSha256===t.beforeBlueprintSha256&&
  provided.afterBlueprintSha256===t.afterBlueprintSha256&&
  Object.keys(provided).sort().join('|')===Object.keys(t).sort().join('|')&&
  Array.isArray(provided.actions)&&provided.actions.length===t.actions.length,
  'decision record must match exact original site, release and action inventory');
 const items=[],ids=new Set();
 for(let i=0;i<t.actions.length;i++){
  const expected=t.actions[i],observed=provided.actions[i];
  assert(observed&&typeof observed==='object'&&!Array.isArray(observed)&&
   Object.keys(observed).sort().join('|')===Object.keys(expected).sort().join('|')&&
   observed.id===expected.id&&id(observed.id)&&observed.priority===expected.priority&&
   !ids.has(observed.id), 'unknown, duplicate, reordered or modified action identity');
  ids.add(observed.id);
  assert(states.has(observed.decision)&&limits(observed.reviewer)&&
   limits(observed.evidenceRef)&&limits(observed.notes),
   'invalid operator state, name, reference or note');
  if(observed.decision==='pending'){
   assert(observed.reviewer===''&&observed.reviewedAt===null&&
    observed.evidenceRef===''&&observed.notes==='',
    'pending operator decision cannot contain fictional completed observations');
  }else{
   assert(observed.reviewer.trim().length>=3&&observed.reviewer.length<=120&&
    date(observed.reviewedAt),
    'recorded owner decision requires reviewer and real YYYY-MM-DD observation');
   if(observed.decision==='accepted')
    assert(observed.evidenceRef.trim().length>=4&&
     observed.evidenceRef.trim()!==observed.id,
     'accepted change needs an independent private evidence reference');
   if(['rejected','deferred'].includes(observed.decision))
    assert(observed.notes.trim().length>=5,
     'rejected/deferred change requires a meaningful explanation');
  }
  items.push({...report.actions[i],decision:observed.decision,
   reviewer:observed.reviewer,reviewedAt:observed.reviewedAt,
   evidenceRef:observed.evidenceRef,notes:observed.notes,
   authenticatedClientApproval:false});
 }
 const counts={pending:0,accepted:0,rejected:0,deferred:0,
  p0Unresolved:0,p1Unresolved:0,p2Unresolved:0};
 for(const item of items){
  counts[item.decision]++;
  if(item.decision!=='accepted')counts[item.priority.toLowerCase()+'Unresolved']++;
 }
 const disposition=counts.rejected?'OPERATOR-REPORTED-REJECTIONS':
  counts.p0Unresolved?'P0-OPERATOR-DECISIONS-INCOMPLETE':
  counts.pending||counts.deferred?'HUMAN-DECISIONS-INCOMPLETE':
  'ALL-OPERATOR-DECISIONS-RECORDED-OWNER-SIGNOFF-UNVERIFIED';
 const review={format:REVIEW,version:1,siteId:t.siteId,readOnly:true,
  beforeBlueprintSha256:t.beforeBlueprintSha256,
  afterBlueprintSha256:t.afterBlueprintSha256,
  disposition,counts,actions:items,
  originalPlannedActions:report.actions.length,
  publishedSiteVerified:false,realRedirectVerified:false,
  clientSignoffAuthenticated:false,releaseAuthorized:false,
  notes:[
   'This is an operator-provided worksheet, not authenticated approval or actual evidence inspection.',
   'Evidence references are descriptions only; the lead must independently authenticate their sources.',
   'Even 100% accepted entries do not prove deployed CMS revision, 301 redirects, client signature or release authority.',
   'The authoritative change impact report remains immutable and independent of operator decisions.'
  ]};
 return Object.freeze(review);
}
function markdown(review){
 assert(review?.format===REVIEW&&review.releaseAuthorized===false,'original decision report required');
 const safe=x=>String(x??'').replace(/[|<>\x00-\x1f]/g,' ').slice(0,300);
 const lines=['# MANUFACT SEO — private Blueprint change decisions','',
  '**NON-AUTHORIZING OPERATOR OBSERVATIONS ONLY.**','',
  'Site: '+safe(review.siteId),'Status: '+safe(review.disposition),
  'P0 unresolved: '+review.counts.p0Unresolved+
  ' | P1 unresolved: '+review.counts.p1Unresolved+
  ' | P2 unresolved: '+review.counts.p2Unresolved,
  'Original Blueprint SHA256: '+review.beforeBlueprintSha256,
  'Proposed Blueprint SHA256: '+review.afterBlueprintSha256,'',
  '| Priority | Original action | Observation | Reviewer | Date | Evidence reference |',
  '|---|---|---|---|---|---|'];
 for(const a of review.actions)lines.push('| '+a.priority+' | '+safe(a.id)+
  ' | '+a.decision+' | '+safe(a.reviewer||'—')+
  ' | '+safe(a.reviewedAt||'—')+' | '+safe(a.evidenceRef||'—')+' |');
 lines.push('','## Next lead verification','',
  '- Independently inspect all marked evidence references, client identity and the original CMS revision.',
  '- Resolve every rejected/deferred/pending action and verify real published URLs, meta and any approved redirects.',
  '- Obtain actual client approval via a separate authorized process; this worksheet is not approval.','');
 review.notes.forEach(n=>lines.push('- '+safe(n)));
 return lines.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,REVIEW,template,evaluate,markdown});
