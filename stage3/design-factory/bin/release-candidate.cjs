#!/usr/bin/env node
'use strict';
// Offline D7 release-candidate runner. One big execution: genuine Node suites,
// optional Chromium and lead PHP parity, source-exact ZIP + SHA256, visual receipt.
// This NEVER approves a production release or modifies files in this repository.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {resolveOutsideRepository}=require('../lib/output-path.cjs');
const {verify:verifyZip}=require('./verify-release-zip.cjs');
const {verify:verifyVisual}=require('../lib/visual-review.cjs');
const {sourceFingerprint}=require('../lib/render-source-fingerprint.cjs');
const ROOT=path.resolve(__dirname,'..'),REPO=path.resolve(ROOT,'../..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function options(args){
 const x={out:null,chromium:null,leadSdk:null,leadPhp:null,evidence:null,review:null};
 const names={'--out':'out','--chromium':'chromium','--lead-sdk':'leadSdk',
  '--lead-php':'leadPhp','--evidence':'evidence','--review':'review'};
 for(let i=0;i<args.length;i++){
  const key=names[args[i]];
  if(!key||x[key]!==null||!args[i+1]||args[i+1].startsWith('--'))
   throw Error('Usage: --out NEW-DIRECTORY [--chromium BIN] [--lead-sdk DIR --lead-php FILE] [--evidence DIR --review FILE]');
  x[key]=args[++i];
 }
 if(!x.out)throw Error('Expected --out NEW-DIRECTORY');
 if(x.review&&!x.evidence)throw Error('--review requires --evidence');
 if(x.leadPhp&&!x.leadSdk)throw Error('--lead-php requires --lead-sdk');
 return x;
}
function shell(command,args,env={},timeout=120000){
 const result=cp.spawnSync(command,args,{cwd:REPO,encoding:'utf8',timeout,
  maxBuffer:12*1024*1024,env:{...process.env,...env}});
 return {exitCode:result.status,signal:result.signal||null,
  stdout:(result.stdout||'').slice(-6000),stderr:(result.stderr||'').slice(-3500),
  error:result.error?String(result.error):null,
  passed:result.status===0&&!result.error};
}
function gitState(){
 const result=shell('git',['rev-parse','HEAD'],{},10000);
 if(!result.passed)return {head:null,branch:null,clean:false,error:'No genuine Git checkout'};
 const branch=shell('git',['symbolic-ref','--short','HEAD'],{},10000);
 const dirty=shell('git',['status','--porcelain','--untracked-files=all','--','stage3/design-factory'],{},10000);
 return {head:result.stdout.trim(),branch:branch.passed?branch.stdout.trim():null,
  clean:dirty.passed&&dirty.stdout.trim()==='',error:dirty.error||null,
  ownerBranch:branch.passed&&branch.stdout.trim()==='feature/stage3-design-factory'};
}
function localAuditStillMatches(audit){
 if(!audit||!Array.isArray(audit.sourceManifest))return false;
 for(const f of audit.sourceManifest){
  if(!f||!/^[a-zA-Z0-9/_ .-]+\.(?:cjs|js|json|md|html|css)$/.test(f.path)||
   f.path.split('/').includes('..'))return false;
  const file=path.join(ROOT,f.path);
  if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||
   sha(fs.readFileSync(file))!==f.sha256||fs.statSync(file).size!==f.bytes)return false;
 }
 return true;
}
function execute(opts){
 const output=resolveOutsideRepository(opts.out,REPO,'D7 release candidate');
 if(fs.existsSync(output))throw Error('Candidate output exists; do not overwrite');
 fs.mkdirSync(output,{recursive:false,mode:0o700});
 const result={
  format:'manufact-design-factory-release-candidate-v1',version:1,
  generatedAt:new Date().toISOString(),repository:'manufact-test/ai-site-cms',
  independentBranch:'feature/stage3-design-factory',
  sourceDirectory:'stage3/design-factory/',
  renderSourceSha256:sourceFingerprint(REPO),
  git:gitState(),node:{status:'not-run'},chromium:{status:'not-run'},
  visualCapture:{status:'not-run'},visualReview:{status:'not-run'},
  leadPhpParity:{status:'not-run'},zip:{status:'not-run'},
  gate:{node:false,chromium:false,fullVisualMatrix:false,phpParity:false,
   sourceExact:false,gitVerified:false,readyForLeadReview:false,
   stage2:'NO-GO',stage3:'UNACCEPTED',mandatoryAccepted:'0/135',
   productionReady:false,integratorMergeApproved:false},
  notes:['This tool does not create GitHub CI evidence or perform deployment.',
   'Review receipt is self-declared and cannot authenticate a human reviewer.',
   'PHP Design Graph markup parity is NOT full PHP visual pixel parity.',
   'Never interpret a package SHA256 as publication permission.']
 };
 const reportPath=path.join(output,'release-candidate.json');
 try{
  const auditFile=path.join(output,'node-audit.json');
  const argv=[path.join(ROOT,'bin/release-audit.cjs'),'--out',auditFile];
  if(opts.chromium)argv.push('--chromium');
  const node=shell(process.execPath,argv,
   opts.chromium?{DF_CHROMIUM_BIN:path.resolve(opts.chromium)}:{DF_CHROMIUM_BIN:''},900000);
  let audit=null;
  if(fs.existsSync(auditFile)){
   try{audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));}catch(e){}
  }
  result.node={status:audit?.nodePassed===true?'pass':'fail',
   suites:audit?.checks?.length||0,sha256:fs.existsSync(auditFile)?sha(fs.readFileSync(auditFile)):null,
   commandExit:node.exitCode,error:node.error||node.stderr.slice(-700)};
  result.gate.node=audit?.nodePassed===true;
  result.chromium={status:opts.chromium?(audit?.browserPassed===true?'pass':'fail'):'not-requested',
   commandExit:node.exitCode,automatedBrowserPassed:audit?.browserPassed===true};
  result.gate.chromium=audit?.browserPassed===true;
  if(opts.chromium&&!opts.evidence){
   const visualDir=path.join(output,'visual-evidence');
   const visual=shell(process.execPath,[path.join(ROOT,'bin/visual-qa.cjs'),'--out',visualDir],
    {DF_CHROMIUM_BIN:path.resolve(opts.chromium)},3000000);
   let evidence=null;
   try{evidence=JSON.parse(fs.readFileSync(path.join(visualDir,'visual-evidence.json'),'utf8'));}catch(e){}
   result.visualCapture={status:visual.passed&&evidence?.captureCompleted?'pass':'fail',
    location:'visual-evidence/',captured:evidence?.imagesProduced??0,
    expected:evidence?.expectedImages??54,sha256:evidence?.evidenceSha256||null,
    error:visual.error||(visual.stderr||'').slice(-700)};
  }else if(opts.evidence){
   result.visualCapture={status:'provided',location:path.resolve(opts.evidence)};
  }else result.visualCapture={status:'not-requested'};
  if(opts.review&&opts.evidence){
   try{
    const review=JSON.parse(fs.readFileSync(path.resolve(opts.review),'utf8'));
    const metadata=JSON.parse(fs.readFileSync(path.join(path.resolve(opts.evidence),'visual-evidence.json'),'utf8'));
    if(metadata.renderSourceSha256!==sourceFingerprint(REPO))throw Error('Old visual evidence does not match this source');
    const receipt=verifyVisual(path.resolve(opts.evidence),review);
    result.visualReview={status:'pass',screenshots:receipt.screenshotsVerified,
     evidenceSha256:receipt.evidenceSha256,receiptSha256:sha(fs.readFileSync(path.resolve(opts.review))),
     reviewer:receipt.reviewer,attestation:receipt.humanAttestationRecorded,
     leadAcceptance:'pending'};
    result.gate.fullVisualMatrix=true;
   }catch(e){result.visualReview={status:'fail',error:String(e.message)};}
  }else result.visualReview={status:'pending-human-review'};
  if(opts.leadSdk&&opts.leadPhp){
   const php=shell(process.execPath,[path.join(ROOT,'tests/lead-design-graph-smoke.cjs')],
    {DF_LEAD_SDK_DIR:path.resolve(opts.leadSdk),DF_LEAD_PHP_FILE:path.resolve(opts.leadPhp)},
    300000);
   const parity=php.passed&&/DESIGN_FACTORY_LEAD_GRAPH PASS:/.test(php.stdout)&&
    /\b6 real PHP parity probes\b/.test(php.stdout)&&!/LEAD_GRAPH_PHP SKIP/.test(php.stdout);
   result.leadPhpParity={status:parity?'pass':'fail',exitCode:php.exitCode,
    summary:php.stdout.slice(-800),error:php.error||php.stderr.slice(-700),
    note:'Six typed Graph markup cases, NOT responsive pixel parity'};
   result.gate.phpParity=parity;
  }else result.leadPhpParity={status:'not-configured'};
  // Packaging is allowed for engineering review even when other acceptance checks fail.
  const zipFile=path.join(output,'design-factory-candidate.zip');
  const build=shell(process.execPath,[path.join(ROOT,'bin/package-release.cjs'),zipFile],{},120000);
  if(build.passed){
   try{
    const meta=JSON.parse(build.stdout),checked=verifyZip(zipFile);
    if(meta.zipSha256!==checked.zipSha256||meta.sourceSha256!==checked.sourceSha256||
     meta.files!==checked.files)throw Error('Builder vs independent ZIP verifier disagrees');
    const stable=localAuditStillMatches(audit);
    result.zip={status:'pass',file:'design-factory-candidate.zip',
     sha256:checked.zipSha256,sourceSha256:checked.sourceSha256,
     bytes:checked.zipBytes,files:checked.files,crcVerified:checked.crcVerified,
     exactSourceBytes:checked.sourceExactMatch,sourceUnchangedSinceNodeAudit:stable};
    result.gate.sourceExact=checked.sourceExactMatch&&checked.crcVerified&&stable;
   }catch(e){result.zip={status:'fail',error:String(e.message)};}
  }else result.zip={status:'fail',error:build.error||build.stderr.slice(-1000)};
  if(result.renderSourceSha256!==sourceFingerprint(REPO)){
   result.gate.fullVisualMatrix=false;
   result.gate.sourceExact=false;
   result.error='Design Factory sources changed during audit';
  }
  result.gate.gitVerified=Boolean(result.git.head&&result.git.ownerBranch&&result.git.clean);
  result.gate.readyForLeadReview=[
   'node','chromium','fullVisualMatrix','phpParity','sourceExact','gitVerified'
  ].every(k=>result.gate[k]===true);
 }catch(e){
  result.error=String(e.message);
 }finally{
  result.gate.productionReady=false;
  result.gate.integratorMergeApproved=false;
  // Keep a failure report instead of losing evidence on the first failed step.
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({format:result.format,git:result.git,
   node:result.node.status,chromium:result.chromium.status,
   visuals:result.visualReview.status,php:result.leadPhpParity.status,
   zip:result.zip.status,zipSha256:result.zip.sha256||null,
   leadReviewReady:result.gate.readyForLeadReview,
   report:reportPath,productionReady:false,error:result.error||null},null,2));
 }
 process.exitCode=result.gate.readyForLeadReview?0:result.gate.node&&result.gate.sourceExact?3:2;
 return result;
}
module.exports=Object.freeze({options,execute,localAuditStillMatches});
if(require.main===module){
 try{execute(options(process.argv.slice(2)));}
 catch(e){console.error('D7 RELEASE CANDIDATE REFUSED: '+e.message);process.exitCode=2;}
}
