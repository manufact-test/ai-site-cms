'use strict';
/* Standalone private SEO operations HTML dashboard; no network, JS or CMS writes. */
const {FORMAT:HISTORY}=require('./search-history.cjs');
const {REVIEW:DECISION}=require('./search-action-ledger.cjs');
const {FORMAT:FOLLOWUP}=require('./search-release-followup.cjs');
const FORMAT='manufact-seo-private-ops-dashboard-v1';
const SHA=/^[a-f0-9]{64}$/;
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const num=x=>Number.isFinite(x)?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(x):'—';
function validate(history,historySha,decisions,releases){
 if(history?.format!==HISTORY||history.version!==1||!history.readOnly||
   !SHA.test(historySha||'')||!SHA.test(history.blueprintSha256||'')||
   !Array.isArray(history.periods)||history.periods.length<2||history.periods.length>24||
   !Array.isArray(history.pages)||history.pages.length>80||!Array.isArray(history.actions))
  throw Error('Private dashboard needs exact source-bound Search History');
 const ids=new Set(history.pages.map(p=>p.pageId)),tasks=new Set(history.actions.map(t=>t.id));
 if(ids.size!==history.pages.length||tasks.size!==history.actions.length||
   history.pages.some(p=>!Array.isArray(p.periods)||p.periods.length!==history.periods.length))
  throw Error('Invalid Search History series or duplicated IDs');
 if(decisions&&(decisions.format!==DECISION||!decisions.readOnly||
  decisions.siteId!==history.siteId||decisions.sourceHistorySha256!==historySha||
  !Array.isArray(decisions.actions)||decisions.actions.length!==tasks.size||
  decisions.actions.some(a=>!tasks.has(a.actionId))||
  new Set(decisions.actions.map(a=>a.actionId)).size!==tasks.size))
  throw Error('Human decision review is not source-bound to this Search History');
 if(releases&&(releases.format!==FOLLOWUP||!releases.readOnly||
  releases.siteId!==history.siteId||releases.sourceHistorySha256!==historySha||
  releases.causalEffectEstablished!==false||!Array.isArray(releases.results)))
  throw Error('Release observations are not source-bound to this Search History');
}
function spark(points,key){
 const values=points.map(p=>p.observed&&Number.isFinite(p.metrics?.[key])?p.metrics[key]:null);
 const present=values.filter(x=>x!==null);
 if(!present.length)return '<span class="muted">No observations</span>';
 const low=Math.min(...present),span=Math.max(1,Math.max(...present)-low),w=240;
 const x=i=>12+i*216/Math.max(1,values.length-1),y=v=>57-(v-low)*40/span;
 const segments=[];let segment=[];
 values.forEach((v,i)=>{
  if(v===null){if(segment.length)segments.push(segment);segment=[];}
  else segment.push([x(i),y(v),i,v]);
 });
 if(segment.length)segments.push(segment);
 const path=segments.map(s=>'<path d="'+s.map((p,i)=>(i?'L':'M')+
  p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')+
  '" fill="none" stroke="#0d8b80" stroke-width="2.5" stroke-linecap="round"/>').join('');
 const dots=segments.flatMap(s=>s.map(p=>'<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+
  '" r="3.4" fill="#12776d"><title>'+esc(points[p[2]].period.start+': '+p[3])+'</title></circle>')).join('');
 return '<svg viewBox="0 0 '+w+' 70" width="240" height="70" aria-label="Observed trend; missing periods are not connected" role="img">'+path+dots+'</svg>';
}
function render(history,sha,decisions=null,releases=null){
 validate(history,sha,decisions,releases);
 const h=history,states=new Map((decisions?.actions||[]).map(a=>[a.actionId,a]));
 const latest=h.periods.at(-1).period;
 const cards=[
  ['Observation windows',h.periods.length],['Approved pages',h.pages.length],
  ['Measured page-period cells',h.summary?.observedPagePeriodCells??'—'],
  ['UNKNOWN page-period cells',h.summary?.unobservedPagePeriodCells??'—'],
  ['SEO tasks',h.actions.length],['P1 tasks',h.actions.filter(a=>a.priority==='P1').length]
 ].map(([label,value])=>'<div class="stat"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>').join('');
 const periods=h.periods.map(p=>'<tr><td>'+esc(p.period.start+' – '+p.period.end)+'</td>'+
  '<td class="num">'+num(p.observedPages)+'</td><td class="num">'+num(p.measuredPageClicks)+'</td>'+
  '<td class="num">'+num(p.measuredPageImpressions)+'</td><td class="num">'+num(p.gapDays)+'</td></tr>').join('');
 const actions=h.actions.map(a=>{
  const owner=states.get(a.id),status=owner?.status||'unreviewed';
  return '<article class="task"><div class="task-head"><b class="'+(a.priority==='P1'?'p1':'p2')+'">'+
   esc(a.priority)+'</b><span>'+esc(status)+'</span><code>'+esc(a.path)+'</code></div>'+
   '<h3>'+esc(a.type.replace(/-/g,' '))+'</h3><p>'+esc(a.observation)+'</p>'+
   '<p class="instruction"><b>Human next step:</b> '+esc(a.nextStep)+'</p>'+
   (owner?.assignee?'<small>Assigned: '+esc(owner.assignee)+'</small>':'')+'</article>';
 }).join('')||'<p>No heuristic tasks triggered in the supplied windows.</p>';
 const pageRows=h.pages.map(p=>{
  const last=p.periods.at(-1);
  const observations=p.periods.map(x=>'<tr><td>'+esc(x.period.start)+'</td><td class="num">'+
   (x.metrics?num(x.metrics.clicks):'UNKNOWN')+'</td><td class="num">'+
   (x.metrics?num(x.metrics.impressions):'UNKNOWN')+'</td><td class="num">'+
   (x.metrics?(x.metrics.ctr*100).toFixed(2)+'%':'UNKNOWN')+'</td><td class="num">'+
   (x.metrics?num(x.metrics.averagePosition):'UNKNOWN')+'</td></tr>').join('');
  return '<details class="page"><summary><span class="page-name"><b>'+esc(p.path)+'</b><small>'+
   esc(p.pageId)+' · '+p.periods.filter(t=>t.observed).length+' observed windows</small></span>'+
   '<span class="metric"><b>'+num(last.metrics?.clicks)+'</b><small>latest clicks</small></span>'+
   '<span class="trend">'+spark(p.periods,'clicks')+'</span></summary>'+
   '<div class="page-detail"><div class="hint">Unobserved is UNKNOWN, not zero; this does not measure CMS correctness.</div>'+
   '<div class="scroll"><table><thead><tr><th>Start</th><th class="num">Clicks</th>'+
   '<th class="num">Impressions</th><th class="num">CTR</th><th class="num">Avg position</th>'+
   '</tr></thead><tbody>'+observations+'</tbody></table></div></div></details>';
 }).join('');
 const releaseSection=releases?'<section class="panel" id="releases"><h2>Owner-declared release follow-up</h2>'+
  '<p class="muted">Changes are observed correlations only; neither deployment nor SEO effect is authenticated.</p>'+
  releases.results.map(r=>'<details class="release"><summary>'+esc(r.id)+' · '+esc(r.publishedDate)+
   ' · '+esc(r.cohortStatus)+'</summary><p>'+esc(r.declaredSummary)+'</p>'+
   '<div class="scroll"><table><thead><tr><th>Page</th><th>Comparison</th><th class="num">Before</th>'+
   '<th class="num">After</th><th class="num">Click change</th></tr></thead><tbody>'+
   r.pages.map(p=>'<tr><td>'+esc(p.path)+'</td><td>'+esc(p.status)+'</td>'+
    '<td class="num">'+(p.pre?num(p.pre.clicks):'UNKNOWN')+'</td>'+
    '<td class="num">'+(p.post?num(p.post.clicks):'UNKNOWN')+'</td>'+
    '<td class="num">'+(p.changes?num(p.changes.clicks):'NOT COMPARABLE')+'</td></tr>').join('')+
   '</tbody></table></div></details>').join('')+'</section>':'';
 const css=[
 ':root{--ink:#182e42;--muted:#61758a;--line:#dfe7ed;--back:#f4f7f9;--teal:#137c74;--radius:18px}',
 '*{box-sizing:border-box}body{background:var(--back);margin:0;color:var(--ink);font:15px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}',
 'main{max-width:1200px;margin:auto;padding:22px 20px 70px}.hero{padding:36px;border-radius:24px;color:#fff;background:linear-gradient(130deg,#122c44,#0e6b73)}',
 '.eyebrow{text-transform:uppercase;font-size:12px;font-weight:800;letter-spacing:.13em;color:#a1e4dd}',
 'h1{font-size:clamp(25px,4vw,40px);letter-spacing:-.03em;line-height:1.2;margin:9px 0}h2{font-size:23px;letter-spacing:-.02em;margin:0 0 8px}h3{font-size:17px;text-transform:capitalize;margin:9px 0}',
 '.hero p{color:#c8e4e6;margin:6px 0}.nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:23px}.nav a{color:#fff;text-decoration:none;border:1px solid #ffffff55;border-radius:30px;padding:6px 13px;font-size:13px}',
 '.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}',
 '.stat,.panel{background:#fff;border:1px solid var(--line);border-radius:var(--radius);box-shadow:0 5px 22px #13304b07}',
 '.stat{padding:19px}.stat small,.page small,.task small,.muted{color:var(--muted)}.stat strong{display:block;font-size:29px;line-height:1.3;margin-top:7px;font-variant-numeric:tabular-nums}',
 '.panel{padding:26px;margin-top:18px}.scroll{overflow:auto}.scroll table{border-collapse:collapse;width:100%;min-width:520px}',
 'th{text-align:left;font-size:12px;color:var(--muted);background:#f8fafc}th,td{padding:11px;border-bottom:1px solid var(--line)}.num{text-align:right;font-variant-numeric:tabular-nums}',
 '.tasks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.task{padding:18px;border:1px solid var(--line);border-radius:14px}.task-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px}',
 '.task-head b,.task-head span{padding:3px 9px;border-radius:20px}.p1{background:#fff0ea;color:#a23b26}.p2{background:#fff6d9;color:#86602b}.task-head span{background:#e9f5f3;color:#2f6d65}',
 '.task code{color:var(--muted);font-size:12px;overflow-wrap:anywhere}.instruction{border-top:1px dashed var(--line);padding-top:10px}',
 '.page,.release{border:1px solid var(--line);border-radius:13px;margin:9px 0;overflow:hidden}.page summary{display:flex;gap:18px;align-items:center;cursor:pointer;padding:10px 16px;min-height:93px}',
 '.page summary:before{content:"+";font-size:25px;color:var(--teal)}.page[open] summary:before{content:"−"}summary::-webkit-details-marker{display:none}',
 '.page-name{flex:1;min-width:0}.page-name b,.page-name small,.metric b,.metric small{display:block}.page-name b{overflow-wrap:anywhere}.metric b{font-size:19px}.metric small{font-size:11px}',
 '.trend{width:240px}.page-detail{padding:5px 16px 19px}.hint{background:#edf7f5;border-left:3px solid var(--teal);padding:12px;margin-bottom:15px;font-size:13px}',
 '.release{padding:14px}.release summary{font-weight:700;cursor:pointer}.release p{color:var(--muted)}footer{font-size:12px;color:var(--muted);padding:25px 4px}',
 '@media(max-width:850px){.trend{display:none}.tasks{grid-template-columns:1fr}}@media(max-width:600px){main{padding:12px}.hero{padding:22px}.panel{padding:17px 12px}.stats{grid-template-columns:repeat(2,1fr)}.page summary{gap:10px}.metric b{font-size:16px}}',
 '@media print{body{background:#fff}.hero{background:#fff;color:#111;border:1px solid #ccc}.hero p,.eyebrow{color:#333}.nav{display:none}.stat,.panel{box-shadow:none}.page-detail{display:block}}'
 ].join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT Private SEO Operations</title><style>'+css+'</style></head><body>'+
  '<main><header class="hero"><div class="eyebrow">Manufact · Private SEO Intelligence</div>'+
  '<h1>Search Operations Dashboard</h1><p>'+esc(h.siteId)+' · '+esc(h.publicOrigin)+'</p>'+
  '<p>Last window: '+esc(latest.start+' – '+latest.end)+'. Operator-supplied data, not verified Google or CMS evidence.</p>'+
  '<nav class="nav"><a href="#overview">Overview</a><a href="#tasks">Human tasks</a>'+
  '<a href="#pages">Page trends</a>'+(releases?'<a href="#releases">Release follow-up</a>':'')+'</nav></header>'+
  '<div class="stats">'+cards+'</div><section class="panel" id="overview"><h2>Search data coverage</h2>'+
  '<p class="muted">Only supplied GSC Page rows are counted. Missing rows are never zero.</p>'+
  '<div class="scroll"><table><thead><tr><th>Period</th><th class="num">Pages</th>'+
  '<th class="num">Clicks</th><th class="num">Impressions</th><th class="num">Gap days</th>'+
  '</tr></thead><tbody>'+periods+'</tbody></table></div></section>'+
  '<section class="panel" id="tasks"><h2>Prioritized human SEO work</h2>'+
  '<p class="muted">'+(decisions?'Source-pinned manual decisions shown.':'Human decision ledger not supplied; all tasks unreviewed.')+
  ' Nothing here saves or publishes CMS content.</p><div class="tasks">'+actions+'</div></section>'+
  '<section class="panel" id="pages"><h2>Page visibility trajectories</h2>'+
  '<p class="muted">Open a row for observed metrics; trend gaps are deliberately disconnected.</p>'+
  pageRows+'</section>'+releaseSection+
  '<footer>PRIVATE OFFLINE REPORT · Source history SHA-256 '+esc(sha)+
  ' · Do not host publicly · No Google authentication, SEO causality or release approval.</footer></main></body></html>';
 return {format:FORMAT,html,readOnly:true,summary:{siteId:h.siteId,periods:h.periods.length,
  pages:h.pages.length,tasks:h.actions.length,decisionReview:!!decisions,releaseReview:!!releases,
  bytes:Buffer.byteLength(html)}};
}
module.exports=Object.freeze({FORMAT,validate,render});
