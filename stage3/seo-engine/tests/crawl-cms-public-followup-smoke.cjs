'use strict';
/* Real Node offline post-publication SEO observation smoke with private CLI.
 * Deterministic synthetic transcripts, no network, CMS writes or client data.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const POLICY=require('../lib/crawl-policy.cjs');
const CMS=require('../lib/crawl-cms-implementation.cjs');
const LIFE=require('../lib/crawl-cms-lifecycle.cjs');
const FOLLOW=require('../lib/crawl-cms-public-followup.cjs');
const VIEW=require('../lib/crawl-cms-public-followup-view.cjs');
const WORK=require('../lib/seo-operator-workspace.cjs');
const CLI=require('../bin/review-crawl-public-fixes.cjs');
const h=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=o=>JSON.stringify(o,null,2)+'\n';
const bp=BP.checkBlueprint(JSON.parse(fs.readFileSync(
 path.join(__dirname,'../fixtures/industrial.blueprint.json'),'utf8')));
const base='https://example.org/';
const bbytes=json(bp);
const blocked='User-agent: Googlebot\nDisallow: /contact/\n\nUser-agent: Bingbot\nAllow: /\n\nUser-agent: *\nAllow: /\n';
const allowed='User-agent: Googlebot\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\n\nUser-agent: *\nAllow: /\n';
const xml=entries=>'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
 entries.map(s=>'<url><loc>'+base+s.slice(1)+'</loc></url>').join('\n')+'\n</urlset>\n';
const originalXml=xml(['/']);
const fullXml=xml(['/','/contact/']);
const plan=POLICY.analyze({blueprint:bp,base,robotsText:blocked,sitemapXml:originalXml,
 agents:['Googlebot','Bingbot','*'],scope:'complete'});
const site={format:'manufact-ai-site-v1',schemaVersion:1,siteId:bp.siteId,
 pages:bp.pages.map(p=>({id:p.id,path:p.path,seo:{...p.seo}})),
 redirects:[{from:'/',to:'/contact/'}]};
const contact=site.pages.find(x=>x.id==='page-contact');
contact.seo.robots='noindex';
contact.seo.title='Owner placeholder title';
const sbytes=json(site);
const work=CMS.build({blueprint:bp,blueprintRawSha256:h(bbytes),site,
 siteRawSha256:h(sbytes),policy:plan});
const workbytes=json(work);
const expected=url=>base+url.slice(1);
function page(p,settings={}){
 const seo=bp.pages.find(x=>x.id===p.id).seo;
 const full='<html lang="ru"><head><title>'+
  (settings.title||seo.title)+'</title><meta name="description" content="'+seo.description+'">'+
  '<meta name="robots" content="'+(settings.robots||'index,follow')+'">'+
  '<meta property="og:title" content="'+seo.ogTitle+'">'+
  '<meta property="og:description" content="'+seo.ogDescription+'">'+
  '<link rel="canonical" href="'+expected(p.path)+'"></head><body><h1>Example</h1></body></html>';
 return {id:p.id,path:p.path,requestUrl:expected(p.path),responseUrl:expected(p.path),
  status:200,headers:{'content-type':'text/html; charset=utf-8'},html:full};
}
const capture=(robots=allowed,sitemap=fullXml,pages=site.pages.map(p=>page(p)))=>({
 format:'manufact-seo-delivery-evidence-v1',siteId:bp.siteId,origin:base,
 capturedAt:'2026-10-30T15:00:00Z',pages,
 robots:{status:200,url:expected('/robots.txt'),contentType:'text/plain',body:robots},
 sitemap:{status:200,url:expected('/sitemap.xml'),contentType:'application/xml',body:sitemap},
 redirects:[]
});
const source=capture();
const rawCapture=json(source);
const inputs={worklist:work,worklistSha256:h(workbytes),
 blueprint:bp,blueprintRawSha256:h(bbytes),
 site,siteRawSha256:h(sbytes),capture:source,captureRawSha256:h(rawCapture)};
const report=FOLLOW.review(inputs);
assert.equal(report.readOnly,true);
assert.equal(report.releaseAuthorized,false);
assert.equal(report.publicHostAuthenticated,false);
assert.equal(report.automaticTaskClosure,false);
assert(report.summary.alignedNotVerified>=3);
assert(report.tasks.some(t=>t.category==='publisher-robots-policy'&&
 t.status==='OBSERVED-ALIGNED-NOT-VERIFIED'));
assert(report.tasks.some(t=>t.category==='publisher-sitemap'&&
 t.status==='OBSERVED-ALIGNED-NOT-VERIFIED'));
assert(report.tasks.some(t=>t.category==='cms-seo-robots'&&
 t.status==='OBSERVED-ALIGNED-NOT-VERIFIED'));
assert(report.tasks.some(t=>t.category==='publisher-redirect-collision'&&
 t.status==='OBSERVED-ALIGNED-NOT-VERIFIED'));
assert(report.policy.robotsParsed===true);
assert(report.policy.sitemapParsed===true);
const failing=FOLLOW.review({...inputs,capture:capture(blocked,originalXml),
 captureRawSha256:h(json(capture(blocked,originalXml)))});
assert(failing.summary.conflict>=2);
assert(failing.tasks.some(t=>t.category==='publisher-robots-policy'&&
 t.status==='OBSERVED-CONFLICT'));
assert(failing.tasks.some(t=>t.category==='publisher-sitemap'&&
 t.status==='OBSERVED-CONFLICT'));
/* A missing sitemap does not invalidate the still assessable robots.txt body. */
const partial=capture();
delete partial.sitemap;
const partly=FOLLOW.review({...inputs,capture:partial,captureRawSha256:h(json(partial))});
assert(partly.tasks.some(t=>t.category==='publisher-robots-policy'&&
 t.status==='OBSERVED-ALIGNED-NOT-VERIFIED'));
