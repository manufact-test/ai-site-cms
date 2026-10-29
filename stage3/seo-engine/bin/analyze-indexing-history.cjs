#!/usr/bin/env node
'use strict';
/* Compare 2–24 private URL indexing intelligence snapshots with explicit unknown coverage. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const HIST=require('../lib/search-indexing-history.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const HELP='Usage: node stage3/seo-engine/bin/analyze-indexing-history.cjs --report /ABS/previous/indexing-intelligence.json --report /ABS/latest/indexing-intelligence.json [--report /ABS/extra/indexing-intelligence.json] --out /ABS/NEW-private-folder';
function args(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length%2)throw Error(HELP);
 const reports=[];let out=null;
 for(let i=0;i<argv.length;i+=2){
  const key=argv[i],value=argv[i+1];
  if(!path.isAbsolute(value||''))throw Error('Indexing snapshot files/output require absolute paths');
  if(key==='--report')reports.push(value);
  else if(key==='--out'&&!out)out=value;
  else throw Error('Unknown/duplicate indexing history flag');
 }
 if(reports.length<2||reports.length>24||new Set(reports).size!==reports.length||!out)throw Error(HELP);
 return {reports,out};
}
function read(file){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<10||st.size>5500000)
  throw Error('Unsafe/oversized indexing snapshot input');
 const buf=fs.readFileSync(file);
 return {report:JSON.parse(buf.toString('utf8')),
  sha256:crypto.createHash('sha256').update(buf).digest('hex')};
}
function main(argv){
 const f=args(argv);
 if(!f){process.stdout.write(HELP+'\n');return;}
 const hist=HIST.build(f.reports.map(read));
 const target=PRIVATE.privateOutput(f.out);
 fs.mkdirSync(target,{mode:0o700,recursive:false});
 function write(name,text){
  const fd=fs.openSync(path.join(target,name),'wx',0o600);
  try{fs.writeFileSync(fd,text);}finally{fs.closeSync(fd);}
 }
 write('indexing-history.json',JSON.stringify(hist,null,2)+'\n');
 write('indexing-history.md',HIST.markdown(hist));
 write('PRIVATE-README.txt','Private operator URL indexing observations; never published, uploaded or committed. Status transitions are NOT validated Google events.\n');
 process.stdout.write('URL indexing history: '+hist.summary.snapshots+' snapshots, '+
  hist.summary.humanTasks+' human checks. '+target+'\n');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){process.stderr.write('URL indexing history: '+e.message+'\n');process.exitCode=1;}}
module.exports=Object.freeze({args,main});
