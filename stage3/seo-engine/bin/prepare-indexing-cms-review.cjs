#!/usr/bin/env node
'use strict';
/* Private read-only indexability-to-CMS field work packets. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {checkBlueprint}=require('../lib/blueprint.cjs');
const {auditSite}=require('../lib/analyze.cjs');
const BRIDGE=require('../lib/search-indexing-cms-review.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const HELP='Usage: node stage3/seo-engine/bin/prepare-indexing-cms-review.cjs --blueprint /ABS/blueprint.json --site /ABS/site-v1.json --indexing /ABS/indexing-intelligence.json --out /ABS/NEW-PRIVATE-DIR [--manifests /ABS/component-dir]';
function args(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length%2)throw Error(HELP);
 const f={},keys=new Set(['blueprint','site','indexing','out','manifests']);
 for(let i=0;i<argv.length;i+=2){
  const key=argv[i].replace(/^--/);
  if(!argv[i].startsWith('--')||!keys.has(key)||f[key]||!path.isAbsolute(argv[i+1]||''))
   throw Error('Invalid or duplicate indexing CMS review flag');
  f[key]=argv[i+1];
 }
 if(['blueprint','site','indexing','out'].some(k=>!f[k]))throw Error(HELP);
 return f;
}
function read(file,max){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<10||st.size>max)
  throw Error('Unsafe or oversized private indexing CMS source');
 const buf=fs.readFileSync(file);
 return {data:JSON.parse(buf.toString('utf8')),sha256:crypto.createHash('sha256').update(buf).digest('hex')};
}
function main(argv){
 const flags=args(argv);
 if(!flags){process.stdout.write(HELP+'\n');return;}
 const bp=read(flags.blueprint,2500000);
 const blueprint=checkBlueprint(bp.data);
 const site=read(flags.site,2500000);
 const indexing=read(flags.indexing,5500000);
 const folder=flags.manifests||path.resolve(__dirname,'../../components');
 const files=fs.readdirSync(folder).filter(x=>x.endsWith('.json'));
 const registry=files.map(name=>JSON.parse(fs.readFileSync(path.join(folder,name),'utf8')));
 auditSite(site.data,registry,blueprint);
 const report=BRIDGE.build(blueprint,bp.sha256,site.data,indexing.data,indexing.sha256);
 const dest=PRIVATE.privateOutput(flags.out);
 fs.mkdirSync(dest,{recursive:false,mode:0o700});
 function write(name,body){
  const fd=fs.openSync(path.join(dest,name),'wx',0o600);
  try{fs.writeFileSync(fd,body);}finally{fs.closeSync(fd);}
 }
 const withSHA={...report,inputSHA256:{blueprint:bp.sha256,site:site.sha256,indexing:indexing.sha256}};
 write('indexing-cms-work-packets.json',JSON.stringify(withSHA,null,2)+'\n');
 write('indexing-cms-work-packets.md',BRIDGE.markdown(report));
 write('PRIVATE-README.txt','Private read-only owner CMS indexing review. Not authenticated Google evidence, CMS approval, Save or Publish.\n');
 process.stdout.write('INDEXING → CMS HUMAN REVIEW: '+report.summary.actionPackets+' packets, '+report.summary.blockedOrUnmapped+' blocked. '+dest+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch(e){process.stderr.write('Indexing CMS review: '+e.message+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({args,main});
