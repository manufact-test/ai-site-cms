'use strict';
// Lead-facing coverage map: approved Blueprint -> Site v1 -> supplied evidence.
// This is NOT a second editor, a live browser audit or publication approval.
const {checkBlueprint}=require('./blueprint.cjs');
const {readHead}=require('./parity.cjs');
const FORMAT='manufact-seo-traceability-v1';
const devices=['desktop','tablet','mobile'];
const normalize=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
function report(site,blueprint,options={},audit=null,backlog=null,decisions=null){
 const b=checkBlueprint(blueprint);
 if(!site||!Array.isArray(site.pages)||site.siteId!==b.siteId)throw Error('Traceability siteId mismatch');
 if(!options||typeof options!=='object'||Array.isArray(options)||
  Object.keys(options).some(k=>!['snapshot','viewports','delivery','media'].includes(k)))throw Error('Unsupported traceability options');
 for(const [k,format] of [['snapshot','manufact-seo-html-snapshot-v1'],['viewports','manufact-seo-viewport-evidence-v1']]){
  const value=options[k];
  if(value&&(value.format!==format||value.siteId&&value.siteId!==site.siteId||!Array.isArray(value.pages)))
   throw Error('Invalid '+k+' evidence for traceability');
 }
 const current=new Map(site.pages.map(p=>[p.id,p]));
 const html=new Map((options.snapshot?.pages||[]).map(p=>[p.id,p]));
 const viewports=new Map((options.viewports?.pages||[]).map(p=>[p.id,p]));
 const content=new Map((audit?.contentReview?.pages||[]).map(p=>[p.pageId,p]));
 const http=options.delivery?require('./delivery-evidence.cjs').review(site,options.delivery):null;
 const delivered=new Map((http?.pages||[]).map(p=>[p.pageId,p]));
 const media=options.media?require('./media-delivery.cjs').review(site,options.media,options.snapshot):null;
 const mediaIssues=new Map();
 for(const x of media?.findings||[])if(x.pageId){const list=mediaIssues.get(x.pageId)||[];list.push(x.code);mediaIssues.set(x.pageId,list);}
 const triage=new Map();
 for(const key of ['approved','rejected','deferred'])for(const item of decisions?.[key]||[])
  triage.set(item.taskId,key);
 const pages=b.pages.map(p=>{
  const live=current.get(p.id)||null,h=html.get(p.id),v=viewports.get(p.id);
  const htmlMatched=Boolean(live&&h&&live.path===h.path);
  const viewportMatched=Boolean(live&&v&&live.path===v.path);
  const methods=Object.fromEntries(devices.map(d=>[d,viewportMatched&&v.captures?.[d]?.method||null]));
  const head=htmlMatched?readHead(h.html):null;
  const metadata=Object.fromEntries(['title','description','robots','ogTitle','ogDescription'].map(key=>{
   const source=live?live.seo?.[key]??(key==='robots'?'index':''):null;
   const observed={title:head?.title,description:head?.description,robots:head?.robots,
    ogTitle:head?.ogTitle,ogDescription:head?.ogDescription};
   return [key,{planned:p.seo[key],siteValue:source,
    matchesPlan:live?source===p.seo[key]:null,
    capturedHtml:head?.status==='parsed-head'?observed[key]??null:null}];
  }));
  const editorial=content.get(p.id)?.sections||[];
  const sections=p.sections.map(s=>{
   const impl=live?.sections?.find(x=>x.id===s.id)||null;
   const heading=impl?.elements?.find(x=>x.slot==='heading')?.values?.['content.text'];
   const value=typeof heading==='string'?heading:null;
   const headingEvidence=!impl?'section-missing':value===null?'needs-rendered-review':
    normalize(value)===normalize(s.heading)?'authoring-match':'authoring-diff';
   const cta=s.cta?{
    label:s.cta.label,toPageId:s.cta.toPageId,targetPath:b.pages.find(x=>x.id===s.cta.toPageId)?.path||null,
    authoredRouteEvidence:editorial.find(x=>x.sectionId===s.id)?.cta?.status||'unverified',
    clickTested:false,formDeliveryTested:false}:null;
   return {sectionId:s.id,heading:s.heading,level:s.level,present:Boolean(impl),
    component:impl?.component||null,authoringHeading:value,headingEvidence,
    mediaPurpose:s.media?.purpose||null,cta,visualAccepted:false};
  });
  const tasks=(backlog?.tasks||[]).filter(t=>t.pageId===p.id).map(t=>({
   taskId:t.taskId,priority:t.priority,phase:t.phase,owner:t.owner,sectionId:t.sectionId,
   decision:triage.get(t.taskId)||'undecided',
   dependsOn:t.dependsOn||[]
  }));
  const status=!live?'page-not-implemented':live.path!==p.path?'route-mismatch':
   sections.some(s=>!s.present)?'sections-missing':'mapped-needs-manual-review';
  return {pageId:p.id,path:p.path,intent:p.intent.type,implementation:{present:Boolean(live),
    sitePath:live?.path??null,routeMatchesPlan:live?live.path===p.path:null},
   metadata,htmlEvidence:{supplied:Boolean(h),pathMatched:htmlMatched,
    headParsed:head?.status==='parsed-head',liveHostVerified:false},
   deviceEvidence:{supplied:Boolean(v),pathMatched:viewportMatched,methods,
    allThreeMarkupSupplied:viewportMatched&&devices.every(d=>Boolean(methods[d])),
    screenshotOrVisualVerified:false},
   sections,mediaEvidence:{supplied:Boolean(media),ogImageAssetId:live?.seo?.ogImage||null,
    findingCodes:mediaIssues.get(p.id)||[],socialPreviewVerified:false},
   httpEvidence:{supplied:delivered.has(p.id),
    status:delivered.get(p.id)?.status??null,
    isExpectedPublicUrl:delivered.get(p.id)?.isExpectedPublicUrl??null,
    authenticatedLiveOrigin:false},taskIds:tasks.map(x=>x.taskId),tasks,
   schemaCandidates:p.schemaCandidates.map(c=>({type:c.type,verifiedOwnerFacts:c.eligible,
    releasedJsonLdChecked:false,richResultsPromised:false})),status};
 });
 const summary={
  plannedPages:pages.length,implementedPages:pages.filter(p=>p.implementation.present).length,
  plannedSections:pages.reduce((n,p)=>n+p.sections.length,0),
  mappedSections:pages.reduce((n,p)=>n+p.sections.filter(s=>s.present).length,0),
  matchedHtmlPages:pages.filter(p=>p.htmlEvidence.pathMatched).length,
  suppliedHttpPages:pages.filter(p=>p.httpEvidence.supplied).length,
  mediaTranscriptProvided:Boolean(media),
  allThreeDeviceMarkupPages:pages.filter(p=>p.deviceEvidence.allThreeMarkupSupplied).length,
  pagesWithBacklogTasks:pages.filter(p=>p.tasks.length).length,
  decisionsRecorded:decisions?(decisions.summary.approved+decisions.summary.rejected+decisions.summary.deferred):null,
  staleDecisions:decisions?.summary.stale??null,
  verifiedLiveSites:0,completedVisualApprovals:0
 };
 return {format:FORMAT,version:1,siteId:site.siteId,readOnly:true,summary,pages,
  manualAcceptance:[
   'Confirm owner facts, Blueprint revision and client approval',
   'Confirm three approved STATIC prototype images and portable design specification',
   'Review actual Site v1 content and page/section IDs against approved design',
   'Verify canonical, OG, sitemap, robots and status codes at the real HTTPS origin',
   'Check browser desktop/tablet/mobile visuals, content and interactive states',
   'Test real CTA routes, form delivery, anti-spam and accessibility',
   'Confirm saved CMS overrides, Save/Publish separation, history and rollback'
  ],automaticReleaseApproval:false,readyToPublish:false,
  limitations:'Only supplied Site v1 authoring fields, HTML and device markup; no visual, HTTP, functioning form, search indexing or actual release acceptance is verified.'};
}
function safe(x){
 return String(x??'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\\/g,'\\\\')
  .replace(/[<>&*_[\](){}#!|]/g,c=>'\\'+c).replace(/\x60/g,'\\'+String.fromCharCode(96)).slice(0,400);
}
function markdown(data){
 if(!data||data.format!==FORMAT||!data.readOnly)throw Error('Expected traceability report');
 const t=data.summary;
 const lines=['# SEO Blueprint to Site v1 implementation map','',
  'Project: '+safe(data.siteId)+' (read-only, not approval).','',
  'Implemented pages: '+t.implementedPages+'/'+t.plannedPages+
   '; mapped sections: '+t.mappedSections+'/'+t.plannedSections+
   '; HTML exports: '+t.matchedHtmlPages+
   '; full three-device markup sets: '+t.allThreeDeviceMarkupPages+
   '; supplied HTTP transcripts: '+t.suppliedHttpPages+'.','',
  '## Page mapping',''];
 for(const page of data.pages){
  lines.push('### '+safe(page.path)+' · '+safe(page.pageId),'',
   'Status: '+safe(page.status)+'; HTML: '+(page.htmlEvidence.pathMatched?'supplied':'not verified')+
   '; device markup: '+(page.deviceEvidence.allThreeMarkupSupplied?'three supplied':'not verified')+
   '; HTTP transcript: '+(page.httpEvidence.supplied?String(page.httpEvidence.status):'none')+'.','');
  for(const s of page.sections)lines.push('- '+safe(s.sectionId)+': '+safe(s.headingEvidence)+
   (s.cta?'; CTA: '+safe(s.cta.authoredRouteEvidence):'')+'.');
  if(page.tasks.length)lines.push('Related backlog: '+
   page.tasks.slice(0,12).map(t=>safe(t.taskId)+' ('+safe(t.decision)+')').join(', ')+(page.tasks.length>12?' (more in JSON)':'')+'.');
  lines.push('');
 }
 if(t.decisionsRecorded!==null)lines.push('Human decisions recorded: '+t.decisionsRecorded+
  '; stale decisions: '+t.staleDecisions+'. Rejected tasks are still visible in the full backlog.','');
 lines.push('## Human acceptance required','');
 for(const check of data.manualAcceptance)lines.push('- [ ] '+safe(check));
 lines.push('','No CMS edits, automatic release, rankings or performance certifications.');
 return lines.join('\n');
}
module.exports=Object.freeze({FORMAT,report,markdown});
