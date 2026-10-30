'use strict';
/* Real per-site JSON-LD semantic risk audit against operator-supplied public
 * HTML, owner-approved Blueprint facts and canonical mount. No schema
 * generation, CMS mutation, rich-result eligibility or Google claim.
 */
const BP=require('./blueprint.cjs');
const DELIVERY=require('./delivery-evidence.cjs');
const crypto=require('node:crypto');
const FORMAT='manufact-seo-structured-data-audit-v1',SHA=/^[a-f0-9]{64}$/;
const TYPES=new Set(['Organization','LocalBusiness','BreadcrumbList','Article','Product','Service','FAQPage']);
const CLAIMS=new Set(['aggregateRating','review','offers','price','priceCurrency','priceSpecification',
 'availability','lowPrice','highPrice','ratingValue','ratingCount','reviewCount','geo',
 'address','telephone','openingHours','openingHoursSpecification','award','sameAs',
 'hasCredential','foundingDate','employee','numberOfEmployees']);
const RISK_FIELDS=['@id','url','mainEntityOfPage','item','itemListElement','about','isPartOf'];
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const assert=(v,m)=>{if(!v)throw Error('Structured data source: '+m)};
const clip=x=>String(x??'').replace(/[\x00-\x1f\x7f<>|]/g,' ').trim().slice(0,170);
const pos={P0:0,P1:1,P2:2};
const LIMIT={pages:80,html:500000,scripts:60,script:100000,documents:500,
 nodes:900,depth:20,findings:700};
