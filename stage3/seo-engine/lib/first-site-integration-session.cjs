'use strict';
/* Immutable lead-operated first-site stage plan. Does not perform CMS actions. */
const path=require('node:path');
const FORMAT='manufact-seo-first-site-integration-session-config-v1';
const PHASES=Object.freeze({
 local:{required:['approvedSite','publishedSite','blueprint','origin','staticExport','provider'],
  optional:['ownerEditReview','phpCapture','previousReport','publicHttpEvidence',
   'publicMediaEvidence','publicMediaDigests','deliveryStatus','visualReviewStatus',
   'approvalArchiveIndex','previousUpload']},
 public:{required:['candidate','approvedSite','publishedSite','staticExport',
    'publicHttpEvidence','publicMediaDigests'],
  optional:['publicMediaEvidence','ownerEditReview','previousPublicHttp',
    'previousPublicMediaDigests']},
 'public-capture':{required:['candidate','approvedSite','publishedSite','staticExport','origin'],
  optional:['ownerEditReview','previousPublicHttp','previousPublicMediaDigests']},
 search:{required:['candidate','postDeploy','blueprint'],
  optional:['indexing','searchHistory','liveAcceptanceReview','liveAcceptanceContract']}
});
const PREP_KEYS={approvedSite:'approved-site',publishedSite:'published-site',
 blueprint:'blueprint',origin:'origin',staticExport:'static-export',provider:'provider',
 ownerEditReview:'owner-edit-review',phpCapture:'php-capture',previousReport:'previous-report',
 publicHttpEvidence:'public-http-evidence',publicMediaEvidence:'public-media-evidence',
 publicMediaDigests:'public-media-digests',deliveryStatus:'delivery-status',
 visualReviewStatus:'visual-review-status',approvalArchiveIndex:'approval-archive-index',
 previousUpload:'previous-upload'};
const VERIFY_KEYS={candidate:'candidate',approvedSite:'approved-site',publishedSite:'published-site',
 staticExport:'static-export',publicHttpEvidence:'public-http-evidence',
 publicMediaDigests:'public-media-digests',publicMediaEvidence:'public-media-evidence',
 ownerEditReview:'owner-edit-review',previousPublicHttp:'previous-public-http',
 previousPublicMediaDigests:'previous-public-media-digests'};
const CAPTURE_KEYS={approvedSite:'approved-site',publishedSite:'published-site',
 origin:'origin',out:'out',ownerEditReview:'owner-edit-review',
 staticExport:'static-export',mediaDigestOut:'media-digest-out'};
const RELAY_KEYS={candidate:'candidate',postDeploy:'post-deploy',
 blueprint:'blueprint',indexing:'indexing',searchHistory:'search-history'};
