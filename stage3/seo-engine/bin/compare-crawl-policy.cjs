#!/usr/bin/env node
'use strict';
/* Compare two original operator policy revisions with unchanged Blueprint, no network. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs'),POLICY=require('../lib/crawl-policy.cjs');
const DELTA=require('../lib/crawl-policy-delta.cjs'),VIEW=require('../lib/crawl-policy-delta-view.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const SRC=require('./review-crawl-policy.cjs');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const HELP='Usage: node stage3/seo-engine/bin/compare-crawl-policy.cjs --blueprint /ABS/private/blueprint.json --before-robots /ABS/private/old-robots.txt --before-sitemap /ABS/private/old-sitemap.xml --after-robots /ABS/private/new-robots.txt --after-sitemap /ABS/private/new-sitemap.xml --base https://site.example/ --out /ABS/private/NEW-private-delta [--scope complete|sample] [--agents Googlebot,Bingbot,*]';
function parse(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length%2||argv.length<14||argv.length>18)throw Error(HELP);
 const f={};
 for(let i=0;i<argv.length;i+=2){
  const k=argv[i];
  if(!['--blueprint','--before-robots','--before-sitemap','--after-robots',
   '--after-sitemap','--base','--out','--scope','--agents'].includes(k)||
   Object.hasOwn(f,k)||!argv[i+1])throw Error(HELP);
  f[k]=argv[i+1];
 }
 for(const k of ['--blueprint','--before-robots','--before-sitemap','--after-robots',
  '--after-sitemap','--base','--out'])if(!f[k])throw Error('Missing '+k);
 const pathFlags=['--blueprint','--before-robots','--before-sitemap',
  '--after-robots','--after-sitemap','--out'];
 for(const k of pathFlags)if(!path.isAbsolute(f[k])||path.resolve(f[k])!==f[k])
  throw Error('Input/output file paths must be normalized absolute paths');
 if(new Set(pathFlags.slice(0,-1).map(k=>f[k])).size!==5)
  throw Error('Each original source must have an independent private file path');
 return {blueprint:f['--blueprint'],beforeRobots:f['--before-robots'],
  beforeSitemap:f['--before-sitemap'],afterRobots:f['--after-robots'],
  afterSitemap:f['--after-sitemap'],base:f['--base'],out:f['--out'],
  scope:f['--scope']||'complete',agents:f['--agents']?f['--agents'].split(','):POLICY.AGENTS};
}
function build(args){
 const source={blueprint:SRC.read(args.blueprint,2000000),
  beforeRobots:SRC.read(args.beforeRobots,250000),
  beforeSitemap:SRC.read(args.beforeSitemap,750000),
  afterRobots:SRC.read(args.afterRobots,250000),
  afterSitemap:SRC.read(args.afterSitemap,750000)};
 if(new Set(Object.values(source).map(x=>x.real)).size!==5)
  throw Error('Crawl comparison private source files must be distinct');
 const blueprintObject=JSON.parse(source.blueprint.bytes.toString('utf8'));
 const bp=blueprintObject.format===BP.FORMAT?
  BP.compileBrief(blueprintObject):BP.checkBlueprint(blueprintObject);
 const config={blueprint:bp,base:args.base,scope:args.scope,agents:args.agents};
 const before=POLICY.analyze({...config,
  robotsText:source.beforeRobots.bytes.toString('utf8'),
  sitemapXml:source.beforeSitemap.bytes.toString('utf8')});
 const after=POLICY.analyze({...config,
  robotsText:source.afterRobots.bytes.toString('utf8'),
  sitemapXml:source.afterSitemap.bytes.toString('utf8')});
 return {source,before,after,delta:DELTA.compare(before,after)};
}
function main(argv){
 const f=parse(argv);
 if(!f){process.stdout.write(HELP+'\n');return null;}
 const out=PRIVATE.privateOutput(f.out);
 const {source,delta}=build(f);
 const result=JSON.stringify(delta,null,2)+'\n',html=VIEW.render(delta),md=DELTA.markdown(delta);
 const files={'index.html':html,'CRAWL-REGRESSION.json':result,'CRAWL-REGRESSION.md':md,
  'SOURCE-MANIFEST.json':JSON.stringify({
   format:'manufact-seo-crawl-policy-delta-sources-v1',
   siteId:delta.siteId,approvedBlueprintSha256:delta.blueprintSha256,
   originalInputSha256:Object.fromEntries(Object.entries(source).map(([k,v])=>[k,v.sha256])),
   sourceBase:delta.base,scope:delta.scope,agents:delta.agents,
   reportSha256:sha(result),renderedHtmlSha256:sha(html),
   publicHostAuthenticated:false,realNetworkRequests:0,releaseAuthorized:false
  },null,2)+'\n',
  'PRIVATE-README.md':'# MANUFACT SEO — private crawl policy regression\n\n'+
   'This records planned new robots/URL sitemap restrictions from operator-supplied sources.\n'+
   'A P0 means a newly blocked canonical indexable URL in the supplied policies; it is NOT proven live.\n'+
   'No public HTTP, actual Googlebot replay, GSC verification, CMS edit, PR or deployment.\n'+
   'Keep the entire report private, outside the repository and hosting.\n'
 };
 const staging=fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(out)),
  '.seo-crawl-regression-incomplete-'));
 let finished=false;
 try{
  for(const [name,content] of Object.entries(files))
   fs.writeFileSync(path.join(staging,name),content,{flag:'wx',mode:0o600});
  for(const [k,filename,max] of [
   ['blueprint',f.blueprint,2000000],['beforeRobots',f.beforeRobots,250000],
   ['afterRobots',f.afterRobots,250000],['beforeSitemap',f.beforeSitemap,750000],
   ['afterSitemap',f.afterSitemap,750000]])
   if(SRC.read(filename,max).sha256!==source[k].sha256)
    throw Error('Source file changed during policy regression calculation: '+k);
  if(fs.existsSync(out))throw Error('Output folder became occupied before promotion');
  fs.renameSync(staging,out);finished=true;
 }finally{if(!finished)fs.rmSync(staging,{recursive:true,force:true});}
 return {siteId:delta.siteId,out,regressions:delta.summary.events,
  P0:delta.summary.priorities.P0,newGoogleBlocks:delta.summary.newGoogleBlocks,
  releaseAuthorized:false};
}
if(require.main===module)try{
 const x=main(process.argv.slice(2));
 if(x)process.stdout.write('PRIVATE CRAWL REGRESSION: '+JSON.stringify(x)+'\n');
}catch(e){process.stderr.write('Crawl regression refused: '+e.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,build,main});
