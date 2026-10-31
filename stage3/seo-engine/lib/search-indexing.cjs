'use strict';
/* Private GSC page indexing evidence against the exact approved Blueprint.
 * Source CSV is operator-normalized, NOT authenticated Google/API data.
 */
const BP=require('./blueprint.cjs');
const GSC=require('./gsc-performance.cjs');
const CONTEXT=require('./search-evidence-context.cjs');
const FORMAT='manufact-seo-indexing-intelligence-v1';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const SHA=/^[0-9a-f]{64}$/;
const clean=x=>String(x??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,350);
const canonical=x=>String(x??'').normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ');
function exactDate(s){
 return typeof s==='string'&&DATE.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
  new Date(Date.parse(s+'T00:00:00Z')).toISOString().slice(0,10)===s;
}
const aliases={
 url:['url','page','top pages','страница','адрес страницы','strona','adres url','адрес','адрес url'],
 status:['status','coverage','index status','indexing status','состояние','статус','indeksowanie','stan indeksowania'],
 reason:['reason','indexing reason','status reason','причина','powód','przyczyna'],
 crawled:['last crawled','last crawl','последнее сканирование','ostatnio zindeksowano','ostatnio zeskanowano']
};
function parseExport(csv){
 const table=GSC.parseCsv(csv);
 const get=(key,required=true)=>{
  const cols=table.columns.filter(x=>aliases[key].includes(canonical(x)));
  if(cols.length>1||required&&!cols.length)throw Error('Ambiguous or missing indexing evidence column '+key);
  return cols[0]||null;
 };
 const u=get('url'),s=get('status'),r=get('reason',false),c=get('crawled',false);
 if(table.rows.length>15000)throw Error('Index evidence exceeds 15000 URL rows');
 const visited=new Set(),items=[];
 for(const row of table.rows){
  const url=String(row[u]||'').trim(),rawStatus=canonical(row[s]);
  if(!url||url.length>1800||visited.has(url))throw Error('Invalid or duplicated indexing URL evidence row');
  visited.add(url);
  const code=rawStatus==='indexed'||rawStatus==='page is indexed'||rawStatus==='proindeksowano'||rawStatus==='проиндексировано'?'indexed':
   ['excluded','not indexed','not-indexed','page is not indexed','не проиндексировано','не индексируется','nie zindeksowano'].includes(rawStatus)?'not-indexed':
   ['unknown','pending','no data','неизвестно','brak danych'].includes(rawStatus)?'unknown':null;
  if(!code)throw Error('Unrecognized indexing status: '+clean(row[s]));
  const reason=r?clean(row[r]):'',lastCrawled=c?String(row[c]||'').trim():'';
  if(reason.length>280)throw Error('Indexing reason too long');
  if(lastCrawled&&lastCrawled!=='UNKNOWN'&&!exactDate(lastCrawled))
   throw Error('Last crawled must be an exact YYYY-MM-DD calendar date or empty/UNKNOWN');
  items.push({url,status:code,reason,lastCrawled:lastCrawled||null});
 }
 return Object.freeze({format:'manufact-seo-operator-indexing-csv-v1',records:items,
  rowCount:items.length,source:'operator-normalized-indexing-urls'});
}
function analyze({blueprint,blueprintSha256,origin,context,observedAt,exportScope,table,performance=null,performanceSha256=null}){
 const b=BP.checkBlueprint(blueprint),target=GSC.validateOrigin(origin);
 if(!SHA.test(blueprintSha256||'')||!exactDate(observedAt)||
  !['example-urls','selected-urls','all-exported-rows'].includes(exportScope)||
  table?.format!=='manufact-seo-operator-indexing-csv-v1'||!Array.isArray(table.records))
  throw Error('Indexing analysis requires exact approved Blueprint SHA, observed date, scope and parsed index evidence');
 const ctx=CONTEXT.validate(context);
 CONTEXT.assertOrigin(ctx,origin);
 if(ctx.searchType!=='web')throw Error('Indexing evidence only supports declared web Search Console property');
 let performanceById=null;
 if(performance){
  if(!SHA.test(performanceSha256||'')||performance.format!=='manufact-seo-search-performance-v1'||
   !performance.readOnly||performance.siteId!==b.siteId||performance.blueprintSha256!==blueprintSha256||
   !Array.isArray(performance.pages)||performance.publicOrigin!==target.origin||
   CONTEXT.validate(performance.searchContext).property.toLowerCase()!==ctx.property.toLowerCase())
   throw Error('Performance evidence is not from the same site, original Blueprint bytes or GSC property');
  performanceById=new Map(performance.pages.map(p=>[p.pageId,p]));
 }
 const route=new Map(b.pages.map(p=>[p.path,p])),observed=new Map(),unmapped=[],errors=[];
 for(const item of table.records){
  const result=GSC.pathFromUrl(item.url,target),bp=route.get(result.path);
  if(!bp){
   unmapped.push({url:clean(item.url),status:item.status,reason:item.reason,
    mappingReason:result.reason||'not-in-approved-blueprint'});
   continue;
  }
  if(observed.has(bp.id))throw Error('Multiple indexing evidence URLs map to one approved Blueprint route');
  observed.set(bp.id,item);
 }
 const pages=[],actions=[],statusCounts={indexed:0,'not-indexed':0,unknown:0,unobserved:0};
 const propose=(code,priority,page,observation,nextStep,source)=>{
  actions.push({id:code+':'+page.id,type:code,priority,pageId:page.id,path:page.path,
   evidence:source,observation,nextStep,manualOnly:true,automatic:false,verifiedLiveIndexation:false});
 };
 for(const p of b.pages){
  const record=observed.get(p.id),status=record?.status||'unobserved',desired=p.seo.robots;
  statusCounts[status]++;
  const search=performanceById?.get(p.id)||null;
  const m=search?.metrics||null;
  const item={pageId:p.id,path:p.path,name:p.name,approvedRobots:desired,
   observationStatus:status,observationReason:record?.reason||null,
   lastCrawled:record?.lastCrawled||null,
   indexingEvidenceProvided:!!record,
   observedPerformance:m?{clicks:m.clicks,impressions:m.impressions,period:performance.period}:null,
   observationInterpretation:'Operator-declared inspection/export, not authenticated GSC URL Inspection'};
  if(desired==='index'&&status==='not-indexed'){
   const priority=m?.impressions>=100?'P1':'P2';
   propose('review-approved-indexable-not-indexed',priority,p,
    'Blueprint permits indexing but the supplied indexing export reports exclusion.'+
    (record.reason?' Reason: '+clean(record.reason):''),
    'Inspect actual URL Inspection and live canonical/robots/indexability before proposing changes; exported indexing data may lag.',
    {status,reason:record.reason,lastCrawled:record.lastCrawled,performanceImpressions:m?.impressions??null});
  }
  if(desired==='noindex'&&status==='indexed')
   propose('review-approved-noindex-reported-indexed','P1',p,
    'Blueprint disallows indexing but supplied URL evidence says indexed.',
    'Inspect actual live meta robots, HTTP X-Robots-Tag, canonical and Search Console URL Inspection. Do not auto-change client-approved robots.',
    {status,lastCrawled:record.lastCrawled});
  if(desired==='index'&&status==='indexed'&&record.reason&&/canonical|duplicate/i.test(record.reason))
   propose('review-indexed-canonical-anomaly','P2',p,
    'Indexed status includes a canonical/duplicate note; inspect for mismatch against approved canonical.',
    'Confirm live rel=canonical, URL Inspection and intended canonical; do not rewrite redirects without approval.',
    {status,reason:record.reason});
  if(m?.impressions>0&&status==='not-indexed')
   propose('review-search-performance-indexing-disagreement','P2',p,
    'Page had measured Search Console impressions in the supplied performance period while later/other indexing evidence reports not-indexed.',
    'Compare observation dates, filters, canonical URL and Search Console lag. This is not proof of simultaneous inconsistency.',
    {status,impressions:m.impressions,performancePeriod:performance.period});
  pages.push(item);
 }
 if(unmapped.length)
  actions.push({id:'review-unmapped-indexing-urls',type:'review-unmapped-indexing-urls',priority:'P2',
   pageId:null,path:null,observation:unmapped.length+' supplied indexing URLs cannot be aligned to the approved route map.',
   nextStep:'Review aliases/redirects/mount, unexpected routes and URL variants against the live site without editing CMS automatically.',
   evidence:{rows:unmapped.length},manualOnly:true,automatic:false});
 const rank={P1:0,P2:1,P3:2};
 actions.sort((x,y)=>rank[x.priority]-rank[y.priority]||String(x.path||'').localeCompare(String(y.path||''))||x.id.localeCompare(y.id));
 return {format:FORMAT,version:1,readOnly:true,siteId:b.siteId,publicOrigin:target.origin,
  blueprintSha256,gscProperty:ctx.property,indexingContextKey:ctx.comparabilityKey,
  observedAt,exportScope,sourceType:'operator-normalized-gsc-export',
  performanceSourceSha256:performance?performanceSha256:null,
  summary:{approvedPages:b.pages.length,observedApprovedPages:observed.size,
   reportedIndexed:statusCounts.indexed,reportedNotIndexed:statusCounts['not-indexed'],
   reportedUnknown:statusCounts.unknown,notObserved:statusCounts.unobserved,
   unmappedRows:unmapped.length,actions:actions.length,
   P1:actions.filter(x=>x.priority==='P1').length},
  pages,unmappedUrls:unmapped.slice(0,250),actions,issues:errors,
  guardrails:['CSV rows are operator-normalized, not authenticated Search Console or live Google index status.',
   'Missing approved URLs are UNOBSERVED, never classified as excluded or indexed.',
   'Indexing is URL-specific; sampled/example URLs cannot establish sitewide index-coverage rates.',
   'A not-indexed row may be historical/canonicalized; verify actual current URL Inspection and public HTTP.',
   'Performance and index observations may describe different dates; a difference is not proof of a live contradiction.',
   'No automatic robots/canonical changes, indexing request, CMS edits, PR, merge, deploy or publication.']};
}
function markdown(r){
 if(r?.format!==FORMAT)throw Error('Invalid indexing report');
 const safe=x=>String(x??'').replace(/[|<>\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').slice(0,190);
 const lines=['# MANUFACT SEO — Private Search Indexing Intelligence','',
  'Site: '+safe(r.siteId)+' · Property: '+safe(r.gscProperty)+' · Observation: '+r.observedAt,
  'Source scope: '+r.exportScope+' (OPERATOR DECLARED, not Google authenticated)','',
  'Approved pages: '+r.summary.approvedPages+'; reported indexed: '+r.summary.reportedIndexed+
  '; reported not indexed: '+r.summary.reportedNotIndexed+
  '; UNKNOWN/not observed: '+(r.summary.reportedUnknown+r.summary.notObserved),
  'Human review prompts: '+r.summary.actions+'; P1: '+r.summary.P1,'',
  '## Approved Blueprint URLs and indexing evidence','',
  '| Approved path | Approved robots | Reported URL status | Reason | GSC impressions (optional) |',
  '|---|---|---|---|---:|'];
 for(const p of r.pages)lines.push('| '+safe(p.path)+' | '+p.approvedRobots+' | '+
  p.observationStatus+' | '+safe(p.observationReason||'—')+' | '+
  (p.observedPerformance?.impressions??'UNKNOWN')+' |');
 lines.push('','## Owner/editor investigation worklist','',
  '| Priority | Approved path | Evidence issue | Next manual check |','|---|---|---|---|');
 for(const a of r.actions)lines.push('| '+a.priority+' | '+safe(a.path||'(unmapped)')+' | '+
  safe(a.observation)+' | '+safe(a.nextStep)+' |');
 if(!r.actions.length)lines.push('| — | — | No rule triggered in supplied rows | Continue real URL inspection |');
 if(r.unmappedUrls.length){
  lines.push('','## Unmapped submitted URLs','');
  for(const u of r.unmappedUrls)lines.push('- '+safe(u.url)+' ('+safe(u.mappingReason)+')');
 }
 lines.push('','## Interpretation limits','');for(const t of r.guardrails)lines.push('- '+safe(t));
 return lines.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,parseExport,analyze,markdown});