assert(partly.tasks.some(t=>t.category==='publisher-sitemap'&&
 t.status==='INSUFFICIENT-EVIDENCE'));
const missingHtml=capture(allowed,fullXml,site.pages.map(p=>({...page(p),html:''})));
const noHtml=FOLLOW.review({...inputs,capture:missingHtml,captureRawSha256:h(json(missingHtml))});
assert(noHtml.tasks.some(t=>t.category==='cms-seo-robots'&&t.status==='INSUFFICIENT-EVIDENCE'));
/* Mixed deployment window and SPA fallback cannot masquerade as resolved SEO. */
const inconsistent=capture(),rootPage=inconsistent.pages.find(x=>x.path==='/');
inconsistent.rootRecheck={
 requestUrl:rootPage.requestUrl,firstStatus:rootPage.status,secondStatus:200,
 initialHtmlSha256:h(rootPage.html),finalHtmlSha256:h('changed HTTP root'),
 matched:false,sourceRevisionAuthenticated:false,publicHostProvenanceAuthenticated:false
};
const mixed=FOLLOW.review({...inputs,capture:inconsistent,captureRawSha256:h(json(inconsistent))});
assert.equal(mixed.summary.alignedNotVerified,0);
assert.equal(mixed.summary.unknown,work.actions.length);
assert(mixed.independentDeliveryBlockers.some(x=>x.code==='delivery:public-capture-window-drift'));
const spaFallback=capture();
spaFallback.negativeProbe={
 path:'/cms-seo-nonexistent-'+bp.siteId+'/',
 requestUrl:base+'cms-seo-nonexistent-'+bp.siteId+'/',
 status:200,contentType:'text/html',bodySha256:h('<html>fallback</html>')
};
const soft404=FOLLOW.review({...inputs,capture:spaFallback,captureRawSha256:h(json(spaFallback))});
assert(soft404.tasks.some(x=>x.category==='publisher-redirect-collision'&&
 x.status==='INSUFFICIENT-EVIDENCE'));
assert(soft404.independentDeliveryBlockers.some(x=>x.code==='delivery:soft-404-unknown-route'));

