#!/usr/bin/env node
'use strict';
/* Pure, offline safety checks. NO DNS lookup or outbound HTTP. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {publicIPv4,publicOrigin,expectedFromCapsule,compare}=
  require('../bin/verify-live-release.cjs');
for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1',
  '169.254.169.254','100.64.0.1','192.0.2.4','198.51.100.1','203.0.113.2',
  '198.18.2.3','224.0.0.5','0.0.0.0','::1','not-an-ip'])
  assert.equal(publicIPv4(ip),false,'private or reserved address: '+ip);
for(const ip of ['1.1.1.1','8.8.8.8','93.184.216.34'])
  assert.equal(publicIPv4(ip),true,'public IPv4: '+ip);
for(const origin of ['http://valid.com','https://127.0.0.1','https://localhost',
  'https://intranet.internal','https://site.example.com:443',
  'https://site.example.com/path','https://user:pass@real.com',
  'https://site.example.com?x=1','https://site.example.com.'])
  assert.throws(()=>publicOrigin(origin),/refused/);
assert.equal(publicOrigin('https://real-domain.com'),'real-domain.com');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cms-live-verify-'));
try{
  const bytes=Buffer.from(JSON.stringify({format:'manufact-ai-static-site-v1',siteId:'site-test',
    publishedVersion:2,sourceRevision:4,publicOrigin:'https://real-domain.com'}));
  const hash=crypto.createHash('sha256').update(bytes).digest('hex');
  const capsule={format:'manufact-runtime-handoff-v1',siteId:'site-test',version:2,
    sourceRevision:4,manifestSha256:hash,
    files:[{path:'release-manifest.json',base64:bytes.toString('base64'),sha256:hash},
      {path:'index.html',base64:'PHA+',sha256:'x'}]};
  const source=path.join(dir,'handoff.json');
  fs.writeFileSync(source,JSON.stringify(capsule));
  const expected=expectedFromCapsule(source);
  const remote={format:'manufact-ai-site-connection-v1',siteId:'site-test',
    publishedVersion:2,sourceRevision:4,releaseManifestSha256:hash};
  const good=compare(expected,remote,'https://real-domain.com',
    {status:200,contentType:'text/html; charset=utf-8'});
  assert.equal(good.releaseMatches,true);
  assert.equal(compare(expected,{...remote,siteId:'site-other'},'https://real-domain.com',
    {status:200,contentType:'text/html'}).releaseMatches,false);
  assert.equal(compare(expected,remote,'https://wrong-host.com',
    {status:200,contentType:'text/html'}).releaseMatches,false);
  assert.equal(compare(expected,remote,'https://real-domain.com',
    {status:503,contentType:'text/html'}).releaseMatches,false);
  const bad={...capsule,manifestSha256:'0'.repeat(64)};
  fs.writeFileSync(source,JSON.stringify(bad));
  assert.throws(()=>expectedFromCapsule(source),/SHA-256/);
  console.log('Independent live verifier offline checks PASS (no DNS/HTTP)');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
