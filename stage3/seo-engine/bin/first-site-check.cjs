#!/usr/bin/env node
'use strict';
// One explicit read-only first-site technical acceptance run.
// Reuses verified Approved Site v2, the PHP loopback capture and the existing
// SEO review bundle. Does not launch PHP, touch the CMS or authorize release.
const fs=require('node:fs'),path=require('node:path');
const BRIDGE=require('../lib/approved-site-bridge.cjs');
const PHP=require('../lib/php-html-capture.cjs');
const PHP_CAPTURE=require('../lib/php-capture.cjs');
const PACKAGE=require('../lib/package.cjs');
const WORKSHEET=require('../lib/first-site-worksheet.cjs');
const PROGRESS=require('../lib/first-site-report-delta.cjs');
const {checkBlueprint}=require('../lib/blueprint.cjs');
const {auditSite}=require('../lib/analyze.cjs');
const REQUIRED=['approved-site','blueprint','origin','evidence','report'];
const OPTIONAL=['php-capture','published-site','previous-report'];
function parse(argv){
 const opts={};
 if(!Array.isArray(argv)||argv.length<REQUIRED.length*2||
  argv.length>(REQUIRED.length+OPTIONAL.length)*2||argv.length%2)
  throw Error('Usage: node stage3/seo-engine/bin/first-site-check.cjs --approved-site /ABS/SEALED --blueprint /ABS/blueprint.json --origin http://127.0.0.1:PORT/published/SITE-ID/ --evidence /ABS/new-evidence --report /ABS/new-report [--php-capture /ABS/lead/evidence.json] [--published-site /ABS/owner-exported-published-site.json] [--previous-report /ABS/previous-report]');
 for(let i=0;i<argv.length;i+=2){
  const name=argv[i]?.startsWith('--')?argv[i].slice(2):null;
  if(![...REQUIRED,...OPTIONAL].includes(name)||!argv[i+1]||opts[name])throw Error('Unknown, missing or duplicate first-site option');
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
function readPublishedSite(file){
 const stat=fs.statSync(file);
 if(!stat.isFile()||stat.size<20||stat.size>600000)
  throw Error('Published CMS Site v1 export must be a bounded JSON file');
 const input=JSON.parse(fs.readFileSync(file,'utf8'));
 // Export is taken from owner-authenticated GET /api/sites/SITE-ID/published-site.
 if(!input||typeof input!=='object'||Array.isArray(input)||
    !input.site||typeof input.site!=='object'||Array.isArray(input.site)||
    !Number.isSafeInteger(input.version)||input.version<1||input.version>999999999)
  throw Error('Published-site JSON requires {site:SiteV1, version:int} from the authenticated owner API');
 return {site:input.site,version:input.version};
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
 const o=parse(argv),approved=BRIDGE.load(o['approved-site']);
 const published=o['published-site']?readPublishedSite(o['published-site']):null;
 const {site,source}=published?BRIDGE.reconcile(approved,published.site,published.version):approved;
 PHP.baseUrl(o.origin,site.siteId); // Strict localhost published mount; no outgoing requests.
 const evidence=newTarget(o.evidence,o['approved-site']);
 const report=newTarget(o.report,o['approved-site'],evidence);
 const previous=o['previous-report']?PROGRESS.read(o['previous-report']):null;
 if(previous&&(previous.root===report||previous.root===evidence||
    report.startsWith(previous.root+path.sep)||evidence.startsWith(previous.root+path.sep)))
  throw Error('Prior report must be a distinct read-only directory outside new capture outputs');
 const blueprint=readBlueprint(o.blueprint),registry=manifests();
 if(blueprint.siteId!==site.siteId)throw Error('First-site approved source and Blueprint site IDs differ');
 // Fail early on incompatible source contracts, not after downloading images.
 auditSite(site,registry,blueprint);
 // Optional official lead capture is read-only and validated before any new HTTP acquisition.
 const screenshots=o['php-capture']?PHP_CAPTURE.read(o['php-capture'],site,source):null;
 if(screenshots&&screenshots.baseUrl!==o.origin)
  throw Error('Lead PHP screenshot evidence and HTML capture target different origins/mounts');
 const observed=await PHP.capture(o['approved-site'],o.origin,evidence,published);
 const latestPublished=o['published-site']?readPublishedSite(o['published-site']):null;
 const originalFresh=BRIDGE.load(o['approved-site']);
 const fresh=latestPublished?BRIDGE.reconcile(originalFresh,latestPublished.site,latestPublished.version):originalFresh;
 if(fresh.source.fileSha256!==source.fileSha256||
    fresh.source.siteRevisionFingerprint!==source.siteRevisionFingerprint||
    fresh.source.publishedVersion!==source.publishedVersion)
  throw Error('Sealed site source changed during local PHP evidence acquisition; discard evidence and rerun');
 const checked=PHP.read(evidence,fresh.site,fresh.source);
 if(!PHP.isVerified(checked))throw Error('First-site PHP evidence was not source-bound verified');
 const bundle=PACKAGE.build(fresh.site,registry,blueprint,{
  approvedSource:fresh.source,phpHtml:checked,snapshot:checked.snapshot,
  ...(screenshots?{phpCapture:screenshots}:{})
 });
 const release=bundle.release;
 const worksheet=WORKSHEET.build({site:fresh.site,source:fresh.source,
  phpHtml:checked,phpCapture:screenshots,bundle});
 const summary={
  format:'manufact-seo-first-site-check-v1',siteId:site.siteId,
  sourceSiteSha256:fresh.source.fileSha256,
  siteRevisionFingerprint:fresh.source.siteRevisionFingerprint,
  packageVersion:fresh.source.packageVersion,
  publishedVersion:fresh.source.publishedVersion??null,
  cmsImportMediaIdsReconciled:fresh.source.approvedMediaIdRemappingChecked===true,
  cmsMediaFilesMapped:fresh.source.mappedPublishedMediaFiles??null,
  cmsPublishedSiteMatchesApprovedAfterRemap:fresh.source.publishedContentAfterMediaRemapMatched===true,
  capturedAt:checked.capturedAt,origin:checked.baseUrl,
  htmlPages:checked.pageCount,
  operatorWorksheet:{file:'launch-worksheet.md',
   localObservedFindings:worksheet.statistics.actualFindings,
   localBlockingFindings:worksheet.statistics.actualBlockingFindings,
   perPageDeviceSignoffPerformed:false},
  screenshots:{supplied:Boolean(screenshots),sha256CheckedFiles:screenshots?.checkedFileDigests??0,
   capturedPages:screenshots?.pages.length??0,brokenImageFindings:screenshots?.findings.length??0,
   visualEqualityReviewed:false,sourceRevisionAuthenticated:false},
  bytes:{html:checked.checkedHtmlBytes,seoEndpoints:checked.checkedAuxiliaryBytes,
   media:checked.localMedia?.savedBodyBytes??null},
  endpoints:{robots:checked.publication?.robotsStatus??null,
   sitemap:checked.publication?.sitemapStatus??null,
   redirects:checked.publication?.redirectResponses??null},
  media:{observed:checked.localMedia?.capturedResources??null,
   comparedAgainstSealedSiteSha256:checked.localMedia?.sealedMediaBytesCompared??false,
   actualFindings:checked.localMedia?.findings.length??null},
  navigation:{pagesChecked:checked.localNavigation?.checkedPages??null,
   actualFindings:checked.localNavigation?.findings.length??null,
   desktopAndMobileClickableVerified:false},
  designGraph:{actualPhpNodesChecked:checked.localGraph?.checkedNodes??null,
   actualPhpSectionsChecked:checked.localGraph?.checkedSections??null,
   actualFindings:checked.localGraph?.findings.length??null,
   browserInteractionVerified:false},
  typedComponents:{actualPhpSectionsChecked:checked.localComponents?.checkedTypedSections??null,
   actualFindings:checked.localComponents?.findings.length??null,
   browserInteractionVerified:false},
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
 const delta=previous?PROGRESS.build(previous,summary,bundle):null;
 if(delta)summary.previousRunComparison={
  file:'delta.md',jsonFile:'delta.json',
  newFindingOccurrences:delta.summary.newFindingOccurrences,
  noLongerObservedOccurrences:delta.summary.noLongerObservedOccurrences,
  currentBlockingGates:delta.summary.currentBlockingGates,
  operatorConfirmedFixes:0
 };
 const body=JSON.stringify(bundle,null,2)+'\n',brief=JSON.stringify(summary,null,2)+'\n';
 if(body.length>40000000)throw Error('First-site review bundle is too large; inspect inputs rather than publishing a truncated report');
 fs.mkdirSync(report);
 fs.writeFileSync(path.join(report,'bundle.json'),body,{flag:'wx'});
 fs.writeFileSync(path.join(report,'handoff.md'),bundle.markdownHandoff+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(report,'summary.json'),brief,{flag:'wx'});
 fs.writeFileSync(path.join(report,'launch-worksheet.md'),worksheet.markdown+'\n',{flag:'wx'});
 if(delta){
  fs.writeFileSync(path.join(report,'delta.md'),delta.markdown+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(report,'delta.json'),JSON.stringify({...delta,markdown:undefined},null,2)+'\n',{flag:'wx'});
 }
 return {evidence,report,summary};
}
if(require.main===module)
 main(process.argv.slice(2))
  .then(result=>process.stdout.write('FIRST SITE LOCAL TECHNICAL REVIEW: '+JSON.stringify(result)+'\n'))
  .catch(e=>{process.stderr.write('SEO first-site check: '+e.message+'\n');process.exitCode=1;});
module.exports=Object.freeze({parse,newTarget,readBlueprint,readPublishedSite,main});
