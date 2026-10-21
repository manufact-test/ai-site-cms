#!/usr/bin/env node
// Actual original PHP permit/receipt/settlement verifier; ephemeral Node Ed25519 signer.
// Strict physical no-native + pinned source checks for compat/matrix: NOT a fake polyfill test.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const mode=process.argv[2]??'native';
if(!['native','compat','matrix'].includes(mode)||process.argv.length>3){
  console.error('Usage: node chain-backend-regression.mjs [native|compat|matrix]');
  process.exit(2);
}
const gate=path.join(root,'cms/src/Release/LabSettledUpgradeGate.php');
if(!fs.existsSync(gate)){console.error('BLOCKED: original settlement verifier missing');process.exit(3);}
const phpNative=process.env.PHP_BINARY||'php', phpCompat=process.env.PHP_NO_SODIUM_BIN;
const env={...process.env,CI:'true',CMS_ALLOW_PHP_INSTALL_LAB:'1'};
const exec=(bin,args,timeout=15000)=>cp.spawnSync(bin,args,{encoding:'utf8',timeout,
  maxBuffer:1024*1024,env});
function preflight(){
  if(!phpCompat||!path.isAbsolute(phpCompat)||!fs.existsSync(phpCompat))
    throw new Error('BLOCKED: independently obtained physical no-native PHP 8.3 binary required');
  const r=exec(phpCompat,['-n','-r',
    "echo json_encode(['v'=>PHP_VERSION,'size'=>PHP_INT_SIZE,'sapi'=>PHP_SAPI,'ext'=>extension_loaded('sodium'),'fn'=>function_exists('sodium_crypto_sign_verify_detached')],JSON_THROW_ON_ERROR);"]);
  if(r.error||r.status!==0)throw new Error('BLOCKED: physical PHP probe failed');
  let p;try{p=JSON.parse(r.stdout);}catch{throw new Error('BLOCKED: invalid PHP probe output');}
  if(!/^8\.3\.\d+$/.test(p.v)||p.size!==8||p.sapi!=='cli'||p.ext!==false||p.fn!==false)
    throw new Error('BLOCKED: PHP 8.3 64-bit CLI with physically missing ext-sodium required');
  if(!process.env.SODIUM_COMPAT_AUTOLOAD||!fs.existsSync(process.env.SODIUM_COMPAT_AUTOLOAD))
    throw new Error('BLOCKED: vetted 2.5.2 autoloader unavailable');
}
function attest(){
  const r=exec(process.execPath,[path.join(here,'sodium-compat-attest.mjs')],30000);
  if(r.error||r.status!==0)throw new Error('BLOCKED: 2.5.2 source attestation failed: '+(r.stderr||'').slice(-400));
  let p;try{p=JSON.parse(r.stdout);}catch{throw new Error('BLOCKED: invalid source attestation response');}
  if(!p||typeof p!=='object')throw new Error('BLOCKED: empty source attestation');
  return JSON.stringify(p);
}
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const domain={
  permit:Buffer.from('AI-SITE-CMS-STAGE2-PREACTIVATION-V1\0'),
  receipt:Buffer.from('AI-SITE-CMS-STAGE2-OPERATOR-RECEIPT-V1\0'),
  settlement:Buffer.from('AI-SITE-CMS-STAGE2-SETTLEMENT-V1\0')
};
const scratch=path.join(os.tmpdir(),'ai-site-cms-trusted-upgrade-fixture-'+crypto.randomBytes(8).toString('hex'));
let assertions=0;
try {
  fs.mkdirSync(scratch,{mode:0o700});
  const receipts=path.join(scratch,'receipts');
  const settlements=path.join(scratch,'settlements');
  const archive=path.join(scratch,'approved-permit-proofs');
  for(const p of [receipts,settlements,archive,path.join(archive,'permit-000001'),path.join(archive,'permit-000002')])
    fs.mkdirSync(p,{mode:0o700});
  const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
  const der=publicKey.export({format:'der',type:'spki'});
  if(der.length!==44||der.subarray(0,12).toString('hex')!=='302a300506032b6570032100')
    throw new Error('Unexpected signing key SPKI DER');
  const keyfile=path.join(scratch,'operator.pem');
  fs.writeFileSync(keyfile,'-----BEGIN PUBLIC KEY-----\n'+
    der.toString('base64').match(/.{1,64}/g).join('\n')+
    '\n-----END PUBLIC KEY-----\n',{mode:0o600});
  const signed=(type,file,obj,rawOverride=null)=>{
    // Hostile signed bytes may be validly signed yet noncanonical; the PHP
    // verifier must reject them even when the external head is also re-pinned.
    const bytes=rawOverride??Buffer.from(JSON.stringify(obj)+'\n');
    const sig=crypto.sign(null,Buffer.concat([domain[type],bytes]),privateKey);
    fs.writeFileSync(file+'.json',bytes,{mode:0o600});
    fs.writeFileSync(file+'.sig',sig,{mode:0o600});
    return sha(Buffer.concat([domain[type],bytes,sig]));
  };
  const site='backend-research',v1='0.2.0-stage2.1',v2='0.2.1-stage2.1';
  const publisher='a'.repeat(64),pin=sha(der);
  const r1={format:'ai-site-cms-stage2-operator-activation-receipt-v1',
    siteId:site,sequence:1,fromVersion:null,version:v1,minimumVersion:v1,
    publisherFingerprint:publisher,manifestSha256:'b'.repeat(64),
    archiveSha256:'c'.repeat(64),dbCheckpoint:{codeVersion:v1},
    previousReceiptSha256:null,productionReady:false};
  const r2={...r1,sequence:2,fromVersion:v1,version:v2,
    dbCheckpoint:{codeVersion:v2},previousReceiptSha256:null};
  const p1={format:'ai-site-cms-stage2-preactivation-approval-v1',
    siteId:site,nonce:'1'.repeat(32),switchRootSha256:'d'.repeat(64),
    sequence:1,fromVersion:null,version:v1,minimumVersion:v1,
    previousReceiptSha256:null,publisherFingerprint:publisher,
    manifestSha256:r1.manifestSha256,archiveSha256:r1.archiveSha256,
    dbCheckpoint:{codeVersion:v1},productionReady:false};
  const p2={...p1,nonce:'2'.repeat(32),sequence:2,fromVersion:v1,
    version:v2,dbCheckpoint:{codeVersion:v2},previousReceiptSha256:null};
  const p1file=path.join(archive,'permit-000001','permit');
  const p2file=path.join(archive,'permit-000002','permit');
  const r1file=path.join(receipts,'receipt-000001');
  const r2file=path.join(receipts,'receipt-000002');
  const s1file=path.join(settlements,'settlement-000001');
  const s2file=path.join(settlements,'settlement-000002');
  const p1Head=signed('permit',p1file,p1);
  const r1Head=signed('receipt',r1file,r1);
  r2.previousReceiptSha256=r1Head;p2.previousReceiptSha256=r1Head;
  const p2Head=signed('permit',p2file,p2);
  const r2Head=signed('receipt',r2file,r2);
  const s1={format:'ai-site-cms-stage2-settlement-v1',siteId:site,
    sequence:1,version:v1,permitSha256:p1Head,receiptSha256:r1Head,
    previousSettlementSha256:null,productionReady:false};
  const s1Head=signed('settlement',s1file,s1);
  const s2={...s1,sequence:2,version:v2,permitSha256:p2Head,
    receiptSha256:r2Head,previousSettlementSha256:s1Head};
  const s2Head=signed('settlement',s2file,s2);
  const common={settlements,receipts,archive,keyfile,pin,publisher,site,
    receiptHead:r2Head,settlementHead:s2Head};
  const transcript=[];
  const check=(backend,label,expected,changes={})=>{
    const binary=backend==='compat'?phpCompat:phpNative;
    const r=exec(binary,['-n',path.join(here,'chain-backend-verifier.php'),
      JSON.stringify({...common,...changes,backend}),gate],25000);
    if(r.error||r.signal||r.status!==0)
      throw new Error(backend+' '+label+' PHP infrastructure failure: '+
        (r.stderr||r.error?.message||'').slice(-500));
    let p;try{p=JSON.parse(r.stdout);}catch{throw new Error(backend+' '+label+' invalid PHP proof');}
    if(p.status!==expected||p.nativeExt!==(backend==='native'))
      throw new Error(backend+' '+label+' expected '+expected+', received '+JSON.stringify(p));
    if(expected==='ACCEPTED'&&(p.count!==2||p.head!==(changes.settlementHead||s2Head)||
      p.receiptVersion!==v2||p.productionReady!==false))
      throw new Error(backend+' '+label+' false positive acceptance details');
    assertions++;transcript.push({backend,label,status:p.status,globalVerifier:p.globalVerifier});
    return p;
  };
  const edit=(file,newBytes,fn)=>{
    const original=fs.readFileSync(file);
    try{fs.writeFileSync(file,newBytes);return fn();}
    finally{fs.writeFileSync(file,original);}
  };
  const suite=backend=>{
    const accepted=check(backend,'two-generation signed chain','ACCEPTED');
    check(backend,'wrong independent operator pin','REJECTED',{pin:'0'.repeat(64)});
    check(backend,'cross-site replay','REJECTED',{site:'other-site'});
    check(backend,'old settlement highwater','REJECTED',{settlementHead:s1Head});
    check(backend,'old receipt highwater','REJECTED',{receiptHead:r1Head});
    edit(s2file+'.sig',Buffer.alloc(64),()=>
      check(backend,'forged settlement signature','REJECTED'));
    edit(p2file+'.sig',Buffer.alloc(64),()=>
      check(backend,'forged permit signature','REJECTED'));
    edit(r2file+'.sig',Buffer.alloc(64),()=>
      check(backend,'forged receipt signature','REJECTED'));
    edit(s2file+'.json',Buffer.concat([fs.readFileSync(s2file+'.json'),Buffer.from(' ')]),()=>
      check(backend,'settlement bytes altered','REJECTED'));
    const oldFiles=[p2file+'.json',p2file+'.sig',s2file+'.json',s2file+'.sig'];
    const oldBytes=oldFiles.map(x=>fs.readFileSync(x));
    try{
      const newPermitHead=signed('permit',p2file,{...p2,nonce:p1.nonce});
      const newSettlementHead=signed('settlement',s2file,{...s2,permitSha256:newPermitHead});
      check(backend,'correctly re-signed permit nonce replay','REJECTED',
        {settlementHead:newSettlementHead});
    }finally{oldFiles.forEach((x,i)=>fs.writeFileSync(x,oldBytes[i]));}
    // A valid Ed25519 signature does not imply that the content, sequence,
    // lineage or database checkpoint is authorized. These attacks re-sign
    // changed evidence and independently re-pin each latest digest.
    const withBackups=(files,fn)=>{
      const originals=files.map(x=>fs.readFileSync(x));
      try{return fn();}
      finally{files.forEach((x,i)=>fs.writeFileSync(x,originals[i]));}
    };
    const mutateSettlement=(label,alter,noncanonical=false)=>{
      withBackups([s2file+'.json',s2file+'.sig'],()=>{
        const bad=structuredClone(s2);
        alter(bad);
        const bytes=noncanonical?Buffer.from(JSON.stringify(bad)+' \n'):null;
        const newHead=signed('settlement',s2file,bad,bytes);
        check(backend,label,'REJECTED',{settlementHead:newHead});
      });
    };
    const settlementCases=[
      ['validly signed settlement claims production authorization',x=>{x.productionReady=true;}],
      ['validly signed skipped settlement sequence',x=>{x.sequence=3;}],
      ['validly signed settlement changes version',x=>{x.version=v1;}],
      ['validly signed substitute permit head',x=>{x.permitSha256='e'.repeat(64);}],
      ['validly signed substitute receipt head',x=>{x.receiptSha256='e'.repeat(64);}],
      ['validly signed broken settlement history',x=>{x.previousSettlementSha256='e'.repeat(64);}],
      ['validly signed settlement format downgrade',x=>{x.format='unsupported';}],
      ['validly signed settlement crosses site boundary',x=>{x.siteId='other-site';}],
      ['validly signed unapproved settlement field',x=>{x.backdoor=true;}],
      ['validly signed settlement missing readiness flag',x=>{delete x.productionReady;}]
    ];
    for(const [label,alter] of settlementCases)mutateSettlement(label,alter);
    mutateSettlement('validly signed noncanonical settlement JSON',()=>{},true);

    const mutatePermit=(label,alter,noncanonical=false)=>{
      withBackups([p2file+'.json',p2file+'.sig',s2file+'.json',s2file+'.sig'],()=>{
        const bad=structuredClone(p2);
        alter(bad);
        const raw=noncanonical?Buffer.from(JSON.stringify(bad)+' \n'):null;
        const permitHead=signed('permit',p2file,bad,raw);
        const settlementHead=signed('settlement',s2file,{...s2,permitSha256:permitHead});
        check(backend,label,'REJECTED',{settlementHead});
      });
    };
    const permitCases=[
      ['validly signed permit manifest drift',x=>{x.manifestSha256='f'.repeat(64);}],
      ['validly signed permit archive drift',x=>{x.archiveSha256='f'.repeat(64);}],
      ['validly signed permit skip sequence',x=>{x.sequence=3;}],
      ['validly signed permit wrong prior version',x=>{x.fromVersion='0.2.8-stage2.1';}],
      ['validly signed permit wrong minimum version',x=>{x.minimumVersion='0.1.0-stage2.1';}],
      ['validly signed permit wrong publisher',x=>{x.publisherFingerprint='f'.repeat(64);}],
      ['validly signed permit wrong site',x=>{x.siteId='other-site';}],
      ['validly signed permit wrong DB checkpoint',x=>{x.dbCheckpoint={codeVersion:v1};}],
      ['validly signed permit false readiness',x=>{x.productionReady=true;}],
      ['validly signed permit bad receipt ancestry',x=>{x.previousReceiptSha256='f'.repeat(64);}],
      ['validly signed permit wrong target version',x=>{x.version='0.2.8-stage2.1';}],
      ['validly signed permit format downgrade',x=>{x.format='unsupported';}]
    ];
    for(const [label,alter] of permitCases)mutatePermit(label,alter);
    mutatePermit('validly signed noncanonical permit JSON',()=>{},true);

    const mutateReceipt=(label,alter,noncanonical=false)=>{
      withBackups([r2file+'.json',r2file+'.sig',s2file+'.json',s2file+'.sig'],()=>{
        const bad=structuredClone(r2);
        alter(bad);
        const raw=noncanonical?Buffer.from(JSON.stringify(bad)+' \n'):null;
        const receiptHead=signed('receipt',r2file,bad,raw);
        const settlementHead=signed('settlement',s2file,{...s2,receiptSha256:receiptHead});
        check(backend,label,'REJECTED',{receiptHead,settlementHead});
      });
    };
    const receiptCases=[
      ['validly signed receipt manifest drift',x=>{x.manifestSha256='f'.repeat(64);}],
      ['validly signed receipt archive drift',x=>{x.archiveSha256='f'.repeat(64);}],
      ['validly signed receipt wrong version',x=>{x.version='0.2.8-stage2.1';}],
      ['validly signed receipt wrong DB checkpoint',x=>{x.dbCheckpoint={codeVersion:v1};}],
      ['validly signed receipt incorrect previous head',x=>{x.previousReceiptSha256='f'.repeat(64);}],
      ['validly signed receipt incorrect fromVersion',x=>{x.fromVersion='0.2.8-stage2.1';}],
      ['validly signed receipt skipped sequence',x=>{x.sequence=3;}],
      ['validly signed receipt changed publisher',x=>{x.publisherFingerprint='f'.repeat(64);}],
      ['validly signed receipt changed minimum version',x=>{x.minimumVersion='0.1.0-stage2.1';}],
      ['validly signed receipt false readiness',x=>{x.productionReady=true;}],
      ['validly signed receipt wrong site',x=>{x.siteId='other-site';}],
      ['validly signed receipt extraneous field',x=>{x.backdoor=true;}],
      ['validly signed receipt format downgrade',x=>{x.format='unsupported';}]
    ];
    for(const [label,alter] of receiptCases)mutateReceipt(label,alter);
    mutateReceipt('validly signed noncanonical receipt JSON',()=>{},true);

    // Filesystem and archive integrity on actual PHP verifier: no fixture
    // fakes, special runtime flags, or accidental symlinks/hardlinks passing.
    const hide=(file,label)=>{
      const hidden=path.join(scratch,'hidden-'+crypto.randomBytes(8).toString('hex'));
      fs.renameSync(file,hidden);
      try{check(backend,label,'REJECTED');}
      finally{fs.renameSync(hidden,file);}
    };
    hide(s2file+'.sig','missing settlement signature');
    hide(p2file+'.json','missing independent second permit');
    hide(r2file+'.sig','missing activation receipt signature');
    const asSymlink=(file,label)=>{
      const hidden=path.join(scratch,'hidden-'+crypto.randomBytes(8).toString('hex'));
      fs.renameSync(file,hidden);
      try{
        fs.symlinkSync(hidden,file);
        try{check(backend,label,'REJECTED');}
        finally{fs.unlinkSync(file);}
      }finally{fs.renameSync(hidden,file);}
    };
    asSymlink(s2file+'.sig','settlement signature symlink refused');
    asSymlink(p2file+'.json','permit evidence symlink refused');
    asSymlink(r2file+'.sig','receipt evidence symlink refused');
    asSymlink(keyfile,'external operator PEM symlink refused');
    const hardlink=path.join(scratch,'hardlink-'+crypto.randomBytes(8).toString('hex'));
    fs.linkSync(s2file+'.sig',hardlink);
    try{check(backend,'operator settlement hardlink refused','REJECTED');}
    finally{fs.unlinkSync(hardlink);}
    const foreign=path.join(settlements,'foreign.json');
    fs.writeFileSync(foreign,'{}');
    try{check(backend,'unexpected settlement sidecar refused','REJECTED');}
    finally{fs.unlinkSync(foreign);}
    const unmatched=path.join(archive,'permit-000003');
    fs.mkdirSync(unmatched);
    try{check(backend,'unmatched approved permit directory refused','REJECTED');}
    finally{fs.rmdirSync(unmatched);}
    check(backend,'wrong independently pinned publisher refused','REJECTED',
      {publisher:'0'.repeat(64)});

    // Force a second real good-chain acceptance AFTER all malicious changes
    // have been restored, so subsequent assertions cannot hide broken setup.
    check(backend,'restored good chain still accepted','ACCEPTED');
    return accepted;
  };
  if(mode!=='native')preflight();
  const attestationBefore=mode==='native'?null:attest();
  const native=mode==='native'||mode==='matrix'?suite('native'):null;
  const compat=mode==='compat'||mode==='matrix'?suite('compat'):null;
  if(attestationBefore!==null&&attest()!==attestationBefore)
    throw new Error('BLOCKED: sodium_compat source attestation changed after tests');
  if(assertions!==(mode==='matrix'?120:60))
    throw new Error('Proof assertion count incomplete: '+assertions);
  if(mode==='matrix'&&(native.head!==compat.head||native.count!==compat.count))
    throw new Error('Native/compat computed different exact signed chain heads');
  console.log('Chain Ed25519 backend signed-chain regression PASS '+assertions+
    ' assertions; mode='+mode+'; real original PHP verifiers; '+
    (mode==='native'?'NO no-native proof':'physical no-native and source pre/post attested')+
    '; NOT production approval');
  console.log(JSON.stringify({mode,assertions,productionApproved:false,
    nativeFreeProven:mode!=='native',parityCompared:mode==='matrix',transcript}));
}catch(e){
  const m=String(e.message||e);
  console.error(m);process.exitCode=m.startsWith('BLOCKED:')?3:1;
}finally{
  if(fs.existsSync(scratch))fs.rmSync(scratch,{recursive:true,force:true});
}
