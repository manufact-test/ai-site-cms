'use strict';
// Stage2 independent human review of an UNLOCKED, UNBUNDLED Sodium-free
// candidate. Not part of the 43 current deps. Never grants legal/crypto GO.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createDossier,stable,digest}=require('./stage2-license-dossier.cjs');
const {readPrivate}=require('./stage2-evidence-bundle.cjs');
const FORMAT='ai-site-cms-stage2-sodium-candidate-dossier-v1';
const NAME='paragonie/sodium_compat',VERSION='v2.5.2';
const REF='3246b36803c177847e677862fedeb7f937869adb';
const CHECKS=['upstreamSourceVerified','licenseAndNoticeReviewed',
  'securityAndAdvisoriesReviewed','noSodiumTargetPlanReviewed'];
const FLAGS=['legalApproved','cryptoApproved','productionReady','stage2Accepted','stage3Authorized'];
const assert=(v,msg)=>{if(!v)throw Error(msg);};
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)
  &&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
function assertParity(){
  // Require the only approved *research candidate* is the one actually used
  // by the verifier and CI fixture. Source bytes are not independently audited.
  const back=fs.readFileSync(path.join(__dirname,'../src/Release/Ed25519Backend.php'),'utf8');
  const test=fs.readFileSync(path.join(__dirname,'test-stage2-genuine-sodium-free.cjs'),'utf8');
  const lock=JSON.parse(fs.readFileSync(path.join(__dirname,'../composer.lock'),'utf8'));
  for(const s of ["private const COMPAT_PACKAGE = '"+NAME+"';",
    "private const COMPAT_VERSION = '"+VERSION+"';",
    "private const COMPAT_REFERENCE = '"+REF+"';"])assert(back.includes(s),'backend_candidate_drift');
  for(const s of ["const PACKAGE='"+NAME+"';","const RELEASE='"+VERSION+"';",
    "const REF='"+REF+"';"])assert(test.includes(s),'no_sodium_fixture_drift');
  assert(Array.isArray(lock.packages)&&lock.packages.length===14
    &&!lock.packages.some(p=>p.name===NAME),'candidate_must_not_be_shipped_unapproved');
}
function dossier(locked=createDossier()){
  assertParity();
  assert(locked.componentCount===43&&locked.independentLegalApproval===false
    &&locked.stage2Accepted===false&&/^[a-f0-9]{64}$/.test(locked.packageManifestSha256),
    'exact_verified_locked_release_required');
  return {format:FORMAT,scope:'separate-human-review-unshipped-crypto-candidate',
    lockedPackageManifestSha256:locked.packageManifestSha256,lockedComponentCount:43,
    candidate:{name:NAME,version:VERSION,sourceRepository:'https://github.com/paragonie/sodium_compat',
      sourceReference:REF,declaredLicense:'ISC',phpConstraint:'^8.1',
      target:'PHP 8.3 64-bit LiteSpeed LSAPI without native Sodium',
      shippedInCurrentPackage:false},
    requiredEvidence:[
      'Independently retrieve exact upstream source at pinned commit and review actual bytes',
      'Review original ISC license, NOTICE and any legal obligations for commercial distribution',
      'Independently assess implementation security, advisories and key/signature verification behavior',
      'Examine target-compatible no-Sodium PHP 8.3 LSAPI verification and safe fallback procedure',
      'Confirm auditor qualification, identity and trusted public key out of band before any human approval'],
    sourceIndependentlyAudited:false,targetHostVerified:false,
    legalApproved:false,cryptoApproved:false,productionReady:false,
    stage2Accepted:false,stage3Authorized:false};
}
function worksheet(d=dossier()){
  return {format:'ai-site-cms-stage2-sodium-review-worksheet-v1',
    scope:'human-review-input-no-authorization',dossierSha256:digest(stable(d)),
    lockedPackageManifestSha256:d.lockedPackageManifestSha256,
    name:d.candidate.name,version:d.candidate.version,reference:d.candidate.sourceReference,
    disposition:'pending',upstreamSourceVerified:false,licenseAndNoticeReviewed:false,
    securityAndAdvisoriesReviewed:false,noSodiumTargetPlanReviewed:false,
    evidenceUrls:[],reviewerReference:null,reviewedOn:null,notes:'',
    legalApproved:false,cryptoApproved:false,productionReady:false,
    stage2Accepted:false,stage3Authorized:false};
}
function validUrl(s){
  try {
    if(typeof s!=='string'||s.length>500||s.includes('\\'))return false;
    const u=new URL(s);
    return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.search
      &&u.hostname&&u.hostname!=='localhost'
      &&!/\.(local|internal|invalid|example)$/.test(u.hostname);
  }catch{return false;}
}
function inspect(d,w,now=Date.now()){
  const baseline=worksheet(d);
  assert(exact(w,Object.keys(baseline)),'candidate_review_unknown_fields');
  for(const k of ['format','scope','dossierSha256','lockedPackageManifestSha256',
    'name','version','reference',...FLAGS])
    assert(w[k]===baseline[k],'candidate_source_or_authorization_mutation_'+k);
  assert(['pending','reviewed','rejected','needs-changes'].includes(w.disposition),
    'invalid_candidate_disposition');
  assert(CHECKS.every(k=>typeof w[k]==='boolean'),'candidate_check_not_boolean');
  assert(Array.isArray(w.evidenceUrls)&&w.evidenceUrls.length<=12
    &&w.evidenceUrls.every(validUrl),'unsafe_candidate_evidence');
  assert(typeof w.notes==='string'&&w.notes.length<=4000&&!w.notes.includes('\0'),
    'unsafe_candidate_notes');
  assert(w.reviewerReference===null||
    typeof w.reviewerReference==='string'
    &&/^[A-Za-z0-9][A-Za-z0-9_.:@/-]{2,119}$/.test(w.reviewerReference),
    'invalid_candidate_reviewer_reference');
  if(w.disposition==='pending')assert(w.reviewedOn===null,'pending_cannot_have_review_date');
  else {
    assert(typeof w.reviewedOn==='string'&&/^\d{4}-\d\d-\d\d$/.test(w.reviewedOn),
      'review_date_required');
    const date=Date.parse(w.reviewedOn+'T00:00:00.000Z');
    assert(Number.isFinite(date)&&new Date(date).toISOString().slice(0,10)===w.reviewedOn
      &&date<=now,'invalid_or_future_review_date');
    assert(w.reviewerReference!==null&&w.evidenceUrls.length>=2
      &&w.notes.trim().length>=20,'independent_review_evidence_required');
  }
  if(w.disposition==='reviewed')assert(CHECKS.every(k=>w[k]===true),
    'all_candidate_checks_required');
  return {format:'ai-site-cms-stage2-sodium-review-inspection-v1',
    candidate:NAME+'@'+VERSION,lockedPackageManifestSha256:d.lockedPackageManifestSha256,
    humanWorksheetDisposition:w.disposition,
    readyForSeparateIndependentHumanDecision:w.disposition==='reviewed',
    reviewerIdentityVerified:false,cryptoApproved:false,legalApproved:false,
    targetHostVerified:false,productionReady:false,stage2Accepted:false,
    stage3Authorized:false,lockedDependenciesRemain43:true};
}
function browserUI(){
  'use strict';
  const initial=JSON.parse(document.getElementById('base').textContent);
  let model=JSON.parse(JSON.stringify(initial));
  const el=id=>document.getElementById(id);
  const checks=['upstreamSourceVerified','licenseAndNoticeReviewed',
    'securityAndAdvisoriesReviewed','noSodiumTargetPlanReviewed'];
  const fields=['disposition','reviewerReference','reviewedOn','evidenceUrls','notes'];
  function show(){
    for(const k of checks)el(k).checked=model[k];
    for(const k of fields)el(k).value=k==='evidenceUrls'?model[k].join('\n'):model[k]||'';
  }
  function collect(){
    model=JSON.parse(JSON.stringify(initial));
    for(const k of checks)model[k]=el(k).checked;
    for(const k of fields){
      const v=el(k).value.trim();
      model[k]=k==='evidenceUrls'?v.split('\n').map(x=>x.trim()).filter(Boolean):
        (['reviewerReference','reviewedOn'].includes(k)&&!v?null:v);
    }
  }
  el('download').addEventListener('click',()=>{
    collect();
    const url=URL.createObjectURL(new Blob([JSON.stringify(model,null,2)+'\n'],
      {type:'application/json'}));
    const a=document.createElement('a');a.href=url;
    a.download='sodium-candidate-review.json';a.click();URL.revokeObjectURL(url);
    el('message').textContent='Downloaded. This does not grant approval; operator must inspect the JSON independently.';
  });
  el('reset').addEventListener('click',()=>{
    model=JSON.parse(JSON.stringify(initial));show();el('message').textContent='Review reset.';
  });
  el('import').addEventListener('change',async event=>{
    try{
      const file=event.target.files[0];if(!file)return;
      if(file.size>65536)throw Error('too large');
      const data=JSON.parse(await file.text());
      if(!data||typeof data!=='object'||Array.isArray(data)
        ||Object.keys(data).sort().join('|')!==Object.keys(initial).sort().join('|'))
        throw Error('invalid worksheet schema');
      const fixed=['format','scope','dossierSha256','lockedPackageManifestSha256',
        'name','version','reference','legalApproved','cryptoApproved',
        'productionReady','stage2Accepted','stage3Authorized'];
      if(fixed.some(k=>data[k]!==initial[k])
        ||checks.some(k=>typeof data[k]!=='boolean')
        ||!Array.isArray(data.evidenceUrls))throw Error('wrong candidate or fake authorization');
      model=data;show();el('message').textContent='Imported; validate with operator CLI before use.';
    }catch(e){el('message').textContent='Import refused: '+e.message;}
    event.target.value='';
  });
  show();
}
function render(d,w){
  const js='('+browserUI.toString()+')();';
  const scriptHash=crypto.createHash('sha256').update(js).digest('base64');
  const h=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',
    '"':'&quot;',"'":'&#39;'}[c]));
  const checks=[
    ['upstreamSourceVerified','Independently verified original commit and source bytes'],
    ['licenseAndNoticeReviewed','Reviewed ISC license, notices and distribution rights'],
    ['securityAndAdvisoriesReviewed','Reviewed Ed25519 implementation and advisories'],
    ['noSodiumTargetPlanReviewed','Reviewed target-compatible no-Sodium PHP 8.3 LSAPI plan']
  ];
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'+
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'sha256-'+scriptHash+
    '\'; style-src \'unsafe-inline\'; connect-src \'none\'; base-uri \'none\'; form-action \'none\'">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Stage 2 — independent Sodium-free candidate review</title>'+
    '<style>body{font:15px/1.5 system-ui,sans-serif;background:#f4f6fa;color:#18243c;margin:0;padding:25px}main{max-width:950px;margin:auto;background:white;padding:30px;border:1px solid #d9dfeb;border-radius:16px}h1{font-size:25px}.warn{padding:15px;background:#fff3d5;border-radius:10px}label{display:block;margin:14px 0;font-weight:500}select,input,textarea{font:inherit;padding:10px;border:1px solid #bcc9de;border-radius:8px}input:not([type]),textarea{display:block;width:100%;box-sizing:border-box}textarea{min-height:90px}button{background:#164baf;color:white;border:0;border-radius:8px;padding:11px 16px;cursor:pointer}code{overflow-wrap:anywhere}p{max-width:80ch}</style></head><body><main>'+
    '<h1>Independent review of the unshipped Ed25519 candidate</h1>'+
    '<p class="warn"><strong>Not part of the current 43 locked components.</strong> This worksheet is not permission to install, distribute or use the candidate on Hostinger. Key ownership, real source security and live LSAPI need independent verification.</p>'+
    '<p><strong>'+h(d.candidate.name)+' '+h(d.candidate.version)+'</strong>, declared '+h(d.candidate.declaredLicense)+
    ', source commit <code>'+h(d.candidate.sourceReference)+'</code>.</p>'+
    '<p>Existing 43-component manifest: <code>'+h(d.lockedPackageManifestSha256)+'</code></p>'+
    '<h2>Expert checks</h2>'+
    checks.map(([id,label])=>'<label><input type="checkbox" id="'+id+'"> '+h(label)+'</label>').join('')+
    '<label>Disposition <select id="disposition"><option value="pending">Pending</option><option value="reviewed">Reviewed — needs separate human decision</option><option value="rejected">Rejected</option><option value="needs-changes">Needs changes</option></select></label>'+
    '<label>Reviewer reference <input id="reviewerReference" placeholder="Independently authenticated reviewer"></label>'+
    '<label>Review date YYYY-MM-DD <input id="reviewedOn" placeholder="YYYY-MM-DD"></label>'+
    '<label>HTTPS evidence URLs (one per line) <textarea id="evidenceUrls"></textarea></label>'+
    '<label>Reasoned findings <textarea id="notes"></textarea></label>'+
    '<button id="download">Download JSON review</button> <button id="reset">Reset</button>'+
    '<label>Import saved JSON <input id="import" type="file" accept=".json,application/json"></label>'+
    '<p role="status" aria-live="polite" id="message"></p>'+
    '<p>Validate returned JSON privately: <code>node cms/tools/stage2-sodium-review.cjs --inspect=/ABS/PRIVATE/review.json</code>. A completed form does not grant Stage 2 approval.</p>'+
    '<script type="application/json" id="base">'+JSON.stringify(w).replace(/</g,'\\u003c')+'</script>'+
    '<script>'+js+'</script></main></body></html>\n';
}
function cli(argv=process.argv.slice(2)){
  assert(argv.length===1&&argv[0].startsWith('--inspect=/'),'private_review_file_required');
  const bytes=readPrivate(argv[0].slice('--inspect='.length),65536);
  const w=JSON.parse(bytes.toString('utf8'));
  assert(bytes.equals(Buffer.from(stable(w))),'canonical_review_bytes_required');
  process.stdout.write(stable(inspect(dossier(),w)));
}
if(require.main===module){try{cli();}catch(e){
  process.stderr.write('STAGE2_SODIUM_REVIEW_REFUSED '+e.message+'\n');process.exitCode=3;
}}
module.exports={FORMAT,NAME,VERSION,REF,CHECKS,assertParity,dossier,worksheet,inspect,render};
