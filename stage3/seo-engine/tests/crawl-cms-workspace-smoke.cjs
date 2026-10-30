'use strict';
/* Offline original fixture -> POLICY -> CMS implementation -> OPERATOR WORKSPACE.
 * Executes real Node modules and private FS when run by lead/full checkout.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const POLICY=require('../lib/crawl-policy.cjs');
const CMS=require('../lib/crawl-cms-implementation.cjs');
const VIEW=require('../lib/crawl-cms-implementation-view.cjs');
const PANEL=require('../lib/seo-workspace-crawl-panel.cjs');
const WORK=require('../lib/seo-operator-workspace.cjs');
const CLI=require('../bin/build-seo-operator-workspace.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const approved=BP.checkBlueprint(JSON.parse(fs.readFileSync(
 path.join(__dirname,'../fixtures/industrial.blueprint.json'),'utf8')));
const site={
 format:'manufact-ai-site-v1',schemaVersion:1,siteId:approved.siteId,
 pages:[
  ...approved.pages.map(p=>({id:p.id,path:p.path,seo:{
   title:p.seo.title,description:p.seo.description,
   robots:p.id==='page-contact'?'noindex':p.seo.robots,
   ogTitle:p.seo.ogTitle,ogDescription:p.seo.ogDescription
  },sections:[]})),
  {id:'page-extra',path:'/extra/',seo:{robots:'index'},sections:[]}
 ],
 redirects:[{from:'/',to:'/contact/'}]
};
const robotsText='User-agent: Googlebot\nDisallow: /contact/\n\nUser-agent: Bingbot\nAllow: /\n\nUser-agent: *\nAllow: /\n';
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.org/</loc></url></urlset>\n';
const policy=POLICY.analyze({blueprint:approved,base:'https://example.org/',
 robotsText,sitemapXml:xml,scope:'complete',agents:['Googlebot','Bingbot','*']});
const bluebytes=JSON.stringify(approved,null,2)+'\n',
 sitebytes=JSON.stringify(site,null,2)+'\n',
 policybytes=JSON.stringify(policy,null,2)+'\n';
const raw={blueprint:sha(bluebytes),site:sha(sitebytes),policy:sha(policybytes)};
const input={
 blueprint:approved,site,policy,blueprintRawSha256:raw.blueprint,
 siteRawSha256:raw.site
};
const result=CMS.build(input);
assert.equal(result.readOnly,true);
assert.equal(result.releaseAuthorized,false);
assert.equal(result.originalSiteAuthenticated,false);
assert.equal(result.siteId,approved.siteId);
assert.equal(result.missingPages.length,0);
assert.equal(result.extraPages.length,1);
assert.equal(result.redirectCollisions.length,1);
assert.equal(result.pages.length,approved.pages.length);
assert(result.actions.some(x=>x.category==='cms-seo-robots'&&x.pageId==='page-contact'));
assert(result.actions.some(x=>x.category==='publisher-robots-policy'&&x.pageId==='page-contact'));
assert(result.actions.some(x=>x.category==='publisher-sitemap'&&x.pageId==='page-contact'));
assert(result.actions.some(x=>x.category==='publisher-redirect-collision'&&x.priority==='P0'));
assert(result.actions.some(x=>x.category==='cms-unapproved-page'));
assert(result.actions.every(x=>x.automatic===false));
assert(result.actions.every(x=>x.taskId.startsWith('crawl-cms:')&&
 x.readyToImplement===false&&x.ownerApprovalRequired===true&&
 Array.isArray(x.evidenceRequired)&&x.evidenceRequired.length>0));
assert(result.summary.workstreams.CMS_EDITOR>=1);
assert(result.summary.workstreams.PUBLISHER_LEAD>=1);
assert.deepEqual(result.actions.map(x=>x.taskId),CMS.build(input).actions.map(x=>x.taskId));
const viewed=VIEW.render(result);
assert(viewed.html.includes('default-src &#39;none&#39;'));
assert(viewed.html.includes('crawl-cms-worklist.md'));
assert(viewed.markdown.includes('robots.txt'));
assert.throws(()=>CMS.build({...input,blueprintRawSha256:'bad'}),/SHA256/);
assert.throws(()=>CMS.build({...input,site:{...site,siteId:'other'}}),/Site v1 format/);
assert.throws(()=>CMS.build({...input,policy:{...policy,blueprintSha256:'f'.repeat(64)}}),/canonical approved Blueprint/);
assert.throws(()=>CMS.build({...input,site:{...site,pages:[site.pages[0],site.pages[0]]}}),/duplicate/);
const crawl={policy,cmsBlueprint:approved,cmsSite:site,
 digests:{policy:raw.policy,cmsBlueprint:raw.blueprint,cmsSite:raw.site}};
const panel=PANEL.build(crawl);
assert(panel.cmsReview);
assert(panel.cmsView.html.includes('Prioritized owner'));
assert(panel.html.includes('crawl-cms.html'));
assert.equal(panel.overview.cmsImplementationIncluded,true);
const workspace=WORK.build({crawl});
assert.equal(workspace.overview.crawlCmsImplementationIncluded,true);
assert(workspace.crawlCmsHtml.includes('Site v1'));
assert(workspace.crawlCmsJson.includes('manufact-seo-crawl-cms-implementation-v1'));
assert(workspace.crawlCmsMarkdown.includes('publisher worklist'));
assert.equal(workspace.overview.releaseAuthorized,false);
/* CLI uses real private original input files; no report is inside checkout. */
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-crawl-cms-'));
try{
 const inputFiles={
  policy:path.join(temp,'crawl-policy.json'),
  cmsBlueprint:path.join(temp,'approved-blueprint.json'),
  cmsSite:path.join(temp,'owner-site.json')
 };
 fs.writeFileSync(inputFiles.policy,policybytes);
 fs.writeFileSync(inputFiles.cmsBlueprint,bluebytes);
 fs.writeFileSync(inputFiles.cmsSite,sitebytes);
 const config={format:CLI.CONFIG,crawl:inputFiles};
 const file=path.join(temp,'configuration.json');
 fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');
 const out=path.join(temp,'new-workspace');
 CLI.main(['--config',file,'--out',out]);
 for(const name of ['index.html','crawl.html','crawl-cms.html','crawl-cms-worklist.md',
  'crawl-cms-worklist.json','workspace-manifest.json']){
  assert(fs.existsSync(path.join(out,name)),name+' absent');
 }
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'workspace-manifest.json'),'utf8'));
 assert.equal(manifest.overview.crawlCmsImplementationIncluded,true);
 assert.equal(manifest.crawlEvidence.originalBlueprintFileSha256,raw.blueprint);
 assert.equal(manifest.releaseAuthorized,false);
 assert.equal(manifest.inputSHA256.crawl.cmsSite,raw.site);
 const saved=JSON.parse(fs.readFileSync(path.join(out,'crawl-cms-worklist.json'),'utf8'));
 assert.equal(saved.originalSiteRawSha256,raw.site);
 assert.equal(saved.automaticApplication,false);
 assert.throws(()=>CLI.main(['--config',file,'--out',out]),/already exists|occupied/i);
 assert.throws(()=>CLI.readConfiguration({format:CLI.CONFIG,
  crawl:{policy:inputFiles.policy,cmsBlueprint:inputFiles.cmsBlueprint}}),/both original Blueprint and Site v1/);
 const other=path.join(temp,'refused');
 fs.writeFileSync(inputFiles.cmsSite,JSON.stringify({...site,siteId:'different'})+'\n');
 assert.throws(()=>CLI.main(['--config',file,'--out',other]),/Site v1 format|source mismatch/);
 assert.equal(fs.existsSync(other),false);
}finally{fs.rmSync(temp,{force:true,recursive:true});}
process.stdout.write('Real Node Crawl -> CMS source-bound Operator Workspace smoke PASS.\n');
