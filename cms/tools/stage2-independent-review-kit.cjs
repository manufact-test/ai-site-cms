'use strict';
// Standalone compliance-only Stage2 handoff, created ONLY from the fully
// verified package. No executable CMS, editor, keys, secrets or host access.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const cp=require('node:child_process'),crypto=require('node:crypto');
const {STAGE}=require('./build-internal-package.cjs');
const {createDossier,renderHtml,stable,OUT}=require('./stage2-license-dossier.cjs');
const review=require('./stage2-human-license-review.cjs');
const workbench=require('./stage2-review-workbench.cjs');
const NAME='stage2-independent-dependency-review.zip';
const ALLOWED=['OPEN-FIRST.txt','REVIEW.html','INVENTORY.html','DOSSIER.json',
  'WORKSHEET.json','THIRD_PARTY_NOTICES.txt','EDITOR_THIRD_PARTY_LICENSES.txt'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function check(value,reason){if(!value)throw Error(reason);}
function read(p) {
  const s=fs.lstatSync(p);
  check(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size>10&&s.size<1048576,
    'Unsafe review input');
  return fs.readFileSync(p);
}
function run(cmd,args,opts={}){
  const p=cp.spawnSync(cmd,args,{encoding:null,timeout:30000,maxBuffer:4*1048576,...opts});
  check(!p.error&&p.status===0,'Archive operation refused '+cmd+' '+String(p.stderr||'').slice(0,200));
  return p.stdout;
}
function sources(){
  const d=createDossier(); // verifies complete package and exact dependency locks
  const w=review.buildWorksheet(d);
  check(review.inspectWorksheet(d,w).pending===43,'Review must start pending');
  const notices=read(path.join(STAGE,'private/compliance/THIRD_PARTY_NOTICES.txt'));
  const editorNotices=read(path.join(STAGE,'private/editor/THIRD_PARTY_LICENSES.txt'));
  check(sha(notices)===d.noticeSha256&&sha(editorNotices)===d.editorUpstreamNoticeSha256,
    'NOTICE checksum mismatch');
  const guide=[
    'AI Site CMS / STAGE 2: INDEPENDENT DEPENDENCY REVIEW',
    'NOT A LEGAL APPROVAL, SIGNED RELEASE, PRODUCTION INSTALLER OR STAGE 3 AUTHORIZATION.',
    '',
    '1. Extract these files, open REVIEW.html in Chrome/Edge (entirely offline).',
    '2. Independently inspect 43 upstream licenses, notices, advisories and distribution rights.',
    '3. Record individual evidence URLs, rationale, reviewer identity/reference and date.',
    '4. Export JSON from REVIEW.html. Import it to resume. No autosave or network access.',
    '5. Return only the reviewed worksheet through an agreed secure channel.',
    '',
    'OPERATOR: recheck the returned worksheet against the SAME verified release:',
    'node cms/tools/stage2-human-license-review.cjs --inspect --worksheet=/ABS/PRIVATE/worksheet.json',
    'For a complete review only: separate explicit Ed25519 sign/verify operations',
    'already exist in stage2-human-license-review.cjs. Trust reviewer identity',
    'and public-key fingerprint only via independent out-of-band confirmation.',
    'No keys or credentials may be placed in this ZIP or hosted package.',
    'Signatures attest bytes, NOT qualifications, legal approval, or Stage2 acceptance.',
    'CONTENT-SHA256.json detects accidental corruption only: NOT publisher identity.',
    'Package manifest SHA-256: '+d.packageManifestSha256,
    'Stage2 acceptance FALSE; target Hostinger and any databases untouched.',
    ''
  ].join('\n');
  const files={
    'OPEN-FIRST.txt':Buffer.from(guide,'utf8'),
    'REVIEW.html':Buffer.from(workbench.render(d,w)),
    'INVENTORY.html':Buffer.from(renderHtml(d)),
    'DOSSIER.json':Buffer.from(stable(d)),
    'WORKSHEET.json':Buffer.from(stable(w)),
    'THIRD_PARTY_NOTICES.txt':notices,
    'EDITOR_THIRD_PARTY_LICENSES.txt':editorNotices
  };
  check(Object.keys(files).sort().join(',')===ALLOWED.slice().sort().join(','),
    'Unexpected reviewer handoff contents');
  const metadata={
    format:'ai-site-cms-stage2-legal-transfer-v1',
    packageManifestSha256:d.packageManifestSha256,
    componentCount:43,legalApproved:false,stage2Accepted:false,
    stage3Authorized:false,productionReady:false,
    files:ALLOWED.slice().sort().map(n=>({path:n,bytes:files[n].length,sha256:sha(files[n])}))
  };
  files['CONTENT-SHA256.json']=Buffer.from(stable(metadata));
  check(Object.values(files).every(b=>Buffer.isBuffer(b)&&b.length>10&&b.length<1048576),
    'Oversized or missing review material');
  check(Object.values(files).reduce((n,b)=>n+b.length,0)<2*1048576,
    'Oversized reviewer kit');
  return {files,metadata};
}
function verify(file=path.join(OUT,NAME),expected=sources()){
  const zip=read(file);
  check(zip.subarray(0,2).toString('ascii')==='PK'&&zip.length<3*1048576,
    'Invalid or oversized reviewer ZIP');
  const names=run('unzip',['-Z','-1',file]).toString('utf8').trim().split('\n').sort();
  const target=Object.keys(expected.files).sort();
  check(names.join(',')===target.join(','),'Review ZIP has unknown or missing paths');
  for(const name of names){
    const bytes=run('unzip',['-p',file,name]);
    check(bytes.equals(expected.files[name]),'Wrong reviewer ZIP bytes for '+name);
  }
  const info=expected.metadata;
  check(info.componentCount===43&&info.legalApproved===false&&
    info.stage2Accepted===false&&info.stage3Authorized===false,
    'Illegal acceptance claim');
  return {file,archiveSha256:sha(zip),packageManifestSha256:info.packageManifestSha256,
    files:names.length,legalApproved:false,stage2Accepted:false};
}
function build(){
  const source=sources();
  fs.mkdirSync(OUT,{recursive:true,mode:0o700});
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-legal-review-'));
  const dest=path.join(OUT,NAME);
  try{
    fs.chmodSync(temp,0o700);
    for(const [name,bytes] of Object.entries(source.files)){
      check(/^[A-Z0-9_.-]+$/i.test(name)&&!name.startsWith('.'),'Unlisted path');
      fs.writeFileSync(path.join(temp,name),bytes,{mode:0o600,flag:'wx'});
    }
    if(fs.existsSync(dest)){
      const s=fs.lstatSync(dest);
      check(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1,'Unsafe prior output');
      fs.unlinkSync(dest);
    }
    run('zip',['-X','-q',dest,...Object.keys(source.files).sort()],{cwd:temp});
    const done=verify(dest,source);
    process.stdout.write('STAGE2_LEGAL_HANDOFF '+JSON.stringify(done)+
      ' no executable CMS / no keys / no host access\n');
    return done;
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
if(require.main===module){
  if(process.argv.length!==3||process.argv[2]!=='--build'){
    process.stderr.write('STAGE2_REVIEW_EXPORT_REFUSED\n');process.exitCode=3;
  }else try{build();}catch(e){process.stderr.write('STAGE2_REVIEW_EXPORT_FAILED '+e.message+'\n');process.exitCode=4;}
}
module.exports={NAME,ALLOWED,sources,verify,build};
