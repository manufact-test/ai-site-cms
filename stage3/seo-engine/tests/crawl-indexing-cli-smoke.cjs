'use strict';
/* Real offline private CLI path; no authenticated client, no Google API and no HTTP. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),crypto=require('node:crypto'),cp=require('node:child_process');
const BP=require('../lib/blueprint.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-crawl-indexing-'));
const cli=path.join(__dirname,'../bin/correlate-crawl-indexing.cjs');
const sha=txt=>crypto.createHash('sha256').update(txt).digest('hex');
const save=(name,content)=>{const file=path.join(dir,name);fs.writeFileSync(file,content);return file;};
const run=args=>cp.spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:15000});
try{
 const brief=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
 const plan=BP.compileBrief(brief),compiled=JSON.stringify(plan);
 const bp=save('blueprint.json',compiled);
 const robots=save('robots.txt','User-agent: Googlebot\nDisallow: /contact/\nAllow: /\n'+
  'User-agent: *\nAllow: /\nSitemap: https://demo.example/sitemap.xml\n');
 const sitemap=save('sitemap.xml','<?xml version="1.0"?><urlset>'+
  '<url><loc>https://demo.example/</loc></url>'+
  '<url><loc>https://demo.example/contact/</loc></url></urlset>');
 const originalReport={
  format:'manufact-seo-indexing-intelligence-v1',version:1,
  siteId:plan.siteId,readOnly:true,blueprintSha256:sha(compiled),
  publicOrigin:'https://demo.example/',
  gscProperty:'sc-domain:demo.example',
  observedAt:'2026-10-30',exportScope:'selected-urls',
  pages:plan.pages.map(p=>({pageId:p.id,path:p.path,
   observationStatus:p.id==='page-contact'?'not-indexed':'indexed',
   indexingEvidenceProvided:true,
   observationReason:p.id==='page-contact'?'Crawl not recorded':''}))
 };
 const indexing=save('indexing.json',JSON.stringify(originalReport));
 const reportDir=path.join(dir,'report');
 const args=['--blueprint',bp,'--robots',robots,'--sitemap',sitemap,
  '--indexing',indexing,'--base','https://demo.example/','--out',reportDir];
 const ok=run(args);assert.equal(ok.status,0,ok.stderr);
 const report=JSON.parse(fs.readFileSync(path.join(reportDir,'CRAWL-INDEXING-CORRELATION.json')));
 assert.equal(report.summary.needsUrgentInspection,1);
 assert.equal(report.summary.operatorTasks,1);
 assert.equal(report.publicationAuthorized,false);
 assert.equal(report.causalExplanationEstablished,false);
 assert.equal(report.summary.networkRequests,0);
 const manifest=JSON.parse(fs.readFileSync(path.join(reportDir,'SOURCE-MANIFEST.json')));
 assert.equal(manifest.googleDataAuthenticated,false);
 assert.equal(manifest.releaseAuthorized,false);
 assert.equal(manifest.sourceSha256.blueprint,sha(compiled));
 assert(fs.readFileSync(path.join(reportDir,'index.html'),'utf8').includes('Search Indexing + Crawler Policy'));
 assert(!fs.readFileSync(path.join(reportDir,'index.html'),'utf8').includes('<script'));
 assert.notEqual(run(args).status,0,'Cannot overwrite an existing private dossier');
 const wrong=JSON.parse(JSON.stringify(originalReport));wrong.blueprintSha256='f'.repeat(64);
 fs.writeFileSync(indexing,JSON.stringify(wrong));
 const rejected=path.join(dir,'rejected');
 assert.notEqual(run([...args.slice(0,-1),rejected]).status,0);
 assert(!fs.existsSync(rejected),'Wrong-source analysis must leave no partial output');
 assert.notEqual(run(['--blueprint',path.join(__dirname,'../fixtures/industrial.brief.json'),
  '--robots',robots,'--sitemap',sitemap,'--indexing',indexing,'--base',
  'https://demo.example/','--out',path.join(dir,'checkout-input')]).status,0,
  'No private input from Git checkout');
 console.log('Crawl/indexing private Node CLI: exact Blueprint source, atomicity, guardrails PASS.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
