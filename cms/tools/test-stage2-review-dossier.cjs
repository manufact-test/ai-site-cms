'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const {STAGE}=require('./build-internal-package.cjs');
const legal=require('./stage2-license-dossier.cjs');
const review=require('./stage2-owner-decision.cjs');
let count=0;
function ok(condition,label){assert.ok(condition,label);count++;}
function reject(fn,label){
  assert.throws(fn,undefined,label);count++;
}
function sha(bytes){return legal.digest(bytes);}
function main(){
  const before=legal.createDossier();
  ok(before.format==='ai-site-cms-stage2-license-review-v1' &&
    before.componentCount===43 &&before.phpRuntimeComponentCount===14 &&
    before.browserRuntimeComponentCount===1&&before.buildAndOptionalComponents===28,
    'actual locked Composer/npm SBOM fully reconciled');
  ok(before.packageFilesChecked>=400 &&
    before.components.filter(c=>c.bundledInDistribution).length===15,
    'only 15 PHP/browser runtime packages in distribution');
  ok(before.components.filter(c=>c.ecosystem==='composer').every(c=>
    c.noticeIncluded&&c.installedLicenseSha256?.length===64),
    'all 14 installed upstream PHP LICENSE copies cross-checked with NOTICE');
  ok(before.components.filter(c=>c.ecosystem==='npm').every(c=>
    c.lockIntegrity?.length>20&&c.resolvedRegistryUrl?.startsWith('https://')),
    'all 29 npm packages have locked integrity and URLs');
  ok(before.components.every(c=>!c.manuallyApproved) &&
    before.independentLegalApproval===false&&before.stage2Accepted===false,
    'metadata never invents legal approval');
  const html=legal.renderHtml(before);
  ok(html.includes('Content-Security-Policy')&&html.includes('default-src &#39;none&#39;')
    &&html.includes('Stage 2 — dependency review')
    &&html.includes('opis/json-schema')&&!html.includes('<script'),
    'human-readable offline, script-free legal inventory');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-cms-stage2-decision-'));
  try{
    const site=path.join(temp,'site');
    fs.mkdirSync(path.join(site,'public'),{recursive:true,mode:0o700});
    fs.writeFileSync(path.join(site,'public/index.html'),'<html><title>Independent site</title></html>');
    const handoff=spawnSync('php',[
      path.join(STAGE,'bin/stage2-target-host-handoff.php'),'--check',
      '--cms-root='+STAGE,'--cms-public='+path.join(STAGE,'public'),
      '--site-root='+site,'--family=html'
    ],{env:{...process.env,CMS_ENV:'test',CMS_STAGE2_RUNTIME_GATE:'ci-bound',
      CMS_ALLOW_SQLITE_TEST_ONLY:'1'},encoding:'utf8'});
    ok(handoff.status===0&&handoff.stderr===''&&handoff.stdout.length>100,
      'real built package and separate visitor site pass offline handoff CLI');
    const offline=JSON.parse(handoff.stdout);
    const attachment=review.assemble(before,{offline});
    ok(attachment.attachedEvidence.offlineLocal.localFilesystemAndPackageCompatible
      &&attachment.remainingCriteria.find(x=>x.id==='target_package_structure')
        .state==='operator_record_supplied_not_independently_authenticated',
      'independently executed handoff remains operator supplied not approved');
    const clean=review.assemble(before);
    ok(clean.remainingCriteria.length===8 &&
      clean.remainingCriteria.every(x=>!['accepted','verified_on_target'].includes(x.state))
      &&clean.stage2Accepted===false&&clean.stage3Authorized===false,
      'owner readiness gate remains blocked without actual target permission');
    const browser=review.render(clean);
    ok(browser.includes('owner acceptance checklist')&&browser.includes('No access')
      &&browser.includes('Content-Security-Policy')&&!browser.includes('<script'),
      'offline owner checklist is accessible and not interactive/deceptive');
    const fakeHttps={
      format:'ai-site-cms-stage2-active-https-observation-v1',
      ciLoopbackOnly:false,actualHttpsRequestsAttempted:true,
      httpsObservationsPass:true,targetHostAccepted:false,
      stage2Accepted:false,productionReady:false,
      results:Object.fromEntries(['cmsHealth','cmsPrivateVendor','cmsPrivateEditor',
        'cmsPublishGet','visitorHome'].map(x=>[x,{
          passed:true,status:x==='cmsHealth'||x==='visitorHome'?200:404,
          tlsPeerVerified:true,peerCertificateSha256:'a'.repeat(64)
        }]))
    };
    const database={state:'ready',reason:'matched',version:2};
    const submitted=review.assemble(before,{offline,https:fakeHttps,database});
    ok(submitted.attachedEvidence.externalHttps.claimedHttpsChecksPass
      &&submitted.attachedEvidence.databaseSchema.reportedState==='ready'
      &&submitted.stage2Accepted===false&&submitted.productionReady===false
      &&submitted.remainingCriteria.find(x=>x.id==='target_web_sapi_and_db')
        .state==='permissioned_target_check_missing',
      'even perfect forged operator reports cannot certify FPM/DB/Stage2');
    ok(submitted.attachedEvidence.externalHttps.liveTargetHostIndependentlyVerified===false
      &&submitted.attachedEvidence.databaseSchema.databaseIdentityIndependentlyProven===false,
      'external report provenance always remains untrusted');

    for(const [change,label] of [
      [{stage2Accepted:true},'forged Stage2 decision'],
      [{format:'unsupported'},'unreviewed HTTPS schema'],
      [{httpsObservationsPass:false},'contradictory HTTP statuses'],
      [{results:{...fakeHttps.results,leakedNewField:{passed:true}}},'unreviewed HTTP test'],
      [{results:{...fakeHttps.results,cmsHealth:{passed:1,status:200,tlsPeerVerified:true}}},'nonboolean check']
    ])reject(()=>review.assemble(before,{https:{...fakeHttps,...change}}),label);
    reject(()=>review.assemble(before,{offline:{...offline,stage2Accepted:true}}),
      'forged local Stage2 acceptance');
    reject(()=>review.assemble(before,{database:{...database,state:'approved'}}),
      'forged database state');
    reject(()=>review.assemble(before,{malicious:{authorization:true}}),
      'unrecognized evidence source');
    reject(()=>review.assemble({...before,independentLegalApproval:true}),
      'manual legal approval cannot be asserted by metadata');

    const savedLegal=legal.build();
    const packet=review.build(); // Publish only real package facts, NEVER synthetic fixture claims.
    const dir=legal.OUT;
    const files=['stage2-license-dossier.json','stage2-license-dossier.html',
      'stage2-owner-decision.json','stage2-owner-decision.html'];
    for(const file of files){
      const stat=fs.statSync(path.join(dir,file));
      ok(stat.size>100&&(stat.mode&0o077)===0,'private durable CI review artifact '+file);
    }
    ok(packet.remainingCriteria.find(x=>x.id==='target_https_and_routing')
      .state==='permissioned_target_check_missing'
      &&Object.values(packet.attachedEvidence).every(x=>x===null),
      'published owner artifact contains NO fabricated CI/host evidence');
    const hashes=files.map(p=>sha(fs.readFileSync(path.join(dir,p))));
    legal.build();review.build();
    ok(files.every((f,i)=>sha(fs.readFileSync(path.join(dir,f)))===hashes[i]),
      'all legal and owner artifacts reproduce byte identically');
    ok(savedLegal.data.packageManifestSha256===packet.packageManifestSha256,
      'legal dossier and owner packet bind the same verified package');
    const pathToEvidence=path.join(temp,'test-https.json');
    fs.writeFileSync(pathToEvidence,JSON.stringify(fakeHttps),{mode:0o600});
    ok(review.readEvidence(pathToEvidence).format===fakeHttps.format,
      'bounded chmod 0600 operator record supported');
    fs.chmodSync(pathToEvidence,0o644);
    reject(()=>review.readEvidence(pathToEvidence),'world readable operator evidence rejected');
    fs.chmodSync(pathToEvidence,0o600);
    fs.symlinkSync(pathToEvidence,path.join(temp,'symlink-record.json'));
    reject(()=>review.readEvidence(path.join(temp,'symlink-record.json')),
      'operator symlink refused');
    ok(!JSON.stringify(packet).includes(temp)&&!JSON.stringify(packet).includes(STAGE),
      'decision report never leaks private source paths');
    const noArgs=spawnSync(process.execPath,[path.join(__dirname,'stage2-owner-decision.cjs')],
      {encoding:'utf8'});
    ok(noArgs.status===3&&noArgs.stdout===''&&
      noArgs.stderr.trim()==='STAGE2_OWNER_REVIEW_REFUSED',
      'unrequested owner review does not touch target hosting');
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
  console.log('Stage2 legal inventory + owner exit evidence: '+count+
    ' checks PASS; 4 reproducible offline artifacts; no real host or legal approval');
}
main();
