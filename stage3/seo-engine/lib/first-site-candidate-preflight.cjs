'use strict';
/* Inspect an immutable, private local candidate BEFORE collecting public HTTPS.
 * This is an offline preflight: it never accesses the internet or grants GO.
 */
const fs=require('node:fs'),path=require('node:path');
const PREVIEW=require('./static-host-preview.cjs');
const ZIP=require('./static-upload-zip-verify.cjs');
const SHA=/^[a-f0-9]{64}$/;
const FORMAT='manufact-seo-first-site-candidate-preflight-v1';
function assert(ok,message){if(!ok)throw Error('Candidate preflight: '+message);}
function consistent(candidate,summary,upload,archive,expected=null){
 assert(candidate?.format==='manufact-seo-first-site-candidate-v1'&&
  summary?.format==='manufact-seo-first-site-check-v1'&&
  upload?.format==='manufact-seo-static-upload-bundle-v1',
  'original source candidate, PHP summary or uploaded public file inventory has wrong format');
 assert(typeof candidate.siteId==='string'&&candidate.siteId.length>0&&
  summary.siteId===candidate.siteId&&upload.siteId===candidate.siteId&&
  archive?.siteId===candidate.siteId,
  'siteId differs between original local candidate and public archive');
 assert(Number.isSafeInteger(candidate.publishedVersion)&&candidate.publishedVersion>0&&
  summary.publishedVersion===candidate.publishedVersion&&
  upload.publishedVersion===candidate.publishedVersion&&
  archive.publishedVersion===candidate.publishedVersion,
  'published CMS version differs between local PHP and static release');
 assert(SHA.test(summary.sourceSiteSha256||'')&&
  Number.isSafeInteger(summary.ownerPublishedSourceRevisionClaim)&&
  summary.ownerPublishedSourceRevisionClaim>0,
  'real sealed source SHA256 or owner-published sourceRevision claim is missing');
 assert(SHA.test(candidate.officialStaticManifestSha256||'')&&
  summary.staticExport?.staticManifestSha256===candidate.officialStaticManifestSha256&&
  archive.officialManifestSha256===candidate.officialStaticManifestSha256&&
  upload.officialStaticManifestSha256===candidate.officialStaticManifestSha256,
  'official static export manifest differs across evidence');
 assert(SHA.test(candidate.publicArchiveSha256||'')&&
  archive.sha256===candidate.publicArchiveSha256&&
  archive.fileCount===upload.files.length&&upload.filesVerified===upload.files.length&&
  archive.operatorPrivateFilesIncluded===false,
  'verified public ZIP no longer matches original candidate and uploaded static file ledger');
 assert(candidate.provider===upload.provider&&
  ['apache','nginx','netlify','cloudflare-pages'].includes(candidate.provider),
  'candidate provider differs from verified public upload');
 assert(Number.isSafeInteger(summary.release?.blockingGates)&&
  Array.isArray(summary.release?.blockerIds)&&
  summary.release.blockerIds.length===summary.release.blockingGates&&
  Number.isSafeInteger(candidate.blockingGates)&&
  Number.isSafeInteger(candidate.upgradeBlockingRisks)&&candidate.upgradeBlockingRisks>=0&&
  candidate.blockingGates===summary.release.blockingGates+candidate.upgradeBlockingRisks&&
  Array.isArray(candidate.blockingGateIds)&&candidate.blockingGateIds.length===candidate.blockingGates&&
  summary.release.blockerIds.every(id=>candidate.blockingGateIds.includes(id)),
  'original PHP technical and static upgrade blockers are incoherent');
 assert(candidate.operatorMustApprove===true&&candidate.actualHostWrites===0&&
  candidate.remoteDeployPerformed===false&&candidate.prOrMergePerformed===false&&
  candidate.realProductionHttpsVerified===false&&summary.automaticRelease===false&&
  candidate.status===(candidate.blockingGates?'TECHNICAL-BLOCKED':'MANUAL-ACCEPTANCE-REQUIRED'),
  'original candidate incorrectly claims publishing authorization or has inconsistent blocker status');
 if(expected){
  assert(expected.siteId===candidate.siteId&&
   expected.publishedVersion===candidate.publishedVersion&&
   expected.sourceRevisionClaim===summary.ownerPublishedSourceRevisionClaim&&
   expected.sealedApprovedSourceSha256===summary.sourceSiteSha256&&
   expected.officialStaticManifestSha256===candidate.officialStaticManifestSha256,
   'candidate belongs to another owner-published version, revision, sealed source or export');
 }
 return Object.freeze({format:FORMAT,siteId:candidate.siteId,
  ownerSourceRevisionClaim:summary.ownerPublishedSourceRevisionClaim,
  sealedApprovedSourceSha256:summary.sourceSiteSha256,
  publishedVersion:candidate.publishedVersion,
  officialStaticManifestSha256:candidate.officialStaticManifestSha256,
  publicArchiveSha256:candidate.publicArchiveSha256,
  verifiedPublicFiles:archive.fileCount,provider:candidate.provider,
  originalTechnicalBlockers:candidate.blockingGates,operatorMustApprove:true,
  networkRequests:0,clientApproved:false,automaticRelease:false});
}
function bounded(file,max){
 const stat=fs.lstatSync(file);
 assert(!stat.isSymbolicLink()&&stat.isFile()&&stat.size>=10&&stat.size<=max,
  'private original input is unsafe or too large: '+file);
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function inspect(folder,expected=null){
 assert(path.isAbsolute(folder),'private candidate path must be absolute');
 const root=fs.realpathSync(folder);
 assert(!fs.lstatSync(folder).isSymbolicLink()&&fs.lstatSync(root).isDirectory(),
  'candidate must be an ordinary private directory');
 const candidate=bounded(path.join(root,'CANDIDATE-STATUS.json'),800000);
 const summary=bounded(path.join(root,'seo-report','summary.json'),3600000);
 const staged=path.join(root,'static-upload');
 const upload=PREVIEW.load(staged);
 const archive=ZIP.verify(path.join(root,'public-site.zip'),staged);
 return consistent(candidate,summary,upload.inventory,archive,expected);
}
function postDeploy(candidate,report){
 assert(report?.format==='manufact-seo-post-deploy-release-verification-v1'&&
  report.siteId===candidate.siteId&&
  report.publishedVersion===candidate.publishedVersion&&
  report.officialStaticManifestSha256===candidate.officialStaticManifestSha256&&
  report.candidatePublicZipSha256===candidate.publicArchiveSha256&&
  report.finalReleaseAuthorized===false&&
  ['NOT-READY','TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED'].includes(report.disposition),
  'previously saved public report belongs to another private release or grants unauthorized GO');
 return true;
}
module.exports=Object.freeze({FORMAT,consistent,inspect,postDeploy});
