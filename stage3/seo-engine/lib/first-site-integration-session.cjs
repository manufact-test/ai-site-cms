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
 search:{required:['candidate','postDeploy','blueprint'],
  optional:['indexing','searchHistory']}
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
  if(value.phase==='local'&&['provider','origin'].includes(k))continue;
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
 if(value.phase==='search'){
  assert(o.indexing||o.searchHistory,'Search follow-up needs a genuine indexing or history report');
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
 if(c.phase==='public'){
  const out=path.join(root,'post-deploy');
  return Object.freeze([
   {key:'verify',cli:'verify-deployed-site.cjs',
    argv:flags({...inps,out}, {...VERIFY_KEYS,out:'out'})},
   {key:'relay',cli:'build-first-site-lead-relay.cjs',
    argv:flags({candidate:inps.candidate,postDeploy:path.join(out,'post-deploy-summary.json'),
     out:path.join(root,'lead-relay')}, {candidate:'candidate',postDeploy:'post-deploy',out:'out'})},
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
  c.phase==='public'?['verify','relay','workspace']:['relay','workspace'];
 assert(expected.every(k=>outputs[k]&&typeof outputs[k]==='object'),
  'stage results are incomplete');
 const result={format:'manufact-seo-first-site-integration-session-v1',version:1,
  phase:c.phase,readOnly:true,siteId:outputs.relay.siteId,
  localCandidatePrepared:c.phase==='local',publicVerificationSupplied:c.phase==='public',
  searchFollowupSupplied:c.phase==='search',
  candidateDisposition:outputs.prepare?.status||null,
  postDeployDisposition:outputs.verify?.status||null,
  integrationDisposition:outputs.relay.stage||null,
  integrationReportRelativePath:'lead-relay/INTEGRATION-CONTRACT.json',
  instructionsRelativePath:'lead-relay/LEAD-NEXT-ACTIONS.md',
  privateOperatorWorkspaceRelativeFile:'operator-workspace/index.html',
  humanAcceptanceTemplateCreated:c.phase==='local',
  ...(c.phase==='local'?{humanAcceptanceTemplateRelativeFile:
   'human-acceptance-template/first-site-operator-template.json'}:{}),
  ...(c.phase==='local'?{candidateRelativeDir:'candidate'}:{}),
  ...(c.phase==='public'?{postDeployRelativeDir:'post-deploy'}:{}),
  verifiedStages:plan.map(s=>s.key),
  sitePublicationAuthorized:false,externalPublicNetworkCallsBySession:0,
  localhostPhpGetMayOccur:c.phase==='local',
  hostWritesBySession:0,automaticClientSignoff:false,
  manualOwnerActionRequired:true};
 assert(typeof result.siteId==='string'&&result.siteId.length>0,
  'lead relay result lacks source-bound site ID');
 if(outputs.prepare)assert(outputs.prepare.siteId===result.siteId,
  'candidate and lead relay site IDs conflict');
 if(outputs.verify)assert(outputs.verify.siteId===result.siteId,
  'post-deploy and lead relay site IDs conflict');
 return Object.freeze(result);
}
module.exports=Object.freeze({FORMAT,PHASES,validate,steps,summary});
