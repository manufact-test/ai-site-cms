'use strict';
/* Private offline HTML report for approved Blueprint URL index observations. */
const INDEX=require('./search-indexing.cjs');
const FORMAT='manufact-seo-indexing-private-dashboard-v1';
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function validate(report){
 if(report?.format!==INDEX.FORMAT||report.version!==1||!report.readOnly||
  !report.siteId||!Array.isArray(report.pages)||report.pages.length>80||
  !Array.isArray(report.actions)||!Array.isArray(report.unmappedUrls)||
  report.guardrails?.length<3||report.summary?.approvedPages!==report.pages.length)
  throw Error('Private indexing dashboard requires a complete indexing analysis');
}
function render(r){
 validate(r);
 const rows=r.pages.map(p=>{
  const style=p.observationStatus==='not-indexed'&&p.approvedRobots==='index'?'danger':
   p.observationStatus==='indexed'&&p.approvedRobots==='noindex'?'danger':
   p.observationStatus==='unobserved'||p.observationStatus==='unknown'?'unknown':'observed';
  return '<tr><td><b>'+esc(p.path)+'</b><small>'+esc(p.pageId)+'</small></td>'+
   '<td>'+esc(p.approvedRobots)+'</td>'+
   '<td><span class="label '+style+'">'+esc(p.observationStatus)+'</span></td>'+
   '<td>'+esc(p.observationReason||'—')+'</td>'+
   '<td class="num">'+(p.observedPerformance?Number(p.observedPerformance.impressions).toLocaleString('en-US'):'UNKNOWN')+'</td></tr>';
 }).join('');
 const tasks=r.actions.map(a=>'<article class="task"><div><span class="label '+(a.priority==='P1'?'danger':'unknown')+
  '">'+a.priority+'</span> <span class="route">'+esc(a.path||'Unmapped URL inspection')+'</span></div>'+
  '<h3>'+esc(a.type.replace(/-/g,' '))+'</h3><p>'+esc(a.observation)+'</p>'+
  '<p class="next"><b>Manual next step:</b> '+esc(a.nextStep)+'</p></article>').join('')||
  '<p class="muted">No rules triggered. Missing URLs remain UNOBSERVED.</p>';
 const css=[
 ':root{--back:#f3f7f9;--ink:#1b3043;--muted:#5b7185;--line:#dfe6ec;--blue:#106b79}',
 '*{box-sizing:border-box}body{margin:0;background:var(--back);color:var(--ink);font:15px/1.6 system-ui,-apple-system,Segoe UI,Arial,sans-serif}',
 'main{max-width:1170px;margin:auto;padding:25px 20px 70px}.hero{background:linear-gradient(125deg,#102e43,#176476);border-radius:22px;color:#fff;padding:32px}',
 '.hero h1{font-size:clamp(25px,3.5vw,39px);margin:7px 0}.hero p{color:#d1e5e8}.eyebrow{color:#99dfdb;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.11em}',
 '.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:17px}.card,.panel{background:white;border:1px solid var(--line);border-radius:15px;box-shadow:0 8px 24px #18384809}',
 '.card{padding:19px}.card small{display:block;color:var(--muted)}.card b{font-size:29px;line-height:1.4}.panel{padding:26px;margin-top:19px}h2{font-size:22px;margin:0 0 10px}',
 'table{width:100%;border-collapse:collapse;min-width:620px}.scroll{overflow:auto}th{text-align:left;background:#f8fafc;font-size:12px;color:var(--muted)}th,td{padding:12px;border-bottom:1px solid var(--line);vertical-align:top}',
 'td small{display:block;color:var(--muted);font-size:11px}.num{text-align:right;font-variant-numeric:tabular-nums}.label{font-weight:750;font-size:11px;border-radius:18px;padding:4px 9px;white-space:nowrap}',
 '.danger{color:#9c402f;background:#ffece8}.observed{color:#11775e;background:#e1f6ed}.unknown{color:#8b671f;background:#fff6d8}',
 '.tasks{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.task{border:1px solid var(--line);padding:17px;border-radius:12px;min-width:0}.task h3{font-size:16px;text-transform:capitalize}',
 '.route{font:12px ui-monospace,monospace;color:var(--muted)}.task p{margin:8px 0}.next{padding-top:10px;border-top:1px dashed var(--line)}.muted{color:var(--muted)}',
 '.warn{border-left:3px solid var(--blue);background:#ecf7f6;padding:13px;font-size:13px}li{padding:4px 0}footer{padding:24px 0;color:var(--muted);font-size:12px}',
 '@media(max-width:790px){.cards{grid-template-columns:repeat(2,1fr)}.tasks{grid-template-columns:1fr}}@media(max-width:530px){main{padding:12px}.hero,.panel{padding:20px}}',
 '@media print{body{background:#fff}.hero{background:#fff;color:#111;border:1px solid #ccc}.hero p,.eyebrow{color:#444}.card,.panel{box-shadow:none}}'
 ].join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="robots" content="noindex,nofollow,noarchive">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
 '<title>MANUFACT Private Indexing Intelligence</title><style>'+css+'</style></head><body><main>'+
 '<header class="hero"><div class="eyebrow">MANUFACT · PRIVATE SEARCH INSPECTION</div><h1>URL Indexing Intelligence</h1>'+
 '<p>Site '+esc(r.siteId)+' · '+esc(r.publicOrigin)+' · Operator observation '+esc(r.observedAt)+'</p>'+
 '<p>Source: '+esc(r.exportScope)+' (not authenticated Google Search Console or live URL Inspection)</p></header>'+
 '<div class="cards">'+[
  ['Approved URLs',r.summary.approvedPages],
  ['Reported indexed',r.summary.reportedIndexed],
  ['Reported not indexed',r.summary.reportedNotIndexed],
  ['UNKNOWN / unobserved',r.summary.reportedUnknown+r.summary.notObserved]
 ].map(([k,v])=>'<div class="card"><small>'+esc(k)+'</small><b>'+esc(v)+'</b></div>').join('')+'</div>'+
 '<section class="panel"><h2>Page-level evidence versus approved robots</h2>'+
 '<p class="muted">Counts describe only the URLs explicitly supplied. Do not infer property-wide indexation percentages.</p>'+
 '<div class="scroll"><table><thead><tr><th>Approved route</th><th>Blueprint robots</th><th>Reported status</th><th>Reason</th><th class="num">Observed search impressions</th></tr></thead><tbody>'+rows+
 '</tbody></table></div></section>'+
 '<section class="panel"><h2>Human-only URL inspection queue</h2><div class="tasks">'+tasks+'</div></section>'+
 '<section class="panel"><h2>Evidence boundaries</h2><p class="warn">Missing rows are not counted as excluded. None of these observations triggers CMS edits, indexing requests, publication or approval.</p><ul>'+
 r.guardrails.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul></section>'+
 '<footer>Private local HTML · Raw indexing and performance evidence kept outside Git · No external assets or API calls.</footer></main></body></html>';
 return {format:FORMAT,html,readOnly:true,summary:{siteId:r.siteId,pages:r.summary.approvedPages,
  actions:r.summary.actions,observed:r.summary.observedApprovedPages,releaseAuthorized:false}};
}
module.exports=Object.freeze({FORMAT,validate,render});
