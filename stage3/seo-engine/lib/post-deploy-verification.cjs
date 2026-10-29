'use strict';
// Offline verifier of operator-provided public HTTPS capture against a sealed
// pre-deploy candidate. Does not issue network requests or approve client site.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PREVIEW=require('./static-host-preview.cjs');
const ZIP=require('./static-upload-zip-verify.cjs');
const BYTES=require('./public-media-byte-verification.cjs');
const PUBLIC=require('./public-static-parity.cjs');
const DELIVERY=require('./delivery-evidence.cjs');
const MEDIA=require('./media-delivery.cjs');
const FORMAT='manufact-seo-post-deploy-release-verification-v1';
const DIGEST=/^[a-f0-9]{64}$/;
function input(file,max=2000000){
 const st=fs.lstatSync(file);
 if(st.isSymbolicLink()||!st.isFile()||st.size<10||st.size>max)
  throw Error('Unsafe post-deployment input JSON file');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function inspect(candidate,site,release,publicHttp,publicMedia,byteReport){
 if(!candidate||typeof candidate!=='string'||!path.isAbsolute(candidate)||
    !site||!Array.isArray(site.pages)||!release||release.siteId!==site.siteId)
  throw Error('Post-deploy review requires exact official published source and private candidate folder');
 const root=fs.realpathSync(candidate);
 if(fs.lstatSync(candidate).isSymbolicLink()||!fs.lstatSync(root).isDirectory())
  throw Error('Candidate folder must not be a symlink');
 const status=input(path.join(root,'CANDIDATE-STATUS.json'),250000);
 if(!status||status.format!=='manufact-seo-first-site-candidate-v1'||
    status.siteId!==site.siteId||status.publishedVersion!==release.publishedVersion||
    status.officialStaticManifestSha256!==release.manifestSha256||
    !DIGEST.test(status.publicArchiveSha256||'')||
    !Number.isSafeInteger(status.blockingGates)||status.blockingGates<0||
    !['TECHNICAL-BLOCKED','MANUAL-ACCEPTANCE-REQUIRED'].includes(status.status)||
    !Array.isArray(status.blockingGateIds)||
    status.blockingGateIds.length<status.blockingGates||
    status.operatorMustApprove!==true||
    status.remoteDeployPerformed!==false||status.actualHostWrites!==0)
  throw Error('Candidate status is not tied to this exact official published revision');
 const staging=path.join(root,'static-upload');
 const upload=PREVIEW.load(staging);
 if(upload.inventory.siteId!==site.siteId||
    upload.inventory.publishedVersion!==release.publishedVersion||
    upload.inventory.officialStaticManifestSha256!==release.manifestSha256||
    upload.inventory.origin!==release.origin||
    upload.inventory.provider!==status.provider)
  throw Error('Staged public assets differ from official export or private candidate');
 const zip=ZIP.verify(path.join(root,'public-site.zip'),staging);
 if(zip.sha256!==status.publicArchiveSha256||
    zip.officialManifestSha256!==release.manifestSha256||
    zip.publishedVersion!==release.publishedVersion)
  throw Error('Operator ZIP SHA256 differs from the recorded release candidate');
 DELIVERY.assertEvidence(publicHttp);
 if(publicMedia)MEDIA.assertEvidence(publicMedia);
 if(!BYTES.isVerified(byteReport)||
    !byteReport.allCapturedByteDigestsMatch||
    byteReport.officialStaticManifestSha256!==release.manifestSha256||
    byteReport.origin!==publicHttp.origin)
  throw Error('Public asset SHA256 GET evidence is missing/incomplete or from another host/release');
 if(publicMedia&&publicMedia.origin!==publicHttp.origin)
  throw Error('Public media HEAD and page GET evidence refer to different host origins');
 const parity=PUBLIC.review(site,release,publicHttp,publicMedia,byteReport);
 const fatal=parity.findings.filter(x=>x.severity==='error');
 const review=parity.findings.filter(x=>x.severity!=='error');
 const blockers=[];
 if(status.blockingGates||status.status==='TECHNICAL-BLOCKED')
  blockers.push({code:'candidate-has-unresolved-technical-gates',
   reason:'Existing locally prepared CMS/SEO candidate was already technically blocked; post-deploy matching cannot override those gates.',
   count:status.blockingGates});
 if(!parity.comparable||!parity.allComparedSurfacesMatched)
  blockers.push({code:'live-public-https-release-not-verified',
   reason:'Public HTTPS has not demonstrated the correct static pages, 301, 404, safe CSP, source SHA256 fingerprint, all assets and private-file isolation.',
   count:fatal.length});
 if(!byteReport.allCapturedByteDigestsMatch)
  blockers.push({code:'public-media-digests-not-verified',
   reason:'Public media originals and variants must match official release SHA256.',count:byteReport.findings.length});
 // No raw public HTML, form values, HMAC or operator secrets in this summary.
 const result=Object.freeze({format:FORMAT,siteId:site.siteId,
  publishedVersion:release.publishedVersion,
  officialStaticManifestSha256:release.manifestSha256,
  candidatePublicZipSha256:zip.sha256,
  publishedHost:parity.claimedPublicOrigin,
  verifiedForRootStaticHost:parity.comparable,
  matchedPublicReleaseMarker:parity.publicReleaseMarkerMatched,
  rootCaptureWindowStable:parity.publicRootWindowStable,
  testedUnknownRoute404:parity.negativeRouteStatus===404||parity.negativeRouteStatus===410,
  hiddenOperatorArtifactsResponded2xx:parity.internalArtifactPublicSuccess2xx,
  checkedPages:parity.checkedPages,checkedRedirects:parity.checkedRedirects,
  totalAssets:byteReport.expectedMediaResources,
  sha256MatchedAssets:byteReport.capturedResources,
  publicBytesMatch:byteReport.allCapturedByteDigestsMatch,
  comparedPublicSurfaces:parity.allComparedSurfacesMatched,
  originalCandidateBlockingGates:status.blockingGates,
  postDeployBlockingReasons:blockers,publicFindingCount:parity.findings.length,
  publicErrorFindings:fatal.map(x=>({
   code:x.code,pageId:x.pageId??null,path:x.path??null,assetId:x.assetId??null
  })),
  publicReviewFindings:review.map(x=>({
   code:x.code,pageId:x.pageId??null,path:x.path??null,assetId:x.assetId??null
  })),
  disposition:blockers.length?'NOT-READY':'TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED',
  clientApproved:false,realFormPostVerified:false,
  smtpTelegramDeliveryVerified:false,desktopTabletMobileApproved:false,
  inputEvidenceAuthenticated:false,independentNetworkProvenanceAuthenticated:false,
  actualNetworkRequests:0,productionHostWrites:0,finalReleaseAuthorized:false,
  limitations:'The inputs are privately saved operator-collected HTTPS transcripts. This offline check does not authenticate DNS/TLS origin, actual production process revision, forms POST, recipients, rendered browser output, or client signoff.'});
 return result;
}
function readAndInspect(candidate,site,release,httpFile,mediaFile,byteFile){
 const http=input(httpFile,36000000),media=mediaFile?input(mediaFile,1800000):null;
 if(media)MEDIA.assertEvidence(media);
 DELIVERY.assertEvidence(http);
 const bytes=BYTES.read(byteFile,site,release);
 return inspect(candidate,site,release,http,media,bytes);
}
module.exports=Object.freeze({FORMAT,inspect,readAndInspect});
