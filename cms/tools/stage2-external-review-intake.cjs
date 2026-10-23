'use strict';
/*
 * Independent Stage2 review INTAKE, no CMS installation/build required.
 * Accepts only the publicly published 11-file review ZIP and returned human
 * worksheets. A SHA256 from an INDEPENDENT trusted channel is mandatory:
 * the included CONTENT-SHA256.json is only an untrusted integrity receipt.
 *
 * Offline; read-only; no host, database, key generation, signing, acceptance,
 * or claims of legal authority, verified reviewer identity or Stage3 GO.
 */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const crypto=require('node:crypto');
const legal=require('./stage2-human-license-review.cjs');
const sodium=require('./stage2-sodium-review.cjs');
const {stable,digest}=require('./stage2-license-dossier.cjs');
const FILES=[
  'OPEN-FIRST.txt','REVIEW.html','INVENTORY.html','DOSSIER.json','WORKSHEET.json',
  'THIRD_PARTY_NOTICES.txt','EDITOR_THIRD_PARTY_LICENSES.txt',
  'CRYPTO-DOSSIER.json','CRYPTO-REVIEW.html','CRYPTO-WORKSHEET.json'
];
const META='CONTENT-SHA256.json';
const hex64=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const must=(x,reason)=>{if(!x)throw Error('Stage2 offline review intake refused: '+reason);};
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const match=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)
  &&Object.keys(o).sort().join('|')===keys.slice().sort().join('|');
