'use strict';
/* Read-only offline Search Console performance intelligence. No API calls, rankings or CMS writes. */
const {checkBlueprint}=require('./blueprint.cjs');
const FORMAT='manufact-seo-search-performance-v1';
const MAX_ROWS=15000;
const headers={
 page:['top pages','page','pages','url','landing page','страницы','страница','адрес страницы','najpopularniejsze strony','strony','strona'],
 query:['top queries','query','queries','search query','запросы','запрос','популярные запросы','zapytania','zapytanie'],
 clicks:['clicks','клики','klikniecia','kliknięcia'],
 impressions:['impressions','показы','wyswietlenia','wyświetlenia'],
 ctr:['ctr','средний ctr','średni ctr','click through rate'],
 position:['position','average position','средняя позиция','позиция','średnia pozycja','pozycja']
};
const column=x=>String(x||'').normalize('NFKC').replace(/^\uFEFF/,'').trim().toLocaleLowerCase().replace(/\s+/g,' ');
function parseCsv(value){
 if(typeof value!=='string'||value.length>4500000||value.includes('\uFFFD'))throw Error('GSC CSV must be UTF-8 text under 4.5 MB');
 const out=[];let row=[],cell='',quotes=false;
 for(let i=0;i<value.length;i++){
  const c=value[i];
  if(quotes){
   if(c==='"'&&value[i+1]==='"'){cell+='"';i++;}
   else if(c==='"')quotes=false;
   else cell+=c;
  }else if(c==='"'){
   if(cell)throw Error('Invalid quoted CSV field');
   quotes=true;
  }else if(c===','){row.push(cell);cell='';}
  else if(c==='\n'){row.push(cell.replace(/\r$/,''));out.push(row);row=[];cell='';}
  else cell+=c;
  if(cell.length>2500)throw Error('GSC CSV field too long');
  if(out.length>MAX_ROWS+1)throw Error('GSC CSV has too many rows');
 }
 if(quotes)throw Error('Unclosed GSC CSV quote');
 if(cell||row.length){row.push(cell.replace(/\r$/,''));out.push(row);}
 if(!out.length||out[0].length<4||out[0].length>30)throw Error('Missing GSC CSV header');
 const keys=out[0].map(column);
 if(new Set(keys).size!==keys.length)throw Error('Duplicate GSC CSV headers');
 const rows=[];
 for(const line of out.slice(1)){
  if(line.every(v=>!v.trim()))continue;
  if(line.length!==keys.length)throw Error('Malformed GSC CSV row '+(rows.length+2));
  rows.push(Object.fromEntries(keys.map((k,i)=>[k,line[i].trim()])));
 }
 if(rows.length>MAX_ROWS)throw Error('GSC CSV exceeds row limit');
 return {columns:keys,rows};
}
function findColumn(names,key,required=true){
 const matches=names.filter(n=>headers[key].includes(n));
 if(matches.length>1)throw Error('Ambiguous GSC column: '+key);
 if(!matches.length&&required)throw Error('Missing GSC column: '+key);
 return matches[0]||null;
}
function numeric(value,label,integer=false){
 if(typeof value!=='string'||!value.trim())throw Error('Missing GSC number '+label);
 let s=value.replace(/[\u00a0\u202f ]/g,'').trim();
 if(s.includes(',')&&!s.includes('.'))s=s.replace(',','.');
 if(!/^\d+(?:\.\d+)?$/.test(s))throw Error('Invalid GSC number '+label);
 const n=Number(s);
 if(!Number.isFinite(n)||n>1e12||(integer&&!Number.isSafeInteger(n)))throw Error('Invalid GSC metric '+label);
 return n;
}
function readCsv(raw,kind){
 if(!['pages','queries','pairs'].includes(kind))throw Error('Unsupported GSC evidence dimension');
 const parsed=parseCsv(raw),names=parsed.columns;
 const page=findColumn(names,'page',kind!=='queries');
 const query=findColumn(names,'query',kind!=='pages');
 if(kind==='pages'&&query||kind==='queries'&&page)throw Error('GSC table dimensions do not match claimed export: '+kind);
 const clicks=findColumn(names,'clicks'),impressions=findColumn(names,'impressions');
 const ctr=findColumn(names,'ctr',false),position=findColumn(names,'position');
 const records=[],seen=new Set();
 for(const row of parsed.rows){
  const r={clicks:numeric(row[clicks],'clicks',true),
   impressions:numeric(row[impressions],'impressions',true),
   position:numeric(row[position],'position')};
  if(r.clicks>r.impressions||r.position<1||r.position>1000)throw Error('Impossible GSC metrics');
  r.ctr=r.impressions?r.clicks/r.impressions:0;
  if(ctr){
   const displayed=row[ctr].replace(/\s/g,'');
   const n=numeric(displayed.replace(/%$/,''),'ctr');
   const observed=displayed.endsWith('%')?n/100:n;
   if(observed>1||Math.abs(observed-r.ctr)>0.006)throw Error('GSC CTR contradicts clicks/impressions');
  }
  if(page){
   if(!row[page]||row[page].length>1800)throw Error('Invalid page URL in GSC export');
   r.page=row[page];
  }
  if(query){
   if(!row[query]||row[query].length>400||/[\u0000-\u001f]/.test(row[query]))throw Error('Invalid search query in GSC export');
   r.query=row[query];
  }
  const key=kind==='pages'?r.page:kind==='queries'?r.query:JSON.stringify([r.page,r.query]);
  if(seen.has(key))throw Error('Duplicate GSC dimension row; use one aggregate per key');
  seen.add(key);records.push(r);
 }
 return Object.freeze({kind,records});
}
function period(value,label){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Missing GSC '+label+' dates');
 const exact=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 if(!exact(value.start)||!exact(value.end)||value.end<value.start)throw Error('Invalid GSC '+label+' dates');
 const days=Math.round((Date.parse(value.end+'T00:00:00Z')-Date.parse(value.start+'T00:00:00Z'))/86400000)+1;
 if(days>366)throw Error('GSC period exceeds one year');
 return {...value,days};
}
function validateOrigin(value){
 const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!u.hostname||u.port)throw Error('Origin must be a public HTTPS site root');
 const mount=u.pathname.endsWith('/')?u.pathname:u.pathname+'/';
 return {origin:u.origin+mount,host:u.host,mount};
}
function pathFromUrl(page,origin){
 let u;
 try{u=new URL(page);}catch{return {reason:'malformed-public-url'};}
 if(u.protocol!=='https:'||u.host!==origin.host||u.username||u.password)return {reason:'foreign-origin'};
 if(u.search||u.hash)return {reason:'parameterized-url'};
 let p=u.pathname;
 if(!p.startsWith(origin.mount))return {reason:'outside-public-mount'};
 p='/'+p.slice(origin.mount.length);
 if(p==='/index.html')p='/';
 else if(p.endsWith('/index.html'))p=p.slice(0,-10);
 if(!p.endsWith('/'))return {reason:'noncanonical-path',path:p};
 if(!/^\/(?:[a-z0-9-]+\/)*$/.test(p))return {reason:'unsupported-path',path:p};
 return {path:p};
}
const norm=s=>String(s||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
const round=(n,precision=4)=>Math.round(n*10**precision)/10**precision;
const clean=x=>String(x??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,500);
function analyze(opts){
 if(!opts||!opts.blueprint||!opts.current?.pages)throw Error('GSC analysis requires Blueprint and a Pages CSV export');
 const b=checkBlueprint(opts.blueprint),origin=validateOrigin(opts.origin);
 const current=period(opts.period,'current period');
 const prior=opts.previousPages?period(opts.previousPeriod,'previous period'):null;
 if(prior&&(prior.days!==current.days||prior.end>=current.start))throw Error('Comparison requires disjoint equal-length periods');
 if(!opts.current.pages.records||opts.current.pages.kind!=='pages')throw Error('Wrong Pages CSV evidence');
 if(opts.current.queries&&opts.current.queries.kind!=='queries')throw Error('Wrong Queries CSV evidence');
 if(opts.current.pairs&&opts.current.pairs.kind!=='pairs')throw Error('Wrong paired Page/Query CSV evidence');
 if(opts.previousPages&&opts.previousPages.kind!=='pages')throw Error('Wrong previous Pages CSV evidence');
 const pagesByPath=new Map(b.pages.map(p=>[p.path,p]));
 const sitePages=opts.site?new Map((opts.site.pages||[]).map(p=>[p.id,p])):null;
 if(opts.site&&opts.site.siteId!==b.siteId)throw Error('Site v1 ID mismatches Blueprint');
 const issues=[],unmapped=[];
 const ingest=(table,previous=false)=>{
  const map=new Map();
  for(const r of table.records){
   const parsed=pathFromUrl(r.page,origin),bp=pagesByPath.get(parsed.path);
   if(!bp){
    (previous?[]:unmapped).push({url:clean(r.page),reason:parsed.reason||'not-in-approved-blueprint',
     clicks:r.clicks,impressions:r.impressions,position:round(r.position,2)});
    continue;
   }
   if(map.has(bp.id))throw Error('Several GSC page URLs map to the same Blueprint route; resolve duplicate canonical versions');
   map.set(bp.id,r);
  }
  return map;
 };
 const now=ingest(opts.current.pages),old=opts.previousPages?ingest(opts.previousPages,true):new Map();
 const pairs=new Map(),queryPages=new Map(),unmappedPairs=[];
 if(opts.current.pairs)for(const r of opts.current.pairs.records){
  const parsed=pathFromUrl(r.page,origin),bp=pagesByPath.get(parsed.path);
  if(!bp){unmappedPairs.push({reason:parsed.reason||'not-in-approved-blueprint',impressions:r.impressions});continue;}
  if(!pairs.has(bp.id))pairs.set(bp.id,[]);
  pairs.get(bp.id).push(r);
  const q=norm(r.query);
  if(!queryPages.has(q))queryPages.set(q,[]);
  queryPages.get(q).push({pageId:bp.id,path:bp.path,query:clean(r.query),clicks:r.clicks,impressions:r.impressions,
   position:round(r.position,2)});
 }
 const actions=[],pageReports=[];
 const propose=(type,priority,page,reason,metrics,nextStep,extra={})=>{
  actions.push({id:type+':'+page.id,type,priority,pageId:page.id,path:page.path,
   reason,metrics,nextStep,automatic:false,requiresEditorialReview:true,...extra});
 };
 for(const bp of b.pages){
  const r=now.get(bp.id),previous=old.get(bp.id),sitePage=sitePages?.get(bp.id);
  const implementation=sitePages?(!sitePage?'not-implemented':sitePage.path!==bp.path?'route-differs':'mapped'):'not-supplied';
  const m=r?{clicks:r.clicks,impressions:r.impressions,ctr:round(r.ctr,5),
   averagePosition:round(r.position,2)}:null;
  const oldM=previous?{clicks:previous.clicks,impressions:previous.impressions,ctr:round(previous.ctr,5),
   averagePosition:round(previous.position,2)}:null;
  const topPairs=[...(pairs.get(bp.id)||[])].sort((a,b)=>b.impressions-a.impressions).slice(0,25)
   .map(q=>({query:clean(q.query),clicks:q.clicks,impressions:q.impressions,
    ctr:round(q.ctr,5),averagePosition:round(q.position,2),
    declaredTopicMatch:bp.intent.topics.some(t=>norm(t)===norm(q.query))}));
  pageReports.push({pageId:bp.id,path:bp.path,name:bp.name,intent:bp.intent.type,
   plannedTopics:bp.intent.topics,indexation:bp.seo.robots,implementation,
   metrics:m,previousMetrics:oldM,pairedQueryCoverage:opts.current.pairs?'partial-export-no-completeness-claim':'unavailable',
   topQueries:topPairs});
  if(!r)continue;
  if(bp.seo.robots==='noindex'&&r.impressions>=20)propose('inspect-noindex-search-traffic','P1',bp,
   'GSC records impressions on a Blueprint noindex route; historical indexing or URL variants may explain it.',m,
   'Confirm current public robots, canonical and actual indexed URL; do not flip indexation automatically.');
  if(implementation==='route-differs'||implementation==='not-implemented')propose('reconcile-published-route','P1',bp,
   'Approved Blueprint route is not aligned to supplied Site v1.',m,
   'Resolve approved versus implemented routing before editing the page.');
  if(previous&&previous.clicks>=30&&r.clicks<=previous.clicks*0.7){
   propose('investigate-click-decline','P1',bp,
    'Clicks declined at least 30% between equal-length non-overlapping GSC periods; cause not established.',
    {...m,previousClicks:previous.clicks,clickDelta:r.clicks-previous.clicks},
    'Check indexing, query mix, seasonality, SERP appearance and any recent publication changes.');
  }
  if(bp.seo.robots!=='index'||implementation==='route-differs')continue;
  if(r.impressions>=200&&r.position<=10&&r.ctr<0.015)
   propose('review-snippet-ctr','P2',bp,
    'At least 200 impressions, average position at most 10, observed CTR below the editorial 1.5% triage heuristic.',
    m,'Review search query intent, existing title/description and SERP appearance without keyword stuffing.');
  if(r.impressions>=100&&r.position>=8&&r.position<=20)
   propose('review-near-first-page-content','P2',bp,
    'Observed average position falls between 8 and 20 with at least 100 impressions; not a ranking forecast.',
    m,'Review topic coverage, helpful page sections and relevant internal links against approved content.');
 }
 if(!opts.current.pairs)issues.push({code:'no-page-query-pairs',severity:'information',
  message:'Separate Queries CSV cannot attribute individual queries to pages. Supply paired dimensions for page-specific query insights.'});
 for(const [key,entries] of queryPages){
  const distinct=new Map();
  for(const e of entries)if(e.impressions>=20&&pagesByPath.get(e.path)?.seo.robots==='index')distinct.set(e.pageId,e);
  if(distinct.size<2||[...distinct.values()].reduce((s,e)=>s+e.impressions,0)<80)continue;
  const grouped=[...distinct.values()].sort((a,b)=>b.impressions-a.impressions);
  const target=pagesByPath.get(grouped[0].path);
  propose('review-query-target-overlap','P2',target,
   'The same query appears for several indexable pages in supplied paired GSC rows; this is not proof of cannibalization.',
   {query:grouped[0].query,totalObservedImpressions:grouped.reduce((n,e)=>n+e.impressions,0)},
   'Compare search intent and page purposes; choose whether both pages deserve distinct targets.',
   {otherPages:grouped.slice(1).map(({pageId,path,impressions})=>({pageId,path,impressions}))});
 }
 if(unmapped.length)actions.push({id:'review-unmapped-public-urls',type:'review-unmapped-public-urls',priority:'P1',
  pageId:null,path:null,reason:'Some measured public URLs cannot be aligned to the approved Blueprint.',
  metrics:{rows:unmapped.length,impressions:unmapped.reduce((s,x)=>s+x.impressions,0)},
  nextStep:'Inspect canonical variants, host/mount mapping and unexpected routes; keep owner-approved structure intact.',
  automatic:false,requiresEditorialReview:true});
 actions.sort((a,b)=>a.priority.localeCompare(b.priority)||
  (b.metrics?.impressions||0)-(a.metrics?.impressions||0)||a.id.localeCompare(b.id));
 const globalQueries=opts.current.queries?opts.current.queries.records.slice()
  .sort((a,b)=>b.impressions-a.impressions).slice(0,50)
  .map(x=>({query:clean(x.query),clicks:x.clicks,impressions:x.impressions,
   ctr:round(x.ctr,5),averagePosition:round(x.position,2),
   attributedToPage:false})):[];
 const summary={approvedPages:b.pages.length,measuredPages:now.size,unmappedUrls:unmapped.length,
  actions:actions.length,priorityP1:actions.filter(a=>a.priority==='P1').length,
  currentPageClicks:[...now.values()].reduce((s,r)=>s+r.clicks,0),
  currentPageImpressions:[...now.values()].reduce((s,r)=>s+r.impressions,0)};
 return {format:FORMAT,version:1,readOnly:true,siteId:b.siteId,publicOrigin:origin.origin,
  period:current,previousPeriod:prior,summary,pages:pageReports,
  unmappedUrls:unmapped.slice(0,250),unmappedPairRows:unmappedPairs.length,globalQueries,actions,issues,
  provenance:{pageMetrics:'User-supplied Search Console Pages CSV; may be filtered, sampled or truncated.',
   pairedQueries:opts.current.pairs?'User-supplied Page+Query dimensions; no complete search-term coverage guaranteed.':'Not supplied.',
   comparison:prior?'Equal-length reported periods; no seasonality or algorithm causality inferred.':'No historical comparison.',
   validation:'Source CSV authenticity, property ownership and public deployment not independently authenticated.'},
  boundaries:['No live Search Console API connection or GSC authentication.',
   'No automatic edits, publishing, search volume or rank promises.',
   'Queries in a global query export are not assigned to specific pages.',
   'Triage heuristics are editorial prompts, not industry CTR benchmarks.',
   'Treat reports as private: search queries may include sensitive text.']};
}
module.exports=Object.freeze({FORMAT,parseCsv,readCsv,analyze,pathFromUrl,validateOrigin});
