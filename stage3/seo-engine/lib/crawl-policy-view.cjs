'use strict';
/* Private static visual report of operator-supplied robots and XML observations. */
const FORMAT='manufact-seo-crawl-policy-v1';
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(report){
 if(report?.format!==FORMAT||report.version!==1||report.readOnly!==true||
  report.publicationAuthorized!==false||report.publicHostAuthenticated!==false||
  !Array.isArray(report.pages)||!Array.isArray(report.actions)||!Array.isArray(report.agents)||
  !/^[a-f0-9]{64}$/.test(report.blueprintSha256||''))
  throw Error('Crawl-policy dashboard requires original non-authorizing review');
 const css=[
  ':root{--ink:#183344;--muted:#607989;--line:#dce7ed;--bg:#f1f6f8;--teal:#176c69}',
  '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 system-ui,Segoe UI,sans-serif}',
  'main{max-width:1180px;margin:auto;padding:18px 22px 65px}header{background:linear-gradient(120deg,#132e45,#1b6c70);color:white;border-radius:20px;padding:28px 32px}',
  'header h1{font-size:clamp(24px,4vw,38px);line-height:1.2;margin:7px 0}header p{color:#d5e7eb}.eyebrow{letter-spacing:.12em;font-size:11px;font-weight:850;color:#a4e5da}',
  '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:12px;margin:16px 0}.stat{padding:14px;background:white;border:1px solid var(--line);border-radius:12px}.stat span{font-size:12px;color:var(--muted)}.stat b{display:block;font-size:25px}',
  '.panel{background:white;border:1px solid var(--line);border-radius:16px;padding:24px;margin:17px 0}.panel h2{margin-top:0}.muted{color:var(--muted)}',
  '.danger{color:#9c322a;font-weight:800}.warn{color:#906016;font-weight:750}.ok{color:#177464;font-weight:750}',
  '.pill{display:inline-block;border-radius:9px;padding:4px 8px;background:#e9f4f1;font-size:11px;font-weight:800}.p0{background:#fff0e9;color:#a03930}.p1{background:#fff6e5;color:#8c5b16}.p2{background:#eaf4f2;color:#167568}',
  '.tablewrap{max-width:100%;overflow:auto}table{width:100%;border-collapse:collapse;min-width:700px;font-size:13px}th{background:#e9f2f5;text-align:left}th,td{border-bottom:1px solid var(--line);padding:12px;vertical-align:top;overflow-wrap:anywhere}',
  'code{font:12px/1.6 ui-monospace,Consolas,monospace;overflow-wrap:anywhere}.task{border-left:4px solid #c4a06a;padding:12px 15px;margin:9px 0;background:#fafcfb;border-radius:7px}.task.p0{border-left-color:#c65f50}.task.p2{border-left-color:#419384}',
  '.notice{background:#fff4e5;border-left:4px solid #c8944b;padding:12px;border-radius:7px}.nav{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.nav a{padding:9px 12px;color:#155b63;font-weight:800;background:#fff;border:1px solid var(--line);border-radius:9px;text-decoration:none}',
  'li{margin-bottom:7px}@media(max-width:650px){main{padding:9px}.panel,header{padding:17px}}'
 ].join('');
 const measures=[
  ['Planned pages',report.summary.plannedPages],['Canonical indexable',report.summary.canonicalIndexable],
  ['Sitemap loc rows',report.summary.sitemapRecords],
  ['P0 critical',report.summary.priorities.P0],['P1 review',report.summary.priorities.P1],
  ['P2 editorial',report.summary.priorities.P2],['Human tasks',report.summary.reviewActions],
  ['HTTP requests',report.summary.networkRequests]];
 const row=report.pages.map(p=>'<tr><td><code>'+esc(p.path)+'</code></td><td>'+
  esc(p.plannedRobots)+(p.indexableCanonical?' · canonical indexable':' · excluded/alias')+'</td><td>'+
  esc(p.sitemap)+'</td>'+p.crawlerDecisions.map(v=>'<td><strong class="'+
   (v.allowed?'ok':'danger')+'">'+(v.allowed?'Allowed':'Blocked')+'</strong>'+
   (v.matchedRule?'<div><code>'+esc(v.matchedRule.kind)+': '+esc(v.matchedRule.pattern)+
   '</code> · line '+esc(v.matchedRule.line)+'</div>':'')+
   '<div class="muted">'+esc(v.matchingGroup)+'</div></td>').join('')+'</tr>').join('');
 const actions=report.actions.map(a=>'<article class="task '+esc(a.priority.toLowerCase())+'">'+
  '<span class="pill '+esc(a.priority.toLowerCase())+'">'+esc(a.priority)+'</span>'+
  '<h3>'+esc(a.id)+'</h3><p>'+esc(a.step)+'</p>'+
  '<p class="muted"><b>Requires actual evidence:</b> '+esc(a.evidenceNeeded)+'</p></article>').join('');
 const findings=report.findings.map(a=>'<li><span class="pill '+
  esc(a.priority.toLowerCase())+'">'+esc(a.priority)+'</span> <b>'+esc(a.code)+
  '</b> · '+esc(a.pageId||a.path||'site-wide')+' · '+esc(a.message)+'</li>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; connect-src &#39;none&#39;; base-uri &#39;none&#39;; object-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT SEO — Crawl Policy</title><style>'+css+'</style></head><body><main>'+
  '<header><div class="eyebrow">MANUFACT · PRIVATE SEARCH DELIVERY INTELLIGENCE</div>'+
  '<h1>Crawl Policy Review</h1><p>'+esc(report.siteId)+' · '+esc(report.base)+'</p>'+
  '<p>Supplied robots.txt + XML sitemap checked against approved SEO Blueprint. Public host is not authenticated.</p></header>'+
  '<nav class="nav"><a href="#pages">Per-page bots</a><a href="#issues">Findings</a>'+
  '<a href="#actions">Human next steps</a><a href="#sources">Source fingerprints</a></nav>'+
  '<div class="stats">'+measures.map(([label,n])=>'<div class="stat"><span>'+esc(label)+
  '</span><b>'+esc(n)+'</b></div>').join('')+'</div>'+
  '<section id="pages" class="panel"><h2>Explicit crawler policy on approved page paths</h2>'+
  '<p class="notice">Robots verdicts below are calculated from supplied file bytes. An Allow is NOT proof of crawl or indexation; a Block is NOT yet verified on the live host.</p>'+
  '<div class="tablewrap"><table><thead><tr><th>Approved page</th><th>SEO plan</th><th>Supplied XML</th>'+
  report.agents.map(a=>'<th>'+esc(a)+'</th>').join('')+'</tr></thead><tbody>'+
  row+'</tbody></table></div></section>'+
  '<section id="issues" class="panel"><h2>Findings</h2><ul>'+
  (findings||'<li>None observed in the operator-supplied policies.</li>')+'</ul></section>'+
  '<section id="actions" class="panel"><h2>Investigations for owner / CMS lead</h2>'+
  (actions||'<p>No tasks under the supplied evidence scope.</p>')+'</section>'+
  '<section id="sources" class="panel"><h2>Private source fingerprints</h2>'+
  '<p>Compiled Blueprint: <code>'+esc(report.blueprintSha256)+'</code></p>'+
  '<p>Operator robots.txt: <code>'+esc(report.robotsSha256)+'</code></p>'+
  '<p>Operator sitemap XML: <code>'+esc(report.sitemapSha256)+'</code></p>'+
  '<p>Sitemap kind: '+esc(report.sitemapMeta.kind)+' · evidence scope: '+esc(report.scope)+'</p>'+
  '<p class="notice"><b>Release authorization: FALSE.</b> Actual served bytes, complete sitemap discovery, client signoff and any CMS changes require independent lead verification.</p>'+
  '<h3>Limitations</h3><ul>'+report.limitations.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></section>'+
  '</main></body></html>';
}
module.exports=Object.freeze({render});
