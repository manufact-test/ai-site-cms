'use strict';
// Explicit operator-side Stage2 HTTPS observation (read-only GET, no host deployment).
// Never run against a customer or target host without owner's separate authorization.
// A successful report is NOT target-host certification or Stage2 acceptance.
const https=require('node:https');
const dns=require('node:dns/promises');
const net=require('node:net');
const fs=require('node:fs');
const crypto=require('node:crypto');
const scope=require('./stage2-operator-scope.cjs');
const ownerConsent=require('./stage2-owner-consent.cjs');

const FORMAT='ai-site-cms-stage2-active-https-observation-v1';
const CI=process.env.CMS_ENV==='test' &&
  process.env.CMS_STAGE2_RUNTIME_GATE==='ci-bound' &&
  process.env.CMS_ALLOW_STAGE2_NETWORK_FIXTURE==='1';
const ALLOWED=new Set(['--check','--operator-attests-readonly-grant',
  '--cms-origin','--site-origin','--ci-local','--ci-ca-file','--scope-file',
  '--owner-consent-file','--owner-public-pem','--owner-public-fingerprint']);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function argsOf(argv) {
  const args={};
  for(const raw of argv){
    if(!raw.startsWith('--')) throw Error('invalid_argument');
    const eq=raw.indexOf('=');
    const key=eq===-1?raw:raw.slice(0,eq);
    if(!ALLOWED.has(key)||Object.prototype.hasOwnProperty.call(args,key))
      throw Error('invalid_argument');
    if(eq===-1){
      if(!['--check','--operator-attests-readonly-grant','--ci-local'].includes(key))
        throw Error('invalid_argument');
      args[key]=true;
    }else{
      if(['--check','--operator-attests-readonly-grant','--ci-local'].includes(key)
        ||raw.slice(eq+1)==='')throw Error('invalid_argument');
      args[key]=raw.slice(eq+1);
    }
  }
  if(!args['--check']||!args['--operator-attests-readonly-grant']
    ||!args['--cms-origin']||!args['--site-origin']
    ||(args['--ci-local']&&!CI)
    ||(args['--ci-ca-file']&&(!CI||!args['--ci-local']))
    ||(args['--scope-file']&&args['--ci-local'])
    ||(args['--ci-local']&&['--owner-consent-file','--owner-public-pem',
      '--owner-public-fingerprint'].some(k=>args[k])))
    throw Error('explicit_scope_and_permission_required');
  return args;
}
function originOf(raw,ci) {
  if(typeof raw!=='string'||raw.length>255||raw.includes('\\')||
    raw.includes('\0')||raw.includes('#')||raw.includes('?'))throw Error('invalid_origin');
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||
    u.search||u.hash||raw!==u.origin&&raw!==u.origin+'/' )
    throw Error('invalid_https_origin');
  if(ci) {
    if(u.hostname!=='localhost'||!u.port||Number(u.port)<1024)
      throw Error('ci_loopback_only');
  } else {
    // Real operator mode: public DNS name, default HTTPS/443 only. IPs,
    // local/special-use hostnames and alternate ports are not valid targets.
    if(u.port||net.isIP(u.hostname)||u.hostname.length>253
      ||!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(u.hostname)
      ||/\.(?:local|localhost|internal|test|invalid|example)$/.test(u.hostname))
      throw Error('public_https_hostname_required');
  }
  return u;
}
// Conservative special-purpose IPv4 exclusions (IANA IPv4 special registry).
// Default deny on unknown or special-use ranges, never connect to a private
// network or metadata endpoint even if public DNS starts resolving there.
const RESERVED_IPV4=[
  ['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],
  ['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],
  ['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],
  ['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],
  ['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]
];
function ipv4Int(ip){
  const bytes=ip.split('.').map(Number);
  return ((bytes[0]*16777216)+(bytes[1]<<16)+(bytes[2]<<8)+bytes[3])>>>0;
}
function publicIPv4(ip) {
  if(net.isIP(ip)!==4)return false;
  const address=ipv4Int(ip);
  return RESERVED_IPV4.every(([base,bits])=>{
    const mask=(0xffffffff<<(32-bits))>>>0;
    return ((address&mask)>>>0)!==((ipv4Int(base)&mask)>>>0);
  });
}
async function pinAddress(hostname,ci) {
  if(ci)return '127.0.0.1';
  // Resolve and pin every request to the vetted result. A second DNS answer
  // cannot silently replace a public target with a local/metadata address.
  const addresses=await dns.lookup(hostname,{family:4,all:true});
  if(!addresses.length||addresses.some(a=>!publicIPv4(a.address)))
    throw Error('unsafe_or_unavailable_ipv4');
  return addresses[0].address;
}
function request(origin,path,ip,ca) {
  return new Promise((resolve,reject)=>{
    let settled=false;
    const req=https.request({
      protocol:'https:',hostname:origin.hostname,
      port:origin.port||443,path,method:'GET',
      agent:false,servername:origin.hostname,
      rejectUnauthorized:true,
      ca:ca||undefined,
      // Node 22+ may request all addresses for Happy Eyeballs; keep the
      // already-approved address pinned in BOTH lookup callback shapes.
      lookup:(host,options,callback)=>options.all
        ?callback(null,[{address:ip,family:4}])
        :callback(null,ip,4),
      headers:{'Accept':'application/json, text/html;q=0.9',
        'Accept-Encoding':'identity','Cache-Control':'no-store',
        'User-Agent':'AI-Site-CMS-Stage2-ReadOnly-Operator-Probe/1'}
    },res=>{
      const chunks=[];let size=0;
      const authorized=res.socket.authorized===true;
      const peer=res.socket.getPeerCertificate();
      const peerDigest=authorized&&peer&&peer.raw
        ?sha(peer.raw):null;
      res.on('data',chunk=>{
        size+=chunk.length;
        if(size>65536)req.destroy(Error('response_too_large'));
        else chunks.push(chunk);
      });
      res.on('end',()=>{
        if(settled)return;
        settled=true;
        resolve({
          status:res.statusCode||0,
          headers:res.headers,
          body:Buffer.concat(chunks),
          tlsVerified:authorized&&!!peerDigest,
          peerCertSha256:peerDigest
        });
      });
      res.on('error',reject);
    });
    req.setTimeout(5000,()=>req.destroy(Error('timeout')));
    req.on('error',e=>{if(!settled){settled=true;reject(e);}});
    req.end();
  });
}
async function inspectOne(origin,ip,path,ca,check) {
  try{
    const response=await request(origin,path,ip,ca);
    return {
      status:response.status,
      passed:response.tlsVerified&&check(response),
      tlsPeerVerified:response.tlsVerified,
      peerCertificateSha256:response.peerCertSha256
    };
  }catch(e){
    // Never echo a transport error which could contain operator hostnames,
    // URL credentials, file paths, certificate details or other secrets.
    const denied={status:null,passed:false,tlsPeerVerified:false,
      peerCertificateSha256:null,error:'transport_or_tls_failure'};
    if(CI)denied.ciDiagnosticCode=typeof e.code==='string' &&
      /^[A-Z0-9_]{2,60}$/.test(e.code)?e.code:'NO_ERROR_CODE';
    return denied;
  }
}
function deny(r){return r.status===403||r.status===404;}
function health(r) {
  if(r.status!==200||!/^application\/json(?:;|$)/i.test(r.headers['content-type']||'')
    ||!/\bno-store\b/i.test(r.headers['cache-control']||'')
    ||r.headers['x-content-type-options']!=='nosniff')return false;
  try {return JSON.parse(r.body.toString('utf8')).status==='ok' &&
    r.body.length<=4096;}catch{return false;}
}
function site(r) {
  return r.status===200 && r.body.length>0 &&
    r.body.length<=65536 &&
    /^text\/html(?:;|$)/i.test(r.headers['content-type']||'');
}
async function observe(argv) {
  const args=argsOf(argv);
  const ci=!!args['--ci-local'];
  const cms=originOf(args['--cms-origin'],ci);
  const visitor=originOf(args['--site-origin'],ci);
  if(cms.origin===visitor.origin || (!ci&&cms.hostname===visitor.hostname))
    throw Error('cms_site_origins_must_be_independent');
  // CI fixtures may use a private test CA. Real-host checks additionally
  // require an explicitly scoped, short-lived 0600 operator record AND
  // separately enabled permission environment, never only a CLI flag.
  let grant=null,signedConsent=null;
  if(!ci){
    if(!scope.operatorEnabled()||!args['--scope-file']||
      !args['--owner-consent-file']||!args['--owner-public-pem']||
      !args['--owner-public-fingerprint'])
      throw Error('owner_readonly_host_scope_not_enabled');
    grant=scope.readScope(args['--scope-file'],{
      cmsOrigin:cms.origin,siteOrigin:visitor.origin
    });
    // Both the unsigned scope and independently pinned Ed25519 consent are
    // required before any DNS or HTTPS request to the actual target.
    signedConsent=ownerConsent.verify(args['--owner-consent-file'],
      args['--owner-public-pem'],args['--owner-public-fingerprint'],grant);
  }
  const ca=args['--ci-ca-file']?fs.readFileSync(args['--ci-ca-file']):null;
  const scopeSha256=sha(JSON.stringify([cms.origin,visitor.origin]));
  const report={
    format:FORMAT,scope:'operator-side-explicit-readonly-https-observations',
    requestedOriginsSha256:scopeSha256,
    operatorGrantFlagIsNotOwnerAuthorization:true,
    operatorScopeRecordSha256:grant?.operatorScopeRecordSha256||null,
    operatorScopeExpiresAt:grant?.scopeExpiresAt||null,
    ownerConsentSha256:signedConsent?.ownerConsentSha256||null,
    ownerPublicPinSha256:signedConsent?.ownerPublicPinSha256||null,
    cryptographicScopeSignatureVerified:signedConsent?.cryptographicScopeSignatureVerified||false,
    independentOwnerAuthorizationVerified:false,
    ciLoopbackOnly:ci,
    requestsRestrictedToGet:true,
    actualHttpsRequestsAttempted:false,
    results:{},
    httpsObservationsPass:false,
    actualWebSapiVerified:false,dbConnectionVerified:false,
    physicalDocumentRootsVerified:false,
    independentSiteDuringCmsOutageVerified:false,
    targetHostAccepted:false,stage2Accepted:false,stage3Authorized:false,
    productionReady:false
  };
  try {
    const [cmsIp,siteIp]=await Promise.all([
      pinAddress(cms.hostname,ci),pinAddress(visitor.hostname,ci)]);
    report.resolvedAddressPairSha256=sha(JSON.stringify([cmsIp,siteIp]));
    report.actualHttpsRequestsAttempted=true;
    for(const [name,url,path,check] of [
      ['cmsHealth',cms,'/api/health',health],
      ['cmsPrivateVendor',cms,'/vendor/autoload.php',deny],
      ['cmsPrivateEditor',cms,'/private/editor/editor.js',deny],
      // Only GET: do NOT POST to an unverified target, even for a 404 check.
      ['cmsPublishGet',cms,'/api/publish',r=>r.status===404],
      ['visitorHome',visitor,'/',site]
    ]) {
      report.results[name]=await inspectOne(url,url===cms?cmsIp:siteIp,
        path,ca,check);
    }
    report.httpsObservationsPass=Object.values(report.results)
      .every(x=>x.passed);
  }catch{
    report.transportOrScopeFailure=true;
  }
  return report;
}
async function main(){
  try{
    const report=await observe(process.argv.slice(2));
    process.stdout.write(JSON.stringify(report)+'\n');
    process.exitCode=report.httpsObservationsPass?0:4;
  }catch{
    process.stderr.write('STAGE2_HTTPS_OBSERVATION_REFUSED\n');
    process.exitCode=3;
  }
}
if(require.main===module)main();
module.exports={observe,originOf,publicIPv4};
