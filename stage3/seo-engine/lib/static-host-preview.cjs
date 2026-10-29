'use strict';
// Read-only localhost preview of a VERIFIED staged static upload bundle.
// Simulates intended 301 behavior; NEVER proves real CDN/vhost rewrite rules.
// No POST, proxying, external network, browser JS execution or CMS write.
const fs=require('node:fs'),path=require('node:path'),
 crypto=require('node:crypto'),http=require('node:http');
const FORMAT='manufact-seo-static-upload-bundle-v1',SHA=/^[a-f0-9]{64}$/;
const FILE=/^(?:[a-z0-9-]+\/)*[a-z0-9._-]+$/;
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const MAX_FILES=1405,MAX_PAYLOAD=180000000;
const TYPES={'.html':'text/html; charset=utf-8','.txt':'text/plain; charset=utf-8',
 '.xml':'application/xml; charset=utf-8','.png':'image/png','.jpg':'image/jpeg',
 '.webp':'image/webp','.mp4':'video/mp4'};
function load(bundle){
 const folder=fs.realpathSync(bundle);
 if(fs.lstatSync(bundle).isSymbolicLink()||!fs.lstatSync(folder).isDirectory())
  throw Error('Static upload preview must be an actual operator directory');
 const meta=path.join(folder,'upload-inventory.json'),stat=fs.lstatSync(meta);
 if(stat.isSymbolicLink()||!stat.isFile()||stat.size>500000||stat.size<150)
  throw Error('Missing or unsafe private static upload inventory');
 const x=JSON.parse(fs.readFileSync(meta,'utf8'));
 if(!x||x.format!==FORMAT||typeof x.siteId!=='string'||
    !['apache','nginx','netlify','cloudflare-pages'].includes(x.provider)||
    !Array.isArray(x.files)||x.files.length>MAX_FILES||x.files.length<3||
    x.filesVerified!==x.files.length||x.sourceManifestIncludedInPublicRoot!==false||
    x.operatorHandoffOutsidePublicRoot!==true||
    !Number.isSafeInteger(x.totalPayloadBytes)||x.totalPayloadBytes>MAX_PAYLOAD||
    !Array.isArray(x.redirects)||x.redirects.length>60||
    x.actualNetworkRequests!==0||x.actualHostWrites!==0)
  throw Error('Static upload inventory has invalid production provenance or file count');
 const pub=path.join(folder,'public');
 if(!fs.lstatSync(pub).isDirectory()||fs.lstatSync(pub).isSymbolicLink())
  throw Error('Static upload root must be a real isolated directory');
 const entries=new Map(),aliases=new Map();let total=0;
 for(const xfile of x.files){
  if(!xfile||typeof xfile.file!=='string'||!FILE.test(xfile.file)||
     xfile.file==='release-manifest.json'||xfile.file.startsWith('.')&&xfile.file!=='.htaccess'||
     xfile.file.includes('/.')||entries.has(xfile.file)||!SHA.test(xfile.sha256)||
     !Number.isSafeInteger(xfile.size)||xfile.size<1||xfile.size>12000000||
     !['html','redirect-fallback','media','search','not-found','hosting-redirects','hosting-headers'].includes(xfile.kind))
   throw Error('Static upload file has a bad ledger path, checksum or category');
  const full=path.join(pub,xfile.file),fstat=fs.lstatSync(full);
  if(!full.startsWith(pub+path.sep)||!fstat.isFile()||fstat.isSymbolicLink()||
     fstat.size!==xfile.size||hash(fs.readFileSync(full))!==xfile.sha256)
   throw Error('Static upload content changed or escaped public output: '+xfile.file);
  entries.set(xfile.file,xfile);total+=fstat.size;
  if(total>MAX_PAYLOAD)throw Error('Upload archive exceeds bounded 180MB');
 }
 if(total!==x.totalPayloadBytes)throw Error('Static upload total content size differs from recorded bytes');
 const walk=(dir,prefix='')=>{
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
   const rel=prefix+item.name;
   if(item.isSymbolicLink()||!(item.isFile()||item.isDirectory()))
    throw Error('Unexpected symlink or special file inside upload root');
   if(item.isDirectory())walk(path.join(dir,item.name),rel+'/');
   else if(!entries.has(rel))throw Error('Unlisted file in public upload root: '+rel);
  }
 };walk(pub);
 if(!entries.has('index.html')||!entries.has('404.html')||
    entries.get('404.html').kind!=='not-found')
  throw Error('Static upload requires real index and 404 documents');
 const notFound=fs.readFileSync(path.join(pub,'404.html'),'utf8');
 if(!/<meta\b[^>]*name="robots"[^>]*content="noindex/i.test(notFound))
  throw Error('Static 404 page missing noindex instruction');
 for(const alias of x.redirects){
  if(!alias||!ROUTE.test(alias.from)||!ROUTE.test(alias.to)||aliases.has(alias.from)||
     alias.from===alias.to||!entries.has(alias.from.slice(1)+'index.html')||
     entries.get(alias.from.slice(1)+'index.html').kind!=='redirect-fallback'||
     !entries.has(alias.to.slice(1)+'index.html')||
     entries.get(alias.to.slice(1)+'index.html').kind!=='html')
   throw Error('Unsupported public redirect in approved upload manifest');
  aliases.set(alias.from,alias.to);
 }
 return Object.freeze({root:pub,inventory:x,files:entries,redirects:aliases,
  actualHostWrites:0,liveRewriteVerified:false,readOnly:true});
}
function route(snapshot,method,requestUrl){
 if(!snapshot||!snapshot.files||!snapshot.redirects||
    !['GET','HEAD'].includes(method))
  return {status:405,headers:{Allow:'GET, HEAD'},file:null};
 let request;
 try{
  request=new URL(requestUrl,'http://127.0.0.1');
  if(request.origin!=='http://127.0.0.1'||request.pathname.includes('%')||
     request.pathname.includes('\\')||request.pathname.includes('..'))
   return {status:400,headers:{},file:null};
 }catch{return {status:400,headers:{},file:null};}
 const pathname=request.pathname;
 const base={'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin'};
 if(snapshot.redirects.has(pathname))
  return {status:301,headers:{...base,Location:snapshot.redirects.get(pathname)},file:null};
 if(pathname==='/404.html')
  return {status:404,headers:{...base,'X-Robots-Tag':'noindex'},file:'404.html'};
 const raw=pathname==='/'?'index.html':pathname.endsWith('/')?
  pathname.slice(1)+'index.html':pathname.slice(1);
 const entry=snapshot.files.get(raw);
 if(!entry||!['html','media','search'].includes(entry.kind))
  return {status:404,headers:{...base,'X-Robots-Tag':'noindex'},file:'404.html'};
 const headers={...base,'Content-Type':TYPES[path.extname(raw)]||'application/octet-stream',
  'Content-Length':String(entry.size)};
 if(entry.kind==='html')headers['Cache-Control']='public, max-age=0, must-revalidate';
 return {status:200,headers,file:raw};
}
function handler(snapshot){
 if(!snapshot||!snapshot.readOnly||snapshot.actualHostWrites!==0)
  throw Error('Static preview refuses a mutable or unverified upload directory');
 return (req,res)=>{
  const result=route(snapshot,req.method,req.url);
  res.writeHead(result.status,result.headers);
  if(!result.file||req.method==='HEAD'){res.end();return;}
  // Files were SHA-verified before listening; recheck each read in case an
  // operator edits the staged folder during preview.
  const recorded=snapshot.files.get(result.file),file=path.join(snapshot.root,result.file);
  const bytes=fs.readFileSync(file);
  if(!recorded||hash(bytes)!==recorded.sha256||bytes.length!==recorded.size){
   // Do not serve content from a moved/replaced release. Headers not yet
   // flushed until writeHead() may require closing connection on failure.
   res.destroy(Error('Preview source changed since SHA256 verification'));return;
  }
  res.end(bytes);
 };
}
function listen(bundle,port){
 if(!Number.isSafeInteger(port)||port<1024||port>65535)
  throw Error('Choose an unprivileged local preview port 1024–65535');
 const loaded=load(bundle),server=http.createServer(handler(loaded));
 server.listen(port,'127.0.0.1');return {server,loaded};
}
module.exports=Object.freeze({FORMAT,load,route,handler,listen});
