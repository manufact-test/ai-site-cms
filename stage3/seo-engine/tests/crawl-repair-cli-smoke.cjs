'use strict';
/* Full real Node CLI on temporary private originals; no Git inputs, public deploy or API. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const CLI=path.join(__dirname,'../bin/prepare-crawl-repair.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-seo-repair-'));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const file=(name,content)=>{const p=path.join(root,name);fs.writeFileSync(p,content);return p;};
const run=argv=>cp.spawnSync(process.execPath,[CLI,...argv],{
 encoding:'utf8',timeout:15000});
try{
 const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
 const approved=BP.compileBrief(raw);
 const current=JSON.parse(fs.readFileSync(path.join(__dirname,'../../fixtures/industrial-site.json'),'utf8'));
 const bp=file('approved-blueprint.json',JSON.stringify(approved));
 const site=file('current-site.json',JSON.stringify(current));
 const robots=file('robots-original.txt',
  'User-agent: *\nAllow: /\nDisallow: /contact/\nSitemap: https://demo.example/sitemap.xml\n\n'+
  'User-agent: Googlebot\nDisallow: /contact/\nAllow: /\n');
 const xml=file('sitemap-original.xml',
  '<?xml version="1.0"?><urlset><url><loc>https://demo.example/</loc></url></urlset>');
 const out=path.join(root,'candidate');
 const flags=['--blueprint',bp,'--site',site,'--robots',robots,'--sitemap',xml,
  '--base','https://demo.example/','--out',out,'--allow-page-ids','page-contact',
  '--agents','Googlebot'];
 const result=run(flags);assert.equal(result.status,0,result.stderr);
 const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
 assert(html.includes('Search Delivery Repair Candidate'));
 assert(html.includes('RELEASE AUTHORIZATION: FALSE'));
 assert(!html.includes('<script'));
 const candidate=fs.readFileSync(path.join(out,'PROPOSED-robots.txt'),'utf8');
 assert(candidate.includes('Allow: /contact/$'));
 const sitemap=fs.readFileSync(path.join(out,'PROPOSED-sitemap.xml'),'utf8');
 assert(sitemap.includes('https://demo.example/contact/'));
 assert(!sitemap.includes('<lastmod>'));
 const report=JSON.parse(fs.readFileSync(path.join(out,'CRAWL-REPAIR-PLAN.json')));
 assert.equal(report.summary.successfullyUnblocked,1);
 assert.equal(report.summary.newDisallowedApprovedPages,0);
 assert.equal(report.releaseAuthorized,false);
 assert(!Object.hasOwn(report,'proposedRobots'),'Generated draft bytes stay in separate original files');
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'SOURCE-MANIFEST.json')));
 assert.equal(manifest.proposedRobotsSha256,sha(candidate));
 assert.equal(manifest.proposedSitemapSha256,sha(sitemap));
 assert.equal(manifest.sourceRawSha256.blueprint,sha(fs.readFileSync(bp)));
 assert.equal(manifest.ownerApprovalAuthenticated,false);
 assert.equal(manifest.hostWrites,0);
 assert.notEqual(run(flags).status,0,'Never overwrite an existing private proposal');
 const stale=JSON.parse(JSON.stringify(current));stale.pages[1].path='/owner-changed/';
 fs.writeFileSync(site,JSON.stringify(stale));
 const rejected=path.join(root,'stale-refused');
 const newFlags=flags.map((v,i)=>i===flags.indexOf('--out')+1?rejected:v);
 assert.notEqual(run(newFlags).status,0,'Changed published pages cannot be used for candidate');
 assert(!fs.existsSync(rejected));
 fs.writeFileSync(site,JSON.stringify(current));
 const unsafe=path.join(root,'checkout-source-refused');
 const unsafeFlags=[...flags];
 unsafeFlags[unsafeFlags.indexOf('--blueprint')+1]=path.join(__dirname,'../fixtures/industrial.brief.json');
 unsafeFlags[unsafeFlags.indexOf('--out')+1]=unsafe;
 assert.notEqual(run(unsafeFlags).status,0,'Original private source cannot be inside Git checkout');
 assert(!fs.existsSync(unsafe));
 const noGo=path.join(root,'noindex-target-refused');
 const noindexRaw=JSON.parse(JSON.stringify(raw));noindexRaw.pages[1].seo.robots='noindex';
 const excludedBp=file('blueprint-noindex.json',JSON.stringify(BP.compileBrief(noindexRaw)));
 const excludedSite=JSON.parse(JSON.stringify(current));
 excludedSite.pages[1].seo={robots:'noindex'};
 const excludedSitePath=file('site-noindex.json',JSON.stringify(excludedSite));
 const excluded=[...flags];excluded[excluded.indexOf('--blueprint')+1]=excludedBp;
 excluded[excluded.indexOf('--site')+1]=excludedSitePath;
 excluded[excluded.indexOf('--out')+1]=noGo;
 assert.notEqual(run(excluded).status,0,'No robot Allow candidates for planned noindex pages');
 assert(!fs.existsSync(noGo));
 console.log('SEO Crawl Repair CLI: originals, atomic output, safe agents, hashing, noindex/stale-site refusals PASS.');
}finally{fs.rmSync(root,{recursive:true,force:true});}
