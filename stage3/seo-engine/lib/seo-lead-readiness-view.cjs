'use strict';
/* Offline, no-script, private lead gate review; no client data, forms or API calls. */
const {FORMAT,markdown}=require('./seo-lead-readiness.cjs');
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(report){
 if(report?.format!==FORMAT||report.readOnly!==true||
  report.releaseAuthorized!==false||report.publicHostAuthenticated!==false)
  throw Error('Read-only private first-client lead readiness required');
 const css=[
 '*{box-sizing:border-box}body{margin:0;background:#f0f5f8;color:#19374b;font:14px/1.62 system-ui,Arial,sans-serif}',
 'main{max-width:1180px;margin:0 auto;padding:28px 20px 100px}',
 'header{background:linear-gradient(117deg,#142f4a,#11666a);padding:34px;border-radius:21px;color:#fff}',
 'header h1{font-size:clamp(27px,4vw,41px);line-height:1.14;margin:9px 0 12px}',
 'header p{color:#d8eeea}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin:20px 0}',
 '.stat{background:#fff;border:1px solid #dbe7ed;padding:17px;border-radius:13px}',
 '.stat b{font-size:32px;display:block;line-height:1.1}.stat span{font-size:12px;color:#5c7786}',
 'section{margin-top:18px;padding:24px;background:#fff;border:1px solid #dbe7ed;border-radius:17px}',
 'h2{font-size:23px;margin:0 0 12px}table{border-collapse:collapse;width:100%}',
 '.scroll{overflow:auto}th,td{border-bottom:1px solid #e4edf0;text-align:left;vertical-align:top;padding:12px 10px;overflow-wrap:anywhere}',
 'th{text-transform:uppercase;font-size:11px;color:#5a7380}',
 '.status{font-size:11px;display:inline-block;padding:4px 7px;border-radius:8px;font-weight:800;background:#e7eff4}',
 '.status.blocked{color:#963b2d;background:#fff0e9}',
 '.status.missing{color:#866022;background:#fff6d9}',
 '.status.review{color:#24615f;background:#e8f5f1}',
 '.status.deferred{color:#5a667e;background:#f0f1f6}',
 '.tiny{font-size:12px;color:#617b89}.notice{background:#fff5e8;border-left:4px solid #b16832;padding:14px 17px}',
 'code{overflow-wrap:anywhere;font-size:12px}li{margin:7px 0}a{color:#126d74}',
 '@media(max-width:900px){.stats{grid-template-columns:repeat(2,1fr)}table{min-width:1050px}main{padding:12px}section,header{padding:19px}}',
 '@media print{body{background:white}header{color:black;background:white;border:1px solid #ddd}header p{color:#333}}'
 ].join('');
 const statusClass=s=>s==='BLOCKED'?'blocked':s==='NEEDS-EVIDENCE'?'missing':
  s==='POST-LAUNCH-DEFERRED'?'deferred':'review';
 const table=(items)=>'<div class="scroll"><table><thead><tr><th>Priority / phase</th><th>Status</th><th>Lead-owned workstream</th><th>Problem / source conclusion</th><th>Next evidence or operator action</th></tr></thead><tbody>'+
  items.map(g=>'<tr><td><b>'+esc(g.priority)+'</b><p class="tiny">'+
   esc(g.phase)+'</p><code>'+esc(g.id)+'</code></td><td><span class="status '+
   statusClass(g.status)+'">'+esc(g.status)+'</span></td><td>'+esc(g.ownerTeam)+
   '</td><td><b>'+esc(g.title)+'</b><p>'+esc(g.why)+'</p>'+
   (g.sourceSha256?'<p class="tiny">Source SHA256: <code>'+esc(g.sourceSha256)+'</code></p>':
    '<p class="tiny">No original source SHA256 supplied for this gate.</p>')+
   '</td><td><ol>'+g.nextEvidence.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+
   (g.dependencies.length?'<p class="tiny">Depends on: '+g.dependencies.map(esc).join(', ')+'</p>':'')+
   '</td></tr>').join('')+'</tbody></table></div>';
 const originals=Object.entries(report.sourceRawSha256).map(([key,hash])=>
  '<tr><td>'+esc(key)+'</td><td><code>'+esc(hash||'NOT SUPPLIED')+'</code></td></tr>').join('');
 const stats=[
  [report.summary.preLaunchBlocked,'Prelaunch blocked'],
  [report.summary.preLaunchMissing,'Missing original evidence'],
  [report.summary.preLaunchLeadReview,'Lead manual review'],
  [report.summary.postLaunchDeferred,'Postlaunch observation deferred']
 ].map(([value,label])=>'<div class="stat"><b>'+value+'</b><span>'+label+'</span></div>').join('');
 const pre=report.gates.filter(x=>x.phase==='PRE_LAUNCH'),
  after=report.gates.filter(x=>x.phase==='POST_LAUNCH');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT — First Client SEO Lead Readiness</title><style>'+css+'</style></head><body><main>'+
  '<header><div>MANUFACT · PRIVATE · SEO LEAD HANDOFF</div>'+
  '<h1>First client: what must the lead verify next?</h1>'+
  '<p>Site '+esc(report.siteId)+' · '+esc(report.summary.urgency)+'</p>'+
  '<p>This is NOT permission to launch, merge, publish or claim Google indexing. The lead is the sole integrator.</p></header>'+
  '<div class="stats">'+stats+'</div>'+
  '<section><h2>1 · Before the first release — original evidence and owner action</h2>'+
  '<p>Every missing record remains a missing requirement. Zero reported blockers is not a verified pass.</p>'+
  table(pre)+'</section>'+
  '<section><h2>2 · After release — Search Console and repeated evidence</h2>'+
  '<p>No source Google account authenticated. Post-launch future evidence is not a prelaunch success gate.</p>'+
  table(after)+'</section>'+
  '<section><h2>Lead handling instructions</h2><ol>'+
  report.mandatoryLeadInstructions.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+
  '<p class="notice">Every issue and status is operator-derived. Only separate real source and owner authentication can authorize implementation or final acceptance.</p></section>'+
  '<section><h2>Original source fingerprints</h2><div class="scroll"><table><tbody>'+originals+'</tbody></table></div>'+
  '<p><a href="lead-readiness.md">Lead handoff Markdown</a> · <a href="lead-readiness.json">Private issue gate JSON</a></p></section>'+
  '</main></body></html>';
 return {html,markdown:markdown(report)};
}
module.exports=Object.freeze({render});
