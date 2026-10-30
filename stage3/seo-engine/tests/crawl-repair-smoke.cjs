'use strict';
/* Real public-policy analyzer + owner-parity candidate; no automated deployment. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const BP=require('../lib/blueprint.cjs');
const R=require('../lib/crawl-repair-planner.cjs');
const VIEW=require('../lib/crawl-repair-view.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
const blueprint=BP.compileBrief(fixture);
const site=JSON.parse(fs.readFileSync(path.join(__dirname,'../../fixtures/industrial-site.json'),'utf8'));
const base='https://demo.example/';
const robots='User-agent: *\nAllow: /\nDisallow: /contact/\n'+
 'Sitemap: https://demo.example/sitemap.xml\n\n'+
 'User-agent: Googlebot\nDisallow: /contact/\nAllow: /\n';
const oldXml='<?xml version="1.0"?><urlset><url><loc>https://demo.example/</loc></url></urlset>';
const options={base,robotsText:robots,sitemapXml:oldXml,allowPageIds:['page-contact'],
 agents:['Googlebot']};
const plan=R.repair(blueprint,site,options);
assert.equal(plan.format,R.FORMAT);
assert.equal(plan.readOnly,true);
assert.equal(plan.releaseAuthorized,false);
assert.equal(plan.sitePublicationAuthenticated,false);
assert.equal(plan.summary.sitemapUrls,2);
assert.equal(plan.summary.newAllowRules,1);
assert.equal(plan.summary.successfullyUnblocked,1);
assert.equal(plan.summary.newDisallowedApprovedPages,0);
assert.equal(plan.summary.needsManualReview,0);
assert(plan.proposedRobots.includes('User-agent: Googlebot\nDisallow: /contact/\nAllow: /\nAllow: /contact/$'));
assert(plan.proposedRobots.includes('User-agent: *\nAllow: /\nDisallow: /contact/'));
assert(!plan.proposedRobots.includes('Disallow: /robots'));
assert(plan.proposedSitemap.includes('<loc>https://demo.example/contact/</loc>'));
assert(!plan.proposedSitemap.includes('<lastmod>'));
assert(plan.comparison.changes.some(c=>c.kind==='robots-access-restored'&&c.agent==='Googlebot'));
assert(plan.comparison.changes.some(c=>c.kind==='sitemap-inclusion'));
const html=VIEW.render(plan);
assert(html.includes('Search Delivery Repair Candidate'));
assert(html.includes('connect-src &#39;none&#39;'));
assert(html.includes('RELEASE AUTHORIZATION: FALSE'));
assert(!html.includes('<script'));
assert(R.markdown(plan).includes('DO NOT UPLOAD'));
const shared=R.repair(blueprint,site,{...options,robotsText:
 'User-agent: *\nDisallow: /contact/\nSitemap: https://demo.example/sitemap.xml\n'});
assert.equal(shared.summary.newAllowRules,0);
assert.equal(shared.summary.successfullyUnblocked,0);
assert(shared.manualHolds.some(x=>x.reason==='shared-wildcard-or-ambiguous-agent-group'));
assert(!shared.proposedRobots.includes('Allow: /contact/$'));
const mixed=R.repair(blueprint,site,{...options,robotsText:
 'User-agent: Googlebot\nUser-agent: Bingbot\nDisallow: /contact/\n'});
assert(mixed.manualHolds.some(x=>x.reason==='shared-wildcard-or-ambiguous-agent-group'));
const duplicate=R.repair(blueprint,site,{...options,robotsText:
 'User-agent: Googlebot\nDisallow: /contact/\nUser-agent: Googlebot\nDisallow: /\n'});
assert(duplicate.manualHolds.some(x=>x.reason==='shared-wildcard-or-ambiguous-agent-group'));
const withoutSitemap=R.repair(blueprint,site,{...options,allowPageIds:[],robotsText:'User-agent: *\nAllow: /\n'});
assert.equal(withoutSitemap.pointerStatus,'added-missing-sitemap-pointer');
assert(withoutSitemap.proposedRobots.includes('Sitemap: https://demo.example/sitemap.xml'));
const noPointer=R.repair(blueprint,site,{...options,allowPageIds:[],robotsText:'User-agent: *\nAllow: /\n',
 addSitemapPointer:false});
assert.equal(noPointer.pointerStatus,'not-added-by-operator-choice');
const strangePointer=R.repair(blueprint,site,{...options,allowPageIds:[],
 robotsText:'User-agent: *\nAllow: /\nSitemap: https://other.example/sitemap.xml\n'});
assert.equal(strangePointer.pointerStatus,'existing-pointer-differs');
assert(strangePointer.manualHolds.some(x=>x.reason==='existing-sitemap-pointer-differs'));
const noindexBrief=JSON.parse(JSON.stringify(fixture));
noindexBrief.pages[1].seo.robots='noindex';
const noindexPlan=BP.compileBrief(noindexBrief);
const matchingSite=JSON.parse(JSON.stringify(site));matchingSite.pages[1].seo={robots:'noindex'};
const noindexSitemap=R.sitemap(noindexPlan,base);
assert.equal(noindexSitemap.urls.length,1);
assert.throws(()=>R.repair(noindexPlan,matchingSite,options),/Refusing to suggest crawl exemptions/);
const staleSite=JSON.parse(JSON.stringify(site));
staleSite.pages[1].path='/moved-contact/';
assert.throws(()=>R.repair(blueprint,staleSite,options),/disagrees with approved Blueprint/);
const wrongFormat={...site,format:'forged-site'};
assert.throws(()=>R.repair(blueprint,wrongFormat,options),/matching published Site v1/);
const redirected=JSON.parse(JSON.stringify(site));
redirected.redirects=[{from:'/contact/',to:'/'}];
assert.throws(()=>R.repair(blueprint,redirected,options),/approved-canonical-route-has-published-redirect/);
const additionalSite=JSON.parse(JSON.stringify(site));
additionalSite.pages.push({...additionalSite.pages[1],id:'page-not-in-approved',path:'/unknown/'});
assert.throws(()=>R.repair(blueprint,additionalSite,options),/matching published Site v1/);
assert.throws(()=>R.repair(blueprint,site,{...options,allowPageIds:['page-not-here']}),/absent from approved Blueprint/);
assert.throws(()=>R.repair(blueprint,site,{...options,agents:['Googlebot','Googlebot']}),/selected crawler/);
const mounted=R.sitemap(blueprint,'https://demo.example/published/site-industrial-demo/');
assert(mounted.urls.some(s=>s.endsWith('/published/site-industrial-demo/contact/')));
const index='<?xml version="1.0"?><sitemapindex><sitemap><loc>https://demo.example/sitemap-child.xml</loc></sitemap></sitemapindex>';
const indexPlan=R.repair(blueprint,site,{...options,allowPageIds:[],sitemapXml:index});
assert.equal(indexPlan.priorSitemapKind,'index');
assert(indexPlan.comparison.changes.some(x=>x.kind==='sitemap-format-transition'));
assert.equal(indexPlan.comparison.summary.indexableSitemapOmissions,0);
console.log('Crawl repair: actual policy deltas, safe exact exemptions, noindex, sitemap and fail-closed CMS parity PASS.');
