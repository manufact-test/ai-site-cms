#!/usr/bin/env node
'use strict';
/* Private offline release timeline: source-locked human journal + measured GSC periods. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const F=require('../lib/search-release-followup.cjs'),PRIVATE=require('../lib/private-output-policy.cjs');
const HELP='Usage: node stage3/seo-engine/bin/manage-search-releases.cjs template --history /ABS/search-history.json --out /ABS/NEW-PRIVATE-DIR | review --history /ABS/search-history.json --journal /ABS/manual-journal.json --out /ABS/NEW-PRIVATE-DIR';
function flags(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 const [action,...args]=argv;
 if(!['template','review'].includes(action)||args.length%2)throw Error(HELP);
 const f={action};
 for(let i=0;i<args.length;i+=2){
  const k=args[i].replace(/^--/,'');
  if(!args[i].startsWith('--')||!['history','journal','out'].includes(k)||f[k]||!path.isAbsolute(args[i+1]||''))throw Error(HELP);
  f[k]=args[i+1];
 }
 if(!f.history||!f.out||action==='review'&&!f.journal||action==='template'&&f.journal)throw Error(HELP);
 return f;
}
function read(file){
 const st=fs.lstatSync(file);
 if(st.isSymbolicLink()||!st.isFile()||st.size<8||st.size>4500000)throw Error('Unsafe private JSON input');
 const buf=fs.readFileSync(file);
 return {data:JSON.parse(buf.toString('utf8')),
  sha256:crypto.createHash('sha256').update(buf).digest('hex')};
}
function main(argv){
 const f=flags(argv);
 if(!f){process.stdout.write(HELP+'\n');return;}
 const history=read(f.history),files={};
 if(f.action==='template'){
  const initial=F.template(history.data,history.sha256);
  files['release-journal-template.json']=JSON.stringify(initial,null,2)+'\n';
  files['PRIVATE-README.txt']='Fill actual CMS published revisions and affected page IDs manually. Never commit private release logs.\n';
 }else{
  const journal=read(f.journal),report=F.build(history.data,history.sha256,journal.data);
  report.inputDigests={history:history.sha256,journal:journal.sha256};
  files['seo-release-followup.json']=JSON.stringify(report,null,2)+'\n';
  files['seo-release-followup.md']=F.markdown(report);
  files['PRIVATE-README.txt']='Observed GSC differences are not causal proof; private operator declarations only.\n';
 }
 const dir=PRIVATE.privateOutput(f.out);
 fs.mkdirSync(dir,{recursive:false,mode:0o700});
 for(const [name,value] of Object.entries(files)){
  const fd=fs.openSync(path.join(dir,name),'wx',0o600);
  try{fs.writeFileSync(fd,value);}finally{fs.closeSync(fd);}
 }
 process.stdout.write('Private SEO release '+f.action+' created: '+dir+'\n');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){process.stderr.write('SEO release follow-up: '+e.message+'\n');process.exitCode=1;}}
module.exports=Object.freeze({flags,main});
