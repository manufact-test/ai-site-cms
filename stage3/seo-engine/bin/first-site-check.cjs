#!/usr/bin/env node
'use strict';
// One explicit read-only first-site technical acceptance run.
// Reuses verified Approved Site v2, the PHP loopback capture and the existing
// SEO review bundle. Does not launch PHP, touch the CMS or authorize release.
const fs=require('node:fs'),path=require('node:path');
const BRIDGE=require('../lib/approved-site-bridge.cjs');
const PHP=require('../lib/php-html-capture.cjs');
const PACKAGE=require('../lib/package.cjs');
const {checkBlueprint}=require('../lib/blueprint.cjs');
const {auditSite}=require('../lib/analyze.cjs');
const REQUIRED=['approved-site','blueprint','origin','evidence','report'];
function parse(argv){
 const opts={};
 if(!Array.isArray(argv)||argv.length!==REQUIRED.length*2)
  throw Error('Usage: node stage3/seo-engine/bin/first-site-check.cjs --approved-site /ABS/SEALED --blueprint /ABS/blueprint.json --origin http://127.0.0.1:PORT/published/SITE-ID/ --evidence /ABS/new-evidence --report /ABS/new-report');
 for(let i=0;i<argv.length;i+=2){
  const name=argv[i]?.startsWith('--')?argv[i].slice(2):null;
  if(!REQUIRED.includes(name)||!argv[i+1]||opts[name])throw Error('Unknown, missing or duplicate first-site option');
  opts[name]=argv[i+1];
 }
 if(REQUIRED.some(x=>!opts[x]))throw Error('All first-site flags are required');
 return opts;
}
function newTarget(raw,sealed,other=null){
 const target=path.resolve(raw),sealedReal=fs.realpathSync(sealed);
 const parent=fs.realpathSync(path.dirname(target));
 if(target===sealedReal||target.startsWith(sealedReal+path.sep)||
    parent===sealedReal||parent.startsWith(sealedReal+path.sep)||
    fs.existsSync(target)||other&&(target===other||target.startsWith(other+path.sep)||other.startsWith(target+path.sep)))
  throw Error('First-site evidence and report must be distinct new directories outside the immutable sealed package');
 return target;
}
function readBlueprint(file){
 const stat=fs.statSync(file);
 if(!stat.isFile()||stat.size>2000000||stat.size<2)throw Error('Invalid first-site Blueprint input file');
 return checkBlueprint(JSON.parse(fs.readFileSync(file,'utf8')));
}
function manifests(){
 const dir=path.join(__dirname,'../../components');
 return fs.readdirSync(dir).filter(name=>name.endsWith('.json')).map(name=>{
  const file=path.join(dir,name),stat=fs.statSync(file);
  if(!stat.isFile()||stat.size>1000000)throw Error('Invalid current component manifest '+name);
  return JSON.parse(fs.readFileSync(file,'utf8'));
 });
}
async function main(argv){
 const o=parse(argv),{site,source}=BRIDGE.load(o['approved-site']);
 PHP.baseUrl(o.origin,site.siteId); // Strict localhost published mount; no outgoing requests.
 const evidence=newTarget(o.evidence,o['approved-site']);
 const report=newTarget(o.report,o['approved-site'],evidence);
 const blueprint=readBlueprint(o.blueprint),registry=manifests();
 if(blueprint.siteId!==site.siteId)throw Error('First-site approved source and Blueprint site IDs differ');
 // Fail early on incompatible source contracts, not after downloading images.
 auditSite(site,registry,blueprint);
 const observed=await PHP.capture(o['approved-site'],o.origin,evidence);
 const fresh=BRIDGE.load(o['approved-site']);
 if(fresh.source.fileSha256!==source.fileSha256||
    fresh.source.siteRevisionFingerprint!==source.siteRevisionFingerprint)
  throw Error('Sealed site source changed during local PHP evidence acquisition; discard evidence and rerun');
 const checked=PHP.read(evidence,fresh.site,fresh.source);
 if(!PHP.isVerified(checked))throw Error('First-site PHP evidence was not source-bound verified');
 const bundle=PACKAGE.build(fresh.site,registry,blueprint,{
  approvedSource:fresh.source,phpHtml:checked,snapshot:checked.snapshot
 });
 const release=bundle.release;
 const summary={
  format:'manufact-seo-first-site-check-v1',siteId:site.siteId,
  sourceSiteSha256:fresh.source.fileSha256,
  siteRevisionFingerprint:fresh.source.siteRevisionFingerprint,
  packageVersion:fresh.source.packageVersion,
  capturedAt:checked.capturedAt,origin:checked.baseUrl,
  htmlPages:checked.pageCount,
  bytes:{html:checked.checkedHtmlBytes,seoEndpoints:checked.checkedAuxiliaryBytes,
   media:checked.localMedia?.savedBodyBytes??null},
  endpoints:{robots:checked.publication?.robotsStatus??null,
   sitemap:checked.publication?.sitemapStatus??null,
   redirects:checked.publication?.redirectResponses??null},
  media:{observed:checked.localMedia?.capturedResources??null,
   actualFindings:checked.localMedia?.findings.length??null},
  forms:{markupObserved:checked.localForms?.observedForms??null,
   technicalFindings:checked.localForms?.findings.length??null,
   actualPostPerformed:false,deliveryVerified:false},
  heads:{pagesWithHttpHeaders:checked.localHead?.pagesWithRecordedHeaders??null,
   actualFindings:checked.localHead?.findings.length??null,
   localSitemapOrigin:checked.localHead?.publicOriginObservedInSitemap??null},
  release:{status:release.decision,
   blockingGates:release.blockers.length,reviewGates:release.reviews.length,
   mandatoryManualChecks:release.manualChecks.length,
   blockerIds:release.blockers.map(g=>g.gateId)},
  actualPublicHttpsVerified:false,servedPhpRevisionAuthenticated:false,
  actualBrowserDesignApproved:false,formsDelivered:false,automaticRelease:false,
  nextStep:'Lead must correlate published revision, resolve blockers and verify real HTTPS, client-approved three-device layouts and end-to-end forms before publishing.'
 };
 const body=JSON.stringify(bundle,null,2)+'\n',brief=JSON.stringify(summary,null,2)+'\n';
 if(body.length>40000000)throw Error('First-site review bundle is too large; inspect inputs rather than publishing a truncated report');
 fs.mkdirSync(report);
 fs.writeFileSync(path.join(report,'bundle.json'),body,{flag:'wx'});
 fs.writeFileSync(path.join(report,'handoff.md'),bundle.markdownHandoff+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(report,'summary.json'),brief,{flag:'wx'});
 return {evidence,report,summary};
}
if(require.main===module)
 main(process.argv.slice(2))
  .then(result=>process.stdout.write('FIRST SITE LOCAL TECHNICAL REVIEW: '+JSON.stringify(result)+'\n'))
  .catch(e=>{process.stderr.write('SEO first-site check: '+e.message+'\n');process.exitCode=1;});
module.exports=Object.freeze({parse,newTarget,readBlueprint,main});
