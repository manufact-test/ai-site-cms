#!/usr/bin/env node
'use strict';
// Owner-operated public HTTPS read-only GET capture. No CMS mutation, POST,
// browser scripting, automatic release or cross-origin redirects.
const fs=require('node:fs'),path=require('node:path');
const BRIDGE=require('../lib/approved-site-bridge.cjs');
const CAP=require('../lib/public-https-capture.cjs');
const DELIVERY=require('../lib/delivery-evidence.cjs');
const MEDIA=require('../lib/media-delivery.cjs');
const FIRST=require('./first-site-check.cjs');
function parse(argv){
 const names=['approved-site','published-site','origin','out','owner-edit-review','media-out'],required=names.slice(0,4);
 if(!Array.isArray(argv)||argv.length<8||argv.length>12||argv.length%2)
  throw Error('Usage: node stage3/seo-engine/bin/capture-public-https.cjs --approved-site /ABS/SEALED --published-site /ABS/published-site.json --origin https://host.example/ --out /ABS/new-public-evidence.json [--owner-edit-review /ABS/owner-review.json] [--media-out /ABS/new-public-media.json]');
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
 const found=await CAP.capture(site,o.origin);
 const publicMedia=mediaOut?await CAP.captureMedia(site,o.origin):null;
 if(publicMedia)MEDIA.assertEvidence(publicMedia.evidence);
 const again=FIRST.readPublishedSite(o['published-site']);
 if(again.version!==owner.version||again.sourceRevision!==owner.sourceRevision||
    JSON.stringify(again.site)!==JSON.stringify(owner.site))
  throw Error('Owner-published site input changed during public capture; discard evidence');
 const inspected=DELIVERY.review(site,found.evidence);
 fs.writeFileSync(out,JSON.stringify(found.evidence,null,2)+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});
 if(publicMedia)fs.writeFileSync(mediaOut,JSON.stringify(publicMedia.evidence,null,2)+'\n',
  {encoding:'utf8',mode:0o600,flag:'wx'});
 return {file:out,siteId:site.siteId,publishedVersion:source.publishedVersion,
  ownerSourceRevisionClaim:owner.sourceRevision??null,
  requests:found.requests,bodyBytes:found.bytes,
  publicMediaFile:mediaOut,mediaHeadRequests:publicMedia?.requests??null,
  unsupportedHeadAssets:publicMedia?.unsupportedHeadAssetIds??[],
  mediaBodiesDownloaded:false,mediaShaVerified:false,
  capturedPages:found.evidence.pages.length,
  localTechnicalFindings:inspected.findings.length,
  publicHttpsTransportCaptured:true,servedCmsRevisionAuthenticated:false,
  formsDelivered:false,manualReleaseRequired:true};
}
if(require.main===module)
 main(process.argv.slice(2)).then(x=>process.stdout.write('PUBLIC HTTPS READ-ONLY EVIDENCE: '+JSON.stringify(x)+'\n'))
  .catch(e=>{process.stderr.write('Public HTTPS capture failed: '+e.message+'\n');process.exitCode=1;});
module.exports=Object.freeze({parse,main});
