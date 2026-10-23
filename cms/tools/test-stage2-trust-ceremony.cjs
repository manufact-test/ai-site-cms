'use strict';
// Single offline three-role journey, exercised through the real CLI.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto'),assert=require('node:assert/strict');
const cp=require('node:child_process');
const {ROLES,prepare,sign,verify,readCanonical}=require('./stage2-trust-ceremony.cjs');
const {keyDigest}=require('./stage2-evidence-bundle.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-role-ceremony-'));
fs.chmodSync(temp,0o700);
let count=0;
const expect=(test,label)=>{assert.ok(test,label);count++;};
const rejects=(work,label)=>{assert.throws(work,undefined,label);count++;};
const files={};
const pins={};
const sourceSha='a'.repeat(40),packageSha='b'.repeat(64);
const bin=path.join(__dirname,'stage2-trust-ceremony.cjs');
function run(args,shouldPass){
  const child=cp.spawnSync(process.execPath,[bin,...args],{encoding:'utf8',timeout:10000,maxBuffer:32768});
  expect(shouldPass?child.status===0:child.status===3,
    'CLI '+(shouldPass?'accept':'reject')+': '+child.stderr);
  return child;
}
function flags(obj){return Object.entries(obj).map(([k,v])=>'--'+k+'='+v);}
try{
  for(const role of ROLES){
    const dir=path.join(temp,role);fs.mkdirSync(dir,{mode:0o700});
    const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
    const privateFile=path.join(dir,'private.pem'),publicFile=path.join(dir,'public.pem');
    fs.writeFileSync(privateFile,privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600,flag:'wx'});
    fs.writeFileSync(publicFile,publicKey.export({type:'spki',format:'pem'}),{mode:0o600,flag:'wx'});
    files[role]={privateFile,publicFile,proof: path.join(dir,'proof.json')};
    pins[role]=keyDigest(publicKey);
  }
  const checkout=path.join(temp,'review');fs.mkdirSync(checkout,{mode:0o700});
  const challengeFile=path.join(checkout,'challenge.json');
  const reportFile=path.join(checkout,'report.json');
  const htmlOutput=path.join(checkout,'report.html');
  const pubFlags=Object.fromEntries(ROLES.map(k=>[k+'-public',files[k].publicFile]));
  const pinFlags=Object.fromEntries(ROLES.map(k=>[k+'-pin',pins[k]]));
  const sourceFlags={'source-sha':sourceSha,'package-sha':packageSha};
  run(['prepare',...flags({...pubFlags,...pinFlags,...sourceFlags,out:challengeFile})],true);
  expect(fs.statSync(challengeFile).mode&0o077 ? false:true,'challenge mode 0600');
  for(const role of ROLES){
    run(['sign',...flags({role,challenge:challengeFile,
      private:files[role].privateFile,public:files[role].publicFile,
      ...pinFlags,...sourceFlags,out:files[role].proof})],true);
  }
  const proofFlags=Object.fromEntries(ROLES.map(k=>[k+'-proof',files[k].proof]));
  run(['verify',...flags({challenge:challengeFile,...proofFlags,
    ...pubFlags,...pinFlags,...sourceFlags,out:reportFile,'html-out':htmlOutput})],true);
  const report=readCanonical(reportFile);
  expect(report.threeDistinctRoleKeys&&report.allThreeDetachedProofsValid,'verified full chain');
  expect(!report.signerIdentityIndependentlyVerified&&!report.keyCustodyAndRevocationIndependentlyApproved
     &&!report.authorizedHostAccess&&!report.stage2Accepted&&!report.stage3Authorized,
     'human gates remain unapproved');
  expect(fs.readFileSync(htmlOutput,'utf8').includes('Cryptographic possession ONLY.'),
    'human review page is present');
  const proofPaths=Object.fromEntries(ROLES.map(k=>[k,files[k].proof]));
  const pubPaths=Object.fromEntries(ROLES.map(k=>[k,files[k].publicFile]));
  const params={challengeFile,proofFiles:proofPaths,publicFiles:pubPaths,pins,
    sourceSha,packageSha,output:path.join(checkout,'rejected-report.json'),
    htmlOutput:path.join(checkout,'rejected-report.html')};
  rejects(()=>verify({...params,now:Date.now()+3600000}),'stale challenge rejected');
  rejects(()=>verify({...params,sourceSha:'f'.repeat(40)}),'wrong source rejected');
  rejects(()=>verify({...params,packageSha:'f'.repeat(64)}),'wrong release rejected');
  rejects(()=>verify({...params,pins:{...pins,owner:pins.publisher}}),'duplicate pins rejected');
  rejects(()=>verify({...params,pins:{...pins,owner:'f'.repeat(64)}}),'out-of-band pin mismatch rejected');
  rejects(()=>verify({...params,proofFiles:{...proofPaths,owner:proofPaths.operator}}),'role swap rejected');
  const original=fs.readFileSync(files.owner.proof);
  const proof=JSON.parse(original);
  proof.signatureBase64=(proof.signatureBase64[0]==='A'?'B':'A')+proof.signatureBase64.slice(1);
  fs.writeFileSync(files.owner.proof,JSON.stringify(proof)+'\n');
  rejects(()=>verify(params),'signature tamper rejected');
  fs.writeFileSync(files.owner.proof,original);
  const oldOwner=fs.readFileSync(files.owner.proof);
  const second=JSON.parse(oldOwner);second.authorizationGranted=true;
  fs.writeFileSync(files.owner.proof,JSON.stringify(second)+'\n');
  rejects(()=>verify(params),'signed proof cannot authorize any action');
  fs.writeFileSync(files.owner.proof,oldOwner);
  const link=path.join(checkout,'symlink-public.pem');
  fs.symlinkSync(files.publisher.publicFile,link);
  rejects(()=>verify({...params,publicFiles:{...pubPaths,publisher:link}}),
    'symlink public key rejected');
  rejects(()=>sign({role:'publisher',challengeFile,privateFile:files.owner.privateFile,
    publicFile:files.publisher.publicFile,pins,sourceSha,packageSha,
    output:path.join(checkout,'bad-sign.json')}),'wrong party key rejected');
  rejects(()=>prepare({publicFiles:pubPaths,pins,sourceSha,packageSha,output:challengeFile}),
    'never overwrite challenge');
  rejects(()=>verify({...params,output:reportFile}),'never overwrite report');
  expect(!fs.existsSync(params.output),'negative checks wrote no misleading report');
  process.stdout.write('Stage2 offline three-role key ceremony: '+count+' checks PASS; '+
    'no real identities, no host access, no Stage2 approval.\n');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
