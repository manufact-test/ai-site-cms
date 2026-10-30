'use strict';
/* Two full private Node commands on temporary local files; no actual public network. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),
 path=require('node:path'),cp=require('node:child_process');
const BP=require('../lib/blueprint.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-crawl-policy-'));
const single=path.join(__dirname,'../bin/review-crawl-policy.cjs');
const compare=path.join(__dirname,'../bin/compare-crawl-policy.cjs');
const run=(file,params)=>cp.spawnSync(process.execPath,[file,...params],
 {encoding:'utf8',timeout:15000});
const save=(name,content)=>{const file=path.join(root,name);fs.writeFileSync(file,content);return file;};
try{
 const brief=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
 const bp=save('blueprint.json',JSON.stringify(BP.compileBrief(brief)));
 const base='https://demo.example/';
 const sitemap='<?xml version="1.0"?><urlset><url><loc>https://demo.example/</loc></url>'+
  '<url><loc>https://demo.example/contact/</loc></url></urlset>';
 const beforeRobots=save('robots-old.txt','User-agent: *\nAllow: /\nSitemap: https://demo.example/sitemap.xml\n');
 const afterRobots=save('robots-new.txt','User-agent: Googlebot\nDisallow: /\n'+
  'User-agent: *\nAllow: /\nSitemap: https://demo.example/sitemap.xml\n');
 const beforeXml=save('sitemap-old.xml',sitemap);
 const afterXml=save('sitemap-new.xml',sitemap.replace(
  '<url><loc>https://demo.example/contact/</loc></url>',''));
 const singlePath=path.join(root,'single-report');
 const s=run(single,['--blueprint',bp,'--robots',beforeRobots,'--sitemap',beforeXml,
  '--base',base,'--out',singlePath]);
 assert.equal(s.status,0,s.stderr);
 const initial=JSON.parse(fs.readFileSync(path.join(singlePath,'CRAWL-POLICY-REPORT.json'),'utf8'));
 assert.equal(initial.summary.canonicalIndexable,2);
 assert.equal(initial.publicationAuthorized,false);
 assert.equal(initial.summary.networkRequests,0);
 assert(fs.readFileSync(path.join(singlePath,'index.html'),'utf8').includes('Crawl Policy Review'));
 assert(!fs.readFileSync(path.join(singlePath,'index.html'),'utf8').includes('<script'));
 const deltaDir=path.join(root,'delta');
 const command=['--blueprint',bp,'--before-robots',beforeRobots,'--before-sitemap',beforeXml,
  '--after-robots',afterRobots,'--after-sitemap',afterXml,'--base',base,'--out',deltaDir];
 const c=run(compare,command);assert.equal(c.status,0,c.stderr);
 const delta=JSON.parse(fs.readFileSync(path.join(deltaDir,'CRAWL-REGRESSION.json'),'utf8'));
 assert.equal(delta.summary.newGoogleBlocks,2);
 assert.equal(delta.summary.indexableSitemapOmissions,1);
 assert.equal(delta.publicationAuthorized,false);
 const manifest=JSON.parse(fs.readFileSync(path.join(deltaDir,'SOURCE-MANIFEST.json'),'utf8'));
 assert.equal(manifest.realNetworkRequests,0);
 assert.equal(manifest.publicHostAuthenticated,false);
 assert(fs.readFileSync(path.join(deltaDir,'index.html'),'utf8').includes('Crawl Policy Regression'));
 assert.notEqual(run(compare,command).status,0,'Never overwrite an existing private report');
 assert.notEqual(run(single,['--blueprint',bp,'--robots',beforeRobots,'--sitemap',beforeXml,
  '--base',base,'--out',singlePath]).status,0);
 const forged=save('unsafe.xml','<!DOCTYPE r [ <!ENTITY steal SYSTEM "file:///etc/passwd"> ]><urlset></urlset>');
 const rejected=path.join(root,'rejected');
 assert.notEqual(run(single,['--blueprint',bp,'--robots',beforeRobots,'--sitemap',forged,
  '--base',base,'--out',rejected]).status,0);
 assert(!fs.existsSync(rejected),'No partial or public-output directory on rejected evidence');
 assert.notEqual(run(single,['--blueprint',path.join(__dirname,'../fixtures/industrial.brief.json'),
  '--robots',beforeRobots,'--sitemap',beforeXml,'--base',base,
  '--out',path.join(root,'repo-input')]).status,0,'Private source cannot live inside checkout');
 const mismatch=path.join(root,'bad-origin');
 assert.notEqual(run(single,['--blueprint',bp,'--robots',beforeRobots,'--sitemap',beforeXml,
  '--base','http://demo.example/','--out',mismatch]).status,0);
 assert(!fs.existsSync(mismatch));
 console.log('Crawl policy private Node CLI: two full reports, source pins, XEE rejection and atomicity PASS.');
}finally{fs.rmSync(root,{recursive:true,force:true});}
