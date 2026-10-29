#!/usr/bin/env node
'use strict';
/* Offline Search Console CSV -> private editorial worklist; never changes CMS. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const GSC=require('../lib/gsc-performance.cjs');
const BRIEFS=require('../lib/content-optimization-briefs.cjs');
const {checkBlueprint}=require('../lib/blueprint.cjs');
const KEYS=new Set(['blueprint','origin','pages','queries','pairs','site','period-start','period-end','previous-pages','previous-start','previous-end','out']);
const HELP='Required: --blueprint FILE --origin https://example.com/ --pages Pages.csv --period-start YYYY-MM-DD --period-end YYYY-MM-DD --out NEW-DIR; optional --site Site-v1.json --queries Queries.csv --pairs PageQuery.csv --previous-pages OlderPages.csv --previous-start DATE --previous-end DATE';
function argsToFlags(args){
 if(args.length===1&&args[0]==='--help')return null;
 if(args.length%2)throw Error(HELP);
 const f={};
 for(let i=0;i<args.length;i+=2){
  const k=args[i]?.replace(/^--/,'');
  if(!args[i]?.startsWith('--')||!KEYS.has(k)||!args[i+1]||f[k])throw Error('Bad or repeated flag: '+args[i]);
  f[k]=args[i+1];
 }
 for(const k of ['blueprint','origin','pages','period-start','period-end','out'])if(!f[k])throw Error('Missing --'+k+'. '+HELP);
 if([f['previous-pages'],f['previous-start'],f['previous-end']].filter(Boolean).length%3!==0)
  throw Error('Previous comparison needs --previous-pages, --previous-start and --previous-end together');
 return f;
}
function readSource(file,max){
 const p=path.resolve(file),st=fs.lstatSync(p);
 if(st.isSymbolicLink()||!st.isFile()||st.size<5||st.size>max)throw Error('Invalid or oversized private input');
 const buf=fs.readFileSync(p);
 return {text:buf.toString('utf8'),sha256:crypto.createHash('sha256').update(buf).digest('hex'),bytes:buf.length};
}
const safe=x=>String(x??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/[|\\\x60*_<>{}\[\]#]/g,' ').replace(/\s+/g,' ').trim().slice(0,190);
function renderMarkdown(r){
 const lines=['# MANUFACT SEO — Search Performance Intelligence','',
  'Private offline editorial worklist. NOT client approval, live GSC authentication, published site proof or automatic CMS changes.','',
  'Site: '+safe(r.siteId)+' | Origin: '+safe(r.publicOrigin),
  'Period: '+r.period.start+' — '+r.period.end+' ('+r.period.days+' days)',
  r.previousPeriod?'Previous: '+r.previousPeriod.start+' — '+r.previousPeriod.end:'Previous period: not supplied',
  '',
  '## Evidence coverage','',
  '- Approved pages: '+r.summary.approvedPages+'; pages with GSC data: '+r.summary.measuredPages,
  '- Supplied page totals: '+r.summary.currentPageClicks+' clicks, '+r.summary.currentPageImpressions+' impressions',
  '- Unmapped URLs: '+r.summary.unmappedUrls+'; P1 actions: '+r.summary.priorityP1,
  '',
  '## Prioritized SEO editorial tasks','',
  '| Priority | Path | Observation | Human next step |','|---|---|---|---|'];
 for(const a of r.actions){
  lines.push('| '+a.priority+' | '+safe(a.path||'(unmapped)')+' | '+safe(a.reason)+' | '+safe(a.nextStep)+' |');
 }
 if(!r.actions.length)lines.push('| — | — | No triggered heuristics | Continue monitoring |');
 lines.push('','## Approved page metrics and optional query pairs','',
  '| Page | Clicks | Impressions | CTR | Average position | Paired queries |','|---|---:|---:|---:|---:|---|');
 for(const p of r.pages){
  lines.push('| '+safe(p.path)+' | '+(p.metrics?.clicks??'—')+' | '+(p.metrics?.impressions??'—')+
   ' | '+(p.metrics?(p.metrics.ctr*100).toFixed(2)+'%':'—')+' | '+(p.metrics?.averagePosition??'—')+
   ' | '+(p.topQueries.length?p.topQueries.slice(0,3).map(q=>safe(q.query)+' ('+q.impressions+' impressions)').join('; '):'Unavailable')+' |');
 }
 if(r.unmappedUrls.length){
  lines.push('','## URLs outside the approved route map','',
   '| URL | Problem | Clicks | Impressions |','|---|---|---:|---:|');
  for(const x of r.unmappedUrls)lines.push('| '+safe(x.url)+' | '+safe(x.reason)+' | '+x.clicks+' | '+x.impressions+' |');
 }
 if(r.globalQueries.length){
  lines.push('','## Global search queries — NOT attributed to pages','',
   '| Query | Clicks | Impressions | Average position |','|---|---:|---:|---:|');
  for(const q of r.globalQueries.slice(0,30))
   lines.push('| '+safe(q.query)+' | '+q.clicks+' | '+q.impressions+' | '+q.averagePosition+' |');
 }
 lines.push('','## Interpretation','');
 for(const c of r.boundaries)lines.push('- '+safe(c));
 lines.push('- Do not assume absent GSC rows mean zero demand: privacy thresholds, filtered views and export limits exist.',
  '- Use the same GSC property, search type, filters and geography when comparing periods.',
  '- Changes in clicks are observations, not proof of an algorithm change, content quality or a defect.');
 return lines.join('\n')+'\n';
}
function main(argv){
 const f=argsToFlags(argv);
 if(!f){process.stdout.write(HELP+'\n');return;}
 const digests={};
 const read=(key,max)=>{
  if(!f[key])return null;
  const item=readSource(f[key],max);
  digests[key]={sha256:item.sha256,bytes:item.bytes};
  return item.text;
 };
 const blueprint=checkBlueprint(JSON.parse(read('blueprint',2500000)));
 const site=f.site?JSON.parse(read('site',2500000)):null;
 if(site){
  const {auditSite}=require('../lib/analyze.cjs');
  const dir=path.resolve(__dirname,'../../components');
  const manifests=fs.readdirSync(dir).filter(x=>x.endsWith('.json')).map(n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')));
  auditSite(site,manifests,blueprint);
 }
 const pages=GSC.readCsv(read('pages',5000000),'pages');
 const queries=f.queries?GSC.readCsv(read('queries',5000000),'queries'):null;
 const pairs=f.pairs?GSC.readCsv(read('pairs',5000000),'pairs'):null;
 const previousPages=f['previous-pages']?GSC.readCsv(read('previous-pages',5000000),'pages'):null;
 const result=GSC.analyze({blueprint,site,origin:f.origin,current:{pages,queries,pairs},
  period:{start:f['period-start'],end:f['period-end']},previousPages,
  previousPeriod:previousPages?{start:f['previous-start'],end:f['previous-end']}:null});
 const dest=path.resolve(f.out);
 if(fs.existsSync(dest))throw Error('Output directory already exists');
 fs.mkdirSync(dest,{mode:0o700,recursive:false});
 const write=(name,value)=>{
  const fd=fs.openSync(path.join(dest,name),'wx',0o600);
  try{fs.writeFileSync(fd,value);}finally{fs.closeSync(fd);}
 };
 result.inputDigests=digests;
 const briefs=BRIEFS.compile(blueprint,result);
 write('performance-insights.json',JSON.stringify(result,null,2)+'\n');
 write('editorial-worklist.md',renderMarkdown(result));
 write('editorial-page-briefs.json',JSON.stringify(briefs,null,2)+'\n');
 write('editorial-page-briefs.md',BRIEFS.markdown(briefs));
 write('PRIVATE-README.txt','Private search data. Do not publish this directory, upload to static public/ or commit to Git.\n');
 process.stdout.write('SEO worklist: '+result.actions.length+' editorial actions; '+result.summary.measuredPages+' measured approved pages.\nOutput: '+dest+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){process.stderr.write('SEO performance: '+e.message+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({main,renderMarkdown,argsToFlags});
