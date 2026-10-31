'use strict';
/* Cross-route collisions in already-approved public HTTP and source-paired DOM.
 * All textual signatures stay in memory: only approved IDs/routes, counts and
 * fixed investigation codes leave this module. These are manual SEO signals.
 */
const HEAD=require('./parity.cjs');
const HTML=require('./html-evidence.cjs');
const DEVICES=['http','desktop','tablet','mobile'];
const clean=x=>String(x??'').replace(/&(?:amp|lt|gt|quot|apos|nbsp|#(?:x[0-9a-f]+|\d+));/gi,m=>{
 const names={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
 const key=m.slice(1,-1).toLowerCase();
 if(names[key])return names[key];
 const n=key.startsWith('#x')?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
 return Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?
  String.fromCodePoint(n):' ';
}).normalize('NFKC').replace(/\s+/g,' ').trim().toLocaleLowerCase();
const trimTags=x=>clean(x.replace(/<!--[\s\S]*?-->/g,'')
 .replace(/<(?:script|style|template|svg|noscript|form|nav|footer|header)\b[^>]*>[\s\S]*?<\/\s*(?:script|style|template|svg|noscript|form|nav|footer|header)\s*>/gi,' ')
 .replace(/<[^>]*>/g,' '));
function mainFingerprint(html){
 const matches=[...html.matchAll(/<main(?:\s[^<>]*?)?>([\s\S]*?)<\/main\s*>/gi)];
 if(matches.length!==1)return null;
 const content=trimTags(matches[0][1]);
 return content.length>=260&&content.split(/\s+/).length>=45?content:null;
}
function observe(record,served){
 if(!record||typeof record.html!=='string'||record.html.length>500000)return null;
 const meta=HEAD.readHead(record.html);
 if(meta.status!=='parsed-head'||!meta.canonical)return null;
 const parsed=HTML.inspect(record.html);
 if(parsed.canonicals.length!==1)return null;
 let canonical;
 try{
  const base=new URL(meta.baseHref||served,served);
  canonical=new URL(meta.canonical,base);
  if(base.protocol!=='https:'||canonical.protocol!=='https:'||base.username||base.password||
   canonical.username||canonical.password||canonical.search||canonical.hash||canonical.href!==served)
   return null;
 }catch{return null;}
 const xRobots=Object.entries(record.headers||{}).find(([k])=>k.toLowerCase()==='x-robots-tag')?.[1]||'';
 const robots=[meta.robots,xRobots].join(',').toLowerCase();
 if(/(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(robots))return null;
 return {title:clean(meta.title)||null,description:clean(meta.description)||null,
  main:mainFingerprint(record.html)};
}
function review({pages,origin,scopes}={}){
 if(!Array.isArray(pages)||pages.length>60||typeof origin!=='string'||!scopes)
  throw Error('Published collision QA requires approved bounded routes');
 const eligible=pages.filter(p=>p.seo?.robots==='index'&&p.seo?.canonicalPath===p.path);
 const observed=Object.fromEntries(DEVICES.map(k=>[k,new Map()]));
 for(const p of eligible){
  const served=new URL(p.path.slice(1),origin).href;
  for(const k of DEVICES){
   const item=observe(scopes[k]?.get(p.id),served);
   if(item)observed[k].set(p.id,item);
  }
 }
 const findings=[],signaled=new Map(),collisions={main:0,metadata:0,partial:0,runtime:0};
 let fullPairs=0;
 for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){
  const left=eligible[i],right=eligible[j];
  const pair=DEVICES.map(k=>{
   const a=observed[k].get(left.id),b=observed[k].get(right.id);
   return {scope:k,complete:!!(a&&b),title:!!(a?.title&&a.title===b?.title),
    description:!!(a?.description&&a.description===b?.description),
    main:!!(a?.main&&a.main===b?.main)};
  });
  const full=pair.every(r=>r.complete);if(full)fullPairs++;
  const count=field=>pair.filter(r=>r[field]).length;
  const add=(code,priority,detail)=>{
   // Preserve a representative edge for every implicated approved page, not
   // every combinatorial pair. A repeated sitewide fallback title across 60
   // pages otherwise produces 1,770 near-identical manual queue items.
   const covered=signaled.get(code)||new Set();
   if(covered.has(left.id)&&covered.has(right.id))return;
   covered.add(left.id);covered.add(right.id);signaled.set(code,covered);
   findings.push({pageId:left.id,path:left.path,toPageId:right.id,code,priority,detail});
  };
  const strongMain=full&&count('main')===4;
  const strongMeta=full&&count('title')===4&&count('description')===4;
  if(strongMain){collisions.main++;add('published-duplicate-main-confirmed','P1',
   'Two distinct approved canonical routes have the same substantial normalized main text in HTTP and all three DOMs. Check owner intent, page differentiation and actual visibility.');}
  else if(count('main')>=2||pair[0].main){collisions.partial++;
   add('published-duplicate-main-candidate','P2',
    'Substantial main text coincides for two canonical routes in some supplied scopes; other scopes may differ or be unknown. Inspect original sources.');}
  if(strongMeta){collisions.metadata++;add('published-duplicate-metadata-confirmed','P1',
   'Two distinct approved canonical routes share both SEO title and description in HTTP and all three DOMs. Confirm differentiation with the owner.');}
  else if((count('title')>=2||pair[0].title)||(count('description')>=2||pair[0].description)){
   collisions.partial++;
   add('published-duplicate-metadata-candidate','P2',
    'At least one SEO title/description matches across these canonical routes in supplied source scopes; incomplete or differing sources prohibit corroborated conclusions.');
  }
  // A collision introduced only by post-HTML runtime is still actionable even
  // when other devices or the HTTP source remain distinct.
  if(!pair[0].title&&!pair[0].description&&!pair[0].main&&
   pair.slice(1).some(r=>r.title&&r.description||r.main)){
   collisions.runtime++;
   add('published-duplicate-runtime-drift','P2',
    'A device DOM introduces a metadata pair or substantial main-text collision absent from original HTTP. Verify script and device behavior.');
  }
 }
 return {eligiblePageCount:eligible.length,fullyComparablePairs:fullPairs,
  observedRoutes:Object.fromEntries(DEVICES.map(k=>[k,observed[k].size])),
  counts:collisions,findings,
  comparisonOnly:true,sourceRevisionAuthenticated:false,googleDuplicationVerified:false};
}
module.exports=Object.freeze({review});
