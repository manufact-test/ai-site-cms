'use strict';
// Owner-authorized, fixed-origin, GET-only Stage2 Hostinger inspection.
// Designed to run in the private repository's GitHub Actions, not the shared host.
// No HTTP admin/write routes, credentials, cookies, DB, SSH, Hostinger APIs or outages.
// No user-controlled URLs or redirects; only two explicitly approved public domains.
const assert=require('node:assert/strict');
const https=require('node:https');
const dns=require('node:dns/promises');
const crypto=require('node:crypto');
const fs=require('node:fs');
const {publicIPv4}=require('./stage2-target-https-check.cjs');
const CMS='lightseagreen-woodpecker-264491.hostingersite.com';
const VISITOR='mediumpurple-fox-175549.hostingersite.com';
const REVISION='stage2-target-host-check-20261020-r8';
const CMS_ROUTES=[
  ['/__stage2/host','phpPreflight'],
  ['/__stage2/rewrite/proof','lsapiFrontController'],
  ['/__stage2/private-boundary','privateBoundaryMarker'],
  ['/__stage2/offweb-package','offwebPackage'],
  ['/__stage2/kernel/smoke','realKernelHealth'],
  ['/cms-stage2-offweb-runtime/private/package-manifest.json','offwebManifestHttpExposure'],
  ['/cms-stage2-private-boundary/probe.json','privateMarkerHttpExposure'],
  ['/','cmsLanding'],
  ['/api/health','notInstalled'],
  ['/api/publish','writeNotExposed'],
  ['/vendor/autoload.php','vendorPrivate'],
  ['/private/editor/editor.js','editorPrivate'],
  ['/.git/config','gitPrivate']
];
const allowMain=process.argv.length===3&&process.argv[2]==='--observe'&&
  process.env.CI==='true'&&process.env.GITHUB_ACTIONS==='true'&&
  process.env.GITHUB_REPOSITORY==='manufact-test/ai-site-cms'&&
  process.env.CMS_STAGE2_OWNER_READONLY_PERMISSION==='owner-grant-recorded-read-only';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function evaluate(name,response,expectedManifestSha256=null) {
  const s=response.status;
  const contentType=response.headers['content-type']||'';
  const text=response.body.toString('utf8');
  if(name==='phpPreflight'){
    let d;try{d=JSON.parse(text)}catch{return {pass:false,reason:'invalid_json'};}
    if(s!==200||!/^application\/json(?:;|$)/i.test(contentType) ||
      !d||typeof d!=='object'||d.format!=='ai-site-cms-stage2-target-php-preflight-v1'||
      d.probeRevision!==REVISION||d.observationOnly!==true||
      d.cmsInstalled!==false||d.stage2Accepted!==false||
      d.stage3Authorized!==false||d.productionReady!==false||
      d.databaseConnectionAttempted!==false||d.privateFilesystemVerified!==false||
      d.cmsVisitorOutageTested!==false)return {pass:false,reason:'unexpected_preflight'};
    const wanted=['php81OrLater','json','pdo','pdoMysql','openssl','sodium',
      'webSapi','documentRootMatchesPublicEntrypoint','privateParentExistsAndReadable',
      'privateParentAppearsWritable','httpsVisibleToPhp'];
    if(!d.requirements||wanted.some(k=>typeof d.requirements[k]!=='boolean'))
      return {pass:false,reason:'invalid_capabilities'};
    if(!/^8\.(?:[1-9]|[1-9][0-9])$/.test(d.phpVersionMajorMinor) ||
      typeof d.phpSapi!=='string'||d.phpSapi.length>32)
      return {pass:false,reason:'invalid_runtime_identity'};
    // Display booleans, never host filesystem paths or raw response bodies.
    return {pass:true,revisionCurrent:true,phpVersion:d.phpVersionMajorMinor,
      webSapi:d.phpSapi,requirements:Object.fromEntries(wanted.map(k=>[k,d.requirements[k]]))};
  }
  if(name==='lsapiFrontController'){
    let d;try{d=JSON.parse(text)}catch{return {pass:false,reason:'invalid_routing_json'};}
    const pass=s===200&&contentType.toLowerCase().startsWith('application/json')&&
      d&&d.format==='ai-site-cms-stage2-routing-observation-v1'&&
      d.probeRevision===REVISION&&d.exactNonFileRoute===true&&
      d.frontControllerMapped===true&&d.installationReady===false&&
      d.privateStorageVerified===false&&d.databaseConnected===false&&
      d.stage2Accepted===false;
    return {pass:Boolean(pass),...(pass?{}:{reason:'front_controller_rewrite_not_verified'})};
  }
  if(name==='privateBoundaryMarker'){
    let d;try{d=JSON.parse(text)}catch{return {pass:false,reason:'invalid_marker_json'};}
    const valid=(s===200||s===503)&&
      contentType.toLowerCase().startsWith('application/json')&&
      d?.format==='ai-site-cms-stage2-private-boundary-observation-v1'&&
      d.probeRevision===REVISION&&
      typeof d.outsideThisPublicRootMarkerObserved==='boolean'&&
      (s===200)===d.outsideThisPublicRootMarkerObserved&&
      d.cmsInstalled===false&&d.privateCmsCodeInstalled===false&&
      d.peerAccountIsolationVerified===false&&d.databaseConnected===false&&
      d.stage2Accepted===false;
    return {pass:Boolean(valid),...(valid?{observed:d.outsideThisPublicRootMarkerObserved}:{reason:'marker_probe_invalid'})};
  }
  if(name==='offwebPackage'){
    let d;try{d=JSON.parse(text)}catch{return {pass:false,reason:'invalid_offweb_json'};}
    const found=d?.state==='verified_unsigned_package'&&
      d.offwebPackageIntegrityVerified===true&&
      Number.isInteger(d.verifiedFiles)&&d.verifiedFiles>=20&&d.verifiedFiles<=1200;
    const missing=['absent','incomplete'].includes(d?.state)&&
      d.offwebPackageIntegrityVerified===false&&d.verifiedFiles===0;
    const digestValid=found
      ?typeof d.manifestSha256==='string'&&/^[a-f0-9]{64}$/.test(d.manifestSha256)
        &&(!expectedManifestSha256||d.manifestSha256===expectedManifestSha256)
      :d?.manifestSha256===null;
    const pass=digestValid&&((s===200&&found)||(s===503&&missing))&&
      contentType.toLowerCase().startsWith('application/json')&&
      d.format==='ai-site-cms-stage2-offweb-package-observation-v1'&&
      d.probeRevision===REVISION&&d.signatureVerified===false&&
      d.phpFromPackageExecuted===false&&d.databaseConnected===false&&
      d.cmsInstalled===false&&d.peerAccountIsolationVerified===false&&
      d.productionReady===false&&d.stage2Accepted===false;
    return {pass:Boolean(pass),...(pass?{observed:found}:{reason:'offweb_or_exact_manifest_pin_invalid'})};
  }
  if(name==='realKernelHealth'){
    let d;try{d=JSON.parse(text)}catch{return {pass:false,reason:'invalid_kernel_smoke_json'};}
    const shape=d?.format==='ai-site-cms-stage2-live-kernel-smoke-v1'&&
      d.probeRevision===REVISION&&d.testOnly===true&&
      d.signedRelease===false&&d.schemaInitialized===false&&
      d.publicCmsActivated===false&&d.stage2Accepted===false;
    const live=s===200&&d.result==='health_only_pass'&&
      d.fullyHashedUnsignedPackage===true&&d.realSlimKernelHealthPassed===true&&
      typeof d.manifestSha256==='string'&&/^[a-f0-9]{64}$/.test(d.manifestSha256)&&
      (!expectedManifestSha256||d.manifestSha256===expectedManifestSha256);
    const notReady=s===503&&d.result==='not_ready'&&
      d.realSlimKernelHealthPassed===false&&typeof d.fullyHashedUnsignedPackage==='boolean'&&
      (d.manifestSha256===null||
       (typeof d.manifestSha256==='string'&&/^[a-f0-9]{64}$/.test(d.manifestSha256)));
    return {pass:Boolean(shape&&(live||notReady)),
      ...(shape&&(live||notReady)?{observed:live}:{reason:'kernel_smoke_invalid'})};
  }
  if(name==='offwebManifestHttpExposure')return {pass:s===403||s===404};
  if(name==='privateMarkerHttpExposure')return {pass:s===403||s===404};
  if(name==='cmsLanding')return {pass:s===200&&text.includes('NOT an installed CMS')};
  if(name==='visitorHome')return {pass:s===200&&/^text\/html(?:;|$)/i.test(contentType)&&text.length>0};
  if(name==='notInstalled')return {pass:s===503&&text.includes('"not_installed"')};
  if(name==='writeNotExposed'||name==='vendorPrivate'||name==='editorPrivate'
    ||name==='gitPrivate')return {pass:s===403||s===404};
  throw Error('unexpected_route_type');
}
async function approvedIPv4(host){
  const addresses=await dns.lookup(host,{family:4,all:true});
  if(!addresses.length||addresses.some(a=>!publicIPv4(a.address)))
    throw Error('DNS_NOT_PUBLIC');
  return addresses[0].address;
}
function get(host,ip,pathname){
  return new Promise((resolve,reject)=>{
    const req=https.request({
      protocol:'https:',hostname:host,port:443,path:pathname,method:'GET',
      rejectUnauthorized:true,servername:host,agent:false,
      lookup:(_hostname,opt,cb)=>opt.all?cb(null,[{address:ip,family:4}]):cb(null,ip,4),
      headers:{Accept:'application/json, text/html;q=0.9',
        'Accept-Encoding':'identity','Cache-Control':'no-store',
        'User-Agent':'AI-Site-CMS-Stage2-Consent-ReadOnly/2'}
    },res=>{
      const chunks=[];let size=0;
      const certificate=res.socket.getPeerCertificate();
      if(!res.socket.authorized||!certificate||!certificate.raw){
        res.resume();reject(Error('TLS_NOT_VERIFIED'));return;
      }
      res.on('data',v=>{
        size+=v.length;
        if(size>16384){req.destroy(Error('RESPONSE_TOO_LARGE'));return;}
        chunks.push(v);
      });
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,
        body:Buffer.concat(chunks),tlsVerified:true,
        peerSha256:sha(certificate.raw)}));
      res.on('error',reject);
    });
    req.setTimeout(5500,()=>req.destroy(Error('TIMEOUT')));
    req.on('error',reject);
    req.end();
  });
}
async function inspect(){
  const ips=await Promise.all([approvedIPv4(CMS),approvedIPv4(VISITOR)]);
  const routes=[...CMS_ROUTES.map(([p,name])=>({host:CMS,ip:ips[0],path:p,name})),
    {host:VISITOR,ip:ips[1],path:'/',name:'visitorHome'}];
  const expectedManifestSha256=process.env.CMS_STAGE2_EXPECTED_MANIFEST_SHA256;
  const seen=[];
  for(const r of routes){
    let result;
    try{
      const response=await get(r.host,r.ip,r.path);
      const verdict=evaluate(r.name,response,expectedManifestSha256);
      result={name:r.name,httpStatus:response.status,
        tlsVerified:response.tlsVerified,passed:verdict.pass,
        ...(verdict.reason?{reason:verdict.reason}:{}),
        ...(r.name==='privateBoundaryMarker'&&verdict.pass?{observed:verdict.observed}:{}),
        ...(r.name==='offwebPackage'&&verdict.pass?{observed:verdict.observed}:{}),
        ...(r.name==='realKernelHealth'&&verdict.pass?{observed:verdict.observed}:{}),
        ...(r.name==='phpPreflight'&&verdict.pass?{
          phpVersion:verdict.phpVersion,webSapi:verdict.webSapi,
          requirements:verdict.requirements}: {})};
    }catch{result={name:r.name,httpStatus:null,tlsVerified:false,
      passed:false,reason:'transport_or_tls_failure'};}
    seen.push(result);
  }
  const preflight=seen.find(r=>r.name==='phpPreflight');
  const routing=seen.find(r=>r.name==='lsapiFrontController');
  const marker=seen.find(r=>r.name==='privateBoundaryMarker');
  const markerHttp=seen.find(r=>r.name==='privateMarkerHttpExposure');
  const offweb=seen.find(r=>r.name==='offwebPackage');
  const offwebHttp=seen.find(r=>r.name==='offwebManifestHttpExposure');
  const kernel=seen.find(r=>r.name==='realKernelHealth');
  const requirements=preflight?.requirements;
  // A successful HTTP route check does NOT prove target deployment compatibility.
  // Our current PHP Ed25519 release verifier uses libsodium. Real target LiteSpeed
  // has not undergone the independent FPM/Apache isolation and lifecycle tests.
  const compatibilityGaps=[];
  if(routing?.passed!==true)compatibilityGaps.push('front_controller_rewrite_not_verified');
  if(kernel?.observed!==true)compatibilityGaps.push('real_litespeed_kernel_health_not_verified');
  if(offweb?.observed!==true||offwebHttp?.passed!==true)
    compatibilityGaps.push('offweb_compiled_package_not_yet_verified');
  if(marker?.observed!==true||markerHttp?.passed!==true)
    compatibilityGaps.push('private_sibling_git_deployment_not_verified');
  if(preflight?.passed!==true)compatibilityGaps.push('live_php_preflight_not_verified');
  else {
    if(requirements?.sodium!==true)compatibilityGaps.push('php_sodium_missing');
    if(requirements?.webSapi!==true)compatibilityGaps.push('target_web_sapi_requires_compatibility_review');
    for(const key of ['php81OrLater','json','pdo','pdoMysql','openssl',
      'documentRootMatchesPublicEntrypoint','httpsVisibleToPhp']){
      if(requirements?.[key]!==true)compatibilityGaps.push('missing_or_invalid_'+key);
    }
  }
  return {format:'ai-site-cms-stage2-real-host-readonly-v1',
    currentProbeRevision:REVISION,scope:'two-owner-approved-empty-test-domains',
    permittedOperations:['HTTPS_GET_only'],
    requests:seen,networkAttempted:true,
    allChecksPassed:seen.every(r=>r.passed),
    targetRuntimeCompatibilityConfirmed:compatibilityGaps.length===0,
    compatibilityGaps,
    rewrittenPhpFrontControllerObserved:routing?.passed===true,
    siblingMarkerOutsideDocumentRootObserved:marker?.observed===true&&markerHttp?.passed===true,
    offwebCompiledPackageVerified:offweb?.observed===true&&offwebHttp?.passed===true,
    realReadOnlyKernelHealthObserved:kernel?.observed===true,
    databaseConnected:false,hostFilesystemIndependentlyInspected:false,
    stage2Accepted:false,stage3Authorized:false,productionReady:false,
    visitorDuringCmsOutageVerified:false};
}
function summary(report){
  const observations=report.requests;
  const caps=observations.find(x=>x.name==='phpPreflight');
  const rows=observations.map(x=>`| ${x.name} | ${x.httpStatus??'unavailable'} | ${x.tlsVerified?'YES':'NO'} | ${x.passed?'PASS':'NOT YET'} |`).join('\n');
  const gaps=report.compatibilityGaps||[];
  const flags=caps?.requirements
    ?Object.entries(caps.requirements).map(([k,v])=>`| ${k} | ${v?'yes':'no'} |`).join('\n')
    :'| Runtime capability report | not available |';
  return `## Stage2: real Hostinger observation — NOT CMS installation

Only owner-approved test domains, HTTPS GET only; no cookies, SSH, DB, host secrets,
deployment, downtime, or host filesystem writes. Runtime values are untrusted
public-source observations and require corroboration before acceptance.

Revision: ${REVISION}; HTTP observation expectations met: **${report.allChecksPassed?'YES':'NO'}**.
Target runtime compatibility for the current signed deployment: **${report.targetRuntimeCompatibilityConfirmed?'NO BLOCKERS DETECTED':'STILL OPEN'}**.
Observed gaps: ${gaps.join(', ')||'none found by this limited probe'}.
Actual nested-path PHP front controller rewrite observed: **${report.rewrittenPhpFrontControllerObserved?'YES':'NOT VERIFIED'}**.
Non-secret marker from dedicated private sibling Git deploy: **${report.siblingMarkerOutsideDocumentRootObserved?'OBSERVED':'NOT DEPLOYED/NOT VERIFIED'}**.
Offweb runtime exact published manifest: **${report.offwebCompiledPackageVerified?'HASH INVENTORY AND PIN MATCH (UNSIGNED)':'NOT CURRENT/NOT VERIFIED'}**.
Actual LiteSpeed read-only Slim health: **${report.realReadOnlyKernelHealthObserved?'LIVE PASS (NOT CMS ACTIVATION)':'NOT VERIFIED'}**.

| Route | HTTP status | Verified TLS | Expected result |
|---|---:|---|---|
${rows}

| Observed PHP capability | Available |
|---|---|
${flags}

Web PHP version (major.minor): ${caps?.phpVersion||'unavailable'};
SAPI: ${caps?.webSapi||'unavailable'}.

*Note:* parent path readability/writability is only a capability hint,
**not** evidence of permitted private code placement or true isolation.
A passing HTTPS probe is NOT a passing deployment gate. LiteSpeed requires
a separate compatibility review and absent PHP Sodium prevents assuming the
existing PHP Ed25519 verifier will work. No weaker signature policy is implied.
The CMS is NOT installed. Target database, runtime isolation, rollback, licenses,
CMS outage continuity and Stage2 acceptance remain unverified.
`;
}
async function main(){
  if(!allowMain || !/^[a-f0-9]{64}$/.test(process.env.CMS_STAGE2_EXPECTED_MANIFEST_SHA256||'')){process.stderr.write('STAGE2_TARGET_READONLY_REFUSED\n');process.exitCode=3;return;}
  const report=await inspect();
  const output=JSON.stringify(report)+'\n';
  if(process.env.RUNNER_TEMP){
    fs.writeFileSync(require('node:path').join(process.env.RUNNER_TEMP,'stage2-hostinger-php.json'),output,{mode:0o600});
  }
  if(process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary(report));
  // No direct JSON/body dump in logs. No secrets or absolute paths.
  // Only fixed route names and enum-level reasons; never dump response bodies,
  // absolute paths, TLS peer details, remote addresses or credentials.
  const failed=report.requests.filter(r=>!r.passed).map(r=>
    r.name+':'+(r.reason||('http_'+String(r.httpStatus??'unavailable'))));
  if(failed.length)process.stdout.write('Unmet safe route expectations: '+failed.join(', ')+'\\n');
  process.stdout.write('Stage2 owner-scoped Hostinger GET observations: '+report.requests.length+
    ' routes, all expectations '+(report.allChecksPassed?'PASS':'NOT YET')+
    '; no CMS install or database access.\n');
  process.exitCode=report.allChecksPassed?0:4;
}
if(require.main===module)main().catch(()=>{process.stderr.write('STAGE2_TARGET_OBSERVATION_FAILED\n');process.exitCode=4;});
module.exports={evaluate,summary,inspect,REVISION};
