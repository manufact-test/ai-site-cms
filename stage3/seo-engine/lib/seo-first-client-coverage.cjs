'use strict';
/* One per-approved-route inventory of evidence already reviewed by the existing
 * crawl/CMS/HTTP/rendered/CrUX pipeline. An observation is never an attestation.
 * Do not copy unapproved URLs, HTML, client facts or arbitrary source fields.
 */
const FORMAT='manufact-seo-first-client-route-coverage-v1';
const DEVICES=['desktop','tablet','mobile'];
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const fail=x=>{throw Error('First-client SEO route coverage: '+x);};
function sourceMap(source,policy,label){
 if(!source)return null;
 if(source.siteId!==policy.siteId||source.base!==policy.base||
  source.readOnly!==true||source.releaseAuthorized!==false||!Array.isArray(source.pages))
  fail('untrusted or cross-site '+label+' source');
 const allowed=new Map(policy.pages.map(p=>[p.pageId,p.path]));
 const entries=new Map();
 for(const p of source.pages){
  if(!allowed.has(p?.pageId)||allowed.get(p.pageId)!==p.path||entries.has(p.pageId))
   fail('unapproved or duplicated '+label+' page');
  entries.set(p.pageId,p);
 }
 if(entries.size!==allowed.size)fail('incomplete '+label+' reviewed page inventory');
 return entries;
}
function build({policy,cmsReview=null,structuredData=null,renderedContent=null,
 fieldPerformance=null,hreflang=null}={}){
 if(policy?.readOnly!==true||policy.publicationAuthorized!==false||
  typeof policy.siteId!=='string'||typeof policy.base!=='string'||
  !Array.isArray(policy.pages)||policy.pages.length>80||
  new Set(policy.pages.map(p=>p.pageId)).size!==policy.pages.length||
  new Set(policy.pages.map(p=>p.path)).size!==policy.pages.length||
  policy.pages.some(p=>typeof p.pageId!=='string'||!ROUTE.test(p.path)))
  fail('original approved crawl route inventory required');
 const cms=sourceMap(cmsReview,policy,'CMS');
 const http=sourceMap(structuredData,policy,'public JSON-LD/HTTP');
 const rendered=sourceMap(renderedContent,policy,'rendered DOM');
 if(hreflang&&(hreflang.format!=='manufact-seo-hreflang-qa-v1'||
  hreflang.readOnly!==true||hreflang.releaseAuthorized!==false||
  hreflang.siteId!==policy.siteId||hreflang.base!==policy.base))
  fail('untrusted international hreflang source');
 if(fieldPerformance&&(fieldPerformance.format!=='manufact-seo-field-performance-review-v1'||
  fieldPerformance.readOnly!==true||fieldPerformance.releaseAuthorized!==false||
  fieldPerformance.siteId!==policy.siteId||fieldPerformance.base!==policy.base||
  !Array.isArray(fieldPerformance.records)))fail('untrusted field-performance source');
 const byPath=new Map(policy.pages.map(p=>[p.path,p.pageId]));
 const crux=new Map();
 for(const r of fieldPerformance?.records||[]){
  if(r.scope==='origin')continue; // Never assign origin-wide CrUX to individual paths.
  if(r.scope!=='page'||!byPath.has(r.path)||
   !['PHONE','TABLET','DESKTOP','ALL'].includes(r.device))
   fail('unapproved exact-page field evidence');
  const x=crux.get(r.path)||new Set();
  if(x.has(r.device))fail('duplicate exact-page field device');
  x.add(r.device);crux.set(r.path,x);
 }
 const signalCounts=new Map(policy.pages.map(p=>[p.pageId,{P0:0,P1:0}]));
 const collect=(source,kind)=>{
  if(!source)return;
  if(!Array.isArray(source.findings)&&!(kind==='cms'&&Array.isArray(source.actions)))
   fail('missing bounded '+kind+' findings');
  const list=kind==='cms'?source.actions:source.findings;
  for(const f of list){
   if(f.priority!=='P0'&&f.priority!=='P1')continue;
   let pageId=f.pageId;
   if(!pageId&&f.path)pageId=byPath.get(f.path);
   if(pageId&&signalCounts.has(pageId))signalCounts.get(pageId)[f.priority]++;
  }
 };
 collect(policy,'policy');collect(cmsReview,'cms');collect(structuredData,'structured');
 collect(renderedContent,'rendered');
 collect(hreflang,'hreflang');
 if(fieldPerformance){
  for(const f of fieldPerformance.findings||[]){
   const id=f.scope==='page'?byPath.get(f.path):null;
   if(id&&(f.priority==='P0'||f.priority==='P1'))signalCounts.get(id)[f.priority]++;
  }
 }
 const rows=policy.pages.map(p=>{
  const c=cms?.get(p.pageId),h=http?.get(p.pageId),v=rendered?.get(p.pageId);
  const cmsStatus=!cms?'not-supplied':!c?.currentSite?'page-absent':
   c.driftFields?.length?'source-drift':'selected-source-match';
  const httpStatus=!http?'not-supplied':h?.htmlInspectible?'source-inspectable':'uninspected';
  const deviceStates=Object.fromEntries(DEVICES.map(d=>[d,
   v?.devices?.[d]?.inspected===true?'observed':'unknown']));
  const inspected=DEVICES.filter(d=>deviceStates[d]==='observed').length;
  const renderStatus=!rendered?'not-supplied':
   v?.evidenceState==='SOURCE-PAIR-OBSERVED'&&inspected===3?'paired-three-devices':'partial-or-unknown';
  const cruxDevices=[...(crux.get(p.path)||[])].sort();
  const signals=signalCounts.get(p.pageId);
  const preLaunchEvidenceIncomplete=cmsStatus!=='selected-source-match'||
   httpStatus!=='source-inspectable'||renderStatus!=='paired-three-devices';
  const nextEvidence=[];
  if(cmsStatus==='not-supplied')nextEvidence.push('Supply the approved Blueprint and selected Site v1.');
  else if(cmsStatus!=='selected-source-match')nextEvidence.push('Review selected Site v1 SEO drift and authenticate the owner revision.');
  if(httpStatus!=='source-inspectable')
   nextEvidence.push('Inspect a same-release public HTTPS capture and matching root recheck.');
  if(renderStatus!=='paired-three-devices')
   nextEvidence.push('Collect source-bound desktop/tablet/mobile DOM with stable HTTP pairing.');
  if(signals.P0>0)nextEvidence.push('Investigate route P0 diagnostics in the existing source reports.');
  if(fieldPerformance&&cruxDevices.length===0)
   nextEvidence.push('Post-launch: exact URL CrUX unavailable; do not substitute origin aggregate.');
  return {pageId:p.pageId,path:p.path,cmsStatus,httpStatus,renderStatus,
   inspectedDevices:inspected,deviceStates,cruxDevices,cruxExactPage:cruxDevices.length>0,
   signals,preLaunchEvidenceIncomplete,nextEvidence,sourceAuthenticated:false,
   releaseAuthorized:false};
 });
 const count=test=>rows.filter(test).length;
 // The existing Chromium CLI accepts up to eight approved page IDs per pilot.
 // Propose only pages with the prerequisite selected Site and inspectable HTTP;
 // this is a manual batching hint, NEVER browser-launch authorization.
 const recaptureIds=rows.filter(r=>r.cmsStatus==='selected-source-match'&&
  r.httpStatus==='source-inspectable'&&r.renderStatus!=='paired-three-devices'&&
  /^[a-z][a-z0-9-]{2,79}$/.test(r.pageId)).map(r=>r.pageId);
 const suggestedRenderedBatches=[];
 for(let i=0;i<recaptureIds.length;i+=8)suggestedRenderedBatches.push(recaptureIds.slice(i,i+8));
 const summary={approvedPages:rows.length,approvedRouteInventoryAvailable:rows.length>0,
  cmsSelectedSourceMatch:count(r=>r.cmsStatus==='selected-source-match'),
  cmsDriftOrAbsent:count(r=>['source-drift','page-absent'].includes(r.cmsStatus)),
  httpInspectable:count(r=>r.httpStatus==='source-inspectable'),
  renderedThreeDevicePairs:count(r=>r.renderStatus==='paired-three-devices'),
  fieldExactPageRepresented:count(r=>r.cruxExactPage),
  fieldOriginOnlyRecords:(fieldPerformance?.records||[]).filter(r=>r.scope==='origin').length,
  preLaunchEvidenceIncomplete:count(r=>r.preLaunchEvidenceIncomplete),
  routeP0SignalPages:count(r=>r.signals.P0>0),
  routeP1SignalPages:count(r=>r.signals.P1>0),
  potentialRenderedRecaptureRoutes:recaptureIds.length};
 return {format:FORMAT,siteId:policy.siteId,base:policy.base,summary,rows,
  suggestedRenderedBatches,
  sourcesSupplied:{cms:!!cms,http:!!http,rendered:!!rendered,crux:!!fieldPerformance},
  limitations:['Every row is an approved Blueprint route, not an authenticated public URL.',
   'Selected Site v1 match, inspectable HTTP and paired DOM are source observations, not release acceptance.',
   'Per-route P0/P1 counts are overlapping diagnostic signals from existing reports, not unique tickets.',
   'CrUX URL records cover historical real-user data; origin aggregates never fill page-level coverage.',
   'Missing optional CrUX records do not by themselves block the pre-launch evidence inventory.',
   'Suggested browser page-ID batches are optional lead hints only; inspect original source and run offline preflight before any authorized capture.',
   'Source provenance, actual deployment, Google indexing and owner/client signoff remain independent human checks.'],
  readOnly:true,sourceAuthenticated:false,releaseAuthorized:false};
}
const escape=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(report){
 if(report?.format!==FORMAT||report.readOnly!==true||report.releaseAuthorized!==false)
  fail('source-bound route coverage required');
 const s=report.summary;
 const html='<section><h2>First-client approved route evidence coverage</h2><p class="important">SOURCE OBSERVATIONS ONLY — NOT A RELEASE PASS. Missing routes/devices remain unknown; no owner, host or Google authentication.</p>'+
  (s.approvedRouteInventoryAvailable?'':'<p class="important">No approved route inventory in supplied policy; this synthetic/partial source cannot establish per-route coverage.</p>')+
  '<p>Approved '+s.approvedPages+' · selected CMS source matches '+s.cmsSelectedSourceMatch+
  ' · inspectable HTTP '+s.httpInspectable+' · 3-device DOM pairs '+s.renderedThreeDevicePairs+
  ' · pre-launch evidence incomplete '+s.preLaunchEvidenceIncomplete+
  ' · historical exact-URL CrUX '+s.fieldExactPageRepresented+
  ' (origin-only records '+s.fieldOriginOnlyRecords+').</p>'+
  (report.suggestedRenderedBatches.length?'<p class="small">Potential manual rendered recapture page IDs (max eight per batch, after independent source validation and authorization): '+
   report.suggestedRenderedBatches.map((x,i)=>'batch '+(i+1)+': <code>'+escape(x.join(','))+'</code>').join(' · ')+
   '. These are not commands and no browser is launched.</p>':'')+
  '<div class="scroll"><table><thead><tr><th>Approved route</th><th>Selected Site v1</th><th>HTTP / JSON-LD</th><th>Rendered DOM</th><th>CrUX exact URL</th><th>Page signals</th><th>Next manual evidence</th></tr></thead><tbody>'+
  report.rows.map(r=>'<tr><td><code>'+escape(r.path)+'</code></td><td>'+escape(r.cmsStatus)+
   '</td><td>'+escape(r.httpStatus)+'</td><td>'+escape(r.renderStatus)+
   (r.renderStatus==='partial-or-unknown'?' ('+r.inspectedDevices+'/3 inspected)':'')+
   '</td><td>'+escape(r.cruxDevices.join(', ')||(report.sourcesSupplied.crux?'not represented':'not supplied'))+
   '</td><td>P0 '+r.signals.P0+' · P1 '+r.signals.P1+
   (r.preLaunchEvidenceIncomplete?' · missing evidence':'')+'</td><td>'+
   escape(r.nextEvidence.join(' ')||'Independent owner/release provenance still required.')+'</td></tr>').join('')+
  '</tbody></table></div><p class="small">CrUX is optional post-launch historical evidence. An origin-only observation never covers a particular route. P0/P1 counts can overlap across analyzers and require manual triage.</p></section>';
 const md=['## First-client approved route evidence coverage (NOT A RELEASE PASS)','',
  'Approved '+s.approvedPages+'; selected CMS matches '+s.cmsSelectedSourceMatch+
   '; inspectable HTTP '+s.httpInspectable+'; paired desktop/tablet/mobile '+s.renderedThreeDevicePairs+
   '; pre-launch incomplete '+s.preLaunchEvidenceIncomplete+'; exact-URL historical CrUX '+s.fieldExactPageRepresented+
   '; origin-only CrUX '+s.fieldOriginOnlyRecords+'.','',
  ...(s.approvedRouteInventoryAvailable?[]:['No approved route inventory supplied: per-route coverage UNKNOWN, never passed.','']),
  ...(report.suggestedRenderedBatches.length?['Potential manual Chromium page-ID batches (1–8 approved IDs each; no automatic capture):',
   ...report.suggestedRenderedBatches.map((ids,i)=>'- Batch '+(i+1)+': `--page-ids '+ids.join(',')+'`'),
   'Validate sources with the existing offline preflight and obtain separate lead/owner authorization before any browser network request.','']:[]),
  '| Approved route | Selected Site v1 | HTTP / JSON-LD | Rendered DOM | CrUX exact URL | Diagnostic signals | Next manual evidence |',
  '|---|---|---|---|---|---|---|',
  ...report.rows.map(r=>'| '+r.path+' | '+r.cmsStatus+' | '+r.httpStatus+' | '+
   r.renderStatus+(r.renderStatus==='partial-or-unknown'?' ('+r.inspectedDevices+'/3)':'')+
   ' | '+(r.cruxDevices.join(', ')||(report.sourcesSupplied.crux?'not represented':'not supplied'))+' | P0 '+r.signals.P0+
   ', P1 '+r.signals.P1+(r.preLaunchEvidenceIncomplete?'; incomplete':'')+' | '+
   (r.nextEvidence.join(' ')||'Authenticate owner/release provenance.')+' |'),'',
  ...report.limitations.map(x=>'- '+x),''];
 return {html,markdown:md.join('\n')};
}
module.exports=Object.freeze({FORMAT,build,render});
