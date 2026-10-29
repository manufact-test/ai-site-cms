#!/usr/bin/env node
'use strict';
/*
 * Explicit operator-run HTTPS verification of an INDEPENDENT published site.
 * No CMS API, deployment, credentials, write, redirect, private-network
 * access, user-controlled paths or form POST. Not invoked by CMS or CI.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const dns=require('node:dns').promises;
const https=require('node:https');
const net=require('node:net');

const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const refusal=message=>{throw Error('Independent live verification refused: '+message);};
const ranges=[
  ['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],
  ['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],
  ['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],
  ['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],
  ['224.0.0.0',4],['240.0.0.0',4]
];
function unsigned(ip){
  return ip.split('.').reduce((sum,part)=>((sum<<8)|Number(part))>>>0,0);
}
function publicIPv4(ip){
  if(net.isIP(ip)!==4)return false;
  const value=unsigned(ip);
  return ranges.every(([base,bits])=>{
    const mask=bits===0?0:(0xffffffff<<(32-bits))>>>0;
    return (value&mask)!==(unsigned(base)&mask);
  });
}
function publicOrigin(input){
  if(typeof input!=='string'||input.length>253||!/^https:\/\/[a-z0-9.-]+$/i.test(input))
    refusal('Expected a single HTTPS domain origin without port, path, query or credentials');
  const hostname=input.slice(8).toLowerCase();
  if(net.isIP(hostname)||hostname.endsWith('.')||!hostname.includes('.')
    ||hostname.split('.').some(label=>!label||label.length>63||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))
    ||hostname.split('.').at(-1).length<2
    ||['localhost','local','internal','invalid','test','example','onion'].includes(hostname.split('.').at(-1)))
    refusal('Use an ordinary public DNS hostname, never a local, IP, test or internal address');
  return hostname;
}
function expectedFromCapsule(source){
  const stat=fs.statSync(source);
  if(!stat.isFile()||stat.size>41000000||stat.size<200)
    refusal('Expected a published D2 JSON capsule smaller than 41 MB');
  const capsule=JSON.parse(fs.readFileSync(source,'utf8'));
  if(capsule.format!=='manufact-runtime-handoff-v1'
    ||!Array.isArray(capsule.files)||capsule.files.length<2||capsule.files.length>3000
    ||!Number.isInteger(capsule.version)||!Number.isInteger(capsule.sourceRevision)
    ||typeof capsule.siteId!=='string'||!/^[a-z][a-z0-9-]{2,79}$/.test(capsule.siteId)
    ||typeof capsule.manifestSha256!=='string'||!/^[a-f0-9]{64}$/.test(capsule.manifestSha256))
    refusal('Not a valid published D2 handoff');
  const files=capsule.files.filter(f=>f?.path==='release-manifest.json');
  if(files.length!==1||typeof files[0].base64!=='string'
    ||files[0].base64.length>2000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(files[0].base64))
    refusal('Missing or invalid bounded release manifest');
  const bytes=Buffer.from(files[0].base64,'base64'),sha=digest(bytes);
  if(sha!==capsule.manifestSha256||sha!==files[0].sha256)
    refusal('Handoff manifest SHA-256 mismatch');
  const manifest=JSON.parse(bytes.toString('utf8'));
  if(manifest.format!=='manufact-ai-static-site-v1'
    ||manifest.siteId!==capsule.siteId
    ||manifest.publishedVersion!==capsule.version
    ||manifest.sourceRevision!==capsule.sourceRevision)
    refusal('Manifest/capsule publication identity mismatch');
  return {siteId:capsule.siteId,publishedVersion:capsule.version,
    sourceRevision:capsule.sourceRevision,releaseManifestSha256:sha,
    publicOrigin:manifest.publicOrigin??null};
}
async function pinnedAddress(hostname){
  const addresses=await dns.lookup(hostname,{all:true,verbatim:true});
  const ipv4=addresses.filter(x=>x.family===4);
  if(!ipv4.length)refusal('Public IPv4 DNS record required for this verifier; IPv6-only hosts need manual inspection');
  if(ipv4.some(x=>!publicIPv4(x.address)))
    refusal('DNS resolved to a non-public address; no request was sent');
  return ipv4[0].address;
}
async function probe(hostname,ip,method,path){
  return new Promise((resolve,reject)=>{
    let size=0;
    const chunks=[];
    const request=https.request({
      hostname,port:443,protocol:'https:',path,method,servername:hostname,
      family:4,rejectUnauthorized:true,
      lookup:(_host,_options,cb)=>cb(null,ip,4),
      headers:{Accept:method==='HEAD'?'text/html':'application/json',
        'Accept-Encoding':'identity','User-Agent':'MANUFACT-AI-Site-CMS-ReadOnly-Verifier/1.0'}
    },res=>{
      const status=res.statusCode??0;
      const contentType=String(res.headers['content-type']??'');
      if(status!==200){
        res.resume();
        reject(Error('HTTP '+status+' on '+path+' (redirects are never followed)'));
        return;
      }
      if(res.headers['content-encoding']){
        res.resume();
        reject(Error('Unexpected compressed identity response'));
        return;
      }
      res.on('data',chunk=>{
        size+=chunk.length;
        if(size>4096){request.destroy(Error('Public response exceeds 4096 bytes'));return;}
        chunks.push(chunk);
      });
      res.on('end',()=>resolve({status,contentType,body:Buffer.concat(chunks).toString('utf8')}));
      res.on('error',reject);
    });
    request.setTimeout(6000,()=>request.destroy(Error('HTTPS response timed out')));
    request.on('error',reject);
    request.end();
  });
}
function compare(expected,remote,origin,home){
  const keys=['format','siteId','publishedVersion','sourceRevision','releaseManifestSha256'];
  if(!remote||typeof remote!=='object'||Array.isArray(remote)
    ||Object.keys(remote).length!==5||keys.some(k=>!Object.hasOwn(remote,k))
    ||remote.format!=='manufact-ai-site-connection-v1'
    ||!Number.isInteger(remote.publishedVersion)||!Number.isInteger(remote.sourceRevision)
    ||typeof remote.siteId!=='string'||typeof remote.releaseManifestSha256!=='string'
    ||!/^[a-f0-9]{64}$/.test(remote.releaseManifestSha256))
    refusal('Remote /_cms-connect.json does not match the independent runtime contract');
  const checks={
    siteId:expected.siteId===remote.siteId,
    publishedVersion:expected.publishedVersion===remote.publishedVersion,
    sourceRevision:expected.sourceRevision===remote.sourceRevision,
    releaseManifestSha256:crypto.timingSafeEqual(Buffer.from(expected.releaseManifestSha256),
      Buffer.from(remote.releaseManifestSha256)),
    canonicalOrigin:expected.publicOrigin===null?null:expected.publicOrigin===origin,
    homepage:home.status===200&&home.contentType.toLowerCase().includes('text/html')
  };
  return {format:'manufact-independent-live-check-v1',origin,checks,
    releaseMatches:Object.values(checks).every(v=>v===true||v===null),
    canonicalOriginConfigured:expected.publicOrigin!==null,
    remoteHttpVerified:true,tlsCertificateValidated:true,
    source:'operator-run HTTPS GET and HEAD, with public IPv4 DNS pinned to TLS connection',
    note:'A matching identity plus homepage HTTP 200 does not confirm UX, responsive design, real form receipt or owner GO.'};
}
async function run(){
  const [source,origin,...extra]=process.argv.slice(2);
  if(extra.length||!source||!origin||!fs.existsSync(source))
    refusal('Usage: node verify-live-release.cjs /ABS/published-vN-handoff.json https://public-domain.example');
  if(!require('node:path').isAbsolute(source))refusal('Published capsule path must be absolute');
  const hostname=publicOrigin(origin);
  const expected=expectedFromCapsule(source);
  const ip=await pinnedAddress(hostname);
  const identity=await probe(hostname,ip,'GET','/_cms-connect.json');
  if(!identity.contentType.toLowerCase().includes('application/json'))
    refusal('Remote identity is not served as JSON');
  const remote=JSON.parse(identity.body);
  const homepage=await probe(hostname,ip,'HEAD','/');
  const result=compare(expected,remote,origin,homepage);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(!result.releaseMatches)process.exitCode=2;
}
if(require.main===module)run().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports=Object.freeze({publicIPv4,publicOrigin,expectedFromCapsule,compare});
