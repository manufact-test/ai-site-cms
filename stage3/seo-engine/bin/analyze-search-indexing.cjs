#!/usr/bin/env node
'use strict';
/* Offline, privacy-preserving GSC URL indexing vs approved Blueprint. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {checkBlueprint}=require('../lib/blueprint.cjs');
const CONTEXT=require('../lib/search-evidence-context.cjs');
const INDEX=require('../lib/search-indexing.cjs');
const VIEW=require('../lib/search-indexing-view.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const KEYS=new Set(['blueprint','origin','context','csv','observed-at','scope','performance','out']);
const HELP='Usage: node stage3/seo-engine/bin/analyze-search-indexing.cjs --blueprint /ABS/approved-blueprint.json --origin https://example.com/ --context /ABS/private/gsc-context.json --csv /ABS/private/normalized-url-status.csv --observed-at YYYY-MM-DD --scope example-urls|selected-urls|all-exported-rows --out /ABS/NEW-PRIVATE-FOLDER [--performance /ABS/performance-insights.json]';
function args(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length%2)throw Error(HELP);
 const out={};
 for(let i=0;i<argv.length;i+=2){
  const k=argv[i]?.replace(/^--/,'');
  if(!argv[i]?.startsWith('--')||!KEYS.has(k)||out[k]||!argv[i+1])
   throw Error('Invalid or duplicate indexing flag '+argv[i]);
  out[k]=argv[i+1];
 }
 if(['blueprint','origin','context','csv','observed-at','scope','out'].some(k=>!out[k]))throw Error(HELP);
 for(const k of ['blueprint','context','csv','performance','out'])if(out[k]&&!path.isAbsolute(out[k]))
  throw Error('Index evidence requires absolute private paths: '+k);
 return out;
}
function read(file,max){
 const st=fs.lstatSync(file);
 if(st.isSymbolicLink()||!st.isFile()||st.size<4||st.size>max)
  throw Error('Invalid or oversized private indexing input');
 const buf=fs.readFileSync(file);
 return {body:buf.toString('utf8'),sha256:crypto.createHash('sha256').update(buf).digest('hex')};
}
function main(argv){
 const f=args(argv);
 if(!f){process.stdout.write(HELP+'\n');return;}
 const bp=read(f.blueprint,2500000),b=checkBlueprint(JSON.parse(bp.body));
 const ctx=CONTEXT.validate(JSON.parse(read(f.context,30000).body));
 CONTEXT.assertOrigin(ctx,f.origin);
 const csv=read(f.csv,5000000),table=INDEX.parseExport(csv.body);
 const p=f.performance?read(f.performance,5000000):null;
 const result=INDEX.analyze({
  blueprint:b,blueprintSha256:bp.sha256,origin:f.origin,context:ctx,
  observedAt:f['observed-at'],exportScope:f.scope,table,
  performance:p?JSON.parse(p.body):null,performanceSha256:p?.sha256||null
 });
 result.inputSHA256={blueprint:bp.sha256,context:read(f.context,30000).sha256,
  indexingCsv:csv.sha256,performance:p?.sha256||null};
 const view=VIEW.render(result);
 const out=PRIVATE.privateOutput(f.out);
 fs.mkdirSync(out,{recursive:false,mode:0o700});
 function write(name,body){
  const fd=fs.openSync(path.join(out,name),'wx',0o600);
  try{fs.writeFileSync(fd,body);}finally{fs.closeSync(fd);}
 }
 write('indexing-intelligence.json',JSON.stringify(result,null,2)+'\n');
 write('indexing-intelligence.md',INDEX.markdown(result));
 write('index.html',view.html);
 write('PRIVATE-README.txt','This local indexing review contains private operator GSC evidence; never upload, publish or commit. URL indexing may be delayed or sampled. No CMS changes authorized.\n');
 process.stdout.write('PRIVATE INDEXING INTELLIGENCE: '+result.summary.actions+' human tasks; '+
  result.summary.observedApprovedPages+'/'+result.summary.approvedPages+' approved URLs observed. '+out+'\n');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){process.stderr.write('SEO indexing intelligence: '+e.message+'\n');process.exitCode=1;}}
module.exports=Object.freeze({args,main});
