#!/usr/bin/env node
'use strict';
/* One operator-side private workflow over the existing SEO launch CLIs.
 * Only loopback PHP GET is used by "local"; no public network or CMS writes.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PLAN=require('../lib/first-site-integration-session.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const BRIDGE=require('../lib/approved-site-bridge.cjs');
const FIRST=require('./first-site-check.cjs');
const EXPORT=require('../lib/php-local-static-export.cjs');
const PREP=require('./prepare-first-site.cjs');
const VERIFY=require('./verify-deployed-site.cjs');
const RELAY=require('./build-first-site-lead-relay.cjs');
const ACCEPT=require('./manage-first-site-acceptance.cjs');
const WORKSPACE=require('./build-seo-operator-workspace.cjs');
const LIVE=require('./first-site-live-acceptance.cjs');
const CAPTURE=require('./capture-public-https.cjs');
const HTTPS=require('../lib/public-https-capture.cjs');
const CANDIDATE=require('../lib/first-site-candidate-preflight.cjs');
const PIN=require('../lib/first-site-session-source-pin.cjs');
const ROOT=fs.realpathSync(path.resolve(__dirname,'../../..'));
const LIMIT=120000;
const HELP='Usage: node stage3/seo-engine/bin/run-first-site-integration.cjs --config /ABS/private/integration-session.json --out /ABS/NEW-private-session [--preflight-only]';
function parse(argv){
 if(argv.length===5&&argv[4]==='--preflight-only'||
    argv.length===4){
  if(argv[0]==='--config'&&path.isAbsolute(argv[1])&&argv[2]==='--out'&&path.isAbsolute(argv[3]))
   return {config:argv[1],out:argv[3],preflightOnly:argv.length===5};
 }
 if(argv.length===1&&argv[0]==='--help')return null;
 throw Error(HELP);
}
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function outside(file,type){
 const resolved=fs.realpathSync(file),rel=path.relative(ROOT,resolved);
 if(rel===''||rel==='.'||rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel))
  throw Error('Owner/site/client data must live OUTSIDE the repository checkout');
 const info=fs.lstatSync(file);
 if(info.isSymbolicLink()||(type==='dir'?!info.isDirectory():!info.isFile()))
  throw Error('Expected ordinary private '+type+' source: '+file);
 return resolved;
}
function readConfig(file){
 outside(file,'file');
 const s=fs.lstatSync(file);
 if(s.size<25||s.size>LIMIT)throw Error('Invalid private integration session JSON size');
 const body=fs.readFileSync(file);
 return {config:PLAN.validate(JSON.parse(body.toString('utf8'))),sha256:sha(body)};
}
function preflight(config,output){
 const c=PLAN.validate(config),sources={},target=PRIVATE.privateOutput(output);
 const root=fs.realpathSync(path.dirname(target));
 for(const [key,raw] of Object.entries(c.inputs)){
  if(c.phase==='local'&&['origin','provider'].includes(key)||
     c.phase==='public-capture'&&key==='origin')continue;
  const typ=['approvedSite','staticExport','candidate','previousUpload','previousReport'].includes(key)?'dir':'file';
  const resolved=outside(raw,typ);
  if(resolved===root||root.startsWith(resolved+path.sep)||
     target===resolved||target.startsWith(resolved+path.sep))
   throw Error('Private integration workspace must not be placed inside a source directory');
  sources[key]={kind:typ,realPath:resolved};
 }
 // These are the same canonical owner/approved validators used by actual PHP
 // capture and post-deployment verifier. No stand-in synthetic source accepted.
 // Verify the ORIGINAL candidate and every public ZIP byte BEFORE any public GET.
 // This prevents cross-site/cross-version public capture against the wrong release.
 let source=null,candidate=null;
 if(['local','public','public-capture'].includes(c.phase)){
  const sealed=BRIDGE.load(c.inputs.approvedSite);
  const owner=FIRST.readPublishedSite(c.inputs.publishedSite);
  if(!Number.isSafeInteger(owner.sourceRevision)||owner.sourceRevision<1)
   throw Error('Owner-authenticated published-site sourceRevision is mandatory');
  const edits=c.inputs.ownerEditReview?FIRST.readOwnerEditReview(c.inputs.ownerEditReview):null;
  const published=BRIDGE.reconcile(sealed,owner.site,owner.version,edits);
  const release=EXPORT.read(c.inputs.staticExport,published.site);
  if(release.publishedVersion!==owner.version||release.sourceRevision!==owner.sourceRevision)
   throw Error('Official export does not match owner-published CMS version and sourceRevision');
  if(c.phase==='public-capture'){
   const u=HTTPS.origin(c.inputs.origin,published.site.siteId);
   if(u.pathname!=='/'||release.origin!==u.origin)
    throw Error('Actual public HTTPS root must exactly match the official static export origin');
  }
  if(c.phase==='local'){
   const plan=FIRST.readBlueprint(c.inputs.blueprint);
   if(plan.siteId!==published.site.siteId)
    throw Error('Approved Blueprint and owner published site IDs differ');
   if(new URL(c.inputs.origin).pathname!=='/published/'+published.site.siteId+'/')
    throw Error('Local PHP URL does not match exact owner-published site ID');
  }
  const officialAssets=release.assets instanceof Map?[...release.assets.values()]:[];
  const estimatedOfficialMediaBytes=officialAssets.reduce((sum,asset)=>sum+asset.bytes,0);
  if(!Number.isSafeInteger(estimatedOfficialMediaBytes)||estimatedOfficialMediaBytes<0)
   throw Error('Official published media byte budget is invalid');
  source={siteId:published.site.siteId,publishedVersion:owner.version,
   sourceRevisionClaim:owner.sourceRevision,
   officialStaticManifestSha256:release.manifestSha256,
   sealedApprovedSourceSha256:published.source.fileSha256,
   ...(c.phase==='public-capture'?{
    expectedPublicPageRoutes:published.site.pages.length,
    expectedMediaGetResources:officialAssets.length,
    officialMediaSourceBytes:estimatedOfficialMediaBytes,
    liveHttpsReadOnlyGETRequired:true
   }:{})};
 }
 if(c.phase!=='local'){
  candidate=CANDIDATE.inspect(c.inputs.candidate,source);
  if(c.phase==='search'||c.phase==='human-review'){
   const file=c.inputs.postDeploy,st=fs.lstatSync(file);
   if(st.isSymbolicLink()||!st.isFile()||st.size<10||st.size>2500000)
    throw Error('Search follow-up needs a bounded private post-deploy report file');
   CANDIDATE.postDeploy(candidate,JSON.parse(fs.readFileSync(file,'utf8')));
  }
 }
 return {phase:c.phase,source,candidate,stageKeys:PLAN.steps(c,target).map(s=>s.key),
  privateInputsChecked:Object.keys(sources).length,operatorOnly:true,
  clientApprovalConfirmed:false,phpServerContacted:false,
  publicHttpsAuthenticated:false,releaseAuthorized:false};
}
async function main(argv){
 const opt=parse(argv);
 if(!opt){process.stdout.write(HELP+'\n');return null;}
 const read=readConfig(opt.config),target=PRIVATE.privateOutput(opt.out);
 if(target===opt.config||target.startsWith(opt.config+path.sep))
  throw Error('Private session must not overwrite its config');
 const info=preflight(read.config,target);
 // Freeze every user-supplied file that matters to the exact launch record
 // before the first localhost/public GET, including the potentially large ZIP.
 const sourcePin=PIN.capture(read.config);
 if(opt.preflightOnly){
  process.stdout.write('FIRST-SITE PREFLIGHT (NO WORK EXECUTED): '+
   JSON.stringify({...info,sourceFilesPinned:sourcePin.pinnedRoles.length,
    approvedForProduction:false})+'\n');
  return info;
 }
 const startSha=read.sha256;
 const root=path.resolve(target);
 fs.mkdirSync(root,{mode:0o700});
 let success=false;
 try{
  const operations={
   'live-acceptance-review':argv=>{
    const info=LIVE.main(argv),folder=path.join(root,'live-acceptance-review');
    const body=fs.readFileSync(path.join(folder,'live-acceptance-review.json'));
    const actions=fs.readFileSync(path.join(folder,'LIVE-ACCEPTANCE-NEXT-ACTIONS.json'));
    const report=JSON.parse(body),next=JSON.parse(actions);
    if(info.action!=='review'||report.siteId!==info.siteId||
       report.sourceContractSha256!==sha(fs.readFileSync(read.config.inputs.contract))||
       report.releaseAuthorized!==false||next.releaseAuthorized!==false||
       next.siteId!==report.siteId)
     throw Error('Reviewed human evidence does not match exact source and lead contract');
    if(!Number.isSafeInteger(next.counts?.urgent)||
       !Number.isSafeInteger(next.counts?.pending)||next.counts.pending<1)
     throw Error('Private action queue lacks validated operator P0/P1 counts');
    return {siteId:info.siteId,action:'review',status:report.status,
     urgent:next.counts.urgent,pending:next.counts.pending,
     reportSha256:sha(body),nextActionsSha256:sha(actions)};
   },
   prepare:PREP.main,capture:CAPTURE.main,verify:VERIFY.main,relay:RELAY.main,
   'acceptance-template':argv=>{
    ACCEPT.main(argv);
    const bytes=fs.readFileSync(path.join(root,'human-acceptance-template','first-site-operator-template.json'));
    const v=JSON.parse(bytes.toString('utf8'));
    if(v.format!=='manufact-seo-first-site-operator-ledger-v1'||v.siteId!==results.relay.siteId)
     throw Error('Human acceptance template is not pinned to this release');
    return {siteId:v.siteId,templateSha256:sha(bytes)};
   },
   'live-acceptance-template':argv=>{
    const info=LIVE.main(argv);
    const bytes=fs.readFileSync(path.join(root,'live-acceptance-template','live-acceptance-template.json'));
    const data=JSON.parse(bytes.toString('utf8'));
    if(info.siteId!==results.relay.siteId||data.siteId!==results.relay.siteId||
       data.format!=='manufact-seo-first-site-live-acceptance-v1')
     throw Error('Live acceptance template does not match verified public release');
    return {siteId:data.siteId,templateSha256:sha(bytes)};
   },
   workspace:argv=>{
    const inps=read.config.inputs,candidate=read.config.phase==='local'?
     path.join(root,'candidate'):inps.candidate;
    const src={format:'manufact-seo-operator-workspace-config-v1',
     firstSite:{summary:path.join(candidate,'seo-report','summary.json'),
      bundle:path.join(candidate,'seo-report','bundle.json'),
      ...(['public','public-capture'].includes(read.config.phase)?
       {postDeploy:path.join(root,'post-deploy','post-deploy-summary.json')}:
       ['search','human-review'].includes(read.config.phase)?{postDeploy:inps.postDeploy}:{})},
     ...(read.config.phase==='search'&&inps.searchHistory?
      {search:{history:inps.searchHistory}}:{}),
     ...(read.config.phase==='search'&&inps.indexing?
      {indexing:{report:inps.indexing}}:{}),
     ...(read.config.phase==='human-review'?{liveAcceptance:{
      report:path.join(root,'live-acceptance-review','live-acceptance-review.json'),
      contract:inps.contract}}:{}),
     ...(['public','public-capture'].includes(read.config.phase)?
      {operatorDesk:{href:'../live-acceptance-template/LIVE-ACCEPTANCE-DESK.html'}}:{}),
     ...(read.config.phase==='search'&&inps.liveAcceptanceReview?
      {liveAcceptance:{report:inps.liveAcceptanceReview,contract:inps.liveAcceptanceContract}}:{})};
    fs.writeFileSync(path.join(root,'workspace-config.json'),JSON.stringify(src,null,2)+'\n',
     {flag:'wx',mode:0o600});
    WORKSPACE.main(argv);
    const manifest=fs.readFileSync(path.join(root,'operator-workspace','workspace-manifest.json'));
    const v=JSON.parse(manifest.toString('utf8'));
    const expected=results.relay||results['live-acceptance-review'];
    if(v.siteId!==expected.siteId||v.releaseAuthorized!==false||
       read.config.phase==='human-review'&&v.overview?.humanAcceptanceIncluded!==true)
     throw Error('Private operator workspace refers to another client site or release');
    return {siteId:v.siteId,workspaceManifestSha256:sha(manifest)};
   }
  };
  const results={root};
  for(const step of PLAN.steps(read.config,root))
   results[step.key]=await operations[step.key](step.argv);
  const result=PLAN.summary(read.config,results);
  const finalConfig=readConfig(opt.config);
  if(finalConfig.sha256!==startSha)
   throw Error('Private session config changed during stage execution; discard all stages');
  PIN.unchanged(sourcePin,PIN.capture(read.config));
  const relayFile=fs.readFileSync(read.config.phase==='human-review'?
   read.config.inputs.contract:path.join(root,'lead-relay','INTEGRATION-CONTRACT.json'));
  const verifiedOutputs={
   relaySha256:sha(relayFile),
   workspaceManifestSha256:results.workspace.workspaceManifestSha256,
   ...(results['live-acceptance-review']?{
    liveAcceptanceReviewSha256:results['live-acceptance-review'].reportSha256,
    liveAcceptanceNextActionsSha256:results['live-acceptance-review'].nextActionsSha256}:{}),
   ...(results['acceptance-template']?
    {humanAcceptanceTemplateSha256:results['acceptance-template'].templateSha256}:{}),
   ...(results['live-acceptance-template']?
    {liveAcceptanceTemplateSha256:results['live-acceptance-template'].templateSha256}:{}),
   ...(read.config.phase==='local'?
    {candidateStatusSha256:sha(fs.readFileSync(path.join(root,'candidate','CANDIDATE-STATUS.json')))}:{}),
   ...(['public','public-capture'].includes(read.config.phase)?
    {postDeploySummarySha256:sha(fs.readFileSync(path.join(root,'post-deploy','post-deploy-summary.json')))}:{}),
   ...(read.config.phase==='public-capture'?{
    capturedPublicHttpSha256:sha(fs.readFileSync(path.join(root,'captured-public-http.json'))),
    capturedMediaDigestsSha256:sha(fs.readFileSync(path.join(root,'captured-public-media-sha256.json')))
   }:{})
  };
  fs.writeFileSync(path.join(root,'INTEGRATION-SESSION.json'),
   JSON.stringify({...result,sessionConfigSha256:startSha,sourcePreflight:info.source,
    privateSourceEvidenceSha256:sourcePin.sha256ByRole,
    sourceMutationsRejected:true,
    verifiedOutputSha256:verifiedOutputs},null,2)+'\n',
   {flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(root,'INTEGRATION-SESSION-HANDOFF.md'),
   PLAN.markdown(result,info.source),{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(root,'PRIVATE-README.txt'),
   'Private operator-only first-site session. Never publish, upload or commit. Only verified PUBLIC static files from candidate/static-upload/public may be considered by authorized lead.\n',
   {flag:'wx',mode:0o600});
  success=true;
  return {output:root,siteId:result.siteId,phase:result.phase,
   stage:result.integrationDisposition,releaseAuthorized:false,operatorActionRequired:true};
 }finally{
  if(!success){
   // This directory was created exclusively by this invocation and every
   // output was scoped under it. Never clean up user-provided evidence.
   fs.rmSync(root,{recursive:true,force:true});
  }
 }
}
if(require.main===module)
 main(process.argv.slice(2))
 .then(result=>{if(result&&result.output)process.stdout.write(
  'FIRST-SITE INTEGRATION SESSION: '+JSON.stringify(result)+'\n');})
 .catch(e=>{process.stderr.write('First-site integration refused: '+e.message+'\n');process.exitCode=1;});
module.exports=Object.freeze({parse,readConfig,preflight,main});