function attr(raw,key){
 const re=new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i');
 const m=re.exec(raw);return m?(m[1]??m[2]??m[3]):null;
}
const arr=x=>Array.isArray(x)?x:[x];
function parse(html){
 assert(typeof html==='string'&&html.length<=LIMIT.html,'oversized untrusted HTML');
 const scripts=[];
 // Remove comments and inert templates. This is source inspection, not DOM execution.
 const text=html.replace(/<!--[\s\S]*?-->/g,'')
  .replace(/<template\b[^>]*>[\s\S]*?<\/template\s*>/gi,'');
 for(const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if((attr(m[1],'type')||'').trim().toLowerCase()!=='application/ld+json')continue;
  assert(scripts.length<LIMIT.scripts,'too many JSON-LD scripts');
  const body=m[2];
  if(body.length>LIMIT.script){scripts.push({error:'oversized-json-ld'});continue}
  try{scripts.push({value:JSON.parse(body)})}
  catch{scripts.push({error:'invalid-json-ld'})}
 }
 return scripts;
}
function extract(raw){
 const nodes=[],refs=[];
 let visits=0;
 const walk=(node,depth=0)=>{
  if(++visits>LIMIT.nodes||depth>LIMIT.depth)throw Error('Structured data graph too large/deep');
  if(node===null||typeof node!=='object')return;
  if(Array.isArray(node)){for(const x of node)walk(x,depth+1);return}
  const t=arr(node['@type']).filter(x=>typeof x==='string').slice(0,15);
  if(t.length){nodes.push({object:node,types:t});}
  if(node['@graph']!==undefined)walk(node['@graph'],depth+1);
  if(node.mainEntity!==undefined&&typeof node.mainEntity==='object')walk(node.mainEntity,depth+1);
  if(node.itemListElement!==undefined&&typeof node.itemListElement==='object')
   walk(node.itemListElement,depth+1);
  for(const k of ['subjectOf','hasPart'])if(Array.isArray(node[k]))walk(node[k],depth+1);
 };
 walk(raw);
 assert(nodes.length<=LIMIT.documents,'too many schema nodes');
 return nodes;
}
function canonicalUrl(base,p){
 return new URL(base).href+p.replace(/^\//,'');
}
function safeUrl(value,base){
 if(typeof value!=='string'||value.length>2048||value.includes('\\')){
  return {status:'unknown',url:null};
 }
 let u;try{u=new URL(value,base)}catch{return {status:'invalid',url:null}}
 if(u.protocol!=='https:'||u.username||u.password)return {status:'invalid',url:null};
 const b=new URL(base),mount=b.pathname;
 const within=u.origin===b.origin&&u.pathname.startsWith(mount)&&!u.search;
 return {status:within?'same-site':'outside-mount',url:u.href};
}
function listBreadcrumbs(value){
 const items=arr(value);
 if(!items.length||items.length>30)return {ok:false,reason:'missing-or-oversized-list',items:[]};
 const out=[];
 for(const x of items){
  if(!x||typeof x!=='object')return {ok:false,reason:'invalid-breadcrumb-item',items:[]};
  const target=typeof x.item==='string'?x.item:
   typeof x.item==='object'&&x.item!==null?
    (x.item['@id']||x.item.url):x.url;
  out.push({position:x.position,name:x.name||x.item?.name||null,target});
 }
 return {ok:true,items:out};
}
function review({blueprint,blueprintRawSha256,site,siteRawSha256,
 capture,captureRawSha256,expectedBase=null}={}){
 const bp=BP.checkBlueprint(blueprint);
 assert(SHA.test(blueprintRawSha256||'')&&SHA.test(siteRawSha256||'')&&
  SHA.test(captureRawSha256||''),'original approved Blueprint, Site v1 and HTTP transcript SHA256 required');
 assert(site?.format==='manufact-ai-site-v1'&&site.schemaVersion===1&&site.siteId===bp.siteId&&
  Array.isArray(site.pages)&&site.pages.length<=LIMIT.pages,'same original Site v1 required');
 assert(capture?.format===DELIVERY.FORMAT&&capture.siteId===bp.siteId,
  'same original read-only public HTTPS evidence required');
 const origin=new URL(capture.origin);
 assert(origin.protocol==='https:'&&origin.pathname.endsWith('/')&&
  !origin.search&&!origin.hash&&!origin.username&&!origin.password,
  'canonical public HTTPS origin/mount required');
 if(expectedBase!==null)assert(expectedBase===capture.origin,'approved exact crawl mount differs from capture');
 DELIVERY.assertEvidence(capture);
 const byId=new Map(bp.pages.map(p=>[p.id,p]));
 assert(site.pages.every(p=>p&&byId.has(p.id)&&byId.get(p.id).path===p.path)||
  site.pages.some(p=>!byId.has(p.id)),'placeholder');
 const knownPaths=new Set(bp.pages.map(p=>p.path));
 const observed=new Set(),reports=[],findings=[],holds=[];
 const add=(page,code,priority,field,detail,extra={})=>{
  if(findings.length>=LIMIT.findings)return;
  const location=page?.path||null;
  const base={code:'schema:'+code,priority,pageId:page?.id||null,
   path:location,field:field||null,detail:clip(detail),
   manualOnly:true,claimedGoogleVerified:false,automaticFix:false,...extra};
  findings.push(base);
 };
 for(const e of capture.pages){
  const page=byId.get(e.id),original=site.pages.find(p=>p.id===e.id);
  if(!page||e.path!==page.path||!original||original.path!==page.path)
   continue;
  if(observed.has(page.id))throw Error('Structured data source: duplicate approved public page capture');
  observed.add(page.id);
  const canonical=canonicalUrl(capture.origin,page.seo.canonicalPath);
  const served=canonicalUrl(capture.origin,page.path);
  const full=e.status>=200&&e.status<300&&e.requestUrl===served&&
   e.responseUrl===served&&typeof e.html==='string'&&/<head\b/i.test(e.html);
  const eligible=new Map(page.schemaCandidates.filter(x=>x.eligible)
   .map(x=>[x.type,x]));
  const candidateByType=new Map(page.schemaCandidates.map(x=>[x.type,x]));
  const counts={},types=new Set(),claimedFields=new Set();
  let scripts=[],parseErrors=0,canInspect=full&&capture.rootRecheck?.matched!==false;
  if(!canInspect){
   add(page,'public-html-unavailable','P1','html',
    'Exact approved 2xx public HTML is missing, changed during capture or does not have a head.');
  }else{
   try{scripts=parse(e.html)}catch{canInspect=false;
    add(page,'unparseable-public-html','P1','html','Public HTML source or JSON-LD script count exceeds audit limits.');
   }
  }
  if(canInspect)for(let i=0;i<scripts.length;i++){
   const s=scripts[i];
   if(s.error){parseErrors++;add(page,s.error,'P1','script',
    'Supplied JSON-LD script #'+(i+1)+' cannot be parsed safely.');continue}
   let nodes;
   try{nodes=extract(s.value)}catch{parseErrors++;
    add(page,'invalid-schema-graph','P1','@graph',
     'JSON-LD script #'+(i+1)+' contains an oversized, recursive-like or unsupported graph.');continue}
   if(nodes.length===0)add(page,'missing-typed-node','P1','@type',
    'JSON-LD script #'+(i+1)+' contains no typed entity.');
   for(const node of nodes){
    const obj=node.object,typesHere=node.types;
    for(const t of typesHere){
     const type=t.replace(/^https?:\/\/schema\.org\//,'');
     types.add(type);counts[type]=(counts[type]||0)+1;
     if(TYPES.has(type)){
      if(!candidateByType.has(type))
       add(page,'unspecified-schema-type','P1','@type',
        'Published '+type+' has no approved Blueprint candidate: obtain owner editorial approval before retaining claims.',{type});
      else if(!eligible.has(type)){
       add(page,'candidate-unverified-facts','P0','@type',
        'Published '+type+' candidate references unconfirmed Blueprint owner facts: do not claim its accuracy.',{type});
      }
     }
    }
    for(const key of CLAIMS){
     if(obj[key]===undefined)continue;
     claimedFields.add(key);
     add(page,'claim-needs-owner-evidence','P1',key,
      'Published '+key+' may assert business, reputation, price or other regulated facts; verify current source with site owner.',
      {claimField:key});
    }
    for(const field of ['@id','url','mainEntityOfPage']){
     const raw=field==='mainEntityOfPage'&&typeof obj[field]==='object'&&obj[field]?
      obj[field]['@id']||obj[field].url:obj[field];
     if(raw===undefined)continue;
     const resolved=safeUrl(raw,capture.origin);
     if(resolved.status==='invalid'||resolved.status==='outside-mount')
      add(page,'entity-url-unsafe','P1',field,
       'JSON-LD entity URL is invalid, not HTTPS or escapes the approved public site mount.',
       {urlClassification:resolved.status});
     else if(resolved.status==='same-site'&&
      (field==='url'||typesHere.includes('WebPage')||typesHere.includes('Article'))&&
      resolved.url.split('#')[0]!==canonical)
      add(page,'entity-canonical-mismatch','P1',field,
       'JSON-LD page entity URL does not resolve to the approved canonical page.',
       {urlClassification:'other-local-canonical'});
    }
    if(typesHere.includes('BreadcrumbList')||
     typesHere.includes('https://schema.org/BreadcrumbList')){
     const crumbs=listBreadcrumbs(obj.itemListElement);
     if(!crumbs.ok){add(page,'breadcrumb-invalid','P1','itemListElement',
      'Published BreadcrumbList is missing, oversized or malformed.');continue}
     const positions=crumbs.items.map(x=>x.position);
     if(positions.some((x,i)=>x!==i+1))
      add(page,'breadcrumb-positions','P1','position',
       'BreadcrumbList positions must be unique, consecutive 1..N.');
     const targets=crumbs.items.map(x=>safeUrl(x.target,capture.origin));
     if(targets.some(x=>x.status!=='same-site'))
      add(page,'breadcrumb-foreign-url','P1','item',
       'Breadcrumb item URL is missing, invalid or escapes the approved mount.');
     else{
      if(targets.at(-1).url.split('#')[0]!==canonical)
       add(page,'breadcrumb-tail-canonical','P1','item',
        'Last BreadcrumbList item is not the approved canonical page.');
      if(targets.some(x=>!knownPaths.has(new URL(x.url).pathname.slice(
       new URL(capture.origin).pathname.length-1))))
       add(page,'breadcrumb-unknown-target','P2','item',
        'BreadcrumbList refers to a route outside approved Blueprint; owner review required.');
     }
    }
   }
  }
  for(const t of eligible.keys())if(canInspect&&!types.has(t))
   holds.push({pageId:page.id,path:page.path,type:t,kind:'APPROVED-CANDIDATE-NOT-PUBLISHED',
    priority:'P2',manualNext:'Owner decide whether factual, visible source content supports '+t+
     '; this is not an automatic missing-schema error.'});
  const dupes=Object.entries(counts).filter(([k,n])=>n>1&&TYPES.has(k));
  for(const [type,n]of dupes)add(page,'duplicate-typed-entity','P2','@type',
   'Multiple '+type+' nodes ('+n+') require @id identity review; duplicates are not necessarily errors.',{type});
  reports.push({pageId:page.id,path:page.path,canonicalPath:page.seo.canonicalPath,
   canonicalPublicUrl:canonical,observedHttpStatus:e.status,htmlInspectible:canInspect,
   scriptCount:scripts.length,parseErrors,publishedTypes:[...types].sort(),
   approvedSchemaCandidates:page.schemaCandidates.map(x=>({type:x.type,eligible:x.eligible,
    factCount:x.factIds.length})),
   claimFieldNames:[...claimedFields].sort(),fullClaimsCopied:false,
   publicHostAuthenticated:false});
 }
 for(const p of bp.pages)if(!observed.has(p.id)){
  add(p,'approved-page-not-captured','P1','html',
   'Approved Blueprint route was not part of the public HTTP transcript. Structured data status UNKNOWN.');
  reports.push({pageId:p.id,path:p.path,canonicalPath:p.seo.canonicalPath,
   canonicalPublicUrl:canonicalUrl(capture.origin,p.seo.canonicalPath),
   observedHttpStatus:null,htmlInspectible:false,scriptCount:0,parseErrors:0,
   publishedTypes:[],approvedSchemaCandidates:p.schemaCandidates.map(x=>({
    type:x.type,eligible:x.eligible,factCount:x.factIds.length})),
   claimFieldNames:[],fullClaimsCopied:false,publicHostAuthenticated:false});
 }
 const active=reports.filter(x=>x.htmlInspectible).length;
 const count=Object.fromEntries(['P0','P1','P2'].map(p=>[p,findings.filter(f=>f.priority===p).length]));
 findings.sort((a,b)=>pos[a.priority]-pos[b.priority]||
  (a.path||'').localeCompare(b.path||'')||a.code.localeCompare(b.code));
 const coverage={approvedPages:bp.pages.length,reviewablePublicPages:active,
  missingOrUninspectable:bp.pages.length-active,
  publicRootWindowStable:capture.rootRecheck?.matched??null,
  suppliedPublicCaptureTime:capture.capturedAt||null};
 return {format:FORMAT,version:1,siteId:bp.siteId,base:capture.origin,readOnly:true,
  inputSHA256:{blueprint:blueprintRawSha256,site:siteRawSha256,publicHttp:captureRawSha256},
  canonicalApprovedBlueprintSha256:sha(JSON.stringify(bp)),
  coverage,summary:{findings:findings.length,P0:count.P0,P1:count.P1,P2:count.P2,
   pendingCandidateDecisions:holds.length,uninspectedPages:coverage.missingOrUninspectable},
  pages:reports,findings,manualCandidates:holds,
  boundaries:[
   'Matching the approved Blueprint and JSON-LD syntax is not evidence that real business facts are true.',
   'Schema candidate eligibility is only a source-confirmation gate, NOT a Google rich-result guarantee.',
   'Empty or absent structured data is not an error by default; optional candidates remain human editorial decisions.',
   'Observed HTML and dates are operator supplied; public host, CMS revision, live source authenticity and indexing are unverified.',
   'Audit is a bounded HTML source inspection, not rendered DOM, JavaScript execution or exhaustive Schema.org validator.',
   'All comments and prices/reviews/addresses in JSON-LD require separate owner-backed confirmation. No automatic edits or publishing.'
  ],automaticFix:false,ownerApproved:false,releaseAuthorized:false,
  publicHostAuthenticated:false,googleEligibilityVerified:false};
}
function markdown(r){
 assert(r?.format===FORMAT&&r.releaseAuthorized===false,'read-only structured data audit required');
 const out=['# MANUFACT — Per-site Structured Data / JSON-LD QA','',
 'Private, operator-supplied public HTML · no Google rich-result guarantee · NO CMS SAVE','',
 'Site '+clip(r.siteId)+' · '+clip(r.base),
 'Public pages inspectible '+r.coverage.reviewablePublicPages+'/'+r.coverage.approvedPages,
 'P0 '+r.summary.P0+' / P1 '+r.summary.P1+' / P2 '+r.summary.P2,
 'Optional approved candidates requiring editorial decision '+r.summary.pendingCandidateDecisions,'',
 '## Evidence SHA256',...Object.entries(r.inputSHA256).map(([k,v])=>'- '+k+': '+v),'',
 '## Manual priority worklist',''];
 for(const f of r.findings)out.push('- **'+f.priority+'** '+clip(f.path)+' / '+clip(f.code)+
  ' / '+clip(f.field)+' — '+clip(f.detail));
 if(!r.findings.length)out.push('- No rule triggered in inspected source. Real truth and Google eligibility unverified.');
 out.push('','## Optional schema candidate decisions','');
 for(const h of r.manualCandidates)out.push('- '+clip(h.path)+': '+clip(h.type)+' — '+clip(h.manualNext));
 if(!r.manualCandidates.length)out.push('- None in inspected sources.');
 out.push('','## Limits','');for(const l of r.boundaries)out.push('- '+clip(l));
 return out.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,LIMIT,parse,extract,review,markdown});
