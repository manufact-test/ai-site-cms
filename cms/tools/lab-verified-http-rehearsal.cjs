'use strict';
// Stage2 ONLY: disposable localhost HTTP cutover rehearsal. No production bootstrap
// or hosting integration. The private PHP listener also binds to loopback, so
// this is NOT an isolation/security boundary against other local processes.
// A verified lab slot is pinned for the entire session; no hot swapping, no DB.
const http=require('node:http');
const net=require('node:net');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {LabStartupGate}=require('./lab-startup-integrity-gate.cjs');
const HOST='127.0.0.1';
const MAX_REQUEST_PATH=2048;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function freePort(){
  return new Promise((resolve,reject)=>{
    const server=net.createServer();
    server.once('error',reject);
    server.listen(0,HOST,()=>{const a=server.address();server.close(e=>e?reject(e):resolve(a.port))});
  });
}
function response(res,status,body){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(body)+'\n');
}
function realPackagePath(root){
  const dir=fs.lstatSync(root);
  if(!dir.isDirectory()||dir.isSymbolicLink())throw Error('Unsafe serving slot');
  const entry=path.join(root,'public','index.php');
  const file=fs.lstatSync(entry);
  if(!file.isFile()||file.isSymbolicLink())throw Error('Unsafe PHP entrypoint');
  return path.join(root,'public');
}
async function requestPrivate(port){
  return new Promise((resolve,reject)=>{
    const req=http.request({hostname:HOST,port,path:'/api/health',
      method:'GET',timeout:1300,headers:{host:'localhost'}},res=>{
      let bytes=0,chunks='';
      res.on('data',x=>{bytes+=x.length;if(bytes<4096)chunks+=x.toString('utf8')});
      res.on('end',()=>resolve({status:res.statusCode,body:chunks}));
    });
    req.once('timeout',()=>req.destroy(Error('PHP private health timeout')));
    req.once('error',reject);req.end();
  });
}
class LabVerifiedHttpRehearsal {
  constructor(lab,guard){
    this.lab=lab;this.guard=guard;
    this.gate=new LabStartupGate(lab,guard);
    this.running=false;
    this.server=null;this.php=null;this.baseline=null;
    this.boundAddress=null;
    this.privatePort=null;
  }
  async start(){
    if(this.running||this.server||this.php)throw Error('Already started or unresolved server cleanup');
    const d=this.gate.requireReady();
    this.baseline={version:d.current,sequence:d.sequence,manifestSha256:d.manifestSha256};
    const slot=this.lab.slot(d.current),documentRoot=realPackagePath(slot);
    // Verify again before starting PHP. Every public request performs the check
    // again. Filesystem mutation between check and PHP execution is not solved.
    if(this.gate.requireReady().sequence!==d.sequence)throw Error('Startup generation changed');
    const port=await freePort();
    this.privatePort=port;
    const php=spawn('php',['-S',HOST+':'+port,'-t',documentRoot,path.join(documentRoot,'index.php')],{
      cwd:slot,stdio:['ignore','ignore','pipe'],env:{...process.env}
    });
    this.php=php;this.lastPhpError='';
    php.stderr.on('data',b=>{this.lastPhpError=(this.lastPhpError+b.toString('utf8')).slice(-500)});
    try{
      let ready=false;
      for(let i=0;i<45;i++){
        if(php.exitCode!==null||php.signalCode!==null)throw Error('PHP child exited prematurely');
        try{
          const health=await requestPrivate(port);
          if(health.status===200&&JSON.parse(health.body).status==='ok'){ready=true;break}
        }catch{}
        await sleep(75);
      }
      if(!ready)throw Error('No verified private PHP health response');
      // Separate loopback facade. Only safe read-only health is proxied.
      // The privileged package is never exposed on 0.0.0.0.
      const server=http.createServer((req,res)=>this.handle(req,res));
      this.server=server;
      await new Promise((resolve,reject)=>{
        server.once('error',reject);
        server.listen(0,HOST,()=>{server.off('error',reject);resolve()});
      });
      this.boundAddress=server.address();
      this.running=true;
      return {host:HOST,port:this.boundAddress.port,version:d.current,sequence:d.sequence};
    }catch(e){
      await this.stop();
      throw e;
    }
  }
  sessionStatus(){
    try{
      if(!this.php||this.php.exitCode!==null||this.php.signalCode!==null)
        return {ready:false,reason:'php-process-terminated'};
      const current=this.gate.check();
      const base=this.baseline;
      if(current.status!=='ready')return {ready:false,reason:current.reason};
      if(!base||base.version!==current.current||base.sequence!==current.sequence||
         base.manifestSha256!==current.manifestSha256)
        return {ready:false,reason:'active-generation-changed-restart-required'};
      return {ready:true};
    }catch{return {ready:false,reason:'unverified-session'}}
  }
  handle(req,res){
    if(req.socket.remoteAddress!==HOST&&req.socket.remoteAddress!=='::ffff:127.0.0.1'){
      response(res,403,{error:'forbidden'});return;
    }
    const result=this.sessionStatus();
    if(!result.ready){response(res,503,{error:'lab_release_unavailable'});return}
    if(req.method!=='GET'||typeof req.url!=='string'||req.url.length>MAX_REQUEST_PATH||
       req.url!=='/api/health'){
      response(res,404,{error:'not_found'});return;
    }
    // Verify synchronously right before forwarding. No WebSocket, body, uploads
    // or arbitrary paths cross this private rehearsal facade.
    const again=this.sessionStatus();
    if(!again.ready){response(res,503,{error:'lab_release_unavailable'});return}
    const proxied=http.request({hostname:HOST,port:this.privatePort,
      method:'GET',path:'/api/health',timeout:1800,headers:{host:'localhost'}},backend=>{
      let size=0,body='';
      backend.on('data',b=>{size+=b.length;if(size<=4096)body+=b.toString('utf8')});
      backend.on('end',()=>{
        if(res.writableEnded)return;
        const checked=this.sessionStatus();
        if(!checked.ready){response(res,503,{error:'lab_release_unavailable'});return}
        if(size>4096||backend.statusCode!==200){response(res,503,{error:'lab_php_unavailable'});return}
        try{
          const data=JSON.parse(body);
          if(data.status!=='ok')throw Error('Bad health payload');
          response(res,200,{status:'ok',lab:true,version:this.baseline.version,
            generation:this.baseline.sequence});
        }catch{response(res,503,{error:'lab_php_unavailable'})}
      });
    });
    proxied.once('error',()=>{if(!res.writableEnded)response(res,503,{error:'lab_php_unavailable'})});
    proxied.once('timeout',()=>proxied.destroy(Error('PHP health timeout')));
    proxied.end();
  }
  async stop(){
    this.running=false;
    if(this.server){
      const srv=this.server;this.server=null;
      await new Promise(resolve=>srv.close(()=>resolve()));
    }
    if(this.php){
      const child=this.php;this.php=null;
      if(child.exitCode===null&&child.signalCode===null){
        child.kill('SIGTERM');
        await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(2000)]);
        if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
      }
    }
    this.boundAddress=null;this.privatePort=null;this.baseline=null;
  }
}
module.exports={LabVerifiedHttpRehearsal};
