'use strict';
/* No-script, no-remote-asset, private JSON-LD risk review; no graph visualization
 * or site-template library. Exposes only field names and bounded issue codes.
 */
const AUDIT=require('./seo-structured-data-audit.cjs');
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(r){
 if(r?.format!==AUDIT.FORMAT||r.readOnly!==true||r.releaseAuthorized!==false)
  throw Error('Schema review needs original private source-bound read-only report');
 const css=[
 '*{box-sizing:border-box}body{margin:0;font:15px/1.55 system-ui,sans-serif;color:#183447;background:#f3f7fa}',
 'main{max-width:1170px;margin:auto;padding:22px 20px 90px}',
 'header{border-radius:21px;padding:32px;background:linear-gradient(120deg,#163447,#1f6967);color:white}',
 'header h1{font-size:clamp(27px,4vw,39px);line-height:1.2;margin:9px 0}header p{color:#d5e9e9}',
 'section{background:white;border:1px solid #dde6ed;border-radius:16px;padding:22px;margin-top:17px}',
 '.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:17px 0}',
 '.stat{background:white;border:1px solid #dbe6ec;border-radius:13px;padding:15px}',
 '.stat b{font-size:31px;display:block}.stat small{color:#536e7d}',
 'h2{font-size:21px;margin:0 0 10px}.scroll{overflow:auto}table{border-collapse:collapse;width:100%}',
 'td,th{padding:11px;border-bottom:1px solid #dce5eb;vertical-align:top;text-align:left;overflow-wrap:anywhere}',
 'th{font-size:11px;text-transform:uppercase;color:#556e7d}code{font-size:12px;overflow-wrap:anywhere}',
 '.priority{display:inline-block;font-size:12px;border-radius:6px;padding:3px 8px;font-weight:800}',
 '.p0{background:#ffede6;color:#9e3d25}.p1{background:#fff4d9;color:#836322}.p2{background:#eaf1f4;color:#506b77}',
 '.notice{background:#fff5e8;border-left:4px solid #b2773c;padding:13px}',
 '@media(max-width:790px){main{padding:10px}section,header{padding:18px}.stats{grid-template-columns:repeat(2,1fr)}table{min-width:820px}}'
 ].join('');
 const stats=[['P0',r.summary.P0],['P1',r.summary.P1],['P2',r.summary.P2],
  ['Inspectible pages',r.coverage.reviewablePublicPages+'/'+r.coverage.approvedPages]]
  .map(([label,n])=>'<div class="stat"><b>'+esc(n)+'</b><small>'+esc(label)+'</small></div>').join('');
 const issues=r.findings.map(f=>'<tr><td><span class="priority '+f.priority.toLowerCase()+'">'+
  esc(f.priority)+'</span></td><td><code>'+esc(f.path||'unknown')+
  '</code></td><td><strong>'+esc(f.code)+'</strong><p>'+esc(f.detail)+
  '</p></td><td><code>'+esc(f.field||'—')+'</code></td></tr>').join('');
 const pages=r.pages.map(p=>'<tr><td><code>'+esc(p.path)+'</code></td><td>'+
  (p.htmlInspectible?'HTML PROVIDED':'UNKNOWN')+'</td><td>'+
  p.publishedTypes.map(esc).join(', ')+'</td><td>'+
  p.approvedSchemaCandidates.map(x=>esc(x.type)+(x.eligible?' (source eligible)':' (unconfirmed)')).join(', ')+
  '</td><td>'+p.claimFieldNames.map(esc).join(', ')+'</td></tr>').join('');
 const holds=r.manualCandidates.map(x=>'<li><code>'+esc(x.path)+'</code> — '+
  esc(x.type)+' · '+esc(x.manualNext)+'</li>').join('');
 const sha=Object.entries(r.inputSHA256).map(([name,hash])=>'<tr><td>'+esc(name)+'</td>'+
  '<td><code>'+esc(hash)+'</code></td></tr>').join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT · Structured Data QA</title><style>'+css+'</style></head><body><main>'+
  '<header><div>MANUFACT · PRIVATE, SOURCE-BOUND SEO</div>'+
  '<h1>Structured Data / JSON-LD Quality Assurance</h1><p>'+
  esc(r.siteId)+' · '+esc(r.base)+'</p><p>Actual per-page JSON-LD source inspection, NOT rich-result eligibility or owner-backed factual verification.</p></header>'+
  '<div class="stats">'+stats+'</div>'+
  '<section><h2>Prioritized manual issues</h2><p>Context, malformed JSON, unsupported claims, canonical entity URLs, BreadcrumbList order and approved owner-fact gates.</p>'+
  '<div class="scroll"><table><thead><tr><th>Priority</th><th>Approved page</th><th>Issue / human task</th><th>Field only</th></tr></thead><tbody>'+
  (issues||'<tr><td colspan="4">No rule triggered. Host, owner source and Google eligibility remain unverified.</td></tr>')+
  '</tbody></table></div></section>'+
  '<section><h2>Actual published types vs approved candidates</h2><div class="scroll"><table>'+
  '<thead><tr><th>Approved route</th><th>Observed public HTML</th><th>Published types</th><th>Blueprint candidates</th><th>Owner-claim field names</th></tr></thead><tbody>'+
  pages+'</tbody></table></div></section>'+
  '<section><h2>Optional owner-backed publishing decisions</h2><p>These are only candidates in the approved Blueprint. Not publishing one is NOT automatically a defect.</p>'+
  '<ul>'+(holds||'<li>No optional candidate was omitted in inspected pages.</li>')+'</ul></section>'+
  '<section><h2>Source fingerprints and safety boundaries</h2><div class="scroll"><table><tbody>'+sha+
  '</tbody></table></div><p class="notice">No original JSON-LD claims, prices, customer addresses or HTML copied into this report. Never publish an unverified claim or mark a rich result as eligible from this analysis.</p>'+
  '<ul>'+r.boundaries.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
  '<p><a href="structured-data.md">Lead Markdown</a> · <a href="structured-data.json">Private machine-readable report</a></p></section>'+
  '</main></body></html>';
 return {html,markdown:AUDIT.markdown(r)};
}
module.exports=Object.freeze({render});
