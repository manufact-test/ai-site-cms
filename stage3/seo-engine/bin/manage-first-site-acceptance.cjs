#!/usr/bin/env node
'use strict';
/* Private, source-bound human first-site launch acceptance ledger. No release approval. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const FLOW=require('../lib/first-site-acceptance-workflow.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const HELP='Usage: node stage3/seo-engine/bin/manage-first-site-acceptance.cjs template|review --summary /ABS/first-site/summary.json [--bundle /ABS/first-site/bundle.json] [--ledger /ABS/edited-ledger.json] [--previous-summary /ABS/old-summary.json --previous-ledger /ABS/old-ledger.json] --out /ABS/NEW-PRIVATE-DIR';
function flags(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 const [command,...args]=argv;
 if(!['template','review'].includes(command)||args.length%2)throw Error(HELP);
 const f={command};
 const supported=new Set(['summary','bundle','ledger','out','previous-summary','previous-ledger']);
 for(let i=0;i<args.length;i+=2){
  const key=args[i].replace(/^--/,'');
  if(!args[i].startsWith('--')||!supported.has(key)||f[key]||!path.isAbsolute(args[i+1]||''))
   throw Error('Invalid or repeated first-site acceptance flag: '+args[i]);
  f[key]=args[i+1];
 }
 if(!f.summary||!f.out||command==='review'&&(!f.ledger||f['previous-summary']||f['previous-ledger'])||
  command==='template'&&(f.ledger||!!f['previous-summary']!==!!f['previous-ledger']))
  throw Error(HELP);
 return f;
}
function load(file,limit){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<8||st.size>limit)
  throw Error('Invalid private first-site acceptance input');
 const data=fs.readFileSync(file);
 return {json:JSON.parse(data.toString('utf8')),
  sha256:crypto.createHash('sha256').update(data).digest('hex')};
}
function main(argv){
 const f=flags(argv);
 if(!f){process.stdout.write(HELP+'\n');return;}
 const source=load(f.summary,1500000),bundle=f.bundle?load(f.bundle,45000000):null;
 const files={};
 if(f.command==='template'){
  let previous=null;
  if(f['previous-summary']){
   const older=load(f['previous-summary'],1500000),ledger=load(f['previous-ledger'],1500000);
   FLOW.review(older.json,older.sha256,ledger.json);
   if(older.json.siteId!==source.json.siteId)
    throw Error('Previous first-site checklist belongs to another site');
   previous=ledger.json;
  }
  const templ=FLOW.template(source.json,source.sha256,bundle?.json||null,previous);
  files['first-site-operator-template.json']=JSON.stringify(templ,null,2)+'\n';
  files['PRIVATE-README.txt']='Human editable first-site checklist. Do not commit to Git or treat as release approval. Prior decisions reference-only.\n';
 }else{
  const ledger=load(f.ledger,1500000);
  const reviewed=FLOW.review(source.json,source.sha256,ledger.json,bundle?.json||null);
  files['first-site-operator-review.json']=JSON.stringify(reviewed,null,2)+'\n';
  files['first-site-operator-review.md']=FLOW.markdown(reviewed);
  files['PRIVATE-README.txt']='Operator assertions only. Original technical blockers remain in effect, regardless of stated completion.\n';
 }
 const out=PRIVATE.privateOutput(f.out);
 fs.mkdirSync(out,{recursive:false,mode:0o700});
 for(const [name,content] of Object.entries(files)){
  const fd=fs.openSync(path.join(out,name),'wx',0o600);
  try{fs.writeFileSync(fd,content);}finally{fs.closeSync(fd);}
 }
 process.stdout.write('First-site private human '+f.command+' written: '+out+'\n');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){process.stderr.write('First-site acceptance workflow: '+e.message+'\n');process.exitCode=1;}}
module.exports=Object.freeze({flags,main});
