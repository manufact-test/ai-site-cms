'use strict';
/* Self-contained private human review screen. Static HTML; zero network/scripts.
 * Only source-authenticated change reports constructed from original Blueprint v1.
 */
const FORMAT='manufact-seo-blueprint-change-review-v1';
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const plural=(n,one,other)=>n===1?one:other;
function render(report){
 if(report?.format!==FORMAT||report.version!==1||report.readOnly!==true||
  report.publicationAuthorized!==false||report.clientSignoffAuthenticated!==false||
  !Array.isArray(report.changes)||!Array.isArray(report.actions)||!Array.isArray(report.probePlan)||
  !Number.isSafeInteger(report.summary?.operatorActions)||
  report.summary.operatorActions!==report.actions.length||
  !['P0','P1','P2'].every(k=>Number.isSafeInteger(report.summary.priorityActions?.[k])&&
   report.summary.priorityActions[k]>=0&&
   report.actions.filter(x=>x.priority===k).length===report.summary.priorityActions[k])||
  !/^[a-f0-9]{64}$/.test(report.beforeBlueprintSha256||'')||
  !/^[a-f0-9]{64}$/.test(report.afterBlueprintSha256||''))
  throw Error('Private Blueprint change screen needs original non-authorizing coherent diff');
 const status=report.summary.priorityActions.P0?'STOP — P0 REVIEW REQUIRED':
  report.summary.priorityActions.P1?'HUMAN P1 REVIEW REQUIRED':
  report.summary.priorityActions.P2?'EDITORIAL P2 REVIEW REQUIRED':
  'NO OBSERVED BLUEPRINT DIFF — STILL NO RELEASE APPROVAL';
 const css=[
  ':root{--ink:#183145;--muted:#62788a;--bg:#f3f7fa;--line:#dce7ec;--accent:#126c67;--critical:#9c392b;--warn:#a46a16}',
  '*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,Arial,sans-serif}',
  'main{max-width:1220px;margin:auto;padding:22px 18px 85px}.hero{background:linear-gradient(128deg,#102a40,#176b6f);color:#fff;border-radius:24px;padding:32px}',
  '.hero h1{font-size:clamp(26px,4vw,39px);margin:8px 0;line-height:1.15}.hero p{color:#d4e7ec;margin:9px 0}.kicker{font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:850;color:#a9eadb}',
  '.status{display:inline-block;padding:8px 12px;border:1px solid #ffffff55;border-radius:9px;font-size:12px;font-weight:800;margin:9px 0}',
  '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:17px 0}.stat{background:#fff;border-radius:14px;border:1px solid var(--line);padding:15px}.stat b{display:block;font-size:27px}.stat span{font-size:12px;color:var(--muted)}',
  '.panel{background:white;border:1px solid var(--line);border-radius:18px;padding:25px;margin:17px 0}.panel h2{margin:0 0 10px;font-size:23px}.panel h3{margin:20px 0 8px}',
  '.note{padding:13px 15px;border-left:4px solid #bc833c;background:#fff6e6;color:#664b29;border-radius:9px}.muted{color:var(--muted)}',
  '.jump{display:flex;flex-wrap:wrap;gap:11px;margin:15px 0}.jump a{background:white;border:1px solid var(--line);border-radius:9px;padding:9px 12px;text-decoration:none;color:var(--accent);font-weight:750}.jump a:hover{border-color:var(--accent)}',
  '.tablewrap{max-width:100%;overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:790px;font-size:13px}th{text-align:left;background:#e8f1f3;color:#31586b}th,td{padding:13px 12px;vertical-align:top;border-bottom:1px solid var(--line);overflow-wrap:anywhere}',
  '.pill{display:inline-block;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:800;color:#456173;background:#edf2f5}.pill.p0{background:#fff0ea;color:var(--critical)}.pill.p1{background:#fff4e0;color:var(--warn)}.pill.p2{background:#eaf4f1;color:var(--accent)}',
  '.task{margin:11px 0;border:1px solid var(--line);border-left:5px solid #c0d7d4;border-radius:11px;overflow:hidden;background:#fcfefd}.task.p0{border-left-color:#cc7665}.task.p1{border-left-color:#dbab56}',
  '.task summary{cursor:pointer;display:flex;gap:12px;align-items:center;padding:14px;overflow-wrap:anywhere}.task summary strong{flex:1}.task summary:hover{background:#f3f8f9}',
  '.task .details{padding:0 17px 17px}.task .details p{margin:7px 0}.task .details b{display:inline-block;min-width:127px}.task .details code,td code{overflow-wrap:anywhere}',
  'code{font-family:ui-monospace,Consolas,monospace;font-size:12px}.hash{overflow-wrap:anywhere;color:#385a64}',
  '.empty{padding:13px;background:#eff5f5;border-radius:9px;color:#45636d}a{color:var(--accent)}.foot{font-size:12px;color:var(--muted);padding:18px 0}',
  '@media(max-width:620px){main{padding:10px}.hero{padding:23px}.panel{padding:17px}.task summary{align-items:flex-start}.task .details b{display:block}}',
  '@media print{body{background:#fff}.hero{background:#fff;color:#000;border:1px solid #bbb}.hero p,.kicker{color:#444}.jump{display:none}.panel,.stat{break-inside:avoid}}'
 ].join('');
 const groups=['P0','P1','P2'].map(priority=>{
  const list=report.actions.filter(a=>a.priority===priority);
  return '<section id="'+priority.toLowerCase()+'" class="panel"><h2>'+priority+
   ' · '+(priority==='P0'?'Critical approval / migration gates':
    priority==='P1'?'SEO and implementation review':'Editorial and presentation checks')+
   ' <span class="pill '+priority.toLowerCase()+'">'+list.length+'</span></h2>'+
   (list.map(a=>'<details class="task '+priority.toLowerCase()+'"><summary><span class="pill '+
    priority.toLowerCase()+'">'+priority+'</span><strong>'+esc(a.reason)+'</strong></summary>'+
    '<div class="details"><p><b>Task ID</b><code>'+esc(a.id)+'</code></p>'+
    '<p><b>Page ID</b>'+esc(a.pageId||'Site-wide')+'</p>'+
    '<p><b>Responsible</b>'+esc(a.owner)+'</p>'+
    '<p><b>What to do</b>'+esc(a.instruction)+'</p>'+
    '<p><b>Evidence needed</b>'+esc(a.evidenceNeeded)+'</p>'+
    '<p class="note">No client evidence is authenticated; this entry does not approve CMS changes.</p></div></details>'
   ).join('')||'<p class="empty">No '+priority+' review tasks in this Blueprint diff.</p>')+
   '</section>';
 }).join('');
 const rows=report.changes.map(c=>'<tr><td><span class="pill '+c.priority.toLowerCase()+'">'+esc(c.priority)+
  '</span></td><td><strong>'+esc(c.kind)+'</strong></td><td><code>'+
  esc(c.pageId||'site-wide')+'</code></td><td><code>'+esc(c.oldPath||'—')+
  '</code></td><td><code>'+esc(c.newPath||'—')+'</code></td><td>'+
  esc(c.message)+'</td></tr>').join('');
 const probes=report.probePlan.map(p=>'<tr><td><code>'+esc(p.requestPath)+'</code></td><td>'+
  esc(p.kind)+'</td><td>'+esc(p.expectedStatus===null?'Owner decision required':p.expectedStatus)+'</td><td><code>'+
  esc(p.expectedLocationPath||'—')+'</code></td><td><span class="pill">NOT PERFORMED</span></td></tr>').join('');
 const stats=[
  ['P0 urgent',report.summary.priorityActions.P0],['P1 review',report.summary.priorityActions.P1],
  ['P2 editorial',report.summary.priorityActions.P2],['Pages before',report.summary.beforePages],
  ['Pages after',report.summary.afterPages],['Moved routes',report.summary.movedRoutes],
  ['Affected pages',report.summary.affectedPageIds.length],['HTTP checks planned',report.summary.plannedHttpProbes]
 ].map(([label,value])=>'<div class="stat"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>').join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; connect-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT — Private Blueprint Change Impact</title><style>'+css+'</style></head><body><main>'+
  '<header class="hero"><div class="kicker">MANUFACT · OWNER-ONLY SEO OPERATIONS</div>'+
  '<h1>Blueprint Change Impact</h1><p>Site: '+esc(report.siteId)+'</p><div class="status">'+
  esc(status)+'</div><p>Before and after are canonical SEO plans, NOT evidence that the CMS or public URL actually changed.</p></header>'+
  '<nav class="jump"><a href="DECISION-DESK.html">Open offline decision desk</a><a href="#changes">What changed</a><a href="#p0">P0 blockers</a>'+
  '<a href="#p1">P1 reviews</a><a href="#p2">P2 editorial</a><a href="#checks">Verify after implementation</a></nav>'+
  '<div class="stats">'+stats+'</div>'+
  '<section id="changes" class="panel"><h2>Approved Blueprint plan difference</h2>'+
  '<p class="note">Any 301 shown is a proposed verification requirement — no redirects were written to Site v1.</p>'+
  '<div class="tablewrap"><table><thead><tr><th>Priority</th><th>Change</th><th>Page</th><th>Before</th><th>After</th><th>Interpretation</th></tr></thead>'+
  '<tbody>'+(rows||'<tr><td colspan="6">No canonical Blueprint field changes recorded.</td></tr>')+
  '</tbody></table></div></section>'+groups+
  '<section id="checks" class="panel"><h2>Public checks required after owner-approved implementation</h2>'+
  '<p class="muted">No actual HTTP requests performed. Read-only expectations must be independently verified on the correct host and revision.</p>'+
  '<div class="tablewrap"><table><thead><tr><th>URL</th><th>Check</th><th>Expected HTTP</th><th>Expected Location</th><th>Evidence</th></tr></thead><tbody>'+
  (probes||'<tr><td colspan="5">No new route-specific probes; routine host QA still required.</td></tr>')+
  '</tbody></table></div></section>'+
  '<section class="panel"><h2>Source fingerprints</h2>'+
  '<p class="hash">Previous Blueprint: <code>'+esc(report.beforeBlueprintSha256)+'</code></p>'+
  '<p class="hash">Proposed Blueprint: <code>'+esc(report.afterBlueprintSha256)+'</code></p>'+
  '<p>These identify compiled Blueprint content, not independently authenticated client approval or physical publication.</p>'+
  '<p class="note"><b>No release authorization.</b> Actual Site v1 redirects, HTML, client ownership and HTTPS status require separate lead-owned verification.</p>'+
  '<h3>Scope</h3><ul>'+report.notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul></section>'+
  '<footer class="foot">Private read-only HTML · no scripts · no network · never upload/commit operator output.</footer>'+
  '</main></body></html>';
 return Object.freeze({html,siteId:report.siteId,releaseAuthorized:false,
  summary:report.summary,requiresHumanOwnerSignoff:true});
}
module.exports=Object.freeze({render});
