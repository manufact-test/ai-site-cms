#!/usr/bin/env node
'use strict';
// One explicit read-only first-site technical acceptance run.
// Reuses verified Approved Site v2, the PHP loopback capture and the existing
// SEO review bundle. Does not launch PHP, touch the CMS or authorize release.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BRIDGE=require('../lib/approved-site-bridge.cjs');
const PHP=require('../lib/php-html-capture.cjs');
const PHP_CAPTURE=require('../lib/php-capture.cjs');
const PACKAGE=require('../lib/package.cjs');
const WORKSHEET=require('../lib/first-site-worksheet.cjs');
const PROGRESS=require('../lib/first-site-report-delta.cjs');
const STATIC_EXPORT=require('../lib/php-local-static-export.cjs');
const DELIVERY_READY=require('../lib/php-local-delivery-readiness.cjs');
const VISUAL=require('../lib/php-local-visual-review.cjs');
const PUBLIC_STATIC=require('../lib/public-static-parity.cjs');
const PUBLIC_BYTES=require('../lib/public-media-byte-verification.cjs');
const DELIVERY=require('../lib/delivery-evidence.cjs');
const MEDIA=require('../lib/media-delivery.cjs');
const {checkBlueprint}=require('../lib/blueprint.cjs');
const {auditSite}=require('../lib/analyze.cjs');
const REQUIRED=['approved-site','blueprint','origin','evidence','report'];
const OPTIONAL=['php-capture','published-site','previous-report','owner-edit-review','static-export','public-http-evidence','public-media-evidence','delivery-status','visual-review-status','public-media-digests'];
function parse(argv){
 const opts={};
 if(!Array.isArray(argv)||argv.length<REQUIRED.length*2||
  argv.length>(REQUIRED.length+OPTIONAL.length)*2||argv.length%2)
  throw Error('Usage: node stage3/seo-engine/bin/first-site-check.cjs --approved-site /ABS/SEALED --blueprint /ABS/blueprint.json --origin http://127.0.0.1:PORT/published/SITE-ID/ --evidence /ABS/new-evidence --report /ABS/new-report [--php-capture /ABS/lead/evidence.json] [--published-site /ABS/owner-exported-published-site.json] [--previous-report /ABS/previous-report] [--owner-edit-review /ABS/manual-owner-review.json] [--static-export /ABS/official-static-release] [--public-http-evidence /ABS/public-http-transcript.json] [--public-media-evidence /ABS/public-media-transcript.json] [--delivery-status /ABS/private-owner-delivery.json] [--visual-review-status /ABS/private-owner-visual-review.json] [--public-media-digests /ABS/public-media-sha256.json]');
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
    !Number.isSafeInteger(input.version)||input.version<1||input.version>999999999||
    input.sourceRevision!==undefined&&(!Number.isSafeInteger(input.sourceRevision)||input.sourceRevision<1))
  throw Error('Published-site JSON requires {site:SiteV1, version:int} from the authenticated owner API');
 return {site:input.site,version:input.version,sourceRevision:input.sourceRevision??null};
}
function readOwnerEditReview(file){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<100||stat.size>6000)
  throw Error('Owner-edited published site review must be a bounded local JSON file');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function fileSha256(file){
 const st=fs.lstatSync(file);
 if(st.isSymbolicLink()||!st.isFile()||st.size>36000000)
  throw Error('Input evidence file changed into unsafe storage');
 return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function readPublicEvidence(file,kind){
 const st=fs.lstatSync(file);
 const max=kind==='http'?36000000:1800000;
 if(st.isSymbolicLink()||!st.isFile()||st.size<50||st.size>max)
  throw Error('Invalid bounded public '+kind+' transcript file');
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 (kind==='http'?DELIVERY:MEDIA).assertEvidence(data);
 return data;
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
 if(o['visual-review-status']&&(!published||!published.sourceRevision))
  throw Error('--visual-review-status requires pinned published owner sourceRevision');
 if(o['delivery-status']&&!published)
  throw Error('--delivery-status requires a pinned --published-site owner API JSON');
 if(o['public-media-digests']&&!o['static-export'])
  throw Error('--public-media-digests requires a verified --static-export from the same owner release');
 if(o['static-export']&&(!published||!published.sourceRevision))
  throw Error('--static-export requires an owner published-site API record with version and sourceRevision');
 if(o['owner-edit-review']&&!published)
  throw Error('--owner-edit-review requires --published-site for the current CMS release');
 const ownerReview=o['owner-edit-review']?readOwnerEditReview(o['owner-edit-review']):null;
 const {site,source}=published?BRIDGE.reconcile(approved,published.site,published.version,ownerReview):approved;
 if(source.ownerEditedAfterImport&&o['php-capture'])
  throw Error('Lead sealed-source screenshot evidence cannot be reused as source-bound proof of an owner-edited publication');
 PHP.baseUrl(o.origin,site.siteId); // Strict localhost published mount; no outgoing requests.
 const evidence=newTarget(o.evidence,o['approved-site']);
 const report=newTarget(o.report,o['approved-site'],evidence);
 const publicHttp=o['public-http-evidence']?readPublicEvidence(o['public-http-evidence'],'http'):null;
 const publicMedia=o['public-media-evidence']?readPublicEvidence(o['public-media-evidence'],'media'):null;
 if(publicHttp&&publicHttp.siteId!==site.siteId||publicMedia&&publicMedia.siteId!==site.siteId)
  throw Error('Public transcript Site ID differs from the verified first-site source');
 if(publicHttp&&publicMedia&&new URL(publicHttp.origin).href!==new URL(publicMedia.origin).href)
  throw Error('Supplied public HTTP and media evidence point to different origins');
 const publicHttpSha=o['public-http-evidence']?fileSha256(o['public-http-evidence']):null;
 const publicMediaSha=o['public-media-evidence']?fileSha256(o['public-media-evidence']):null;
 const deliveryStatusSha=o['delivery-status']?fileSha256(o['delivery-status']):null;
 const visualStatusSha=o['visual-review-status']?fileSha256(o['visual-review-status']):null;
 const publicDigestsSha=o['public-media-digests']?fileSha256(o['public-media-digests']):null;
 const previous=o['previous-report']?PROGRESS.read(o['previous-report']):null;
 if(previous&&([report,evidence].some(target=>{
   const parent=fs.realpathSync(path.dirname(target));
   return target===previous.root||target.startsWith(previous.root+path.sep)||
    parent===previous.root||parent.startsWith(previous.root+path.sep);
  })))
  throw Error('Prior report must be a distinct read-only directory outside new capture outputs');
 // Validate the optional official PHP static export before acquiring any HTTP evidence.
 // A stale or tampered export must not waste the operator's capture run.
 let exportPreflight=null;
 if(o['static-export']){
  const preflight=exportPreflight=STATIC_EXPORT.read(o['static-export'],site);
  if(preflight.publishedVersion!==source.publishedVersion||
     preflight.sourceRevision!==published.sourceRevision)
   throw Error('Official static export version/sourceRevision differs from the owner CMS published release');
 }
 // Fail before localhost capture when public media receipts belong to a different
 // host or official release. A verification claim must never combine hosts.
 const publicMediaBytes=o['public-media-digests']?
  PUBLIC_BYTES.read(o['public-media-digests'],site,exportPreflight):null;
 if(publicMediaBytes&&[publicHttp?.origin,publicMedia?.origin].filter(Boolean)
   .some(origin=>new URL(origin).origin!==new URL(publicMediaBytes.origin).origin||
     new URL(origin).pathname!==new URL(publicMediaBytes.origin).pathname))
  throw Error('Public media SHA256 receipt and supplied HTTPS/HEAD evidence belong to different site origins or mounts');
 const publicStatic=exportPreflight&&publicHttp?
  PUBLIC_STATIC.review(site,exportPreflight,publicHttp,publicMedia,publicMediaBytes):null;
 const blueprint=readBlueprint(o.blueprint),registry=manifests();
 if(blueprint.siteId!==site.siteId)throw Error('First-site approved source and Blueprint site IDs differ');
 // Fail early on incompatible source contracts, not after downloading images.
 auditSite(site,registry,blueprint);
 // Optional official lead capture is read-only and validated before any new HTTP acquisition.
 const screenshots=o['php-capture']?PHP_CAPTURE.read(o['php-capture'],site,source):null;
 if(screenshots&&screenshots.baseUrl!==o.origin)
  throw Error('Lead PHP screenshot evidence and HTML capture target different origins/mounts');
 const observed=await PHP.capture(o['approved-site'],o.origin,evidence,
  published?{...published,review:ownerReview}:null);
 const latestPublished=o['published-site']?readPublishedSite(o['published-site']):null;
 const latestReview=o['owner-edit-review']?readOwnerEditReview(o['owner-edit-review']):null;
 if(JSON.stringify(latestReview)!==JSON.stringify(ownerReview))
  throw Error('Owner review file changed during local PHP capture; discard this evidence');
 const originalFresh=BRIDGE.load(o['approved-site']);
 if(published&&latestPublished?.sourceRevision!==published.sourceRevision)
  throw Error('CMS published sourceRevision changed during evidence acquisition; discard capture');
 const fresh=latestPublished?BRIDGE.reconcile(originalFresh,latestPublished.site,
  latestPublished.version,latestReview):originalFresh;
 if(fresh.source.fileSha256!==source.fileSha256||
    fresh.source.siteRevisionFingerprint!==source.siteRevisionFingerprint||
    fresh.source.publishedVersion!==source.publishedVersion)
  throw Error('Sealed site source changed during local PHP evidence acquisition; discard evidence and rerun');
 const checked=PHP.read(evidence,fresh.site,fresh.source,o['static-export']||null);
 if(exportPreflight&&checked.localStaticExport?.staticManifestSha256!==exportPreflight.manifestSha256)
  throw Error('Official static export manifest changed during PHP HTTP capture; discard mixed evidence');
 if(publicHttpSha&&fileSha256(o['public-http-evidence'])!==publicHttpSha||
    publicMediaSha&&fileSha256(o['public-media-evidence'])!==publicMediaSha||
    deliveryStatusSha&&fileSha256(o['delivery-status'])!==deliveryStatusSha||
    visualStatusSha&&fileSha256(o['visual-review-status'])!==visualStatusSha||
    publicDigestsSha&&fileSha256(o['public-media-digests'])!==publicDigestsSha)
  throw Error('Public evidence file changed during PHP capture; discard mixed source report');
 if(checked.localStaticExport&&checked.localStaticExport.sourceRevisionClaim!==published.sourceRevision)
  throw Error('Official static export sourceRevision conflicts with owner CMS published sourceRevision');
 if(!PHP.isVerified(checked))throw Error('First-site PHP evidence was not source-bound verified');
 let ownerVisualReview=null;
 if(o['visual-review-status']){
  const stat=fs.lstatSync(o['visual-review-status']);
  if(stat.isSymbolicLink()||!stat.isFile()||stat.size<50||stat.size>300000)
   throw Error('Unsafe or oversized owner visual-review API JSON file');
  ownerVisualReview=VISUAL.review(fresh.site,
   JSON.parse(fs.readFileSync(o['visual-review-status'],'utf8')),published.sourceRevision);
 }
 let deliveryReadiness=null;
 if(o['delivery-status']){
  const stat=fs.lstatSync(o['delivery-status']);
  if(stat.isSymbolicLink()||!stat.isFile()||stat.size<50||stat.size>100000)
   throw Error('Unsafe or oversized owner delivery-status JSON file');
  deliveryReadiness=DELIVERY_READY.review(fresh.site,
   JSON.parse(fs.readFileSync(o['delivery-status'],'utf8')),fresh.source.publishedVersion);
 }
 const bundle=PACKAGE.build(fresh.site,registry,blueprint,{
  approvedSource:fresh.source,phpHtml:checked,snapshot:checked.snapshot,
  ...(screenshots?{phpCapture:screenshots}:{}),
  ...(publicHttp?{delivery:publicHttp}:{}),
  ...(publicMedia?{media:publicMedia}:{}),
  ...(ownerVisualReview?{visualReview:ownerVisualReview}:{}),
  ...(deliveryReadiness?{deliveryReadiness}:{}),
  ...(publicStatic?{publicStatic}:{}),
  ...(publicMediaBytes?{publicMediaBytes}:{})
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
  ownerPublishedSourceRevisionClaim:latestPublished?.sourceRevision??null,
  cmsImportMediaIdsReconciled:fresh.source.approvedMediaIdRemappingChecked===true,
  cmsMediaFilesMapped:fresh.source.mappedPublishedMediaFiles??null,
  cmsPublishedSiteMatchesApprovedAfterRemap:fresh.source.publishedContentAfterMediaRemapMatched===true,
  ownerEditedAfterImport:fresh.source.ownerEditedAfterImport===true,
  ownerEditReviewSupplied:Boolean(fresh.source.ownerEditReview),
  currentPublishedRevisionClientApproved:false,
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
   redirects:checked.publication?.redirectResponses??null,
   publicUnknownRouteStatus:publicHttp?.negativeProbe?.status??null,
   unknownRouteSoft404Detected:Boolean(publicHttp?.negativeProbe&&
    ![404,410].includes(publicHttp.negativeProbe.status)),
   publicRootWindowRechecked:Boolean(publicHttp?.rootRecheck),
   publicRootWindowStable:publicHttp?.rootRecheck?.matched??null,
   internalFileProbes:publicHttp?.securityProbes?.length??null,
   publiclyExposedOperatorArtifacts:publicHttp?.securityProbes?.filter(x=>x.status>=200&&x.status<300).length??null,
   publicReleaseMarkerValid:publicHttp?.publicReleaseMarker?.valid??null},
  media:{observed:checked.localMedia?.capturedResources??null,
   comparedAgainstSealedSiteSha256:checked.localMedia?.sealedMediaBytesCompared??false,
   actualFindings:checked.localMedia?.findings.length??null},
  theme:{pagesChecked:checked.localTheme?.checkedPages??null,
   cssVariablesChecked:checked.localTheme?.expectedCssVariables??null,
   actualFindings:checked.localTheme?.findings.length??null,
   pixelParityVerified:false},
  publicMediaBytes:{supplied:Boolean(publicMediaBytes),
   comparedOriginalsAndResponsiveVariants:publicMediaBytes?.comparedOriginalsAndResponsiveVariants??null,
   checkedResources:publicMediaBytes?.capturedResources??null,
   officialResources:publicMediaBytes?.expectedMediaResources??null,
   sha256Mismatches:publicMediaBytes?.findings.length??null,
   allCapturedByteDigestsMatch:publicMediaBytes?.allCapturedByteDigestsMatch??null,
   hostProvenanceAuthenticated:false},
  publicStaticParity:{compared:Boolean(publicStatic),
   scope:publicStatic?.comparisonScope??null,comparable:publicStatic?.comparable??null,
   observedPages:publicStatic?.checkedPages??null,
   checkedMedia:publicStatic?.checkedMedia??null,
   declaredResponsiveVariants:publicStatic?.declaredResponsiveVariants??null,
   sha256VerifiedResponsiveVariants:publicStatic?.sha256VerifiedResponsiveVariants??null,
   searchFiles:publicStatic?.checkedSearchFiles??null,
   redirects:publicStatic?.checkedRedirects??null,
   privateArtifactProbes:publicStatic?.internalArtifactProbes??null,
   publiclyExposedOperatorFiles:publicStatic?.internalArtifactPublicHttp200??null,
   publiclyExposedOperatorFileResponses2xx:publicStatic?.internalArtifactPublicSuccess2xx??null,
   publicReleaseFingerprintMatched:publicStatic?.publicReleaseMarkerMatched??null,
   publicVsOfficialExportFindings:publicStatic?.findings.length??null,
   publicHostAuthenticated:false,clientReleaseApproved:false},
  publicTranscript:{httpSupplied:Boolean(publicHttp),mediaSupplied:Boolean(publicMedia),
   httpsOriginClaim:publicHttp?.origin??publicMedia?.origin??null,
   httpFindings:bundle.deliveryEvidence?.findings.length??null,
   mediaFindings:bundle.mediaEvidence?.findings.length??null,
   requestProvenanceAuthenticated:false,networkCapturePerformedBySeoEngine:false},
  staticExport:{supplied:Boolean(checked.localStaticExport),
   matchingContentAndMedia:checked.localStaticExport?.contentAndMediaMatched??null,
   sha256CheckedFiles:checked.localStaticExport?.verifiedExportFiles??null,
   staticManifestSha256:checked.localStaticExport?.staticManifestSha256??null,
   staticLinkReferencesChecked:checked.localStaticExport?.staticReferencesChecked??null,
   staticFormsChecked:checked.localStaticExport?.checkedFormSections??null,
   staticSeoPagesChecked:checked.localStaticExport?.staticSeoPages?.length??null,
   searchFilesChecked:checked.localStaticExport?.exportedSearchFilesVerified??null,
   actualFindings:checked.localStaticExport?.findings.length??null,
   authenticatedServedRevision:false},
  payload:{pagesChecked:checked.localFootprint?.checkedPages??null,
   actualFindings:checked.localFootprint?.findings.length??null,
   compressedOrWebVitalsMeasured:false},
  semantics:{pagesChecked:checked.localSemantics?.checkedPages??null,
   linksChecked:checked.localSemantics?.checkedLinks??null,
   imagesChecked:checked.localSemantics?.checkedImages??null,
   actualFindings:checked.localSemantics?.findings.length??null},
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
  visualReview:{supplied:Boolean(ownerVisualReview),
   publishedSourceRevisionClaim:published?.sourceRevision??null,
   visualNotesForPinnedRevision:ownerVisualReview?.checkedFindingCount??null,
   openFindings:ownerVisualReview?.openCount??null,
   resolvedFindings:ownerVisualReview?.resolvedCount??null,
   affectedPageCount:ownerVisualReview?.pagesWithOpenFindings??null,
   clientApprovalVerified:false,operatorNotesExposed:false},
  deliveryReadiness:{supplied:Boolean(deliveryReadiness),
   expectedPublishedVersion:fresh.source.publishedVersion??null,
   publishedFormsChecked:deliveryReadiness?.checkedForms??null,
   configuredNotificationForms:deliveryReadiness?.configuredForms??null,
   ownerConfigurationFindings:deliveryReadiness?.findings.length??null,
   recipientsExposed:false,actualPostPerformed:false,deliveryVerified:false},
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
  operatorConfirmedFixes:0,
  observedPhpEtagOrHtmlChanges:delta.summary.observedPhpEtagOrHtmlChanges,
  sameEtagButDifferentHtml:delta.summary.sameEtagButDifferentHtml,
  publicHtmlOrEtagChanges:delta.summary.publicHtmlOrEtagChanges,
  samePublicEtagButDifferentHtml:delta.summary.samePublicEtagButDifferentHtml
 };
 const body=JSON.stringify(bundle,null,2)+'\n',brief=JSON.stringify(summary,null,2)+'\n';
 if(body.length>40000000)throw Error('First-site review bundle is too large; inspect inputs rather than publishing a truncated report');
 fs.mkdirSync(report,{mode:0o700});
 fs.writeFileSync(path.join(report,'bundle.json'),body,{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(report,'handoff.md'),bundle.markdownHandoff+'\n',{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(report,'summary.json'),brief,{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(report,'launch-worksheet.md'),worksheet.markdown+'\n',{flag:'wx',mode:0o600});
 if(delta){
  fs.writeFileSync(path.join(report,'delta.md'),delta.markdown+'\n',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(report,'delta.json'),JSON.stringify({...delta,markdown:undefined},null,2)+'\n',{flag:'wx',mode:0o600});
 }
 return {evidence,report,summary};
}
if(require.main===module)
 main(process.argv.slice(2))
  .then(result=>process.stdout.write('FIRST SITE LOCAL TECHNICAL REVIEW: '+JSON.stringify(result)+'\n'))
  .catch(e=>{process.stderr.write('SEO first-site check: '+e.message+'\n');process.exitCode=1;});
module.exports=Object.freeze({parse,newTarget,readBlueprint,readPublishedSite,readOwnerEditReview,readPublicEvidence,main});
