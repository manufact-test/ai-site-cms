'use strict';
/* PUBLIC export boundary. Only dependency-license review data; NEVER
 * vendor/CMS sources, release files, secrets, owner/operator evidence or keys. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const kit=require('./stage2-independent-review-kit.cjs');
const {OUT}=require('./stage2-license-dossier.cjs');
const DIR=path.join(path.dirname(OUT),'stage2-public-compliance-only');
const TARGET=path.join(DIR,'stage2-independent-dependency-review.zip');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const deny=[
  /-----BEGIN (?:OPENSSH |RSA |EC |ENCRYPTED |DSA )?PRIVATE KEY-----/i,
  /\b(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{20,}\b/,
  /\bsk-proj-[A-Za-z0-9_-]{20,}\b/,
  /\bCMS_DB_(?:PASSWORD|HOST|NAME|USER)\s*[=:]\s*\S+/i,
  /<\?php/i,/<script\b[^>]*\bsrc\s*=/i,
  /\bBEGIN CERTIFICATE\b/i
];
const requireSafe=(ok,m)=>{if(!ok)throw Error('Public Stage2 export refused: '+m);};
function contentPolicy(files){
  const allow=[...kit.ALLOWED,'CONTENT-SHA256.json'].sort();
  requireSafe(Object.keys(files).sort().join('|')===allow.join('|'),'file allowlist');
  for(const [name,bytes] of Object.entries(files)){
    requireSafe(Buffer.isBuffer(bytes)&&bytes.length>10&&bytes.length<1048576,'invalid bytes');
    requireSafe(!/[\/\\]/.test(name)&&!/\.(?:js|php|pem|key|sql|map|cjs|mjs|env)$/i.test(name),'code or key path');
    const string=bytes.toString('utf8');
    requireSafe(Buffer.from(string).equals(bytes),'binary data refused');
    for(const pat of deny)requireSafe(!pat.test(string),'secret or executable in '+name);
  }
  const d=JSON.parse(files['DOSSIER.json']);
  const w=JSON.parse(files['WORKSHEET.json']);
  const proof=JSON.parse(files['CONTENT-SHA256.json']);
  requireSafe(d.componentCount===43&&!d.independentLegalApproval&&!d.stage2Accepted&&!d.stage3Authorized&&!d.productionReady,
    'dossier state');
  requireSafe(w.componentCount===43&&w.stage2Accepted===false&&w.independentLegalApproval===false
    &&w.stage3Authorized===false&&w.rows.length===43&&w.rows.every(r=>r.disposition==='pending'),
    'worksheet must have 43 pending independent decisions');
  requireSafe(proof.files.length===7&&proof.packageManifestSha256===d.packageManifestSha256&&
    proof.files.every(x=>files[x.path]?.length===x.bytes&&sha(files[x.path])===x.sha256),
    'content integrity');
  return {components:43,files:allow.length,manifest:d.packageManifestSha256,
    stage2Accepted:false,legalApproved:false};
}
function build(){
  const reviewed=kit.build();
  const sources=kit.sources(),proof=contentPolicy(sources.files);
  const b=fs.readFileSync(reviewed.file);
  requireSafe(b.length<2*1048576&&kit.verify(reviewed.file,sources).archiveSha256===sha(b),
    'review archive was altered');
  if(!fs.existsSync(DIR))fs.mkdirSync(DIR,{recursive:true,mode:0o700});
  const info=fs.lstatSync(DIR);
  requireSafe(info.isDirectory()&&!info.isSymbolicLink(),'unsafe publication directory');
  if(fs.existsSync(TARGET)){
    const stat=fs.lstatSync(TARGET);
    requireSafe(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1,'unsafe previous download');
    fs.unlinkSync(TARGET);
  }
  fs.writeFileSync(TARGET,b,{flag:'wx',mode:0o600});
  requireSafe(sha(fs.readFileSync(TARGET))===sha(b),'copy differs');
  const result={...proof,sha256:sha(b),name:path.basename(TARGET),
    noCMSExecutable:true,noSecretsOrPublisherKeys:true,independentReviewPerformed:false};
  if(process.env.GITHUB_STEP_SUMMARY){
    const lines=[
      '### Stage 2 / офлайн-набор для независимой юридической проверки',
      '',
      'Скачайте артефакт ai-site-cms-stage2-independent-review-public-safe.',
      'Распакуйте архив GitHub Actions, затем вложенный stage2-independent-dependency-review.zip.',
      'Откройте REVIEW.html локально в Chrome/Edge. Импортируйте/экспортируйте JSON для работы.',
      '',
      '43 зависимости; восемь разрешённых файлов; никаких ключей, исполняемой CMS или Hostinger.',
      'Manifest SHA-256: '+proof.manifest,
      'ZIP SHA-256: '+result.sha256,
      'Юридическое заключение требуется от независимого эксперта; Stage 2 НЕ принят.',
      ''
    ];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
  }
  process.stdout.write('STAGE2_PUBLIC_COMPLIANCE_SAFE '+JSON.stringify(result)+'\n');
  return result;
}
if(require.main===module){
  if(process.argv.length!==3||process.argv[2]!=='--build'){
    process.stderr.write('STAGE2_PUBLIC_EXPORT_REFUSED\n');process.exitCode=3;
  }else try{build();}catch(e){process.stderr.write(e.message+'\n');process.exitCode=4;}
}
module.exports={contentPolicy,build,DIR,TARGET};
