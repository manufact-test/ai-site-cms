'use strict';
/* Source-pinned read-only bridge from GSC indexing discrepancies to existing CMS page SEO fields.
 * Technical URL Inspection evidence and all owner edits must be verified by the lead.
 */
const {checkBlueprint}=require('./blueprint.cjs');
const {fingerprint}=require('./acceptance.cjs');
const {FORMAT:INDEX}=require('./search-indexing.cjs');
const FORMAT='manufact-seo-indexing-cms-review-v1',SHA=/^[a-f0-9]{64}$/;
const safe=x=>String(x??'').replace(/[|<>\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').slice(0,200);
function build(blueprint,blueprintSha256,site,report,indexingReportSha256){
 const b=checkBlueprint(blueprint);
 if(!SHA.test(blueprintSha256||'')||!SHA.test(indexingReportSha256||'')||
  report?.format!==INDEX||report.readOnly!==true||report.siteId!==b.siteId||
  report.blueprintSha256!==blueprintSha256||site?.siteId!==b.siteId||
  !Array.isArray(site.pages)||!Array.isArray(report.actions)||!Array.isArray(report.pages))
  throw Error('Indexing CMS review requires exact approved Blueprint, same-site published CMS and original indexing evidence SHA');
 const approved=new Map(b.pages.map(p=>[p.id,p]));
 const actual=new Map(site.pages.map(p=>[p.id,p]));
 const observed=new Map(report.pages.map(p=>[p.pageId,p]));
 const currentSiteFingerprint=fingerprint(site),packets=[],blocked=[],siteId=b.siteId;
 const seen=new Set();
 for(const task of report.actions){
  if(task.pageId===null){
   blocked.push({actionId:task.id,reason:'Unmapped URL has no approved CMS page; inspect actual public URL first.',
    releasePermission:false});continue;
  }
  if(seen.has(task.id))throw Error('Duplicated indexing action ID');
  seen.add(task.id);
  const p=approved.get(task.pageId),s=actual.get(task.pageId),e=observed.get(task.pageId);
  if(!p||!s||!e||task.path!==p.path||s.path!==p.path){
   blocked.push({actionId:task.id,reason:'Approved page, actual CMS page or published route not aligned',
    releasePermission:false});continue;
  }
  packets.push({
   actionId:task.id,priority:task.priority,issue:task.type,
   pageId:p.id,path:p.path,operatorDeclaredIndexStatus:e.observationStatus,
   operatorDeclaredReason:e.observationReason||null,indexingObservedAt:report.observedAt,
   approvedBlueprint:{robots:p.seo.robots,canonicalPath:p.seo.canonicalPath},
   ownerPublishedSite:{robots:s.seo?.robots??null,canonicalPath:s.seo?.canonicalPath??null,
    pagePresent:true,currentTitle:s.seo?.title||null},
   fieldDifferences:{
    robots:s.seo?.robots!==p.seo.robots,
    canonicalPath:s.seo?.canonicalPath!==p.seo.canonicalPath
   },
   sourceIndexingReportSha256:indexingReportSha256,currentSiteFingerprint,
   requiredManualChecks:[
    'Authenticate the exact owner-published Site v1 revision and actual live public URL.',
    'Inspect live HTTP status, X-Robots-Tag, meta robots, canonical, redirects and sitemap.',
    'Confirm actual URL Inspection result and distinguish crawl/reporting delay from a current issue.',
    'Resolve potential owner-approved editorial override before proposing robots/canonical changes.',
    'Use the existing CMS editing approval workflow; after manual publication rerun public HTTPS QA.'
   ],
   currentEvidenceIsGoogleAuthenticated:false,
   autoPatchAllowed:false,releasePermission:false
  });
 }
 packets.sort((a,b)=>a.priority.localeCompare(b.priority)||a.path.localeCompare(b.path)||a.actionId.localeCompare(b.actionId));
 return {format:FORMAT,version:1,readOnly:true,siteId,
  approvedBlueprintSha256:blueprintSha256,indexingReportSha256,
  ownerPublishedSiteFingerprint:currentSiteFingerprint,
  observedAt:report.observedAt,reportScope:report.exportScope,
  summary:{originalIndexingActions:report.actions.length,actionPackets:packets.length,
   blockedOrUnmapped:blocked.length,robotsDisagreements:packets.filter(p=>p.fieldDifferences.robots).length,
   canonicalDisagreements:packets.filter(p=>p.fieldDifferences.canonicalPath).length},
  packets,blocked,releaseAuthorized:false,
  warnings:['Read-only manual CMS implementation dossier; no edits, crawling, publication or indexing requests.',
   'Site v1 identity is operator supplied until authenticated through the lead owner-published source API.',
   'Status may be sampled, stale or canonicalized; do not assert Google indexed/not-indexed without actual URL Inspection.',
   'Existing owner edits and client approval cannot be overridden by this report.']};
}
function markdown(r){
 if(r?.format!==FORMAT)throw Error('Invalid indexing CMS review');
 const out=['# MANUFACT SEO — Private URL indexing → CMS field review','',
  'Site '+safe(r.siteId)+' · Index evidence '+r.observedAt+' · Source SHA '+r.indexingReportSha256,
  'Human work packets '+r.summary.actionPackets+'; blocked '+r.summary.blockedOrUnmapped,
  '',
  '| Priority | Approved route | Reported GSC state | Approved robots | Current Site v1 robots | Approved canonical | Site v1 canonical |',
  '|---|---|---|---|---|---|---|'];
 for(const p of r.packets)out.push('| '+p.priority+' | '+safe(p.path)+' | '+safe(p.operatorDeclaredIndexStatus)+
  ' | '+safe(p.approvedBlueprint.robots)+' | '+safe(p.ownerPublishedSite.robots)+
  ' | '+safe(p.approvedBlueprint.canonicalPath)+' | '+safe(p.ownerPublishedSite.canonicalPath)+' |');
 out.push('','## Manual investigation steps','');
 for(const p of r.packets){
  out.push('### '+safe(p.actionId),'',
   'Reason: '+safe(p.operatorDeclaredReason||'Not declared'),'');
  for(const step of p.requiredManualChecks)out.push('- '+safe(step));
  out.push('');
 }
 out.push('## Blocked or unmapped','');
 for(const b of r.blocked)out.push('- '+safe(b.actionId)+': '+safe(b.reason));
 out.push('','## Limits','');for(const v of r.warnings)out.push('- '+safe(v));
 return out.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,build,markdown});
