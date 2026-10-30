'use strict';
/* Static, escaped, no-script owner/lead review for proposed SEO search files. */
const FORMAT='manufact-seo-crawl-repair-plan-v1';
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(plan){
 if(plan?.format!==FORMAT||plan.releaseAuthorized!==false||plan.publicHostAuthenticated!==false||
  !Array.isArray(plan.generatedUrls)||!Array.isArray(plan.appliedSuggestions)||
  !Array.isArray(plan.manualHolds)||plan.artifactsDraftOnly!==true)
  throw Error('Crawl repair review requires original private non-deployable candidate');
 const css=[
  '*{box-sizing:border-box}:root{--ink:#1b3748;--bg:#f1f6f7;--line:#dce7ea;--teal:#176967}',
  'body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 system-ui,Arial,sans-serif}',
  'main{max-width:1100px;margin:auto;padding:18px 22px 70px}',
  'header{padding:30px;border-radius:18px;color:white;background:linear-gradient(115deg,#102f45,#186c6d)}',
  'header h1{margin:6px 0;font-size:clamp(26px,4vw,38px)}header p{color:#d5edeb}',
  '.eyebrow{color:#bcebdd;font-size:11px;letter-spacing:.13em;font-weight:850}',
  '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:10px;margin:15px 0}',
  '.metric{background:white;padding:15px;border-radius:11px;border:1px solid var(--line)}',
  '.metric small{display:block;color:#607989}.metric b{font-size:25px}',
  'section{background:white;border:1px solid var(--line);border-radius:13px;padding:23px;margin:15px 0}',
  'h2{margin-top:0}.warning{padding:13px 15px;background:#fff5e8;border-left:4px solid #be9252;border-radius:8px}',
  'li{margin:8px 0;overflow-wrap:anywhere}code{font-size:12px;overflow-wrap:anywhere}',
  '.task{border:1px solid var(--line);border-left:4px solid #278b7f;border-radius:9px;padding:13px;margin:10px 0}',
  '.hold{border-left-color:#ba6050}.muted{color:#607a87}.tag{background:#eaf5ef;border-radius:7px;padding:3px 8px;font-weight:800;font-size:11px}',
  '@media(max-width:650px){main{padding:9px}header,section{padding:17px}}'
 ].join('');
 const stats=[['Approved pages',plan.summary.pages],['Sitemap URLs',plan.summary.sitemapUrls],
  ['Exact rule proposals',plan.summary.newAllowRules],['Unblocked in candidate',plan.summary.successfullyUnblocked],
  ['Manual holds',plan.summary.needsManualReview],['New denied approved URLs',plan.summary.newDisallowedApprovedPages]];
 const holds=plan.manualHolds.map(x=>'<article class="task hold"><strong>'+esc(x.reason)+'</strong>'+
  '<p>'+esc(x.pageId||'site-wide')+' / '+esc(x.agent||'any crawler')+'</p><p>'+
  esc(x.detail||'Requires lead/owner approval and actual public policy inspection')+'</p></article>').join('');
 const changes=plan.appliedSuggestions.map(x=>'<article class="task"><span class="tag">'+
  esc(x.status)+'</span><strong> '+esc(x.pageId)+' · '+esc(x.agent)+'</strong>'+
  '<p><code>'+esc(x.rule||'Existing allowed rule remains unchanged')+'</code></p></article>').join('');
 const urls=plan.generatedUrls.map(x=>'<li><code>'+esc(x)+'</code></li>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; connect-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT SEO — Private Repair Candidate</title><style>'+css+'</style></head><body><main>'+
  '<header><div class="eyebrow">MANUFACT · LEAD REVIEW ONLY</div><h1>Search Delivery Repair Candidate</h1>'+
  '<p>Site '+esc(plan.siteId)+' · '+esc(plan.base)+'</p>'+
  '<p>Proposed files are NOT deployed, owner-approved or verified against live CDN. Do not upload directly.</p></header>'+
  '<div class="stats">'+stats.map(([k,v])=>'<div class="metric"><small>'+esc(k)+'</small><b>'+esc(v)+'</b></div>').join('')+'</div>'+
  '<section><h2>Candidate boundaries</h2><p class="warning"><b>RELEASE AUTHORIZATION: FALSE.</b>'+
  ' The current Site v1 snapshot was compared by route/SEO identity only; actual published CMS identity is unauthenticated.'+
  ' Existing robots restrictions are preserved, except explicit exact-path allowances in isolated agent groups.</p>'+
  '<p>Existing Sitemap pointer: '+esc(plan.pointerStatus)+
  ' · prior sitemap coverage: '+esc(plan.priorSitemapScope)+
  ' · new sitemap generated from approved canonical indexable URLs.</p></section>'+
  '<section><h2>Proposed sitemap.xml</h2><ol>'+urls+'</ol>'+
  '<p class="muted">No lastmod has been invented; real destination HTTP 200 and canonical must be confirmed separately.</p></section>'+
  '<section><h2>Explicit proposed Allow rules</h2>'+
  (changes||'<p>No new explicit robot-group allowances requested or possible.</p>')+'</section>'+
  '<section><h2>Manual holds and blast-radius review</h2>'+
  (holds||'<p>No ambiguous group detected. This is still NOT permission to publish.</p>')+'</section>'+
  '<section><h2>Lead handoff</h2><p>Check <code>PROPOSED-robots.txt</code> and <code>PROPOSED-sitemap.xml</code> against the original sources. Use the existing compare-crawl-policy CLI and strict static/production verification after owner-authorized CMS/publisher changes. Do not directly overwrite the official CMS-generated artifacts.</p>'+
  '<p>Before comparison: '+esc(plan.comparison.beforeSources.robotsSha256)+'</p>'+
  '<p>After comparison: '+esc(plan.comparison.afterSources.robotsSha256)+'</p>'+
  '<h3>Limitations</h3><ul>'+plan.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
  '</section></main></body></html>';
}
module.exports=Object.freeze({render});
