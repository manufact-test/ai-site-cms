'use strict';
/* HTML-only CSP no-script view for human crawl/CMS tasks across original snapshots. */
const {RECHECK,markdown}=require('./crawl-cms-lifecycle.cjs');
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(report){
 if(report?.format!==RECHECK||report.readOnly!==true||report.releaseAuthorized!==false||
  report.publicHostAuthenticated!==false)throw Error('Read-only private recheck required');
 const css=[
 '*{box-sizing:border-box}body{margin:0;background:#f2f6f9;color:#203849;font:15px/1.55 system-ui,Arial,sans-serif}',
 'main{max-width:1200px;margin:auto;padding:25px 18px 90px}',
 'header{background:linear-gradient(110deg,#133b53,#1d6a75);color:white;padding:30px;border-radius:22px}',
 'h1{font-size:31px;line-height:1.2;margin:12px 0}h2{font-size:22px;margin:0 0 8px}',
 'header p{color:#d9edef}section{margin-top:20px;background:white;padding:23px;border:1px solid #dbe5eb;border-radius:18px}',
 '.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px}',
 '.stat{background:#f3f8fa;border-radius:12px;padding:15px}.stat b{display:block;font-size:30px;line-height:1.1}',
 '.stat p{margin:2px 0;color:#546d7d;font-size:13px}',
 'table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #e6edf2;padding:11px;vertical-align:top}',
 'th{text-transform:uppercase;font-size:11px;color:#5d7686}td{overflow-wrap:anywhere}',
 '.scroll{overflow:auto}code{overflow-wrap:anywhere;font-size:12px}.small{color:#597283;font-size:12px}',
 'p.note{border-left:4px solid #a66830;background:#fff5e9;padding:13px 17px}',
 '.p0{font-weight:bold;color:#973420}.p1{font-weight:bold;color:#8b6221}',
 'a{color:#166d77}@media(max-width:800px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}table{min-width:860px}}'
 ].join('');
 const table=items=>'<div class="scroll"><table><thead><tr><th>Priority</th><th>Task identity</th><th>Owner</th><th>Route</th><th>Human status</th><th>Interpretation</th></tr></thead><tbody>'+
  (items.length?items.map(a=>'<tr><td class="'+(a.priority==='P0'?'p0':'p1')+'">'+esc(a.priority)+'</td><td><code>'+
   esc(a.taskId)+'</code><p class="small">'+esc(a.category)+'</p></td><td>'+esc(a.ownerTeam)+
   '</td><td><code>'+esc(a.path||'site')+'</code></td><td>'+esc(a.humanDecision)+
   '</td><td>'+esc(a.classification)+'</td></tr>').join(''):
   '<tr><td colspan="6">No observations in this category.</td></tr>')+'</tbody></table></div>';
 const sources=[
  ['Approved Blueprint (canonical)',report.approvedBlueprintCanonicalSha256],
  ['BEFORE worklist original bytes',report.sourceBeforeRawSha256],
  ['AFTER worklist original bytes',report.sourceAfterRawSha256],
  ['Decisions original bytes',report.sourceDecisionRawSha256||'NOT PROVIDED'],
  ['BEFORE owner-selected Site v1 bytes',report.beforeOriginalSiteRawSha256],
  ['AFTER owner-selected Site v1 bytes',report.afterOriginalSiteRawSha256]
 ].map(([k,v])=>'<tr><td>'+esc(k)+'</td><td><code>'+esc(v)+'</code></td></tr>').join('');
 const stats=[
  [report.summary.persistent,'Persistent / still observed'],
  [report.summary.noLongerSeen,'No longer observed / NOT verified fixed'],
  [report.summary.newlyObserved,'New or changed observations'],
  [report.summary.completedReportedStillObserved,'Reported complete but STILL observed']
 ].map(([n,label])=>'<div class="stat"><b>'+n+'</b><p>'+esc(label)+'</p></div>').join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT — Private crawl CMS recheck</title><style>'+css+'</style></head><body><main>'+
  '<header><div>MANUFACT · PRIVATE SEO OPERATIONS</div><h1>Is the technical SEO change working?</h1>'+
  '<p>Site '+esc(report.siteId)+' · '+esc(report.base)+'</p>'+
  '<p>Two original worklists. Matching issue IDs are stable only for unchanged observed details. Never assume that a vanished task is fixed.</p></header>'+
  '<div class="stats">'+stats+'</div>'+
  '<section><h2>1 · Issues still observed</h2><p>Human reported completion never overrides new operator evidence.</p>'+
  table(report.persistent)+'</section>'+
  '<section><h2>2 · New or changed observations</h2><p>Never inherit a human approval from a previous task ID.</p>'+
  table(report.newlyObserved)+'</section>'+
  '<section><h2>3 · No longer observed</h2><p class="note">This means absent in the new operator-selected worklist. It is NOT a verified public fix, improved indexation or permission to close a task.</p>'+
  table(report.noLongerSeen)+'</section>'+
  '<section><h2>Original evidence fingerprints</h2><div class="scroll"><table><tbody>'+sources+'</tbody></table></div>'+
  '<p>Selected Site v1 original bytes changed: '+(report.summary.sourceSiteBytesChanged?'YES':'NO')+'. This comparison does not authenticate the revision.</p></section>'+
  '<section><h2>Required independent checks before any claim of success</h2><ol>'+
  report.mandatoryFollowUp.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'+
  '<p><a href="crawl-cms-recheck.md">Lead Markdown worklist</a> · <a href="crawl-cms-recheck.json">Original-source comparison JSON</a></p>'+
  '<p class="note">NO automatic task closure, real-site authentication, CMS/hosting publication, owner signoff or Google index status.</p></section>'+
  '</main></body></html>';
 return {html,markdown:markdown(report)};
}
module.exports=Object.freeze({render});