function regular(file,limit,privateOnly=false){
  must(typeof file==='string'&&path.isAbsolute(file)&&!file.includes('\0')
    &&!file.includes('\\')&&path.normalize(file)===file,'absolute regular path required');
  const st=fs.lstatSync(file);
  must(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size>10
    &&st.size<=limit,'invalid or unsafe local file');
  if(privateOnly)must((st.mode&0o077)===0,'returned review must be private (chmod 600)');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{
    const b=fs.fstatSync(fd);
    must(b.ino===st.ino&&b.dev===st.dev&&b.size===st.size
      &&!b.isSymbolicLink()&&b.nlink===1,'file changed during opening');
    const content=fs.readFileSync(fd),after=fs.fstatSync(fd);
    must(content.length===b.size&&after.size===b.size&&after.mtimeMs===b.mtimeMs,
      'file changed during intake');
    return content;
  }finally{fs.closeSync(fd);}
}
function runUnzip(file,args,max){
  const r=cp.spawnSync('unzip',args,{encoding:null,timeout:10000,maxBuffer:max});
  must(!r.error&&r.status===0&&Buffer.isBuffer(r.stdout),
    'ZIP extraction failed or exceeded limit');
  return r.stdout;
}
function jsonCanonical(bytes,name){
  must(bytes.length<1048576&&!bytes.includes(0),'unsafe JSON '+name);
  const x=JSON.parse(bytes.toString('utf8'));
  must(x&&typeof x==='object'&&!Array.isArray(x)
    &&Buffer.from(stable(x)).equals(bytes),'noncanonical JSON '+name);
  return x;
}
function reviewArchive(zipFile,expectedSha){
  must(hex64(expectedSha),'independently supplied ZIP SHA-256 required');
  const zip=regular(zipFile,3*1048576);
  must(zip.subarray(0,2).toString('ascii')==='PK'
    &&sha(zip)===expectedSha,'ZIP digest differs from independently trusted digest');
  const names=runUnzip(zipFile,['-Z','-1',zipFile],8192).toString('utf8')
    .trim().split('\n');
  must(names.length===FILES.length+1
    &&names.slice().sort().join('|')===[...FILES,META].sort().join('|'),
    'archive path allowlist, count or duplicate mismatch');
  const contents={};
  let total=0;
  for(const name of names){
    const bytes=runUnzip(zipFile,['-p',zipFile,name],1050000);
    total+=bytes.length;
    must(bytes.length>10&&bytes.length<1048576&&total<2097152,
      'oversized review input');
    contents[name]=bytes;
  }
  const meta=jsonCanonical(contents[META],META);
  must(match(meta,['format','packageManifestSha256','componentCount',
      'unshippedCryptoCandidateName','unshippedCryptoCandidateInLock',
      'legalApproved','stage2Accepted','stage3Authorized','productionReady','files'])
    &&meta.format==='ai-site-cms-stage2-legal-transfer-v1'
    &&meta.componentCount===43&&meta.unshippedCryptoCandidateName===sodium.NAME
    &&meta.unshippedCryptoCandidateInLock===false
    &&meta.legalApproved===false&&meta.stage2Accepted===false
    &&meta.stage3Authorized===false&&meta.productionReady===false
    &&hex64(meta.packageManifestSha256)
    &&Array.isArray(meta.files)&&meta.files.length===FILES.length,
    'invalid archived receipt');
  const listed=meta.files.map(x=>x.path).sort();
  must(listed.join('|')===FILES.slice().sort().join('|'),'receipt files differ from archive');
  for(const rec of meta.files){
    must(match(rec,['path','bytes','sha256'])&&Number.isSafeInteger(rec.bytes)
      &&hex64(rec.sha256)&&contents[rec.path]?.length===rec.bytes
      &&sha(contents[rec.path])===rec.sha256,'receipt checksum mismatch');
  }
  const d=jsonCanonical(contents['DOSSIER.json'],'DOSSIER.json');
  const w=jsonCanonical(contents['WORKSHEET.json'],'WORKSHEET.json');
  const cd=jsonCanonical(contents['CRYPTO-DOSSIER.json'],'CRYPTO-DOSSIER.json');
  const cw=jsonCanonical(contents['CRYPTO-WORKSHEET.json'],'CRYPTO-WORKSHEET.json');
  const legalState=legal.inspectWorksheet(d,w);
  const cryptoState=sodium.inspect(cd,cw);
  must(legalState.pending===43&&legalState.approved===0&&legalState.rejected===0,
    'original legal worksheet must start entirely pending');
  must(cryptoState.humanWorksheetDisposition==='pending'
    &&d.packageManifestSha256===meta.packageManifestSha256
    &&cd.lockedPackageManifestSha256===meta.packageManifestSha256
    &&cd.lockedComponentCount===43
    &&cd.candidate.name===sodium.NAME
    &&cd.candidate.version===sodium.VERSION
    &&cd.candidate.sourceReference===sodium.REF
    &&cd.candidate.shippedInCurrentPackage===false
    &&cd.sourceIndependentlyAudited===false
    &&cd.targetHostVerified===false
    &&cd.cryptoApproved===false&&cd.legalApproved===false
    &&cd.productionReady===false&&cd.stage2Accepted===false,
    'crypto candidate must be exact, unshipped and unreviewed');
  must(sha(contents['THIRD_PARTY_NOTICES.txt'])===d.noticeSha256
    &&sha(contents['EDITOR_THIRD_PARTY_LICENSES.txt'])===d.editorUpstreamNoticeSha256,
    'license NOTICE mismatch');
  return {dossier:d,cryptoDossier:cd,zipSha256:expectedSha,
    packageManifestSha256:meta.packageManifestSha256,componentCount:43,
    archiveFiles:11,sourceBytesVerifiedAgainstSuppliedPin:true};
}
function intake({zipFile,zipSha256,legalFile=null,cryptoFile=null},now=Date.now()){
  const archive=reviewArchive(zipFile,zipSha256);
  const legalWorksheet=legalFile?jsonCanonical(regular(legalFile,262144,true),'returned LEGAL') : null;
  const cryptoWorksheet=cryptoFile?jsonCanonical(regular(cryptoFile,65536,true),'returned CRYPTO'):null;
  const legalSummary=legalWorksheet?legal.inspectWorksheet(archive.dossier,legalWorksheet,now):null;
  const cryptoSummary=cryptoWorksheet?sodium.inspect(archive.cryptoDossier,cryptoWorksheet,now):null;
  return {
    format:'ai-site-cms-stage2-external-offline-intake-v1',
    sourceZipSha256:archive.zipSha256,
    lockedPackageManifestSha256:archive.packageManifestSha256,
    lockedComponents:43,
    reviewFiles:11,
    legalWorksheetSubmitted:legalSummary!==null,
    legalCounts:legalSummary?{
      approved:legalSummary.approved,rejected:legalSummary.rejected,pending:legalSummary.pending
    }:null,
    legalWorksheetCompleteForSeparateDecision:legalSummary?.readyForSeparateIndependentLegalDecision===true,
    cryptoWorksheetSubmitted:cryptoSummary!==null,
    cryptoDisposition:cryptoSummary?.humanWorksheetDisposition||null,
    cryptoWorksheetCompleteForSeparateDecision:cryptoSummary?.readyForSeparateIndependentHumanDecision===true,
    sourceIntegrityMatchesSuppliedDigest:true,
    suppliedDigestIndependentlyAuthenticatedBySoftware:false,
    reviewerIdentityIndependentlyVerified:false,
    reviewedUpstreamSecurityIndependentlyApproved:false,
    ownerAuthorizationGranted:false,
    actualTargetHostVerified:false,
    stage2Accepted:false,
    stage3Authorized:false,
    productionReady:false
  };
}
function cli(args=process.argv.slice(2)){
  const accepted=['--zip','--sha256','--legal','--crypto'],values={};
  for(const a of args){
    const i=a.indexOf('='),key=a.slice(0,i);
    must(i>2&&accepted.includes(key)&&!Object.hasOwn(values,key)
      &&a.length>i+1,'unsupported or duplicate CLI parameter');
    values[key]=a.slice(i+1);
  }
  must(Object.hasOwn(values,'--zip')&&Object.hasOwn(values,'--sha256')
    &&Object.keys(values).length<=4,'ZIP and independent SHA-256 required');
  const report=intake({zipFile:values['--zip'],zipSha256:values['--sha256'],
    legalFile:values['--legal']||null,cryptoFile:values['--crypto']||null});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  return report;
}
if(require.main===module)try{cli();}catch(err){
  process.stderr.write('STAGE2_EXTERNAL_REVIEW_INTAKE_REFUSED '+err.message+'\n');
  process.exitCode=3;
}
module.exports={FILES,reviewArchive,intake,cli};
