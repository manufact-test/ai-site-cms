'use strict';
// Byte-level public HTTPS observation, compared with the *official* verified
// PHP static export. No POST, no public media stored, no remote redirects,
// no DNS-to-private access. Import of saved evidence is NOT authentication.
const fs=require('node:fs'),crypto=require('node:crypto');
const STATIC=require('./php-local-static-export.cjs');
const HTTPS=require('./public-https-capture.cjs');
const FORMAT='manufact-seo-public-static-media-bytes-v1';
const SHA=/^[a-f0-9]{64}$/;
const MAX=1200,TOTAL_LIMIT=180000000;
const trusted=new WeakSet();
const validOrigin=(raw,siteId)=>{
 const u=HTTPS.origin(raw,siteId);
 if(u.pathname!=='/')throw Error('Official public static media must be served at the HTTPS root, not a PHP mount');
 return u;
};
function inventory(site,release){
 if(!site||!Array.isArray(site.assets)||site.assets.length>300||
    !release||release.siteId!==site.siteId||!STATIC.isVerified(release))
  throw Error('Public media byte capture requires a directly SHA-verified official static release');
 const declared=site.assets.flatMap(a=>[a,...(a.variants||[]).map(v=>({...v,mime:a.mime}))]);
 if(declared.length>MAX||declared.length!==release.assets.size)
  throw Error('Official static release media variant inventory does not match Site v1');
 const seen=new Set();
 return declared.map(x=>{
  const expected=release.assets.get(x.id);
  if(!expected||expected.src!==x.src||!SHA.test(expected.sha256)||
     !Number.isSafeInteger(expected.bytes)||expected.bytes<=0||
     seen.has(x.id)||!/^\/assets\/[a-z][a-z0-9-]{2,79}\.(?:png|jpg|webp|mp4)$/.test(x.src))
   throw Error('Official media inventory contains foreign or inconsistent asset/variant');
  seen.add(x.id);
  return Object.freeze({assetId:x.id,path:x.src,expectedSha256:expected.sha256,
   expectedBytes:expected.bytes,expectedMime:x.mime});
 });
}
async function capture(site,release,rawOrigin,transport={address:HTTPS.address,requestDigest:HTTPS.requestDigest}){
 const list=inventory(site,release),origin=validOrigin(rawOrigin,site.siteId);
 if(release.origin!==origin.origin)
  throw Error('Public media origin must exactly match the official static export production origin');
 const pinned=await transport.address(origin.hostname);
 if(!pinned||!HTTPS.isPublicIp(pinned.address))
  throw Error('Public media DNS contains blocked private/non-routable addresses');
 let total=0;
 const records=[];
 for(const entry of list){
  const url=origin.origin+entry.path;
  const result=await transport.requestDigest(url,pinned,12000000);
  if(!result||!Number.isInteger(result.status)||result.status<100||result.status>599||
     !SHA.test(result.bodySha256)||!Number.isSafeInteger(result.bodyBytes)||
     result.bodyBytes<0||result.bodyBytes>12000000||
     typeof result.contentType!=='string'||result.contentType.length>150)
   throw Error('Public HTTPS binary observation has invalid status, digest or size');
  total+=result.bodyBytes;
  if(total>TOTAL_LIMIT)throw Error('Public static media evidence exceeded overall 180 MB safety limit');
  records.push(Object.freeze({
   assetId:entry.assetId,path:entry.path,url,status:result.status,
   mime:result.contentType.split(';')[0].trim().toLowerCase(),bytes:result.bodyBytes,
   sha256:result.bodySha256,expectedSha256:entry.expectedSha256,
   hashMatched:result.status===200&&result.bodySha256===entry.expectedSha256,
   lengthMatched:result.bodyBytes===entry.expectedBytes,
   mimeMatched:result.contentType.split(';')[0].trim().toLowerCase()===entry.expectedMime
  }));
 }
 return Object.freeze({format:FORMAT,siteId:site.siteId,origin:origin.href,
  officialStaticManifestSha256:release.manifestSha256,
  publishedVersion:release.publishedVersion,
  sourceRevisionClaim:release.sourceRevision,
  capturedAt:new Date().toISOString(),transport:'explicit-public-https-get',
  resources:Object.freeze(records),totalReceivedBytes:total,
  realBinaryGetPerformed:true,bytesStoredInEvidence:false,
  redirectsFollowed:false,postsPerformed:false,
  servedRevisionAuthenticated:false,automaticRelease:false});
}
function validate(evidence,site,release){
 if(!evidence||evidence.format!==FORMAT||evidence.siteId!==site.siteId||
    !STATIC.isVerified(release)||evidence.publishedVersion!==release.publishedVersion||
    evidence.sourceRevisionClaim!==release.sourceRevision||
    evidence.officialStaticManifestSha256!==release.manifestSha256||
    !Array.isArray(evidence.resources)||evidence.resources.length>MAX||
    !Number.isSafeInteger(evidence.totalReceivedBytes)||evidence.totalReceivedBytes<0||
    evidence.totalReceivedBytes>TOTAL_LIMIT||evidence.transport!=='explicit-public-https-get'||
    evidence.bytesStoredInEvidence!==false||evidence.postsPerformed!==false||
    evidence.redirectsFollowed!==false)
  throw Error('Public media byte evidence does not match the pinned static release');
 const u=validOrigin(evidence.origin,site.siteId);
 if(u.origin!==release.origin)
  throw Error('Public media byte transcript belongs to another HTTPS static production host');
 const expected=inventory(site,release),byId=new Map(expected.map(a=>[a.assetId,a])),got=new Set();
 let total=0;
 for(const r of evidence.resources){
  const entry=byId.get(r.assetId);
  if(!entry||got.has(r.assetId)||r.path!==entry.path||
     r.url!==u.origin+entry.path||r.expectedSha256!==entry.expectedSha256||
     !Number.isSafeInteger(r.status)||r.status<100||r.status>599||
     !Number.isSafeInteger(r.bytes)||r.bytes<0||r.bytes>12000000||
     !SHA.test(r.sha256)||typeof r.mime!=='string'||r.mime.length>150||
     r.hashMatched!==(r.status===200&&r.sha256===entry.expectedSha256)||
     r.lengthMatched!==(r.bytes===entry.expectedBytes)||
     r.mimeMatched!==(r.mime===entry.expectedMime))
   throw Error('Public media byte transcript contains duplicate/foreign/inconsistent asset data');
  got.add(r.assetId);total+=r.bytes;
 }
 if(total!==evidence.totalReceivedBytes)
  throw Error('Public media byte transcript total bytes do not match its resource ledger');
 return expected;
}
function review(site,release,evidence){
 const list=validate(evidence,site,release),findings=[],assets=[],got=new Map(evidence.resources.map(x=>[x.assetId,x]));
 const add=(code,severity,entry,message)=>findings.push(Object.freeze({
  code:'public-bytes:'+code,severity,pageId:null,path:entry.path,
  assetId:entry.assetId,message,
  evidence:'operator-supplied-public-https-get-digest-vs-sha256-official-static-export',
  automatic:false}));
 for(const e of list){
  const r=got.get(e.assetId);
  if(!r){
   add('resource-not-captured','error',e,
    'A declared static asset/variant was not captured by the bounded public HTTPS GET transcript.');
   assets.push({assetId:e.assetId,path:e.path,captured:false,sha256Matched:false});continue;
  }
  if(r.status!==200)add('resource-status','error',e,
   'Public static media GET did not return an HTTP 200 response.');
  if(!r.hashMatched)add('resource-sha256-mismatch','error',e,
   'Public asset/variant content SHA256 differs from the official static release.');
  if(!r.mimeMatched)add('resource-mime-mismatch','error',e,
   'Public media binary GET content-type differs from official CMS asset MIME.');
  if(!r.lengthMatched)add('resource-byte-size-mismatch','error',e,
   'Public static asset byte count differs from the official static release.');
  assets.push({assetId:e.assetId,path:e.path,captured:true,status:r.status,
   sha256Matched:r.hashMatched,bytesMatched:r.lengthMatched,mimeMatched:r.mimeMatched});
 }
 const report=Object.freeze({format:FORMAT,siteId:site.siteId,publishedVersion:release.publishedVersion,
  officialStaticManifestSha256:release.manifestSha256,origin:evidence.origin,
  expectedMediaResources:list.length,capturedResources:got.size,
  comparedOriginalsAndResponsiveVariants:true,receivedBytes:evidence.totalReceivedBytes,
  resources:Object.freeze(assets),findings:Object.freeze(findings),
  allCapturedByteDigestsMatch:findings.length===0,
  ownerSuppliedPublicTranscript:true,publicHostProvenanceAuthenticated:false,
  liveMediaBytesHeldInMemory:false,publicSiteReleaseAuthorized:false,
  limitations:'Byte hashes are compared with the official release, but the saved transcript is operator-supplied and unauthenticated; no guarantee of independent DNS/TLS observation, production identity, cross-device rendering, client approval or form delivery.'});
 trusted.add(report);return report;
}
function read(file,site,release){
 const s=fs.lstatSync(file);
 if(s.isSymbolicLink()||!s.isFile()||s.size<100||s.size>1800000)
  throw Error('Public media byte transcript must be a bounded regular private JSON file');
 return review(site,release,JSON.parse(fs.readFileSync(file,'utf8')));
}
function isVerified(x){return trusted.has(x);}
module.exports=Object.freeze({FORMAT,inventory,capture,validate,review,read,isVerified});
