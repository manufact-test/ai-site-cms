'use strict';
/* Read-only robots/sitemap observations from untrusted operator-supplied files.
 * No HTTP fetch, hosting write, Google API call or automatic indexing instruction.
 */
const crypto=require('node:crypto');
const BP=require('./blueprint.cjs');
const FORMAT='manufact-seo-crawl-policy-v1',SHA=s=>crypto.createHash('sha256').update(s).digest('hex');
const AGENTS=['Googlebot','Bingbot','*'];
const safe=x=>String(x??'').replace(/[|<>\u0000-\u001f]/g,' ').trim().slice(0,260);
function baseUrl(raw){
 let u;try{u=new URL(raw)}catch{throw Error('Crawl base URL must be HTTPS and absolute');}
 if(typeof raw!=='string'||u.href!==raw||u.protocol!=='https:'||u.username||u.password||
   u.hash||u.search||!u.pathname.endsWith('/'))
  throw Error('Crawl base URL must be canonical HTTPS with trailing slash and no query/credentials');
 return u;
}
const urlFor=(base,path)=>base.href+path.slice(1);
function parseRobots(source){
 if(typeof source!=='string'||Buffer.byteLength(source)>250000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(source))
  throw Error('Invalid or oversized robots.txt');
 const lines=source.replace(/^\uFEFF/,'').split(/\r?\n/),groups=[],sitemaps=[],warnings=[];
 let group=null,rulesStarted=false;
 const flush=()=>{if(group){groups.push(group);group=null;}rulesStarted=false};
 if(lines.length>15000)throw Error('Excessive robots lines');
 for(let i=0;i<lines.length;i++){
  const text=lines[i].replace(/#.*$/,'').trim();
  if(!text)continue;
  const m=/^([a-z-]+)\s*:\s*(.*)$/i.exec(text);
  if(!m){warnings.push({line:i+1,reason:'unsupported-line'});continue;}
  const key=m[1].toLowerCase(),value=m[2].trim();
  if(key==='sitemap'){sitemaps.push({url:value,line:i+1});continue;}
  if(key==='user-agent'){
   if(!/^(?:\*|[a-z][a-z0-9_-]{0,49})$/i.test(value))
    throw Error('Invalid user-agent at robots line '+(i+1));
   if(!group||rulesStarted){flush();group={agents:[],rules:[]};}
   if(!group.agents.some(a=>a.toLowerCase()===value.toLowerCase()))group.agents.push(value);
  }else if(key==='allow'||key==='disallow'){
   if(!group){warnings.push({line:i+1,reason:'orphan-robots-rule'});continue;}
   rulesStarted=true;
   if(!value)continue;
   if(value.length>2048)throw Error('Robots path exceeds safe maximum length at line '+(i+1));
   if(!value.startsWith('/')){
    warnings.push({line:i+1,reason:'invalid-robots-path'});continue;
   }
   group.rules.push({kind:key,pattern:value,line:i+1});
  }
 }
 flush();
 if(groups.length>200||sitemaps.length>200)throw Error('Too many robots groups/directives');
 return {groups,sitemaps,warnings};
}
const escapeRegex=s=>s.replace(/[|\\{}()[\]^$+?.]/g,'\\$&');
const encodedChar=c=>[...Buffer.from(c)].map(byte=>{
 const char=String.fromCharCode(byte);
 return /[a-z0-9\-._~]/i.test(char)?char:'%'+byte.toString(16).toUpperCase().padStart(2,'0');
}).join('');
function normalizePath(path){
 const s=String(path).normalize('NFC');let out='';
 for(let i=0;i<s.length;i++){
  if(s[i]==='%'&&/^[0-9a-f]{2}$/i.test(s.slice(i+1,i+3))){
   const b=parseInt(s.slice(i+1,i+3),16),c=String.fromCharCode(b);
   out+=/[a-z0-9\-._~]/i.test(c)?c:'%'+b.toString(16).toUpperCase().padStart(2,'0');
   i+=2;continue;
  }
  out+=encodedChar(s[i]);
 }
 return out;
}
function match(rule,path){
 const pattern=rule.pattern.replace(/\$$/,'');
 const anchor=rule.pattern.endsWith('$');
 if(/%(?![0-9a-f]{2})/i.test(pattern))return null;
 const normalized=pattern.split('*').map(normalizePath);
 const exp='^'+normalized.map(escapeRegex).join('.*')+(anchor?'$':'');
 if(!new RegExp(exp).test(normalizePath(path)))return null;
 return {...rule,strength:normalized.join('').length};
}
function decide(parsed,agent,path){
 if(typeof agent!=='string'||!/^(?:\*|[a-z][a-z0-9_-]{0,49})$/i.test(agent)||
  typeof path!=='string'||!path.startsWith('/')||path.length>2000)
  throw Error('Invalid crawler or URL path');
 const name=agent.toLowerCase(),groups=parsed.groups.map(g=>{
  const matched=g.agents.map(a=>a.toLowerCase()).filter(a=>a==='*'||a===name);
  return {group:g,specificity:matched.includes(name)?name.length:matched.includes('*')?0:-1};
 });
 const best=Math.max(-1,...groups.map(g=>g.specificity));
 let winner=null,checks=0;
 for(const item of groups)if(item.specificity===best&&best>=0)for(const rule of item.group.rules){
  const candidate=match(rule,path);if(!candidate)continue;checks++;
  if(!winner||candidate.strength>winner.strength||
   candidate.strength===winner.strength&&candidate.kind==='allow'&&winner.kind==='disallow')
   winner=candidate;
 }
 return {agent,allowed:!winner||winner.kind==='allow',matchedRule:winner,
  matchedRules:checks,matchingGroup:best<0?'none':best===0?'wildcard':'specific',
  publicHostAuthenticated:false};
}
function xmlDecode(s){
 if(/&(?!(?:amp|lt|gt|quot|apos|#(?:x[0-9a-f]+|[0-9]+));)/i.test(s))
  throw Error('Unknown XML entity in sitemap');
 return s.replace(/&(?:amp|lt|gt|quot|apos|#(?:x[0-9a-f]+|[0-9]+));/gi,entity=>{
  const value=entity.slice(1,-1).toLowerCase();
  if(value==='amp')return '&';if(value==='lt')return '<';
  if(value==='gt')return '>';if(value==='quot')return '"';if(value==='apos')return "'";
  const code=value.startsWith('#x')?parseInt(value.slice(2),16):parseInt(value.slice(1),10);
  if(!Number.isInteger(code)||code===0||code>0x10ffff||code>=0xd800&&code<=0xdfff)
   throw Error('Invalid XML numeric entity');
  return String.fromCodePoint(code);
 });
}
function parseSitemap(xml){
 if(typeof xml!=='string'||Buffer.byteLength(xml)>750000||xml.length<30||
  /<!DOCTYPE|<!ENTITY|<!\[CDATA\[/i.test(xml)||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(xml))
  throw Error('Unsafe or oversized sitemap XML');
 const index=/<(?:[\w-]+:)?sitemapindex(?:\s|>)/i.test(xml),
  urlset=/<(?:[\w-]+:)?urlset(?:\s|>)/i.test(xml);
 if(index===urlset)throw Error('Sitemap must have exactly one urlset or sitemapindex root');
 const element=index?'sitemap':'url';
 const tag=new RegExp('<(?:[\\w-]+:)?'+element+'\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?'+element+'\\s*>','gi');
 let m;const records=[],seen=new Set();
 while((m=tag.exec(xml))!==null){
  if(records.length===10000)throw Error('Too many sitemap records');
  const loc=[...m[1].matchAll(/<(?:[\w-]+:)?loc\s*>([\s\S]*?)<\/(?:[\w-]+:)?loc\s*>/gi)];
  if(loc.length!==1)throw Error('Each sitemap record needs exactly one loc');
  const value=xmlDecode(loc[0][1].trim());
  if(!/^https:\/\//.test(value)||value.length>2000||seen.has(value))
   throw Error('Duplicate, missing or non-HTTPS sitemap URL');
  seen.add(value);
  records.push({loc:value});
 }
 if(!records.length)throw Error('Sitemap XML has no URL records');
 const opens=[...xml.matchAll(new RegExp('<(?:[\\w-]+:)?'+element+'\\b[^>]*>','gi'))].length;
 if(opens!==records.length||
  !(index?/<\/sitemapindex\s*>\s*$/i:/<\/urlset\s*>\s*$/i).test(xml))
  throw Error('Sitemap has incomplete records or an unclosed document root');
 return {kind:index?'index':'urlset',records};
}
function mapped(base,raw){
 let u;try{u=new URL(raw)}catch{return {error:'invalid-url'};}
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||
  u.origin!==base.origin)return {error:'noncanonical-or-other-origin'};
 if(!u.pathname.startsWith(base.pathname))return {error:'outside-site-mount'};
 const path='/'+u.pathname.slice(base.pathname.length);
 if(!/^\/(?:[a-z0-9-]+\/)*$/.test(path)||urlFor(base,path)!==u.href)
  return {error:'not-a-canonical-blueprint-route'};
 return {path};
}
function analyze({blueprint,base,robotsText,sitemapXml,agents=AGENTS,scope='complete'}){
 const plan=BP.checkBlueprint(blueprint),host=baseUrl(base),
  robots=parseRobots(robotsText),sitemap=parseSitemap(sitemapXml);
 if(!['complete','sample'].includes(scope)||!Array.isArray(agents)||agents.length<1||agents.length>8||
  agents.some(a=>typeof a!=='string'||!/^(?:\*|[a-z][a-z0-9_-]{0,49})$/i.test(a))||
  new Set(agents.map(a=>a.toLowerCase())).size!==agents.length)
  throw Error('Invalid crawl evidence scope or crawler agent selection');
 const byPath=new Map(plan.pages.map(p=>[p.path,p])),events=[],tasks=new Map();
 const key=new Set(),order={P0:0,P1:1,P2:2};
 function finding(code,priority,pageId,path,message,meta={}){
  const id=[code,pageId||'site',path||'',meta.agent||''].join(':');if(key.has(id))return;
  key.add(id);events.push({id,code,priority,pageId:pageId||null,path:path||null,
   message,publicVerified:false,automatic:false,...meta});
 }
 function task(id,priority,pageId,step,evidence){
  if(tasks.has(id))return;
  tasks.set(id,{id,priority,pageId:pageId||null,step,evidenceNeeded:evidence,
   status:'requires-owner-review',automatic:false});
 }
 const pages=plan.pages.map(page=>{
  const publicUrl=urlFor(host,page.path),canonical=page.seo.canonicalPath===page.path,
   indexable=page.seo.robots==='index'&&canonical,
   checks=agents.map(agent=>{
    const verdict=decide(robots,agent,host.pathname+page.path.slice(1));
    if(indexable&&!verdict.allowed){
     const priority=agent.toLowerCase()==='googlebot'?'P0':'P1';
     finding('crawl:approved-indexable-blocked',priority,page.id,page.path,
      'Approved canonical indexable page is blocked by supplied robots policy for '+agent,
      {agent,rule:verdict.matchedRule});
     task('robots:'+page.id+':'+agent,priority,page.id,
      'Inspect actual public robots.txt and the matched group, then approve a targeted policy correction.',
      'Live robots HTTPS response, exact URL, owner decision and URL Inspection');
    }
    return verdict;
   });
  return {pageId:page.id,path:page.path,publicUrl,plannedRobots:page.seo.robots,
   canonicalTarget:page.seo.canonicalPath,indexableCanonical:indexable,
   crawlerDecisions:checks,sitemap:'not-observed',httpVerified:false};
 });
 if(sitemap.kind==='index'){
  finding('sitemap:children-unavailable','P1',null,null,
   'Sitemap index supplied without child sitemap contents; page coverage cannot be asserted',
   {childUrls:sitemap.records.map(x=>x.loc)});
  task('sitemap:expand-index','P1',null,
   'Collect each actual child XML sitemap and analyze a complete URL set.',
   'Source-pinned original child XML bytes and verified published URLs');
  pages.forEach(p=>p.sitemap='unverified-child-sitemaps');
 }else{
  const mappedSitemap=new Set();
  for(const row of sitemap.records){
   const match=mapped(host,row.loc),page=match.path?byPath.get(match.path):null;
   if(match.error||!page){
    finding('sitemap:unapproved-url','P1',null,row.loc,
     'Sitemap contains a URL outside approved canonical route map',
     {reason:match.error||'absent-from-approved-blueprint'});
    task('sitemap:unapproved:'+SHA(row.loc).slice(0,16),'P1',null,
     'Review unknown sitemap URL and owner route inventory before proposing a change.',
     'Real site sitemap and approved CMS route inventory');
    continue;
   }
   mappedSitemap.add(page.id);
   const p=pages.find(x=>x.pageId===page.id);p.sitemap='observed-in-supplied-xml';
   if(!p.indexableCanonical){
    finding('sitemap:noncanonical-or-noindex','P1',page.id,page.path,
     'Sitemap includes a planned noindex or noncanonical alias route.');
    task('sitemap:policy:'+page.id,'P1',page.id,
     'Verify canonical and robots policy before changing sitemap inclusion.',
     'Actual public XML plus rendered page head and owner decision');
   }
  }
  if(scope==='complete')for(const p of pages)if(p.indexableCanonical&&!mappedSitemap.has(p.pageId)){
   finding('sitemap:missing-canonical-indexable','P1',p.pageId,p.path,
    'Indexable canonical page is missing from explicitly complete supplied sitemap.');
   task('sitemap:missing:'+p.pageId,'P1',p.pageId,
    'Confirm sitemap completeness and canonical page URL before publication adjustment.',
    'Original complete sitemap, real canonical and owner confirmation');
  }
 }
 for(const s of robots.sitemaps){
  let u;try{u=new URL(s.url)}catch{u=null}
  if(!u||u.protocol!=='https:'||u.origin!==host.origin||u.username||u.password||u.search||u.hash){
   finding('robots:sitemap-pointer-invalid','P1',null,s.url,'Robots.txt Sitemap pointer is not a canonical same-host HTTPS URL.');
  }
 }
 if(!robots.sitemaps.length)
  finding('robots:no-sitemap-pointer','P2',null,null,'Sitemap directive absent; optional but review discovery policy.');
 events.sort((a,b)=>order[a.priority]-order[b.priority]||a.id.localeCompare(b.id));
 const actions=[...tasks.values()].sort((a,b)=>order[a.priority]-order[b.priority]||a.id.localeCompare(b.id));
 const counts={P0:events.filter(f=>f.priority==='P0').length,
  P1:events.filter(f=>f.priority==='P1').length,P2:events.filter(f=>f.priority==='P2').length};
 return {format:FORMAT,version:1,siteId:plan.siteId,readOnly:true,
  blueprintSha256:SHA(JSON.stringify(plan)),robotsSha256:SHA(robotsText),
  sitemapSha256:SHA(sitemapXml),base:host.href,agents,scope,
  summary:{plannedPages:pages.length,canonicalIndexable:pages.filter(p=>p.indexableCanonical).length,
   sitemapRecords:sitemap.records.length,findings:events.length,priorities:counts,
   reviewActions:actions.length,networkRequests:0},
  robotsMeta:{groups:robots.groups.length,sitemapPointers:robots.sitemaps,warnings:robots.warnings},
  sitemapMeta:{kind:sitemap.kind,recordCount:sitemap.records.length,
   children:sitemap.kind==='index'?sitemap.records.map(x=>x.loc):[]},
  pages,findings:events,actions,publicationAuthorized:false,
  publicHostAuthenticated:false,clientSignoffAuthenticated:false,
  limitations:['Operator-supplied private files, not real public-host observations',
   'No DNS/TLS/HTTP, Search Console inspection, crawler execution or CMS edits',
   'Longest matching robots rules with allow precedence are informational; live crawler behavior may differ',
   'Sitemap index children must be supplied before exhaustive page coverage can be assessed',
   'Site URL inclusion is not proof of crawl, indexation, ranking or client acceptance']};
}
function markdown(report){
 if(report?.format!==FORMAT||report.publicationAuthorized!==false)throw Error('Invalid crawl-policy review');
 const lines=['# MANUFACT SEO — Crawl Policy Intelligence','',
  'Private, read-only planned crawler policy, not authenticated live search-index evidence.','',
  'Site: '+safe(report.siteId)+' | Base: '+safe(report.base),
  'P0 '+report.summary.priorities.P0+' | P1 '+report.summary.priorities.P1+
  ' | P2 '+report.summary.priorities.P2,'',
  '| Page | Planned robots | Sitemap | '+report.agents.map(safe).join(' | ')+' |',
  '|---|---|---|'+report.agents.map(()=> '---|').join('')];
 for(const page of report.pages)lines.push('| '+safe(page.path)+' | '+safe(page.plannedRobots)+
  ' | '+safe(page.sitemap)+' | '+page.crawlerDecisions.map(v=>
   v.allowed?'Allowed':'Blocked ('+safe(v.matchedRule?.pattern)+')').join(' | ')+' |');
 lines.push('','## Required investigations','');
 for(const item of report.actions)lines.push('- '+item.priority+' '+safe(item.id)+': '+safe(item.step));
 if(!report.actions.length)lines.push('- No tasks under supplied evidence scope.');
 lines.push('','## Boundaries','');
 report.limitations.forEach(s=>lines.push('- '+safe(s)));
 return lines.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,AGENTS,baseUrl,urlFor,parseRobots,decide,parseSitemap,mapped,analyze,markdown});
