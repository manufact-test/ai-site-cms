'use strict';
// Single deterministic, evidence-carrying remediation backlog for the lead.
// Does not mutate a site, CMS, blueprint, manifest or production.
const {checkBlueprint}=require('./blueprint.cjs');
const {propose}=require('./handoff.cjs');
const {snapshotAudit}=require('./analyze.cjs');
const {compare}=require('./parity.cjs');
const HTML=require('./html-evidence.cjs');
const VIEWPORT=require('./viewport-evidence.cjs');
const REGRESSION=require('./regression.cjs');
const PUBLICATION=require('./publication-integrity.cjs');
const DELIVERY=require('./delivery-evidence.cjs');
const MEDIA=require('./media-delivery.cjs');
const CONSISTENCY=require('./evidence-consistency.cjs');
const FORMAT='manufact-seo-remediation-v1';
const priorityRank={P0:0,P1:1,P2:2,P3:3};
const phaseOrder={'verify-facts':0,'plan-approval':1,'developer-work':2,'cms-review':3,'validation':4};
const stableId=(key)=>{
 let h=2166136261;
 for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619);}
 return 'seo-'+(h>>>0).toString(36).padStart(7,'0');
};
function bucket(code){
 if(/(?:^|:)(?:.*-)?(?:meta|title|description|og-title|og-description)/.test(code)&&!/topic/.test(code))return 'metadata';
 if(/alt|image/.test(code))return 'image-accessibility';
 if(/canonical|index|robots|sitemap/.test(code))return 'indexation';
 if(/schema|fact|json-ld|structured-data/.test(code))return 'verified-facts';
 if(/heading|h1/.test(code))return 'semantic-structure';
 if(/cta|conversion|action-route/.test(code))return 'conversion';
 if(/unlinked|internal-link|link|anchor|reachable|inbound/.test(code))return 'site-links';
 if(/duplicate-body|topic|prose|intent/.test(code))return 'content';
 if(/path|route|page-missing/.test(code))return 'site-architecture';
 return 'other';
}
function level(code,severity){
 if(severity==='blocker')return 'P0';
 if(severity==='error')return 'P1';
 if(code==='content:topic-not-located'||code==='content:topic-metadata-only'||code.includes('prose'))return 'P3';
 if(severity==='warning')return 'P2';
 return 'P3';
}
function work(site,manifests,blueprint,options={}){
 const plan=checkBlueprint(blueprint);
 if(site.siteId!==plan.siteId)throw Error('Remediation siteId mismatch');
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['snapshot','viewports','baselineSite','delivery','media'].includes(k)))throw Error('Unsupported remediation option');
 const handoff=propose(site,manifests,plan),audit=handoff.audit;
 const snapshot=options.snapshot||null;
 const htmlAudit=snapshot?snapshotAudit(snapshot):null;
 const parity=snapshot?compare(site,plan,snapshot):null;
 const htmlEvidence=snapshot?HTML.review(snapshot,plan):null;
 const publicationIntegrity=snapshot?PUBLICATION.review(site,snapshot):null;
 const delivery=options.delivery?DELIVERY.review(site,options.delivery):null;
 const media=options.media?MEDIA.review(site,options.media,snapshot):null;
 const consistency=CONSISTENCY.review(site,options);
 const deviceEvidence=options.viewports?VIEWPORT.review(options.viewports,plan):null;
 const regression=options.baselineSite?REGRESSION.compare(options.baselineSite,site,manifests,plan):null;
 const pagePaths=new Map([...plan.pages,...site.pages].map(p=>[p.id,p.path]));
 const tasks=new Map();
 function add(key,params){
  const before=tasks.get(key);
  if(before){
   for(const s of params.sources||[])if(!before.sources.some(x=>JSON.stringify(x)===JSON.stringify(s)))before.sources.push(s);
   if(priorityRank[params.priority]<priorityRank[before.priority])before.priority=params.priority;
   return before;
  }
  const task={taskId:stableId(key),key,priority:'P3',phase:'validation',owner:'lead-developer',
   category:'other',evidence:'review-required',status:'proposed',requiresHumanReview:true,
   automatic:false,pageId:null,pagePath:null,sectionId:null,targetPageId:null,field:null,
   before:null,after:null,locator:null,dependsOn:[],sources:[],...params};
  if(!task.pagePath&&task.pageId)task.pagePath=pagePaths.get(task.pageId)||null;
  tasks.set(key,task);return task;
 }
 // Proposals already constrained by existing Site v1 / manifest contracts.
 for(const c of handoff.supportedChanges){
  const key=['cms-seo',c.pageId,c.field].join('|');
  add(key,{priority:c.field==='seo.robots'?'P1':'P2',phase:'cms-review',
   owner:'cms-editor',category:bucket(c.field),evidence:'observed-vs-approved-blueprint',
   status:'awaiting-review',pageId:c.pageId,pagePath:c.pagePath,field:c.field,
   before:c.before,after:c.after,locator:c.locator,
   preconditions:{siteId:site.siteId,expectedBefore:c.before},
   instruction:'Review this proposed SEO field against manual overrides, then use the existing CMS Save/Publish process.',
   sources:[{kind:'seo-proposal',field:c.field}],approved:false});
 }
 const contentFields=handoff.contentFieldProposals;
 for(const c of contentFields.proposals){
  const key=['cms-content',c.pageId,c.sectionId,c.elementId,c.field].join('|');
  add(key,{priority:c.field==='behavior.href'?'P1':'P2',
   phase:'cms-review',owner:'cms-editor',category:c.field==='behavior.href'?'conversion':'semantic-structure',
   evidence:'observed-vs-approved-blueprint',status:'awaiting-review',
   pageId:c.pageId,pagePath:c.pagePath,sectionId:c.sectionId,
   field:c.field,before:c.before,after:c.after,locator:c.locator,
   preconditions:c.preconditions,
   instruction:'Review manifest constraints, source version, and any manual edits before applying.',
   sources:[{kind:'content-proposal',reasonCode:c.reasonCode}],approved:false});
 }
 // Missing/unsupported mappings are not usable editing operations.
 for(const item of contentFields.blocked){
  const key=['blocked-mapping',item.pageId,item.sectionId,item.field,item.reason].join('|');
  add(key,{priority:['page-not-implemented','section-not-mapped','target-page-not-implemented','manifest-version-mismatch'].includes(item.reason)?'P1':'P2',
   phase:'developer-work',owner:'lead-developer',category:'component-contract',
   evidence:'contract-limit',status:'needs-implementation',
   pageId:item.pageId,sectionId:item.sectionId,field:item.field||null,
   instruction:'Resolve or explicitly reject the blocked mapping without guessing IDs/fields; do not auto-create components.',
   sources:[{kind:'mapping-blocked',reason:item.reason,details:item}]});
 }
 for(const item of handoff.requiresLeadImplementation){
  const key=['lead',item.pageId,item.sectionId||'',item.kind,item.targetPageId||'',item.type||''].join('|');
  add(key,{priority:item.kind==='page-development'||item.kind==='link-target'?'P1':'P2',
   phase:'developer-work',owner:'lead-developer',category:item.kind.includes('schema')?'verified-facts':bucket(item.kind),
   evidence:'blueprint-site-gap',status:'needs-implementation',
   pageId:item.pageId,sectionId:item.sectionId||null,targetPageId:item.targetPageId||null,
   instruction:item.reason||'Review and implement the approved site specification using the existing core.',
   sources:[{kind:'lead-implementation',reason:item.kind,details:item}]});
 }
 for(const item of handoff.evidencePending){
  const key=['evidence',item.pageId,item.type,...item.factIds].join('|');
  add(key,{priority:'P1',phase:'verify-facts',owner:'site-owner',category:'verified-facts',
   evidence:'unverified-owner-claim',status:'awaiting-evidence',pageId:item.pageId,
   instruction:'Confirm the owner facts or omit the structured-data candidate; verification does not authorize markup automatically.',
   sources:[{kind:'facts-pending',schemaType:item.type,factIds:item.factIds}]});
 }
 const hasCms=(pageId,field)=>tasks.has(['cms-seo',pageId,field].join('|'));
 const hasContent=(pageId,sectionId,field)=>[...tasks.values()].some(t=>
  t.pageId===pageId&&t.sectionId===sectionId&&t.field===field&&t.phase==='cms-review');
 function covered(x){
  if((/^(core:seo-title|architecture:duplicate-title|planned-title-diff)$/.test(x.code))&&hasCms(x.pageId,'seo.title'))return true;
  if((/^(core:seo-description|architecture:duplicate-description)$/.test(x.code))&&hasCms(x.pageId,'seo.description'))return true;
  if(x.code==='indexation-diff'&&hasCms(x.pageId,'seo.robots'))return true;
  if(x.code==='planned-heading-diff'&&hasContent(x.pageId,x.sectionId,'content.text'))return true;
  if(x.code==='content:planned-cta-missing'&&hasContent(x.pageId,x.sectionId,'behavior.href'))return true;
  if(x.code==='content:cta-label-diff'&&hasContent(x.pageId,x.sectionId,'content.text'))return true;
  if(/schema-evidence-pending|architecture:schema-unverified-facts/.test(x.code)&&
     [...tasks.values()].some(t=>t.pageId===x.pageId&&t.phase==='verify-facts'))return true;
  return false;
 }
 function issueTask(x,kind){
  if(covered(x))return;
  const group=bucket(x.code);
  const key=['investigate',kind,x.pageId||'',x.sectionId||'',x.targetPageId||'',
   x.field||'',x.device||'',x.code,x.fragment||'',x.href||'',x.topic||'',
   x.assetId||'',x.schemaType||'',group].join('|');
  const fromHtml=['html-snapshot','html-deep','viewport-capture','http-delivery-evidence','media-delivery-evidence','cross-source-consistency'].includes(kind),fromParity=kind==='publication-parity';
  const direct=x.severity==='error'||x.severity==='blocker';
  const owner=group==='verified-facts'?'site-owner':
   fromHtml||fromParity||direct||/planned-(?:page|link|internal-link|section)/.test(x.code)
    ?'lead-developer':'editor';
  const phase=owner==='site-owner'?'verify-facts':direct?'developer-work':fromParity||fromHtml?'validation':'plan-approval';
  const pr=level(x.code,x.severity);
  const task=add(key,{priority:pr,phase,owner,category:group,
   evidence:fromParity?'supplied-static-html':fromHtml?'bounded-static-html':
    x.code.startsWith('architecture:')||x.code.startsWith('blueprint:')?'planned-structure':'site-v1-and-plan',
   status:'needs-investigation',pageId:x.pageId||null,sectionId:x.sectionId||null,
   targetPageId:x.targetPageId||null,field:x.field||null,
   instruction:'Inspect the referenced evidence, confirm applicability, then make an approved change or record why none is needed.',
   sources:[]});
  task.sources.push({kind,code:x.code,severity:x.severity,message:x.message||x.reason||'',
   ...(x.expected!==undefined?{expected:x.expected}:{}),
   ...(x.observed!==undefined?{observed:x.observed}:{}),
   ...(x.topic!==undefined?{topic:x.topic}:{}),
   ...(x.assetId!==undefined?{assetId:x.assetId}:{}),
   ...(x.elementId!==undefined?{elementId:x.elementId}:{}),
   ...(x.nodeId!==undefined?{nodeId:x.nodeId}:{}),
   ...(x.proposedAnchor!==undefined?{proposedAnchor:x.proposedAnchor}:{}),
   ...(x.schemaType!==undefined?{schemaType:x.schemaType}:{}),
   ...(x.factIds!==undefined?{factIds:x.factIds}:{}),
   ...(x.actual!==undefined?{actual:x.actual}:{}),
   ...(x.device!==undefined?{device:x.device}:{}),
   ...(x.fragment!==undefined?{fragment:x.fragment}:{}),
   ...(x.href!==undefined?{href:x.href}:{}),
   ...(x.status!==undefined?{status:x.status}:{}),
   ...(x.field!==undefined?{field:x.field}:{}),
   ...(x.snapshotValue!==undefined?{snapshotValue:x.snapshotValue}:{}),
   ...(x.httpValue!==undefined?{httpValue:x.httpValue}:{}),
   ...(x.expectedUrl!==undefined?{expectedUrl:x.expectedUrl}:{}),
   ...(x.observedUrl!==undefined?{observedUrl:x.observedUrl}:{}),
   ...(x.canonicalUrl!==undefined?{canonicalUrl:x.canonicalUrl}:{}),
   ...(x.missingRoutes!==undefined?{missingRoutes:x.missingRoutes}:{}),
   ...(x.missingHeadings!==undefined?{missingHeadings:x.missingHeadings}:{})});
 }
 for(const x of audit.issues)issueTask(x,'site-audit');
 if(delivery)for(const x of delivery.findings)issueTask(x,'http-delivery-evidence');
 if(media)for(const x of media.findings)issueTask(x,'media-delivery-evidence');
 for(const x of consistency.findings)issueTask(x,'cross-source-consistency');
 if(htmlAudit)for(const x of htmlAudit.issues)issueTask(x,'html-snapshot');
 if(parity)for(const x of parity.findings)issueTask(x,'publication-parity');
 if(htmlEvidence)for(const x of htmlEvidence.findings)issueTask(x,'html-deep');
 if(publicationIntegrity)for(const x of publicationIntegrity.findings)issueTask(x,'publication-integrity');
 if(deviceEvidence)for(const x of deviceEvidence.findings)issueTask(x,'viewport-capture');
 if(regression){
  for(const x of regression.introduced)issueTask({...x,code:'regression:'+x.code},'site-regression');
  for(const x of regression.escalated)issueTask({...x.after,code:'regression:'+x.after.code},'site-regression');
  for(const x of regression.seoChanges.filter(x=>x.potentialIndexationRegression))
   issueTask({code:'regression:indexation-decreased',severity:'warning',pageId:x.pageId,path:x.pagePath,
    field:x.field,expected:x.before,observed:x.after,
    message:'Site v1 indexation changed from index to noindex; verify deliberate approval.'},'site-regression');
 }
 // Dependencies reference actual stable task IDs, never unknown IDs.
 for(const task of tasks.values()){
  if(task.pageId&&task.category!=='verified-facts'){
   const dev=[...tasks.values()].find(x=>x.pageId===task.pageId&&x.sources.some(y=>y.kind==='lead-implementation'&&y.reason==='page-development'));
   if(dev&&dev!==task&&!task.dependsOn.includes(dev.taskId))task.dependsOn.push(dev.taskId);
  }
  if(task.sources.some(x=>x.kind==='lead-implementation'&&x.reason==='structured-data-adapter')){
   for(const pending of tasks.values())if(pending.pageId===task.pageId&&pending.phase==='verify-facts')
    if(!task.dependsOn.includes(pending.taskId))task.dependsOn.push(pending.taskId);
  }
 }
 const all=[...tasks.values()].sort((a,b)=>
  priorityRank[a.priority]-priorityRank[b.priority]||
  phaseOrder[a.phase]-phaseOrder[b.phase]||
  String(a.pagePath).localeCompare(String(b.pagePath))||
  a.key.localeCompare(b.key));
 const summary={
  total:all.length,byPriority:Object.fromEntries(Object.keys(priorityRank).map(k=>[k,all.filter(x=>x.priority===k).length])),
  byOwner:Object.fromEntries([...new Set(all.map(t=>t.owner))].sort().map(o=>[o,all.filter(x=>x.owner===o).length])),
  evidenceRequired:all.filter(x=>x.status==='awaiting-evidence').length,
  cmsFieldProposals:all.filter(x=>x.phase==='cms-review').length,
  leadImplementationItems:all.filter(x=>x.phase==='developer-work').length
 };
 const packages=[...new Set(all.map(t=>t.phase))].sort((a,b)=>phaseOrder[a]-phaseOrder[b])
  .map(phase=>({phase,taskIds:all.filter(t=>t.phase===phase).map(t=>t.taskId)}));
 return {format:FORMAT,version:1,siteId:site.siteId,readOnly:true,automaticReleaseApproval:false,
  priorityMeaning:{P0:'blocking structural/evidence issue',P1:'high-priority functional or indexation review',
   P2:'important editorial/contract review',P3:'optional editorial investigation'},
  summary,packages,tasks:all,
  inputs:{siteValidated:true,blueprintCanonical:true,htmlSnapshotProvided:Boolean(snapshot),
   deviceCapturesProvided:Boolean(options.viewports),
   httpDeliveryCaptureProvided:Boolean(options.delivery),mediaCaptureProvided:Boolean(options.media),
   baselineSiteProvided:Boolean(options.baselineSite)},
  sourceReports:{auditIssueCount:audit.issues.length,htmlIssueCount:htmlAudit?.issues.length??null,
   parityFindingCount:parity?.findings.length??null,
   deepHtmlIssueCount:htmlEvidence?.findings.length??null,
   publicationIntegrityFindingCount:publicationIntegrity?.findings.length??null,
   viewportFindingCount:deviceEvidence?.findings.length??null,
   httpDeliveryFindingCount:delivery?.findings.length??null,
   mediaFindingCount:media?.findings.length??null,
   crossSourceFindingCount:consistency.findings.length,
   regressionNewFindings:regression?.introduced.length??null,
   regressionCriticalReviewItems:regression?.summary.criticalReviewItems??null},
  boundaries:'Priorities are deterministic workflow triage, NOT ranking potential, traffic estimates, conversion predictions, production approvals or auto-executable CMS patches. Each task requires human verification. The lead owns release.'};
}
module.exports=Object.freeze({FORMAT,work});
