#!/usr/bin/env node
'use strict';
/**
 * D5 unified local shipment: D2 immutable JSON -> HTML/PHP/Next Static/Next SSR
 * -> verified D4 ZIP -> offline preflight -> sidecar report.
 * npm install happens ONLY when explicitly opted-in for Next Static. No deploy.
 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {audit}=require('../lib/delivery-preflight.cjs');
const {inspect}=require('../bin/verify-delivery.cjs');
const fail=why=>{throw Error('D5 one-command release refused: '+why);};
const exists=p=>{try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const [source,technology,destination,...flags]=process.argv.slice(2);
let tmp=null;
const supported=new Set(['html','php','next-static','next-ssr']);
const opts={};let flagSet=new Set();
for(const f of flags){
  const [name,...pieces]=f.split('=');
  if(!['--expect-origin','--allow-npm-install','--report','--allow-blocked'].includes(name)||flagSet.has(name))
    fail('unsupported/duplicate flag '+name);
  flagSet.add(name);
  if(['--allow-npm-install','--allow-blocked'].includes(name)){
    if(pieces.length)fail('boolean flag does not take a value');opts[name]=true;
  }else {
    const val=pieces.join('=');
    if(!val)fail('empty flag value '+name);
    opts[name]=val;
  }
}
function exec(bin,args,cwd=null,timeout=180000,env={}){
  const r=spawnSync(bin,args,{
    cwd:cwd||undefined,encoding:'utf8',timeout,maxBuffer:3_000_000,
    env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',...env},
    stdio:['ignore','pipe','pipe']
  });
  if(r.error||r.status!==0)fail(
    bin+' failed: '+(r.error?.message??'')+'\n'+(r.stderr||r.stdout||'').slice(-1300)
  );
  return r.stdout;
}
const checkTarget=file=>{
  if(!path.isAbsolute(file)||file.endsWith(path.sep)||exists(file))
    fail('outputs require unused absolute paths');
  const parent=path.dirname(file);
  if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()
    ||fs.realpathSync(parent)!==parent)fail('output parent must be an existing canonical directory');
  return file;
};
function main(){
  if(process.argv.length<5||!path.isAbsolute(source??'')||!supported.has(technology)
    ||!path.isAbsolute(destination??'')||!destination.endsWith('.zip'))
    fail('Usage: ship.cjs ABSOLUTE-D2.json html|php|next-static|next-ssr ABSOLUTE-NEW.zip [--expect-origin=https://site] [--allow-npm-install] [--report=ABSOLUTE-NEW.json] [--allow-blocked]');
  if(opts['--allow-npm-install']&&technology!=='next-static')
    fail('--allow-npm-install is for Next Static only');
  if(technology==='next-static'&&!opts['--allow-npm-install'])
    fail('Next Static needs a real npm build. Opt in explicitly using --allow-npm-install (third-party package download).');
  if(fs.lstatSync(source).isSymbolicLink()||!fs.statSync(source).isFile()
    ||fs.realpathSync(source)!==source||fs.statSync(source).size>41000000)
    fail('D2 input must be an ordinary canonical JSON file <= 41 MB');
  checkTarget(destination);
  const reportPath=checkTarget(opts['--report']??destination+'.preflight.json');
  if(reportPath===destination||source===destination||source===reportPath)
    fail('input, ZIP and report paths must be distinct');
  if(opts['--expect-origin']&&!/^https:\/\/[a-z0-9.-]+(?::\d{2,5})?$/i.test(opts['--expect-origin']))
    fail('expected origin must be a full HTTPS origin without path');
  tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-D5-ship-'));
  const built=path.join(tmp,'built'),stagedZip=path.join(tmp,'candidate.zip');
  exec(process.execPath,[path.join(__dirname,'build-handoff.cjs'),source,technology,built]);
  if(technology==='next-static'){
    // Explicitly permitted network operation confined to npm installing the
    // pinned Next dependencies in a disposable local folder (never on a host).
    exec('npm',['install','--no-audit','--no-fund','--ignore-scripts'],built,180000);
    exec('npm',['run','build'],built,240000,{CI:'true'});
    if(!fs.existsSync(path.join(built,'out/index.html')))
      fail('Next export build did not produce out/index.html');
  }
  const prepareArgs=[path.join(__dirname,'prepare-delivery.cjs'),built,stagedZip];
  if(opts['--expect-origin'])prepareArgs.push('--expect-origin='+opts['--expect-origin']);
  const builtResult=JSON.parse(exec(process.execPath,prepareArgs));
  const verified=inspect(stagedZip);
  if(verified.sha256!==builtResult.sha256||verified.siteId!==builtResult.siteId
    ||verified.publishedVersion!==builtResult.version)fail('output checksum/identity differs');
  const report=audit(stagedZip,opts['--expect-origin']??null);
  const unexpected=report.findings.filter(f=>f.severity==='blocker'
    &&!(technology==='next-ssr'&&f.code==='SSR_BUILD_REQUIRED'));
  if(unexpected.length&&!opts['--allow-blocked'])
    fail(unexpected.length+' critical readiness blockers ('+
      unexpected.slice(0,6).map(x=>x.code).join(', ')+
      '). Use --allow-blocked only to ship for offline investigation, never production.');
  const rawZip=fs.readFileSync(stagedZip),fingerprint=crypto.createHash('sha256').update(rawZip).digest('hex');
  if(fingerprint!==report.zipSha256||fingerprint!==verified.sha256)fail('archive changed during preflight');
  const result={
    format:'manufact-shipment-result-v1',
    siteId:verified.siteId,publishedVersion:verified.publishedVersion,
    technology,zip:destination,zipSha256:fingerprint,
    report:reportPath,readiness:report.readiness,
    automatedChecks:report.counts,manualApprovalRequired:true,
    approvalGranted:false,productionDeployed:false,
    npmNetworkOptIn:Boolean(opts['--allow-npm-install']),
    blockedPackageAllowed:Boolean(unexpected.length&&opts['--allow-blocked'])
  };
  // Build both outputs in the target directory first and publish only after
  // all audits pass. Never overwrite an existing file or a symlink.
  const dir=path.dirname(destination),unique=crypto.randomBytes(10).toString('hex');
  const tempZip=path.join(dir,'.stage3-D5-'+unique+'.zip');
  const tempReport=path.join(path.dirname(reportPath),'.stage3-D5-'+unique+'.json');
  try{
    fs.writeFileSync(tempZip,rawZip,{flag:'wx',mode:0o600});
    fs.writeFileSync(tempReport,JSON.stringify({...report,shipment:result},null,2)+'\n',
      {flag:'wx',mode:0o600});
    if(exists(destination)||exists(reportPath))fail('destination changed; refusing to overwrite');
    fs.linkSync(tempZip,destination); // atomic no-overwrite publication on same filesystem
    try{fs.linkSync(tempReport,reportPath);}
    catch(error){fs.rmSync(destination,{force:true});throw error;}
  }finally{
    if(exists(tempZip))fs.rmSync(tempZip,{force:true});
    if(exists(tempReport))fs.rmSync(tempReport,{force:true});
  }
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
try{main();}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(tmp)fs.rmSync(tmp,{recursive:true,force:true});}
