#!/usr/bin/env node
'use strict';
// D4 one disposable end-to-end: real ZIP bytes, hosting roots, 301, D2 direct
// packaging, integrity/checksum enforcement, refusal to overwrite/lie about SSR.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),
  assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-D4-delivery-'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const make=(dir,p,data)=>{
  const full=path.join(dir,p);fs.mkdirSync(path.dirname(full),{recursive:true});
  fs.writeFileSync(full,data);return {file:p,sha256:sha(data)};
};
const script=(script,...args)=>{
  const r=spawnSync(process.execPath,['stage3/runtime-export/bin/'+script,...args],
    {cwd:root,encoding:'utf8',timeout:90000});
  return r;
};
const success=(name,...args)=>{
  const r=script(name,...args);
  assert.equal(r.status,0,name+': '+r.stderr+'\n'+r.stdout);
  return JSON.parse(r.stdout);
};
const refuses=(name,...args)=>{
  const r=script(name,...args);
  assert.notEqual(r.status,0,'must refuse '+name);
  return r.stderr;
};
function release(){
  const dir=path.join(tmp,'published');fs.mkdirSync(dir);
  const page=route=>'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Published '+route
    +'</title><link rel="canonical" href="https://example.test'+route
    +'"></head><body><h1>'+route+'</h1></body></html>';
  const home=make(dir,'index.html',page('/'));
  const about=make(dir,'about/index.html',page('/about/'));
  const old=make(dir,'old/index.html','<!doctype html><html><head><meta name="robots" content="noindex"></head><body>Old link</body></html>');
  const png=make(dir,'assets/image-abc.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y6Pe3UAAAAASUVORK5CYII=','base64'));
  const manifest={format:'manufact-ai-static-site-v1',siteId:'site-d4-shipping',
    publishedVersion:3,sourceRevision:7,publicOrigin:'https://example.test',formCollector:null,
    pages:[{path:'/',...home},{path:'/about/',...about}],
    redirects:[{from:'/old/',to:'/about/',...old}],
    assets:[{id:'image-abc',parentId:'image-abc',mime:'image/png',...png}]};
  make(dir,'release-manifest.json',JSON.stringify(manifest,null,2)+'\n');
  return dir;
}
function capsule(dir){
  let files=[];
  function crawl(p,r=''){
    for(const name of fs.readdirSync(p)){
      const f=path.join(p,name),rel=r?r+'/'+name:name;
      if(fs.statSync(f).isDirectory())crawl(f,rel);
      else {const b=fs.readFileSync(f);files.push({path:rel,base64:b.toString('base64'),sha256:sha(b)});}
    }
  }
  crawl(dir);const manifest=fs.readFileSync(path.join(dir,'release-manifest.json'));
  return {format:'manufact-runtime-handoff-v1',siteId:'site-d4-shipping',
    version:3,sourceRevision:7,manifestSha256:sha(manifest),
    rawBytes:files.reduce((s,x)=>s+Buffer.from(x.base64,'base64').length,0),files};
}
try{
  const html=release();
  const zipFile=path.join(tmp,'site-html.zip');
  const packed=success('prepare-delivery.cjs',html,zipFile,'--expect-origin=https://example.test');
  assert.equal(packed.technology,'html');assert.equal(packed.readiness,'files-prepared');
  const validated=success('verify-delivery.cjs',zipFile);
  assert.equal(validated.siteId,'site-d4-shipping');assert.equal(validated.publishedVersion,3);
  const {readArchive}=require('../lib/delivery-zip.cjs');
  const entries=readArchive(fs.readFileSync(zipFile));
  assert.equal(entries.has('deploy/release-manifest.json'),false,'No provenance JSON in document root');
  assert.ok(entries.has('deploy/about/index.html'));
  assert.match(String(entries.get('deploy/.htaccess')),/RewriteRule \^old\/\?\$ \/about\/ \[R=301,L,NE\]/);
  assert.match(String(entries.get('handoff/nginx-redirects.example.conf')),/return 301 \/about\//);
  assert.match(String(entries.get('handoff/INSTALL.txt')),/DOCUMENT|host document root|document root/i);
  assert.match(refuses('prepare-delivery.cjs',html,zipFile),/refused|overwrite/i);
  assert.match(refuses('prepare-delivery.cjs',html,path.join(tmp,'wrong.zip'),
    '--expect-origin=https://another.test'),/origin differs/);
  // One byte flip in a STORE entry must trip CRC32 even if the ZIP directory is intact.
  const tampered=Buffer.from(fs.readFileSync(zipFile));
  const magic=Buffer.from('<!doctype html>');
  const idx=tampered.indexOf(magic);
  assert.ok(idx>0);tampered[idx+6]^=2;
  const corrupt=path.join(tmp,'corrupt.zip');fs.writeFileSync(corrupt,tampered);
  assert.match(refuses('verify-delivery.cjs',corrupt),/CRC mismatch/);
  const archivePath=path.join(tmp,'handoff.json');
  fs.writeFileSync(archivePath,JSON.stringify(capsule(html)));
  // D5: one-command HTML and PHP shipment, in-file offline preflight,
  // independent operator report, atomically published output and no overwrite.
  const shippedHtml=success('ship.cjs',archivePath,'html',path.join(tmp,'shipped-html.zip'),
    '--expect-origin=https://example.test');
  const reportHtml=JSON.parse(fs.readFileSync(shippedHtml.report,'utf8'));
  assert.equal(shippedHtml.technology,'html');
  assert.equal(shippedHtml.approvalGranted,false);
  assert.equal(shippedHtml.productionDeployed,false);
  assert.equal(reportHtml.counts.blockers,0);
  assert.equal(reportHtml.stats.pages,2);
  assert.equal(reportHtml.readiness,'requires-operator-approval');
  assert.equal(success('verify-delivery.cjs',shippedHtml.zip).sha256,shippedHtml.zipSha256);
  const auditHtml=success('audit-delivery.cjs',shippedHtml.zip,
    '--expect-origin=https://example.test','--fail-on-blockers');
  assert.equal(auditHtml.counts.blockers,0);
  assert.match(refuses('ship.cjs',archivePath,'html',shippedHtml.zip),/unused absolute paths/);
  assert.match(refuses('ship.cjs',archivePath,'html',path.join(tmp,'wrong-host.zip'),
    '--expect-origin=https://bad-host.test'),/canonical origin|blocker|refused/i);
  const shippedPhp=success('ship.cjs',archivePath,'php',path.join(tmp,'shipped-php.zip'));
  assert.equal(shippedPhp.technology,'php');
  assert.equal(JSON.parse(fs.readFileSync(shippedPhp.report,'utf8')).stats.pages,2);
  assert.match(refuses('ship.cjs',archivePath,'next-static',path.join(tmp,'unsafe-next.zip')),
    /Opt in explicitly/);
  const shippedSsr=success('ship.cjs',archivePath,'next-ssr',path.join(tmp,'shipped-ssr.zip'));
  assert.equal(shippedSsr.technology,'next-ssr');
  assert.equal(shippedSsr.readiness,'blocked');
  const ssrAudit=JSON.parse(fs.readFileSync(shippedSsr.report,'utf8'));
  assert.ok(ssrAudit.findings.some(f=>f.code==='SSR_BUILD_REQUIRED'));
  assert.match(refuses('audit-delivery.cjs',shippedSsr.zip,'--fail-on-blockers'),
    /^$/);
  const oneShot=success('package-handoff.cjs',archivePath,'php',path.join(tmp,'from-d2-php.zip'));
  assert.equal(oneShot.technology,'php');assert.equal(oneShot.verified,true);
  const phpEntries=readArchive(fs.readFileSync(oneShot.delivery));
  assert.ok(phpEntries.has('deploy/public/index.php'));
  assert.ok(phpEntries.has('deploy/public/.htaccess'));
  assert.ok(phpEntries.has('deploy/data/release-manifest.json'));
  assert.ok(!phpEntries.has('deploy/public/release-manifest.json'));
  assert.equal(success('verify-delivery.cjs',oneShot.delivery).technology,'php');
  const ssrOne=success('package-handoff.cjs',archivePath,'next-ssr',path.join(tmp,'next-ssr.zip'));
  assert.equal(ssrOne.technology,'next-ssr');
  assert.equal(ssrOne.readiness,'build-or-host-configuration-required');
  const ssrContents=readArchive(fs.readFileSync(ssrOne.delivery));
  assert.ok(ssrContents.has('deploy/package.json'));
  assert.ok(ssrContents.has('deploy/middleware.js'));
  assert.equal(success('verify-delivery.cjs',ssrOne.delivery).readiness,
    'build-or-host-configuration-required');
  const staticDir=path.join(tmp,'next-static');
  assert.equal(script('build.cjs',html,'next-static',staticDir).status,0);
  assert.match(refuses('prepare-delivery.cjs',staticDir,path.join(tmp,'unbuilt-static.zip')),
    /requires npm install/);
  // Actual npm run build and emitted out/ are covered by next-probe's D4 step.
  // Invalid release (broken published asset hash) refuses before producing ZIP.
  fs.appendFileSync(path.join(html,'assets/image-abc.png'),'corruption');
  assert.match(refuses('prepare-delivery.cjs',html,path.join(tmp,'unsafe.zip')),/checksum mismatch/);
  assert.equal(fs.existsSync(path.join(tmp,'unsafe.zip')),false);
  console.log('D4 ZIP HANDOFF PASS: HTML, PHP one-shot D2, Next SSR source, 301, manifest CRC/SHA, corrupt and unbuilt refusal');
}catch(error){console.error(error);process.exitCode=1;}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
