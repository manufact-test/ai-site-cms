'use strict';
/* Static offline bot access regressions view: no JS or network. */
const FORMAT='manufact-seo-crawl-policy-delta-v1';
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(report){
 if(report?.format!==FORMAT||report.readOnly!==true||report.publicationAuthorized!==false||
  !Array.isArray(report.changes)||!Array.isArray(report.tasks)||
  !/^[a-f0-9]{64}$/.test(report.blueprintSha256||''))
  throw Error('Original non-authorizing crawler policy delta required');
 const css=[
  '*{box-sizing:border-box}body{margin:0;background:#f2f6f8;color:#183647;font:14px/1.6 system-ui,Segoe UI,sans-serif}',
  'main{max-width:1120px;margin:auto;padding:20px 20px 70px}header{background:linear-gradient(125deg,#133347,#166c6d);color:white;padding:30px;border-radius:20px}',
  'header h1{font-size:clamp(25px,4vw,38px);line-height:1.2;margin:8px 0}header p{color:#d7ebed}.sub{font-size:11px;letter-spacing:.12em;font-weight:800;color:#b3eadf}',
  '.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:17px 0}',
  '.stat{background:white;border:1px solid #dbe6eb;border-radius:13px;padding:16px}.stat b{display:block;font-size:26px}.stat small{color:#607888}',
  '.panel{background:white;border:1px solid #dbe6eb;padding:23px;border-radius:16px;margin:16px 0}',
  '.alert{padding:13px;background:#fff3df;border-left:4px solid #c68f40;border-radius:8px}',
  '.event{border:1px solid #dce5e9;border-left:5px solid #96b0bb;border-radius:10px;margin:11px 0;padding:15px;overflow-wrap:anywhere}',
  '.event.p0{border-left-color:#bd5f52}.event.p1{border-left-color:#c49b4c}.event.p2{border-left-color:#399486}',
  '.pill{display:inline-block;font-size:11px;font-weight:800;border-radius:6px;padding:3px 8px;background:#e9f1f3}',
  '.pill.p0{background:#ffefe8;color:#a13e34}.pill.p1{background:#fff4df;color:#906017}.pill.p2{background:#e4f4ee;color:#117263}',
  'code{overflow-wrap:anywhere;font-size:12px}.muted{color:#657e89}li{margin:7px 0}',
  '@media(max-width:620px){main{padding:10px}header,.panel{padding:18px}}'
 ].join('');
 const stats=[['P0 blocks',report.summary.priorities.P0],['P1 review',report.summary.priorities.P1],
  ['P2 editorial',report.summary.priorities.P2],['Pages compared',report.summary.pagesCompared],
  ['New Googlebot blocks',report.summary.newGoogleBlocks],
  ['Sitemap omissions',report.summary.indexableSitemapOmissions],['Actual HTTP',report.summary.networkRequests]];
 const events=report.changes.map(c=>'<article class="event '+esc(c.priority.toLowerCase())+'">'+
  '<span class="pill '+esc(c.priority.toLowerCase())+'">'+esc(c.priority)+'</span> <b>'+esc(c.kind)+'</b>'+
  '<h3>'+esc(c.path||'Site-wide')+'</h3><p>'+esc(c.message)+'</p>'+
  (c.agent?'<p>Bot: <b>'+esc(c.agent)+'</b></p>':'')+
  (c.beforeRule||c.afterRule?'<p class="muted">Previous rule: <code>'+esc(c.beforeRule?.pattern||'no matching rule')+
   '</code> → New rule: <code>'+esc(c.afterRule?.pattern||'no matching rule')+'</code></p>':'')+
  '</article>').join('');
 const work=report.tasks.map(t=>'<li><span class="pill '+esc(t.priority.toLowerCase())+
  '">'+esc(t.priority)+'</span> '+esc(t.instruction)+'</li>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; connect-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;">'+
  '<title>MANUFACT — Crawl Policy Regression</title><style>'+css+'</style></head><body><main>'+
  '<header><div class="sub">MANUFACT SEO · PRIVATE RELEASE PRECHECK</div>'+
  '<h1>Crawl Policy Regression</h1><p>'+esc(report.siteId)+' · '+esc(report.base)+'</p>'+
  '<p>Comparing two original robots/sitemap policy sets against the same approved Blueprint — NOT comparing verified live hosts.</p></header>'+
  '<div class="summary">'+stats.map(([title,n])=>'<div class="stat"><small>'+
  esc(title)+'</small><b>'+esc(n)+'</b></div>').join('')+'</div>'+
  '<section class="panel"><h2>Access and sitemap changes</h2>'+
  '<p class="alert">An observed new block is a change in supplied policy, not proof that production is currently blocking a crawler.</p>'+
  (events||'<p>No crawler-access or sitemap inclusion changes found under the supplied policy comparison. This is NOT publication approval.</p>')+
  '</section><section class="panel"><h2>Manual verification tasks</h2><ul>'+
  (work||'<li>No new tasks for this source comparison.</li>')+
  '</ul></section><section class="panel"><h2>Source contract</h2>'+
  '<p>Blueprint SHA256 <code>'+esc(report.blueprintSha256)+'</code></p>'+
  '<p>Previous robots SHA256 <code>'+esc(report.beforeSources.robotsSha256)+'</code></p>'+
  '<p>New robots SHA256 <code>'+esc(report.afterSources.robotsSha256)+'</code></p>'+
  '<p>Previous XML SHA256 <code>'+esc(report.beforeSources.sitemapSha256)+'</code></p>'+
  '<p>New XML SHA256 <code>'+esc(report.afterSources.sitemapSha256)+'</code></p>'+
  '<p>Coverage: '+esc(report.comparisonCompleteness)+'</p>'+
  '<p class="alert">Release authorization is always FALSE. Owner signoff, actual served robots and sitemaps, live crawl policy and CMS implementation must be checked independently.</p>'+
  '<ul>'+report.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
  '</section></main></body></html>';
}
module.exports=Object.freeze({render});
