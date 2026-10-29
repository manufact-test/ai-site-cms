'use strict';
/* Source-pinned, read-only first-site integration relay. All permissions stay with the lead. */
const FORMAT='manufact-seo-first-site-lead-relay-v1';
const SHA=/^[a-f0-9]{64}$/;
const CAND='manufact-seo-first-site-candidate-v1';
const FIRST='manufact-seo-first-site-check-v1';
const UPLOAD='manufact-seo-static-upload-bundle-v1';
const POST='manufact-seo-post-deploy-release-verification-v1';
const INDEX='manufact-seo-search-indexing-intelligence-v1';
const HISTORY='manufact-seo-search-history-v1';
function assert(condition,message){if(!condition)throw Error('Integration relay: '+message);}
function exactOrigin(value){
 try {
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/' ||
     u.hostname==='localhost'||u.hostname==='127.0.0.1')return null;
  return u.origin;
 } catch {return null;}
}
function build(input){
 const c=input?.candidate,s=input?.summary,u=input?.upload,z=input?.zip;
 const p=input?.post||null,i=input?.indexing||null,h=input?.history||null;
 const hashes=input?.inputSha256||{};
 assert(c?.format===CAND&&s?.format===FIRST&&u?.format===UPLOAD,
  'original candidate, PHP SEO summary and static upload inventory are required');
 assert(typeof c.siteId==='string'&&c.siteId.length>0&&c.siteId===s.siteId&&c.siteId===u.siteId,
  'CMS siteId differs between candidate, source and upload');
 assert(Number.isSafeInteger(c.publishedVersion)&&c.publishedVersion>0&&
  c.publishedVersion===s.publishedVersion&&c.publishedVersion===u.publishedVersion,
  'owner-published version differs between the three local artifacts');
 assert(Number.isSafeInteger(s.ownerPublishedSourceRevisionClaim)&&
  s.ownerPublishedSourceRevisionClaim>0,'owner-published sourceRevision claim is absent');
 assert(SHA.test(s.sourceSiteSha256||'')&&SHA.test(c.officialStaticManifestSha256||'')&&
  c.officialStaticManifestSha256===s.staticExport?.staticManifestSha256&&
  c.officialStaticManifestSha256===u.officialStaticManifestSha256,
  'sealed source and official static manifest provenance disagree');
 assert(c.provider===u.provider&&['apache','nginx','netlify','cloudflare-pages'].includes(c.provider),
  'candidate and static hosting provider differ');
 assert(c.staticUploadRelativeDir==='static-upload/public'&&
  c.publicArchiveRelativeFile==='public-site.zip'&&
  c.technicalReviewRelativeDir==='seo-report'&&c.phpEvidenceRelativeDir==='local-php-evidence',
  'candidate storage contract is not the recognized private release layout');
 assert(Number.isSafeInteger(s.release?.blockingGates)&&
  s.release.blockingGates>=0&&Array.isArray(s.release?.blockerIds)&&
  s.release.blockerIds.length===s.release.blockingGates&&
  Number.isSafeInteger(c.blockingGates)&&c.blockingGates>=s.release.blockingGates&&
  Array.isArray(c.blockingGateIds)&&c.blockingGateIds.length===c.blockingGates&&
  c.blockingGates===s.release.blockingGates+(c.upgradeBlockingRisks||0),
  'candidate blockers do not match original PHP SEO and upgrade review');
 assert(c.status===(c.blockingGates?'TECHNICAL-BLOCKED':'MANUAL-ACCEPTANCE-REQUIRED')&&
  c.operatorMustApprove===true&&c.actualHostWrites===0&&
  c.remoteDeployPerformed===false&&c.realProductionHttpsVerified===false,
  'original candidate claims an unauthorized publication or has an invalid technical state');
 assert(z&&SHA.test(z.sha256||'')&&z.sha256===c.publicArchiveSha256&&
  z.officialManifestSha256===c.officialStaticManifestSha256&&
  z.publishedVersion===c.publishedVersion&&
  z.fileCount===u.files.length&&u.filesVerified===u.files.length,
  'public ZIP bytes/inventory do not match the candidate fingerprint');
 for(const key of ['candidate','summary','upload','zip']){
  assert(SHA.test(hashes[key]||''),'source SHA256 missing for '+key);
 }
 if(p){
  assert(p.format===POST&&p.siteId===c.siteId&&
   p.publishedVersion===c.publishedVersion&&
   p.officialStaticManifestSha256===c.officialStaticManifestSha256&&
   p.candidatePublicZipSha256===c.publicArchiveSha256&&
   p.originalCandidateBlockingGates===c.blockingGates,
   'post-deploy evidence belongs to another candidate or release');
  assert(['NOT-READY','TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED'].includes(p.disposition)&&
   Array.isArray(p.postDeployBlockingReasons)&&p.finalReleaseAuthorized===false&&
   p.productionHostWrites===0&&p.actualNetworkRequests===0&&
   p.inputEvidenceAuthenticated===false,
   'post-deploy observation incorrectly claims production authorization');
  assert(p.disposition!=='TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED'||
   (!c.blockingGates&&!p.postDeployBlockingReasons.length),
   'post-deploy technical match conflicts with release blockers');
  assert(p.disposition!=='NOT-READY'||p.postDeployBlockingReasons.length>0,
   'post-deploy failure must include explicit blocking reasons');
  assert(exactOrigin(p.publishedHost),'public verification must name a root HTTPS origin');
  assert(SHA.test(hashes.post||''),'post-deploy report SHA256 missing');
 }
 if(i||h){
  assert(SHA.test(hashes.blueprint||''),'exact approved Blueprint bytes are required for Search Console reports');
  for(const [name,x] of [['indexing',i],['searchHistory',h]]){
   if(!x)continue;
   assert(x.format===(name==='indexing'?INDEX:HISTORY)&&x.readOnly===true&&
    x.siteId===c.siteId&&x.blueprintSha256===hashes.blueprint&&
    exactOrigin(x.publicOrigin)&&SHA.test(hashes[name]||''),
    name+' report is not tied to the same site, blueprint and HTTPS host');
   if(p)assert(exactOrigin(x.publicOrigin)===exactOrigin(p.publishedHost),
    name+' Search Console host differs from public release evidence');
  }
  if(i&&h)assert(exactOrigin(i.publicOrigin)===exactOrigin(h.publicOrigin),
   'Search Performance and Indexing refer to different public hosts');
 }
 const stage=c.blockingGates?'LOCAL-TECHNICAL-BLOCKED':
  !p?'PUBLIC-EVIDENCE-MISSING':
  p.disposition==='NOT-READY'?'PUBLIC-TECHNICAL-BLOCKED':
  'PUBLIC-TECHNICALLY-MATCHED-MANUAL-SIGNOFF';
 const steps=[
  {id:'01-owner-published-source',owner:'CMS lead',status:'EXTERNAL-AUTHENTICATION-REQUIRED',
   instruction:'Re-fetch authenticated owner GET published-site; verify sourceRevision, version, sealed v2 and original approval/archive against this candidate.'},
  {id:'02-php-static-candidate',owner:'CMS lead',status:c.blockingGates?'BLOCKED':'OFFLINE-CHECKED',
   instruction:c.blockingGates?'Resolve original PHP/SEO and upgrade blockers and create a NEW candidate; do not edit this package.':
    'Read private launch worksheet, inspect localhost PHP, public ZIP and provider rewrites; manually approve or reject the candidate.'},
  {id:'03-operator-deployment',owner:'CMS lead',status:'OWNER-ACTION-NOT-AUTHENTICATED',
   instruction:'Only the lead may deploy static-upload/public or public-site.zip after owner approval; check DNS/TLS and provider-specific 301/404.'},
  {id:'04-public-https-byte-verification',owner:'CMS lead',status:!p?'NOT-SUPPLIED':p.disposition,
   instruction:!p?'After manual deployment collect fresh public HTTPS and media GET SHA256 receipts, then run verify-deployed-site.cjs.':
    'Verify transcript origin independently; inspect release marker, media bytes, canonical, robots, sitemap, 301 and 404.'},
  {id:'05-browser-forms-client-signoff',owner:'CMS lead + client',status:'REAL-WORLD-SIGNOFF-PENDING',
   instruction:'Run actual desktop/tablet/mobile and accessibility checks; authorized form POST, persistence and recipient delivery; obtain explicit client signoff.'},
  {id:'06-search-indexing-followup',owner:'SEO operator + CMS lead',
   status:i||h?'OPERATOR-OBSERVATIONS-SUPPLIED':'AWAIT-REAL-GSC-EVIDENCE',
   instruction:'After publication verify Search Console property, gather dated real performance/indexing exports and approve any CMS edits manually.'}
 ];
 return Object.freeze({format:FORMAT,readOnly:true,siteId:c.siteId,stage,
  identity:{sealedSiteSha256:s.sourceSiteSha256,
   claimedOwnerSourceRevision:s.ownerPublishedSourceRevisionClaim,
   publishedVersion:c.publishedVersion,officialStaticManifestSha256:c.officialStaticManifestSha256,
   publicZipSha256:c.publicArchiveSha256,provider:c.provider},
  evidence:{originalLocalBlockers:c.blockingGates,originalBlockerIds:c.blockingGateIds.slice(),
   postDeploySupplied:!!p,publicTechnicalDisposition:p?.disposition||'NOT-OBSERVED',
   publicTechnicalBlockingReasons:p?.postDeployBlockingReasons.map(x=>x.code)||[],
   indexingObserved:!!i,searchHistoryObserved:!!h,
   indexingManualActions:i?.summary?.actions??null,
   searchManualActions:h?.summary?.actions??null},
  inputSha256:{...hashes},steps,
  deploymentAuthorized:false,clientApproved:false,realFormsVerified:false,
  operatorMustReview:true,
  limitations:'Offline evidence relay only. Cannot authenticate owner API, Google, live TLS origin, browser visuals, forms POST or client approval. No CMS edits, PR, merge or deploy.'});
}
const safe=x=>String(x??'').replace(/[\r\n|<>]/g,' ').slice(0,200);
function markdown(r){
 assert(r?.format===FORMAT,'cannot render an unvalidated relay');
 const l=['# MANUFACT — first real site integration relay','',
 'Disposition: **'+r.stage+'**. Never an automatic GO or publication authorization.','',
 'Site: '+safe(r.siteId),'Owner-reported published version: '+r.identity.publishedVersion,
 'Owner source revision claim: '+r.identity.claimedOwnerSourceRevision,
 'Sealed approved Site v2 SHA256: '+r.identity.sealedSiteSha256,
 'Official static export manifest SHA256: '+r.identity.officialStaticManifestSha256,
 'Verified deployable ZIP SHA256: '+r.identity.publicZipSha256,
 'Target provider: '+r.identity.provider,'',
 '## Actions and responsibilities',''];
 for(const step of r.steps)l.push('### '+step.id+' — '+step.status,'','Responsible: '+step.owner,
  '',step.instruction,'');
 l.push('## Original technical blockers','',
  ...(!r.evidence.originalBlockerIds.length?['None in the supplied immutable candidate. Manual gates remain open.']:
   r.evidence.originalBlockerIds.map(x=>'- '+safe(x))),
  '', 'Public technical observation: '+r.evidence.publicTechnicalDisposition,
  'Indexing evidence: '+(r.evidence.indexingObserved?'operator-supplied':'not supplied'),
  'Search history evidence: '+(r.evidence.searchHistoryObserved?'operator-supplied':'not supplied'),
  '', '## Exact input SHA256','');
 for(const [k,v] of Object.entries(r.inputSha256))l.push('- '+safe(k)+': '+safe(v));
 l.push('','## Operator handoff','',
 '- Candidate/CANDIDATE-HANDOFF.md — original local technical gates, preview and private candidate inventory.',
 '- Candidate/seo-report/launch-worksheet.md — actual per-page/device acceptance tasks.',
 '- Candidate/static-upload/HANDOFF.md — provider-specific static hosting steps.',
 '- Only candidate/static-upload/public/ or verified public-site.zip may ever be considered for operator upload.',
 '- Post-deploy: use verify-deployed-site.cjs on independently captured HTTPS/media evidence, then build-seo-operator-workspace.cjs.',
 '- Do not upload this relay, original PHP evidence, owner JSON, private reports or Google CSVs.',
 '- Search Console sampled URLs are not site-wide indexing coverage; absent observations are UNKNOWN.',
 '', 'Explicit human browser/device/form delivery, owner revision and client approval remain mandatory.',
 'This relay performs zero network calls, uploads, POST requests, CMS writes, PRs or merges.','');
 return l.join('\n');
}
module.exports=Object.freeze({FORMAT,build,markdown,exactOrigin});
