'use strict';
/*
 * One-off OFFLINE owner write permission for exactly one canonical Hostinger
 * Stage2 INSTALL task. This is not a credential issuer, deployment operation,
 * publisher release signer, owner identity proof or Stage2 acceptance.
 * Caller must separately authenticate the owner/approver and public-key pin.
 * NEVER put private signing keys, task JSON or signed consent into GitHub.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const {readPrivate,safePrivateFile,keyDigest}=require('./stage2-evidence-bundle.cjs');
const TARGET='lightseagreen-woodpecker-264491.hostingersite.com';
const SITE='hostinger-stage2-test';
const DOMAIN=Buffer.from('AI-SITE-CMS-STAGE2-OWNER-WRITE-INSTALL-V1\0');
const POLICY='ai-site-cms-stage2-owner-write-consent-v1';
const PAYLOAD='ai-site-cms-stage2-owner-write-payload-v1';
const expect=(v,msg)=>{if(!v)throw Error(msg);};
const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)
  &&Object.keys(o).join('|')===keys.join('|');
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
/**
 * PHP json_encode() defaults (not JSON_UNESCAPED_SLASHES or UNICODE).
 * Required because the private PHP task and consent readers enforce exact
 * canonical JSON bytes, and the signed task digest binds those bytes.
 */
