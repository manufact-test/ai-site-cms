'use strict';
/* Private no-script presentation of source-pinned CrUX field p75 evidence. */
const FIELD=require('./seo-field-performance.cjs');
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const md=x=>String(x??'').replace(/[\r\n|]/g,' ').replace(/[`<>]/g,'');
function render(report){
 if(report?.format!==FIELD.FORMAT||report.readOnly!==true||report.releaseAuthorized!==false)
  throw Error('Private CrUX field-performance report required');
 const summary=report.summary;
 const scope=r=>r.scope==='origin'?'ORIGIN (all paths)':r.path;
 const metric=(r,k)=>r.metrics[k].p75===null?'unknown':
  r.metrics[k].p75+' '+r.metrics[k].unit+' ('+r.metrics[k].classification+')';
 const markdown=['# MANUFACT — private Chrome UX Report field performance review','',
  'Site: '+md(report.siteId)+' · HTTPS mount: '+md(report.base),
  'Original private CrUX source SHA256: `'+report.rawCruxSourceSha256+'`',
  'Read-only operator-supplied source; no verified Google property, host revision or release authorization.','',
  'Records: '+summary.records+' · URL: '+summary.pageRecords+
   ' · origin-wide: '+summary.originRecords+' · specific device: '+summary.deviceSpecificRecords,
  'Approved Blueprint pages represented by exact URL records: '+summary.representedApprovedPages+
   '/'+summary.approvedPages+'; unrepresented (unknown): '+summary.unrepresentedApprovedPages,
  'Metric classifications: good '+summary.goodMetricValues+
   ' · needs improvement '+summary.needsImprovementMetricValues+
   ' · poor '+summary.poorMetricValues+' · unknown '+summary.unknownMetricValues,
  'Collection dates absent: '+summary.missingPeriodRecords+
   ' · stale versus review date: '+summary.stalePeriodRecords+
   ' · future-dated: '+summary.futurePeriodRecords,'',
  '## Exact evidence coverage','',
  '| Scope | Device | Collection window | LCP p75 | INP p75 | CLS p75 |',
  '|---|---|---|---|---|---|'];
 for(const r of report.records)markdown.push('| '+md(scope(r))+' | '+md(r.device)+' | '+
  (r.period?md(r.period.from+' – '+r.period.to):'unknown')+' | '+
  ['LCP','INP','CLS'].map(k=>md(metric(r,k))).join(' | ')+' |');
 markdown.push('','## Human investigations','','| Priority | Scope | Device | Code | Human interpretation |',
  '|---|---|---|---|---|');
 for(const f of report.findings)markdown.push('| '+f.priority+' | '+
  md(f.scope==='origin'?'ORIGIN (all paths)':f.path)+' | '+md(f.device)+' | '+
  md(f.code)+' | '+md(f.detail)+' |');
 markdown.push('','## Limitations','',...report.limitations.map(x=>'- '+md(x)));
 const css='*{box-sizing:border-box}body{background:#f4f8fa;color:#173346;margin:0;font:15px/1.6 system-ui,Arial,sans-serif}main{max-width:1120px;margin:auto;padding:24px 18px 64px}header{background:#123a4c;color:white;border-radius:20px;padding:28px}header p{color:#d4e9f0}section{background:white;border:1px solid #d7e4ec;border-radius:17px;padding:22px;margin:18px 0}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #d7e4ec;text-align:left;vertical-align:top;padding:9px}th{color:#426172;font-size:12px}.scroll{overflow-x:auto}.alert{padding:12px;border-left:4px solid #bb7121;background:#fff5df}code{overflow-wrap:anywhere}li{margin-bottom:7px}@media(max-width:700px){header,section{padding:16px}table{min-width:700px}}';
 const rows=report.records.map(r=>'<tr><td>'+esc(scope(r))+'</td><td>'+esc(r.device)+
  '</td><td>'+esc(r.period?r.period.from+' – '+r.period.to:'unknown')+'</td>'+
  ['LCP','INP','CLS'].map(k=>'<td>'+esc(metric(r,k))+'</td>').join('')+'</tr>').join('');
 const actions=report.findings.map(f=>'<tr><td>'+esc(f.priority)+'</td><td>'+esc(
  f.scope==='origin'?'ORIGIN (all paths)':f.path)+'</td><td>'+esc(f.device)+
  '</td><td>'+esc(f.code)+'</td><td>'+esc(f.detail)+'</td></tr>').join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;"><title>MANUFACT — Private CrUX Field Performance</title><style>'+css+'</style></head><body><main><header><p>MANUFACT · PRIVATE SEO EVIDENCE</p><h1>Real-user field performance · CrUX p75</h1><p>Site '+esc(report.siteId)+' · '+esc(report.base)+'</p><p>Original source SHA256: <code>'+esc(report.rawCruxSourceSha256)+'</code></p></header>'+
  '<section><h2>Coverage</h2><p>Source records '+summary.records+' · URL '+summary.pageRecords+' · origin '+summary.originRecords+' · device-specific '+summary.deviceSpecificRecords+'</p><p>Exact Blueprint page coverage '+summary.representedApprovedPages+'/'+summary.approvedPages+' · unrepresented '+summary.unrepresentedApprovedPages+' (unknown, not automatically poor)</p><p>Good '+summary.goodMetricValues+' · needs improvement '+summary.needsImprovementMetricValues+' · poor '+summary.poorMetricValues+' · unknown '+summary.unknownMetricValues+' metric values</p><p>Missing collection window '+summary.missingPeriodRecords+' · stale '+summary.stalePeriodRecords+' · future-dated '+summary.futurePeriodRecords+'</p><p class="alert">Operator-supplied CrUX aggregates historical real-user loads. Neither same-release deployment nor Google account ownership is authenticated. No automatic GO.</p></section>'+
  '<section><h2>Source coverage by page/origin and form factor</h2><div class="scroll"><table><thead><tr><th>Scope</th><th>Device</th><th>Collection period</th><th>LCP p75</th><th>INP p75</th><th>CLS p75</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>'+
  '<section><h2>Human investigations · P1 '+summary.P1+' / P2 '+summary.P2+'</h2><div class="scroll"><table><thead><tr><th>Priority</th><th>Scope</th><th>Device</th><th>Code</th><th>Interpretation</th></tr></thead><tbody>'+
  (actions||'<tr><td colspan="5">No detected range issues in supplied fields. This is not a release or all-pages performance pass.</td></tr>')+
  '</tbody></table></div></section><section><h2>Evidence limitations</h2><ul>'+report.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section></main></body></html>';
 return {html,markdown:markdown.join('\n')+'\n'};
}
module.exports=Object.freeze({render});