const badCapture=capture();
badCapture.origin='https://attacker.example/';
assert.throws(()=>FOLLOW.review({...inputs,capture:badCapture}),/mount/);
assert.throws(()=>FOLLOW.review({...inputs,siteRawSha256:'f'.repeat(64)}),
 /original Blueprint\/Site v1 bytes/);
assert.throws(()=>FOLLOW.review({...inputs,worklist:{...work,siteId:'else'}}),
 /same client|Blueprint/i);
const recheck=LIFE.compare(work,h(workbytes),work,h(workbytes));
const withRecheck=FOLLOW.review({...inputs,latestRecheck:recheck,
 latestRecheckRawSha256:h(json(recheck))});
assert.equal(withRecheck.sourceLatestRecheckRawSha256,h(json(recheck)));
assert.throws(()=>FOLLOW.review({...inputs,latestRecheck:{...recheck,sourceAfterRawSha256:'f'.repeat(64)},
 latestRecheckRawSha256:h(json(recheck))}),/exact current worklist/);
const view=VIEW.render(report);
assert(view.html.includes('default-src &#39;none&#39;'));
assert(view.markdown.includes('NOT VERIFIED')||view.markdown.includes('UNVERIFIED'));
assert(!view.html.includes('<script>'));
const workspace=WORK.build({crawl:{policy:plan,cmsBlueprint:bp,cmsSite:site,
 publicCapture:source,digests:{policy:h(json(plan)),cmsBlueprint:h(bbytes),
  cmsSite:h(sbytes),publicCapture:h(rawCapture)}}});
assert(workspace.crawlPublicFollowupHtml.includes('public HTTPS'));
assert(workspace.crawlPublicFollowupJson.includes('"suppliedPublicCaptureRawSha256"'));
assert(workspace.homeHtml.includes('crawl-public-followup.html'));
assert.equal(workspace.overview.crawlPublicFollowupIncluded,true);
assert.equal(workspace.overview.releaseAuthorized,false);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-crawl-public-review-'));
try{
 const save=(name,bytes)=>{const out=path.join(temp,name);fs.writeFileSync(out,bytes);return out;};
 const files={work:save('work.json',workbytes),bp:save('bp.json',bbytes),
  site:save('site.json',sbytes),http:save('http.json',rawCapture),
  recheck:save('recheck.json',json(recheck))};
 const cliArgs=['--worklist',files.work,'--blueprint',files.bp,
  '--site',files.site,'--public-http',files.http];
 const destination=path.join(temp,'PRIVATE-review');
 CLI.main([...cliArgs,'--recheck',files.recheck,'--out',destination]);
 for(const name of ['crawl-public-followup.html','crawl-public-followup.md',
  'crawl-public-followup.json','PRIVATE-SOURCE-MANIFEST.json','PRIVATE-README.txt'])
  assert(fs.existsSync(path.join(destination,name)),name+' missing');
 const saved=JSON.parse(fs.readFileSync(path.join(destination,'crawl-public-followup.json')));
 const manifest=JSON.parse(fs.readFileSync(path.join(destination,'PRIVATE-SOURCE-MANIFEST.json')));
 assert.equal(saved.summary.alignedNotVerified,report.summary.alignedNotVerified);
 assert.equal(manifest.inputSHA256['--public-http'],h(rawCapture));
 assert.equal(manifest.releaseAuthorized,false);
 assert.throws(()=>CLI.main([...cliArgs,'--out',destination]),/already exists|overwrite/i);
 const corruptSite=save('bad-site.json',json({...site,siteId:'other'}));
 const denied=path.join(temp,'MUST-NOT-EXIST');
 assert.throws(()=>CLI.main(['--worklist',files.work,'--blueprint',files.bp,
  '--site',corruptSite,'--public-http',files.http,'--out',denied]),/Site v1|Blueprint/i);
 assert.equal(fs.existsSync(denied),false);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
process.stdout.write('Real Node private post-publication crawl CMS follow-up smoke PASS.\n');
