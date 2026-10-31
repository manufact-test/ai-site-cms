'use strict';
/* Offline longitudinal URL-indexing observations, strictly non-causal.
 * Missing/unknown rows never count as deindexations or recoveries.
 */
const INDEX=require('./search-indexing.cjs');
const FORMAT='manufact-seo-indexing-history-v1';
const SHA=/^[a-f0-9]{64}$/;
function validDay(s){
 return typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
  new Date(Date.parse(s+'T00:00:00Z')).toISOString().slice(0,10)===s;
}
function build(sources){
 if(!Array.isArray(sources)||sources.length<2||sources.length>24)
  throw Error('Indexing history requires 2 to 24 private indexing intelligence reports');
 const entries=sources.map(s=>{
  if(!SHA.test(s?.sha256||'')||s.report?.format!==INDEX.FORMAT||s.report.version!==1||
   !s.report.readOnly||!SHA.test(s.report.blueprintSha256||'')||
   !validDay(s.report.observedAt)||!Array.isArray(s.report.pages)||
   !['example-urls','selected-urls','all-exported-rows'].includes(s.report.exportScope))
   throw Error('Indexing history needs full source-pinned indexing reports');
  return {sha256:s.sha256,data:s.report};
 }).sort((a,b)=>a.data.observedAt.localeCompare(b.data.observedAt));
 const baseline=entries[0].data,expected=new Map(baseline.pages.map(p=>[p.pageId,p]));
 if(expected.size!==baseline.pages.length||!expected.size)throw Error('Indexing source contains duplicated/empty approved pages');
 for(let i=0;i<entries.length;i++){
  const current=entries[i].data,previous=entries[i-1]?.data;
  if(current.siteId!==baseline.siteId||current.publicOrigin!==baseline.publicOrigin||
   current.blueprintSha256!==baseline.blueprintSha256||
   current.gscProperty!==baseline.gscProperty||
   current.exportScope!==baseline.exportScope||
   current.pages.length!==expected.size||
   current.pages.some(p=>!expected.has(p.pageId)||p.path!==expected.get(p.pageId).path||
    p.approvedRobots!==expected.get(p.pageId).approvedRobots||
    !['indexed','not-indexed','unknown','unobserved'].includes(p.observationStatus))||
   previous&&current.observedAt<=previous.observedAt)
   throw Error('Indexing history mixing site/Blueprint/property/scope, duplicated dates or altered page map');
 }
 const pages=[],actions=[];
 for(const p of baseline.pages){
  const points=entries.map(e=>{
   const one=e.data.pages.find(x=>x.pageId===p.pageId);
   return {observedAt:e.data.observedAt,status:one.observationStatus,
    reason:one.observationReason||null,sourceReportSha256:e.sha256};
  });
  const before=points.at(-2),last=points.at(-1);
  const known=s=>s==='indexed'||s==='not-indexed';
  const canCompare=known(before.status)&&known(last.status);
  const transition=canCompare?
   before.status===last.status?'unchanged-reported-status':
   before.status==='indexed'?'reported-indexed-to-not-indexed':'reported-not-indexed-to-indexed':
   'insufficient-comparable-url-observations';
  const persistence=known(last.status)?points.slice().reverse().findIndex(x=>x.status!==last.status):0;
  const trailingKnown=persistence===-1?points.length:persistence;
  if(canCompare&&before.status!==last.status){
   actions.push({id:'review-indexing-change:'+p.pageId,priority:
    before.status==='indexed'&&p.approvedRobots==='index'?'P1':'P2',
    pageId:p.pageId,path:p.path,type:'reported-indexing-status-transition',
    observation:'Operator-supplied indexing status changed from '+before.status+' to '+last.status+
     ' between two date snapshots; may reflect export sample or Google reporting delay.',
    nextStep:'Use live URL Inspection and public HTML/robots/canonical for both URLs before approving a CMS change.',
    automatic:false,releaseAuthorized:false});
  }
  if(p.approvedRobots==='index'&&last.status==='not-indexed'&&trailingKnown>=3){
   actions.push({id:'review-repeated-exclusion:'+p.pageId,priority:'P2',pageId:p.pageId,path:p.path,
    type:'repeated-observed-index-exclusion',
    observation:'Page expected indexable was explicitly reported not-indexed in '+trailingKnown+
     ' consecutive supplied snapshots; dates between snapshots remain unobserved.',
    nextStep:'Inspect actual live URL Inspection, canonical and sitemap; do not assume a continuous Google exclusion.',
    automatic:false,releaseAuthorized:false});
  }
  pages.push({pageId:p.pageId,path:p.path,approvedRobots:p.approvedRobots,points,
   latestStatus:last.status,latestTransition:transition,
   explicitObservationCount:points.filter(x=>known(x.status)).length});
 }
 const priority={P1:0,P2:1};
 actions.sort((a,b)=>priority[a.priority]-priority[b.priority]||a.path.localeCompare(b.path)||a.id.localeCompare(b.id));
 return {format:FORMAT,version:1,readOnly:true,siteId:baseline.siteId,publicOrigin:baseline.publicOrigin,
  blueprintSha256:baseline.blueprintSha256,gscProperty:baseline.gscProperty,exportScope:baseline.exportScope,
  periods:entries.map(e=>({observedAt:e.data.observedAt,sourceReportSha256:e.sha256,
   observedApprovedPages:e.data.summary.observedApprovedPages,reportedIndexed:e.data.summary.reportedIndexed,
   reportedNotIndexed:e.data.summary.reportedNotIndexed,notObserved:e.data.summary.notObserved+
    e.data.summary.reportedUnknown})),
  pages,actions,summary:{snapshots:entries.length,approvedPages:pages.length,
   comparisonReadyPages:pages.filter(x=>x.latestTransition!=='insufficient-comparable-url-observations').length,
   humanTasks:actions.length,P1:actions.filter(a=>a.priority==='P1').length},
  limitations:['Only operator-declared reports; no authenticated Google API or live URL Inspection.',
   'A status transition between two snapshots is not proof of deindexing/recovery or SEO effect.',
   'Absent and unknown page rows do not establish any change, even if present in a prior snapshot.',
   'Multiple sampled/example exports may cover different URLs; their totals are never indexation rates.',
   'No automatic indexing requests, canonical/robots edits, CMS publication or release authorization.']};
}
function markdown(r){
 if(r?.format!==FORMAT)throw Error('Invalid indexing history');
 const safe=x=>String(x??'').replace(/[|<>\u0000-\u001f\u007f]/g,' ').slice(0,190);
 const out=['# MANUFACT SEO — Private URL indexing history','',
  'Site '+safe(r.siteId)+' · Property '+safe(r.gscProperty)+' · Scope '+r.exportScope,
  'Snapshots: '+r.summary.snapshots+' | latest status comparisons: '+r.summary.comparisonReadyPages+
  ' | human prompts: '+r.summary.humanTasks,'',
  '| Observation date | Reported indexed | Reported not indexed | Unknown/unobserved |',
  '|---|---:|---:|---:|'];
 for(const o of r.periods)out.push('| '+o.observedAt+' | '+o.reportedIndexed+' | '+o.reportedNotIndexed+
  ' | '+o.notObserved+' |');
 out.push('','## Page trajectories','',
  '| Approved path | Approved robots | Reported states in date order | Last comparison |',
  '|---|---|---|---|');
 for(const p of r.pages)out.push('| '+safe(p.path)+' | '+p.approvedRobots+' | '+
  p.points.map(x=>x.status).join(' → ')+' | '+p.latestTransition+' |');
 out.push('','## Human-only next checks','');
 for(const x of r.actions)out.push('- '+x.priority+' '+safe(x.path)+': '+safe(x.observation)+' '+safe(x.nextStep));
 out.push('','## Limits','');for(const x of r.limitations)out.push('- '+safe(x));
 return out.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,build,markdown});
