#!/usr/bin/env node
'use strict';
/* Offline history of several completed private Search Console reports. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PRIVATE=require('../lib/private-output-policy.cjs');
const {checkBlueprint}=require('../lib/blueprint.cjs');
const HISTORY=require('../lib/search-history.cjs');
const HELP='Usage: node stage3/seo-engine/bin/analyze-search-history.cjs --blueprint /ABS/approved-blueprint.json --report /ABS/period-1/performance-insights.json --report /ABS/period-2/performance-insights.json [--report /ABS/period-3/performance-insights.json] --out /ABS/NEW-private-history';
function file(filename,max){
 if(!path.isAbsolute(filename))throw Error('Use absolute private input paths');
 const st=fs.lstatSync(filename);
 if(!st.isFile()||st.isSymbolicLink()||st.size<10||st.size>max)throw Error('Invalid history source file');
 const buf=fs.readFileSync(filename);
 return {json:JSON.parse(buf.toString('utf8')),sha256:crypto.createHash('sha256').update(buf).digest('hex')};
}
function flags(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 const opt={reports:[]};
 if(argv.length%2)throw Error(HELP);
 for(let i=0;i<argv.length;i+=2){
  const name=argv[i],value=argv[i+1];
  if(!value||!path.isAbsolute(value))throw Error('History requires full private paths');
  if(name==='--report')opt.reports.push(value);
  else if(name==='--blueprint'&&!opt.blueprint)opt.blueprint=value;
  else if(name==='--out'&&!opt.out)opt.out=value;
  else throw Error('Unknown/duplicate flag '+name);
 }
 if(!opt.blueprint||!opt.out||opt.reports.length<2||opt.reports.length>24||
  new Set(opt.reports).size!==opt.reports.length)throw Error(HELP);
 return opt;
}
function main(args){
 const f=flags(args);
 if(!f){process.stdout.write(HELP+'\n');return;}
 const bp=file(f.blueprint,2500000);
 const plan=checkBlueprint(bp.json);
 const reports=f.reports.map(filePath=>{
  const r=file(filePath,4500000);
  if(r.json.blueprintSha256!==bp.sha256||r.json.siteId!==plan.siteId)
   throw Error('GSC report was not produced with exact supplied approved Blueprint bytes: '+filePath);
  return {report:r.json,sha256:r.sha256};
 });
 const history=HISTORY.build(reports);
 const out=PRIVATE.privateOutput(f.out);
 fs.mkdirSync(out,{mode:0o700,recursive:false});
 function write(name,content){
  const fd=fs.openSync(path.join(out,name),'wx',0o600);
  try{fs.writeFileSync(fd,content);}finally{fs.closeSync(fd);}
 }
 write('search-history.json',JSON.stringify(history,null,2)+'\n');
 write('search-history.md',HISTORY.markdown(history));
 write('PRIVATE-README.txt','Offline search data; private only. Missing GSC rows are UNKNOWN, not zero. Do not publish or commit.\n');
 process.stdout.write('Search history: '+history.summary.periodCount+' periods, '+history.summary.actions+
  ' investigation prompts; output '+out+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){process.stderr.write('SEO search history: '+e.message+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({main,flags});
