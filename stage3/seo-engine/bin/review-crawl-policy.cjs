#!/usr/bin/env node
'use strict';
/* Explicit private original files, atomic local dossier; never network or public output. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const POLICY=require('../lib/crawl-policy.cjs');
const VIEW=require('../lib/crawl-policy-view.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const ROOT=fs.realpathSync(path.resolve(__dirname,'../../..'));
const HELP='Usage: node stage3/seo-engine/bin/review-crawl-policy.cjs --blueprint /ABS/private/blueprint.json --robots /ABS/private/robots.txt --sitemap /ABS/private/sitemap.xml --base https://public.example/ --out /ABS/private/NEW-output [--scope complete|sample] [--agents Googlebot,Bingbot,*]';
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex');
function parse(args){
 if(args.length===1&&args[0]==='--help')return null;
 if(args.length%2||args.length<10||args.length>14)throw Error(HELP);
 const data={};
 for(let i=0;i<args.length;i+=2){
  const k=args[i];
  if(!['--blueprint','--robots','--sitemap','--base','--out','--scope','--agents'].includes(k)||
   Object.hasOwn(data,k)||!args[i+1])throw Error(HELP);
  data[k]=args[i+1];
 }
 for(const k of ['--blueprint','--robots','--sitemap','--base','--out'])
  if(!data[k])throw Error('Missing '+k+'; '+HELP);
 const argsPath=['--blueprint','--robots','--sitemap','--out'];
 if(argsPath.some(k=>!path.isAbsolute(data[k])||path.resolve(data[k])!==data[k]))
  throw Error('Original source and output paths must be normalized absolute paths');
 const names=argsPath.slice(0,-1).map(k=>data[k]);
 if(new Set(names).size!==3)throw Error('Crawl evidence needs three distinct original files');
 return {blueprint:data['--blueprint'],robots:data['--robots'],
  sitemap:data['--sitemap'],base:data['--base'],out:data['--out'],
  scope:data['--scope']||'complete',
  agents:data['--agents']?data['--agents'].split(','):POLICY.AGENTS};
}
function read(file,max){
 const real=fs.realpathSync(file),relative=path.relative(ROOT,real),
  stat=fs.lstatSync(file);
 if(relative==='.'||relative===''||
  relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))
  throw Error('Crawl-policy original evidence must remain outside repository');
 if(stat.isSymbolicLink()||!stat.isFile()||stat.size<10||stat.size>max)
  throw Error('Missing, unsafe or oversized private original file');
 const bytes=fs.readFileSync(file);
 return {bytes,sha256:SHA(bytes),real};
}
function build(flags){
 const originals={
  blueprint:read(flags.blueprint,2000000),
  robots:read(flags.robots,250000),
  sitemap:read(flags.sitemap,750000)
 };
 if(new Set(Object.values(originals).map(x=>x.real)).size!==3)
  throw Error('All crawl evidence sources must be distinct original files');
 const raw=JSON.parse(originals.blueprint.bytes.toString('utf8'));
 const bp=raw.format===BP.FORMAT?BP.compileBrief(raw):BP.checkBlueprint(raw);
 const report=POLICY.analyze({blueprint:bp,base:flags.base,
  robotsText:originals.robots.bytes.toString('utf8'),
  sitemapXml:originals.sitemap.bytes.toString('utf8'),
  scope:flags.scope,agents:flags.agents});
 return {originals,report};
}
function main(argv){
 const flags=parse(argv);
 if(!flags){process.stdout.write(HELP+'\n');return null;}
 const out=PRIVATE.privateOutput(flags.out);
 const {originals,report}=build(flags);
 const html=VIEW.render(report),json=JSON.stringify(report,null,2)+'\n';
 const files={
  'index.html':html,'CRAWL-POLICY-REPORT.json':json,
  'CRAWL-POLICY-REPORT.md':POLICY.markdown(report),
  'SOURCE-MANIFEST.json':JSON.stringify({
   format:'manufact-seo-crawl-policy-input-manifest-v1',
   siteId:report.siteId,originalInputSha256:Object.fromEntries(
    Object.entries(originals).map(([k,v])=>[k,v.sha256])),
   originalBlueprintSha256:report.blueprintSha256,
   sourceBase:report.base,agents:report.agents,scope:report.scope,
   reportSha256:SHA(json),htmlSha256:SHA(html),
   actualNetworkRequests:0,publicHostAuthenticated:false,
   publicationAuthorized:false,ownerAuthenticated:false
  },null,2)+'\n',
  'PRIVATE-README.md':[
   '# MANUFACT SEO — private crawl policy review','',
   'Open index.html locally for a page/bot breakdown and owner action queue.',
   'Source files were operator supplied and are NOT authenticated public host captures.',
   'Live Googlebot/Bingbot behavior and URL Inspection were NOT performed.',
   'No automatic sitemap edit, robots correction, redirect, CMS write or publication.',
   'Keep this entire directory outside GitHub and public hosting.',''
  ].join('\n')
 };
 const stage=fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(out)),
  '.seo-crawl-policy-incomplete-'));
 let completed=false;
 try{
  for(const [name,body] of Object.entries(files))
   fs.writeFileSync(path.join(stage,name),body,{flag:'wx',mode:0o600});
  for(const [k,file] of [['blueprint',flags.blueprint],['robots',flags.robots],['sitemap',flags.sitemap]])
   if(read(file,k==='blueprint'?2000000:k==='robots'?250000:750000).sha256!==originals[k].sha256)
    throw Error('Original evidence changed while preparing private crawl report: '+k);
  if(fs.existsSync(out))throw Error('Private report output already exists');
  fs.renameSync(stage,out);completed=true;
 }finally{if(!completed)fs.rmSync(stage,{recursive:true,force:true});}
 return {siteId:report.siteId,out,findings:report.summary.findings,
  P0:report.summary.priorities.P0,P1:report.summary.priorities.P1,
  readOnly:true,publicationAuthorized:false};
}
if(require.main===module)try{
 const result=main(process.argv.slice(2));
 if(result)process.stdout.write('PRIVATE CRAWL POLICY: '+JSON.stringify(result)+'\n');
}catch(e){process.stderr.write('Crawl policy refused: '+e.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,read,build,main});
