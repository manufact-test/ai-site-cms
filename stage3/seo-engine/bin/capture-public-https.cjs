#!/usr/bin/env node
'use strict';
// Owner-operated public HTTPS read-only GET capture. No CMS mutation, POST,
// browser scripting, automatic release or cross-origin redirects.
const fs=require('node:fs'),path=require('node:path');
const BRIDGE=require('../lib/approved-site-bridge.cjs');
const CAP=require('../lib/public-https-capture.cjs');
const DELIVERY=require('../lib/delivery-evidence.cjs');
const MEDIA=require('../lib/media-delivery.cjs');
const STATIC=require('../lib/php-local-static-export.cjs');
const BYTES=require('../lib/public-media-byte-verification.cjs');
const FIRST=require('./first-site-check.cjs');
function parse(argv){
 const names=['approved-site','published-site','origin','out','owner-edit-review','media-out','static-export','media-digest-out'],required=names.slice(0,4);
 if(!Array.isArray(argv)||argv.length<8||argv.length>16||argv.length%2)
  throw Error('Usage: node stage3/seo-engine/bin/capture-public-https.cjs --approved-site /ABS/SEALED --published-site /ABS/published-site.json --origin https://host.example/ --out /ABS/new-public-evidence.json [--owner-edit-review /ABS/owner-review.json] [--media-out /ABS/new-public-media.json] [--static-export /ABS/official-static-release --media-digest-out /ABS/public-image-sha256.json]');
 const o={};
 for(let i=0;i<argv.length;i+=2){
  const name=argv[i].startsWith('--')?argv[i].slice(2):null;
  if(!names.includes(name)||!argv[i+1]||o[name])throw Error('Invalid public HTTPS capture flag');
  o[name]=argv[i+1];
 }
 if(required.some(k=>!o[k]))throw Error('Public HTTPS capture requires four explicit input flags');
 return o;
}
async function main(argv){
 const o=parse(argv),approved=BRIDGE.load(o['approved-site']),
  owner=FIRST.readPublishedSite(o['published-site']),
  review=o['owner-edit-review']?FIRST.readOwnerEditReview(o['owner-edit-review']):null;
 const {site,source}=BRIDGE.reconcile(approved,owner.site,owner.version,review);
 if(Boolean(o['static-export'])!==Boolean(o['media-digest-out']))
  throw Error('--static-export and --media-digest-out must be provided together');
 if(o['static-export']&&!owner.sourceRevision)
  throw Error('Public media digest capture requires a pinned owner API sourceRevision');
 const release=o['static-export']?STATIC.read(o['static-export'],site):null;
 if(release&&(release.publishedVersion!==owner.version||
   release.sourceRevision!==owner.sourceRevision))
  throw Error('Official static release version/sourceRevision differs from the owner API published site');
 CAP.origin(o.origin,site.siteId);
 const out=path.resolve(o.out),parent=fs.realpathSync(path.dirname(out)),
  sealed=fs.realpathSync(o['approved-site']);
 if(out===sealed||out.startsWith(sealed+path.sep)||
    parent===sealed||parent.startsWith(sealed+path.sep)||fs.existsSync(out))
  throw Error('Public HTTPS evidence must be a new file outside the sealed source');
 let mediaOut=null;
 if(o['media-out']){
  mediaOut=path.resolve(o['media-out']);
  const mediaParent=fs.realpathSync(path.dirname(mediaOut));
  if(mediaOut===out||mediaOut===sealed||mediaOut.startsWith(sealed+path.sep)||
     mediaParent===sealed||mediaParent.startsWith(sealed+path.sep)||fs.existsSync(mediaOut))
   throw Error('Public media evidence requires a distinct new file outside the sealed source');
 }
 let digestOut=null;
 if(o['media-digest-out']){
  digestOut=path.resolve(o['media-digest-out']);
  const dparent=fs.realpathSync(path.dirname(digestOut));
  if(digestOut===out||digestOut===mediaOut||digestOut===sealed||
     digestOut.startsWith(sealed+path.sep)||dparent===sealed||
     dparent.startsWith(sealed+path.sep)||fs.existsSync(digestOut))
   throw Error('Public binary SHA256 evidence output must be a distinct new private file outside the sealed package');
  BYTES.inventory(site,release);
  if(release.origin!==new URL(o.origin).origin||new URL(o.origin).pathname!=='/')
   throw Error('Public byte verification targets only the declared official root-mounted static HTTPS origin');
 }
 const found=await CAP.capture(site,o.origin);
 const publicMedia=mediaOut?await CAP.captureMedia(site,o.origin):null;
 if(publicMedia)MEDIA.assertEvidence(publicMedia.evidence);
 const publicDigests=digestOut?await BYTES.capture(site,release,o.origin):null;
 const firstRoot=found.evidence.pages.find(p=>p.path==='/');
 if(!firstRoot)throw Error('Public capture did not observe the mandatory homepage');
 const rootWindow=await CAP.recheckRoot(site,o.origin,firstRoot);
 if(!rootWindow.matched)
  throw Error('Public homepage changed between first and final read; reject potentially mixed deployment evidence');
 const completeHttp={...found.evidence,rootRecheck:rootWindow};
 const again=FIRST.readPublishedSite(o['published-site']);
 if(again.version!==owner.version||again.sourceRevision!==owner.sourceRevision||
    JSON.stringify(again.site)!==JSON.stringify(owner.site))
  throw Error('Owner-published site input changed during public capture; discard evidence');
 if(release&&STATIC.read(o['static-export'],site).manifestSha256!==release.manifestSha256)
  throw Error('Official static release changed during public HTTPS capture; discard results');
 const inspected=DELIVERY.review(site,completeHttp);
 fs.writeFileSync(out,JSON.stringify(completeHttp,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});
 if(publicDigests)fs.writeFileSync(digestOut,JSON.stringify(publicDigests,null,2)+'\n',
  {encoding:'utf8',mode:0o600,flag:'wx'});
 if(publicMedia)fs.writeFileSync(mediaOut,JSON.stringify(publicMedia.evidence,null,2)+'\n',
  {encoding:'utf8',mode:0o600,flag:'wx'});
 return {file:out,siteId:site.siteId,publishedVersion:source.publishedVersion,
  ownerSourceRevisionClaim:owner.sourceRevision??null,
  requests:found.requests+1,bodyBytes:found.bytes,
  rootWindowSha256Rechecked:true,rootWindowMatched:rootWindow.matched,
  publicMediaFile:mediaOut,mediaHeadRequests:publicMedia?.requests??null,
  unsupportedHeadAssets:publicMedia?.unsupportedHeadAssetIds??[],
  publicMediaByteDigestFile:digestOut,
  publicMediaGetRequests:publicDigests?.resources.length??null,
  actualMediaBinaryBytesHashed:publicDigests?.totalReceivedBytes??null,
  publicMediaDigestMatchesOfficial:publicDigests?publicDigests.resources.every(r=>r.hashMatched):null,
  mediaBodiesDownloaded:Boolean(publicDigests),
  mediaShaVerified:Boolean(publicDigests),mediaBodiesSaved:false,
  capturedPages:found.evidence.pages.length,
  localTechnicalFindings:inspected.findings.length,
  publicHttpsTransportCaptured:true,servedCmsRevisionAuthenticated:false,
  formsDelivered:false,manualReleaseRequired:true};
}
if(require.main===module)
 main(process.argv.slice(2)).then(x=>process.stdout.write('PUBLIC HTTPS READ-ONLY EVIDENCE: '+JSON.stringify(x)+'\n'))
  .catch(e=>{process.stderr.write('Public HTTPS capture failed: '+e.message+'\n');process.exitCode=1;});
module.exports=Object.freeze({parse,main});
