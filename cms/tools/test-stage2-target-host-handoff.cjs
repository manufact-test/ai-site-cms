'use strict';
// Deliberately isolated host-handoff rehearsal. No requests, TLS sockets, DB
// connections, production environment or external Hostinger account.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const {STAGE,verify}=require('./build-internal-package.cjs');
let count=0;
const ok=(v,label)=>{assert.ok(v,label);count++;};
const ci={CMS_ENV:'test',CMS_STAGE2_RUNTIME_GATE:'ci-bound',CMS_ALLOW_SQLITE_TEST_ONLY:'1'};
const call=(args,env={})=>spawnSync('php',[STAGE+'/bin/stage2-target-host-handoff.php',...args],
  {encoding:'utf8',timeout:60000,env:{...process.env,...ci,...env}});
const expected=(cmd,code,label)=>ok(cmd.status===code&&cmd.stderr.trim()==='TARGET_HOST_HANDOFF_REFUSED'
  &&cmd.stdout==='',label);
const write=(file,body)=>{
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  fs.writeFileSync(file,body,{mode:0o600});
};
const familyFile=(root,family)=>{
  if(family==='php') write(root+'/public/index.php','<?php echo "visitor";');
  else if(family==='next-ssr') {
    write(root+'/public/favicon.ico','SSR-FIXTURE');
    write(root+'/.next/BUILD_ID','fake-build');
    write(root+'/package.json','{"name":"fixture"}');
  } else {
    write(root+'/public/index.html','independent-'+family);
    if(family==='next-static')write(root+'/public/_next/static/app.js','// static');
  }
};
function main(){
  verify();
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'ai-cms-target-handoff-'));
  const families=['html','php','react-spa','next-static','next-ssr'];
  try{
    const run=(site,family,extra=[],env={})=>call([
      '--check','--cms-root='+STAGE,'--cms-public='+STAGE+'/public',
      '--site-root='+site,'--family='+family,...extra],env);
    expected(call([]),3,'refuse implicit host usage');
    for(const family of families){
      const site=home+'/site-'+family;
      familyFile(site,family);
      const resp=run(site,family);
      ok(resp.status===0&&resp.stderr==='','packaged read-only local check succeeds: '+family);
      const record=JSON.parse(resp.stdout);
      ok(record.cmsFamily===family
        &&record.cmsDocumentRootIsPublic
        &&record.cmsAndSiteRootsSeparated
        &&record.cmsPackageFilesVerified>=20
        &&record.localFilesystemAndPackageCompatible,
        'physical CMS/site separation and package inventory: '+family);
      ok(record.actualTargetHostTestedByProject===false
        &&!record.stage2Accepted&&!record.productionReady
        &&!record.webSapiActuallyExecutedByTool&&!record.networkAttempted
        &&!record.databaseConnected&&!record.filesystemModified,
        'a CLI cannot certify live hosting: '+family);
      ok(!resp.stdout.includes(STAGE)&&!resp.stdout.includes(home),
        'no absolute paths in host checklist output: '+family);
      expected(run(site,family,[],{CMS_ENV:'production',CMS_STAGE2_RUNTIME_GATE:''}),3,
        'production invocation without explicit owner grant refused');
      expected(run(site,family,[],{CMS_ALLOW_SQLITE_TEST_ONLY:'0'}),3,
        'no test gate bypass');
      expected(call(['--check','--cms-root='+STAGE,'--cms-public='+STAGE,
        '--site-root='+site,'--family='+family]),3,
        'wrong CMS docroot refused');
    }
    const site=home+'/site-html';
    const valid={
      format:'ai-site-cms-stage2-operator-http-observations-v1',
      siteFamily:'html',cmsHealth:200,cmsWrite:404,cmsPrivate:404,
      visitorHome:200,httpsPeerChecked:true,webSapiReported:'fpm-fcgi',
      independentSiteWhenCmsUnavailable:true,dbConnectivityReported:true
    };
    const note=home+'/http.json';
    write(note,JSON.stringify(valid));
    const reported=run(site,'html',['--http-observations='+note]);
    ok(reported.status===0,'bounded private observation file recorded');
    const doc=JSON.parse(reported.stdout);
    ok(doc.reportedHttpObservations.allClaimsPresentAndPositive
      &&!doc.reportedHttpObservations.trustedIndependentEvidence
      &&!doc.actualTargetHostTestedByProject,
      'untrusted claimed HTTP success never becomes actual real host proof');
    write(note,JSON.stringify({...valid,cmsHealth:503}));
    const failedClaim=run(site,'html',['--http-observations='+note]);
    ok(failedClaim.status===0 &&
      !JSON.parse(failedClaim.stdout).reportedHttpObservations.allClaimsPresentAndPositive,
      'recorded unsuccessful HTTP observations explicitly remain unmet');
    write(note,JSON.stringify({...valid,token:'secret'}));
    expected(run(site,'html',['--http-observations='+note]),3,
      'refuse unknown potentially sensitive evidence fields');
    write(note,JSON.stringify(valid));
    fs.chmodSync(note,0o644);
    expected(run(site,'html',['--http-observations='+note]),3,
      'world-readable external observation file refused');
    fs.chmodSync(note,0o600);
    const alias=home+'/site-link';
    fs.symlinkSync(site,alias);
    expected(run(alias,'html'),3,'symlinked site root denied');
    const badRoot=home+'/site-html/public';
    expected(run(badRoot,'html'),3,'non-CMS code is not a packaged CMS');
    ok(!fs.existsSync(home+'/private.sqlite'),
      'offline read-only probe never creates a database');
    console.log('Stage2 independent target-host handoff + five-family packaged CLI PASS: '+
      count+' checks; disposable CI only, no host/contact or Stage2 acceptance');
  }finally {
    fs.rmSync(home,{recursive:true,force:true});
  }
}
main();
