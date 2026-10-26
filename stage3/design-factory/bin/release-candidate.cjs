#!/usr/bin/env node
'use strict';
// D7 release candidate: run real checkout tests, verify source identity, produce
// a source-exact ZIP, and bind full human-reviewed PNG evidence to current code.
// Never deploy, approve production, mutate CMS state, or edit the repository.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const {resolveOutsideRepository}=require('../lib/output-path.cjs');
const {walk,manifestForDesignFactory,manifestDigest,sameManifest}=require('../lib/source-manifest.cjs');
const {verify:verifyZip}=require('./verify-release-zip.cjs');
const {verify:verifyVisual,checkEvidence}=require('../lib/visual-review.cjs');
const {sourceFingerprint}=require('../lib/render-source-fingerprint.cjs');
const {captureExternalInputs,sameExternalInputs,sameExternalInputContent,
 createExternalInputSnapshot,removeExternalInputSnapshot}=require('../lib/external-input-manifest.cjs');
const ROOT=path.resolve(__dirname,'..'),REPO=path.resolve(ROOT,'../..');
const EXPECTED_SUITES=Object.freeze([
 'smoke.cjs','compositions-smoke.cjs','kits-smoke.cjs','studio-smoke.cjs',
 'bridge-smoke.cjs','package-smoke.cjs','visual-review-smoke.cjs',
 'release-candidate-contract-smoke.cjs'
]);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function expectedAuditChecks(chromium=false){
 return ['build-browser-bundle --check',...EXPECTED_SUITES,...(chromium?['visual-pipe-smoke.cjs']:[]),'source-inventory-stability'];
}
function options(args){
 const x={out:null,chromium:null,leadSdk:null,leadPhp:null,evidence:null,review:null};
 const names={'--out':'out','--chromium':'chromium','--lead-sdk':'leadSdk',
  '--lead-php':'leadPhp','--evidence':'evidence','--review':'review'};
 for(let i=0;i<args.length;i++){
  const key=names[args[i]];
  if(!key||x[key]!==null||!args[i+1]||args[i+1].startsWith('--'))
   throw Error('Usage: --out NEW-DIRECTORY [--chromium BIN] [--lead-sdk DIR [--lead-php FILE]] [--evidence DIR --review FILE]');
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
 if(!result.passed)return {head:null,branch:null,clean:false,ownerBranch:false,error:'No genuine Git checkout'};
 const branch=shell('git',['symbolic-ref','--short','HEAD'],{},10000);
 const dirty=shell('git',['status','--porcelain','--untracked-files=all','--','stage3/design-factory'],{},10000);
 return {head:result.stdout.trim(),branch:branch.passed?branch.stdout.trim():null,
  clean:dirty.passed&&dirty.stdout.trim()==='',error:dirty.error||null,
  ownerBranch:branch.passed&&branch.stdout.trim()==='feature/stage3-design-factory'};
}
function auditReportIsValid(audit,chromiumRequested=false){
 if(!audit||audit.format!=='manufact-design-factory-release-check-v2'||audit.version!==2||
  audit.sourceDirectory!=='stage3/design-factory/'||
  !Array.isArray(audit.checks)||!Array.isArray(audit.sourceManifest)||
  !Number.isInteger(audit.fileCount)||audit.fileCount<20||
  audit.sourceManifest.length!==audit.fileCount||
  audit.browserRequested!==chromiumRequested||typeof audit.nodePassed!=='boolean'||
  typeof audit.browserPassed!=='boolean'||typeof audit.automatedChecksPassed!=='boolean'||
  audit.humanVisualAcceptance!=='pending'||audit.releaseReady!==false||
  !/^[a-f0-9]{64}$/.test(audit.sourceManifestSha256||'')||
  manifestDigest(audit.sourceManifest)!==audit.sourceManifestSha256)return false;
 const checks=audit.checks;
 if(JSON.stringify(checks.map(x=>x&&x.suite))!==JSON.stringify(expectedAuditChecks(chromiumRequested))||
  checks.some(x=>!x||typeof x.passed!=='boolean'||
   (x.suite==='source-inventory-stability'?
    (x.passed?x.error!=null:typeof x.error!=='string'):
    (x.passed?(x.exitCode!==0||x.error!=null):(x.exitCode===0&&x.error==null)))))return false;
 const suite=name=>checks.find(x=>x.suite===name);
 const studio=suite('studio-smoke.cjs'),visual=suite('visual-pipe-smoke.cjs');
 const browserPassed=Boolean(chromiumRequested&&studio?.passed===true&&
  typeof studio.stdout==='string'&&studio.stdout.includes('DESIGN_FACTORY_D5_CHROMIUM PASS')&&
  visual?.passed===true&&typeof visual.stdout==='string'&&
  visual.stdout.includes('DESIGN_FACTORY_D7_VISUAL_PIPE PASS'));
 const nodePassed=checks.every(x=>x.passed);
 if(audit.nodePassed!==nodePassed||audit.browserPassed!==browserPassed||
  audit.automatedChecksPassed!==(nodePassed&&browserPassed))return false;
 const seen=new Set();
 for(const item of audit.sourceManifest){
  if(!item||typeof item.path!=='string'||item.path.startsWith('/')||item.path.includes('\\')||
   /^[a-zA-Z]:/.test(item.path)||item.path.includes('//')||
   !/^[a-zA-Z0-9/_ .-]+\.(?:cjs|js|json|md|html|css)$/.test(item.path)||
   item.path.split('/').includes('..')||!Number.isSafeInteger(item.bytes)||item.bytes<0||
   !/^[a-f0-9]{64}$/.test(item.sha256||'')||seen.has(item.path))return false;
  seen.add(item.path);
 }
 return true;
}
function localAuditStillMatches(audit){
 try{
  if(!auditReportIsValid(audit,Boolean(audit?.browserRequested)))return false;
  return audit.fileCount===walk(ROOT).length&&
   sameManifest(audit.sourceManifest,manifestForDesignFactory(ROOT));
 }catch{return false;}
}
function verifiedEvidence(directory){
 const report=JSON.parse(fs.readFileSync(path.join(path.resolve(directory),'visual-evidence.json'),'utf8'));
 checkEvidence(directory,report);
 if(report.renderSourceSha256!==sourceFingerprint(REPO))
  throw Error('Visual evidence was captured with different renderer/CMS/tooling source bytes');
 return report;
}
function execute(opts){
 const output=resolveOutsideRepository(opts.out,REPO,'D7 release candidate');
 if(fs.existsSync(output))throw Error('Candidate output exists; do not overwrite');
 fs.mkdirSync(output,{recursive:false,mode:0o700});
 const result={
  format:'manufact-design-factory-release-candidate-v2',version:2,
  generatedAt:new Date().toISOString(),repository:'manufact-test/ai-site-cms',
  independentBranch:'feature/stage3-design-factory',sourceDirectory:'stage3/design-factory/',
  renderSourceSha256:null,git:{head:null,branch:null,clean:false,ownerBranch:false},
  node:{status:'not-run'},bundleParity:{status:'not-run'},
  chromium:{status:'not-run'},visualCapture:{status:'not-run'},
  visualReview:{status:'not-run'},leadInputs:{status:'not-configured'},
  leadGraph:{status:'not-configured'},leadPhpParity:{status:'not-configured'},zip:{status:'not-run'},
  gate:{node:false,bundleParity:false,chromium:false,fullVisualMatrix:false,
   leadGraph:false,phpParity:false,sourceExact:false,gitVerified:false,
   readyForLeadReview:false,stage2:'NO-GO',stage3:'UNACCEPTED',
   mandatoryAccepted:'0/135',productionReady:false,integratorMergeApproved:false},
  notes:['This tool does not create GitHub CI evidence or perform deployment.',
   'Review receipt is self-declared and cannot authenticate a human reviewer.',
   'PHP Design Graph markup parity is NOT full PHP visual pixel parity.',
   'A package checksum proves archive identity, not release authorization.']
 };
 const reportPath=path.join(output,'release-candidate.json');
 let leadInputBaseline=null,leadSnapshotRoot=null,leadSnapshotManifestBaseline=null;
 try{
  result.git=gitState();
  result.renderSourceSha256=sourceFingerprint(REPO);
  const auditFile=path.join(output,'node-audit.json');
  const argv=[path.join(ROOT,'bin/release-audit.cjs'),'--out',auditFile];
  if(opts.chromium)argv.push('--chromium');
  const auditCommand=shell(process.execPath,argv,
   opts.chromium?{DF_CHROMIUM_BIN:path.resolve(opts.chromium)}:{DF_CHROMIUM_BIN:''},900000);
  let audit=null;
  if(fs.existsSync(auditFile)){
   try{audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));}catch{}
  }
  const auditValid=auditReportIsValid(audit,Boolean(opts.chromium))&&localAuditStillMatches(audit);
  const failedChecks=Array.isArray(audit?.checks)?audit.checks.filter(x=>x?.passed!==true).map(x=>x?.suite||'unknown').join(', '):'missing/invalid audit report';
  result.node={status:auditValid&&audit?.nodePassed===true?'pass':'fail',
   suites:audit?.checks?.filter(x=>x?.suite!=='build-browser-bundle --check'&&x?.suite!=='source-inventory-stability').length||0,
   checks:audit?.checks?.length||0,sha256:fs.existsSync(auditFile)?sha(fs.readFileSync(auditFile)):null,
   commandExit:auditCommand.exitCode,
   error:auditValid&&audit?.nodePassed===true?null:(auditCommand.error||failedChecks||auditCommand.stderr.slice(-700)||
    'Audit report schema, suite inventory, or source manifest did not validate')};
  result.bundleParity={status:auditValid&&audit?.checks?.[0]?.suite==='build-browser-bundle --check'&&
   audit.checks[0].passed===true?'pass':'fail',
   output:audit?.checks?.[0]?.stdout||'',error:audit?.checks?.[0]?.stderr||''};
  result.gate.node=auditValid&&audit?.nodePassed===true;
  result.gate.bundleParity=result.bundleParity.status==='pass';
  result.chromium={status:opts.chromium?(auditValid&&audit?.browserPassed?'pass':'fail'):'not-requested',
   automatedBrowserPassed:audit?.browserPassed===true,commandExit:auditCommand.exitCode};
  result.gate.chromium=Boolean(opts.chromium&&auditValid&&audit?.browserPassed===true);

  if(opts.chromium&&!opts.evidence){
   const visualDir=path.join(output,'visual-evidence');
   const visual=shell(process.execPath,[path.join(ROOT,'bin/visual-qa.cjs'),'--out',visualDir],
    {DF_CHROMIUM_BIN:path.resolve(opts.chromium)},3000000);
   let evidence=null,evidenceError=null;
   try{evidence=verifiedEvidence(visualDir);}catch(e){evidenceError=String(e.message);}
   result.visualCapture={status:visual.passed&&evidence?'pass':'fail',
    location:'visual-evidence/',captured:evidence?.images?.length??0,
    expected:evidence?.expectedImages??54,sha256:evidence?.evidenceSha256||null,
    renderSourceSha256:evidence?.renderSourceSha256||null,
    error:visual.error||evidenceError||(visual.stderr||'').slice(-700)};
  }else if(opts.evidence){
   try{
    const evidence=verifiedEvidence(path.resolve(opts.evidence));
    result.visualCapture={status:'pass',location:path.resolve(opts.evidence),
     captured:evidence.images.length,expected:evidence.expectedImages,
     sha256:evidence.evidenceSha256,renderSourceSha256:evidence.renderSourceSha256};
   }catch(e){
    result.visualCapture={status:'fail',location:path.resolve(opts.evidence),error:String(e.message)};
   }
  }else result.visualCapture={status:'not-requested'};

  if(opts.review&&opts.evidence){
   try{
    const review=JSON.parse(fs.readFileSync(path.resolve(opts.review),'utf8'));
    const receipt=verifyVisual(path.resolve(opts.evidence),review);
    result.visualReview={status:'pass',screenshots:receipt.screenshotsVerified,
     evidenceSha256:receipt.evidenceSha256,receiptSha256:sha(fs.readFileSync(path.resolve(opts.review))),
     reviewer:receipt.reviewer,reviewedAt:receipt.reviewedAt,
     attestation:receipt.humanAttestationRecorded,leadAcceptance:'pending'};
    result.gate.fullVisualMatrix=true;
   }catch(e){result.visualReview={status:'fail',error:String(e.message)};}
  }else result.visualReview={status:'pending-human-review'};

  if(opts.leadSdk){
   let baseline=null,preflightError=null;
   try{
    baseline=captureExternalInputs(opts.leadSdk,opts.leadPhp);
    leadInputBaseline=baseline;
   }catch(error){preflightError=String(error.message);}
   let snapshot=null,snapshotManifest=null,snapshotError=null;
   if(baseline){
    try{
     leadSnapshotRoot=fs.mkdtempSync(path.join(os.tmpdir(),'df-lead-input-snapshot-'));
     fs.chmodSync(leadSnapshotRoot,0o700);
     snapshot=createExternalInputSnapshot(baseline,leadSnapshotRoot);
     snapshotManifest=captureExternalInputs(snapshot.sdkPath,snapshot.phpFile);
     const originalAfterCopy=captureExternalInputs(opts.leadSdk,opts.leadPhp);
     if(!sameExternalInputContent(baseline,snapshotManifest))
      throw Error('Isolated Lead snapshot content differs from the baseline manifest');
     if(!sameExternalInputs(baseline,originalAfterCopy))
      throw Error('Lead SDK/PHP inputs changed while the isolated snapshot was created');
     leadSnapshotManifestBaseline=snapshotManifest;
    }catch(error){snapshotError=String(error.message);}
   }
   if(!baseline||!snapshot||!snapshotManifest||snapshotError){
    const message='Lead input provenance/snapshot check failed: '+(preflightError||snapshotError||'snapshot unavailable');
    result.leadInputs={status:'invalid',error:preflightError||snapshotError||'snapshot unavailable',
     before:baseline,snapshotSha256:snapshotManifest?.sha256||null};
    result.leadGraph={status:'fail',exitCode:null,summary:'',error:message};
    result.gate.leadGraph=false;
    if(opts.leadPhp){
     result.leadPhpParity={status:'fail',exitCode:null,probes:0,probesAttempted:0,
      summary:'',error:message,note:'Six typed Graph markup cases; NOT responsive pixel parity'};
     result.gate.phpParity=false;
    }
   }else{
    const env={DF_LEAD_SDK_DIR:snapshot.sdkPath};
    if(snapshot.phpFile)env.DF_LEAD_PHP_FILE=snapshot.phpFile;
    else env.DF_LEAD_PHP_FILE='';
    const lead=shell(process.execPath,[path.join(ROOT,'tests/lead-design-graph-smoke.cjs')],env,300000);
    let after=null,snapshotAfter=null,originalError=null,snapshotAfterError=null;
    try{after=captureExternalInputs(opts.leadSdk,opts.leadPhp);}
    catch(error){originalError=String(error.message);}
    try{snapshotAfter=captureExternalInputs(snapshot.sdkPath,snapshot.phpFile);}
    catch(error){snapshotAfterError=String(error.message);}
    const originalStable=Boolean(after&&sameExternalInputs(baseline,after));
    const snapshotStable=Boolean(snapshotAfter&&sameExternalInputs(snapshotManifest,snapshotAfter)&&
     sameExternalInputContent(baseline,snapshotAfter));
    const inputsStable=originalStable&&snapshotStable;
    const unstableMessage=originalError||snapshotAfterError||
     'Lead SDK/PHP originals or isolated snapshot changed while compatibility checks were running';
    result.leadInputs={status:inputsStable?'stable':'changed-during-check',
     before:baseline,after,snapshotSha256:snapshotManifest.sha256,
     snapshotAfterSha256:snapshotAfter?.sha256||null,snapshotAfter,
     snapshotContentMatches:sameExternalInputContent(baseline,snapshotManifest),
     snapshotStable,originalStable,stable:inputsStable,error:inputsStable?null:unstableMessage};
    const graphPass=lead.passed&&/DESIGN_FACTORY_LEAD_GRAPH PASS:/.test(lead.stdout)&&
     !/DESIGN_FACTORY_LEAD_GRAPH SKIP/.test(lead.stdout)&&inputsStable;
    result.leadGraph={status:graphPass?'pass':'fail',exitCode:lead.exitCode,
     summary:lead.stdout.slice(-1100),
     error:graphPass?null:(originalError||snapshotAfterError||(!inputsStable?unstableMessage:
      (lead.error||lead.stderr.slice(-700)||'Lead Design Graph smoke did not pass')))};
    result.gate.leadGraph=graphPass;
    if(opts.leadPhp){
     const probesObserved=/\b6 real PHP parity probes\b/.test(lead.stdout)&&
      !/LEAD_GRAPH_PHP SKIP/.test(lead.stdout)?6:0;
     const phpPass=graphPass&&probesObserved===6;
     result.leadPhpParity={status:phpPass?'pass':'fail',exitCode:lead.exitCode,
      probes:phpPass?6:0,probesAttempted:probesObserved,summary:lead.stdout.slice(-800),
      error:phpPass?null:(originalError||snapshotAfterError||(!inputsStable?unstableMessage:
       (lead.error||lead.stderr.slice(-700)||'Six real PHP parity probes were not confirmed'))),
      note:'Six typed Graph markup cases; NOT responsive pixel parity'};
     result.gate.phpParity=phpPass;
    }else result.leadPhpParity={status:'not-configured',
     note:'Lead JS smoke can run without PHP; six PHP parity probes remain required'};
   }
  }

  // Build an engineering package even when other release gates remain open.
  const zipFile=path.join(output,'design-factory-candidate.zip');
  const build=shell(process.execPath,[path.join(ROOT,'bin/package-release.cjs'),zipFile],{},120000);
  if(build.passed){
   try{
    const meta=JSON.parse(build.stdout),checked=verifyZip(zipFile);
    if(meta.zipSha256!==checked.zipSha256||meta.sourceSha256!==checked.sourceSha256||
     meta.files!==checked.files)throw Error('Builder and independent ZIP verifier disagree');
    const stable=localAuditStillMatches(audit);
    result.zip={status:'pass',file:'design-factory-candidate.zip',
     sha256:checked.zipSha256,sourceSha256:checked.sourceSha256,bytes:checked.zipBytes,
     files:checked.files,crcVerified:checked.crcVerified,
     exactSourceBytes:checked.sourceExactMatch,sourceUnchangedSinceNodeAudit:stable};
    result.gate.sourceExact=checked.sourceExactMatch&&checked.crcVerified&&stable;
   }catch(e){result.zip={status:'fail',error:String(e.message)};}
  }else result.zip={status:'fail',error:build.error||build.stderr.slice(-1000)};

  let finalFingerprint=null;
  try{finalFingerprint=sourceFingerprint(REPO);}
  catch(error){result.error='Final source fingerprint failed: '+error.message;}
  if(!finalFingerprint||result.renderSourceSha256!==finalFingerprint){
   result.error=result.error||'Renderer, CMS manifests, Studio, or verification tooling changed during the candidate run';
   result.gate.node=false;result.gate.bundleParity=false;result.gate.chromium=false;
   result.gate.fullVisualMatrix=false;result.gate.leadGraph=false;
   result.gate.phpParity=false;result.gate.sourceExact=false;
  }
  if(leadInputBaseline){
   let finalLeadInputs=null,finalLeadError=null,finalSnapshotInputs=null,finalSnapshotError=null;
   try{finalLeadInputs=captureExternalInputs(opts.leadSdk,opts.leadPhp);}
   catch(error){finalLeadError=String(error.message);}
   try{if(leadSnapshotManifestBaseline&&leadSnapshotRoot){
    finalSnapshotInputs=captureExternalInputs(path.join(leadSnapshotRoot,'sdk'),
     leadInputBaseline.phpFile?path.join(leadSnapshotRoot,'php',path.basename(leadInputBaseline.phpFile.path)):null);
   }}catch(error){finalSnapshotError=String(error.message);}
   const finalLeadStable=Boolean(finalLeadInputs&&sameExternalInputs(leadInputBaseline,finalLeadInputs));
   const finalSnapshotStable=Boolean(leadSnapshotManifestBaseline&&finalSnapshotInputs&&
    sameExternalInputs(leadSnapshotManifestBaseline,finalSnapshotInputs)&&
    sameExternalInputContent(leadInputBaseline,finalSnapshotInputs));
   result.leadInputs.final=finalLeadInputs;
   result.leadInputs.snapshotFinalSha256=finalSnapshotInputs?.sha256||null;
   result.leadInputs.snapshotFinalStable=leadSnapshotManifestBaseline?finalSnapshotStable:null;
   result.leadInputs.finalSha256=finalLeadInputs?.sha256||null;
   result.leadInputs.stable=Boolean(result.leadInputs.stable===true&&finalLeadStable&&(!leadSnapshotManifestBaseline||finalSnapshotStable));
   if(!finalLeadStable||!result.leadInputs.stable||(leadSnapshotManifestBaseline&&!finalSnapshotStable)){
    const message=finalLeadError||finalSnapshotError||result.leadInputs.error||'Lead SDK/PHP inputs changed between provenance snapshots';
    result.leadInputs.status=result.leadInputs.status==='invalid'?'invalid':'changed-during-candidate';
    result.leadInputs.error=message;
    result.leadGraph.status='fail';
    result.leadGraph.error=message;
    result.gate.leadGraph=false;
    if(opts.leadPhp){
     result.leadPhpParity.status='fail';
     result.leadPhpParity.probes=0;
     result.leadPhpParity.error=message;
     result.gate.phpParity=false;
    }
   }
  }
  const gitAfter=gitState();
  result.git.after=gitAfter;
  result.git.stable=Boolean(result.git.head&&result.git.head===gitAfter.head&&
   result.git.branch===gitAfter.branch&&result.git.clean&&gitAfter.clean);
  result.gate.gitVerified=Boolean(result.git.stable&&result.git.ownerBranch&&gitAfter.ownerBranch);
  result.gate.readyForLeadReview=[
   'node','bundleParity','chromium','fullVisualMatrix','phpParity','sourceExact','gitVerified'
  ].every(k=>result.gate[k]===true);
 }catch(e){
  result.error=String(e.message);
 }finally{
  if(leadSnapshotRoot){
   try{removeExternalInputSnapshot(leadSnapshotRoot);leadSnapshotRoot=null;}
   catch(error){
    const message='Lead input snapshot cleanup failed: '+String(error.message);
    result.leadInputs.cleanupError=String(error.message);
    result.leadInputs.status='cleanup-failed';
    result.leadInputs.stable=false;
    result.leadGraph.status='fail';result.leadGraph.error=message;
    if(opts.leadPhp){result.leadPhpParity.status='fail';result.leadPhpParity.probes=0;
     result.leadPhpParity.error=message;}
    result.gate.leadGraph=false;result.gate.phpParity=false;
   }
  }
  result.gate.productionReady=false;
  result.gate.integratorMergeApproved=false;
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({format:result.format,git:result.git,
   node:result.node.status,bundleParity:result.bundleParity.status,
   chromium:result.chromium.status,visualCapture:result.visualCapture.status,
   visuals:result.visualReview.status,leadInputs:result.leadInputs.status,
   leadGraph:result.leadGraph.status,php:result.leadPhpParity.status,zip:result.zip.status,
   zipSha256:result.zip.sha256||null,leadReviewReady:result.gate.readyForLeadReview,
   report:reportPath,productionReady:false,error:result.error||null},null,2));
 }
 process.exitCode=result.gate.readyForLeadReview?0:result.gate.node&&result.gate.sourceExact?3:2;
 return result;
}
module.exports=Object.freeze({options,execute,expectedAuditChecks,auditReportIsValid,localAuditStillMatches});
if(require.main===module){
 try{execute(options(process.argv.slice(2)));}
 catch(e){console.error('D7 RELEASE CANDIDATE REFUSED: '+e.message);process.exitCode=2;}
}
