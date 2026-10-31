#!/usr/bin/env node
'use strict';
/* Original Blueprint bytes + private indexing report + operator robots/sitemap.
 * An investigation packet, NEVER Google-authenticated causality.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const CRAWL=require('../lib/crawl-policy.cjs');
const CORRELATE=require('../lib/crawl-indexing-correlation.cjs');
const VIEW=require('../lib/crawl-indexing-view.cjs');
const SRC=require('./review-crawl-policy.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const HELP='Usage: node stage3/seo-engine/bin/correlate-crawl-indexing.cjs --blueprint /ABS/private/ORIGINAL-blueprint.json --robots /ABS/private/robots.txt --sitemap /ABS/private/sitemap.xml --indexing /ABS/private/indexing-intelligence.json --base https://site.example/ --out /ABS/private/NEW-correlation [--scope complete|sample]';
function parse(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length%2||argv.length<12||argv.length>14)throw Error(HELP);
 const f={};
 for(let i=0;i<argv.length;i+=2){
  if(!['--blueprint','--robots','--sitemap','--indexing','--base','--out','--scope'].includes(argv[i])||
   Object.hasOwn(f,argv[i])||!argv[i+1])throw Error(HELP);
  f[argv[i]]=argv[i+1];
 }
 for(const k of ['--blueprint','--robots','--sitemap','--indexing','--base','--out'])
  if(!f[k])throw Error('Missing '+k);
 const paths=['--blueprint','--robots','--sitemap','--indexing','--out'];
 for(const k of paths)if(!path.isAbsolute(f[k])||path.resolve(f[k])!==f[k])
  throw Error('All private file paths must be normalized absolute paths');
 if(new Set(paths.slice(0,-1).map(k=>f[k])).size!==4)
  throw Error('Crawl/indexing sources require distinct original files');
 return {blueprint:f['--blueprint'],robots:f['--robots'],sitemap:f['--sitemap'],
  indexing:f['--indexing'],base:f['--base'],out:f['--out'],scope:f['--scope']||'complete'};
}
function build(f){
 const source={blueprint:SRC.read(f.blueprint,2000000),robots:SRC.read(f.robots,250000),
  sitemap:SRC.read(f.sitemap,750000),indexing:SRC.read(f.indexing,5500000)};
 if(new Set(Object.values(source).map(x=>x.real)).size!==4)
  throw Error('Crawl and Search Console original evidence files cannot alias');
 const raw=JSON.parse(source.blueprint.bytes.toString('utf8'));
 const bp=raw.format===BP.FORMAT?BP.compileBrief(raw):BP.checkBlueprint(raw);
 const policy=CRAWL.analyze({blueprint:bp,base:f.base,
  robotsText:source.robots.bytes.toString('utf8'),
  sitemapXml:source.sitemap.bytes.toString('utf8'),scope:f.scope});
 const indexing=JSON.parse(source.indexing.bytes.toString('utf8'));
 const report=CORRELATE.analyze({blueprint:bp,blueprintRawSha256:source.blueprint.sha256,
  policy,indexing,indexingRawSha256:source.indexing.sha256});
 return {source,report};
}
function main(argv){
 const opt=parse(argv);
 if(!opt){process.stdout.write(HELP+'\n');return null;}
 const out=PRIVATE.privateOutput(opt.out),{source,report}=build(opt);
 const json=JSON.stringify(report,null,2)+'\n',html=VIEW.render(report);
 const files={
  'index.html':html,'CRAWL-INDEXING-CORRELATION.json':json,
  'CRAWL-INDEXING-CORRELATION.md':CORRELATE.markdown(report),
  'SOURCE-MANIFEST.json':JSON.stringify({
   format:'manufact-seo-crawl-indexing-source-manifest-v1',
   siteId:report.siteId,sourceSha256:Object.fromEntries(Object.entries(source)
    .map(([name,record])=>[name,record.sha256])),
   approvedBlueprintSha256:report.approvedBlueprintSha256,
   reportSha256:sha(json),htmlSha256:sha(html),readOnly:true,
   actualNetworkRequests:0,googleDataAuthenticated:false,
   publicHostAuthenticated:false,releaseAuthorized:false
  },null,2)+'\n',
  'PRIVATE-README.md':'# MANUFACT SEO — private crawl/indexing joint investigation\n\n'+
   'This combines operator-declared, not authenticated, Search Console rows with local robots and XML evidence.\n'+
   'An apparent agreement, difference or block is not evidence of a cause or Google indexation.\n'+
   'No host checks, Google API, CMS action, redirects, indexing requests, client GO or deployment.\n'+
   'Keep all report files outside GitHub and hosting. Independently verify any owner evidence references.\n'
 };
 const temp=fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(out)),
  '.seo-crawl-indexing-incomplete-'));
 let done=false;
 try{
  for(const [name,value] of Object.entries(files))
   fs.writeFileSync(path.join(temp,name),value,{flag:'wx',mode:0o600});
  for(const [k,p,max] of [['blueprint',opt.blueprint,2000000],['robots',opt.robots,250000],
   ['sitemap',opt.sitemap,750000],['indexing',opt.indexing,5500000]])
   if(SRC.read(p,max).sha256!==source[k].sha256)
    throw Error('Original source changed before private report was finalized: '+k);
  if(fs.existsSync(out))throw Error('Output destination appeared during staging');
  fs.renameSync(temp,out);done=true;
 }finally{if(!done)fs.rmSync(temp,{recursive:true,force:true});}
 return {siteId:report.siteId,out,humanInvestigations:report.summary.operatorTasks,
  P1:report.summary.needsUrgentInspection,readOnly:true,releaseAuthorized:false};
}
if(require.main===module)try{
 const result=main(process.argv.slice(2));
 if(result)process.stdout.write('PRIVATE CRAWL/INDEXING CORRELATION: '+JSON.stringify(result)+'\n');
}catch(e){process.stderr.write('Crawl-indexing refused: '+e.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,build,main});
