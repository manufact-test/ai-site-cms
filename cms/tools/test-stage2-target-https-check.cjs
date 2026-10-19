'use strict';
// Disposable, process-real HTTPS rehearsals for the OPERATOR-SIDE probe only.
// All listeners bind 127.0.0.1. No target hosting, DNS, external HTTP or DB I/O.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const https=require('node:https');
const {spawn,execFileSync}=require('node:child_process');
const SCRIPT=path.join(__dirname,'stage2-target-https-check.cjs');
const scope=require('./stage2-operator-scope.cjs');
const {publicIPv4,originOf}=require('./stage2-target-https-check.cjs');
const CI={...process.env,CMS_ENV:'test',CMS_STAGE2_RUNTIME_GATE:'ci-bound',
  CMS_ALLOW_STAGE2_NETWORK_FIXTURE:'1'};
let checks=0;
function ok(condition,description){assert.ok(condition,description);checks++;}
function start(key,cert,type,mode,port=0){
  const log=[];
  const server=https.createServer({key,cert},(req,res)=>{
    log.push({path:req.url,method:req.method});
    if(type==='cms') {
      if(req.url==='/api/health'){
        res.writeHead(200,{
          'Content-Type':'application/json; charset=utf-8',
          'Cache-Control':mode.value==='bad-cache'?'public, max-age=86400':'no-store',
          'X-Content-Type-Options':'nosniff'
        });
        res.end(JSON.stringify({status:mode.value==='wrong-health'?'unavailable':'ok'}));
      }else if(req.url==='/vendor/autoload.php'&&mode.value==='leak-vendor'){
        res.writeHead(200,{'Content-Type':'text/plain'});res.end('private file');
      }else if(req.url==='/private/editor/editor.js'&&mode.value==='leak-editor'){
        res.writeHead(200,{'Content-Type':'application/javascript'});res.end('admin');
      }else if(req.url==='/api/publish'&&mode.value==='exposed-publish-get'){
        res.writeHead(200);res.end('wrong');
      }else{
        res.writeHead(404);res.end('not found');
      }
    }else{
      if(mode.value==='redirect'){
        res.writeHead(302,{Location:'https://localhost:1/unrelated'});res.end();
      }else if(mode.value==='missing'){
        res.writeHead(404);res.end('missing');
      }else if(mode.value==='huge'){
        res.writeHead(200,{'Content-Type':'text/html'});res.end('X'.repeat(70000));
      }else{
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
        res.end('<!doctype html><title>independent '+type+'</title>');
      }
    }
  });
  return new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(port,'127.0.0.1',()=>resolve({
      server,log,port:server.address().port,mode,
      stop:()=>new Promise((done,fail)=>server.close(e=>e?fail(e):done()))
    }));
  });
}
function run(args,env=CI){
  return new Promise((resolve,reject)=>{
    const proc=spawn(process.execPath,[SCRIPT,...args],{env});
    let stdout='',stderr='';
    proc.stdout.on('data',c=>stdout+=c);
    proc.stderr.on('data',c=>stderr+=c);
    proc.on('error',reject);
    proc.on('close',code=>resolve({code,stdout,stderr,
      record:(()=>{try{return JSON.parse(stdout)}catch{return null}})()}));
  });
}
async function main(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ai-cms-stage2-https-'));
  const keyFile=path.join(temp,'key.pem'),certFile=path.join(temp,'ca.pem');
  const servers=[];
  try{
    const yes=['8.8.8.8','1.1.1.1','93.184.216.34','192.31.196.1'];
    const no=['0.0.0.0','0.255.1.1','10.1.2.3','100.64.0.1',
      '100.127.255.255','127.8.8.8','169.254.169.254','172.16.1.2',
      '172.31.255.254','192.0.0.11','192.0.2.7','192.88.99.1',
      '192.168.100.1','198.18.1.1','198.19.255.255',
      '198.51.100.20','203.0.113.99','224.0.0.1',
      '240.1.2.3','255.255.255.255','::1','2001:db8::1','not-an-ip'];
    for(const ip of yes)ok(publicIPv4(ip),'routable IPv4 allowed: '+ip);
    for(const ip of no)ok(!publicIPv4(ip),'IANA private/special-purpose IPv4 denied: '+ip);
    assert.throws(()=>originOf('https://127.0.0.1',false));checks++;
    assert.throws(()=>originOf('http://safe.example.org',false));checks++;
    assert.throws(()=>originOf('https://cms.example.org:8443',false));checks++;
    const grantDir=path.join(temp,'scopes');
    fs.mkdirSync(grantDir,{mode:0o700});
    const grantPath=path.join(grantDir,'owner-scope.json');
    const utc=ms=>new Date(ms).toISOString().replace('.000Z','Z');
    const t=Date.now();
    const record={format:scope.FORMAT,repository:'manufact-test/ai-site-cms',
      scope:'target-readonly-https-get',cmsOrigin:'https://cms.acme-hosting.com',
      siteOrigin:'https://site.acme-hosting.com',reference:'review-scope-20261019',
      issuedAt:utc(t-300000),expiresAt:utc(t+1800000)};
    const origins={cmsOrigin:record.cmsOrigin,siteOrigin:record.siteOrigin};
    fs.writeFileSync(grantPath,JSON.stringify(record),{mode:0o600});
    const normalized=scope.readScope(grantPath,origins,t);
    ok(normalized.operatorScopeRecordSha256.length===64 &&
      normalized.originPairSha256.length===64 &&
      !normalized.operatorRecordIsIndependentOwnerProof,
      'private time-bounded operator grant ties exact CMS/site origins; not owner proof');
    ok(scope.operatorEnabled({CMS_ENV:'production',
      CMS_STAGE2_OWNER_READONLY_PERMISSION:'owner-grant-recorded-read-only'}) &&
      !scope.operatorEnabled({CMS_ENV:'test',
      CMS_STAGE2_OWNER_READONLY_PERMISSION:'owner-grant-recorded-read-only'}),
      'non-test mode requires separately enabled scope environment');
    function scopeReject(modified,label){
      assert.throws(()=>scope.inspectScope(modified,origins,t),undefined,label);checks++;
    }
    scopeReject({...record,siteOrigin:'https://attacker.acme-hosting.com'},
      'scope cannot be transported to another visitor');
    scopeReject({...record,extra:'approval'},'unrecognized grant field refused');
    scopeReject({...record,expiresAt:utc(t-60000)},'expired grant refused');
    scopeReject({...record,expiresAt:utc(t+172800000)},'grant cannot live more than one day');
    scopeReject({...record,reference:'too short'},'scope reference strict');
    fs.chmodSync(grantPath,0o644);
    assert.throws(()=>scope.readScope(grantPath,origins,t));checks++;
    fs.chmodSync(grantPath,0o600);
    const alias=path.join(grantDir,'scope-link.json');
    fs.symlinkSync(grantPath,alias);
    assert.throws(()=>scope.readScope(alias,origins,t));checks++;
    fs.chmodSync(grantDir,0o755);
    assert.throws(()=>scope.readScope(grantPath,origins,t));checks++;
    fs.chmodSync(grantDir,0o700);
    const dryRun=await run(['--check','--operator-attests-readonly-grant',
      '--cms-origin='+record.cmsOrigin,'--site-origin='+record.siteOrigin],
      {...process.env,CMS_ENV:'production'});
    ok(dryRun.code===3&&dryRun.stdout===''&&
      dryRun.stderr.trim()==='STAGE2_HTTPS_OBSERVATION_REFUSED',
      'real-host path must refuse before DNS/network without explicit scoped grant');
    execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes',
      '-days','1','-keyout',keyFile,'-out',certFile,
      '-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],
      {stdio:'ignore'});
    const key=fs.readFileSync(keyFile),cert=fs.readFileSync(certFile);
    const cmA=await start(key,cert,'cms',{value:'good'});servers.push(cmA);
    const siA=await start(key,cert,'site',{value:'good'});servers.push(siA);
    const cmB=await start(key,cert,'cms',{value:'good'});servers.push(cmB);
    const siB=await start(key,cert,'site',{value:'good'});servers.push(siB);
    const args=(cms,visitor)=>[
      '--check','--operator-attests-readonly-grant','--ci-local',
      '--ci-ca-file='+certFile,
      '--cms-origin=https://localhost:'+cms.port,
      '--site-origin=https://localhost:'+visitor.port
    ];
    const goodA=args(cmA,siA),goodB=args(cmB,siB);
    const previous=()=>servers.reduce((n,s)=>n+s.log.length,0);
    const noRequests=async (arguments_,label,env=CI)=>{
      const before=previous(),result=await run(arguments_,env);
      ok(result.code===3&&result.stdout==='' &&
        result.stderr==='STAGE2_HTTPS_OBSERVATION_REFUSED\n',label);
      ok(previous()===before,'refusal performs zero requests: '+label);
    };
    await noRequests([],'implicit network probe forbidden');
    await noRequests(goodA.filter(a=>a!=='--operator-attests-readonly-grant'),
      'explicit operator attestation required');
    await noRequests([...goodA,'--bogus-flag'],'unknown options refused');
    await noRequests([...goodA,'--check'],'duplicate options refused');
    await noRequests(goodA.map(a=>a.startsWith('--cms-origin=')
      ?'--cms-origin=http://localhost:'+cmA.port:a),'HTTP downgrade rejected');
    await noRequests(goodA.map(a=>a.startsWith('--cms-origin=')
      ?'--cms-origin=https://admin:secret@localhost:'+cmA.port:a),
      'origin credentials rejected');
    await noRequests(goodA.map(a=>a.startsWith('--site-origin=')
      ?'--site-origin=https://localhost:'+cmA.port:a),
      'colliding CMS and visitor origin refused');
    await noRequests(goodA.map(a=>a.startsWith('--site-origin=')
      ?'--site-origin=https://127.0.0.1:'+siA.port:a),
      'IP literal cannot evade CI host allowlist');
    await noRequests(goodA,'CI-local flag unusable in production runtime',
      {...CI,CMS_ENV:'production'});
    const validA=await run(goodA);
    const validB=await run(goodB);
    for(const [response,label] of [[validA,'A'],[validB,'B']]){
      if(response.code!==0)console.error('Local TLS fixture diagnostics:',response.code,JSON.stringify(response.record),response.stderr);
      ok(response.code===0&&response.record?.httpsObservationsPass===true,
        'real CA-checked HTTPS boundary probes pass for site '+label);
      ok(Object.keys(response.record.results).length===5
        &&Object.values(response.record.results).every(x=>x.tlsPeerVerified
          &&x.peerCertificateSha256?.length===64),
        'five real TLS-validated checks with a pinned peer digest '+label);
      ok(response.record.actualHttpsRequestsAttempted===true
        &&response.record.requestsRestrictedToGet===true
        &&response.record.stage2Accepted===false
        &&response.record.targetHostAccepted===false
        &&response.record.actualWebSapiVerified===false
        &&response.record.dbConnectionVerified===false
        &&response.record.physicalDocumentRootsVerified===false
        &&response.record.independentSiteDuringCmsOutageVerified===false,
        'positive HTTPS check cannot fabricate FPM/DB/owner approvals '+label);
      ok(!response.stdout.includes(temp)&&
        !response.stdout.includes('localhost') &&
        !response.stdout.includes('127.0.0.1'),
        'report does not print URLs, certificate path, or local addresses '+label);
    }
    ok(cmA.log.length===4&&siA.log.length===1
      &&cmB.log.length===4&&siB.log.length===1,
      'two independent CMS/site pairs each receive own five scoped GET requests');
    ok(servers.every(s=>s.log.every(x=>x.method==='GET')),
      'prober never sends POST/HEAD or mutating operations');

    // Do not trust a mock that returns success from a public/private URL.
    for(const mode of ['leak-vendor','leak-editor','bad-cache',
      'wrong-health','exposed-publish-get']){
      cmA.mode.value=mode;
      const failed=await run(goodA);
      ok(failed.code===4&&!failed.record.httpsObservationsPass,
        'private route/health violation blocks result: '+mode);
      cmA.mode.value='good';
    }
    for(const mode of ['redirect','missing','huge']){
      siA.mode.value=mode;
      const failed=await run(goodA);
      ok(failed.code===4&&!failed.record.httpsObservationsPass
        &&!failed.record.stage2Accepted,
        'bad visitor response never promotes acceptance: '+mode);
      siA.mode.value='good';
    }
    const untrusted=await run(goodA.filter(a=>!a.startsWith('--ci-ca-file=')));
    ok(untrusted.code===4&&!untrusted.record.httpsObservationsPass
      &&Object.values(untrusted.record.results).some(x=>!x.tlsPeerVerified),
      'unknown CA rejects even apparently correct endpoint content');

    // A real offline CMS listener loss must not prevent the visitor site
    // from answering HTTPS, and it must not affect CMS B or visitor B.
    await cmA.stop();
    const down=await run(goodA);
    ok(down.code===4&&!down.record.httpsObservationsPass
      &&down.record.results.cmsHealth?.passed===false
      &&down.record.results.visitorHome?.passed===true,
      'CMS A transport outage stays isolated from independent visitor A');
    const other=await run(goodB);
    ok(other.code===0&&other.record.httpsObservationsPass,
      'CMS A outage does not break CMS B and visitor B');
    const restarted=await start(key,cert,'cms',cmA.mode,cmA.port);
    servers.push(restarted);
    const recovered=await run(goodA);
    ok(recovered.code===0&&recovered.record.httpsObservationsPass,
      'restarted CMS A restores HTTPS observation without changing visitor A');
    ok(servers.every(s=>s.log.every(x=>x.method==='GET')),
      'outage and adversarial sequences never send unsafe HTTP methods');

    console.log('Stage2 explicitly authorized operator HTTPS tool: '+
      checks+' checks PASS; two disposable TLS-only CMS/site pairs, no real hosting');
  }finally{
    await Promise.all(servers.map(async s=>{
      if(s.server.listening)await s.stop().catch(()=>{});
    }));
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error('Stage2 disposable HTTPS harness failure:',e);process.exitCode=1;});
