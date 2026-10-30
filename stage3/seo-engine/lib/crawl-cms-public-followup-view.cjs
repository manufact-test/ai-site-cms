'use strict';
/* Private noninteractive HTML for operator-supplied public HTTP issue follow-up.
 * No scripts, external assets, network requests or publication controls.
 */
const {FORMAT,markdown}=require('./crawl-cms-public-followup.cjs');
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(report){
 if(report?.format!==FORMAT||report.readOnly!==true||
  report.releaseAuthorized!==false||report.publicHostAuthenticated!==false)
  throw Error('Crawl public follow-up needs private nonauthorizing observation report');
 const css=[
 '*{box-sizing:border-box}body{margin:0;background:#f1f6f9;color:#1c394c;font:15px/1.58 system-ui,Arial,sans-serif}',
 'main{max-width:1180px;margin:auto;padding:22px 20px 90px}',
 'header{background:linear-gradient(115deg,#103650,#20676e);border-radius:21px;padding:34px;color:white}',
 'header p{color:#d4e9eb}h1{font-size:clamp(26px,4vw,38px);margin:9px 0;line-height:1.17}',
 'section{background:white;border:1px solid #dce8ed;padding:21px;border-radius:16px;margin-top:18px}',
 'h2{margin:0 0 8px;font-size:22px}p{margin:8px 0}.muted{color:#587386;font-size:13px}',
 '.statline{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}',
 '.stat{border:1px solid #e0e9ee;border-radius:12px;padding:14px;background:#f7fafb}',
 '.stat b{display:block;font-size:30px}.stat span{font-size:12px;color:#536e7d}',
 'table{border-collapse:collapse;width:100%}th,td{padding:12px 9px;border-bottom:1px solid #e5edf0;text-align:left;vertical-align:top;overflow-wrap:anywhere}',
 'th{font-size:11px;color:#557280;text-transform:uppercase}.scroll{overflow:auto}',
 '.flag{display:inline-block;font-weight:700;padding:4px 7px;border-radius:7px;font-size:11px;background:#f6f2d8;color:#765713}',
 '.flag.error{color:#922d24;background:#fcedeb}.flag.maybe{color:#235d54;background:#e6f5ef}',
 'code{font-size:12px;overflow-wrap:anywhere}.notice{padding:13px;border-left:4px solid #ae5b31;background:#fff3e9}',
 'a{color:#146d74}@media(max-width:740px){main{padding:10px}header,section{padding:17px}.statline{grid-template-columns:repeat(2,minmax(0,1fr))}table{min-width:900px}}'
 ].join('');
 const classes={'OBSERVED-CONFLICT':'error','OBSERVED-ALIGNED-NOT-VERIFIED':'maybe','INSUFFICIENT-EVIDENCE':''};
 const rows=report.tasks.map(a=>'<tr><td><strong>'+esc(a.priority)+'</strong></td><td><code>'+
  esc(a.taskId)+'</code><p class="muted">'+esc(a.category)+'</p></td><td>'+esc(a.ownerTeam)+
  '</td><td><code>'+esc(a.path||'site')+'</code></td><td><span class="flag '+classes[a.status]+'">'+
  esc(a.status)+'</span></td><td>'+esc(a.reason)+'</td></tr>').join('');
 const independent=report.independentDeliveryBlockers.map(a=>'<tr><td>'+esc(a.code)+'</td><td>'+
  esc(a.path||'site')+'</td><td>'+esc(a.message)+'</td></tr>').join('');
 const sources=[
  ['Original approved Blueprint bytes',report.originalBlueprintRawSha256],
  ['Original current Site v1 bytes',report.originalSiteRawSha256],
  ['Current crawl CMS worklist bytes',report.sourceWorklistRawSha256],
  ['Actual supplied HTTP capture bytes',report.suppliedPublicCaptureRawSha256],
  ['Optional current lifecycle recheck bytes',report.sourceLatestRecheckRawSha256||'Not supplied'],
  ['Supplied HTTP robots body SHA256',report.policy.publicRobotsSha256||'Not supplied'],
  ['Supplied HTTP sitemap body SHA256',report.policy.publicSitemapSha256||'Not supplied']
 ].map(([k,v])=>'<tr><td>'+esc(k)+'</td><td><code>'+esc(v)+'</code></td></tr>').join('');
 const stats=[
  [report.summary.conflict,'Still conflicting'],
  [report.summary.unknown,'Evidence missing'],
  [report.summary.alignedNotVerified,'Aligned, NOT verified'],
  [report.summary.independentDeliveryBlockers,'Independent HTTP errors']
 ].map(([n,k])=>'<div class="stat"><b>'+n+'</b><span>'+k+'</span></div>').join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT — private technical SEO public follow-up</title><style>'+css+'</style></head><body><main>'+
  '<header><div>MANUFACT · PRIVATE SEO OPERATOR WORKSPACE</div><h1>Did the published SEO change reach the public site?</h1>'+
  '<p>Source-bound observations · '+esc(report.siteId)+' · '+esc(report.base)+'</p>'+
  '<p>Captured at '+esc(report.capturedAt||'unknown')+'. This is an operator-supplied transcript, not authenticated deployed CMS source or Google indexing.</p></header>'+
  '<div class="statline">'+stats+'</div>'+
  '<section><h2>Prioritized technical SEO tasks</h2><p>Each task is examined independently against supplied HTML, HTTP headers, crawler rules and sitemap. A green observation is NOT task closure.</p>'+
  '<div class="scroll"><table><thead><tr><th>Priority</th><th>Original task</th><th>Workstream</th><th>Approved path</th><th>Observation only</th><th>Why</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="6">No tasks were provided. This does NOT mean verified SEO health.</td></tr>')+
  '</tbody></table></div></section>'+
  '<section><h2>Independent deployment-capture errors</h2><p>Not limited to previously created SEO tasks. Confirm these before any launch/SEO claim.</p>'+
  '<div class="scroll"><table><thead><tr><th>Code</th><th>Route</th><th>Observed issue</th></tr></thead><tbody>'+
  (independent||'<tr><td colspan="3">No error-severity findings in the supplied transcript. The real host is still unverified.</td></tr>')+
  '</tbody></table></div></section>'+
  '<section><h2>Original evidence fingerprints</h2><div class="scroll"><table><tbody>'+sources+'</tbody></table></div>'+
  '<p class="muted">Public robots policy analyzed: '+(report.policy.canAnalyzeBoth?'YES':'NO')+
  '. Complete direct sitemap comparable: '+(report.policy.sitemapCoverageComparable?'YES':'NO')+
  '. Actual published revision authenticated: NO.</p></section>'+
  '<section><h2>Lead review required before any task can be closed</h2><p class="notice">No automatic task closure, owner approval, CMS Save/Publish, release GO or verified Google indexation.</p>'+
  '<ol><li>Authenticate exact deployed owner CMS sourceRevision, current public host and capture timestamp.</li>'+
  '<li>Recheck actual served robots/sitemap status, XML completeness, HTML canonical, meta robots and X-Robots-Tag.</li>'+
  '<li>For any metadata or redirect change, inspect saved CMS owner overrides and current release/rollback.</li>'+
  '<li>Perform real Search Console URL Inspection for suspected indexation, separately from these offline observations.</li></ol>'+
  '<p><a href="crawl-public-followup.md">Private lead Markdown</a> · <a href="crawl-public-followup.json">Read-only original-evidence JSON</a></p>'+
  '</section></main></body></html>';
 return {html,markdown:markdown(report)};
}
module.exports=Object.freeze({render});
