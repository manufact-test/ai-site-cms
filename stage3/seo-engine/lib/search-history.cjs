'use strict';
/* Multi-period Search Console intelligence over private operator-supplied reports.
 * Zero CMS writes, no network, no inferred zero traffic from missing GSC rows.
 */
const {FORMAT:REPORT}=require('./gsc-performance.cjs');
const {FORMAT:CONTEXT,validate:validateContext}=require('./search-evidence-context.cjs');
const FORMAT='manufact-seo-search-history-v1';
function date(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Invalid historical date');
 const t=Date.parse(s+'T00:00:00Z');
 if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==s)throw Error('Invalid historical calendar date');
 return t;
}
const round=(v,n=3)=>Math.round(v*10**n)/10**n;
const isSha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function metric(m){
 if(m===null)return null;
 if(!m||typeof m!=='object'||!Number.isSafeInteger(m.clicks)||!Number.isSafeInteger(m.impressions)||
   m.clicks<0||m.impressions<0||m.clicks>m.impressions||
   typeof m.ctr!=='number'||m.ctr<0||m.ctr>1||
   typeof m.averagePosition!=='number'||m.averagePosition<1||m.averagePosition>1000||
   Math.abs(m.ctr-(m.impressions?m.clicks/m.impressions:0))>0.00005)
  throw Error('Invalid search history page metrics');
 return {clicks:m.clicks,impressions:m.impressions,ctr:m.ctr,averagePosition:m.averagePosition};
}
function validateReport(r){
 if(!r||r.format!==REPORT||r.version!==1||r.readOnly!==true||
  typeof r.siteId!=='string'||!/^https:\/\//.test(r.publicOrigin||'')||
  !isSha(r.blueprintSha256)||!r.period||!Array.isArray(r.pages)||r.pages.length>80||
  !Array.isArray(r.actions))throw Error('History needs complete current-format performance-insights.json');
 if(!r.searchContext||r.searchContext.format!==CONTEXT)throw Error('Report lacks explicit GSC comparison context');
 const ctx=validateContext(r.searchContext);
 if(ctx.comparabilityKey!==r.searchContext.comparabilityKey)throw Error('GSC context comparison signature changed');
 const start=date(r.period.start),end=date(r.period.end);
 if(start>end||Math.round((end-start)/86400000)+1!==r.period.days||
  r.period.days>366)throw Error('Invalid GSC observation period');
 const paths=new Set(),ids=new Set(),pages=[];
 for(const p of r.pages){
  if(!p||typeof p.pageId!=='string'||typeof p.path!=='string'||
   !/^\/(?:[a-z0-9-]+\/)*$/.test(p.path)||
   ids.has(p.pageId)||paths.has(p.path)||
   !['index','noindex'].includes(p.indexation))throw Error('Invalid or duplicated historical page');
  ids.add(p.pageId);paths.add(p.path);
  pages.push({pageId:p.pageId,path:p.path,indexation:p.indexation,
   metrics:metric(p.metrics)});
 }
 const declared=r.summary;
 const observed=pages.filter(p=>p.metrics!==null);
 if(!declared||declared.approvedPages!==pages.length||declared.measuredPages!==observed.length||
  declared.currentPageClicks!==observed.reduce((s,p)=>s+p.metrics.clicks,0)||
  declared.currentPageImpressions!==observed.reduce((s,p)=>s+p.metrics.impressions,0))
  throw Error('GSC summary and page observations disagree');
 return {report:r,context:ctx,start,end,period:r.period,pages,
  byId:new Map(pages.map(p=>[p.pageId,p]))};
}
function comparePair(older,newer){
 if(!older||!newer)return null;
 const pct=(a,b)=>b===0?null:round((a-b)/b*100,1);
 return {clickDelta:newer.clicks-older.clicks,clickChangePct:pct(newer.clicks,older.clicks),
  impressionDelta:newer.impressions-older.impressions,
  impressionChangePct:pct(newer.impressions,older.impressions),
  ctrPointDelta:round((newer.ctr-older.ctr)*100,2),
  averagePositionDelta:round(newer.averagePosition-older.averagePosition,2)};
}
function build(entries){
 if(!Array.isArray(entries)||entries.length<2||entries.length>24)throw Error('History requires 2–24 completed period reports');
 const validated=entries.map(e=>({...validateReport(e.report),sha256:e.sha256,label:e.label||null}));
 if(validated.some(e=>!isSha(e.sha256)))throw Error('History needs exact SHA256 of each supplied report file');
 validated.sort((a,b)=>a.start-b.start);
 const first=validated[0],firstContext=first.context;
 const baselineMap=new Map(first.pages.map(p=>[p.pageId,p]));
 for(let i=0;i<validated.length;i++){
  const r=validated[i];
  if(r.report.siteId!==first.report.siteId||r.report.publicOrigin!==first.report.publicOrigin||
     r.report.blueprintSha256!==first.report.blueprintSha256||
     r.context.comparabilityKey!==firstContext.comparabilityKey||
     r.context.exportMethod!==firstContext.exportMethod||
     r.period.days!==first.period.days)throw Error('Incomparable property/filter/blueprint/export method or period length');
  if(r.pages.length!==baselineMap.size||
   r.pages.some(p=>!baselineMap.has(p.pageId)||baselineMap.get(p.pageId).path!==p.path||
      baselineMap.get(p.pageId).indexation!==p.indexation))
   throw Error('Approved Blueprint page map or indexation changed');
  if(i&&r.start<=validated[i-1].end)throw Error('Overlapping or duplicate GSC periods');
 }
 const coverage=validated.map((r,i)=>({
  period:r.period,sourceReportSha256:r.sha256,observedPages:r.pages.filter(p=>p.metrics).length,
  measuredPageClicks:r.report.summary.currentPageClicks,
  measuredPageImpressions:r.report.summary.currentPageImpressions,
  gapDays:i?Math.round((r.start-validated[i-1].end)/86400000)-1:null,
  comparablePeriodLength:true}));
 const issues=[];
 if(coverage.some((c,i)=>i>0&&c.gapDays!==0))issues.push({
  code:'non-contiguous-observation-windows',severity:'notice',
  message:'Some reports skip date ranges; consecutive-window and sustained-signal assertions exclude gaps.'});
 const pageReports=[],actions=[];
 const propose=(code,priority,page,why,current,extra={})=>actions.push({
  id:code+':'+page.pageId,type:code,priority,pageId:page.pageId,path:page.path,
  observation:why,current,requiresHumanReview:true,automatic:false,
  nextStep:'Compare exact property/filter settings, query mix, actual indexation and published changes before editing CMS.',
  ...extra});
 for(const bp of first.pages){
  const points=validated.map((r,i)=>{
   const p=r.byId.get(bp.pageId),m=p.metrics;
   const prev=i?validated[i-1].byId.get(bp.pageId).metrics:null;
   return {period:r.period,sourceReportSha256:r.sha256,
    observed:m!==null,metrics:m,delta:prev&&m?comparePair(prev,m):null};
  });
  const last=points.at(-1),prior=points.at(-2);
  const adjacent=coverage.at(-1).gapDays===0;
  const lastDelta=adjacent?last.delta:null;
  const alertLoss=lastDelta&&prior.metrics.clicks>=30&&lastDelta.clickChangePct<=-30;
  const impressionLoss=lastDelta&&prior.metrics.impressions>=200&&lastDelta.impressionChangePct<=-35;
  const stableLost=points.length>=3&&adjacent&&coverage.at(-2).gapDays===0&&
   points.at(-2).delta&&points.at(-3).metrics&&
   points.at(-3).metrics.clicks>=30&&points.at(-2).delta.clickChangePct<=-20&&
   alertLoss;
  if(bp.indexation==='index'&&alertLoss)
   propose('observed-click-decline',stableLost?'P1':'P2',bp,
    stableLost?'Clicks fell in two adjacent equal-length observed periods.':'Clicks decreased by at least 30% against the last adjacent observed period.',
    last.metrics,{previous:prior.metrics,delta:lastDelta,sustained:!!stableLost});
  if(bp.indexation==='index'&&impressionLoss&&!alertLoss)
   propose('observed-impression-decline','P2',bp,
    'Observed impressions declined by at least 35% against the adjacent prior period, with 200+ prior impressions.',
    last.metrics,{previous:prior.metrics,delta:lastDelta});
  if(bp.indexation==='index'&&adjacent&&prior.metrics&&last.metrics&&
    prior.metrics.impressions>=200&&last.metrics.impressions>=200&&
    prior.metrics.ctr<0.01&&last.metrics.ctr<0.01&&
    prior.metrics.averagePosition<=12&&last.metrics.averagePosition<=12)
   propose('persistent-low-ctr-review','P2',bp,
    'CTR stayed below 1% with 200+ impressions and average position at most 12 in two adjacent periods.',
    last.metrics,{previous:prior.metrics,delta:lastDelta});
  pageReports.push({pageId:bp.pageId,path:bp.path,indexation:bp.indexation,periods:points,
   observationCount:points.filter(p=>p.observed).length,
   latestPairComparisonAvailable:!!lastDelta,
   latestChange:lastDelta});
 }
 actions.sort((a,b)=>a.priority.localeCompare(b.priority)||
  (b.current?.impressions||0)-(a.current?.impressions||0)||a.id.localeCompare(b.id));
 return {format:FORMAT,version:1,readOnly:true,siteId:first.report.siteId,
  publicOrigin:first.report.publicOrigin,
  blueprintSha256:first.report.blueprintSha256,
  declaredSearchContext:firstContext,
  periods:coverage,pages:pageReports,actions,issues,
  summary:{periodCount:validated.length,approvedPages:first.pages.length,
   observedPagePeriodCells:pageReports.reduce((s,p)=>s+p.observationCount,0),
   unobservedPagePeriodCells:pageReports.reduce((s,p)=>s+p.periods.length-p.observationCount,0),
   priorityP1:actions.filter(a=>a.priority==='P1').length,actions:actions.length},
  guardrails:['All source reports and property/filter context are operator supplied, not Google authenticated.',
   'An unobserved page-period cell is UNKNOWN, never zero clicks.',
   'Comparison requires the identical approved Blueprint raw SHA256, GSC property, filters, export method and date length.',
   'Adjacent-window signals require no date gap. No causal ranking or SEO improvement guarantee.',
   'The reported totals are only the measured Page export rows; not complete property clicks.',
   'No live CMS reads, writes, background monitoring, merge, deploy or publication.']};
}
function markdown(r){
 if(r.format!==FORMAT)throw Error('Invalid history report');
 const safe=x=>String(x??'').replace(/[|<>\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').slice(0,180);
 const out=['# Search visibility history — private editorial dossier','',
  'Site: '+safe(r.siteId)+' | '+safe(r.publicOrigin),
  'Context SHA256: '+r.declaredSearchContext.comparabilityKey,
  'Reports: '+r.summary.periodCount+' | observed page-period cells: '+r.summary.observedPagePeriodCells+
  ' | unobserved (UNKNOWN): '+r.summary.unobservedPagePeriodCells,'',
  '## Observed period summaries','',
  '| Date range | Observed pages | Observed clicks | Observed impressions | Gap days |',
  '|---|---:|---:|---:|---:|'];
 for(const p of r.periods)out.push('| '+p.period.start+' — '+p.period.end+' | '+p.observedPages+' | '+
  p.measuredPageClicks+' | '+p.measuredPageImpressions+' | '+(p.gapDays??'—')+' |');
 out.push('','## Human-only investigation queue','',
  '| Priority | Page | Signal | Next step |','|---|---|---|---|');
 for(const a of r.actions)out.push('| '+a.priority+' | '+safe(a.path)+' | '+
  safe(a.observation)+' | '+safe(a.nextStep)+' |');
 if(!r.actions.length)out.push('| — | — | No threshold reached in supplied comparable periods | Continue observation |');
 out.push('','## Per-page trajectory','');
 for(const p of r.pages){
  out.push('### '+safe(p.path),'','| Period | Observed clicks | Impressions | CTR | Average position |',
   '|---|---:|---:|---:|---:|');
  for(const point of p.periods)out.push('| '+point.period.start+' — '+point.period.end+' | '+
   (point.metrics?.clicks??'UNKNOWN')+' | '+(point.metrics?.impressions??'UNKNOWN')+' | '+
   (point.metrics?(point.metrics.ctr*100).toFixed(2)+'%':'UNKNOWN')+
   ' | '+(point.metrics?.averagePosition??'UNKNOWN')+' |');
  out.push('');
 }
 out.push('## Limits','');for(const g of r.guardrails)out.push('- '+safe(g));
 return out.join('\n')+'\n';
}
module.exports=Object.freeze({FORMAT,validateReport,comparePair,build,markdown});
