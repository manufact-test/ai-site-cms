#!/usr/bin/env node
'use strict';
/** D4 offline, hostile-input-aware ZIP verifier: CRC32 + per-file SHA256,
 * pinned publication, exact file list and deployment-root contract.
 */
const fs=require('node:fs'),path=require('node:path');
const zip=require('../lib/delivery-zip.cjs');
const die=m=>{throw Error('D4 delivery verification failed: '+m);};
function inspect(file){
  if(!path.isAbsolute(file)||!fs.statSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())die('ordinary absolute archive required');
  const raw=fs.readFileSync(file),entries=zip.readArchive(raw);
  const manifestFile='handoff/delivery-manifest.json';
  if(!entries.has(manifestFile))die('missing delivery manifest');
  const meta=JSON.parse(entries.get(manifestFile).toString('utf8'));
  if(meta.format!=='manufact-delivery-handoff-v1'
     ||!(/^[a-z][a-z0-9-]{2,79}$/).test(meta.siteId)
     ||!Number.isSafeInteger(meta.publishedVersion)||meta.publishedVersion<1
     ||!Number.isSafeInteger(meta.sourceRevision)||meta.sourceRevision<1
     ||!['html','php','next-static','next-ssr'].includes(meta.technology)
     ||!['files-prepared','build-or-host-configuration-required'].includes(meta.readiness)
     ||!Array.isArray(meta.files)||meta.files.length>4000
     ||!Array.isArray(meta.pages)||!meta.pages.includes('/')
     ||!Array.isArray(meta.warnings)||typeof meta.redirects!=='object'||!meta.redirects
     ||!(/^[a-f0-9]{64}$/).test(meta.publicationManifestSha256))
    die('invalid delivery metadata contract');
  if(meta.technology==='next-ssr'&&meta.readiness==='files-prepared')die('SSR source incorrectly marked deploy-ready');
  const expectedRoot=meta.technology==='php'?'deploy/public':meta.technology==='next-ssr'?'deploy (Node project)':'deploy';
  if(meta.hostDocumentRoot!==expectedRoot)die('invalid document root');
  if(meta.readiness==='files-prepared'&&(!meta.publicOrigin||meta.technology==='next-ssr'))
    die('missing production origin or unbuilt SSR');
  const listed=new Set([manifestFile]);let total=0;
  for(const item of meta.files){
    if(!item||!zip.nameOK(item.path)||listed.has(item.path)
       ||!Number.isSafeInteger(item.bytes)||item.bytes<0
       ||!(/^[a-f0-9]{64}$/).test(item.sha256))die('unsafe manifest inventory');
    const bytes=entries.get(item.path);
    if(!bytes||bytes.length!==item.bytes||zip.hash(bytes)!==item.sha256)
      die('missing, changed or corrupted file: '+item.path);
    listed.add(item.path);total+=item.bytes;
    if(total>180000000)die('inventory size exceeded');
  }
  if(listed.size!==entries.size)die('ZIP contains unlisted paths');
  const snapshot=entries.get('handoff/source-release-manifest.json');
  if(!snapshot||zip.hash(snapshot)!==meta.publicationManifestSha256)die('published source identity mismatch');
  const publication=JSON.parse(snapshot.toString('utf8'));
  if(publication.format!=='manufact-ai-static-site-v1'
    ||publication.siteId!==meta.siteId
    ||publication.publishedVersion!==meta.publishedVersion
    ||publication.sourceRevision!==meta.sourceRevision
    ||publication.publicOrigin!==meta.publicOrigin
    ||(publication.formCollector??null)!==(meta.formCollector??null))
    die('published identity differs from transport manifest');
  if(JSON.stringify(publication.pages.map(p=>p.path))!==JSON.stringify(meta.pages)
    ||JSON.stringify(Object.fromEntries(publication.redirects.map(r=>[r.from,r.to])))!==JSON.stringify(meta.redirects))
    die('route inventory differs from immutable publication');
  if(!entries.has('handoff/INSTALL.txt')||!entries.has('handoff/nginx-redirects.example.conf'))
    die('missing deployment/operator instructions');
  if(meta.technology==='html'){
    if(!entries.has('deploy/index.html')||!entries.has('deploy/.htaccess')
       ||entries.has('deploy/release-manifest.json'))
      die('HTML handover root invalid or exposed provenance');
    for(const p of publication.pages)if(!entries.has('deploy/'+p.file)||zip.hash(entries.get('deploy/'+p.file))!==p.sha256)
      die('published HTML page mismatch: '+p.path);
  }
  if(meta.technology==='php'){
    if(!entries.has('deploy/public/index.php')||!entries.has('deploy/public/.htaccess')
      ||!entries.has('deploy/data/release-manifest.json'))
      die('PHP public/private boundary incomplete');
    if(zip.hash(entries.get('deploy/data/release-manifest.json'))!==meta.publicationManifestSha256)
      die('private PHP snapshot changed');
    for(const p of publication.pages)if(zip.hash(entries.get('deploy/data/'+p.file)||Buffer.alloc(0))!==p.sha256)
      die('private PHP page changed: '+p.path);
  }
  if(meta.technology==='next-static'){
    if(!entries.has('deploy/index.html')||!entries.has('deploy/.htaccess')
       ||!entries.has('handoff/runtime-build.json'))
      die('Next Static has no build output or rewrite rules');
  }
  if(meta.technology==='next-ssr'&&(!entries.has('deploy/package.json')||!entries.has('deploy/middleware.js')
    ||!entries.has('deploy/data/release-manifest.json')||!entries.has('handoff/runtime-build.json')
    ||[...entries.keys()].some(n=>n.startsWith('deploy/node_modules/')||n.startsWith('deploy/.next/'))))
    die('Next SSR source-only package contract failed');
  for(const a of publication.assets)
    if(!entries.has((meta.technology==='php'?'deploy/data/':meta.technology==='next-ssr'?'deploy/data/':'deploy/')+a.file))
      die('published media missing: '+a.file);
  return {sha256:zip.hash(raw),format:meta.format,technology:meta.technology,
    siteId:meta.siteId,publishedVersion:meta.publishedVersion,
    readiness:meta.readiness,files:entries.size,bytes:raw.length,
    formCount:meta.forms,redirects:Object.keys(meta.redirects).length};
}
try{
  if(process.argv.length!==3)die('Usage: verify-delivery.cjs ABSOLUTE-delivery.zip');
  process.stdout.write(JSON.stringify(inspect(process.argv[2]),null,2)+'\n');
}catch(error){console.error(error.message);process.exitCode=1;}
module.exports={inspect};
