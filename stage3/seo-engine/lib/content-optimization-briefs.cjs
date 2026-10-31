'use strict';
/* Approved Blueprint + observed GSC metrics -> human editorial assignments. Never invent copy or change CMS. */
const {checkBlueprint}=require('./blueprint.cjs');
const {FORMAT:PERFORMANCE}=require('./gsc-performance.cjs');
const FORMAT='manufact-seo-editorial-briefs-v1';
const safe=x=>String(x??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/[|\\\x60*_<>{}\[\]#]/g,' ').replace(/\s+/g,' ').trim().slice(0,400);
function compile(blueprint,performance){
 const bp=checkBlueprint(blueprint);
 if(performance?.format!==PERFORMANCE||performance.siteId!==bp.siteId||
  !performance.readOnly||!Array.isArray(performance.pages)||!Array.isArray(performance.actions))
  throw Error('Editorial briefs require matching read-only performance report');
 const metrics=new Map(performance.pages.map(p=>[p.pageId,p]));
 const actions=new Map();
 for(const a of performance.actions){
  if(!a.pageId)continue;
  if(!actions.has(a.pageId))actions.set(a.pageId,[]);
  actions.get(a.pageId).push(a);
 }
 const facts=new Map(bp.facts.map(f=>[f.id,f]));
 const pagesById=new Map(bp.pages.map(p=>[p.id,p]));
 const pages=bp.pages.map(page=>{
  const evidence=metrics.get(page.id)||null,work=actions.get(page.id)||[];
  const claimIds=new Set(page.schemaCandidates.flatMap(s=>s.factIds));
  const sourceFacts=[...claimIds].map(id=>facts.get(id)).filter(Boolean)
   .map(f=>({id:f.id,claim:f.claim,status:f.status,origin:f.origin,
    source:f.source||null,manualVerificationRequired:f.status!=='confirmed'}));
  const sections=page.sections.map(s=>({
   sectionId:s.id,plannedHeading:s.heading,headingLevel:s.level,purpose:s.why,
   approvedTalkingPoints:s.points,mediaIntent:s.media||null,
   approvedCta:s.cta?{label:s.cta.label,goal:s.cta.purpose,
    targetPageId:s.cta.toPageId,targetPath:pagesById.get(s.cta.toPageId)?.path||null}:null,
   requirements:['Review approved content against actual published page.','Do not invent facts, guarantees or statistics.']
  }));
  const proposedActions=work.map(w=>({actionId:w.id,priority:w.priority,type:w.type,
   observation:w.reason,nextStep:w.nextStep,metrics:w.metrics,
   otherPages:w.otherPages||[]}));
  const paired=(evidence?.topQueries||[]).slice(0,20).map(q=>({
   query:q.query,clicks:q.clicks,impressions:q.impressions,averagePosition:q.averagePosition,
   declaredTopicMatch:q.declaredTopicMatch,usage:'Review search intent; not a mandatory exact-match phrase.'
  }));
  const editorialStatus=work.length?'review-prioritized':evidence?.metrics?'observed-no-trigger':'no-measured-page-row';
  return {pageId:page.id,path:page.path,name:page.name,
   editorialStatus,robotsPlan:page.seo.robots,implementedRouteStatus:evidence?.implementation||'unverified',
   approvedContent:{intent:page.intent,metaTitle:page.seo.title,metaDescription:page.seo.description,
    canonicalPath:page.seo.canonicalPath,sections,
    contextualLinks:page.links.map(l=>({anchor:l.anchor,why:l.why,targetPageId:l.toPageId,targetPath:l.toPath})),
    schemaCandidates:page.schemaCandidates.map(s=>({type:s.type,eligibleByDeclaredFacts:s.eligible,
     why:s.why,factIds:s.factIds}))},
   factualClaims:sourceFacts,unverifiedFacts:sourceFacts.filter(x=>x.manualVerificationRequired).map(x=>x.id),
   currentMetrics:evidence?.metrics||null,previousMetrics:evidence?.previousMetrics||null,
   measuredPageQueries:paired,queryEvidenceScope:evidence?.pairedQueryCoverage||'unavailable',
   editorialActions:proposedActions,manualReviewRequired:true,
   acceptanceChecks:['Verify copy against approved owner facts and actual page.',
    'Check current public snippets and mobile presentation before changing fields.',
    'Preserve approved navigation, form behavior, media, canonical and intended indexation.',
    'Any edit requires owner workflow Save/Publish and independent release review.']};
 });
 const prioritized=pages.filter(p=>p.editorialActions.length).sort((a,b)=>{
  const p=x=>x.editorialActions.some(a=>a.priority==='P1')?0:1;
  return p(a)-p(b)||(b.currentMetrics?.impressions||0)-(a.currentMetrics?.impressions||0)||a.path.localeCompare(b.path);
 });
 return {format:FORMAT,version:1,siteId:bp.siteId,origin:performance.publicOrigin,
  period:performance.period,sourceReportFormat:performance.format,readOnly:true,
  summary:{approvedPages:pages.length,pagesWithActions:prioritized.length,
   briefsWithPairedQueries:pages.filter(p=>p.measuredPageQueries.length).length,
   unverifiedStructuredDataClaimRefs:pages.reduce((n,p)=>n+p.unverifiedFacts.length,0)},
  priorityPageIds:prioritized.map(p=>p.pageId),pages,
  boundaries:['Blueprint metadata and sections are approved PLAN content, not confirmed published HTML.',
   'Search Console queries are observational evidence and may be anonymized or truncated.',
   'No title rewrite, hidden CMS edits, automatic posting, schema publication or keyword stuffing.',
   'An eligible Schema.org candidate is NOT verified eligible for Google rich results.']};
}
function markdown(report){
 if(report?.format!==FORMAT)throw Error('Invalid editorial brief report');
 const lines=['# MANUFACT SEO — evidence-based editorial page briefs','',
  'PRIVATE. All text below derives from approved Blueprint + operator-supplied GSC rows, not a new generated customer claim.','',
  'Site: '+safe(report.siteId)+' | Origin: '+safe(report.origin),
  'Period: '+report.period.start+' — '+report.period.end,
  'Pages requiring prioritized human work: '+report.summary.pagesWithActions,''];
 const ranks=new Map(report.priorityPageIds.map((id,i)=>[id,i]));
 const ordered=report.pages.slice().sort((a,b)=>(ranks.get(a.pageId)??999)-(ranks.get(b.pageId)??999)||a.path.localeCompare(b.path));
 for(const p of ordered){
  lines.push('## '+safe(p.name)+' — '+safe(p.path),'',
   'Status: '+p.editorialStatus+' | Approved robots: '+p.robotsPlan+' | Implemented route: '+p.implementedRouteStatus,
   'Intent: '+safe(p.approvedContent.intent.type)+' — '+safe(p.approvedContent.intent.need),
   'Approved topics: '+p.approvedContent.intent.topics.map(safe).join('; '),
   'Approved title: '+safe(p.approvedContent.metaTitle),
   'Approved description: '+safe(p.approvedContent.metaDescription),
   'Approved canonical path: '+safe(p.approvedContent.canonicalPath),
   'Current measured clicks / impressions: '+(p.currentMetrics?p.currentMetrics.clicks+' / '+p.currentMetrics.impressions:'no supplied row'),
   '');
  if(p.editorialActions.length){
   lines.push('### Priority human work','');
   for(const a of p.editorialActions)lines.push('- '+a.priority+' / '+safe(a.type)+': '+safe(a.observation)+' Next: '+safe(a.nextStep));
   lines.push('');
  }
  if(p.measuredPageQueries.length){
   lines.push('### Observed paired GSC queries (not exact-match writing orders)','');
   for(const q of p.measuredPageQueries.slice(0,12))
    lines.push('- '+safe(q.query)+' — '+q.impressions+' impressions, '+q.clicks+' clicks, average position '+q.averagePosition);
   lines.push('');
  }
  lines.push('### Approved section outline','');
  for(const s of p.approvedContent.sections){
   lines.push('- H'+s.headingLevel+' '+safe(s.plannedHeading)+' ('+safe(s.sectionId)+') — '+safe(s.purpose));
   for(const point of s.approvedTalkingPoints)lines.push('  - '+safe(point));
   if(s.approvedCta)lines.push('  - Approved CTA: '+safe(s.approvedCta.label)+' → '+safe(s.approvedCta.targetPath));
  }
  if(p.approvedContent.contextualLinks.length){
   lines.push('','### Approved contextual links','');
   for(const l of p.approvedContent.contextualLinks)lines.push('- '+safe(l.anchor)+' → '+safe(l.targetPath)+' ('+safe(l.why)+')');
  }
  if(p.factualClaims.length){
   lines.push('','### Declared facts for Schema.org candidates — human verification required','');
   for(const f of p.factualClaims)lines.push('- '+safe(f.id)+' ['+f.status+']: '+safe(f.claim));
  }
  lines.push('','### Mandatory owner/editor checks','');
  for(const check of p.acceptanceChecks)lines.push('- '+safe(check));
  lines.push('');
 }
 lines.push('## Scope and limitations','');
 for(const boundary of report.boundaries)lines.push('- '+safe(boundary));
 return lines.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,compile,markdown});
