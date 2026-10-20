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
const REVISION='stage2-target-host-check-20261020-r3';
const CMS_ROUTES=[
  ['/__stage2/host','phpPreflight'],
  ['/__stage2/rewrite/proof','lsapiFrontController'],
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
function evaluate(name,response) {
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
  const seen=[];
  for(const r of routes){
    let result;
    try{
      const response=await get(r.host,r.ip,r.path);
      const verdict=evaluate(r.name,response);
      result={name:r.name,httpStatus:response.status,
        tlsVerified:response.tlsVerified,passed:verdict.pass,
        ...(verdict.reason?{reason:verdict.reason}:{}),
        ...(r.name==='phpPreflight'&&verdict.pass?{
          phpVersion:verdict.phpVersion,webSapi:verdict.webSapi,
          requirements:verdict.requirements}: {})};
    }catch{result={name:r.name,httpStatus:null,tlsVerified:false,
      passed:false,reason:'transport_or_tls_failure'};}
    seen.push(result);
  }
  const preflight=seen.find(r=>r.name==='phpPreflight');
  const routing=seen.find(r=>r.name==='lsapiFrontController');
  const requirements=preflight?.requirements;
  // A successful HTTP route check does NOT prove target deployment compatibility.
  // Our current PHP Ed25519 release verifier uses libsodium. Real target LiteSpeed
  // has not undergone the independent FPM/Apache isolation and lifecycle tests.
  const compatibilityGaps=[];
  if(routing?.passed!==true)compatibilityGaps.push('front_controller_rewrite_not_verified');
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
  if(!allowMain){process.stderr.write('STAGE2_TARGET_READONLY_REFUSED\n');process.exitCode=3;return;}
  const report=await inspect();
  const output=JSON.stringify(report)+'\n';
  if(process.env.RUNNER_TEMP){
    fs.writeFileSync(require('node:path').join(process.env.RUNNER_TEMP,'stage2-hostinger-php.json'),output,{mode:0o600});
  }
  if(process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary(report));
  // No direct JSON/body dump in logs. No secrets or absolute paths.
  process.stdout.write('Stage2 owner-scoped Hostinger GET observations: '+report.requests.length+
    ' routes, all expectations '+(report.allChecksPassed?'PASS':'NOT YET')+
    '; no CMS install or database access.\n');
  process.exitCode=report.allChecksPassed?0:4;
}
if(require.main===module)main().catch(()=>{process.stderr.write('STAGE2_TARGET_OBSERVATION_FAILED\n');process.exitCode=4;});
module.exports={evaluate,summary,inspect,REVISION};