function phpCanonicalJson(value){
  return JSON.stringify(value).replace(/\//g,'\\/')
    .replace(/[\u007f-\uffff]/g,ch=>'\\u'+ch.charCodeAt(0).toString(16).padStart(4,'0'));
}

const utc=x=>typeof x==='string'&&/^20[2-9][0-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$/.test(x)
  &&!Number.isNaN(Date.parse(x))
  &&new Date(x).toISOString().replace('.000Z','Z')===x;
function writePrivate(file,record){
  safePrivateFile(file,262144,false);
  expect(!fs.existsSync(file),'refuse_overwrite_owner_write_consent');
  const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|
    fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
  try{
    const bytes=Buffer.from(phpCanonicalJson(record));
    expect(fs.writeSync(fd,bytes)===bytes.length,'incomplete_private_consent_write');
    fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
}
function readObject(file,max=4096){
  const bytes=readPrivate(file,max);
  expect(bytes.length>2&&!bytes.includes(0),'unsafe_private_json');
  const data=JSON.parse(bytes.toString('utf8'));
  expect(data&&typeof data==='object'&&!Array.isArray(data)
    &&phpCanonicalJson(data)===bytes.toString('utf8'),'canonical_private_json_required');
  return data;
}
function checkedTask(file) {
  const task=readObject(file);
  validateTask(task);
  return task;
}
function validateTask(task){
  expect(exact(task,['format','package_manifest_sha256','target','site',
    'operation','confirm','db_host','db_name','db_user','db_password']),
    'task_exact_fields_required');
  expect(task.format==='ai-site-cms-stage2-hostinger-task-v1'
    &&task.target===TARGET&&task.site===SITE
    &&task.operation==='install'
    &&task.confirm==='INSTALL_EMPTY_STAGE2_TEST_DB_ONCE'
    &&hex(task.package_manifest_sha256)
    &&['localhost','127.0.0.1'].includes(task.db_host)
    &&/^[A-Za-z0-9_]{3,64}$/.test(task.db_name)
    &&/^[A-Za-z0-9_]{3,64}$/.test(task.db_user)
    &&typeof task.db_password==='string'
    &&task.db_password.length>0&&task.db_password.length<=256,
    'install_task_scope_refused');
}
function payload(task,start,end){
  expect(utc(start)&&utc(end),'noncanonical_utc');
  const from=Date.parse(start),to=Date.parse(end),now=Date.now();
  expect(to>from&&to-from<=3600000&&from<=now&&now<=to
    &&now-from<=3600000,'write_scope_expired_or_long');
  return {
    format:PAYLOAD,target:TARGET,site:SITE,operation:'install',
    packageManifestSha256:task.package_manifest_sha256,
    taskSha256:hash(Buffer.from(phpCanonicalJson(task))),
    notBeforeUtc:start,expiresAtUtc:end,
    productionReady:false,stage2Accepted:false
  };
}
function issue(task,privatePem,start,end){
  validateTask(task);
  const key=crypto.createPrivateKey(privatePem);
  expect(key.asymmetricKeyType==='ed25519','ed25519_private_only');
  const p=payload(task,start,end);
  return {format:POLICY,payload:p,signature:crypto.sign(null,
    Buffer.concat([DOMAIN,Buffer.from(JSON.stringify(p))]),key).toString('base64')};
}
function verify(task,consent,publicPem,pin,at=Date.now()){
  validateTask(task);
  const key=crypto.createPublicKey(publicPem);
  expect(key.asymmetricKeyType==='ed25519'&&hex(pin)
    &&keyDigest(key)===pin,'independently_pinned_ed25519_public_required');
  expect(exact(consent,['format','payload','signature'])
    &&consent.format===POLICY,'owner_consent_shape_refused');
  const p=consent.payload;
  expect(exact(p,['format','target','site','operation',
    'packageManifestSha256','taskSha256','notBeforeUtc','expiresAtUtc',
    'productionReady','stage2Accepted'])
    &&p.format===PAYLOAD&&p.target===TARGET&&p.site===SITE
    &&p.operation==='install'&&p.productionReady===false
    &&p.stage2Accepted===false&&hex(p.taskSha256)
    &&p.taskSha256===hash(Buffer.from(phpCanonicalJson(task)))
    &&p.packageManifestSha256===task.package_manifest_sha256,
    'owner_write_scope_not_exact');
  expect(utc(p.notBeforeUtc)&&utc(p.expiresAtUtc)
    &&Date.parse(p.expiresAtUtc)-Date.parse(p.notBeforeUtc)>0
    &&Date.parse(p.expiresAtUtc)-Date.parse(p.notBeforeUtc)<=3600000
    &&at>=Date.parse(p.notBeforeUtc)&&at<=Date.parse(p.expiresAtUtc),
    'owner_write_scope_time_refused');
  expect(typeof consent.signature==='string'
    &&/^[A-Za-z0-9+/]{86}==$/.test(consent.signature)
    &&Buffer.from(consent.signature,'base64').length===64,
    'invalid_ed25519_signature');
  expect(crypto.verify(null,Buffer.concat([DOMAIN,Buffer.from(JSON.stringify(p))]),
    key,Buffer.from(consent.signature,'base64')),'untrusted_owner_signature');
  return {format:'ai-site-cms-stage2-owner-write-verified-v1',
    exactTaskMatched:true,exactPackageMatched:true,
    signatureValidUnderPinnedKey:true,
    ownerIdentityIndependentlyVerified:false,
    databaseConnected:false,writeInstallAuthorizedByThisVerifier:false,
    stage2Accepted:false,stage3Authorized:false,productionReady:false};
}
function cli(){
  const args=process.argv.slice(2),verb=args.shift();
  expect(['--issue','--verify'].includes(verb),'explicit_issue_or_verify_required');
  const params={};
  for(const entry of args){
    const index=entry.indexOf('=');
    expect(index>2&&entry.startsWith('--'),'named_option_required');
    const name=entry.slice(0,index),value=entry.slice(index+1);
    expect(!Object.hasOwn(params,name)&&value,'duplicate_or_empty_option');
    params[name]=value;
  }
  const issueFields=['--task','--private-key','--output','--not-before','--expires'];
  const verifyFields=['--task','--consent','--public-key','--trusted-spki-sha256'];
  expect(Object.keys(params).sort().join('|')===
    (verb==='--issue'?issueFields:verifyFields).sort().join('|'),'exact_arguments_required');
  for(const key of Object.keys(params))if(key!=='--not-before'&&key!=='--expires'
      &&key!=='--trusted-spki-sha256'){
    expect(path.isAbsolute(params[key]),'absolute_private_path_required');
  }
  const files=(verb==='--issue'
    ?[params['--task'],params['--private-key'],params['--output']]
    :[params['--task'],params['--consent'],params['--public-key']]);
  expect(new Set(files).size===files.length
    &&new Set(files.map(path.dirname)).size===files.length,
    'separate_owner_operator_custody_directories_required');
  const task=checkedTask(params['--task']);
  if(verb==='--issue'){
    expect(process.env.CMS_STAGE2_OWNER_WRITE_SIGNING==='EXPLICIT_OWNER_APPROVAL_NOT_READONLY',
      'owner_write_signing_permission_missing');
    const priv=readPrivate(params['--private-key'],8192);
    const record=issue(task,priv,params['--not-before'],params['--expires']);
    writePrivate(params['--output'],record);
    process.stdout.write('Owner write consent created for ONE exact Stage2 task. Independently authenticate owner and key custody; no DB accessed.\n');
  }else{
    const consent=readObject(params['--consent']);
    const pub=readPrivate(params['--public-key'],8192);
    const status=verify(task,consent,pub,params['--trusted-spki-sha256']);
    process.stdout.write(JSON.stringify(status)+'\n');
  }
}
if(require.main===module)try{cli();}catch{
  process.stderr.write('STAGE2_OWNER_WRITE_CONSENT_REFUSED\n');process.exitCode=3;
}
module.exports={TARGET,SITE,DOMAIN,phpCanonicalJson,readObject,checkedTask,payload,issue,verify,cli};
