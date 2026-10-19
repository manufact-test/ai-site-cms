'use strict';
/*
 * Stage2 owner exit decision packet. Aggregates only local package verification
 * and explicitly optional operator-provided evidence. It NEVER approves Stage2.
 * It neither invokes HTTP/DB/hosting actions nor writes into site/CMS roots.
 */
const fs=require('node:fs');
const path=require('node:path');
const {createDossier,OUT,stable,digest}=require('./stage2-license-dossier.cjs');
const operatorScope=require('./stage2-operator-scope.cjs');
const FORMAT='ai-site-cms-stage2-owner-decision-packet-v1';
const NAMES=['cmsHealth','cmsPrivateVendor','cmsPrivateEditor',
  'cmsPublishGet','visitorHome'];
const html=x=>String(x).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
const shaOf=o=>digest(Buffer.from(stable(o)));
function isObject(x){return x&&typeof x==='object'&&!Array.isArray(x);}
function validated(source,type){
  if(source==null)return null;
  if(!isObject(source))throw Error('Evidence must be a JSON object');
  if(type==='offline'){
    if(source.format!=='ai-site-cms-stage2-target-handoff-v1'
      ||typeof source.localFilesystemAndPackageCompatible!=='boolean'
      ||!(/^[a-f0-9]{64}$/.test(source.cmsPackageManifestSha256||''))
      ||source.cmsAndSiteRootsSeparated!==true
      ||source.cmsDocumentRootIsPublic!==true
      ||source.actualTargetHostTestedByProject!==false
      ||source.stage2Accepted!==false||source.productionReady!==false
      ||source.networkAttempted!==false||source.databaseConnected!==false)
      throw Error('Untrusted local handoff shape');
    return {
      format:source.format,
      localFilesystemAndPackageCompatible:source.localFilesystemAndPackageCompatible,
      inspectedManifestSha256:source.cmsPackageManifestSha256,
      externalReceiptOnly:true,
      liveHostVerified:false
    };
  }
  if(type==='https'){
    if(source.format!=='ai-site-cms-stage2-active-https-observation-v1'
      ||!isObject(source.results)
      ||typeof source.ciLoopbackOnly!=='boolean'
      ||typeof source.actualHttpsRequestsAttempted!=='boolean'
      ||typeof source.httpsObservationsPass!=='boolean'
      ||!(/^[a-f0-9]{64}$/.test(source.requestedOriginsSha256||''))
      ||!(source.operatorScopeRecordSha256===null||
        /^[a-f0-9]{64}$/.test(source.operatorScopeRecordSha256||''))
      ||source.targetHostAccepted!==false||source.stage2Accepted!==false
      ||source.productionReady!==false
      ||Object.keys(source.results).sort().join('|')!==NAMES.slice().sort().join('|'))
      throw Error('Untrusted HTTPS observation shape');
    const names={};
    for(const name of NAMES){
      const record=source.results[name];
      if(!isObject(record)||typeof record.passed!=='boolean'
        ||!((Number.isInteger(record.status)&&record.status>=100&&record.status<=599)
          ||record.status===null)
        ||typeof record.tlsPeerVerified!=='boolean')throw Error('Invalid HTTPS check');
      names[name]={reportedPass:record.passed,reportedStatus:record.status};
    }
    if(source.httpsObservationsPass!==NAMES.every(n=>names[n].reportedPass)
      ||source.httpsObservationsPass&&!source.actualHttpsRequestsAttempted)
      throw Error('Inconsistent HTTPS report');
    return {
      format:source.format,
      observationsProvided:true,
      claimedHttpsChecksPass:source.httpsObservationsPass,
      claimedRealHttpsRequests:source.actualHttpsRequestsAttempted,
      disposableCiFixture:source.ciLoopbackOnly,
      originPairSha256:source.requestedOriginsSha256,
      scopeRecordSha256:source.operatorScopeRecordSha256,
      checks:names,externalReceiptOnly:true,
      liveTargetHostIndependentlyVerified:false
    };
  }
  if(type==='scope'){
    const inspected=operatorScope.inspectScope(source,{
      cmsOrigin:source.cmsOrigin,siteOrigin:source.siteOrigin
    });
    return {operatorScopeRecordSha256:inspected.operatorScopeRecordSha256,
      originPairSha256:inspected.originPairSha256,
      scopeExpiresAt:inspected.scopeExpiresAt,
      externalReceiptOnly:true,independentOwnerAuthorizationVerified:false};
  }
  if(type==='database'){
    const states=['ready','blocked','uninitialized','schema_ready_unbound','upgrade_required'];
    if(!states.includes(source.state)
      ||!['matched','no_cms_tables','incomplete_schema','empty_migration_history',
        'future_or_invalid_migration','migration_history_mismatch',
        'site_identity_missing','site_identity_mismatch','schema_version_behind',
        'schema_inconsistent_or_foreign'].includes(source.reason)
      ||!(source.version===null||Number.isInteger(source.version)&&source.version>=1&&source.version<=2))
      throw Error('Unsupported Stage2 database preflight shape');
    return {
      reportedState:source.state,reportedVersion:source.version,
      externalReceiptOnly:true,
      databaseIdentityIndependentlyProven:false
    };
  }
  throw Error('Invalid evidence type');
}
function assemble(license,extra={}){
  if(!isObject(license)||license.format!=='ai-site-cms-stage2-license-review-v1'
    ||license.componentCount!==43||license.phpRuntimeComponentCount!==14
    ||license.browserRuntimeComponentCount!==1
    ||license.independentLegalApproval!==false
    ||license.stage2Accepted!==false||!Array.isArray(license.components)
    ||license.components.length!==43)throw Error('Expected verified license inventory');
  if(Object.keys(extra).some(k=>!['offline','https','database','scope'].includes(k)))
    throw Error('Unknown decision evidence');
  const evidence={
    offlineLocal:validated(extra.offline,'offline'),
    externalHttps:validated(extra.https,'https'),
    databaseSchema:validated(extra.database,'database'),
    operatorScope:validated(extra.scope,'scope')
  };
  if(evidence.offlineLocal &&
    evidence.offlineLocal.inspectedManifestSha256!==license.packageManifestSha256)
    throw Error('Operator handoff describes different CMS package');
  if(evidence.externalHttps){
    const https=evidence.externalHttps,grant=evidence.operatorScope;
    if(!https.disposableCiFixture && (!grant||
      https.originPairSha256!==grant.originPairSha256||
      https.scopeRecordSha256!==grant.operatorScopeRecordSha256))
      throw Error('HTTPS observations not bound to provided operator scope');
    if(https.disposableCiFixture && https.scopeRecordSha256!==null)
      throw Error('CI HTTPS report cannot claim real operator scope');
  }
  const criteria=[
    {id:'architecture_and_isolation',name:'Owner approves CMS/site and 5-family architecture',
      state:'owner_decision_required',supportedBy:['lab CI','architecture proposal']},
    {id:'license_review',name:'Independent legal review of 43 pinned dependencies',
      state:'independent_human_approval_required',supportedBy:['verified internal package','NOTICE hashes','SBOM']},
    {id:'target_package_structure',name:'Target filesystem and package integrity',
      state:evidence.offlineLocal?.localFilesystemAndPackageCompatible
        ?'operator_record_supplied_not_independently_authenticated':'permissioned_target_check_missing',
      supportedBy:['offline target handoff', 'package hash inventory']},
    {id:'target_https_and_routing',name:'Real target HTTPS and private route protection',
      state:evidence.externalHttps?.claimedHttpsChecksPass&&!evidence.externalHttps.disposableCiFixture
        ?'operator_record_supplied_not_independently_authenticated':'permissioned_target_check_missing',
      supportedBy:['bounded actual HTTPS GET observation when separately authorized']},
    {id:'target_web_sapi_and_db',name:'Real PHP-FPM/Apache ABI, isolated database and credentials',
      state:'permissioned_target_check_missing',
      supportedBy:['actual host SAPI and SQL credentials under separate permission']},
    {id:'site_survives_cms_outage',name:'Independent public site during CMS outage',
      state:'permissioned_target_check_missing',
      supportedBy:['controlled outage with separate operator approval']},
    {id:'trial_empty_cms_install',name:'Explicitly approved empty-CMS install on real target',
      state:'write_install_approval_required',
      supportedBy:['separate installation consent, never implied by read-only grant']},
    {id:'owner_acceptance',name:'Owner explicitly accepts Stage 2',
      state:'owner_decision_required',supportedBy:['human approval outside this tool']}
  ];
  return {
    format:FORMAT,scope:'offline-owner-review-material-not-an-acceptance-gate',
    packageVersion:license.packageVersion,
    packageManifestSha256:license.packageManifestSha256,
    dossierSha256:shaOf(license),
    dependencyInventoryComponents:license.componentCount,
    attachedEvidence:evidence,
    remainingCriteria:criteria,
    allCriteriaAutomaticallyApproved:false,
    independentLicenseApproval:false,
    targetHostActuallyVerifiedByThisTool:false,
    targetHostAccessPerformedByThisTool:false,
    phpFpmExecutedByThisTool:false,
    databaseConnectedByThisTool:false,
    networkAttemptedByThisTool:false,
    stage2Accepted:false,stage3Authorized:false,productionReady:false
  };
}
function render(packet){
  const lines=packet.remainingCriteria.map(x=>'<tr><th scope="row">'+html(x.name)+
    '</th><td>'+html(x.state.replaceAll('_',' '))+'</td></tr>').join('');
  return '<!doctype html><html lang="en"><meta charset="utf-8">'+
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>AI Site CMS — Stage 2 owner decision packet</title>'+
    '<style>body{font:16px/1.6 system-ui,sans-serif;max-width:960px;margin:3rem auto;padding:0 1.5rem;color:#20272c}h1{line-height:1.2}'+
    'table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;padding:.75rem;text-align:left;vertical-align:top}'+
    'th{width:60%}code{overflow-wrap:anywhere}</style>'+
    '<main><h1>Stage 2 — owner acceptance checklist</h1>'+
    '<p><strong>Not accepted. No access to target hosting was performed by this tool.</strong> This is a review worksheet, not an approval control or proof of permission.</p>'+
    '<p>Internal package version <code>'+html(packet.packageVersion)+'</code>; package SHA-256 inventory <code>'+
    html(packet.packageManifestSha256)+'</code>.</p>'+
    '<p>Independent legal sign-off, real target hosting and manual owner acceptance are outstanding. An attached operator claim never upgrades itself to trusted evidence.</p>'+
    '<table><thead><tr><th>Criterion</th><th>Current state</th></tr></thead><tbody>'+
    lines+'</tbody></table>'+
    '<p>See <code>stage2-owner-decision.json</code> for machine-readable evidence limits and <code>stage2-license-dossier.html</code> for 43 dependencies.</p>'+
    '</main></html>\n';
}
function readEvidence(file){
  if(typeof file!=='string'||file.length>4096||!path.isAbsolute(file)||
    fs.lstatSync(file).isSymbolicLink())throw Error('Unsafe operator supplied evidence');
  const st=fs.lstatSync(file);
  if(!st.isFile()||st.nlink!==1||st.size<5||st.size>262144|| (st.mode&0o077)!==0)
    throw Error('Unprotected operator supplied evidence');
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function build(extra={}){
  const license=createDossier();
  const packet=assemble(license,extra);
  fs.mkdirSync(OUT,{recursive:true,mode:0o700});
  fs.writeFileSync(path.join(OUT,'stage2-owner-decision.json'),stable(packet),{mode:0o600});
  fs.writeFileSync(path.join(OUT,'stage2-owner-decision.html'),render(packet),{mode:0o600});
  process.stdout.write('Stage2 owner decision packet: '+packet.remainingCriteria.length+
    ' manual/permissioned gates; NO Stage2 acceptance or target access.\n');
  return packet;
}
if(require.main===module){
  try{
    const argv=process.argv.slice(2);
    if(!argv.includes('--build')||argv.filter(x=>x==='--build').length!==1||
      argv.some(x=>!x.startsWith('--build')&&!/^--(?:offline|https|database|scope)=/.test(x)))
      throw Error('Explicit offline build required');
    const sources={};
    for(const token of argv.filter(x=>x!=='--build')){
      const index=token.indexOf('='),kind=token.slice(2,index),file=token.slice(index+1);
      if(Object.prototype.hasOwnProperty.call(sources,kind)||!file)
        throw Error('Duplicate operator evidence');
      sources[kind]=readEvidence(file);
    }
    build(sources);
  }catch{
    process.stderr.write('STAGE2_OWNER_REVIEW_REFUSED\n');process.exitCode=3;
  }
}
module.exports={assemble,render,build,readEvidence,validated};
