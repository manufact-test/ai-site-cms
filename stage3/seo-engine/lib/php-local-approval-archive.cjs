'use strict';
// Inspect the owner-copied GET /api/sites/SITE-ID/approval-evidence.
// This never downloads or republishes private approved images, specification,
// operators or original files; checks only archived kind/length/SHA256 metadata.
// The sealed source handoff SHA256 is computed independently on disk.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const FORMAT='manufact-seo-owner-approval-archive-v1',SHA=/^[a-f0-9]{64}$/;
const FIXED=['handoff','site','desktop','tablet','mobile','clientExplanation','implementationSpec'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function review(folder,site,source,index){
 if(!site||!Array.isArray(site.pages)||!source||source.siteId!==site.siteId||
    source.packageFormat!=='manufact-approved-site-handoff-v2'||
    source.integrity!=='sha256-verified-at-read'||!index||typeof index!=='object'||
    Array.isArray(index)||!Array.isArray(index.packages)||index.packages.length>50)
  throw Error('Owner approval archive requires sealed v2 source and bounded owner API package index');
 const handoffPath=path.join(fs.realpathSync(folder),'handoff.json');
 const stat=fs.lstatSync(handoffPath);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<100||stat.size>300000)
  throw Error('Sealed approval handoff unavailable or unsafe');
 const bytes=fs.readFileSync(handoffPath),hash=sha(bytes),handoff=JSON.parse(bytes.toString('utf8'));
 if(handoff.format!=='manufact-approved-site-handoff-v2'||handoff.version!==source.packageVersion||
    handoff.status!=='approved'||!handoff.integrity?.files||
    typeof handoff.integrity.files!=='object'||!handoff.files?.site)
  throw Error('Source handoff does not match the preflight verified Approved Site v2');
 const expected=new Map(),set=(kind,file)=>{
  if(typeof file!=='string'||file.length>200||!SHA.test(handoff.integrity.files[file]||'')||
     expected.has(kind))throw Error('Invalid sealed approved prototype evidence checksum');
  expected.set(kind,{sha256:handoff.integrity.files[file],
   maxBytes:kind==='site'?500000:kind==='handoff'?300000:
    kind==='clientExplanation'||kind==='implementationSpec'?200000:8000000});
 };
 expected.set('handoff',{sha256:hash,maxBytes:300000});
 for(const kind of FIXED.filter(x=>x!=='handoff'))set(kind,handoff.files[kind]);
 const pages=handoff.files.pagePrototypes||{},pageIds=Object.keys(pages).sort();
 if(pageIds.length>20)throw Error('Owner sealed page-specific prototype count is out of bounds');
 for(let i=0;i<pageIds.length;i++)
  for(const dev of ['desktop','tablet','mobile'])set('ref-'+i+'-'+dev,pages[pageIds[i]][dev]);
 if(expected.get('site').sha256!==source.fileSha256||
    ['desktop','tablet','mobile'].some(dev=>
      expected.get(dev).sha256!==source.homepagePrototypeSha256[dev]))
  throw Error('Approval evidence files disagree with the source-bound approved site SHA256');
 const findings=[],add=(code,severity,message)=>findings.push(Object.freeze({
  code:'php-approval:'+code,severity,pageId:null,path:null,message,
  evidence:'owner-provided-cms-approval-archive-index-not-client-signature',
  automatic:false}));
 const indexed=new Set();
 for(const p of index.packages){
  if(!p||typeof p!=='object'||!SHA.test(p.packageSha||'')||
     indexed.has(p.packageSha)||!p.files||typeof p.files!=='object'||
     Array.isArray(p.files)||typeof p.complete!=='boolean')
   throw Error('Malformed or duplicate owner API approval evidence package metadata');
  indexed.add(p.packageSha);
 }
 const match=index.packages.find(x=>x.packageSha===hash);
 let checked=0,missing=0,mismatched=0;
 if(!match){
  add('sealed-package-not-archived','error',
   'The CMS approval evidence index contains no copy of the exact sealed v2 handoff hash; archive the approved source before accepting this site.');
 }else{
  if(match.version!==source.packageVersion)
   add('archived-package-version-mismatch','error',
    'CMS archived approved package version differs from the SHA256-verified sealed source version.');
  for(const [kind,record] of expected){
   const found=match.files[kind];
   if(!found){missing++;continue;}
   if(typeof found!=='object'||Array.isArray(found)||!SHA.test(found.sha256||'')||
      !Number.isSafeInteger(found.bytes)||found.bytes<10||
      found.bytes>record.maxBytes||found.sha256!==record.sha256)
    mismatched++;
   else checked++;
  }
  if(missing)add('archived-approval-evidence-missing','error',
   'CMS private approval archive omits '+missing+' required source prototype/specification entries.');
  if(mismatched)add('archived-approval-evidence-sha256-drift','error',
   'CMS approval archive lists '+mismatched+' evidence entries with unexpected digest or file length.');
  if(match.complete!==true||Object.keys(match.files).length!==expected.size)
   add('archive-incomplete-or-unexpected','error',
    'The owner CMS reports an incomplete or extra approved-evidence archive for this sealed package.');
 }
 return Object.freeze({format:FORMAT,siteId:site.siteId,
  publishedSourceSealedV2:true,expectedKinds:expected.size,
  sealedPackageSha256:hash,
  ownerArchiveKindsChecked:checked,missingKinds:missing,mismatchedKinds:mismatched,
  exactSealedPackageFound:Boolean(match),ownerArchiveMarkedComplete:match?.complete===true,
  findings:Object.freeze(findings),
  prototypeImageBytesExposed:false,clientExplanationsExposed:false,
  operatorIdentityExposed:false,originalDocumentContentsExposed:false,
  sourceHashReadFromVerifiedHandoff:true,
  ownerApiIndexAuthenticated:false,clientApprovalSignatureVerified:false,
  finalClientSignoffVerified:false,automaticRelease:false,
  limitations:'Only checks hash/size metadata of owner-copied private CMS approval archive against the sealed handoff. Cannot authenticate owner API transport, verify stored bytes, confirm client signatures, visual fidelity or publication permission.'});
}
module.exports=Object.freeze({FORMAT,review});
