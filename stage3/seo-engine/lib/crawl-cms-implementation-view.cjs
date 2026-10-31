'use strict';
/* Static CSP-protected existing-CMS implementation view for the private operator.
 * Absolutely no scripts, forms, external CSS, save or publish links.
 */
const {FORMAT,markdown}=require('./crawl-cms-implementation.cjs');
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(report){
 if(report?.format!==FORMAT||report.readOnly!==true||report.releaseAuthorized!==false)
  throw Error('Original nonauthorizing crawl CMS worklist required');
 const css=[
 '*{box-sizing:border-box}body{margin:0;background:#f2f7fa;color:#203748;font:15px/1.6 system-ui,Arial,sans-serif}',
 'main{max-width:1180px;margin:auto;padding:23px 20px 85px}header{background:linear-gradient(125deg,#17334d,#1c6872);border-radius:21px;color:white;padding:30px}',
 'header p{color:#d5eaf1}h1{line-height:1.2;margin:9px 0}section{background:white;padding:22px;border:1px solid #dce6ed;border-radius:17px;margin-top:18px}',
 'h2{margin:0 0 12px;font-size:23px}p{margin:9px 0}table{width:100%;border-collapse:collapse}',
 'th,td{padding:11px 12px;border-bottom:1px solid #e4eaf0;text-align:left;vertical-align:top}',
 'th{font-size:12px;color:#5e7584;text-transform:uppercase}code{overflow-wrap:anywhere}.scroll{overflow:auto}',
 '.badge{display:inline-block;background:#fff1d8;color:#7a5019;font-size:12px;border-radius:8px;padding:5px 9px;font-weight:750}',
 '.notice{border-left:5px solid #ba5f30;background:#fff5ed;padding:12px 15px}',
 '.meta{font-size:12px;color:#5e7482}.key{font-weight:700;color:#115d6b}.tags{display:flex;gap:7px;flex-wrap:wrap}',
 '.tag{font-size:11px;padding:3px 7px;border:1px solid #dce6ed;border-radius:7px;background:#f0f6f9}',
 'a{color:#177c7b}@media(max-width:740px){main{padding:12px}header,section{padding:16px}table{min-width:750px}}'
 ].join('');
 const tasks=report.actions.map((x,i)=>'<tr><td><b>'+esc(x.priority)+'</b></td><td>'+esc(x.category)+'<p class="meta">'+esc(x.ownerTeam)+'</p><code>'+esc(x.taskId)+'</code></td><td><code>'+esc(x.path||'site')+
  '</code><p class="meta">'+esc(x.pageId||'—')+'</p></td><td>'+esc(x.detail)+
  '<p class="meta">Evidence: '+esc(x.source)+'</p></td><td>'+esc(x.leadAction)+
  '<p class="meta">Required verification:</p><ul>'+x.evidenceRequired.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul></td></tr>').join('');
 const fields=report.pages.map(p=>{
  const site=p.currentSite;
  return '<tr><td><code>'+esc(p.pageId)+'</code></td><td><code>'+esc(p.path)+'</code></td>'+
   '<td><code>'+esc(site?.path||'MISSING')+'</code></td><td>'+esc(p.editorState)+
   '<div class="tags">'+p.driftFields.map(x=>'<span class="tag">'+esc(x)+'</span>').join('')+'</div></td><td>'+
   '<div class="meta">Approved robots: '+esc(p.approvedSeo.robots)+'</div>'+
   '<div class="meta">Supplied Site v1 robots: '+esc(site?.robots??'unknown')+'</div>'+
   '<div class="meta">Approved canonical: '+esc(p.canonicalPath)+'</div>'+
   '<div class="meta">Supplied Site v1 canonical: '+esc(site?.canonicalPath??'unknown')+'</div></td></tr>';
 }).join('');
 const fingerprints=[
  ['Approved Blueprint (canonical)',report.approvedBlueprintCanonicalSha256],
  ['Approved Blueprint (original bytes)',report.originalBlueprintRawSha256],
  ['Operator Site v1 (original bytes)',report.originalSiteRawSha256],
  ['Operator Site v1 (semantic fingerprint)',report.selectedSiteFingerprint],
  ['Operator original robots.txt',report.sourcePolicyRobotsSha256],
  ['Operator original sitemap.xml',report.sourcePolicySitemapSha256]
 ].map(([a,b])=>'<tr><td>'+esc(a)+'</td><td><code>'+esc(b)+'</code></td></tr>').join('');
 const body='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT — private crawl/CMS lead actions</title><style>'+css+'</style></head><body><main>'+
  '<header><div>MANUFACT · PRIVATE SEO OPERATOR WORKSPACE</div><h1>From crawl findings to CMS/publisher actions</h1>'+
  '<p>Site '+esc(report.siteId)+' · '+esc(report.base)+'</p>'+
  '<p><span class="badge">P0 '+report.summary.priorities.P0+' · P1 '+report.summary.priorities.P1+' · P2 '+report.summary.priorities.P2+'</span></p>'+
  '<p>This is an implementation planning view of operator-supplied files, NOT an authenticated current CMS or Google status.</p></header>'+
  '<section><h2>Prioritized owner / CMS lead work</h2>'+
  '<p><a href="crawl-cms-worklist.md">Open private Markdown worklist</a> · <a href="crawl-cms-worklist.json">Read-only JSON work packets</a> · <a href="crawl-cms-decisions.html">Fill offline human Decision Desk</a> · <a href="crawl-cms-decisions-TEMPLATE.json">Download fresh decision template</a></p>'+
  '<div class="scroll"><table><thead><tr><th>Priority</th><th>System</th><th>Approved route</th><th>Observed issue</th><th>Next human action</th></tr></thead><tbody>'+
  (tasks||'<tr><td colspan="5">No findings triggered. This is not an approval to publish.</td></tr>')+
  '</tbody></table></div></section>'+
  '<section><h2>Approved Blueprint vs supplied Site v1</h2>'+
  '<p>Missing, extra or moved pages must be resolved before treating any draft sitemap as complete. A page SEO robots field cannot modify robots.txt.</p>'+
  '<div class="scroll"><table><thead><tr><th>Stable page ID</th><th>Approved route</th><th>Selected Site v1</th><th>Drift</th><th>SEO / canonical</th></tr></thead><tbody>'+fields+'</tbody></table></div>'+
  '<p>Extra pages: '+report.summary.unapprovedExtraPages+' · Missing/drifted pages: '+
  report.summary.driftPages+' · Redirect collisions: '+report.summary.redirectCollisions+'.</p></section>'+
  '<section><h2>Original source fingerprint ledger</h2><div class="scroll"><table><tbody>'+fingerprints+'</tbody></table></div></section>'+
  '<section><h2>Required before any implementation</h2>'+
  '<ol><li>Lead verifies real current published Site v1 and source revision against this operator-supplied snapshot.</li>'+
  '<li>Independently retrieve actual HTTPS robots, sitemap, page headers, canonical and redirects.</li>'+
  '<li>Separate CMS page SEO metadata work from hosting/publisher robots and sitemap work; retain explicit owner privacy policy.</li>'+
  '<li>After separate owner approval, use lead-controlled CMS/publisher workflow and rollback. Verify real served bytes after publication.</li></ol>'+
  '<p class="notice"><b>No automatic action or client approval.</b> Candidate files remain private and unapproved. Neither this view nor a green report grants deployment.</p></section>'+
  '</main></body></html>';
 return {html:body,markdown:markdown(report)};
}
module.exports=Object.freeze({render});
