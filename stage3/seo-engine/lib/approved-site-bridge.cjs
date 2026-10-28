'use strict';
// Thin read-only adapter to the LEAD's authoritative sealed-v2 verifier.
// No second client approval ledger, package sealer or screenshot validator.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {fingerprint}=require('./acceptance.cjs');
const SOURCE_FORMAT='manufact-seo-approved-site-source-v1';
const verifiedSources=new WeakSet();
function isVerifiedSource(source){return verifiedSources.has(source);}
function load(folder){
 let lead;
 try{lead=require('../../bin/verify-approved-site.cjs');}
 catch(e){
  if(e.code==='MODULE_NOT_FOUND'&&String(e.message).includes('verify-approved-site.cjs'))
   throw Error('Approved Site v2 requires the lead integrated checkout with stage3/bin/verify-approved-site.cjs; the standalone SEO branch cannot verify sealed packages');
  throw e;
 }
 if(typeof lead.preflight!=='function'||!lead.HANDOFF_V2)
  throw Error('Lead approved-site verifier contract is unavailable');
 // The lead validator checks every file and SHA, the complete Site v1 graph,
 // the registered components, images, paths and optional per-page prototypes.
 const checked=lead.preflight(folder);
 const root=fs.realpathSync(folder);
 const handoff=JSON.parse(fs.readFileSync(path.join(root,'handoff.json'),'utf8'));
 if(handoff.format!==lead.HANDOFF_V2||checked.integrity!=='sha256-verified')
  throw Error('SEO review requires a sealed Approved Site v2 package; v1 is not sufficient');
 const relative=handoff.files.site;
 const resolved=fs.realpathSync(path.resolve(root,relative));
 if(!resolved.startsWith(root+path.sep))throw Error('Approved Site source path escapes package');
 const sourceBytes=fs.readFileSync(resolved);
 const fileSha256=crypto.createHash('sha256').update(sourceBytes).digest('hex');
 if(!handoff.integrity?.files||handoff.integrity.files[relative]!==fileSha256)
  throw Error('Sealed site.json changed after approved-site preflight');
 const site=JSON.parse(sourceBytes.toString('utf8'));
 if(site.siteId!==checked.siteId||handoff.version!==checked.version)
  throw Error('Approved Site source changed after preflight');
 const references=Object.freeze(site.pages.map(p=>Object.freeze({
  pageId:p.id,path:p.path,
  referenceType:p.path==='/'?'homepage':handoff.files.pagePrototypes?.[p.id]?'page-specific':null,
  devices:Object.freeze(p.path==='/'||handoff.files.pagePrototypes?.[p.id]?['desktop','tablet','mobile']:[])
 })));
 const summary=Object.freeze({
  format:SOURCE_FORMAT,siteId:site.siteId,packageFormat:handoff.format,
  packageVersion:handoff.version,integrity:'sha256-verified-at-read',
  verifiedBy:'stage3/bin/verify-approved-site.cjs',
  fileSha256,siteRevisionFingerprint:fingerprint(site),
  pageReferences:references,
  availablePrototypePageCount:references.filter(p=>p.devices.length===3).length,
  missingInteriorPrototypePageIds:Object.freeze(references.filter(p=>p.path!=='/'&&!p.devices.length).map(p=>p.pageId)),
  clientApprovalAuthenticated:false,visualFidelityVerified:false,published:false
 });
 verifiedSources.add(summary);
 return {site,source:summary};
}
module.exports=Object.freeze({SOURCE_FORMAT,load,isVerifiedSource});
