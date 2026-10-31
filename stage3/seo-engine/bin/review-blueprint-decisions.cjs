#!/usr/bin/env node
'use strict';
/* Strict private human decision trace from the ORIGINAL source Blueprint pair.
 * Never grants owner authentication or deployment, even if every box is accepted.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const COMPARE=require('./compare-seo-blueprints.cjs');
const LEDGER=require('../lib/blueprint-change-decisions.cjs');
const POLICY=require('../lib/private-output-policy.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const HELP='Usage: node stage3/seo-engine/bin/review-blueprint-decisions.cjs --before /ABS/OLD-brief-or-blueprint.json --after /ABS/NEW-brief-or-blueprint.json --decisions /ABS/filled-decisions.json --out /ABS/NEW-private-review';
function parse(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length!==8)throw Error(HELP);
 const f={};
 for(let i=0;i<8;i+=2){
  if(!['--before','--after','--decisions','--out'].includes(argv[i])||
   Object.hasOwn(f,argv[i])||!path.isAbsolute(argv[i+1]||''))throw Error(HELP);
  f[argv[i]]=argv[i+1];
 }
 if(Object.keys(f).length!==4)throw Error(HELP);
 return {before:f['--before'],after:f['--after'],decisions:f['--decisions'],out:f['--out']};
}
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function html(report){
 if(report?.format!==LEDGER.REVIEW||report.releaseAuthorized!==false)
  throw Error('Cannot display invalid or authorizing operator decisions');
 const css='*{box-sizing:border-box}body{margin:0;font:15px/1.55 system-ui,Arial,sans-serif;background:#f1f6f8;color:#173549}main{max-width:1060px;margin:auto;padding:20px 17px 75px}header{border-radius:20px;padding:29px;color:white;background:linear-gradient(130deg,#133249,#166d70)}h1{font-size:clamp(24px,4vw,36px);margin:7px 0}header p{color:#cde4e7}.eyebrow{font-size:12px;letter-spacing:.1em;color:#abecdd;font-weight:800}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:11px;margin:16px 0}.stat{background:white;border:1px solid #dce6eb;border-radius:13px;padding:14px}.stat b{display:block;font-size:27px}.stat small{color:#698092}.panel{background:white;padding:24px;border:1px solid #dce6eb;border-radius:16px;margin:16px 0}.row{border:1px solid #e0e8ec;padding:15px;margin:10px 0;border-left:5px solid #c5d3d9;border-radius:9px;overflow-wrap:anywhere}.row.accepted{border-left-color:#4b9989}.row.rejected{border-left-color:#c56655}.row.deferred{border-left-color:#cea052}.row h3{font-size:16px;margin:0 0 7px}.row p{margin:5px 0}.muted{color:#607889}.notice{border-left:4px solid #d5a554;background:#fff5dd;padding:13px;border-radius:7px}code{overflow-wrap:anywhere;font-size:12px}@media(max-width:620px){main{padding:10px}.panel,header{padding:17px}}';
 const cells=[['Accepted',report.counts.accepted],['Rejected',report.counts.rejected],
  ['Deferred',report.counts.deferred],['Pending',report.counts.pending],
  ['Unresolved P0',report.counts.p0Unresolved],['Unresolved P1',report.counts.p1Unresolved],
  ['Unresolved P2',report.counts.p2Unresolved]];
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; connect-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT — Blueprint Decision Record</title><style>'+css+'</style></head><body><main>'+
  '<header><div class="eyebrow">MANUFACT · PRIVATE HUMAN DECISION TRAIL</div>'+
  '<h1>Blueprint Owner Decision Record</h1><p>Site: '+esc(report.siteId)+'</p>'+
  '<p>'+esc(report.disposition)+'</p></header>'+
  '<div class="stats">'+cells.map(([key,n])=>'<div class="stat"><small>'+esc(key)+'</small><b>'+n+'</b></div>').join('')+'</div>'+
  '<div class="notice"><b>NOT a release decision.</b> These are operator-reported choices. The lead must separately authenticate evidence, owner identity and real deployed website.</div>'+
  '<section class="panel"><h2>Source-bound review tasks</h2>'+
  (report.actions.map(a=>'<article class="row '+a.decision+'"><h3>'+esc(a.priority)+' · '+esc(a.id)+
   '</h3><p><b>Decision:</b> '+esc(a.decision)+'</p>'+
   '<p><b>Reviewer:</b> '+esc(a.reviewer||'Not recorded')+
   ' · <b>Date:</b> '+esc(a.reviewedAt||'Not recorded')+'</p>'+
   '<p>'+esc(a.reason)+'</p><p><b>Next verification:</b> '+esc(a.evidenceNeeded)+'</p>'+
   (a.evidenceRef?'<p><b>Private evidence reference:</b> <code>'+esc(a.evidenceRef)+'</code></p>':'')+
   (a.notes?'<p><b>Operator notes:</b> '+esc(a.notes)+'</p>':'')+
   '</article>').join('')||'<p class="muted">The two plans introduced no explicit action tasks. This still does not authenticate owner approval.</p>')+
  '</section><section class="panel"><h2>Original canonical content</h2>'+
  '<p class="muted">Before SHA256 <code>'+esc(report.beforeBlueprintSha256)+'</code></p>'+
  '<p class="muted">After SHA256 <code>'+esc(report.afterBlueprintSha256)+'</code></p>'+
  '<p>Never commit or upload this private report: it can contain operator names and evidence references.</p>'+
  '</section></main></body></html>';
}
function main(argv){
 const f=parse(argv);
 if(!f){process.stdout.write(HELP+'\n');return null;}
 const out=POLICY.privateOutput(f.out);
 const {sources,report}=COMPARE.buildData(f);
 const checked=COMPARE.read(f.decisions);
 if([sources.before.real,sources.after.real].includes(checked.real))
  throw Error('Operator decisions must be a third independent private file');
 const data=JSON.parse(checked.bytes.toString('utf8'));
 const decision=LEDGER.evaluate(report,data),decisionJson=JSON.stringify(decision,null,2)+'\n';
 const view=html(decision),md=LEDGER.markdown(decision);
 const files={
  'index.html':view,'BLUEPRINT-DECISION-REVIEW.json':decisionJson,
  'BLUEPRINT-DECISION-REVIEW.md':md,
  'SOURCE-MANIFEST.json':JSON.stringify({
   format:'manufact-seo-blueprint-decisions-source-manifest-v1',
   siteId:report.siteId,sourceBeforeSha256:sources.before.sha256,
   sourceAfterSha256:sources.after.sha256,filledDecisionSha256:checked.sha256,
   canonicalBeforeSha256:report.beforeBlueprintSha256,
   canonicalAfterSha256:report.afterBlueprintSha256,
   decisionReportSha256:sha(decisionJson),
   observedUserDecisions:decision.counts,
   readOnly:true,clientSignoffAuthenticated:false,
   publicationAuthorized:false,actualHttpRequests:0
  },null,2)+'\n',
  'PRIVATE-README.md':'# Private Blueprint decision review\n\n'+
   'Evidence references and reviewer names are operator supplied; this package is NOT authenticated owner signoff, site publication or GO.\n'+
   'Independently review original source files, evidence and actual published HTML/301 before any CMS action.\n'+
   'NEVER upload or commit this directory.\n'
 };
 const scratch=fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(out)),
  '.seo-blueprint-decisions-incomplete-'));
 let done=false;
 try{
  for(const [name,content] of Object.entries(files))
   fs.writeFileSync(path.join(scratch,name),content,{flag:'wx',mode:0o600});
  if(COMPARE.read(f.before).sha256!==sources.before.sha256||
   COMPARE.read(f.after).sha256!==sources.after.sha256||
   COMPARE.read(f.decisions).sha256!==checked.sha256)
   throw Error('Original source/decision bytes changed during private review');
  if(fs.existsSync(out))throw Error('Review output appeared while staging');
  fs.renameSync(scratch,out);done=true;
 }finally{if(!done)fs.rmSync(scratch,{recursive:true,force:true});}
 return {siteId:report.siteId,out,disposition:decision.disposition,
  counts:decision.counts,readOnly:true,publicationAuthorized:false};
}
if(require.main===module)try{
 const report=main(process.argv.slice(2));
 if(report)process.stdout.write('PRIVATE BLUEPRINT DECISION REVIEW: '+JSON.stringify(report)+'\n');
}catch(error){process.stderr.write('Blueprint decision review refused: '+error.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,html,main});
