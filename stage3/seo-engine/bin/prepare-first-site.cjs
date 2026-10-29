#!/usr/bin/env node
'use strict';
// Full FIRST SITE launch preparation in one operator-owned, private workspace.
// PHP must be running on localhost already. No deploy, no host writes, no
// external POST, no browser automation and no release approval.
const fs=require('node:fs'),path=require('node:path');
const FIRST=require('./first-site-check.cjs');
const UPLOAD=require('./prepare-static-upload.cjs');
const REQUIRED=['approved-site','published-site','blueprint','origin','static-export','provider','workspace'];
const OPTIONAL=['owner-edit-review','php-capture','previous-report','public-http-evidence',
 'public-media-evidence','public-media-digests','delivery-status'];
function parse(argv){
 if(!Array.isArray(argv)||argv.length%2||argv.length<REQUIRED.length*2||
    argv.length>(REQUIRED.length+OPTIONAL.length)*2)
  throw Error('Usage: node stage3/seo-engine/bin/prepare-first-site.cjs --approved-site /ABS/SEALED --published-site /ABS/owner-published.json --blueprint /ABS/approved-blueprint.json --origin http://127.0.0.1:PORT/published/SITE-ID/ --static-export /ABS/official-static-export --provider apache|nginx|netlify|cloudflare-pages --workspace /ABS/NEW-private-workspace [--owner-edit-review /ABS/owner-review.json] [--php-capture /ABS/lead-screenshots.json] [--public-http-evidence /ABS/public-http.json] [--public-media-evidence /ABS/media-head.json] [--public-media-digests /ABS/media-sha256.json] [--delivery-status /ABS/owner-form-delivery.json] [--previous-report /ABS/prior-report]');
 const o={};
 for(let i=0;i<argv.length;i+=2){
  const key=argv[i]?.startsWith('--')?argv[i].slice(2):null;
  if(![...REQUIRED,...OPTIONAL].includes(key)||!argv[i+1]||o[key])
   throw Error('Invalid or duplicate first-site candidate option');
  o[key]=argv[i+1];
 }
 if(REQUIRED.some(k=>!o[k])||!UPLOAD.parse([
   '--approved-site',o['approved-site'],'--published-site',o['published-site'],
   '--static-export',o['static-export'],'--provider',o.provider,
   '--out',path.resolve(o.workspace,'upload')
  ]))throw Error('Incomplete first-site launch candidate input');
 if(!path.isAbsolute(o.workspace))throw Error('Workspace must be a NEW absolute private directory');
 return o;
}
async function main(argv){
 const o=parse(argv),root=path.resolve(o.workspace);
 if(fs.existsSync(root))throw Error('Refusing to overwrite existing first-site launch workspace');
 const sealed=fs.realpathSync(o['approved-site']),staticDir=fs.realpathSync(o['static-export']),
  parent=fs.realpathSync(path.dirname(root));
 for(const source of [sealed,staticDir]){
  if(root===source||root.startsWith(source+path.sep)||source.startsWith(root+path.sep)||
     parent===source||parent.startsWith(source+path.sep))
   throw Error('Candidate workspace must be outside the sealed source and official static export');
 }
 fs.mkdirSync(root,{mode:0o700});
 const toArgs=opts=>Object.entries(opts).flatMap(([k,v])=>['--'+k,v]);
 const args={
  'approved-site':o['approved-site'],'published-site':o['published-site'],
  blueprint:o.blueprint,origin:o.origin,'static-export':o['static-export'],
  evidence:path.join(root,'local-php-evidence'),report:path.join(root,'seo-report')
 };
 for(const key of OPTIONAL)if(o[key])args[key]=o[key];
 const first=await FIRST.main(toArgs(args));
 const uploadArgs={
  'approved-site':o['approved-site'],'published-site':o['published-site'],
  'static-export':o['static-export'],provider:o.provider,
  out:path.join(root,'static-upload')
 };
 if(o['owner-edit-review'])uploadArgs['owner-edit-review']=o['owner-edit-review'];
 const deployed=UPLOAD.create(toArgs(uploadArgs));
 if(deployed.officialManifestSha256!==first.summary.staticExport.staticManifestSha256)
  throw Error('First-site PHP capture and prepared static upload refer to different official static exports');
 const release=first.summary.release;
 const status=release.blockingGates>0?'TECHNICAL-BLOCKED':'MANUAL-ACCEPTANCE-REQUIRED';
 const record={
  format:'manufact-seo-first-site-candidate-v1',siteId:first.summary.siteId,
  localhostOrigin:first.summary.origin,provider:o.provider,
  officialStaticManifestSha256:deployed.officialManifestSha256,
  publishedVersion:deployed.publishedVersion,
  staticUploadRelativeDir:'static-upload/public',
  technicalReviewRelativeDir:'seo-report',
  phpEvidenceRelativeDir:'local-php-evidence',
  blockingGates:release.blockingGates,
  blockingGateIds:release.blockerIds,
  reviewGates:release.reviewGates,
  manualChecksRequired:release.mandatoryManualChecks,
  status,operatorMustApprove:true,
  realProductionHttpsVerified:false,realFormsPostAndDeliveryTested:false,
  desktopTabletMobileClientApproved:false,actualHostWrites:0,
  remoteDeployPerformed:false,prOrMergePerformed:false
 };
 const markdown=[
  '# First site CMS — release-candidate operator checklist',
  '',
  'Result: **'+status+'**. Not an authorization to publish.',
  'CMS site ID: '+record.siteId+'; published version: '+record.publishedVersion+'.',
  'Official static export SHA256: '+record.officialStaticManifestSha256+'.',
  'Target provider: '+o.provider+'.',
  '',
  '## Local technical evidence',
  '',
  '- seo-report/summary.json — PHP and SEO technical gate result',
  '- seo-report/launch-worksheet.md — page-by-page desktop/tablet/mobile manual review',
  '- local-php-evidence/ — private captured PHP HTML/media, never upload it',
  '- static-upload/public/ — ONLY folder intended for later operator-managed upload',
  '- static-upload/HANDOFF.md — provider-specific details and real HTTPS checks',
  '',
  '## Mandatory sign-off still outstanding',
  '',
  '- [ ] Resolve all '+record.blockingGates+' technical blockers: '+(record.blockingGateIds.join(', ')||'none recorded')+'.',
  '- [ ] Verify owner-authorized published version, current owner edits and actual PHP process revision.',
  '- [ ] Compare desktop/tablet/mobile against the three client-approved static prototypes.',
  '- [ ] Test all forms with genuine authorized POST in development/production, persistence and recipient delivery.',
  '- [ ] Deploy selected static-upload/public only after approval and check live public HTTPS.',
  '- [ ] Check page HTTP 200, genuine historic 301, missing page 404, robots/sitemap/canonical, CSP, media bytes.',
  '- [ ] Client signs off content, accessibility, privacy and live user journey.',
  '',
  'Preview locally (does NOT confirm production):',
  'node stage3/seo-engine/bin/preview-static-upload.cjs --bundle '+path.join(root,'static-upload')+' --port 8844',
  '',
  'No CMS write, GitHub merge/PR, production upload, public POST or live release was attempted.',
  ''
 ].join('\n');
 fs.writeFileSync(path.join(root,'CANDIDATE-STATUS.json'),JSON.stringify(record,null,2)+'\n',
  {flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(root,'CANDIDATE-HANDOFF.md'),markdown,
  {flag:'wx',mode:0o600});
 return Object.freeze({workspace:root,siteId:record.siteId,status,
  blockingGates:record.blockingGates,publishedVersion:record.publishedVersion,
  provider:o.provider,stagedPublicFiles:deployed.files,
  publicManifestSha256:record.officialStaticManifestSha256,
  actualHostWrites:0,manualReleaseRequired:true});
}
if(require.main===module)
 main(process.argv.slice(2)).then(x=>process.stdout.write('FIRST SITE PREPARATION: '+JSON.stringify(x)+'\n'))
  .catch(e=>{process.stderr.write('First-site candidate refused: '+e.message+
    ' — inspect and quarantine any partial workspace before rerun.\n');process.exitCode=1;});
module.exports=Object.freeze({parse,main});
