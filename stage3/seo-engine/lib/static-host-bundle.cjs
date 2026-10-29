'use strict';
// Prepare a complete, OFFLINE, provider-specific static upload directory.
// Requires the SHA256-verified official PHP static release. Never deploys.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const STATIC=require('./php-local-static-export.cjs');
const REWRITES=require('./static-host-rewrites.cjs');
const FORMAT='manufact-seo-static-upload-bundle-v1';
const PROVIDERS=Object.freeze(['apache','nginx','netlify','cloudflare-pages']);
const SHA=/^[a-f0-9]{64}$/;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const SAFE=/^(?:[a-z0-9-]+\/)*[a-z0-9._-]+$/;
const MAX_BYTES=180000000;
function inventory(site,release,sourceDir,provider){
 if(!PROVIDERS.includes(provider)||!STATIC.isVerified(release)||
    !site||site.siteId!==release.siteId)throw Error('Choose a supported provider and SHA256-verified official CMS release');
 const plan=REWRITES.build(site,release);
 if(!release.origin||release.origin!==plan.origin)
  throw Error('Official export HTTPS origin must match the intended root-static host');
 const root=fs.realpathSync(sourceDir);
 if(fs.lstatSync(sourceDir).isSymbolicLink()||!fs.lstatSync(root).isDirectory())
  throw Error('Official static source must be a real directory, not a symlink');
 const meta=fs.readFileSync(path.join(root,'release-manifest.json'));
 if(sha(meta)!==release.manifestSha256)
  throw Error('Official release manifest changed after SHA256 verification');
 const manifest=JSON.parse(meta.toString('utf8'));
 if(manifest.siteId!==site.siteId||manifest.publishedVersion!==release.publishedVersion||
    manifest.sourceRevision!==release.sourceRevision||manifest.publicOrigin!==plan.origin)
  throw Error('Official release ledger changed after verification');
 const records=[
  ...manifest.pages.map(x=>({file:x.file,sha256:x.sha256,kind:'html'})),
  ...manifest.redirects.map(x=>({file:x.file,sha256:x.sha256,kind:'redirect-fallback'})),
  ...manifest.assets.map(x=>({file:x.file,sha256:x.sha256,kind:'media'})),
  ...Object.entries(manifest.searchFiles||{}).map(([file,digest])=>({file,sha256:digest,kind:'search'}))
 ];
 if(records.length!==release.recordsVerified||records.length>1400)
  throw Error('Official manifest file inventory differs from verified release');
 const seen=new Set(),out=[];let budget=0;
 for(const x of records){
  if(typeof x.file!=='string'||!SAFE.test(x.file)||x.file==='release-manifest.json'||
     x.file.startsWith('.')||x.file.includes('/.')||!SHA.test(x.sha256)||seen.has(x.file))
   throw Error('Unsafe, hidden, duplicate or unpinned static upload asset');
  seen.add(x.file);
  const real=path.join(root,x.file);
  const stat=fs.lstatSync(real);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>12000000||
     stat.size===0||!real.startsWith(root+path.sep))
   throw Error('Static upload asset is missing, oversized or unsafe: '+x.file);
  budget+=stat.size;
  if(budget>MAX_BYTES)throw Error('Static upload exceeds maximum 180MB verified release budget');
  const data=fs.readFileSync(real);
  if(sha(data)!==x.sha256)throw Error('Official export asset changed since SHA256 verification');
  out.push(Object.freeze({...x,size:data.length}));
 }
 // A private release manifest contains source revision / internal metadata.
 // Never expose it as part of a publicly served static upload root.
 const lang=['en','ru','pl','de'].includes(site.language)?site.language:'en';
 const notFoundText=lang==='ru'?'Страница не найдена':lang==='pl'?'Nie znaleziono strony':
  lang==='de'?'Seite nicht gefunden':'Page not found';
 const notFound='<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,follow"><title>404 — '+notFoundText+'</title>'+
  '<style>body{font:normal 18px/1.5 system-ui,sans-serif;max-width:50rem;margin:12vh auto;'+
  'padding:1.5rem;color:#172338}h1{font-size:2rem}a{color:#154dc3}</style></head>'+
  '<body><main><h1>404 — '+notFoundText+'</h1><p><a href="/">Home</a></p></main></body></html>\n';
 if(seen.has('404.html'))throw Error('Official static export already has a conflicting 404.html');
 out.push(Object.freeze({file:'404.html',sha256:sha(Buffer.from(notFound,'utf8')),
  size:Buffer.byteLength(notFound,'utf8'),kind:'not-found'}));
 const extra=provider==='apache'?{name:'.htaccess',body:plan.apache.content}:
  provider==='netlify'?{name:'_redirects',body:plan.netlify.content}:
  provider==='cloudflare-pages'?{name:'_redirects',body:plan.cloudflarePages.content}:null;
 if(extra){
  if(seen.has(extra.name))throw Error('Hosting configuration collides with release asset');
  out.push(Object.freeze({file:extra.name,sha256:sha(Buffer.from(extra.body,'utf8')),
   size:Buffer.byteLength(extra.body,'utf8'),kind:'hosting-redirects'}));
 }
 return Object.freeze({
  format:FORMAT,provider,siteId:site.siteId,origin:plan.origin,
  publishedVersion:release.publishedVersion,sourceRevisionClaim:release.sourceRevision,
  officialManifestSha256:release.manifestSha256,sourceRoot:root,
  records:Object.freeze(out),expectedUploadFileCount:out.length,
  totalPayloadBytes:budget+Buffer.byteLength(notFound,'utf8')+
   (extra?Buffer.byteLength(extra.body,'utf8'):0),
  notFound,
  staticExportManifestPubliclyExposed:false,extra,plan,
  actualNetworkRequests:0,actualHostWrites:0,manualDeploymentRequired:true
 });
}
function prepare(site,release,sourceDir,outputRoot,provider){
 if(!path.isAbsolute(outputRoot))throw Error('A NEW absolute operator output folder is required');
 const output=path.resolve(outputRoot);
 if(fs.existsSync(output))throw Error('Refusing to overwrite an existing upload bundle');
 const source=fs.realpathSync(sourceDir),parent=fs.realpathSync(path.dirname(output));
 if(output===source||output.startsWith(source+path.sep)||
    source.startsWith(output+path.sep)||parent===source||
    parent.startsWith(source+path.sep))
  throw Error('Upload directory must be isolated from immutable official export');
 const plan=inventory(site,release,source,provider);
 fs.mkdirSync(output,{mode:0o700});
 const upload=path.join(output,'public');
 fs.mkdirSync(upload,{mode:0o700});
 const copy=(rel,bytes)=>{
  const file=path.join(upload,rel);
  if(!file.startsWith(upload+path.sep))throw Error('Unsafe upload path');
  fs.mkdirSync(path.dirname(file),{mode:0o700,recursive:true});
  fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
 };
 for(const record of plan.records){
  const bytes=record.kind==='hosting-redirects'?Buffer.from(plan.extra.body,'utf8'):
   record.kind==='not-found'?Buffer.from(plan.notFound,'utf8'):
   fs.readFileSync(path.join(source,record.file));
  if(sha(bytes)!==record.sha256||bytes.length!==record.size)
   throw Error('Official source asset changed during static upload staging');
  copy(record.file,bytes);
 }
 const reread=STATIC.read(source,site);
 if(reread.manifestSha256!==release.manifestSha256||
    reread.publishedVersion!==release.publishedVersion||
    reread.sourceRevision!==release.sourceRevision)
  throw Error('Official source release changed during upload bundle staging');
 for(const r of plan.records){
  const file=path.join(upload,r.file),st=fs.lstatSync(file);
  if(!st.isFile()||st.isSymbolicLink()||sha(fs.readFileSync(file))!==r.sha256)
   throw Error('Staged static hosting upload SHA256 differs from approved export');
 }
 const handoff=[
  '# Static deployment package — operator approval required',
  '',
  'Provider: '+provider+'. Public HTTPS root: '+plan.origin+'/',
  'CMS owner Site ID: '+plan.siteId+'. Version: '+plan.publishedVersion+
   '. Source revision claim: '+plan.sourceRevisionClaim+'.',
  'Official source manifest SHA256: '+plan.officialManifestSha256+'.',
  'Upload ONLY the contents of ./public to the approved hosting root.',
  'Do not upload this operator folder: upload-inventory.json and HANDOFF.md are private.',
  'The official release-manifest.json is intentionally EXCLUDED from public upload.',
  'The old-page HTML fallbacks are carried for compatibility; server MUST return real 301.',
  'A top-level 404.html is generated with noindex: necessary to disable Cloudflare Pages default SPA fallback.',
  'Apache/Nginx operators must also confirm their error_page/ErrorDocument emits true HTTP 404.',
  'NEVER deploy a partial directory or merge it with an existing stale public root.',
  '',
  provider==='apache'?'Apache: .htaccess is part of upload root. Confirm AllowOverride and mod_rewrite.':
  provider==='nginx'?'Nginx: manually insert operator/nginx-redirects.conf into the actual HTTPS server block; the root directory alone does not provide 301!':
  provider==='netlify'?'Netlify: _redirects uses forced 301! to override pre-existing old-path/index.html files.':
  'Cloudflare Pages: _redirects provides 301 for static assets; Pages Functions routing must be checked.',
  '',
  'After owner-controlled deployment: check HTTP 200 root/pages, real 301 Location for all aliases,',
  '404/410 unknown route, robots.txt and sitemap.xml, public CSS/JS/form-action CSP,',
  'and every public original/variant media SHA256 with the existing first-site tools.',
  'Actual forms POST, mail/Telegram delivery, desktop/tablet/mobile and owner approval',
  'must still be tested separately. No network request or host write was made.',
  ''
 ].join('\n');
 fs.writeFileSync(path.join(output,'HANDOFF.md'),handoff,{flag:'wx',mode:0o600});
 const result={
  format:FORMAT,siteId:plan.siteId,provider,origin:plan.origin,
  publishedVersion:plan.publishedVersion,sourceRevisionClaim:plan.sourceRevisionClaim,
  officialManifestSha256:plan.officialManifestSha256,
  uploadRelativePath:'public/',files:plan.records.map(({file,sha256,size,kind})=>({file,sha256,size,kind})),
  filesVerified:plan.records.length,totalPayloadBytes:plan.totalPayloadBytes,
  sourceManifestIncludedInPublicRoot:false,
  operatorHandoffOutsidePublicRoot:true,
  realHttp301NotTested:true,actualNetworkRequests:0,actualHostWrites:0,
  manualDeploymentRequired:true,clientApproved:false
 };
 fs.writeFileSync(path.join(output,'upload-inventory.json'),JSON.stringify(result,null,2)+'\n',
  {flag:'wx',mode:0o600});
 if(provider==='nginx')
  fs.writeFileSync(path.join(output,'nginx-redirects.conf'),plan.plan.nginx.content,
   {flag:'wx',mode:0o600});
 return Object.freeze({output,provider,files:plan.records.length,
  bytes:plan.totalPayloadBytes,officialManifestSha256:plan.officialManifestSha256,
  publishedVersion:plan.publishedVersion,actualHostWrites:0,publicHttpRequests:0,
  requiresManualDeploy:true});
}
module.exports=Object.freeze({FORMAT,PROVIDERS,inventory,prepare});
