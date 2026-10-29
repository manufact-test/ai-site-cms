'use strict';
/* Offline owner-declared CMS release vs Search Console periods, never causal SEO proof. */
const {FORMAT:HISTORY}=require('./search-history.cjs');
const FORMAT='manufact-seo-release-followup-v1';
const LOG='manufact-seo-manual-release-journal-v1';
const DAY=86400000,SHA=/^[0-9a-f]{64}$/,DATE=/^\d{4}-\d{2}-\d{2}$/;
const clean=s=>String(s??'').replace(/[\u0000-\u001f\u007f|<>]/g,' ').trim().slice(0,230);
function day(s){
 if(typeof s!=='string'||!DATE.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||
    new Date(Date.parse(s+'T00:00:00Z')).toISOString().slice(0,10)!==s)
  throw Error('Invalid release calendar date');
 return Date.parse(s+'T00:00:00Z');
}
function validateJournal(j,history,historySha){
 if(!history||history.format!==HISTORY||history.readOnly!==true||
  !Array.isArray(history.periods)||!Array.isArray(history.pages)||!Array.isArray(history.actions)||
  !SHA.test(history.blueprintSha256||'')||!SHA.test(historySha||''))
  throw Error('Release follow-up needs exact private Search History source');
 if(!j||j.format!==LOG||j.siteId!==history.siteId||
  j.publicOrigin!==history.publicOrigin||
  j.sourceHistorySha256!==historySha||j.blueprintSha256!==history.blueprintSha256||
  !Array.isArray(j.releases)||j.releases.length<1||j.releases.length>80)
  throw Error('Release journal is missing/mismatched or stale for this search history');
 const pages=new Map(history.pages.map(p=>[p.pageId,p]));
 const ids=new Set(),validated=[];
 for(const r of j.releases){
  if(!r||typeof r!=='object'||Array.isArray(r)||
    Object.keys(r).some(k=>!['id','publishedDate','siteRevisionFingerprint','cmsPublishedVersion','pageIds','changeKinds','changeSummary','evidenceReferences','ownerRecordedBy'].includes(k))||
    typeof r.id!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(r.id)||ids.has(r.id)||
    typeof r.siteRevisionFingerprint!=='string'||!SHA.test(r.siteRevisionFingerprint)||
    typeof r.cmsPublishedVersion!=='string'||r.cmsPublishedVersion.length>120||
    typeof r.changeSummary!=='string'||!r.changeSummary.trim()||r.changeSummary.length>900||
    typeof r.ownerRecordedBy!=='string'||!r.ownerRecordedBy.trim()||r.ownerRecordedBy.length>160)
   throw Error('Invalid or duplicated owner-declared CMS release entry');
  ids.add(r.id);const t=day(r.publishedDate);
  if(!Array.isArray(r.pageIds)||!r.pageIds.length||r.pageIds.length>80||
    new Set(r.pageIds).size!==r.pageIds.length||r.pageIds.some(id=>!pages.has(id)))
   throw Error('Release refers to absent/duplicate Blueprint page IDs');
  if(!Array.isArray(r.changeKinds)||!r.changeKinds.length||r.changeKinds.length>8||
    new Set(r.changeKinds).size!==r.changeKinds.length||
    r.changeKinds.some(x=>!['metadata','content','navigation','schema','media','layout','indexation','other'].includes(x)))
   throw Error('Unrecognized release change kind');
  if(!Array.isArray(r.evidenceReferences)||r.evidenceReferences.length>12||
    r.evidenceReferences.some(x=>typeof x!=='string'||x.length>300||/[\u0000-\u001f]/.test(x)))
   throw Error('Invalid private release evidence refs');
  validated.push({...r,day:t});
 }
 return validated.sort((a,b)=>a.day-b.day||a.id.localeCompare(b.id));
}
function template(history,historySha){
 if(history?.format!==HISTORY||history.readOnly!==true||!SHA.test(historySha||'')||
   !SHA.test(history.blueprintSha256||'')||!Array.isArray(history.pages))
  throw Error('Journal template requires exact Search History');
 return {format:LOG,siteId:history.siteId,publicOrigin:history.publicOrigin,
  blueprintSha256:history.blueprintSha256,sourceHistorySha256:historySha,
  releases:[],
  instructions:'Owner fills each release with publishedDate YYYY-MM-DD, actual Site v1 revision fingerprint, version, affected approved pageIds, change kinds, summary and private evidence refs. No release is independently authenticated.'};
}
const delta=(before,after)=>({
 clicks:after.clicks-before.clicks,
 impressions:after.impressions-before.impressions,
 ctrPercentagePoints:+((after.ctr-before.ctr)*100).toFixed(3),
 positionChange:+(after.averagePosition-before.averagePosition).toFixed(2),
 relativeClicksPercent:before.clicks?+((after.clicks-before.clicks)*100/before.clicks).toFixed(2):null
});
function build(history,historySha,journal){
 const releases=validateJournal(journal,history,historySha);
 const results=[],warnings=[];
 for(const release of releases){
  const before=history.periods.filter(p=>day(p.period.end)<release.day).at(-1);
  const after=history.periods.find(p=>day(p.period.start)>release.day);
  const preIndex=before?history.periods.indexOf(before):-1;
  const postIndex=after?history.periods.indexOf(after):-1;
  const intervening=releases.filter(r=>r.id!==release.id&&
    (!before||r.day>=day(before.period.end))&&(!after||r.day<=day(after.period.start)));
  const hasPair=Boolean(before&&after&&preIndex>=0&&postIndex>=0);
  const comparable=hasPair&&
    before.period.days===after.period.days&&
    postIndex===preIndex+1&&!intervening.length;
  const observations=release.pageIds.map(id=>{
   const page=history.pages.find(p=>p.pageId===id);
   const old=hasPair?page.periods[preIndex]:null,current=hasPair?page.periods[postIndex]:null;
   const status=!hasPair?'no-before-and-after-window':
    !comparable?'confounded-or-nonadjacent-window':
    !old?.observed||!current?.observed?'missing-page-observation':
    !old.metrics||!current.metrics?'missing-page-metrics':'observed-comparable-windows';
   return {pageId:id,path:page.path,
    status,pre:old?.metrics||null,post:current?.metrics||null,
    changes:status==='observed-comparable-windows'?delta(old.metrics,current.metrics):null};
  });
  results.push({id:release.id,publishedDate:release.publishedDate,
   declaredPublishedVersion:release.cmsPublishedVersion,
   declaredSiteFingerprint:release.siteRevisionFingerprint,
   changedPageIds:release.pageIds,changeKinds:release.changeKinds,
   declaredSummary:release.changeSummary,
   ownerRecordedBy:release.ownerRecordedBy,evidenceRefCount:release.evidenceReferences.length,
   prePeriod:before?.period||null,postPeriod:after?.period||null,
   interveningReleaseIds:intervening.map(x=>x.id),
   cohortStatus:comparable?'adjacent-observation-windows-no-other-declared-release':
    !hasPair?'no-complete-surrounding-observation':'overlap-or-multiple-releases',
   observedPages:observations.filter(o=>o.changes).length,
   pages:observations,changeAuthenticated:false,causalEffectEstablished:false});
 }
 const comparable=results.filter(r=>r.cohortStatus==='adjacent-observation-windows-no-other-declared-release');
 if(!comparable.length)warnings.push('No release is bracketed by isolated adjacent equal-length GSC windows');
 return {format:FORMAT,version:1,siteId:history.siteId,readOnly:true,
  sourceHistorySha256:historySha,blueprintSha256:history.blueprintSha256,
  declaredSearchContextKey:history.declaredSearchContext?.comparabilityKey||null,
  releaseCount:results.length,comparableWindowCount:comparable.length,
  results,warnings,releaseAuthorized:false,causalEffectEstablished:false,
  limitations:['The release journal, revision fingerprints, dates and source evidence are manually declared and NOT independently authenticated.',
   'Observed GSC changes are correlation only. They cannot establish impact, causation or SEO ROI.',
   'No comparison is offered when source page records are missing, cohorts are nonadjacent, or another declared release intervenes.',
   'Changes in demand, algorithms, SERPs, GSC anonymization and other interventions are unknown.',
   'No CMS writes, publication, Search Console API, owner signature, deploy or automatic approval.']};
}
function markdown(r){
 if(r.format!==FORMAT)throw Error('Unsupported release follow-up');
 const out=['# MANUFACT SEO — Release follow-up (observational)','',
  'PRIVATE: owner-declared CMS releases vs operator-supplied Google Search Console periods. Not proof of causal effect.','',
  'Total releases: '+r.releaseCount+'; isolated available windows: '+r.comparableWindowCount,''];
 for(const release of r.results){
  out.push('## '+clean(release.id)+' — '+release.publishedDate,'',
   'Declared CMS version: '+clean(release.declaredPublishedVersion),
   'Changes: '+clean(release.changeKinds.join(', '))+' — '+clean(release.declaredSummary),
   'Cohort: '+release.cohortStatus,'',
   '| Page | Comparison | Pre clicks | Post clicks | Observed click delta | CTR pp |',
   '|---|---|---:|---:|---:|---:|');
  for(const page of release.pages)
   out.push('| '+clean(page.path)+' | '+page.status+' | '+(page.pre?.clicks??'UNKNOWN')+
    ' | '+(page.post?.clicks??'UNKNOWN')+' | '+(page.changes?.clicks??'NOT-COMPARABLE')+
    ' | '+(page.changes?.ctrPercentagePoints??'NOT-COMPARABLE')+' |');
  out.push('');
 }
 out.push('## Safety and limitations','');
 for(const item of r.limitations)out.push('- '+clean(item));
 return out.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,LOG,template,build,markdown,validateJournal});
