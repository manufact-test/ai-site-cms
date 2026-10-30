'use strict';
/* Draft-only search delivery repair. Keep existing robots policies; modify an
 * isolated agent group ONLY for explicitly owner-selected canonical page IDs.
 * Generated files are private candidates, never public release or client consent.
 */
const BP=require('./blueprint.cjs');
const POLICY=require('./crawl-policy.cjs');
const DELTA=require('./crawl-policy-delta.cjs');
const FORMAT='manufact-seo-crawl-repair-plan-v1';
const SITE_ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const XML_SAFE=/[&<>"']/g;
const xmlEscape=s=>s.replace(XML_SAFE,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function verifySite(blueprint,site){
 const bp=BP.checkBlueprint(blueprint);
 if(!site||site.siteId!==bp.siteId||!Array.isArray(site.pages)||
  site.pages.length!==bp.pages.length||site.pages.length>80)
  throw Error('Crawl repair requires same-site, matching published Site v1 page inventory');
 const byId=new Map(),routes=new Set();
 for(const p of site.pages){
  if(!p||typeof p.id!=='string'||!SITE_ROUTE.test(p.path)||byId.has(p.id)||routes.has(p.path))
   throw Error('Site v1 has invalid/duplicate page identity');
  byId.set(p.id,p);routes.add(p.path);
 }
 const differences=[];
 for(const p of bp.pages){
  const curr=byId.get(p.id);
  if(!curr){differences.push({pageId:p.id,reason:'missing-published-page'});continue;}
  const robots=curr.seo?.robots||'index';
  const canonical=curr.seo?.canonicalPath||curr.path;
  if(curr.path!==p.path||robots!==p.seo.robots||canonical!==p.seo.canonicalPath){
   differences.push({pageId:p.id,reason:'published-seo-diff',
    published:{path:curr.path,robots,canonical},
    approved:{path:p.path,robots:p.seo.robots,canonical:p.seo.canonicalPath}});
  }
 }
 for(const p of site.pages)if(!bp.pages.some(x=>x.id===p.id))
  differences.push({pageId:p.id,reason:'unapproved-published-route'});
 if(differences.length)
  throw Error('Published Site v1 disagrees with approved Blueprint routes, canonical or robots: '+
   differences.slice(0,4).map(d=>d.pageId+':'+d.reason).join(', '));
 return {pageCount:bp.pages.length,
  inspectionOnly:true,siteV1Authenticated:false,
  sourceReconciledByPageIdentity:true,
  publishedRevisionAuthenticated:false};
}
function sitemap(blueprint,base){
 const bp=BP.checkBlueprint(blueprint),origin=POLICY.baseUrl(base);
 const routes=bp.pages.filter(p=>p.seo.robots==='index'&&p.seo.canonicalPath===p.path)
  .map(p=>p.path).sort((a,b)=>a.localeCompare(b,'en'));
 if(!routes.includes('/'))throw Error('Approved Blueprint must have a canonical indexable home');
 const urls=routes.map(path=>POLICY.urlFor(origin,path));
 const content='<?xml version="1.0" encoding="UTF-8"?>\n'+
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
  urls.map(loc=>'  <url><loc>'+xmlEscape(loc)+'</loc></url>\n').join('')+
  '</urlset>\n';
 return {content,paths:routes,urls,knownLastmod:false,
  source:'approved-canonical-indexable-blueprint-pages'};
}
const eligible=p=>p.seo.robots==='index'&&p.seo.canonicalPath===p.path;
function repair(blueprint,site,{base,robotsText,sitemapXml,allowPageIds=[],agents=['Googlebot'],
 scope='complete',addSitemapPointer=true}){
 const bp=BP.checkBlueprint(blueprint);
 const siteCheck=verifySite(bp,site),baseUrl=POLICY.baseUrl(base);
 if(typeof robotsText!=='string'||typeof sitemapXml!=='string'||
  !Array.isArray(allowPageIds)||allowPageIds.length>80||
  allowPageIds.some(x=>typeof x!=='string')||
  new Set(allowPageIds).size!==allowPageIds.length||
  !Array.isArray(agents)||!agents.length||agents.length>3||
  agents.some(x=>!['Googlebot','Bingbot'].includes(x))||
  new Set(agents).size!==agents.length||
  typeof addSitemapPointer!=='boolean')
  throw Error('Crawl repair intent requires distinct approved page IDs and explicit selected crawler agents');
 const before=POLICY.analyze({blueprint:bp,base,robotsText,sitemapXml,
  agents:[...new Set([...agents,'*'])],scope});
 const generated=sitemap(bp,base);
 const requestSet=new Set(allowPageIds);
 for(const id of requestSet){
  const page=bp.pages.find(p=>p.id===id);
  if(!page)throw Error('Requested crawler repair page ID is absent from approved Blueprint: '+id);
  if(!eligible(page))
   throw Error('Refusing to suggest crawl exemptions for a noindex/noncanonical alias: '+id);
 }
 const parsed=POLICY.parseRobots(robotsText);
 const holds=[],changed=[],candidates=[];
 const insertions=new Map();
 const requested=bp.pages.filter(p=>requestSet.has(p.id));
 for(const page of requested){
  const path=baseUrl.pathname+page.path.slice(1);
  for(const agent of agents){
   const original=POLICY.decide(parsed,agent,path);
   if(original.allowed){
    changed.push({pageId:page.id,path:page.path,agent,status:'already-allowed',
     rule:null,automatic:false});continue;
   }
   // Adding a new User-agent group can silently discard wildcard Disallow rules.
   // A shared/duplicated/wildcard group is NEVER auto-rewritten.
   const matching=parsed.groups.filter(g=>g.agents.some(x=>x.toLowerCase()===agent.toLowerCase()));
   if(matching.length!==1||matching[0].agents.length!==1||!matching[0].rules.length){
    holds.push({pageId:page.id,path:page.path,agent,
     reason:'shared-wildcard-or-ambiguous-agent-group',
     detail:'Do not append a new user-agent block: it can override existing broad exclusions.',
     originalRule:original.matchedRule||null,manualOnly:true});
    continue;
   }
   const group=matching[0];
   const line=group.rules[group.rules.length-1].line;
   const exactAllow='Allow: '+path+'$';
   const sourceRules=group.rules.map(r=>r.kind+': '+r.pattern);
   if(sourceRules.some(rule=>rule.toLowerCase()===exactAllow.toLowerCase())){
    holds.push({pageId:page.id,path:page.path,agent,
     reason:'exact-allow-present-but-ineffective',
     originalRule:original.matchedRule||null,manualOnly:true});continue;
   }
   candidates.push({pageId:page.id,path:page.path,agent,rule:exactAllow,
    afterRuleLine:line,originalMatch:original.matchedRule||null});
   if(!insertions.has(line))insertions.set(line,new Set());
   insertions.get(line).add(exactAllow);
  }
 }
 // Place the owner-proposed exact allowances after the final rule of their
 // specific group. Multiple insertions at one line are inserted together.
 const LF=robotsText.includes('\r\n')?'\r\n':'\n';
 let lines=robotsText.split(/\r?\n/);
 for(const [line,rules] of [...insertions].sort((a,b)=>b[0]-a[0])){
  lines.splice(line,0,...[...rules].sort());
 }
 let proposedRobots=lines.join(LF);
 const sitemapUrl=baseUrl.href+'sitemap.xml';
 const pointers=parsed.sitemaps.map(p=>p.url);
 let pointerStatus='preserved-existing';
 if(pointers.length===0&&addSitemapPointer){
  proposedRobots=proposedRobots.replace(/(?:\r?\n)*$/,'')+LF+'Sitemap: '+sitemapUrl+LF;
  pointerStatus='added-missing-sitemap-pointer';
 }else if(pointers.length===0)pointerStatus='not-added-by-operator-choice';
 else if(!pointers.includes(sitemapUrl)){
  pointerStatus='existing-pointer-differs';
  holds.push({pageId:null,agent:null,path:null,reason:'existing-sitemap-pointer-differs',
   detail:'Existing robots Sitemap directive is preserved; operator must review host/mount and intended sitemap resources.',
   manualOnly:true});
 }
 const after=POLICY.analyze({blueprint:bp,base,
  robotsText:proposedRobots,sitemapXml:generated.content,
  agents:before.agents,scope:'complete'});
 const delta=DELTA.compare(
  {...before,scope:'complete'},after
 );
 // Source scope may be incomplete: never claim that newly generated full XML is
 // an observed improvement; explicit proposal status lives in this report.
 for(const candidate of candidates){
  const target=after.pages.find(p=>p.pageId===candidate.pageId);
  const actual=target.crawlerDecisions.find(d=>d.agent===candidate.agent);
  if(!actual.allowed)
   holds.push({pageId:candidate.pageId,path:candidate.path,agent:candidate.agent,
    reason:'target-remains-blocked-after-proposal',manualOnly:true});
  else changed.push({pageId:candidate.pageId,path:candidate.path,agent:candidate.agent,
   status:'candidate-unblocked',rule:candidate.rule,
   previousRule:candidate.originalMatch,automatic:false});
 }
 const newlyDenied=delta.changes.filter(c=>c.kind==='new-robots-block');
 if(newlyDenied.length)
  throw Error('Proposed crawler changes introduce newly denied approved routes');
 const unexpected=delta.changes.filter(c=>c.kind==='robots-access-restored'&&
  !candidates.some(t=>t.pageId===c.pageId&&t.agent===c.agent));
 if(unexpected.length)
  holds.push(...unexpected.map(x=>({pageId:x.pageId,path:x.path,agent:x.agent,
   reason:'unrequested-crawler-access-change',detail:'Review full agent blast radius.',manualOnly:true})));
 return {format:FORMAT,version:1,siteId:bp.siteId,readOnly:true,
  sourceSiteCheck:siteCheck,base,priorSitemapKind:before.sitemapMeta.kind,
  priorSitemapScope:scope,generatedUrls:generated.urls,
  proposedRobots,proposedSitemap:generated.content,
  pointerStatus,requestedPageIds:[...requestSet].sort(),
  requestedAgents:agents,
  exactAllowSuggestions:candidates,appliedSuggestions:changed,
  manualHolds:holds,comparison:delta,
  policyBefore:before,policyCandidate:after,
  summary:{pages:bp.pages.length,
   sitemapUrls:generated.urls.length,
   newAllowRules:candidates.length,
   successfullyUnblocked:changed.filter(x=>x.status==='candidate-unblocked').length,
   needsManualReview:holds.length,
   newDisallowedApprovedPages:newlyDenied.length},
  ownerReviewRequired:true,publicHostAuthenticated:false,
  sitePublicationAuthenticated:false,releaseAuthorized:false,
  artifactsDraftOnly:true,
  limitations:[
   'These are private file candidates, not an approved CMS or static hosting release.',
   'Owner-supplied Site v1 snapshot is checked for structural parity, not authenticated against CMS.',
   'The new sitemap includes approved canonical indexable URLs only; existence on real host is not verified.',
   'No lastmod values are invented. Parent sitemap-index children must be independently verified.',
   'An explicit Allow may change real crawler access. Group-specific rules are proposed only when unambiguous.',
   'Never deploy candidate robots/sitemap without lead and owner review of full public HTTP, SEO and privacy policy.'
  ]};
}
function markdown(plan){
 if(plan?.format!==FORMAT||plan.releaseAuthorized!==false)
  throw Error('Expected private non-authorizing search file candidate');
 const clean=x=>String(x??'').replace(/[|<>\u0000-\u001f]/g,' ').slice(0,250);
 const lines=['# MANUFACT SEO — private search delivery repair candidate','',
  'DO NOT UPLOAD. Owner/CMS lead must review and authorize a separate publisher release.','',
  'Site: '+clean(plan.siteId)+' · Base: '+clean(plan.base),
  'Pages: '+plan.summary.pages+' · proposed canonical sitemap URLs: '+plan.summary.sitemapUrls,
  'Exact agent allow proposals: '+plan.summary.newAllowRules+
  ' · manual holds: '+plan.summary.needsManualReview,'',
  '## Proposed sitemap routes',''];
 for(const url of plan.generatedUrls)lines.push('- '+clean(url));
 lines.push('','## Exact agent-group Allow changes','');
 for(const x of plan.appliedSuggestions)lines.push('- '+clean(x.pageId)+' · '+clean(x.agent)+
  ' · '+clean(x.status)+' · '+clean(x.rule||'(existing allowance)'));
 lines.push('','## Owner-required review / no automatic changes','');
 for(const hold of plan.manualHolds)lines.push('- '+clean(hold.pageId||'site')+' / '+
  clean(hold.agent||'all')+': '+clean(hold.reason)+' · '+clean(hold.detail||''));
 if(!plan.manualHolds.length)lines.push('- No ambiguous group flagged, but owner authorization is STILL required.');
 lines.push('','## Safety notes','');
 plan.limitations.forEach(s=>lines.push('- '+clean(s)));
 return lines.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,verifySite,sitemap,repair,markdown});