const assert=(ok,msg)=>{if(!ok)throw Error('First-site integration session: '+msg)};
function validate(value){
 assert(value&&typeof value==='object'&&!Array.isArray(value)&&value.format===FORMAT,
  'invalid private integration session configuration');
 assert(Object.keys(value).every(k=>['format','phase','inputs'].includes(k)),
  'unknown top-level session configuration field');
 const spec=PHASES[value.phase];
 assert(!!spec,'phase must be local, public or search');
 const o=value.inputs;
 assert(o&&typeof o==='object'&&!Array.isArray(o),'inputs must be an object');
 const allowed=[...spec.required,...spec.optional];
 assert(Object.keys(o).every(k=>allowed.includes(k)),'unknown field for '+value.phase+' phase');
 assert(spec.required.every(k=>typeof o[k]==='string'&&o[k].trim()),
  'required input missing for '+value.phase+' phase');
 for(const [k,v] of Object.entries(o)){
  assert(typeof v==='string'&&v.length>0&&v.length<4096&&v.trim()===v,
   'invalid input value '+k);
  if(value.phase==='local'&&['provider','origin'].includes(k)||
   value.phase==='public-capture'&&k==='origin')continue;
  assert(path.isAbsolute(v)&&path.normalize(v)===v,
   'all private source file and folder paths must be normalized absolute paths: '+k);
 }
 if(value.phase==='local'){
  assert(['apache','nginx','netlify','cloudflare-pages'].includes(o.provider),
   'unknown static hosting provider');
  let u;try{u=new URL(o.origin)}catch{throw Error('Invalid localhost PHP URL')}
  assert(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)&&
   !u.username&&!u.password&&!u.search&&!u.hash&&
   /^\/published\/[a-z0-9-]+\/$/.test(u.pathname),
   'PHP acceptance must use an exact localhost-only /published/SITE-ID/ origin');
 }
 if(value.phase==='public-capture'){
  let u;try{u=new URL(o.origin)}catch{throw Error('Invalid public HTTPS origin')}
  assert(u.protocol==='https:'&&u.pathname==='/'&&u.port===''&&
   !u.username&&!u.password&&!u.search&&!u.hash&&
   /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(u.hostname)&&
   !/(?:^|\.)(?:localhost|local|internal|test|example|invalid)$/.test(u.hostname)&&
   !/^\d+(?:\.\d+){3}$/.test(u.hostname),
   'live public capture requires an explicit DNS HTTPS root without custom port');
  assert(!o.previousPublicMediaDigests||o.previousPublicHttp,
   'previous media SHA256 receipts require matching previous HTTPS capture');
 }
 if(value.phase==='search'){
  assert(o.indexing||o.searchHistory,'Search follow-up needs a genuine indexing or history report');
  assert(Boolean(o.liveAcceptanceReview)===Boolean(o.liveAcceptanceContract),
   'Real-world human acceptance review and exact lead contract must be supplied together');
 }
 return Object.freeze({format:FORMAT,phase:value.phase,inputs:Object.freeze({...o})});
}
const flags=(fields,map)=>Object.entries(map).flatMap(([k,v])=>
 fields[k]===undefined?[]:['--'+v,fields[k]]);
