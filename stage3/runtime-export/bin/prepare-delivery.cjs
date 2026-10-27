#!/usr/bin/env node
'use strict';
/**
 * D4 offline packaging: already-published D1/D2 outputs -> self-verified,
 * transportable ZIP + hosting handoff. No deploy/network/db/secret scanning.
 */
const fs=require('node:fs'),path=require('node:path');
const {inspect}=require('../lib/verify.cjs');
const zip=require('../lib/delivery-zip.cjs');
const fail=m=>{throw Error('D4 delivery preparation refused: '+m);};
const exists=p=>{try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const [source,target,...options]=process.argv.slice(2);
const maxFiles=4000,maxBytes=180000000;
const inspectDir=(root)=>{
  if(!path.isAbsolute(root)||!fs.statSync(root).isDirectory()||fs.lstatSync(root).isSymbolicLink()
     ||fs.realpathSync(root)!==root)fail('source must be an existing canonical real directory (no symlink)');
};
function walk(root,base='',max=180000000){
  const result=[];let total=0;
  function go(current,relative){
    for(const de of fs.readdirSync(current,{withFileTypes:true})){
      if(de.isSymbolicLink()||(!de.isFile()&&!de.isDirectory()))fail('symlink or unsupported file');
      const rel=relative?relative+'/'+de.name:de.name;
      if(!zip.nameOK('deploy/'+base+rel))fail('unsafe file name: '+rel);
      const p=path.join(current,de.name);
      if(de.isDirectory())go(p,rel);
      else{
        const data=fs.readFileSync(p);total+=data.length;
        if(result.length>=maxFiles||total>max)fail('file or byte limit exceeded');
        result.push({relative:base+rel,data});
      }
    }
  }
  go(root,'');
  return result;
}
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n','utf8');
function apache(redirects){
  const rules=['# Generated for Apache mod_rewrite. Upload next to index.html.',
    'Options -Indexes','DirectoryIndex index.html','RewriteEngine On'];
  for(const [from,to] of redirects){
    if(!(/^\/(?:[a-z0-9-]+\/)+$/).test(from)
       ||!(/^\/(?:[a-z0-9-]+\/)*$/).test(to))fail('unsafe redirect for Apache');
    rules.push('RewriteRule ^'+from.slice(1).replace(/\/$/,'')+'/?$ '+to+' [R=301,L,NE]');
  }
  return Buffer.from(rules.join('\n')+'\n');
}
function nginx(routes){
  const lines=['# Include in an Nginx server block, after configuring root and TLS.',
    '# These are ACTUAL 301 rules (unlike HTML redirect fallback pages).'];
  for(const [from,to] of routes){
    lines.push('location = '+from+' { return 301 '+to+'; }');
    lines.push('location = '+from.replace(/\/$/,'')+' { return 301 '+to+'; }');
  }
  lines.push('location / { try_files $uri $uri/ =404; }');
  return Buffer.from(lines.join('\n')+'\n');
}
function main(){
  if(process.argv.length<4||!path.isAbsolute(source??'')||!path.isAbsolute(target??'')
    ||!target.endsWith('.zip')||exists(target)||source===target||options.length>1
    ||(options.length===1&&!options[0].startsWith('--expect-origin=')))
    fail('Usage: prepare-delivery.cjs /ABS/published-HTML-or-PHP-or-Next-dir /ABS/NEW-delivery.zip [--expect-origin=https://example.com]');
  inspectDir(source);
  const adapter=exists(path.join(source,'runtime-build.json'));
  const data=adapter?path.join(source,'data'):source;
  const {manifest:m,pages,redirects,sha256:manifestHash}=inspect(data);
  let technology='html',runtime=null;
  if(adapter){
    runtime=JSON.parse(fs.readFileSync(path.join(source,'runtime-build.json'),'utf8'));
    technology=runtime.technology;
    if(runtime.format!=='manufact-runtime-adapter-v1'
       ||!['php','next-static','next-ssr'].includes(technology)
       ||runtime.siteId!==m.siteId||runtime.publishedVersion!==m.publishedVersion
       ||runtime.sourceRevision!==m.sourceRevision
       ||runtime.releaseManifestSha256!==manifestHash)
      fail('adapter does not match immutable publication');
  }
  const expectation=options[0]?.slice('--expect-origin='.length);
  if(expectation&&m.publicOrigin!==expectation)fail('canonical origin differs from intended host');
  if(technology==='php'&&(!exists(path.join(source,'public/index.php'))
    ||!exists(path.join(source,'public/.htaccess'))))fail('PHP visitor entrypoint missing');
  if(technology==='next-ssr'&&(!exists(path.join(source,'package.json'))
    ||!exists(path.join(source,'app'))||!exists(path.join(source,'lib'))))
    fail('Next SSR source incomplete');
  if(technology==='next-static'&&!exists(path.join(source,'out/index.html')))
    fail('Next Static requires npm install + npm run build and out/index.html BEFORE packaging');
  if((technology==='html'||technology==='next-static')
    &&exists(path.join(technology==='html'?source:path.join(source,'out'),'.htaccess')))
    fail('pre-existing .htaccess in source must not be silently replaced');

  // Release HTML is the immutable public source of form/origin facts, including
  // for Next output. No contact is made with the collector.
  let formCount=0;
  for(const entry of m.pages){
    const html=fs.readFileSync(path.join(data,entry.file),'utf8');
    formCount+=(html.match(/<form\b/gi)||[]).length;
  }
  if(formCount&&!m.formCollector)fail('published forms lack an explicit independent HTTPS collector');
  if(formCount&&(!/^https:\/\//.test(m.formCollector)
     &&!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d{2,5})?$/.test(m.formCollector)))
    fail('invalid collector scheme');

  const redirectPairs=[...redirects.entries()];
  const entries=[];
  const add=(name,data)=>{if(!zip.nameOK(name)||!Buffer.isBuffer(data))fail('invalid handoff entry '+name);entries.push({name,data});};
  if(technology==='html'){
    for(const f of walk(source)){
      if(f.relative==='release-manifest.json')continue; // internal provenance belongs outside visitor document root
      add('deploy/'+f.relative,f.data);
    }
    add('deploy/.htaccess',apache(redirectPairs));
  }else if(technology==='php'){
    for(const f of walk(path.join(source,'data')))add('deploy/data/'+f.relative,f.data);
    for(const f of walk(path.join(source,'public')))add('deploy/public/'+f.relative,f.data);
  }else if(technology==='next-static'){
    for(const f of walk(path.join(source,'out')))add('deploy/'+f.relative,f.data);
    add('deploy/.htaccess',apache(redirectPairs));
  }else{
    // Source-only Next SSR kit. No untrusted node_modules or hidden .next build
    // artifacts are shipped as a pretend deployable runtime.
    for(const name of ['app','lib','data','public']){
      if(!exists(path.join(source,name)))fail('SSR lacks '+name);
      for(const f of walk(path.join(source,name)))add('deploy/'+name+'/'+f.relative,f.data);
    }
    for(const name of ['package.json','next.config.mjs','middleware.js']){
      if(!exists(path.join(source,name)))fail('SSR lacks '+name);
      add('deploy/'+name,fs.readFileSync(path.join(source,name)));
    }
  }
  const isStatic=technology==='html'||technology==='next-static';
  const rootHint=technology==='php'?'deploy/public':technology==='next-ssr'?'deploy (Node project)':'deploy';
  const warnings=[];
  if(!m.publicOrigin)warnings.push('Configure explicit canonical HTTPS origin and rebuild the immutable release before going live.');
  if(formCount)warnings.push('Confirm HTTPS collector and submission storage independently before going live.');
  if(isStatic&&redirectPairs.length)warnings.push('Real 301 requires Apache mod_rewrite (bundled .htaccess) or explicit Nginx rules. HTML fallback is NOT HTTP 301.');
  if(technology==='next-ssr')warnings.push('Source-only. Install dependencies, build and run on Node-capable host; NOT upload-ready. Never use on PHP-only hosting.');
  if(technology==='php')warnings.push('Only deploy/public is a document root. NEVER expose deploy/data or the package parent.');
  warnings.push('Manual owner approval, HTTPS, security headers, host routing, backups and operator smoke checks still required. This ZIP does NOT deploy.');
  const ready=technology!=='next-ssr'&&Boolean(m.publicOrigin);
  const instructions=[
    'AI SITE CMS — D4 TRANSPORT PACKAGE · NO DEPLOY',
    'Site: '+m.siteId+' · immutable publication v'+m.publishedVersion+' · source revision #'+m.sourceRevision,
    'Technology: '+technology+' · state: '+(ready?'FILE-READY / OPERATOR VALIDATION REQUIRED':'NOT DEPLOY READY'),
    'Required host document root: '+rootHint,
    'Expected public origin: '+(m.publicOrigin??'(NOT SET)'),
    'Collector: '+(m.formCollector??'(none)'),
    'URL routes: '+[...pages.keys()].join(', '),
    'Redirects: '+redirectPairs.map(([a,b])=>a+' => '+b).join(', '),
    '',
    '1. Validate the ZIP: node stage3/runtime-export/bin/verify-delivery.cjs /ABS/file.zip',
    '2. Extract ONLY into a new, isolated staging folder; never upload this entire ZIP as a public document root.',
    '3. Review hosting/HTTPS/robots/canonical and configuration examples in handoff/.',
    '4. Test each route, 301, media, mobile HTML, SEO, collector, 404 in staging.',
    '5. Production switch/rollback needs a separate authorised action; this tool never switches traffic.',
    ...(technology==='next-static'?['Next Static out/ has already been built and is copied to deploy/. Node not needed for serving.']:[]),
    ...(technology==='next-ssr'?['BEFORE HOSTING: npm install then npm run build; Node SSR required. Do not serve source as static.']:[]),
    '',...warnings.map(x=>'WARNING: '+x),''
  ].join('\n');
  add('handoff/INSTALL.txt',Buffer.from(instructions));
  add('handoff/nginx-redirects.example.conf',nginx(redirectPairs));
  add('handoff/source-release-manifest.json',fs.readFileSync(path.join(data,'release-manifest.json')));
  if(adapter)add('handoff/runtime-build.json',fs.readFileSync(path.join(source,'runtime-build.json')));

  entries.sort((a,b)=>a.name.localeCompare(b.name,'en'));
  let total=0;
  const files=entries.map(e=>{
    total+=e.data.length;
    if(total>maxBytes||entries.length+1>maxFiles)fail('delivery limit exceeded');
    return {path:e.name,bytes:e.data.length,sha256:zip.hash(e.data)};
  });
  const handoff={
    format:'manufact-delivery-handoff-v1',
    siteId:m.siteId,publishedVersion:m.publishedVersion,sourceRevision:m.sourceRevision,
    technology,readiness:ready?'files-prepared':'build-or-host-configuration-required',
    hostDocumentRoot:rootHint,publicOrigin:m.publicOrigin??null,formCollector:m.formCollector??null,
    publicationManifestSha256:manifestHash,forms:formCount,
    pages:[...pages.keys()],redirects:Object.fromEntries(redirectPairs),
    warnings,files
  };
  add('handoff/delivery-manifest.json',json(handoff));
  entries.sort((a,b)=>a.name.localeCompare(b.name,'en'));
  const bytes=zip.create(entries);
  const parent=path.dirname(target);
  if(fs.realpathSync(parent)!==parent||!fs.statSync(parent).isDirectory())fail('target parent must be canonical');
  const tmp=path.join(parent,'.stage3-delivery-'+process.pid+'-'+require('node:crypto').randomBytes(8).toString('hex'));
  try{
    fs.writeFileSync(tmp,bytes,{flag:'wx',mode:0o600});
    if(exists(target))fail('destination exists; refusing overwrite');
    fs.renameSync(tmp,target);
  }finally{if(exists(tmp))fs.rmSync(tmp,{force:true});}
  process.stdout.write(JSON.stringify({delivery:target,sha256:zip.hash(bytes),
    siteId:m.siteId,version:m.publishedVersion,technology,readiness:handoff.readiness,
    files:entries.length,bytes:bytes.length,warnings: warnings.length},null,2)+'\n');
}
try{main();}catch(e){console.error(e.message);process.exitCode=1;}
