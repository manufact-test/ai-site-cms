'use strict';
// One read-only integration envelope for the lead developer and next chat.
// Deliberately not a CMS extension, deployed scanner, or automatic approval.
const {checkBlueprint}=require('./blueprint.cjs');
const {auditSite}=require('./analyze.cjs');
const {report:reviewArchitecture}=require('./architecture.cjs');
const {review:reviewHtml}=require('./html-evidence.cjs');
const {review:reviewViewports}=require('./viewport-evidence.cjs');
const {compare:compareSite}=require('./regression.cjs');
const {compare:compareHtml}=require('./parity.cjs');
const {review:reviewPublication}=require('./publication-integrity.cjs');
const {propose}=require('./handoff.cjs');
const {work}=require('./remediation.cjs');
const {assess}=require('./release-review.cjs');
const {write:renderMarkdown}=require('./reporter.cjs');
const TRACE=require('./traceability.cjs');
const TRIAGE=require('./triage.cjs');
const DELIVERY=require('./delivery-evidence.cjs');
const EXECUTION=require('./execution-plan.cjs');
const MEDIA=require('./media-delivery.cjs');
const CMS_PACKET=require('./cms-change-packet.cjs');
const CAPTURE=require('./capture-plan.cjs');
const CONSISTENCY=require('./evidence-consistency.cjs');
const ACCEPTANCE=require('./acceptance.cjs');
const APPROVED_SITE=require('./approved-site-bridge.cjs');
const PHP_CAPTURE=require('./php-capture.cjs');
const PHP_HTML=require('./php-html-capture.cjs');
const PROGRESS=require('./task-progress.cjs');
const MIGRATION=require('./route-migration.cjs');
const IMPACT=require('./change-impact.cjs');
const DOSSIER=require('./lead-dossier.cjs');
const FORMAT='manufact-seo-review-bundle-v1';
const PUBLIC_STATIC=require('./public-static-parity.cjs');
const PUBLIC_BYTES=require('./public-media-byte-verification.cjs');
function build(site,manifests,blueprint,options={}){
 const plan=checkBlueprint(blueprint);
 if(!site||site.siteId!==plan.siteId)throw Error('Review package siteId mismatch');
 if(!Array.isArray(manifests))throw Error('Review package requires current manifests');
 if(!options||typeof options!=='object'||Array.isArray(options)||
    Object.keys(options).some(k=>!['snapshot','viewports','baselineSite','decisions','priorDecisions','delivery','media','acceptance','approvedSource','phpCapture','phpHtml','deliveryReadiness','publicStatic','publicMediaBytes'].includes(k)))
  throw Error('Unsupported review-package options');
 // A sealed package is verified by the lead CLI before this read-only review.
 const approvedSource=options.approvedSource||null;
 if(approvedSource&&(!APPROVED_SITE.isVerifiedSource(approvedSource)||
  approvedSource.format!=='manufact-seo-approved-site-source-v1'||
  approvedSource.siteId!==site.siteId||
  approvedSource.siteRevisionFingerprint!==ACCEPTANCE.fingerprint(site)||
  approvedSource.integrity!=='sha256-verified-at-read'))
  throw Error('Approved Site source metadata does not match the reviewed Site v1');
 if(options.phpCapture&&(!approvedSource||!PHP_CAPTURE.isVerifiedCapture(options.phpCapture)||
    options.phpCapture.siteId!==site.siteId||
    options.phpCapture.siteRevisionFingerprint!==ACCEPTANCE.fingerprint(site)||
    options.phpCapture.reviewedSealedSiteRawSha256!==approvedSource.fileSha256))
  throw Error('PHP screenshot evidence is not bound to a verified Approved Site v2 source');
 if(options.phpHtml&&(!approvedSource||!PHP_HTML.isVerified(options.phpHtml)||
    options.phpHtml.siteId!==site.siteId||
    options.phpHtml.sourceSiteSha256!==approvedSource.fileSha256||
    options.phpHtml.sourceSiteFingerprint!==ACCEPTANCE.fingerprint(site)||
    options.snapshot!==options.phpHtml.snapshot))
  throw Error('Local PHP HTML evidence must be the verified capture snapshot for this sealed Site v2 source');
 if(options.deliveryReadiness&&
   (options.deliveryReadiness.format!=='manufact-seo-owner-form-delivery-readiness-v1'||
    options.deliveryReadiness.siteId!==site.siteId||
    options.deliveryReadiness.pinnedPublishedVersion!==approvedSource?.publishedVersion))
  throw Error('Form delivery status report not bound to pinned owner-published Site v1 version');
 if(options.publicMediaBytes&&(!PUBLIC_BYTES.isVerified(options.publicMediaBytes)||
   options.publicMediaBytes.siteId!==site.siteId||!options.phpHtml?.localStaticExport))
  throw Error('Public media SHA256 report must originate from the pinned verified static export');
 if(options.publicStatic&&(!PUBLIC_STATIC.isVerified(options.publicStatic)||
   options.publicStatic.siteId!==site.siteId||
   !options.phpHtml?.localStaticExport||!options.delivery))
  throw Error('Public static parity must come from the verified export and matching public HTTP evidence');
 if(options.phpHtml&&options.phpCapture&&
    (options.phpHtml.baseUrl!==options.phpCapture.baseUrl||
     options.phpHtml.pageCount!==options.phpCapture.pages.length||
     options.phpHtml.packageVersion!==options.phpCapture.packageVersion))
  throw Error('PHP screenshot and PHP HTML captures describe different local site instances or versions');
 // Validate with authoritative core first, not just the loosely typed SEO blueprint.
 const audit=auditSite(site,manifests,plan);
 const architecture=reviewArchitecture(plan);
 const evidence=options.snapshot?reviewHtml(options.snapshot,plan):null;
 const viewports=options.viewports?reviewViewports(options.viewports,plan):null;
 const regression=options.baselineSite?compareSite(options.baselineSite,site,manifests,plan):null;
 const published=options.snapshot?compareHtml(site,plan,options.snapshot):null;
 const publication=options.snapshot?reviewPublication(site,options.snapshot):null;
 const delivery=options.delivery?DELIVERY.review(site,options.delivery):null;
 const media=options.media?MEDIA.review(site,options.media,options.snapshot):null;
 const evidenceConsistency=CONSISTENCY.review(site,options);
 const handoff=propose(site,manifests,plan);
 const {decisions:ledger,priorDecisions:historyLedger,acceptance:acceptanceLedger,approvedSource:verifiedSource,...coreOptions}=options;
 const backlog=work(site,manifests,plan,coreOptions);
 const release=assess(site,manifests,plan,{...coreOptions,
  ownerEditedSource:approvedSource?.ownerEditedAfterImport===true,
  ...(acceptanceLedger?{acceptance:acceptanceLedger}:{})},backlog);
 const decisions=ledger?TRIAGE.reconcile(backlog,ledger):null;
 const execution=EXECUTION.compile(backlog,decisions);
 const cmsChangePacket=CMS_PACKET.build(site,manifests,plan,backlog,decisions);
 const acceptanceReview=acceptanceLedger?ACCEPTANCE.review(site,plan,acceptanceLedger):null;
 const taskProgress=options.baselineSite?PROGRESS.compare(options.baselineSite,site,manifests,plan,historyLedger||null):null;
 const routeMigration=options.baselineSite?MIGRATION.review(options.baselineSite,site,manifests,plan):null;
 const changeImpact=ledger?IMPACT.preview(site,manifests,plan,backlog,decisions):null;
 const declaredOrigins=[options.delivery?.origin,options.media?.origin].filter(Boolean);
 const originsAgree=new Set(declaredOrigins.map(x=>new URL(x).href)).size<=1;
 const capturePlan=CAPTURE.build(site,plan,originsAgree?declaredOrigins[0]||null:null,routeMigration);
 const traceability=TRACE.report(site,plan,{
  ...(options.snapshot?{snapshot:options.snapshot}:{}),
  ...(options.viewports?{viewports:options.viewports}:{}),
  ...(options.delivery?{delivery:options.delivery}:{}),
  ...(options.media?{media:options.media}:{})},audit,backlog,decisions);
 const expected=plan.pages.map(p=>p.id),fromSite=new Set(site.pages.map(p=>p.id));
 const exported=new Set((options.snapshot?.pages||[]).map(p=>p.id));
 const deviceIds=new Set((options.viewports?.pages||[]).map(p=>p.id));
 const missingExport=expected.filter(id=>!exported.has(id));
 const missingDevice=expected.filter(id=>!deviceIds.has(id));
 const acceptedFormats={
  site:'manufact-ai-site-v1',blueprint:plan.format,
  snapshot:options.snapshot?.format||null,
  viewports:options.viewports?.format||null
 };
 const coverage={plannedPageCount:expected.length,sitePageCount:site.pages.length,
  suppliedPublicOriginsAgree:originsAgree,
  migrationOldPathsNeedingHttp301:routeMigration?.summary.renamedPages??null,
  plannedPagesAbsentFromSite:expected.filter(id=>!fromSite.has(id)),
  htmlExportPageCount:options.snapshot?.pages?.length??null,
  htmlExportCompleteness:options.snapshot?.completeness||'partial-or-unknown',
  plannedPagesAbsentFromHtmlExport:options.snapshot?missingExport:null,
  viewportsPageCount:options.viewports?.pages?.length??null,
  plannedPagesAbsentFromThreeDeviceExport:options.viewports?missingDevice:null,
  actualVisualComparisonPerformed:false,liveHttpVerified:false,sitePublished:false,
  suppliedHttpPages:delivery?.coverage.capturedPages??null,
  declaredPublicOrigin:delivery?.origin??null,
  httpEvidenceProvenanceVerified:false,
  suppliedMediaResources:media?.coverage.capturedKnownResources??null,
  prototypeApprovalLedgerProvided:Boolean(acceptanceLedger),
  historicalTaskComparisonPerformed:Boolean(taskProgress),
  blueprintRevisionFingerprint:ACCEPTANCE.fingerprint(plan),
  siteRevisionFingerprint:ACCEPTANCE.fingerprint(site),
  sealedSourceVerifiedAtRead:Boolean(approvedSource),
  sealedSourceRawSiteSha256:approvedSource?.fileSha256??null,
  originalApprovedSiteFingerprint:approvedSource?.originalApprovedSiteFingerprint??null,
  approvedPrototypePageReferences:approvedSource?.availablePrototypePageCount??null,
  missingApprovedInteriorPageReferences:approvedSource?.missingInteriorPrototypePageIds??null,
  loopbackPhpScreenshotPages:options.phpCapture?.pages.length??null,
  cmsImportedSiteAfterMediaRemapMatched:approvedSource?.publishedContentAfterMediaRemapMatched??null,
  ownerEditedAfterImport:approvedSource?.ownerEditedAfterImport??null,
  ownerEditReviewSupplied:Boolean(approvedSource?.ownerEditReview),
  currentPublishedRevisionClientApproved:false,
  cmsImportedMediaResourcesMapped:approvedSource?.mappedPublishedMediaFiles??null,
  cmsOwnerSuppliedPublishedVersion:approvedSource?.publishedVersion??null,
  loopbackPhpHtmlPages:options.phpHtml?.pageCount??null,
  loopbackPhpHtmlSha256Checked:Boolean(options.phpHtml),
  loopbackPhpHtmlHttp200:options.phpHtml?.loopbackHttp200Count??null,
  loopbackPhpHtmlSourceRevisionAuthenticated:false,
  localPhpRobotsStatus:options.phpHtml?.publication?.robotsStatus??null,
  localPhpSitemapStatus:options.phpHtml?.publication?.sitemapStatus??null,
  localPhpRedirectResponses:options.phpHtml?.publication?.redirectResponses??null,
  localPhpMediaResources:options.phpHtml?.localMedia?.capturedResources??null,
  localPhpMediaBytesChecked:options.phpHtml?.localMedia?.savedBodyBytes??null,
  localPhpMediaSealedShaCompared:options.phpHtml?.localMedia?.sealedMediaBytesCompared??null,
  localPhpMediaFindings:options.phpHtml?.localMedia?.findings.length??null,
  localPhpHeadFindings:options.phpHtml?.localHead?.findings.length??null,
  localPhpTypedComponentsChecked:options.phpHtml?.localComponents?.checkedTypedSections??null,
  localPhpGraphNodesChecked:options.phpHtml?.localGraph?.checkedNodes??null,
  localPhpGraphFindings:options.phpHtml?.localGraph?.findings.length??null,
  localPhpNavFindings:options.phpHtml?.localNavigation?.findings.length??null,
  localPhpThemeFindings:options.phpHtml?.localTheme?.findings.length??null,
  localPhpSemanticFindings:options.phpHtml?.localSemantics?.findings.length??null,
  localPhpLinksChecked:options.phpHtml?.localSemantics?.checkedLinks??null,
  localPhpFootprintFindings:options.phpHtml?.localFootprint?.findings.length??null,
  localPhpExportFindings:options.phpHtml?.localStaticExport?.findings.length??null,
  publicStaticDeploymentFindings:options.publicStatic?.findings.length??null,
  publicMediaByteMismatches:options.publicMediaBytes?.findings.length??null,
  publicMediaByteResources:options.publicMediaBytes?.capturedResources??null,
  publicStaticPagesCompared:options.publicStatic?.checkedPages??null,
  localPhpComponentFindings:options.phpHtml?.localComponents?.findings.length??null,
  localPhpHeadHeaders:options.phpHtml?.localHead?.pagesWithRecordedHeaders??null,
   localPhpFormCount:options.phpHtml?.localForms?.observedForms??null,
   localPhpFormFindings:options.phpHtml?.localForms?.findings.length??null,
  ownerFormDeliveryFindings:options.deliveryReadiness?.findings.length??null,
  ownerFormsWithConfiguredChannels:options.deliveryReadiness?.configuredForms??null,
  localPhpObservedPublicOrigin:options.phpHtml?.localHead?.publicOriginObservedInSitemap??null,
  screenshotFileDigestsChecked:Boolean(options.phpCapture),
  screenshotCaptureExactSiteRevisionProven:false,
  publicHttpsAndSeoHeadVerified:false};
 const dossier=DOSSIER.build({siteId:site.siteId,release,coverage,acceptanceReview,
  taskProgress,changeImpact,executionPlan:execution,cmsChangePacket,traceability,
  capturePlan,deliveryEvidence:delivery,mediaEvidence:media,routeMigration,phpCapture:options.phpCapture||null});
 const rejected=new Set(decisions?.rejected.map(x=>x.taskId)||[]);
 const approved=new Set(decisions?.approved.map(x=>x.taskId)||[]);
 const deferred=new Set(decisions?.deferred.map(x=>x.taskId)||[]);
 const nextActions=backlog.tasks.filter(t=>!rejected.has(t.taskId)&&!deferred.has(t.taskId)).slice(0,12).map(task=>({
  taskId:task.taskId,priority:task.priority,owner:task.owner,
  category:task.category,pageId:task.pageId,dependsOn:task.dependsOn,
  instruction:task.instruction,decision:approved.has(task.taskId)?'approved-for-manual-work':deferred.has(task.taskId)?'deferred':'unreviewed',automatic:false
 }));
 return {format:FORMAT,version:1,siteId:site.siteId,readOnly:true,
  contract:acceptedFormats,coverage,approvedSiteSource:approvedSource,phpCapture:options.phpCapture||null,
  localPhpHead:options.phpHtml?.localHead?{
    format:options.phpHtml.localHead.format,
    publicOriginObservedInSitemap:options.phpHtml.localHead.publicOriginObservedInSitemap,
    developmentOnlyOrigin:options.phpHtml.localHead.developmentOnlyOrigin,
    observedLocalPages:options.phpHtml.localHead.observedLocalPages,
    pagesWithRecordedHeaders:options.phpHtml.localHead.pagesWithRecordedHeaders,
    pages:options.phpHtml.localHead.pages,
    findings:options.phpHtml.localHead.findings,
    publicHttpsProven:false,releaseAuthorized:false
  }:null,
  publicMediaBytes:options.publicMediaBytes?{
    format:options.publicMediaBytes.format,
    siteId:options.publicMediaBytes.siteId,
    officialStaticManifestSha256:options.publicMediaBytes.officialStaticManifestSha256,
    origin:options.publicMediaBytes.origin,
    publishedVersion:options.publicMediaBytes.publishedVersion,
    expectedMediaResources:options.publicMediaBytes.expectedMediaResources,
    capturedResources:options.publicMediaBytes.capturedResources,
    comparedOriginalsAndResponsiveVariants:true,
    receivedBytes:options.publicMediaBytes.receivedBytes,
    resources:options.publicMediaBytes.resources,
    findings:options.publicMediaBytes.findings,
    allCapturedByteDigestsMatch:options.publicMediaBytes.allCapturedByteDigestsMatch,
    publicHostProvenanceAuthenticated:false
  }:null,
  publicStaticParity:options.publicStatic?{
   format:options.publicStatic.format,
   claimedPublicOrigin:options.publicStatic.claimedPublicOrigin,
   officialPublicOrigin:options.publicStatic.officialPublicOrigin,
   comparisonScope:options.publicStatic.comparisonScope,
   comparable:options.publicStatic.comparable,
   verifiedStaticPublishedVersion:options.publicStatic.verifiedStaticPublishedVersion??null,
   verifiedStaticManifestSha256:options.publicStatic.verifiedStaticManifestSha256??null,
   checkedPages:options.publicStatic.checkedPages,
   checkedMedia:options.publicStatic.checkedMedia,
   declaredResponsiveVariants:options.publicStatic.declaredResponsiveVariants??null,
   sha256VerifiedResponsiveVariants:options.publicStatic.sha256VerifiedResponsiveVariants??null,
   checkedSearchFiles:options.publicStatic.checkedSearchFiles,
   checkedRedirects:options.publicStatic.checkedRedirects,
   negativeRouteStatus:options.publicStatic.negativeRouteStatus??null,
   negativeRouteProbed:options.publicStatic.negativeRouteProbed??false,
   publicRootWindowRechecked:options.publicStatic.publicRootWindowRechecked??false,
   publicRootWindowStable:options.publicStatic.publicRootWindowStable??null,
   internalArtifactProbes:options.publicStatic.internalArtifactProbes??0,
   internalArtifactPublicHttp200:options.publicStatic.internalArtifactPublicHttp200??null,
   pages:options.publicStatic.pages,
   assets:options.publicStatic.assets,
   auxiliary:options.publicStatic.auxiliary,
   findings:options.publicStatic.findings,
   httpTranscriptAuthenticated:false,publicSiteApproval:false
  }:null,
  localPhpStaticExport:options.phpHtml?.localStaticExport?{
    format:options.phpHtml.localStaticExport.format,
    publishedVersion:options.phpHtml.localStaticExport.publishedVersion,
    sourceRevisionClaim:options.phpHtml.localStaticExport.sourceRevisionClaim,
    verifiedExportFiles:options.phpHtml.localStaticExport.verifiedExportFiles,
    exportedSearchFilesVerified:options.phpHtml.localStaticExport.exportedSearchFilesVerified,
    staticReferencesChecked:options.phpHtml.localStaticExport.staticReferencesChecked,
    checkedFormSections:options.phpHtml.localStaticExport.checkedFormSections,
    staticForms:options.phpHtml.localStaticExport.staticForms,
    staticSeoPages:options.phpHtml.localStaticExport.staticSeoPages,
    checkedPages:options.phpHtml.localStaticExport.checkedPages,
    checkedAssets:options.phpHtml.localStaticExport.checkedAssets,
    pages:options.phpHtml.localStaticExport.pages,
    assets:options.phpHtml.localStaticExport.assets,
    findings:options.phpHtml.localStaticExport.findings,
    servedRevisionAuthenticated:false,clientApprovalVerified:false
   }:null,
  localPhpFootprint:options.phpHtml?.localFootprint?{
    format:options.phpHtml.localFootprint.format,
    pages:options.phpHtml.localFootprint.pages,
    thresholds:options.phpHtml.localFootprint.thresholds,
    findings:options.phpHtml.localFootprint.findings,
    actualWebVitalsMeasured:false,publicHttpsVerified:false
   }:null,
  localPhpSemantics:options.phpHtml?.localSemantics?{
    format:options.phpHtml.localSemantics.format,
    checkedPages:options.phpHtml.localSemantics.checkedPages,
    checkedLinks:options.phpHtml.localSemantics.checkedLinks,
    checkedImages:options.phpHtml.localSemantics.checkedImages,
    checkedAriaReferences:options.phpHtml.localSemantics.checkedAriaReferences,
    pages:options.phpHtml.localSemantics.pages,
    findings:options.phpHtml.localSemantics.findings,
    browserAccessibilityVerified:false,releaseAuthorized:false
   }:null,
  localPhpTheme:options.phpHtml?.localTheme?{
    format:options.phpHtml.localTheme.format,
    checkedPages:options.phpHtml.localTheme.checkedPages,
    expectedCssVariables:options.phpHtml.localTheme.expectedCssVariables,
    pages:options.phpHtml.localTheme.pages,
    findings:options.phpHtml.localTheme.findings,
    visualPixelParityChecked:false,releaseAuthorized:false
   }:null,
  localPhpNavigation:options.phpHtml?.localNavigation?{
    format:options.phpHtml.localNavigation.format,
    checkedPages:options.phpHtml.localNavigation.checkedPages,
    pages:options.phpHtml.localNavigation.pages,
    findings:options.phpHtml.localNavigation.findings,
    browserInteractionsTested:false,releaseAuthorized:false
   }:null,
  localPhpGraph:options.phpHtml?.localGraph?{
    format:options.phpHtml.localGraph.format,
    checkedSections:options.phpHtml.localGraph.checkedSections,
    checkedNodes:options.phpHtml.localGraph.checkedNodes,
    pages:options.phpHtml.localGraph.pages,
    findings:options.phpHtml.localGraph.findings,
    realBrowserParityChecked:false,releaseAuthorized:false
   }:null,
  localPhpComponents:options.phpHtml?.localComponents?{
    format:options.phpHtml.localComponents.format,
    checkedTypedSections:options.phpHtml.localComponents.checkedTypedSections,
    pages:options.phpHtml.localComponents.pages,
    findings:options.phpHtml.localComponents.findings,
    runtimeInteractionsTested:false,releaseAuthorized:false
   }:null,
  deliveryReadiness:options.deliveryReadiness?{
    format:options.deliveryReadiness.format,
    pinnedPublishedVersion:options.deliveryReadiness.pinnedPublishedVersion,
    checkedForms:options.deliveryReadiness.checkedForms,
    configuredForms:options.deliveryReadiness.configuredForms,
    formRoutesFromOwner:options.deliveryReadiness.formRoutesFromOwner,
    forms:options.deliveryReadiness.forms,
    findings:options.deliveryReadiness.findings,
    recipientsExposed:false,deliveryProven:false,ownerApiAuthenticated:false
   }:null,
  localPhpForms:options.phpHtml?.localForms?{
    format:options.phpHtml.localForms.format,
    expectedForms:options.phpHtml.localForms.expectedForms,
    observedForms:options.phpHtml.localForms.observedForms,
    checkedFormSections:options.phpHtml.localForms.checkedFormSections,
    consistentRelease:options.phpHtml.localForms.consistentRelease,
    pages:options.phpHtml.localForms.pages,
    findings:options.phpHtml.localForms.findings,
    actualPostPerformed:false,collectorChecked:false,deliveriesProven:false
   }:null,
   localPhpMedia:options.phpHtml?.localMedia?{
    format:options.phpHtml.localMedia.format,fullyCaptured:options.phpHtml.localMedia.fullyCaptured,
    savedBodyBytes:options.phpHtml.localMedia.savedBodyBytes,
    sealedMediaBytesCompared:options.phpHtml.localMedia.sealedMediaBytesCompared,
    capturedResources:options.phpHtml.localMedia.capturedResources,
    resources:options.phpHtml.localMedia.resources,
    findings:options.phpHtml.localMedia.findings,
    publicHttpsProven:false,releaseAuthorized:false
  }:null,
  localPhpPublication:options.phpHtml?.publication?{
    format:options.phpHtml.publication.format,
    robotsStatus:options.phpHtml.publication.robotsStatus,
    sitemapStatus:options.phpHtml.publication.sitemapStatus,
    redirectResponses:options.phpHtml.publication.redirectResponses,
    parsedSitemapPaths:options.phpHtml.publication.parsedSitemapPaths,
    findings:options.phpHtml.publication.findings,
    publicHttpsProven:false,releaseAuthorized:false
  }:null,
  phpHtmlCapture:options.phpHtml?{
    format:options.phpHtml.format,siteId:options.phpHtml.siteId,
    capturedAt:options.phpHtml.capturedAt,baseUrl:options.phpHtml.baseUrl,
    pageCount:options.phpHtml.pageCount,checkedHtmlBytes:options.phpHtml.checkedHtmlBytes,
    checkedAuxiliaryBytes:options.phpHtml.checkedAuxiliaryBytes,
    checkedMediaBytes:options.phpHtml.localMedia?.savedBodyBytes??null,
    loopbackHttp200Count:options.phpHtml.loopbackHttp200Count,
    sha256VerifiedAtRead:true,sourceSiteSha256:options.phpHtml.sourceSiteSha256,
    sourceRevisionAuthenticated:false,realPublicHttpsChecked:false,
    formsChecked:false,formMarkupChecked:Boolean(options.phpHtml.localForms),visualParityChecked:false
  }:null,
  blueprintReview:architecture,siteAudit:audit,
  htmlEvidence:evidence,htmlParity:published,publicationIntegrity:publication,deviceEvidence:viewports,
  traceability,decisions,acceptanceReview,taskProgress,routeMigration,changeImpact,leadDossier:dossier,deliveryEvidence:delivery,mediaEvidence:media,evidenceConsistency,executionPlan:execution,cmsChangePacket,capturePlan,
  regression,handoff,backlog,release,nextActions,
  // Retain the original remediation Markdown first for consumers depending on its header.
  markdownHandoff:DOSSIER.markdown(dossier)+
    (approvedSource?'\n\n## Sealed Approved Site v2 source (read-only)\n\n'+
     '- Lead source preflight: SHA-256 verified at read; not a client-identity or design-approval certificate.\n'+
     '- Source version: '+approvedSource.packageVersion+'; raw site.json SHA-256: '+approvedSource.fileSha256+'\n'+
     '- SEO canonical Site v1 fingerprint: '+approvedSource.siteRevisionFingerprint+
       ' (not the raw file digest).\n'+
     '- Homepage references: three sealed images; additional page-specific reference sets: '+
       (approvedSource.availablePrototypePageCount-1)+'.\n'+
     '- Interior pages without their own approved images: '+
       (approvedSource.missingInteriorPrototypePageIds.length?
         approvedSource.missingInteriorPrototypePageIds.join(', '):'none')+
       ' (do not substitute homepage mockups).\n'+
     '- Human approval, visual fidelity and real published HTTP remain unverified.\n'+
      (approvedSource.ownerEditedAfterImport?
        '- IMPORTANT: owner-edited published revision differs from original sealed Site v2. A version-bound local acknowledgement exists, but is not authenticated client design approval. Changed media are not compared against original sealed SHA-256; reapprove affected pages/assets before release.\n':''):'')+
    (options.phpCapture?'\n\n## Lead PHP full-page capture evidence (source-bound)\n\n'+
      '- Original lead Chromium capture: '+options.phpCapture.capturedAt+
        '; loopback URL: '+options.phpCapture.baseUrl+'\n'+
      '- PNG screenshot file SHA-256 checked: '+options.phpCapture.screenshotCount+
        '; checked pages: '+options.phpCapture.pages.length+'.\n'+
      '- Captured pages with missing-image warnings: '+options.phpCapture.warningPageIds.length+
        (options.phpCapture.warningPageIds.length?' ('+options.phpCapture.warningPageIds.join(', ')+')':'')+'.\n'+
      '- The lead capture JSON lacks the site.json digest: identical site revision at capture time is NOT cryptographically proven.\n'+
      '- Screenshots are NOT HTML/HTTP SEO head evidence; visual equality, forms and actual public HTTPS remain unverified.\n':'')+
    (options.phpHtml?'\n\n## Actual local PHP HTML evidence (read-only)\n\n'+
      '- PHP loopback: '+options.phpHtml.baseUrl+'; capture time: '+options.phpHtml.capturedAt+'\n'+
      '- HTTP 200 responses: '+options.phpHtml.loopbackHttp200Count+
        '; verified HTML files: '+options.phpHtml.pageCount+
        '; HTML bytes: '+options.phpHtml.checkedHtmlBytes+
        '; separately verified robots/sitemap/301 bytes: '+options.phpHtml.checkedAuxiliaryBytes+
        '; media binary bytes: '+(options.phpHtml.localMedia?.savedBodyBytes??'none')+'.\n'+
      '- SEO head, H1, links and indexation checked by existing HTML/parity modules against the captured bytes.\n'+
      (options.phpHtml.localStaticExport?
       '- Official static export: '+options.phpHtml.localStaticExport.verifiedExportFiles+' SHA-256 verified files, '+options.phpHtml.localStaticExport.checkedPages+' pages, '+options.phpHtml.localStaticExport.checkedAssets+' media files, '+options.phpHtml.localStaticExport.findings.length+' output drift(s). No server revision authentication.\n':'')+
      '- Loopback PHP HTTP header/canonical/og:url checks: '+(options.phpHtml.localHead?.findings.length??'not supplied')+' findings; public origin observed in local sitemap: '+(options.phpHtml.localHead?.publicOriginObservedInSitemap??'none')+'.\n'+
      '- Published PHP theme CSS variable check: '+(options.phpHtml.localTheme?.checkedPages??0)+' pages, '+(options.phpHtml.localTheme?.findings.length??0)+' findings.\n'+
       '- Actual PHP desktop/mobile navigation check: '+(options.phpHtml.localNavigation?.checkedPages??0)+' pages, '+(options.phpHtml.localNavigation?.findings.length??0)+' findings.\n'+
       '- Actual PHP DesignGraph check: '+(options.phpHtml.localGraph?.checkedSections??0)+' sections, '+(options.phpHtml.localGraph?.checkedNodes??0)+' nodes, '+(options.phpHtml.localGraph?.findings.length??0)+' findings.\n'+
       '- Real PHP business component check: '+(options.phpHtml.localComponents?.checkedTypedSections??0)+' sections, '+(options.phpHtml.localComponents?.findings.length??0)+' findings; no runtime interaction test.\n'+
       '- Form markup check: '+(options.phpHtml.localForms?.observedForms??0)+' forms, '+(options.phpHtml.localForms?.findings.length??0)+' findings; no POST or delivery verified.\n'+
       '- Source digest recorded at capture, but source revision served by PHP NOT cryptographically attested. No public HTTPS, delivered forms, scripts, actual design equality or client approval verified.\n':'')+
    '\n\n---\n\n'+renderMarkdown(backlog,release)+'\n\n---\n\n'+TRACE.markdown(traceability)+
    '\n\n---\n\n'+EXECUTION.markdown(execution)+'\n\n---\n\n'+CMS_PACKET.markdown(cmsChangePacket),
  integrationOrder:['verified-owner-facts','approved-prototypes-and-blueprint',
   'existing-site-v1-development','current-manifest-and-override-review',
   'existing-cms-save-and-publish','manual-http-browser-and-three-device-acceptance'],
  caveats:['No direct database/CMS writes.','No main branch merge or deploy.',
   'Priorities indicate work order only, not ranking performance.',
   'Supplied HTML and device captures are not proof of the deployed browser state.',
   'Release never auto-approved.',
   'Supplied acceptance ledger is an unverified assertion, even when all gates are marked approved.',
   'Change impact is an in-memory hypothetical validated Site v1, not a CMS patch or real saved state.',
   ...(originsAgree?[]:['Conflicting supplied HTTP and media origins: capture plan has no approved URL until the lead resolves this.'])]};
}
module.exports=Object.freeze({FORMAT,build});
