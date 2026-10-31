'use strict';
/* Bounded offline international-alternate SEO QA over already approved public
 * HTML and source-paired browser DOM. No external language URLs are fetched or
 * echoed. Do not infer owner-approved translations or a release decision.
 */
const HTML=require('./html-evidence.cjs');
const DELIVERY=require('./delivery-evidence.cjs');
const FORMAT='manufact-seo-hreflang-qa-v1';
const DEVICES=['desktop','tablet','mobile'];
const LOCALE=/^(?:[a-z]{2,3}(?:-[a-z]{4})?(?:-(?:[a-z]{2}|\d{3}))?|x-default)$/i;
const fail=s=>{throw Error('SEO hreflang QA: '+s);};
const htmlEscape=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function alternateEntries(selected,approved,base,initialErrors=[]){
 if(selected.length>80)return {status:'unknown',links:[],errors:['oversized-alternate-set'],total:0};
 const links=[],errors=[],byLocale=new Map();
 errors.push(...initialErrors);
 for(const a of selected){
  const lang=(a.hreflang||'').trim().toLowerCase();
  const rel=(a.rel||'').toLowerCase().split(/\s+/);
  if(!rel.includes('alternate'))errors.push('alternate-rel-absent');
  if(!LOCALE.test(lang))errors.push('malformed-language-code');
  if(a.media||a.type||a.as||a.anchor)errors.push('combined-alternate-attributes');
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
function alternateHead(html,approved,base){
 if(typeof html!=='string'||html.length>250000)fail('bounded original HTML required');
 const m=/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html);
 if(!m)return {status:'unknown',links:[],errors:[],total:0};
 const all=HTML.inspect('<html><head>'+m[1]+'</head></html>').links;
 return alternateEntries(all.filter(x=>Object.prototype.hasOwnProperty.call(x.attrs,'hreflang'))
  .map(x=>x.attrs),approved,base);
}
// The HTTP Link header can contain unrelated pagination/preload links, commas
// in <URLs> and quoted parameters. Only syntactically isolated hreflang links
// are reviewed; malformed input must never be guessed into a URL.
function splitDelimited(value,separator){
 const out=[];let start=0,quoted=false,angle=false,escaped=false;
 for(let i=0;i<value.length;i++){
  const c=value[i];
  if(escaped){escaped=false;continue;}
  if(quoted&&c==='\\'){escaped=true;continue;}
  if(c==='"'){quoted=!quoted;continue;}
  if(!quoted){
   if(c==='<'){if(angle)return null;angle=true;}
   else if(c==='>'){if(!angle)return null;angle=false;}
   else if(c===separator&&!angle){out.push(value.slice(start,i).trim());start=i+1;}
  }
 }
 if(quoted||angle||escaped)return null;
 out.push(value.slice(start).trim());
 return out;
}
function alternateHttpHeader(headers,approved,base){
 const raw=Object.entries(headers||{}).find(([key])=>key.toLowerCase()==='link')?.[1];
 // Older transcripts did not preserve Link, so an absent key is UNKNOWN,
 // rather than proof that an HTTP Link annotation is absent on the host.
 if(raw===undefined)return {status:'unknown',links:[],errors:[],total:0};
 if(typeof raw!=='string'||raw.length>4000)return {status:'unknown',links:[],errors:['invalid-link-header'],total:0};
 const segments=splitDelimited(raw,',');
 if(!segments||segments.length>100)return {status:'unknown',links:[],errors:['invalid-link-header'],total:0};
 const selected=[];let invalid=0;
 for(const segment of segments){
  const m=/^<([^<>]{1,2048})>([\s\S]*)$/.exec(segment);
  if(!m){if(/hreflang/i.test(segment))invalid++;continue;}
  const tail=splitDelimited(m[2],';');
  if(!tail||tail[0]!==''){if(/hreflang/i.test(segment))invalid++;continue;}
  const a={href:m[1]};let bad=false;
  for(const item of tail.slice(1)){
   const kv=/^([a-z][a-z0-9-]*)\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^";\s]+))$/i.exec(item);
   if(!kv){bad=true;break;}
   const key=kv[1].toLowerCase(),value=(kv[2]??kv[3]).replace(/\\(["\\])/g,'$1');
   if(a[key]!==undefined){bad=true;break;}
   a[key]=value;
  }
  if(bad){if(/hreflang/i.test(segment))invalid++;continue;}
  if(Object.prototype.hasOwnProperty.call(a,'hreflang'))selected.push(a);
 }
 const out=alternateEntries(selected,approved,base);
 if(invalid)out.errors.push('malformed-http-link-annotation');
 return out;
}
function decodeXml(value){
 if(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(value))return null;
 return value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi,token=>{
  const name=token.slice(1,-1).toLowerCase();
  if(name[0]==='#'){
   const code=name[1]==='x'?parseInt(name.slice(2),16):parseInt(name.slice(1),10);
   return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'\ufffd';
  }
  return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[name];
 });
}
function xmlAttrs(raw){
 const a={},pattern=/([a-z][\w:.-]*)\s*=\s*(["'])(.*?)\2/gis;
 let rest=raw.replace(pattern,(_whole,key,_quote,value)=>{
  const name=key.toLowerCase(),decoded=decodeXml(value);
  if(a[name]!==undefined||decoded===null)throw Error('invalid-xml-attribute');
  a[name]=decoded;return '';
 });
 if(rest.trim())throw Error('invalid-xml-attribute');
 return a;
}
// Review ONLY one complete, directly enumerated sitemap urlset. A sitemap
// index, ambiguous XML or missing route loc is unknown; never claim absence.
function alternateSitemap(sitemap,approved,base){
 const out=new Map();
 const unknown=()=>({status:'unknown',links:[],errors:[],total:0});
 if(!sitemap||sitemap.status!==200||typeof sitemap.body!=='string')return out;
 const xml=sitemap.body,parsed=DELIVERY.sitemapPaths(xml);
 if(parsed.kind!=='urlset'||parsed.unverified)return out;
 const root=/<(?:[a-z][\w.-]*:)?urlset\b([^<>]*)>/i.exec(xml);
 if(!root)return out;
 const prefixes=[];
 for(const m of root[1].matchAll(/xmlns:([a-z][\w.-]*)\s*=\s*(["'])http:\/\/www\.w3\.org\/1999\/xhtml\2/gi))
  prefixes.push(m[1].toLowerCase());
 const blocks=[...xml.matchAll(/<(?:[a-z][\w.-]*:)?url(?:\s[^<>]*?)?>([\s\S]*?)<\/(?:[a-z][\w.-]*:)?url\s*>/gi)];
 if(blocks.length!==parsed.urls.length)return out;
 for(let i=0;i<blocks.length;i++){
  let loc;
  try{loc=new URL(parsed.urls[i]).href;}catch{continue;}
  if(!approved.has(loc)){continue;}
  if(out.has(loc)){out.set(loc,{...unknown(),errors:['duplicate-sitemap-route-loc']});continue;}
  const rawLinks=[...blocks[i][1].matchAll(/<([a-z][\w.-]*):link\b([^<>]*?)\/>/gi)];
  if(rawLinks.length>80){out.set(loc,{...unknown(),errors:['oversized-alternate-set']});continue;}
  const openingCount=[...blocks[i][1].matchAll(/<([a-z][\w.-]*):link\b/gi)].length;
  const selected=[];let malformed=openingCount-rawLinks.length;
  for(const m of rawLinks){
   try{
    const a=xmlAttrs(m[2]);
    if(!Object.prototype.hasOwnProperty.call(a,'hreflang'))continue;
    if(!prefixes.includes(m[1].toLowerCase())){malformed++;continue;}
    selected.push(a);
   }catch{malformed++;}
  }
  const result=alternateEntries(selected,approved,base);
  if(malformed)result.errors.push('malformed-sitemap-alternate');
  out.set(loc,result);
 }
 return out;
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
 const htmlById=new Map(),headerById=new Map(),sitemapById=new Map(),findings=[],pages=[];
 const sitemapAlternates=alternateSitemap(capture.sitemap,approved,policy.base);
 const note=(page,code,priority,detail,device=null,affected=1)=>{
  if(findings.length>=350)return;
  if(!['P1','P2'].includes(priority))fail('unexpected hreflang priority');
  findings.push({code:'hreflang:'+code,pageId:page.id,path:page.path,device,
   priority,affected,detail,manualOnly:true,automaticFix:false});
 };
 for(const p of blueprint.pages){
  const original=source.get(p.id),served=policy.base+p.path.slice(1);
  const usableResponse=original&&original.status>=200&&original.status<300&&
   original.requestUrl===served&&original.responseUrl===served&&
   capture.rootRecheck?.matched!==false;
  const usableHtml=usableResponse&&typeof original.html==='string'&&original.html.length<=250000;
  const parsed=usableHtml?alternateHead(original.html,approved,policy.base):
   {status:'unknown',links:[],errors:[],total:0};
  const header=usableResponse?alternateHttpHeader(original.headers,approved,policy.base):
   {status:'unknown',links:[],errors:[],total:0};
  const xml=capture.rootRecheck?.matched!==false?(sitemapAlternates.get(served)||
   {status:'unknown',links:[],errors:[],total:0}):
   {status:'unknown',links:[],errors:[],total:0};
  htmlById.set(p.id,parsed);
  headerById.set(p.id,header);sitemapById.set(p.id,xml);
  const record={pageId:p.id,path:p.path,sourceStatus:parsed.status,
   sourceAlternateCount:parsed.total,approvedTargetCount:parsed.links.filter(x=>x.scope==='approved-page').length,
   externalOrOffmountCount:parsed.links.filter(x=>x.scope==='external-or-offmount').length,
   httpLinkStatus:header.status,httpLinkAlternateCount:header.total,
   sitemapStatus:xml.status,sitemapAlternateCount:xml.total,
   renderComparedDevices:0,renderUnknownDevices:3,renderMutatedDevices:0};
  pages.push(record);
  for(const [carrier,data,prefix] of [['HTML',parsed,''],['HTTP Link',header,'http-link-'],
   ['XML sitemap',xml,'sitemap-']]){
   for(const code of new Set(data.errors))note(p,prefix+code,
    ['invalid-alternate-url','conflicting-language-target','alternate-url-not-absolute-https'].includes(code)?'P1':'P2',
    'Review '+carrier+' hreflang syntax and targets against approved language URLs; raw targets remain private.',null,
    data.errors.filter(x=>x===code).length);
   const noncanonical=data.links.filter(x=>x.scope==='approved-page'&&
    (approved.get(x.target)?.canonicalTarget!==approved.get(x.target)?.path||
     approved.get(x.target)?.plannedRobots==='noindex')).length;
   if(noncanonical)note(p,prefix+'target-canonical-or-noindex-review','P2',
    'An approved hreflang target is noncanonical or planned noindex; verify its owner-approved localization intent.',null,
    noncanonical);
   if(data.status==='observed'&&data.links.length&&data.links.every(x=>x.target!==served))
    note(p,prefix+'self-reference-missing','P2',
     'Declared hreflang set lacks this approved page URL; confirm intended language cluster.');
   const external=data.links.filter(x=>x.scope==='external-or-offmount').length;
   if(external)note(p,prefix+'external-alternates-unverified','P2',
    'External-language domains are allowed, but these targets cannot be independently verified inside the approved site mount.',null,
    external);
  }
  // More than one valid carrier is optional, but conflicting mappings for
  // the SAME locale on this page must be reviewed even if each is valid alone.
  const cross=new Map();let crossConflicts=0;
  for(const data of [parsed,header,xml]){
   if(data.status!=='observed')continue;
   for(const link of data.links){
    if(cross.has(link.lang)&&cross.get(link.lang)!==link.target)crossConflicts++;
    else if(!cross.has(link.lang))cross.set(link.lang,link.target);
   }
  }
  if(crossConflicts)note(p,'carrier-language-target-conflict','P1',
   'HTML, HTTP Link and/or XML sitemap disagree about the target of the same language label.',null,crossConflicts);
 }
 // Reciprocal links are checked only when both approved pages were present in
 // the SAME original capture. Missing target source => unknown, never broken.
 const approvedIdByUrl=new Map([...approved].map(([url,p])=>[url,p.pageId]));
 for(const [sourceMap,prefix] of [[htmlById,''],[headerById,'http-link-'],[sitemapById,'sitemap-']]){
 for(const p of blueprint.pages){
  const current=sourceMap.get(p.id);
  if(current.status!=='observed'||!current.total)continue;
  let nonreciprocal=0,unobserved=0,localeConflicts=0,localeGaps=0;
  const currentLocales=new Map(current.links.map(x=>[x.lang,x.target]));
  for(const target of new Set(current.links.filter(x=>x.scope==='approved-page'&&
   x.target!==policy.base+p.path.slice(1)).map(x=>x.target))){
   const targetId=approvedIdByUrl.get(target),other=sourceMap.get(targetId);
   // Different annotation methods are equivalent. A reciprocal link in a
   // second carrier must not be reported as missing merely because the first
   // carrier is empty or unavailable on the peer page.
   const hasReturn=[htmlById,headerById,sitemapById].some(map=>
    map.get(targetId)?.status==='observed'&&map.get(targetId).links.some(x=>
     x.target===policy.base+p.path.slice(1)));
   if(other?.status!=='observed'){if(!hasReturn)unobserved++;continue;}
   if(!hasReturn)nonreciprocal++;
   const otherLocales=new Map(other.links.map(x=>[x.lang,x.target]));
   for(const [lang,href] of currentLocales){
    if(!otherLocales.has(lang))localeGaps++;
    else if(otherLocales.get(lang)!==href)localeConflicts++;
   }
  }
  if(nonreciprocal)note(p,prefix+'return-link-missing','P1',
   'No reciprocal URL was found in the currently inspected carriers of this approved same-site target; verify any unobserved methods.',null,nonreciprocal);
  if(unobserved)note(p,prefix+'return-link-unknown','P2',
   'An approved hreflang target has no inspected reciprocal declaration in this method; other carrier evidence may be unavailable.',null,unobserved);
  if(localeConflicts)note(p,prefix+'shared-language-target-conflict','P1',
   'Two inspected approved language variants assign the same hreflang locale to different target URLs.',null,localeConflicts);
  if(localeGaps)note(p,prefix+'alternate-cluster-incomplete','P2',
   'Inspected approved variants do not repeat all locale labels; partial hreflang clusters may be intentional.',null,localeGaps);
 }
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
  pagesWithHttpLinkAlternates:pages.filter(p=>p.httpLinkAlternateCount>0).length,
  pagesWithSitemapAlternates:pages.filter(p=>p.sitemapAlternateCount>0).length,
  httpLinkInspectedPages:pages.filter(p=>p.httpLinkStatus==='observed').length,
  sitemapInspectedPages:pages.filter(p=>p.sitemapStatus==='observed').length,
  externalTargetPages:pages.filter(p=>p.externalOrOffmountCount>0).length,
  renderedComparedPairs:pages.reduce((n,p)=>n+p.renderComparedDevices,0),
  renderedMutatedPairs:pages.reduce((n,p)=>n+p.renderMutatedDevices,0),
  P1:count('P1'),P2:count('P2')};
 return {format:FORMAT,siteId:policy.siteId,base:policy.base,pages,findings,summary,
  readOnly:true,releaseAuthorized:false,publicHostAuthenticated:false,
  ownerLanguageMappingAuthenticated:false,googleInternationalTargetingVerified:false,
  limitations:['No hreflang on a monolingual site is not automatically an error.',
   'HTML head, captured HTTP Link headers and a complete direct XML sitemap urlset are examined independently; other sitemap files/index children remain unknown.',
   'An absent HTTP Link field in older original transcripts is unknown; no historical header availability is invented.',
   'Using multiple hreflang carriers is optional; differences in coverage alone are not errors, but shared-locale target contradictions require review.',
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
  ' · HTML pages declaring alternates '+s.pagesWithAlternates+' · external/offmount HTML target pages '+s.externalTargetPages+
  ' · HTTP Link '+s.pagesWithHttpLinkAlternates+'/'+s.httpLinkInspectedPages+
  ' · sitemap '+s.pagesWithSitemapAlternates+'/'+s.sitemapInspectedPages+
  ' · browser pairs compared '+s.renderedComparedPairs+' · mutated '+s.renderedMutatedPairs+
  ' · P1 '+s.P1+' / P2 '+s.P2+'.</p><p class="small">No hreflang on a monolingual site is not a failure. External language domains are valid but unverified. Source, Google targeting and owner approval are not authenticated.</p>'+
  '<div class="scroll"><table><thead><tr><th>Approved route</th><th>HTML head</th><th>HTML links</th><th>HTTP Link</th><th>XML sitemap</th><th>Approved HTML targets</th><th>External HTML targets</th><th>Browser pairs</th></tr></thead><tbody>'+
  report.pages.map(p=>'<tr><td><code>'+htmlEscape(p.path)+'</code></td><td>'+htmlEscape(p.sourceStatus)+
   '</td><td>'+p.sourceAlternateCount+'</td><td>'+htmlEscape(p.httpLinkStatus)+' / '+p.httpLinkAlternateCount+
   '</td><td>'+htmlEscape(p.sitemapStatus)+' / '+p.sitemapAlternateCount+
   '</td><td>'+p.approvedTargetCount+'</td><td>'+p.externalOrOffmountCount+
   '</td><td>'+p.renderComparedDevices+'/3; mutated '+p.renderMutatedDevices+'</td></tr>').join('')+
  '</tbody></table></div><p class="small">Findings require human review; no auto-fix or international indexing claim.</p></section>';
 const md=['## International SEO / hreflang source review','',
  'Inspected HTML '+s.inspectedPages+'/'+s.approvedPages+'; HTML pages with alternates '+s.pagesWithAlternates+
  '; HTTP Link '+s.pagesWithHttpLinkAlternates+'/'+s.httpLinkInspectedPages+
  '; sitemap '+s.pagesWithSitemapAlternates+'/'+s.sitemapInspectedPages+
  '; external-target pages '+s.externalTargetPages+'; rendered compared '+s.renderedComparedPairs+
  '; mutated '+s.renderedMutatedPairs+'; P1 '+s.P1+'; P2 '+s.P2+'.','',
  ...report.findings.map(f=>'- '+f.priority+' '+f.path+(f.device?' '+f.device:'')+
   ': '+f.code+' ('+f.affected+') — '+f.detail),'',...report.limitations.map(x=>'- '+x),''];
 return {html,markdown:md.join('\n')};
}
module.exports=Object.freeze({FORMAT,review,render});