function steps(config,root){
 const c=validate(config);
 assert(path.isAbsolute(root),'session output must be an absolute directory');
 const inps=c.inputs;
 if(c.phase==='local'){
  const candidate=path.join(root,'candidate');
  return Object.freeze([
   {key:'prepare',cli:'prepare-first-site.cjs',argv:flags({...inps,workspace:candidate}, {...PREP_KEYS,workspace:'workspace'})},
   {key:'relay',cli:'build-first-site-lead-relay.cjs',argv:flags({candidate,out:path.join(root,'lead-relay')},{candidate:'candidate',out:'out'})},
   {key:'acceptance-template',cli:'manage-first-site-acceptance.cjs',
    argv:['template','--summary',path.join(candidate,'seo-report','summary.json'),
     '--bundle',path.join(candidate,'seo-report','bundle.json'),
     '--out',path.join(root,'human-acceptance-template')]},
   {key:'workspace',cli:'build-seo-operator-workspace.cjs',
    argv:['--config',path.join(root,'workspace-config.json'),
     '--out',path.join(root,'operator-workspace')]}
  ]);
 }
 if(c.phase==='public'||c.phase==='public-capture'){
  const out=path.join(root,'post-deploy'),fresh=c.phase==='public-capture';
  const observed=fresh?{
   publicHttpEvidence:path.join(root,'captured-public-http.json'),
   publicMediaDigests:path.join(root,'captured-public-media-sha256.json')
  }:inps;
  const capture=fresh?[{key:'capture',cli:'capture-public-https.cjs',
   argv:flags({...inps,out:observed.publicHttpEvidence,
    mediaDigestOut:observed.publicMediaDigests},CAPTURE_KEYS)}]:[];
  return Object.freeze([
   ...capture,
   {key:'verify',cli:'verify-deployed-site.cjs',
    argv:flags({...inps,...observed,out}, {...VERIFY_KEYS,out:'out'})},
   {key:'relay',cli:'build-first-site-lead-relay.cjs',
    argv:flags({candidate:inps.candidate,postDeploy:path.join(out,'post-deploy-summary.json'),
     out:path.join(root,'lead-relay')}, {candidate:'candidate',postDeploy:'post-deploy',out:'out'})},
   {key:'live-acceptance-template',cli:'first-site-live-acceptance.cjs',
    argv:['template','--candidate',inps.candidate,
     '--contract',path.join(root,'lead-relay','INTEGRATION-CONTRACT.json'),
     '--post-deploy',path.join(out,'post-deploy-summary.json'),
     '--out',path.join(root,'live-acceptance-template')]},
   {key:'workspace',cli:'build-seo-operator-workspace.cjs',
    argv:['--config',path.join(root,'workspace-config.json'),
     '--out',path.join(root,'operator-workspace')]}
  ]);
 }
 return Object.freeze([
  {key:'relay',cli:'build-first-site-lead-relay.cjs',
   argv:flags({...inps,out:path.join(root,'lead-relay')},{...RELAY_KEYS,out:'out'})},
  {key:'workspace',cli:'build-seo-operator-workspace.cjs',
   argv:['--config',path.join(root,'workspace-config.json'),
    '--out',path.join(root,'operator-workspace')]}
 ]);
}
function summary(config,outputs){
 const c=validate(config);
 const plan=steps(c,outputs.root);
 const expected=c.phase==='local'?['prepare','relay','acceptance-template','workspace']:
  c.phase==='public'?['verify','relay','live-acceptance-template','workspace']:
  c.phase==='public-capture'?['capture','verify','relay','live-acceptance-template','workspace']:
  ['relay','workspace'];
 assert(expected.every(k=>outputs[k]&&typeof outputs[k]==='object'),
  'stage results are incomplete');
 const result={format:'manufact-seo-first-site-integration-session-v1',version:1,
  phase:c.phase,readOnly:true,siteId:outputs.relay.siteId,
  localCandidatePrepared:c.phase==='local',
  publicVerificationSupplied:['public','public-capture'].includes(c.phase),
  liveHttpsCapturePerformed:c.phase==='public-capture',
  searchFollowupSupplied:c.phase==='search',
  candidateDisposition:outputs.prepare?.status||null,
  postDeployDisposition:outputs.verify?.status||null,
  integrationDisposition:outputs.relay.stage||null,
  integrationReportRelativePath:'lead-relay/INTEGRATION-CONTRACT.json',
  instructionsRelativePath:'lead-relay/LEAD-NEXT-ACTIONS.md',
  privateOperatorWorkspaceRelativeFile:'operator-workspace/index.html',
  humanAcceptanceTemplateCreated:c.phase==='local',
  liveAcceptanceTemplateCreated:['public','public-capture'].includes(c.phase),
  ...(['public','public-capture'].includes(c.phase)?{liveAcceptanceTemplateRelativeFile:
   'live-acceptance-template/live-acceptance-template.json'}:{}),
  ...(c.phase==='local'?{humanAcceptanceTemplateRelativeFile:
   'human-acceptance-template/first-site-operator-template.json'}:{}),
  ...(c.phase==='local'?{candidateRelativeDir:'candidate'}:{}),
  ...(['public','public-capture'].includes(c.phase)?{postDeployRelativeDir:'post-deploy'}:{}),
  ...(c.phase==='public-capture'?{
   capturedPublicHttpRelativeFile:'captured-public-http.json',
   capturedPublicMediaSha256RelativeFile:'captured-public-media-sha256.json'}:{}),
  verifiedStages:plan.map(s=>s.key),
  sitePublicationAuthorized:false,
  externalPublicNetworkCallsBySession:c.phase==='public-capture'?
   outputs.capture.requests+outputs.capture.publicMediaGetRequests:0,
  publicHttpsReadOnlyGetPerformed:c.phase==='public-capture',
  localhostPhpGetMayOccur:c.phase==='local',
  hostWritesBySession:0,automaticClientSignoff:false,
  manualOwnerActionRequired:true};
 assert(typeof result.siteId==='string'&&result.siteId.length>0,
  'lead relay result lacks source-bound site ID');
 if(outputs.capture){
  assert(outputs.capture.siteId===result.siteId&&
   outputs.capture.publicHttpsTransportCaptured===true&&
   outputs.capture.rootWindowMatched===true&&outputs.capture.mediaShaVerified===true&&
   Number.isSafeInteger(outputs.capture.requests)&&outputs.capture.requests>=2&&
   Number.isSafeInteger(outputs.capture.publicMediaGetRequests)&&outputs.capture.publicMediaGetRequests>=0,
   'live public HTTPS/asset capture must have valid read-only GET receipts for this exact site');
 }
 if(outputs.prepare)assert(outputs.prepare.siteId===result.siteId,
  'candidate and lead relay site IDs conflict');
 if(outputs.verify)assert(outputs.verify.siteId===result.siteId,
  'post-deploy and lead relay site IDs conflict');
 return Object.freeze(result);
}
function markdown(session,source=null){
 assert(session?.format==='manufact-seo-first-site-integration-session-v1'&&
  session.readOnly===true&&session.sitePublicationAuthorized===false&&
  session.manualOwnerActionRequired===true,
  'operator handoff requires the original non-authorizing integration result');
 const s=x=>String(x??'').replace(/[\r\n|<>]/g,' ').slice(0,180);
 const lines=['# MANUFACT SEO — first-client private integration session','',
  'Site: '+s(session.siteId),
  'Phase: '+s(session.phase),
  'Operator disposition: '+s(session.integrationDisposition||'NOT-OBSERVED'),
  'Owner/client publication approval: **NOT PROVIDED**','',
  '## Source contract',''];
 if(source){
  lines.push('Owner-published sourceRevision claim: '+s(source.sourceRevisionClaim),
   'Approved Site v2 source SHA256: '+s(source.sealedApprovedSourceSha256),
   'Official static manifest SHA256: '+s(source.officialStaticManifestSha256),
   'Published CMS version: '+s(source.publishedVersion),'');
 }else lines.push('No current owner-authenticated revision in search phase; rely on exact saved release ZIP / post-deploy report hashes.','');
 lines.push('## Stage products','');
 if(session.candidateRelativeDir)lines.push('- Candidate: '+session.candidateRelativeDir);
 if(session.capturedPublicHttpRelativeFile){
  lines.push('- Real HTTPS GET transcript: '+session.capturedPublicHttpRelativeFile,
   '- Real public media GET SHA256 transcript: '+session.capturedPublicMediaSha256RelativeFile);
 }
 if(session.postDeployRelativeDir)lines.push('- Read-only public verification: '+session.postDeployRelativeDir);
 if(session.humanAcceptanceTemplateRelativeFile)
  lines.push('- Unfilled local manual acceptance: '+session.humanAcceptanceTemplateRelativeFile);
 if(session.liveAcceptanceTemplateRelativeFile)
  lines.push('- Unfilled real browser/device/form acceptance: '+session.liveAcceptanceTemplateRelativeFile);
 lines.push('- Exact source/ZIP release relay: '+session.integrationReportRelativePath,
  '- Lead next actions: '+session.instructionsRelativePath,
  '- Private operator HTML dashboard: '+session.privateOperatorWorkspaceRelativeFile,
  '', 'Stages: '+session.verifiedStages.map(s).join(' → '),
  '', '## Network and authority boundaries','',
  '- Actual live HTTPS/asset GETs performed in this session: '+
   session.externalPublicNetworkCallsBySession,
  '- Actual localhost PHP GETs: '+(session.localhostPhpGetMayOccur?
   'Yes; local phase collects localhost PHP evidence':'No'),
  '- No form POST, CMS write, public deployment, PR, merge or client authorization.',
  '- Public DNS/TLS, visual parity, form delivery, owner revision and client signature require independent lead review.',
  '- Never upload this private session or customer report files; only a separately owner-approved PUBLIC candidate archive may be deployed.',
  '', '## What to do next','');
 if(session.phase==='local')lines.push('Lead: review PHP/static blockers and the original owner source, preview verified public-only ZIP, then approve or reject before any deployment.');
 else if(session.phase==='public'||session.phase==='public-capture')
  lines.push('Lead: independently authenticate the public host and release, inspect failed HTTP/media checks, fill the page/device/form template using actual browser and authorized delivery receipts.');
 else lines.push('SEO operator: inspect real GSC indexing/search observations and ask the owner to approve any CMS implementation packet; missing URLs are UNKNOWN.');
 lines.push('','**This is an operator evidence index, NEVER permission to deploy.**','');
 return lines.join('\n');
}
module.exports=Object.freeze({FORMAT,PHASES,validate,steps,summary,markdown});
