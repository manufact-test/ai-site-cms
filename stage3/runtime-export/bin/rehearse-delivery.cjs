#!/usr/bin/env node
'use strict';
/**
 * D6: verify D4/D5 transport ZIP and exercise its visitor URLs over real
 * LOOPBACK HTTP. HTML/Next Static run through an explicit local host simulator;
 * PHP uses its actual independent public/index.php as CLI-server router.
 * Neither route uses DNS, remote hosts, production files, forms or live data.
 * Next SSR is intentionally NOT called runnable before a real Node build.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),
  http=require('node:http'),net=require('node:net'),crypto=require('node:crypto');
const {spawn,spawnSync}=require('node:child_process');
const {inspect}=require('./verify-delivery.cjs');
const {readArchive}=require('../lib/delivery-zip.cjs');
const error=m=>{throw Error('D6 local HTTP rehearsal refused: '+m);};
const [zipFile,...flags]=process.argv.slice(2);
function exists(p){try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
function parseArgs(){
  if(!path.isAbsolute(zipFile??'')||flags.length>1
    ||(flags[0]&&!flags[0].startsWith('--report=')))error('Usage: rehearse-delivery.cjs /ABS/VERIFIED-delivery.zip [--report=/ABS/NEW-report.json]');
  const report=flags[0]?.slice('--report='.length);
  if(report){
    if(!path.isAbsolute(report)||exists(report)||fs.realpathSync(path.dirname(report))!==path.dirname(report))
      error('report must be a new absolute path under existing canonical directory');
  }
  return report;
}
function statusCode(pathname,publication){
  for(const r of publication.redirects)if(r.from===pathname)return {code:301,to:r.to};
  return null;
}
function localStaticServer(entries,pub){
  const pages=new Map(pub.pages.map(p=>[p.path,p.file]));
  const assets=new Map(pub.assets.map(a=>['/'+a.file,a]));
  const files=pub.searchFiles??{};
  const mime={png:'image/png',jpg:'image/jpeg',webp:'image/webp',mp4:'video/mp4',
    ico:'image/x-icon',svg:'image/svg+xml'};
  return http.createServer((req,res)=>{
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    if(!['GET','HEAD'].includes(req.method)){
      res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;
    }
    let pathname;
    try{pathname=new URL(req.url,'http://127.0.0.1').pathname;}catch{res.writeHead(400);res.end();return;}
    if(!/^\/(?:[a-z0-9.-]+\/)*[a-z0-9.-]*$/.test(pathname)||pathname.includes('..')){
      res.writeHead(404);res.end();return;
    }
    const redirect=statusCode(pathname,pub);
    if(redirect){res.writeHead(301,{'Location':redirect.to});res.end();return;}
    let file=null,type='text/html; charset=utf-8';
    if(pages.has(pathname))file=pages.get(pathname);
    else if(assets.has(pathname)){
      file=pathname.slice(1);
      type=assets.get(pathname).mime??mime[path.extname(file).slice(1)]??'application/octet-stream';
    }else if(pathname==='/robots.txt'||pathname==='/sitemap.xml'){
      file=pathname.slice(1);
      if(!Object.hasOwn(files,file))file=null;
      type=pathname==='/robots.txt'?'text/plain; charset=utf-8':'application/xml; charset=utf-8';
    }
    if(!file){res.writeHead(404);res.end('Not found');return;}
    const body=entries.get('deploy/'+file);
    if(!body){res.writeHead(503);res.end('Missing release file');return;}
    res.writeHead(200,{'Content-Type':type,'Content-Length':body.length});
    if(req.method==='HEAD')res.end();else res.end(body);
  });
}
async function freePort(){
  const server=net.createServer();
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}
async function withTimeout(promise,timeout=2500){
  return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('HTTP deadline')),timeout))]);
}
async function main(){
  const reportPath=parseArgs();
  const verified=inspect(zipFile);
  const entries=readArchive(fs.readFileSync(zipFile));
  const pub=JSON.parse(entries.get('handoff/source-release-manifest.json').toString('utf8'));
  const info=JSON.parse(entries.get('handoff/delivery-manifest.json').toString('utf8'));
  const checks=[];
  const check=(name,ok,detail)=>checks.push({name,ok,detail});
  const report={
    format:'manufact-local-http-rehearsal-v1',siteId:verified.siteId,
    version:verified.publishedVersion,technology:verified.technology,
    zipSha256:verified.sha256,scope:'LOOPBACK_DISPOSABLE_ONLY',
    hostRewritesCertified:false,tlsCertified:false,collectorCertified:false,
    productionDeployed:false,approvedForProduction:false,
    status:'pending',checks,summary:{checked:0,passed:0,failed:0},
    notice:'No public DNS/TLS/actual Apache, Nginx, forms or hosting validation. Operator GO remains required.'
  };
  let server=null,php=null,dir=null,serverOutput='';
  try{
    if(info.technology==='next-ssr'){
      check('SSR_SOURCE_ONLY',false,'Next SSR delivery is source-only. Build with Node.js before an actual HTTP runtime can be checked.');
      report.status='not-runnable';
      return finish(report,reportPath,2);
    }
    let port;
    if(info.technology==='php'){
      const probe=spawnSync('php',['--version'],{encoding:'utf8',timeout:10000});
      if(probe.status!==0)error('PHP CLI 8.1+ is required to rehearse the PHP visitor router');
      dir=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-d6-php-'));
      for(const [name,bytes] of entries){
        if(!name.startsWith('deploy/'))continue;
        const relative=name.slice('deploy/'.length),filename=path.join(dir,relative);
        fs.mkdirSync(path.dirname(filename),{recursive:true});
        fs.writeFileSync(filename,bytes,{flag:'wx',mode:0o600});
      }
      const publicRoot=path.join(dir,'public');
      if(!fs.existsSync(path.join(publicRoot,'index.php'))||
        !fs.existsSync(path.join(dir,'data','release-manifest.json')))
        error('incomplete independent PHP visitor runtime');
      port=await freePort();
      php=spawn('php',['-S','127.0.0.1:'+port,'-t',publicRoot,path.join(publicRoot,'index.php')],
        {stdio:['ignore','ignore','pipe']});
      php.stderr.on('data',chunk=>{serverOutput+=String(chunk);if(serverOutput.length>4000)serverOutput=serverOutput.slice(-4000);});
      let ready=false;
      for(let i=0;i<40;i++){
        if(php.exitCode!==null)break;
        try{const r=await withTimeout(fetch('http://127.0.0.1:'+port+'/',{signal:AbortSignal.timeout(1000)}),1100);
          if(r.status===200){ready=true;break;}
        }catch{}
        await new Promise(r=>setTimeout(r,100));
      }
      if(!ready)error('independent PHP visitor did not start on loopback: '+serverOutput.slice(-300));
    }else{
      server=localStaticServer(entries,pub);
      await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
      port=server.address().port;
    }
    const base='http://127.0.0.1:'+port;
    const request=async(route,method='GET')=>{
      if(!route.startsWith('/')||route.startsWith('//'))error('unsafe test route');
      return withTimeout(fetch(base+route,{method,redirect:'manual',signal:AbortSignal.timeout(2200)}));
    };
    for(const page of pub.pages){
      const response=await request(page.path),body=await response.text();
      check('GET '+page.path,response.status===200&&/^\s*<!doctype\s+html>/i.test(body),
        'status '+response.status+'; published HTML route');
      const head=await request(page.path,'HEAD');
      const empty=Buffer.from(await head.arrayBuffer()).length===0;
      check('HEAD '+page.path,head.status===200&&empty,'status '+head.status+'; body empty='+empty);
    }
    for(const redirect of pub.redirects){
      const res=await request(redirect.from);
      check('301 '+redirect.from,res.status===301&&res.headers.get('location')===redirect.to,
        'status '+res.status+'; location='+res.headers.get('location'));
    }
    for(const media of pub.assets){
      const res=await request('/'+media.file);
      const bytes=Buffer.from(await res.arrayBuffer());
      const sha=crypto.createHash('sha256').update(bytes).digest('hex');
      check('MEDIA /'+media.file,res.status===200&&sha===media.sha256,
        'status '+res.status+'; sha256='+sha);
    }
    for(const search of ['robots.txt','sitemap.xml']){
      const res=await request('/'+search),expected=Object.hasOwn(pub.searchFiles??{},search)?200:404;
      check('SEO /'+search,res.status===expected,
        'status '+res.status+'; expected '+expected);
    }
    for(const name of ['/no-such-page/','/release-manifest.json','/handoff/delivery-manifest.json',
      '/data/release-manifest.json','/runtime-build.json']){
      const res=await request(name);
      check('PRIVATE/404 '+name,res.status===404,'status '+res.status);
    }
    const post=await request('/','POST');
    check('FORMS READ-ONLY POST /',post.status===405,
      'status '+post.status+'; must never submit leads');
    if(info.technology==='php'){
      const leak=await request('/data/index.html');
      check('PRIVATE PHP DATA /data/index.html',leak.status===404,'status '+leak.status);
    }
    report.status=checks.every(c=>c.ok)?'local-http-pass':'local-http-failed';
    return finish(report,reportPath,report.status==='local-http-pass'?0:1);
  }catch(e){
    check('RUNTIME_ERROR',false,e.message.slice(0,400));
    report.status='local-http-failed';
    return finish(report,reportPath,1);
  }finally{
    if(server)await new Promise(r=>server.close(r));
    if(php&&php.exitCode===null){
      const done=new Promise(r=>php.once('exit',r));
      php.kill('SIGTERM');
      await Promise.race([done,new Promise(r=>setTimeout(r,1000))]);
      if(php.exitCode===null)php.kill('SIGKILL');
    }
    if(dir)fs.rmSync(dir,{recursive:true,force:true});
  }
}
function finish(report,reportPath,exit){
  report.summary={checked:report.checks.length,passed:report.checks.filter(c=>c.ok).length,
    failed:report.checks.filter(c=>!c.ok).length};
  if(reportPath){
    const parent=path.dirname(reportPath);
    const temp=path.join(parent,'.stage3-d6-'+crypto.randomBytes(10).toString('hex'));
    try{
      fs.writeFileSync(temp,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
      fs.linkSync(temp,reportPath); // never overwrite existing, atomic on local filesystem
    }finally{if(exists(temp))fs.rmSync(temp,{force:true});}
  }
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=exit;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
