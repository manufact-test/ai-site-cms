'use strict';
// Offline Stage2 delivery receipt. SHA-256 is a consistency check, NOT a
// publisher signature, independent host audit, legal opinion, or owner approval.
const fs=require('node:fs'),path=require('node:path');
const crypto=require('node:crypto');
const {STAGE,verify:verifyPackage}=require('./build-internal-package.cjs');
const legal=require('./stage2-license-dossier.cjs');
const review=require('./stage2-owner-decision.cjs');
const OUT=legal.OUT;
const SOURCE=['stage2-license-dossier.json','stage2-license-dossier.html',
 'stage2-owner-decision.json','stage2-owner-decision.html'];
const INDEX='stage2-handoff-index.json';
const WORKSHEET='stage2-owner-worksheet.md';
const PAGE='stage2-handoff-overview.html';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
const assert=(v,m)=>{if(!v)throw Error(m);};
function read(file,max=1048576){
 assert([...SOURCE,INDEX,WORKSHEET,PAGE].includes(file),'unexpected_handoff_file');
 const p=path.join(OUT,file),st=fs.lstatSync(p);
 assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1
  &&st.size>50&&st.size<=max&&(st.mode&0o077)===0,'unsafe_review_file');
 return fs.readFileSync(p);
}
function snapshot(){
 const pkg=verifyPackage(),ld=legal.createDossier(),owner=review.assemble(ld);
 assert(pkg.files.length>=450,'package_incomplete');
 const files={};
 for(const name of SOURCE)files[name]=read(name);
 assert(files[SOURCE[0]].equals(Buffer.from(json(ld)))
  &&files[SOURCE[1]].equals(Buffer.from(legal.renderHtml(ld))),
  'stale_or_tampered_license_dossier');
 assert(files[SOURCE[2]].equals(Buffer.from(json(owner)))
  &&files[SOURCE[3]].equals(Buffer.from(review.render(owner))),
  'stale_or_tampered_owner_decision');
 assert(owner.packageManifestSha256===ld.packageManifestSha256
  &&ld.packageFilesChecked===pkg.files.length&&ld.componentCount===43
  &&ld.independentLegalApproval===false
  &&owner.stage2Accepted===false&&owner.stage3Authorized===false
  &&owner.productionReady===false&&owner.cryptographicEvidenceRecord===null
  &&Object.values(owner.attachedEvidence).every(x=>x===null),
  'untrusted_or_conflicting_owner_evidence');
 const gates=['architecture_and_isolation','license_review',
  'target_package_structure','target_https_and_routing','target_web_sapi_and_db',
  'site_survives_cms_outage','trial_empty_cms_install','owner_acceptance'];
 assert(owner.remainingCriteria.length===gates.length&&
  gates.every((id,i)=>owner.remainingCriteria[i].id===id),'unreviewed_exit_gate_change');
 return {pkg,ld,owner,files};
}
function worksheet(s){
 const gates=s.owner.remainingCriteria.map((item,i)=>
  (i+1)+'. '+item.name+'\n'
  +'   Existing status: '+item.state+'\n'
  +'   Human decision: NOT RECORDED. Reviewer/date/evidence/result: __________\n').join('\n');
 return '# AI Site CMS — independent Stage 2 owner review worksheet\n\n'
  +'INTERNAL ONLY; NOT ACCEPTED; STAGE 3 NOT AUTHORIZED.\n\n'
  +'Package release: '+s.ld.packageVersion+'\n'
  +'Manifest SHA-256: '+s.ld.packageManifestSha256+'\n'
  +'Verified files: '+s.ld.packageFilesChecked
  +'; locked components: '+s.ld.componentCount+'\n\n'
  +'## Eight open manual gates\n\n'+gates+'\n'
  +'## Explicit, separate permissions — ALL CURRENTLY MISSING\n\n'
  +'- Actual target Hostinger READ-ONLY inspection requires a separate explicit owner permission, hostnames, scope and duration.\n'
  +'- Any real installation or writing requires another separate approval; read-only evidence NEVER authorizes writes.\n'
  +'- Controlled outage of an actual CMS requires separate permission.\n'
  +'- Independent legal reviewer must assess locked licenses and notices; no software process can grant legal sign-off.\n'
  +'- Only explicit human owner acceptance can close Stage 2; this generated text cannot grant acceptance.\n\n'
  +'## Actual evidence boundary\n\n'
  +'- Verified: internal package manifest SHA-256, source-bound SBOM/NOTICE and four clean offline reports.\n'
  +'- Disposable GitHub Actions only: isolated MySQL 8.4, three PHP-FPM processes, Apache/Nginx, independent public visitor sites, crash/restore and temporary release signing.\n'
  +'- NOT verified: actual Hostinger PHP-FPM, document root, HTTPS, real site/DB isolation or target install; production signing key custody; authenticated admin; content backup.\n'
  +'- This handoff index is UNSIGNED. Hashes only detect alteration relative to the index. A malicious actor can replace the unsigned index along with its contents; independently pin the expected index hash from a trusted source.\n\n'
  +'## Offline verification\n\n'
  +'From checked-out repository after creating the exact internal package and review files: node cms/tools/stage2-handoff-index.cjs --verify\n'
  +'Never use handoff verification as a deployment command.\n';
}
function html(s,index){
 const escape=x=>String(x).replace(/[&<>"']/g,c=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=Object.entries(index.files).map(([name,value])=>
  '<tr><td>'+escape(name)+'</td><td>'+escape(value.sha256)+'</td></tr>').join('');
 return '<!doctype html><html lang="en"><meta charset="utf-8">'
  +'<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'
  +'<meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<title>AI Site CMS Stage2 handoff</title>'
  +'<style>body{font:16px/1.5 system-ui,sans-serif;max-width:980px;margin:2rem auto;padding:0 1rem}table{width:100%;border-collapse:collapse}td,th{padding:.7rem;border-bottom:1px solid #aaa;text-align:left;overflow-wrap:anywhere}</style>'
  +'<main><h1>Stage 2 independent review materials</h1>'
  +'<p><strong>NOT ACCEPTED. Stage 3 NOT AUTHORIZED. NO target host access.</strong></p>'
  +'<p>Internal release '+escape(index.packageVersion)+', '+index.packageFilesVerified+' files, '
  +index.lockedComponents+' components, '+index.gateCount+' open human gates.</p>'
  +'<p>Source checkout: '+escape(index.sourceCommitSha||'not recorded outside CI')+'</p>'
  +'<p>Package manifest SHA-256: '+escape(index.packageManifestSha256)+'</p>'
  +'<p><strong>Unsigned receipt.</strong> Independently confirm the expected index hash from a trusted GitHub Actions run. This cannot establish publisher authenticity or owner authorization.</p>'
  +'<table><thead><tr><th>Attachment</th><th>SHA-256</th></tr></thead><tbody>'+rows+'</tbody></table>'
  +'<p>See '+WORKSHEET+' for eight specific manual approval/permission items. Real Hostinger checks are prohibited until separately authorized. Public visitor sites remain independent.</p>'
  +'</main></html>\n';
}
function dataOf(s,worksheetBytes){
 const shaSource=process.env.GITHUB_SHA||null;
 assert(shaSource===null||/^[a-f0-9]{40}$/.test(shaSource),'invalid_ci_sha');
 const files={};
 for(const [name,value] of Object.entries(s.files))
  files[name]={sha256:sha(value),bytes:value.length};
 files[WORKSHEET]={sha256:sha(worksheetBytes),bytes:worksheetBytes.length};
 return {
  format:'ai-site-cms-stage2-integrity-handoff-v1',
  scope:'unsigned-offline-review-attachment-hashes',
  sourceCommitSha:shaSource,
  packageVersion:s.ld.packageVersion,
  packageManifestSha256:s.ld.packageManifestSha256,
  packageFilesVerified:s.ld.packageFilesChecked,
  lockedComponents:s.ld.componentCount,
  gateCount:s.owner.remainingCriteria.length,
  files,
  noHostAccessPerformed:true,untrustedUnsignedIndex:true,
  independentLegalApproval:false,stage2Accepted:false,
  stage3Authorized:false,productionReady:false
 };
}
function privateDir(){
 const st=fs.lstatSync(OUT);
 assert(st.isDirectory()&&!st.isSymbolicLink()&&(st.mode&0o077)===0,
  'unprotected_review_directory');
}
function build(){
 privateDir();
 const s=snapshot(),ws=Buffer.from(worksheet(s)),index=dataOf(s,ws);
 fs.writeFileSync(path.join(OUT,WORKSHEET),ws,{mode:0o600});
 fs.writeFileSync(path.join(OUT,INDEX),json(index),{mode:0o600});
 fs.writeFileSync(path.join(OUT,PAGE),html(s,index),{mode:0o600});
 verify();
 console.log('Stage2 internal owner handoff: '+index.packageFilesVerified+
  ' verified files, '+Object.keys(index.files).length+
  ' hashed attachments, '+index.gateCount+' human gates, NO approval.');
 return index;
}
function verify(){
 privateDir();
 const s=snapshot(),ws=Buffer.from(worksheet(s));
 const index=JSON.parse(read(INDEX,32768));
 const generated=dataOf(s,ws);
 // Source SHA is provenance metadata; not a signature nor a trusted key.
 const normalized={...index,sourceCommitSha:generated.sourceCommitSha};
 assert(json(normalized)===json(generated),'stale_or_unauthorized_handoff_index');
 assert(read(WORKSHEET,32768).equals(ws),'tampered_human_worksheet');
 assert(read(PAGE,32768).equals(Buffer.from(html(s,index))),
  'tampered_handoff_overview');
 for(const [name,meta] of Object.entries(index.files)){
  const contents=read(name);
  assert(sha(contents)===meta.sha256&&contents.length===meta.bytes,
   'handoff_attached_file_mismatch');
 }
 return true;
}
if(require.main===module){
 try{
  if(process.argv.length!==3||!['--build','--verify'].includes(process.argv[2]))
   throw Error('explicit_handoff_command_required');
  if(process.argv[2]==='--build')build();
  else{verify();console.log('Stage2 offline handoff verification PASS (unsigned/no approval)');}
 }catch{
  process.stderr.write('STAGE2_HANDOFF_REFUSED\n');process.exitCode=3;
 }
}
module.exports={build,verify,worksheet,html,INDEX,WORKSHEET,PAGE};
