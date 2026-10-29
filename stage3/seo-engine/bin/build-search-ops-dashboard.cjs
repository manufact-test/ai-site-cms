#!/usr/bin/env node
'use strict';
/* Local-only static HTML SEO dashboard. Not a public site export. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const VIEW=require('../lib/search-ops-dashboard.cjs'),PRIVATE=require('../lib/private-output-policy.cjs');
const HELP='Usage: node stage3/seo-engine/bin/build-search-ops-dashboard.cjs --history /ABS/search-history.json [--decisions /ABS/search-action-review.json] [--releases /ABS/seo-release-followup.json] --out /ABS/NEW-private-dir';
function options(args){
 if(args.length===1&&args[0]==='--help')return null;
 if(args.length%2)throw Error(HELP);
 const f={};
 for(let i=0;i<args.length;i+=2){
  const key=args[i].replace(/^--/,'');
  if(!args[i].startsWith('--')||!['history','decisions','releases','out'].includes(key)||f[key]||
     !path.isAbsolute(args[i+1]||''))throw Error(HELP);
  f[key]=args[i+1];
 }
 if(!f.history||!f.out)throw Error(HELP);
 return f;
}
function read(file){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<8||st.size>5500000)throw Error('Invalid private dashboard input');
 const buf=fs.readFileSync(file);
 return {json:JSON.parse(buf.toString('utf8')),
  sha256:crypto.createHash('sha256').update(buf).digest('hex')};
}
function main(args){
 const f=options(args);
 if(!f){process.stdout.write(HELP+'\n');return;}
 const history=read(f.history);
 const decisions=f.decisions?read(f.decisions):null,releases=f.releases?read(f.releases):null;
 const report=VIEW.render(history.json,history.sha256,decisions?.json||null,releases?.json||null);
 const out=PRIVATE.privateOutput(f.out);
 fs.mkdirSync(out,{recursive:false,mode:0o700});
 function save(name,content){
  const fd=fs.openSync(path.join(out,name),'wx',0o600);
  try{fs.writeFileSync(fd,content);}finally{fs.closeSync(fd);}
 }
 save('index.html',report.html);
 save('dashboard-manifest.json',JSON.stringify({...report.summary,format:VIEW.FORMAT,
  sourceSha256:{history:history.sha256,decisions:decisions?.sha256||null,
   releases:releases?.sha256||null},releaseAuthorized:false,readOnly:true},null,2)+'\n');
 save('PRIVATE-README.txt','Private local HTML dashboard. Never upload this folder or expose via static host. Contains proprietary search data, owner actions and search query evidence. Does not connect to Google/CMS.\n');
 process.stdout.write('Private SEO dashboard: '+report.summary.pages+' pages, '+
  report.summary.tasks+' tasks. Open locally: '+path.join(out,'index.html')+'\n');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){process.stderr.write('Private SEO dashboard: '+e.message+'\n');process.exitCode=1;}}
module.exports=Object.freeze({options,main});
