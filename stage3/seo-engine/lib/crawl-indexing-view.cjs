'use strict';
/* Private static co-observation dashboard: never claims actual Google status or causality. */
const FORMAT='manufact-seo-crawl-indexing-correlation-v1';
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(report){
 if(report?.format!==FORMAT||report.readOnly!==true||
  report.publicationAuthorized!==false||report.causalExplanationEstablished!==false||
  !Array.isArray(report.pages)||!Array.isArray(report.actions)||
  !/^[0-9a-f]{64}$/.test(report.originalIndexingReportSha256||''))
  throw Error('Only exact non-authorizing combined crawl/indexing review can produce private HTML');
 const css=[
  '*{box-sizing:border-box}body{margin:0;background:#f2f6f8;color:#18364a;font:14px/1.55 system-ui,Arial,sans-serif}',
  'main{max-width:1130px;margin:auto;padding:18px 20px 70px}header{background:linear-gradient(130deg,#123349,#12686c);color:white;border-radius:21px;padding:30px}',
  'header h1{font-size:clamp(26px,4vw,38px);margin:7px 0}header p{color:#d7ebeb}.kicker{color:#abebdb;font-size:11px;font-weight:800;letter-spacing:.14em}',
  '.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:17px 0}.metric{padding:14px;border:1px solid #dce5ea;background:white;border-radius:13px}.metric small{color:#627e8d}.metric b{font-size:26px;display:block}',
  '.panel{background:white;border:1px solid #dce6ea;border-radius:17px;margin:16px 0;padding:24px}',
  '.notice{background:#fff2e2;border-left:4px solid #c5924e;padding:12px 15px;border-radius:8px}.muted{color:#657d8a}',
  '.tablewrap{max-width:100%;overflow-x:auto}table{min-width:760px;border-collapse:collapse;width:100%;font-size:13px}th,td{padding:12px;border-bottom:1px solid #dce6e9;vertical-align:top;text-align:left;overflow-wrap:anywhere}th{background:#eaf2f4}',
  '.tag{border-radius:7px;padding:4px 8px;background:#edf1f4;font-size:11px;font-weight:800}.tag.p1{background:#fff1e5;color:#995e16}.tag.p2{background:#e9f4ef;color:#1a7460}',
  '.action{padding:13px;border:1px solid #dee8eb;border-left:4px solid #bb9353;border-radius:10px;margin:12px 0}.action h3{margin:7px 0}',
  'code{overflow-wrap:anywhere;font-size:12px}@media(max-width:640px){main{padding:9px}header,.panel{padding:17px}}'
 ].join('');
 const cells=[
  ['Approved pages',report.summary.approvedPages],
  ['P1 investigations',report.summary.needsUrgentInspection],
  ['P2 investigations',report.summary.needsEditorialInspection],
  ['Reported not indexed',report.summary.reportedNotIndexed],
  ['Googlebot blocked in supplied policy',report.summary.policyGooglebotBlocked],
  ['Unobserved GSC rows',report.summary.noObservedIndexingRow],
  ['Live requests',report.summary.networkRequests]
 ];
 const table=report.pages.map(p=>'<tr><td><code>'+esc(p.path)+'</code></td><td>'+
  esc(p.plannedRobots)+'</td><td>'+esc(p.googlebotAllowedInSuppliedRobots?'Allow':'Block')+
  (p.googlebotMatchedRule?'<p class="muted"><code>'+esc(p.googlebotMatchedRule.pattern)+'</code></p>':'')+
  '</td><td>'+esc(p.gscReportedStatus)+'</td><td>'+esc(p.suppliedSitemapStatus)+'</td>'+
  '<td>'+esc(p.reviewStatus)+'</td></tr>').join('');
 const tasks=report.actions.map(a=>'<article class="action"><span class="tag '+esc(a.priority.toLowerCase())+'">'+
  esc(a.priority)+'</span> <strong>'+esc(a.path)+'</strong><h3>'+esc(a.reason)+'</h3>'+
  '<p>'+esc(a.manualNext)+'</p><p class="muted">Reported operator evidence only — no authenticated cause or release decision.</p></article>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; connect-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT — Crawl and Indexing Co-observations</title><style>'+css+'</style></head><body><main>'+
  '<header><div class="kicker">MANUFACT SEO · PRIVATE OPERATOR INVESTIGATION</div><h1>Search Indexing + Crawler Policy</h1>'+
  '<p>'+esc(report.siteId)+' · '+esc(report.base)+'</p>'+
  '<p>Source-bound, read-only comparison of declared Search Console observations and supplied Googlebot/robots policy.</p></header>'+
  '<div class="metrics">'+cells.map(([k,v])=>'<div class="metric"><small>'+esc(k)+'</small><b>'+esc(v)+'</b></div>').join('')+'</div>'+
  '<section class="panel"><p class="notice">Google Search Console data may be historical, sampled, filtered or stale. A supplied robots block does not explain a GSC status without actual URL Inspection and live host evidence.</p>'+
  '<h2>Combined page inventory</h2><div class="tablewrap"><table><thead><tr>'+
  ['Page','Approved robots','Supplied Googlebot','Reported GSC','Supplied XML','Next investigation'].map(s=>'<th>'+s+'</th>').join('')+
  '</tr></thead><tbody>'+table+'</tbody></table></div></section>'+
  '<section class="panel"><h2>Manual investigations</h2>'+ (tasks||'<p>No combined issue in operator-supplied evidence. Current Google indexing is not verified.</p>')+
  '</section><section class="panel"><h2>Source evidence contract</h2>'+
  '<p>Original Blueprint byte SHA256 <code>'+esc(report.originalBlueprintSourceSha256)+'</code></p>'+
  '<p>Original GSC indexing report byte SHA256 <code>'+esc(report.originalIndexingReportSha256)+'</code></p>'+
  '<p>Supplied robots text SHA256 <code>'+esc(report.suppliedRobotsSha256)+'</code></p>'+
  '<p>Supplied sitemap XML SHA256 <code>'+esc(report.suppliedSitemapSha256)+'</code></p>'+
  '<p>Reported GSC observation date: '+esc(report.declaredIndexingObservedAt)+'</p>'+
  '<p class="notice"><b>Publication authorization: FALSE.</b> Owner approval, actual current public HTTP, and authenticated client/Google evidence are separate requirements.</p>'+
  '<h3>Limitations</h3><ul>'+report.limitations.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul></section>'+
  '</main></body></html>';
}
module.exports=Object.freeze({render});
