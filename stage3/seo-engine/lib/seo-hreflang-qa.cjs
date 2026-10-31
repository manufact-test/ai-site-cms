'use strict';
/* Bounded offline international-alternate SEO QA over already approved public
 * HTML and source-paired browser DOM. No external language URLs are fetched or
 * echoed. Do not infer owner-approved translations or a release decision.
 */
const HTML=require('./html-evidence.cjs');
const FORMAT='manufact-seo-hreflang-qa-v1';
const DEVICES=['desktop','tablet','mobile'];
const LOCALE=/^(?:[a-z]{2,3}(?:-[a-z]{4})?(?:-(?:[a-z]{2}|\d{3}))?|x-default)$/i;
const fail=s=>{throw Error('SEO hreflang QA: '+s);};
const htmlEscape=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function alternateHead(html,approved,base){
 if(typeof html!=='string'||html.length>250000)fail('bounded original HTML required');
 const m=/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html);
 if(!m)return {status:'unknown',links:[],errors:[],total:0};
 const all=HTML.inspect('<html><head>'+m[1]+'</head></html>').links;
 const selected=all.filter(x=>Object.prototype.hasOwnProperty.call(x.attrs,'hreflang'));
 if(selected.length>80)return {status:'unknown',links:[],errors:['oversized-head-alternates'],total:0};
 const links=[],errors=[],byLocale=new Map();
 for(const entry of selected){
  const a=entry.attrs,lang=(a.hreflang||'').trim().toLowerCase();
  const rel=(a.rel||'').toLowerCase().split(/\s+/);
  if(!rel.includes('alternate'))errors.push('alternate-rel-absent');
  if(!LOCALE.test(lang))errors.push('malformed-language-code');
  if(a.media||a.type||a.as)errors.push('combined-alternate-attributes');
  const raw=a.href||'';
  if(!/^https:\/\//i.test(raw))errors.push('alternate-url-not-absolute-https');
  let target=null,scope='invalid';
  try{
   const u=new URL(raw);
   if(u.protocol==='https:'&&!u.username&&!u.password){
    target=u.href;
    const mount=new URL(base);
    if(u.search||u.hash){
     scope='external-or-offmount';
     errors.push('parameterized-alternate-needs-owner-review');
    }else if(u.origin===mount.origin&&u.pathname.startsWith(mount.pathname)){
     scope=approved.has(target)?'approved-page':'unknown-same-origin';
    }else scope='external-or-offmount';
   }
  }catch{ /* Invalid URL already represented without copying its bytes. */ }
  if(scope==='invalid')errors.push('invalid-alternate-url');
  if(scope==='unknown-same-origin')errors.push('unapproved-same-site-alternate');
  const old=byLocale.get(lang);
  if(old!==undefined)errors.push(old===target?'duplicate-language-target':'conflicting-language-target');
  else byLocale.set(lang,target);
  links.push({lang,scope,target}); // raw targets must never reach public/private output.
 }
 return {status:'observed',links,errors,total:selected.length};
}
function review({policy,blueprint,capture,renderedContent=null,renderedCapture=null}={}){
 if(policy?.readOnly!==true||policy.publicationAuthorized!==false||
  !Array.isArray(policy.pages)||!Array.isArray(blueprint?.pages)||
  !capture||capture.siteId!==policy.siteId||capture.origin!==policy.base||
  !Array.isArray(capture.pages)||capture.pages.length>80||
  blueprint.siteId!==policy.siteId||
  blueprint.pages.length!==policy.pages.length)
  fail('approved site, Blueprint, crawl policy and original HTTPS capture required');
 const approved=new Map(policy.pages.map(p=>[policy.base+p.path.slice(1),p]));
 if(approved.size!==policy.pages.length||blueprint.pages.some(p=>
  !approved.has(policy.base+p.path.slice(1))||approved.get(policy.base+p.path.slice(1)).pageId!==p.id))
  fail('cross-site or incomplete approved route inventory');
 const source=new Map();
 for(const p of capture.pages){
  if(!approved.has(policy.base+p.path.slice(1))||
   approved.get(policy.base+p.path.slice(1)).pageId!==p.id||source.has(p.id))
   fail('unapproved or duplicate original HTTPS page');
  source.set(p.id,p);
 }
 const byId=new Map(blueprint.pages.map(p=>[p.id,p]));
 const htmlById=new Map(),findings=[],pages=[];
 const note=(page,code,priority,detail,device=null,affected=1)=>{
  if(findings.length>=350)return;
  if(!['P1','P2'].includes(priority))fail('unexpected hreflang priority');
  findings.push({code:'hreflang:'+code,pageId:page.id,path:page.path,device,
   priority,affected,detail,manualOnly:true,automaticFix:false});
 };
 for(const p of blueprint.pages){
  const original=source.get(p.id),served=policy.base+p.path.slice(1);
  const usable=original&&original.status>=200&&original.status<300&&
   original.requestUrl===served&&original.responseUrl===served&&
   typeof original.html==='string'&&original.html.length<=250000&&
   capture.rootRecheck?.matched!==false;
  const parsed=usable?alternateHead(original.html,approved,policy.base):
   {status:'unknown',links:[],errors:[],total:0};
  htmlById.set(p.id,parsed);
  const record={pageId:p.id,path:p.path,sourceStatus:parsed.status,
   sourceAlternateCount:parsed.total,approvedTargetCount:parsed.links.filter(x=>x.scope==='approved-page').length,
   externalOrOffmountCount:parsed.links.filter(x=>x.scope==='external-or-offmount').length,
   renderComparedDevices:0,renderUnknownDevices:3,renderMutatedDevices:0};
  pages.push(record);
  if(parsed.status==='unknown')continue;
  const codes=[...new Set(parsed.errors)];
  for(const code of codes)note(p,code,
   ['invalid-alternate-url','conflicting-language-target','alternate-url-not-absolute-https'].includes(code)?'P1':'P2',
   'Review malformed, unsupported or conflicting HTML hreflang declarations against the owner-approved language URLs.',null,
   parsed.errors.filter(x=>x===code).length);
  if(parsed.links.length&&parsed.links.every(x=>x.target!==served))
   note(p,'self-reference-missing','P2',
    'HTML hreflang set does not contain this exact approved page URL; confirm complete alternate cluster.');
  if(record.externalOrOffmountCount)
   note(p,'external-alternates-unverified','P2',
    'Some hreflang targets are outside approved mount. External domains are allowed, but cannot be reciprocally inspected here.',null,
    record.externalOrOffmountCount);
  const noncanonicalTargets=parsed.links.filter(x=>x.scope==='approved-page'&&
   (approved.get(x.target)?.canonicalTarget!==approved.get(x.target)?.path||
    approved.get(x.target)?.plannedRobots==='noindex')).length;
  if(noncanonicalTargets)note(p,'target-canonical-or-noindex-review','P2',
   'An approved same-site hreflang target is noncanonical or intended noindex in the Blueprint; confirm owner localization policy.',null,
   noncanonicalTargets);
 }
 // Reciprocal links are checked only when both approved pages were present in
 // the SAME original capture. Missing target source => unknown, never broken.
 const approvedIdByUrl=new Map([...approved].map(([url,p])=>[url,p.pageId]));
 for(const p of blueprint.pages){
  const current=htmlById.get(p.id);
  if(current.status!=='observed')continue;
  let nonreciprocal=0,unobserved=0,localeConflicts=0,localeGaps=0;
  const currentLocales=new Map(current.links.map(x=>[x.lang,x.target]));
  for(const target of new Set(current.links.filter(x=>x.scope==='approved-page'&&
   x.target!==policy.base+p.path.slice(1)).map(x=>x.target))){
   const other=htmlById.get(approvedIdByUrl.get(target));
   if(other?.status!=='observed'){unobserved++;continue;}
   if(!other.links.some(x=>x.target===policy.base+p.path.slice(1)))nonreciprocal++;
   const otherLocales=new Map(other.links.map(x=>[x.lang,x.target]));
   for(const [lang,href] of currentLocales){
    if(!otherLocales.has(lang))localeGaps++;
    else if(otherLocales.get(lang)!==href)localeConflicts++;
   }
  }
  if(nonreciprocal)note(p,'return-link-missing','P1',
   'Approved same-site hreflang target was inspected but did not point back to this approved URL.',null,nonreciprocal);
  if(unobserved)note(p,'return-link-unknown','P2',
   'An approved hreflang target lacks inspectable same-capture HTML; reciprocity is unknown.',null,unobserved);
  if(localeConflicts)note(p,'shared-language-target-conflict','P1',
   'Two inspected approved language variants assign the same hreflang locale to different target URLs.',null,localeConflicts);
  if(localeGaps)note(p,'alternate-cluster-incomplete','P2',
   'Inspected approved variants do not repeat all locale labels; partial hreflang clusters may be intentional.',null,localeGaps);
 }
 if(renderedContent||renderedCapture){
  if(!renderedContent||!renderedCapture||renderedContent.siteId!==policy.siteId||
   renderedContent.base!==policy.base||!Array.isArray(renderedContent.pages)||
   !Array.isArray(renderedCapture.pages))fail('paired rendered DOM review required');
  const status=new Map(renderedContent.pages.map(x=>[x.pageId,x]));
  const captures=new Map(renderedCapture.pages.map(x=>[x.id,x]));
  for(const p of blueprint.pages){
   const row=pages.find(x=>x.pageId===p.id),original=htmlById.get(p.id),
    state=status.get(p.id),v=captures.get(p.id);
   if(!state||!v||original.status!=='observed')continue;
   const originalSet=original.links.map(x=>x.lang+'|'+x.target).sort().join('\n');
   for(const device of DEVICES){
    if(state.devices?.[device]?.inspected!==true||
     v.captures?.[device]?.method!=='rendered-dom'||
     typeof v.captures?.[device]?.html!=='string'||
     v.captures[device].html.length>250000)continue;
    const dom=alternateHead(v.captures[device].html,approved,policy.base);
    if(dom.status!=='observed')continue;
    row.renderComparedDevices++;
    const domSet=dom.links.map(x=>x.lang+'|'+x.target).sort().join('\n');
    if(originalSet!==domSet){row.renderMutatedDevices++;
     note(p,'browser-alternates-mutated','P1',
      'Rendered DOM changed hreflang locale-to-URL mappings compared with same-page original HTTP HTML.',device);}
   }
   row.renderUnknownDevices=3-row.renderComparedDevices;
  }
 }
 const count=priority=>findings.filter(x=>x.priority===priority).length;
 const summary={approvedPages:pages.length,
  inspectedPages:pages.filter(p=>p.sourceStatus==='observed').length,
  pagesWithAlternates:pages.filter(p=>p.sourceAlternateCount>0).length,
  externalTargetPages:pages.filter(p=>p.externalOrOffmountCount>0).length,
  renderedComparedPairs:pages.reduce((n,p)=>n+p.renderComparedDevices,0),
  renderedMutatedPairs:pages.reduce((n,p)=>n+p.renderMutatedDevices,0),
  P1:count('P1'),P2:count('P2')};
 return {format:FORMAT,siteId:policy.siteId,base:policy.base,pages,findings,summary,
  readOnly:true,releaseAuthorized:false,publicHostAuthenticated:false,
  ownerLanguageMappingAuthenticated:false,googleInternationalTargetingVerified:false,
  limitations:['No hreflang on a monolingual site is not automatically an error.',
   'Only HTML-head alternate links are examined; HTTP Link headers and XML sitemap hreflang are separate valid methods.',
   'Cross-domain or off-mount language alternates are allowed but cannot be authenticated with this site-only source.',
   'Only approved and inspected same-mount pages get reciprocal-link findings; absent/partial sources stay unknown.',
   'Original URL values, target hostnames, private business facts and HTML are never copied to this report.',
   'Rendered comparison uses source-paired device reports; no Googlebot, owner approval or release authentication.']};
}
function render(report){
 if(report?.format!==FORMAT||report.readOnly!==true||report.releaseAuthorized!==false)
  fail('private hreflang QA report required');
 const s=report.summary;
 const html='<section><h2>International SEO / hreflang (when declared)</h2><p>Inspectable HTML '+s.inspectedPages+'/'+s.approvedPages+
  ' · pages declaring alternates '+s.pagesWithAlternates+' · external/offmount target pages '+s.externalTargetPages+
  ' · browser pairs compared '+s.renderedComparedPairs+' · mutated '+s.renderedMutatedPairs+
  ' · P1 '+s.P1+' / P2 '+s.P2+'.</p><p class="small">No hreflang on a monolingual site is not a failure. External language domains are valid but unverified. Source, Google targeting and owner approval are not authenticated.</p>'+
  '<div class="scroll"><table><thead><tr><th>Approved route</th><th>HTTP head</th><th>Alternate links</th><th>Approved targets</th><th>External targets</th><th>Browser pairs</th></tr></thead><tbody>'+
  report.pages.map(p=>'<tr><td><code>'+htmlEscape(p.path)+'</code></td><td>'+htmlEscape(p.sourceStatus)+
   '</td><td>'+p.sourceAlternateCount+'</td><td>'+p.approvedTargetCount+'</td><td>'+p.externalOrOffmountCount+
   '</td><td>'+p.renderComparedDevices+'/3; mutated '+p.renderMutatedDevices+'</td></tr>').join('')+
  '</tbody></table></div><p class="small">Findings require human review; no auto-fix or international indexing claim.</p></section>';
 const md=['## International SEO / hreflang source review','',
  'Inspected '+s.inspectedPages+'/'+s.approvedPages+'; pages with alternates '+s.pagesWithAlternates+
  '; external-target pages '+s.externalTargetPages+'; rendered compared '+s.renderedComparedPairs+
  '; mutated '+s.renderedMutatedPairs+'; P1 '+s.P1+'; P2 '+s.P2+'.','',
  ...report.findings.map(f=>'- '+f.priority+' '+f.path+(f.device?' '+f.device:'')+
   ': '+f.code+' ('+f.affected+') — '+f.detail),'',...report.limitations.map(x=>'- '+x),''];
 return {html,markdown:md.join('\n')};
}
module.exports=Object.freeze({FORMAT,review,render});
