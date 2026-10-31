#!/usr/bin/env node
'use strict';
// Explicit POST-deployment read-only acceptance check. Requires a private
// offline candidate and externally collected HTTPS transcripts. No deployment.
const fs=require('node:fs'),path=require('node:path');
const BRIDGE=require('../lib/approved-site-bridge.cjs');
const FIRST=require('./first-site-check.cjs');
const STATIC=require('../lib/php-local-static-export.cjs');
const VERIFY=require('../lib/post-deploy-verification.cjs');
const REQUIRED=['candidate','approved-site','published-site','static-export',
 'public-http-evidence','public-media-digests','out'];
const OPTIONAL=['public-media-evidence','owner-edit-review','previous-public-http','previous-public-media-digests'];
function parse(argv){
 if(!Array.isArray(argv)||argv.length%2||argv.length<REQUIRED.length*2||
    argv.length>(REQUIRED.length+OPTIONAL.length)*2)
  throw Error('Usage: node stage3/seo-engine/bin/verify-deployed-site.cjs --candidate /ABS/private-first-site-candidate --approved-site /ABS/sealed-v2 --published-site /ABS/owner-published.json --static-export /ABS/official-static-export --public-http-evidence /ABS/public-https.json --public-media-digests /ABS/public-GET-sha256.json --out /ABS/NEW-private-verification [--public-media-evidence /ABS/public-HEAD.json] [--owner-edit-review /ABS/published-owner-edits-review.json] [--previous-public-http /ABS/earlier-public-https.json] [--previous-public-media-digests /ABS/earlier-public-GET-sha256.json]');
 const opts={};
 for(let i=0;i<argv.length;i+=2){
  const key=argv[i]?.startsWith('--')?argv[i].slice(2):null,v=argv[i+1];
  if(![...REQUIRED,...OPTIONAL].includes(key)||typeof v!=='string'||!path.isAbsolute(v)||
     opts[key])throw Error('Unknown, duplicate or non-absolute post-deploy verification flag');
  opts[key]=v;
 }
 if(opts['previous-public-media-digests']&&!opts['previous-public-http'])
  throw Error('Earlier media digest must be supplied together with earlier public HTTPS capture');
 if(REQUIRED.some(x=>!opts[x]))throw Error('Post-deploy check requires private candidate, owner source, official static export and HTTPS GET SHA256 receipts');
 return opts;
}
function main(argv){
 const o=parse(argv),out=path.resolve(o.out);
 if(fs.existsSync(out))throw Error('Refusing to replace existing post-deploy review');
 const approved=BRIDGE.load(o['approved-site']);
 const owner=FIRST.readPublishedSite(o['published-site']);
 if(!Number.isSafeInteger(owner.sourceRevision))
  throw Error('Owner-published API sourceRevision is mandatory for post-deploy verification');
 const review=o['owner-edit-review']?FIRST.readOwnerEditReview(o['owner-edit-review']):null;
 const {site}=BRIDGE.reconcile(approved,owner.site,owner.version,review);
 const release=STATIC.read(o['static-export'],site);
 if(release.publishedVersion!==owner.version||release.sourceRevision!==owner.sourceRevision)
  throw Error('Official static release differs from owner CMS currently published version/revision');
 const inputs=[o['published-site'],o['approved-site']+'/handoff.json',
  path.join(o.candidate,'CANDIDATE-STATUS.json'),
  path.join(o.candidate,'seo-report','summary.json'),
  path.join(o.candidate,'static-upload','upload-inventory.json'),
  path.join(o.candidate,'public-site.zip'),
  ...(fs.existsSync(path.join(o.candidate,'UPGRADE-IMPACT.json'))?
   [path.join(o.candidate,'UPGRADE-IMPACT.json'),
    path.join(o.candidate,'rollback-public-site.zip')]:[]),
  o['static-export']+'/release-manifest.json',
  o['public-http-evidence'],o['public-media-digests'],
  ...(o['public-media-evidence']?[o['public-media-evidence']]:[]),
  ...(o['owner-edit-review']?[o['owner-edit-review']]:[]),
  ...(o['previous-public-http']?[o['previous-public-http']]:[]),
  ...(o['previous-public-media-digests']?[o['previous-public-media-digests']]:[])];
 // Re-read metadata and both upload ZIPs after the review; reject anyone
 // editing an evidence file or a candidate behind the operator's back.
 const crypto=require('node:crypto');
 const shaFile=file=>{
  const stat=fs.lstatSync(file),large=file.endsWith('.zip');
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<5||
     stat.size>(large?190000000:36000000))
   throw Error('Post-deploy input must be a bounded ordinary private file: '+file);
  const h=crypto.createHash('sha256'),fd=fs.openSync(file,'r');
  try{
   const block=Buffer.alloc(1048576);
   for(;;){
    const n=fs.readSync(fd,block,0,block.length,null);
    if(!n)break;
    h.update(block.subarray(0,n));
   }
  }finally{fs.closeSync(fd);}
  return h.digest('hex');
 };
 const pinned=inputs.map(shaFile);
 const verdict=VERIFY.readAndInspect(o.candidate,site,release,
  o['public-http-evidence'],o['public-media-evidence']??null,o['public-media-digests'],
  o['previous-public-http']??null,o['previous-public-media-digests']??null);
 for(let i=0;i<inputs.length;i++){
  const current=shaFile(inputs[i]);
  if(pinned[i]!==current)
   throw Error('Post-deploy inputs changed during validation; discard evidence and reacquire');
 }
 const lines=[
  '# AI Site CMS — post-deployment technical verification','',
  'Site: '+verdict.siteId+', published version: '+verdict.publishedVersion+'.',
  'Official static manifest SHA256: '+verdict.officialStaticManifestSha256+'.',
  'Validated public static ZIP SHA256: '+verdict.candidatePublicZipSha256+'.',
  'Public HTTPS origin: '+verdict.publishedHost+'.',
  '**'+verdict.disposition+'**',
  'First-candidate technical blockers: '+verdict.originalCandidateBlockingGates+'.',
  'Post-deployment blocking reasons: '+verdict.postDeployBlockingReasons.length+'.',
  'Public asset SHA256 verified: '+verdict.sha256MatchedAssets+'/'+verdict.totalAssets+'.',
  'Previous public capture supplied: '+verdict.earlierPublicCaptureCompared+'.',
  'Same-release CDN drift items: '+(verdict.unchangedReleaseObservedCdnDrift??'not comparable')+'.',
  'Public static pages checked: '+verdict.checkedPages+
   ', HTTP 301: '+verdict.checkedRedirects+'.','',
  '## Blocking reasons','',
  ...(verdict.postDeployBlockingReasons.length?
   verdict.postDeployBlockingReasons.map(x=>'- '+x.code+': '+x.reason):
   ['- None observed in these supplied transcripts.']),
  '','## Public report error codes','',
  ...(verdict.publicErrorFindings.map(x=>'- '+x.code+
   (x.path?' ('+x.path+')':''))),
  '', '## Manual signoff is still mandatory','',
  '- [ ] Independently confirm saved HTTP evidence really came from the live TLS-verified host.',
  '- [ ] Test CMS forms POST, submission persistence, configured email/Telegram and consent.',
  '- [ ] Check desktop/tablet/mobile against each client-approved reference in an actual browser.',
  '- [ ] Confirm owner CMS published source revision, client acceptance and accessibility.',
  '- [ ] Never take this read-only report as an approval to deploy or modify a live host.',
  '', 'No network requests, POST, CMS writes, merge, PR or production deployment were performed.',
  ''
 ];
 const parent=fs.realpathSync(path.dirname(out));
 const candidate=fs.realpathSync(o.candidate),exportDir=fs.realpathSync(o['static-export']);
 if([candidate,exportDir].some(x=>out===x||out.startsWith(x+path.sep)||
  x.startsWith(out+path.sep)||parent===x||parent.startsWith(x+path.sep)))
  throw Error('Output must not be inside private candidate or official export');
 const temp=fs.mkdtempSync(path.join(parent,'.seo-postdeploy-incomplete-'));
 try{
  fs.writeFileSync(path.join(temp,'post-deploy-summary.json'),
   JSON.stringify(verdict,null,2)+'\n',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(temp,'post-deploy-handoff.md'),lines.join('\n'),
   {flag:'wx',mode:0o600});
  if(fs.existsSync(out))throw Error('Output appeared during review');
  fs.renameSync(temp,out);
 }catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e;}
 return Object.freeze({output:out,siteId:verdict.siteId,
  status:verdict.disposition,publicAssetsVerified:verdict.sha256MatchedAssets,
  publicPagesChecked:verdict.checkedPages,operatorApprovalRequired:true,
  publicSiteWrites:0,realNetworkRequests:0});
}
if(require.main===module)
 try{process.stdout.write('POST-DEPLOY VERIFICATION: '+JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch(e){process.stderr.write('Post-deploy verification refused: '+e.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,main});
