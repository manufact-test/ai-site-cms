'use strict';
// Conservative prepublication evidence gate for integrators.
// An automatic pass is deliberately impossible: visual, forms and live data
// require real manual checks owned by the lead.
const {work}=require('./remediation.cjs');
const {compare}=require('./parity.cjs');
const REGRESSION=require('./regression.cjs');
const ACCEPTANCE=require('./acceptance.cjs');
const MIGRATION=require('./route-migration.cjs');
const PHP_CAPTURE=require('./php-capture.cjs');
const PHP_HTML=require('./php-html-capture.cjs');
const FORMAT='manufact-seo-release-review-v1';
function assess(site,manifests,blueprint,options={},precomputedBacklog=null){
 if(options.phpHtml&&!PHP_HTML.isVerified(options.phpHtml))
  throw Error('Release review requires original verified local PHP HTML evidence');
 if(options.phpCapture&&!PHP_CAPTURE.isVerifiedCapture(options.phpCapture))
  throw Error('Release review requires verified lead PHP capture evidence');
 const {acceptance:acceptanceLedger,...reviewOptions}=options;
 const backlog=precomputedBacklog||work(site,manifests,blueprint,reviewOptions);
 const acceptanceReview=acceptanceLedger?ACCEPTANCE.review(site,blueprint,acceptanceLedger):null;
 if(backlog.siteId!==site.siteId||backlog.format!=='manufact-seo-remediation-v1'||!backlog.readOnly)
  throw Error('Incompatible SEO remediation backlog');
 const x=backlog.tasks,parity=options.snapshot?compare(site,blueprint,options.snapshot):null;
 const blockers=[],reviews=[],manual=[];
 const add=(where,id,title,detail,related=[])=>where.push({gateId:id,title,detail,taskIds:related,automaticPass:false});
 const find=(predicate)=>x.filter(predicate).map(t=>t.taskId);
 const broken=find(t=>t.sources.some(s=>['core:broken-link','core:broken-anchor'].includes(s.code)||
  (options.snapshot?.completeness==='complete'&&s.code==='html:broken-link')));
 const missing=find(t=>t.sources.some(s=>s.reason==='page-development'||s.code==='planned-page-missing'));
 const drift=find(t=>t.sources.some(s=>['parity:indexation-drift','parity:path-mismatch'].includes(s.code)));
 const dangerousMarkup=find(t=>t.sources.some(s=>s.code==='evidence:unverified-schema-published'));
 const regression=options.baselineSite?REGRESSION.compare(options.baselineSite,site,manifests,blueprint):null;
 const migration=options.baselineSite?MIGRATION.review(options.baselineSite,site,manifests,blueprint):null;
 const fragmentProblems=find(t=>t.sources.some(s=>s.code==='evidence:broken-fragment'));
 const oldRoutesMissing=find(t=>t.sources.some(s=>s.code?.startsWith('migration:')&&s.severity==='error'));
 const oldRouteReview=find(t=>t.sources.some(s=>s.code?.startsWith('migration:')&&s.severity!=='error'));
 const sitemapProblems=find(t=>t.sources.some(s=>['publication:sitemap-noindex','publication:sitemap-indexable-missing'].includes(s.code)));
 const deliveryProblems=find(t=>t.sources.some(s=>['delivery:non-success-status','delivery:indexability-drift',
  'delivery:canonical-invalid','delivery:sitemap-indexable-absent','delivery:sitemap-noindex-listed',
  'delivery:unmatched-page','delivery:redirect-status-drift','delivery:redirect-location-drift',
  'delivery:redirect-location-invalid'].includes(s.code)&&s.severity==='error'));
 const deliveryReview=find(t=>t.sources.some(s=>s.code?.startsWith('delivery:')&&s.severity!=='error'));
 const mediaProblems=find(t=>t.sources.some(s=>['media:resource-status-error','media:resource-mime-mismatch',
  'media:og-image-not-image','media:invalid-og-image-url',
  'media:invalid-twitter-image-url'].includes(s.code)&&s.severity==='error'));
 const mediaReview=find(t=>t.sources.some(s=>s.code?.startsWith('media:')&&s.severity!=='error'));
 const phpBrokenImages=find(t=>t.sources.some(s=>s.code==='php-capture:broken-rendered-image'&&s.severity==='error'));
 const localPhpProblems=find(t=>t.sources.some(s=>s.code?.startsWith('php-local:')&&s.severity==='error'));
 const localPhpReviews=find(t=>t.sources.some(s=>s.code?.startsWith('php-local:')&&s.severity!=='error'));
 const localMediaErrors=find(t=>t.sources.some(s=>s.code?.startsWith('php-media:')&&s.severity==='error'));
 const localMediaWarnings=find(t=>t.sources.some(s=>s.code?.startsWith('php-media:')&&s.severity!=='error'));
 const localHeadErrors=find(t=>t.sources.some(s=>s.code?.startsWith('php-head:')&&s.severity==='error'));
 const localHeadReviews=find(t=>t.sources.some(s=>s.code?.startsWith('php-head:')&&s.severity!=='error'));
  const localFormErrors=find(t=>t.sources.some(s=>s.code?.startsWith('php-form:')&&s.severity==='error'));
  const localFormReviews=find(t=>t.sources.some(s=>s.code?.startsWith('php-form:')&&s.severity!=='error'));
 const phpCapture=options.phpCapture||null;
 const suppliedOrigins=[options.delivery?.origin,options.media?.origin].filter(Boolean)
  .map(x=>new URL(x).href);
 const crossOriginConflict=new Set(suppliedOrigins).size>1;
 const conflictingEvidence=find(t=>t.sources.some(s=>s.code==='consistency:captured-robots-diff'&&s.severity==='error'));
 const otherEvidenceDrift=find(t=>t.sources.some(s=>s.code?.startsWith('consistency:')&&s.severity!=='error'));
 const publicationReview=find(t=>t.sources.some(s=>s.code?.startsWith('publication:')&&!['publication:sitemap-noindex','publication:sitemap-indexable-missing'].includes(s.code)));
 if(oldRoutesMissing.length)add(blockers,'unprotected-route-migration',
  'Resolve old public routes without matching 301 or indexation conflicts',
  'Use existing Site v1 redirects and check HTTP Location, final canonical and the indexation intent.',oldRoutesMissing);
 if(oldRouteReview.length)add(reviews,'route-migration-manual-review',
  'Review stale authored links and removed indexable routes',
  'Old routes need explicit business intent and public HTTP checks.',oldRouteReview);
 if(regression?.summary.criticalReviewItems)add(blockers,'new-critical-regressions',
  'Review new severe SEO regressions since prior Site v1 version',
  'New errors or index-to-noindex changes require explicit approval or repair before release.',
  find(t=>t.sources.some(s=>s.kind==='site-regression')));
 if(dangerousMarkup.length)add(blockers,'published-unverified-structured-data',
  'Review published structured data based on unverified facts',
  'A JSON-LD type appears in captured HTML while its associated blueprint evidence remains unverified. Remove or verify actual claims before release.',dangerousMarkup);
 if(acceptanceReview?.stale)add(blockers,'acceptance-revision-stale',
  'Reapprove the current Site v1 and approved Blueprint revisions',
  'Supplied signoffs refer to a different Site v1 or Blueprint fingerprint; do not reuse stale approval.');
 if(acceptanceReview?.summary.rejectedAssertions)add(blockers,'explicit-acceptance-rejection',
  'Resolve rejected human acceptance checks',
  'At least one supplied manual acceptance check was explicitly rejected; address the underlying issue.');
 if(acceptanceReview?.summary.incompleteAttestations)add(reviews,'incomplete-acceptance-attestations',
  'Complete reviewer identity, date and evidence reference for claimed acceptance',
  'Unattributed or incomplete statements cannot count as a completed human review.');
 if(acceptanceReview&&(!acceptanceReview.prototype.approvedAssertionRecorded||acceptanceReview.summary.unresolvedChecks))
  add(reviews,'pending-manual-acceptance',
   'Collect three actual approved prototype images and remaining manual acceptance evidence',
   'No script or source-level assertion can replace actual client approval and browser/host checks.');
 if(conflictingEvidence.length)add(blockers,'conflicting-captured-indexation',
  'Resolve disagreeing HTML indexability signals across supplied evidence',
  'Saved HTML and HTTP-captured HTML give inconsistent indexation policy; verify one actual deployed build.',conflictingEvidence);
 if(otherEvidenceDrift.length)add(reviews,'captured-html-version-drift',
  'Reconcile supplied HTML and HTTP snapshot content revisions',
  'Captured title, canonical, description or OG fields differ across supplied artifacts.',otherEvidenceDrift);
 if(crossOriginConflict)add(blockers,'conflicting-evidence-origins',
  'Resolve mismatched public origins across supplied HTTP and media evidence',
  'HTTP and media recordings claim different public origins; select the approved host and mount before relying on the combined report.');
 if(phpBrokenImages.length)add(blockers,'php-published-broken-images',
  'Repair broken images in the real PHP three-device screenshot capture',
  'Lead loopback capture reported missing image resources; inspect page/device and rerun the lead capture after repair.',phpBrokenImages);
 if(localPhpProblems.length)add(blockers,'local-php-published-seo-conflict',
  'Repair observed local PHP sitemap and 301 redirect mismatches',
  'Actual loopback HTTP endpoint content disagrees with the sealed Site v1 routes or indexation; check PHP publication and re-capture. Not a public HTTPS certification.',localPhpProblems);
 if(localPhpReviews.length)add(reviews,'local-php-seo-endpoint-review',
  'Review observed local PHP robots, sitemap and endpoint configuration',
  'HTTP status/type, public-origin setting and the actual published build need operator confirmation before release.',localPhpReviews);
 if(localHeadErrors.length)add(blockers,'local-php-head-indexation-or-origin',
  'Resolve actual PHP metadata, canonical, OG or robots indexation conflicts',
  'Real loopback PHP title, description, social metadata, language, robots or canonical disagrees with immutable Site v1 and observed sitemap origin. This indicates a mismatched publication or SEO configuration; not proof of a published build SHA.',localHeadErrors);
 if(localHeadReviews.length)add(reviews,'local-php-head-configuration',
  'Review local PHP HTTP headers, canonical and social metadata configuration',
  'Missing security headers or public origin are warnings; validate intended host and production release separately.',localHeadReviews);
 if(localFormErrors.length)add(blockers,'local-php-form-markup',
   'Repair observed PHP lead form action, release and anti-spam markup',
   'Captured HTML disagrees with the public form contract. No POST or delivery has been attempted.',localFormErrors);
  if(localFormReviews.length)add(reviews,'local-php-form-origin-review',
   'Review public form collector host and allowlist',
   'Absolute collector origin remains unverified and was not probed.',localFormReviews);
  if(localMediaErrors.length)add(blockers,'local-php-media-integrity',
  'Repair observed PHP media delivery and OG/variant integrity',
  'Hash-checked local PHP responses include failed OG requests, variant SHA or media byte/ETag anomalies. Verify the current published media before public release.',localMediaErrors);
 if(localMediaWarnings.length)add(reviews,'local-php-media-quality-review',
  'Review other local PHP media errors or missing immutability metadata',
  'Actual local image/video response differed from expected Site v1 MIME, status or ETag. Not a public HTTPS or visual quality attestation.',localMediaWarnings);
 if(mediaProblems.length)add(blockers,'captured-og-media-conflict',
  'Resolve broken public OG assets, MIME conflicts and invalid OG URLs',
  'The supplied media transcript conflicts with Site v1; verify at the actual host.',mediaProblems);
 if(mediaReview.length)add(reviews,'captured-media-review',
  'Review media delivery, public OG image URLs and media coverage',
  'Caller-supplied resources are not authenticated live delivery or social card proof.',mediaReview);
 if(deliveryProblems.length)add(blockers,'captured-delivery-conflict',
  'Resolve captured HTTP status, indexation, sitemap and canonical conflicts',
  'The caller-supplied HTTP transcript conflicts with the planned Site v1 publication; reproduce at the actual host.',deliveryProblems);
 if(deliveryReview.length)add(reviews,'captured-http-review',
  'Review supplied HTTP headers, public URL, canonical and capture completeness',
  'Caller-supplied responses are not authenticated live HTTP checks or release acceptance.',deliveryReview);
 if(sitemapProblems.length)add(blockers,'sitemap-indexation-integrity',
  'Resolve conflicting sitemap and Site v1 indexation evidence',
  'The supplied sitemap lists noindex pages, or an explicitly complete enumeration omits indexable pages; verify publication source and fix before release.',sitemapProblems);
 if(publicationReview.length)add(reviews,'publication-artifact-review',
  'Review static canonical, sitemap route and robots policy observations',
  'Confirm the actual deployment host, mount and HTTP artifacts; static export alone cannot certify crawler access.',publicationReview);
 if(fragmentProblems.length)add(reviews,'broken-fragments',
  'Review unresolved fragment targets in supplied HTML',
  'The captured target page has no matching HTML id; partial capture and runtime-generated anchors require verification.',fragmentProblems);
 if(broken.length)add(blockers,'broken-navigation','Resolve confirmed broken page/anchor links',
  'Broken implemented navigation or supplied HTML links must be reviewed and corrected before public release.',broken);
 if(missing.length)add(blockers,'approved-pages-absent','Resolve missing approved pages',
  'A page in the approved blueprint has not been implemented in the supplied Site v1 project.',missing);
 if(drift.length)add(blockers,'publication-drift','Resolve route/indexation mismatch',
  'Supplied HTML or Site v1 indexation does not match approved deployment intent.',drift);
 const unsafeFacts=find(t=>t.phase==='verify-facts');
 if(unsafeFacts.length)add(reviews,'schema-evidence','Do not publish unverifiable structured-data claims',
  'Either verify facts and validate the exact markup or omit the optional candidate; unresolved markup is not publication-approved.',unsafeFacts);
 const redirects=find(t=>t.sources.some(s=>s.reason==='path-review'));
 if(redirects.length)add(reviews,'redirect-review','Review route changes and 301 policy',
  'A path change requires approved navigation, redirects and canonical policy, never an automatic rewrite.',redirects);
 const metadata=find(t=>t.category==='metadata'||t.category==='indexation');
 if(metadata.length)add(reviews,'metadata-approval','Review title, description, OG, canonical and robots changes',
  'Validate every proposed field against source and manual CMS overrides; current output is a proposal only.',metadata);
 const content=find(t=>['conversion','semantic-structure','content','site-links'].includes(t.category));
 if(content.length)add(reviews,'editorial-and-ux','Review page purpose, headings, links and CTAs',
  'Confirm text usefulness and visitor paths with actual page rendering; literal topic matching is not semantic understanding.',content);
 const boundaries=[
  ['prototype-approval','Verify three explicitly approved static desktop/tablet/mobile prototype images and their immutable revision IDs.'],
  ['visual-fidelity','Compare actual implementation with the approved prototypes on desktop/tablet/mobile, including layouts, typography and visible content.'],
  ['behavior','Verify real forms, anti-spam, delivery status, CTA destinations, keyboard/focus behavior and mobile interactions.'],
  ['published-host','Verify HTTPS public origin, redirects, canonical URL, OG image delivery, robots.txt, sitemap.xml and correct host/mount.'],
  ['structured-data','If any Schema.org markup is shipped, verify visible supporting content, allowed schema type and actual JSON-LD output.'],
  ['performance','Check measured Web Vitals/performance and accessibility on the deployed site; offline tool has no lab/field data.'],
  ['overrides-and-rollback','Confirm editor manual overrides, Save ≠ Publish, audit history and rollback on the actual installation.']
 ];
 for(const [id,detail] of boundaries){
  const check=acceptanceReview?.checks.find(x=>x.id===id);
  manual.push({gateId:id,title:'Manual acceptance: '+id,detail,taskIds:[],
   suppliedAttestationStatus:check?.status||'not-supplied',
   evidenceReference:check?.evidenceReference||null,
   sourceAuthenticated:false,automaticPass:false});
 }
 const coverage={
  validatedSiteV1:true,
  auditedAgainstBlueprint:true,
  staticHtmlSupplied:Boolean(options.snapshot),
  staticHtmlChecked:Boolean(parity),
  suppliedThreeDeviceMarkupReviewed:Boolean(options.viewports),
  deepHtmlEvidenceChecked:Boolean(options.snapshot),
  siteRegressionCompared:Boolean(options.baselineSite),
  routeMigrationReviewed:Boolean(migration),
  acceptanceLedgerReviewed:Boolean(acceptanceReview),
  clientPrototypeApprovalAuthenticated:false,
  callerSuppliedHttpTranscriptReviewed:Boolean(options.delivery),
  callerSuppliedMediaTranscriptReviewed:Boolean(options.media),
  leadPhpThreeDeviceScreenshotsChecked:Boolean(phpCapture),
  leadPhpScreenshotDigestsChecked:Boolean(phpCapture),
  leadPhpReportedMissingImages:phpCapture?.findings.length??null,
  screenshotsProveSeoHtmlOrVisualEquality:false,
  liveHostChecked:false,
  visualPrototypesVerified:false,
  mobileRenderedVerified:false,
  formsVerified:false,
  cwvMeasured:false
 };
 const decision=blockers.length?'repair-required':options.snapshot||options.viewports||options.delivery||options.media||phpCapture?'manual-acceptance-required':'collect-publication-evidence';
 return {format:FORMAT,version:1,siteId:site.siteId,
  decision,automaticReleaseApproval:false,readyToPublish:false,
  blockers,reviews,manualChecks:manual,acceptanceReview,coverage,
  summary:{blockingGates:blockers.length,reviewGates:reviews.length,manualChecks:manual.length,
   remediationTasks:x.length},
  boundaries:'This is a conservative preparation gate, not a deployment validator or SEO ranking certificate. The lead/site owner must explicitly approve the actual release after browser, host, functional, legal and visual checks.'};
}
module.exports=Object.freeze({FORMAT,assess});
