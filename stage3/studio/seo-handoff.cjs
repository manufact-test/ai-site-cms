'use strict';
// A local, read-only bridge between operator-produced Search/CMS work packets
// and the ONE existing Stage3 editor. These files are human assertions, not
// authenticated approvals or executable patches.
const FORMAT='manufact-seo-search-cms-handoff-v1';
const HEX=/^[0-9a-f]{64}$/;
const FIELDS={
 'seo.title':160,'seo.description':300,'seo.robots':7,
 'seo.ogTitle':160,'seo.ogDescription':300
};
function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>
  JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 if(typeof value==='number'&&!Number.isFinite(value))throw Error('Invalid site fingerprint value');
 return JSON.stringify(value);
}
async function fingerprint(site,webCrypto){
 const subtle=webCrypto?.subtle;
 if(!subtle)throw Error('Для сравнения ревизии нужен доступный Web Crypto SHA-256');
 const digest=await subtle.digest('SHA-256',new TextEncoder().encode(canonical(site)));
 return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}
const str=(v,max=1000)=>typeof v==='string'&&v.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v);
const record=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function inspect(report,site,manifests,actualHash){
 if(!record(report)||report.format!==FORMAT||report.version!==1||report.readOnly!==true||
  !str(report.siteId,150)||!HEX.test(report.currentSiteFingerprint||'')||
  !HEX.test(report.approvedBlueprintFingerprint||'')||!HEX.test(report.sourceHistorySha256||'')||
  !Array.isArray(report.active)||!Array.isArray(report.reportedComplete)||
  !Array.isArray(report.notSelected)||!Array.isArray(report.blocked)||
  report.active.length+report.reportedComplete.length>250||
  report.notSelected.length+report.blocked.length>500||
  !record(report.summary))throw Error('Неверный формат или размер SEO-пакета');
 if(report.siteId!==site.siteId)throw Error('Пакет предназначен для другого сайта');
 const names=['activeWorkPackets','reportedCompleteNeedsVerification','notApprovedOrUnreviewed','blockedForCurrentSiteDrift'];
 const lengths=[report.active.length,report.reportedComplete.length,report.notSelected.length,report.blocked.length];
 if(names.some((name,i)=>report.summary[name]!==lengths[i]))throw Error('Счётчики SEO-пакета противоречат содержимому');
 const manifestsById=new Map(manifests.map(m=>[m.id,m]));
 const pages=new Map(site.pages.map(p=>[p.id,p]));
 const seen=new Set(),revisionMatches=actualHash===report.currentSiteFingerprint;
 function action(item,completed){
  if(!record(item)||!str(item.actionId,240)||!item.actionId||seen.has(item.actionId)||
   !['P0','P1','P2','P3'].includes(item.priority)||
   !str(item.pageId,150)||!str(item.approvedPath,300)||
   !str(item.measuredObservation,1200)||!str(item.approvedManualNextStep,1200)||
   !record(item.ownerDecision)||!['accepted','in-progress','completed-reported'].includes(item.ownerDecision.status)||
   (completed!==(item.ownerDecision.status==='completed-reported'))||
   !record(item.existingEditorTargets)||!Array.isArray(item.existingEditorTargets.metaFields)||
   !Array.isArray(item.existingEditorTargets.approvedFieldProposals)||
   !Array.isArray(item.existingEditorTargets.blockedFieldMappings)||
   !Array.isArray(item.existingEditorTargets.sectionReview)||
   item.existingEditorTargets.approvedFieldProposals.length>120||
   item.existingEditorTargets.blockedFieldMappings.length>120||
   item.existingEditorTargets.sectionReview.length>120||
   item.currentSiteRevisionFingerprint!==report.currentSiteFingerprint||
   item.sourceReportSha256!==report.sourceHistorySha256||
   item.automaticApplication!==false||item.releaseAuthorized!==false)
   throw Error('Некорректный или повторный SEO action');
  seen.add(item.actionId);
  const page=pages.get(item.pageId),pageMatches=!!page&&page.path===item.approvedPath;
  const fields=item.existingEditorTargets.metaFields,keys=new Set();
  if(fields.length!==Object.keys(FIELDS).length)throw Error('Неполная карта SEO-полей');
  const meta=fields.map(field=>{
   if(!record(field)||!Object.hasOwn(FIELDS,field.property)||keys.has(field.property)||
    !str(field.expectedCurrent,FIELDS[field.property])||!str(field.approvedBlueprintValue,FIELDS[field.property])||
    field.mayEditAutomatically!==false||typeof field.isDifferent!=='boolean'||
    field.isDifferent!==(field.expectedCurrent!==field.approvedBlueprintValue)||
    (field.property==='seo.robots'&&(!['index','noindex'].includes(field.expectedCurrent)||
      !['index','noindex'].includes(field.approvedBlueprintValue))))
    throw Error('Недостоверная карта полей SEO');
   keys.add(field.property);
   const name=field.property.slice(4),current=page?.seo?.[name]??(name==='robots'?'index':'');
   return {property:field.property,current,source:field.expectedCurrent,
    approved:field.approvedBlueprintValue,sourceMatches:pageMatches&&current===field.expectedCurrent,
    differs:current!==field.approvedBlueprintValue};
  });
  const proposals=item.existingEditorTargets.approvedFieldProposals.map(p=>{
   if(!record(p)||!record(p.locator)||!str(p.proposalId,500)||
    !str(p.expectedBefore,500)||!str(p.approvedAfter,500)||
    p.automatic!==false||p.manualOverrideCheckRequired!==true||
    !str(p.componentId,100)||!str(p.sectionManifestVersion,50))
    throw Error('Некорректный адрес предложения');
   const loc=p.locator;
   if(loc.pageId!==item.pageId||!str(loc.sectionId,150)||!str(loc.elementId,150)||
    !['content.text','behavior.href'].includes(loc.property))throw Error('Чужой адрес поля');
   const sec=page?.sections.find(x=>x.id===loc.sectionId);
   const el=sec?.elements.find(x=>x.id===loc.elementId)||sec?.items?.find(x=>x.id===loc.elementId);
   const manifest=manifestsById.get(sec?.component);
   const declared=manifest?.elements?.find(x=>x.slot===el?.slot)?.fields?.find(f=>f.path===loc.property);
   const valid=pageMatches&&revisionMatches&&!!sec&&!sec.designGraph&&!!el&&
    sec.component===p.componentId&&sec.manifestVersion===p.sectionManifestVersion&&
    !!declared&&(loc.property==='content.text'?declared.type==='text':declared.type==='url')&&
    el.values?.[loc.property]===p.expectedBefore;
   return {locator:loc,source:p.expectedBefore,approved:p.approvedAfter,valid,
    changed:el?.values?.[loc.property]!==p.approvedAfter};
  });
  const sections=item.existingEditorTargets.sectionReview.map(s=>{
   if(!record(s)||!str(s.sectionId,150)||!str(s.component,100))throw Error('Некорректный раздел в SEO-пакете');
   const current=page?.sections.find(x=>x.id===s.sectionId);
   return {id:s.sectionId,component:s.component,
    valid:pageMatches&&!!current&&current.component===s.component};
  });
  return {actionId:item.actionId,priority:item.priority,pageId:item.pageId,
   path:item.approvedPath,observed:item.measuredObservation,next:item.approvedManualNextStep,
   status:item.ownerDecision.status,assignee:str(item.ownerDecision.assignee,180)?item.ownerDecision.assignee:'',
   completed,pageMatches,meta,proposals,sections,
   canCopy:revisionMatches&&pageMatches};
 }
 const active=report.active.map(x=>action(x,false));
 const completed=report.reportedComplete.map(x=>action(x,true));
 return {revisionMatches,siteId:report.siteId,active,completed,
  notSelectedCount:report.notSelected.length,blockedCount:report.blocked.length};
}
module.exports=Object.freeze({FORMAT,canonical,fingerprint,inspect});
