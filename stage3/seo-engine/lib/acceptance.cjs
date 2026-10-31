'use strict';
// Explicit, auditable evidence assertions. No auto-signature, client approval or publication.
const {createHash}=require('node:crypto');
const {checkBlueprint}=require('./blueprint.cjs');
const FORMAT='manufact-seo-acceptance-v1',REPORT='manufact-seo-acceptance-review-v1';
const DEVICES=['desktop','tablet','mobile'];
const GATES=[
 ['prototype-approval','Three approved static prototype images, client signoff and blueprint revision'],
 ['visual-fidelity','Browser screenshots and explicit desktop/tablet/mobile comparison'],
 ['behavior','Real form delivery, keyboard/focus, CTA navigation and mobile interactions'],
 ['published-host','HTTPS origin, redirects, canonical, robots, sitemap and OG resources'],
 ['structured-data','Visible supporting facts and actual shipped Schema.org markup'],
 ['performance','Deployed Web Vitals and accessibility observations'],
 ['overrides-and-rollback','Saved CMS overrides, Save vs Publish, history and rollback']
];
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function canonical(value){
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object'){
  const keys=Object.keys(value).sort();
  return '{'+keys.map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 }
 if(typeof value==='number'&&!Number.isFinite(value))throw Error('Unsupported nonfinite value');
 return JSON.stringify(value);
}
const fingerprint=x=>createHash('sha256').update(canonical(x),'utf8').digest('hex');
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=500&&!/[\x00-\x1f]/.test(x);
const date=x=>typeof x==='string'&&x.length<=40&&!Number.isNaN(Date.parse(x))&&/^\d{4}-\d\d-\d\dT/.test(x);
function template(site,blueprint){
 const b=checkBlueprint(blueprint);
 if(!site||site.siteId!==b.siteId)throw Error('Acceptance template siteId mismatch');
 return {format:FORMAT,siteId:site.siteId,blueprintSha256:fingerprint(b),
  siteSha256:fingerprint(site),
  prototype:{revision:'',images:DEVICES.map(device=>({device,artifact:'',sha256:''})),
   approvedBy:'',approvedAt:null,evidenceReference:''},
  checks:GATES.map(([id])=>({id,status:'pending',reviewedBy:'',reviewedAt:null,
   evidenceReference:'',note:''}))};
}
function review(site,blueprint,ledger){
 const b=checkBlueprint(blueprint);
 if(!site||site.siteId!==b.siteId||!ledger||typeof ledger!=='object'||Array.isArray(ledger)||
  ledger.format!==FORMAT||ledger.siteId!==b.siteId||
  Object.keys(ledger).some(k=>!['format','siteId','blueprintSha256','siteSha256','prototype','checks'].includes(k)))
  throw Error('Invalid SEO acceptance ledger or wrong project');
 const expected={blueprintSha256:fingerprint(b),siteSha256:fingerprint(site)};
 const fingerprints={
  blueprintMatches:ledger.blueprintSha256===expected.blueprintSha256,
  siteMatches:ledger.siteSha256===expected.siteSha256,
  suppliedBlueprintSha256:ledger.blueprintSha256??null,
  suppliedSiteSha256:ledger.siteSha256??null,
  currentBlueprintSha256:expected.blueprintSha256,currentSiteSha256:expected.siteSha256
 };
 const p=ledger.prototype;
 if(!p||typeof p!=='object'||Array.isArray(p)||
  Object.keys(p).some(k=>!['revision','images','approvedBy','approvedAt','evidenceReference'].includes(k))||
  typeof p.revision!=='string'||p.revision.length>120||
  !Array.isArray(p.images)||p.images.length!==3||
  typeof p.approvedBy!=='string'||p.approvedBy.length>180||
  (p.approvedAt!==null&&p.approvedAt!==undefined&&!date(p.approvedAt))||
  typeof p.evidenceReference!=='string'||p.evidenceReference.length>500)
  throw Error('Invalid prototype approval shape');
 const devices=new Set(),seenHashes=new Set(),invalidImages=[];
 for(const img of p.images){
  if(!img||typeof img!=='object'||Array.isArray(img)||
   Object.keys(img).some(k=>!['device','artifact','sha256'].includes(k))||
   !DEVICES.includes(img.device)||devices.has(img.device)||
   typeof img.artifact!=='string'||img.artifact.length>500||
   typeof img.sha256!=='string'||img.sha256.length>64)
   throw Error('Invalid or duplicated prototype image entry');
  devices.add(img.device);
  if(!text(img.artifact)||!sha(img.sha256)||seenHashes.has(img.sha256))
   invalidImages.push(img.device);
  if(sha(img.sha256))seenHashes.add(img.sha256);
 }
 const signed=Boolean(text(p.revision)&&text(p.approvedBy)&&date(p.approvedAt)&&text(p.evidenceReference));
 const prototypeAccepted=signed&&invalidImages.length===0&&fingerprints.blueprintMatches;
 if(!Array.isArray(ledger.checks)||ledger.checks.length!==GATES.length)throw Error('Invalid acceptance gate count');
 const allow=new Set(GATES.map(x=>x[0])),seen=new Set(),checks=[];
 for(const c of ledger.checks){
  if(!c||typeof c!=='object'||Array.isArray(c)||!allow.has(c.id)||seen.has(c.id)||
   !['pending','approved','rejected'].includes(c.status)||
   Object.keys(c).some(k=>!['id','status','reviewedBy','reviewedAt','evidenceReference','note'].includes(k))||
   typeof c.reviewedBy!=='string'||c.reviewedBy.length>180||
   (c.reviewedAt!==null&&c.reviewedAt!==undefined&&!date(c.reviewedAt))||
   typeof c.evidenceReference!=='string'||c.evidenceReference.length>500||
   typeof c.note!=='string'||c.note.length>1000)
   throw Error('Invalid or duplicated acceptance check');
  seen.add(c.id);
  const complete=text(c.reviewedBy)&&date(c.reviewedAt)&&text(c.evidenceReference);
  const status=c.status==='pending'?'pending':complete?c.status:'incomplete-attestation';
  checks.push({id:c.id,title:GATES.find(x=>x[0]===c.id)[1],status,
   suppliedStatus:c.status,reviewedBy:complete?c.reviewedBy:null,
   evidenceReference:complete?c.evidenceReference:null,
   reviewedAt:complete?c.reviewedAt:null,
   note:c.note,
   sourceAuthenticated:false,automaticPass:false});
 }
 const stale=!fingerprints.blueprintMatches||!fingerprints.siteMatches;
 const approvedChecks=checks.filter(x=>x.status==='approved').length;
 const rejectedChecks=checks.filter(x=>x.status==='rejected').length;
 const invalidChecks=checks.filter(x=>x.status==='incomplete-attestation').length;
 const missing=checks.filter(x=>x.status!=='approved').map(x=>x.id);
 // A ledger is user-supplied: all flags are assertions only. No readyToPublish=true here.
 return {format:REPORT,version:1,siteId:site.siteId,readOnly:true,
  fingerprints,stale,
  prototype:{approvedAssertionRecorded:prototypeAccepted,revision:p.revision||null,
   imagesProvided:p.images.length,invalidImages,clientApprovalAuthenticated:false,
   evidenceReference:signed?p.evidenceReference:null,
   reviewer:signed?p.approvedBy:null},
  checks,
  summary:{totalChecks:GATES.length,approvedAssertions:approvedChecks,
   rejectedAssertions:rejectedChecks,incompleteAttestations:invalidChecks,
   unresolvedChecks:missing.length,prototypeApprovalRecorded:prototypeAccepted,
   sourceChanged:stale,allSuppliedAssertionsComplete:prototypeAccepted&&!stale&&missing.length===0,
   authenticatedApprovals:0,automaticPublicationApprovals:0},
  blockers:[
   ...(!fingerprints.blueprintMatches?['approved-blueprint-revision-mismatch']:[]),
   ...(!fingerprints.siteMatches?['site-revision-mismatch']:[]),
   ...(p.approvedBy&&!prototypeAccepted?['prototype-signoff-incomplete-or-unverified']:[]),
   ...checks.filter(x=>x.status==='rejected').map(x=>'rejected:'+x.id),
   ...checks.filter(x=>x.status==='incomplete-attestation').map(x=>'incomplete:'+x.id)
  ],
  releaseAuthorized:false,readyToPublish:false,
  limitations:'Every signature, asset hash, evidence URL and browser check is claimed by the supplied ledger, not independently verified. No files or live sites were inspected, no client authentication occurred, and a complete ledger does not auto-authorize publication.'};
}
module.exports=Object.freeze({FORMAT,REPORT,GATES,DEVICES,fingerprint,template,review});
