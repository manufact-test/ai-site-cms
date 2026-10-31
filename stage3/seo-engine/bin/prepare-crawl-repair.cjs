#!/usr/bin/env node
'use strict';
/* Draft-only owner search file candidate. No edits to owner CMS/static ZIP/host. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs'),REPAIR=require('../lib/crawl-repair-planner.cjs');
const VIEW=require('../lib/crawl-repair-view.cjs');
const SRC=require('./review-crawl-policy.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const HELP='Usage: node stage3/seo-engine/bin/prepare-crawl-repair.cjs --blueprint /ABS/private/plan.json --site /ABS/private/current-site.json --robots /ABS/private/original-robots.txt --sitemap /ABS/private/original-sitemap.xml --base https://site.example/ --out /ABS/private/NEW-candidate [--allow-page-ids page-contact,page-other] [--agents Googlebot,Bingbot] [--scope complete|sample] [--add-sitemap-pointer yes|no]';
const FLAGS=['--blueprint','--site','--robots','--sitemap','--base','--out',
 '--allow-page-ids','--agents','--scope','--add-sitemap-pointer'];
function parse(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length%2||argv.length<12||argv.length>20)throw Error(HELP);
 const flags={};
 for(let i=0;i<argv.length;i+=2){
  const key=argv[i];if(!FLAGS.includes(key)||Object.hasOwn(flags,key)||!argv[i+1])
   throw Error('Invalid or duplicate crawl repair option; '+HELP);
  flags[key]=argv[i+1];
 }
 for(const key of FLAGS.slice(0,6))if(!flags[key])throw Error('Missing '+key);
 for(const key of ['--blueprint','--site','--robots','--sitemap','--out'])
  if(!path.isAbsolute(flags[key])||path.resolve(flags[key])!==flags[key])
   throw Error('Original inputs and output must be normalized absolute private paths');
 const originals=['--blueprint','--site','--robots','--sitemap'].map(k=>flags[k]);
 if(new Set(originals).size!==originals.length)
  throw Error('Each original source must have its own private input file');
 const pointer=flags['--add-sitemap-pointer'];
 if(pointer!==undefined&&!['yes','no'].includes(pointer))
  throw Error('--add-sitemap-pointer is yes or no only');
 return {blueprint:flags['--blueprint'],site:flags['--site'],
  robots:flags['--robots'],sitemap:flags['--sitemap'],
  base:flags['--base'],out:flags['--out'],
  allowPageIds:flags['--allow-page-ids']?flags['--allow-page-ids'].split(','):[],
  agents:flags['--agents']?flags['--agents'].split(','):['Googlebot'],
  scope:flags['--scope']||'complete',addSitemapPointer:pointer!=='no'};
}
function build(options){
 const source={blueprint:SRC.read(options.blueprint,2000000),
  site:SRC.read(options.site,2500000),
  robots:SRC.read(options.robots,250000),
  sitemap:SRC.read(options.sitemap,750000)};
 if(new Set(Object.values(source).map(x=>x.real)).size!==4)
  throw Error('Original source files cannot alias or be symlink substitutes');
 const raw=JSON.parse(source.blueprint.bytes.toString('utf8'));
 const approved=raw.format===BP.FORMAT?BP.compileBrief(raw):BP.checkBlueprint(raw);
 const site=JSON.parse(source.site.bytes.toString('utf8'));
 const plan=REPAIR.repair(approved,site,{
  base:options.base,robotsText:source.robots.bytes.toString('utf8'),
  sitemapXml:source.sitemap.bytes.toString('utf8'),scope:options.scope,
  allowPageIds:options.allowPageIds,agents:options.agents,
  addSitemapPointer:options.addSitemapPointer
 });
 return {source,plan};
}
function main(argv){
 const flags=parse(argv);
 if(!flags){process.stdout.write(HELP+'\n');return null;}
 const dest=PRIVATE.privateOutput(flags.out);
 const {source,plan}=build(flags);
 const report={...plan,
  proposedRobotsSha256:hash(plan.proposedRobots),
  proposedSitemapSha256:hash(plan.proposedSitemap)};
 // Do not embed file bodies in the JSON; original/candidate bytes are separate
 // private artefacts and carry their own digest.
 delete report.proposedRobots;delete report.proposedSitemap;
 delete report.policyBefore;delete report.policyCandidate;
 const json=JSON.stringify(report,null,2)+'\n',html=VIEW.render(plan);
 const manifest={format:'manufact-seo-crawl-repair-sources-v1',
  siteId:plan.siteId,sourceRawSha256:Object.fromEntries(Object.entries(source)
   .map(([key,file])=>[key,file.sha256])),
  approvedBlueprintCanonicalSha256:plan.policyBefore.blueprintSha256,
  siteSnapshotAuthenticated:false,actualCmsRevisionVerified:false,
  proposedRobotsSha256:hash(plan.proposedRobots),
  proposedSitemapSha256:hash(plan.proposedSitemap),
  reviewSha256:hash(json),reviewHtmlSha256:hash(html),
  requestedPageIds:plan.requestedPageIds,requestedAgents:plan.requestedAgents,
  ownerApprovalAuthenticated:false,publicationAuthorized:false,hostWrites:0,networkRequests:0};
 const files={
  'index.html':html,
  'PROPOSED-robots.txt':plan.proposedRobots,
  'PROPOSED-sitemap.xml':plan.proposedSitemap,
  'CRAWL-REPAIR-PLAN.json':json,
  'CRAWL-REPAIR-PLAN.md':REPAIR.markdown(plan),
  'SOURCE-MANIFEST.json':JSON.stringify(manifest,null,2)+'\n',
  'PRIVATE-README.md':[
   '# MANUFACT SEO — proposed search files only','',
   'NOT A RELEASE. NEVER upload this directory or overwrite CMS-managed robots/sitemap directly.',
   'Original Site v1 was operator-supplied and was not authenticated as current CMS revision.',
   'PROPOSED-robots.txt preserves original restrictions apart from explicit isolated group exceptions.',
   'PROPOSED-sitemap.xml contains only approved indexable canonical Blueprint URLs, without fake lastmod.',
   'Manual holds, whole-domain crawler policy and the resulting delta require owner/lead review.',
   'Run compare-crawl-policy.cjs with original files and these proposed files and verify actual public HTTP before any approved publication.',
   'No DNS/TLS/Google Search Console network access, CMS edit, PR, merge, hosting write or deployment.',''
  ].join('\n')
 };
 const temp=fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(dest)),
  '.seo-repair-proposal-incomplete-'));
 let success=false;
 try{
  for(const [name,body] of Object.entries(files))
   fs.writeFileSync(path.join(temp,name),body,{flag:'wx',mode:0o600});
  for(const [name,filename,max] of [['blueprint',flags.blueprint,2000000],
   ['site',flags.site,2500000],['robots',flags.robots,250000],
   ['sitemap',flags.sitemap,750000]])
   if(SRC.read(filename,max).sha256!==source[name].sha256)
    throw Error('Original SEO/source bytes changed while assembling candidate: '+name);
  if(fs.existsSync(dest))throw Error('Private candidate output destination became occupied');
  fs.renameSync(temp,dest);success=true;
 }finally{if(!success)fs.rmSync(temp,{recursive:true,force:true});}
 return {siteId:plan.siteId,out:dest,proposedSitemapUrls:plan.summary.sitemapUrls,
  exactAllowProposals:plan.summary.newAllowRules,manualHolds:plan.summary.needsManualReview,
  publicationAuthorized:false};
}
if(require.main===module)try{
 const result=main(process.argv.slice(2));
 if(result)process.stdout.write('PRIVATE SEO SEARCH FILE CANDIDATE: '+JSON.stringify(result)+'\n');
}catch(e){process.stderr.write('Crawl repair refused: '+e.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,build,main});
