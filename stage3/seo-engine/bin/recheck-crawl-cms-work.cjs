#!/usr/bin/env node
'use strict';
/* Private-only offline human ledger and recheck CLI for existing crawl CMS worklists.
 * No repo evidence, subprocess, CMS API, live network, PR, approval or publish.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const CYCLE=require('../lib/crawl-cms-lifecycle.cjs');
const VIEW=require('../lib/crawl-cms-recheck-view.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const ROOT=path.resolve(__dirname,'../../..');
const HELP=[
 'Usage:',
 '  node stage3/seo-engine/bin/recheck-crawl-cms-work.cjs --worklist /ABS/private/worklist.json --out /ABS/NEW-private-folder',
 '  node stage3/seo-engine/bin/recheck-crawl-cms-work.cjs --before /ABS/old/worklist.json --after /ABS/new/worklist.json [--decisions /ABS/private/old-ledger.json] --out /ABS/NEW-private-folder',
 'NEVER upload to repo or publish any generated private file.'
].join('\n');
function flags(args){
 if(args.length===1&&args[0]==='--help')return null;
 if(args.length%2||args.length<4||args.length>8)throw Error(HELP);
 const values={};
 for(let i=0;i<args.length;i+=2){
  const key=args[i];
  if(!['--worklist','--before','--after','--decisions','--out'].includes(key)||
   values[key]!==undefined||!path.isAbsolute(args[i+1]||''))
   throw Error(HELP);
  values[key]=args[i+1];
 }
 const single=!!values['--worklist'],duo=!!values['--before']&&!!values['--after'];
 if(!values['--out']||single===duo||single&&(Object.keys(values).length!==2)||
  duo&&(Object.keys(values).length!==3&&Object.keys(values).length!==4)||
  duo&&values['--worklist']||!duo&&values['--decisions'])
  throw Error(HELP);
 return {mode:single?'template':'recheck',worklist:values['--worklist']||null,
  before:values['--before']||null,after:values['--after']||null,
  decisions:values['--decisions']||null,out:values['--out']};
}
function source(file){
 if(!path.isAbsolute(file))throw Error('Original source path must be absolute');
 const real=fs.realpathSync(file),relative=path.relative(ROOT,real);
 if(relative===''||relative==='.'||!relative.startsWith('..'+path.sep)&&
  relative!=='..'&&!path.isAbsolute(relative))
  throw Error('NEVER store private crawl/CMS worklist, decisions or source in Git checkout');
 const info=fs.lstatSync(file);
 if(!info.isFile()||info.isSymbolicLink()||info.size<10||info.size>4500000)
  throw Error('Invalid original private worklist/ledger file');
 const buf=fs.readFileSync(file);
 return {sha256:crypto.createHash('sha256').update(buf).digest('hex'),
  data:JSON.parse(buf.toString('utf8'))};
}
function main(args){
 const config=flags(args);
 if(!config){process.stdout.write(HELP+'\n');return;}
 const files=config.mode==='template'?{worklist:config.worklist}:
  {before:config.before,after:config.after,...(config.decisions?{decisions:config.decisions}:{})};
 const input={},pinned={};
 for(const [key,file] of Object.entries(files)){
  input[key]=source(file);pinned[key]={file,sha256:input[key].sha256};
 }
 let created={},overview;
 if(config.mode==='template'){
  const template=CYCLE.template(input.worklist.data,input.worklist.sha256);
  created['crawl-cms-decisions-TEMPLATE.json']=JSON.stringify(template,null,2)+'\n';
  overview={mode:'human-ledger-TEMPLATE',siteId:template.siteId,templateTasks:template.decisions.length,
   humanEditable:true,autoApproval:false};
 }else{
  const r=CYCLE.compare(input.before.data,input.before.sha256,input.after.data,input.after.sha256,
   input.decisions?.data||null,input.decisions?.sha256||null);
  const view=VIEW.render(r);
  const nextTemplate=CYCLE.template(input.after.data,input.after.sha256);
  created={
   'crawl-cms-recheck.html':view.html,
   'crawl-cms-recheck.md':view.markdown,
   'crawl-cms-recheck.json':JSON.stringify(r,null,2)+'\n',
   'crawl-cms-next-decisions-TEMPLATE.json':JSON.stringify(nextTemplate,null,2)+'\n'
  };
  overview={mode:'two-cycle-recheck',siteId:r.siteId,summary:r.summary,
   sourceBeforeRawSha256:r.sourceBeforeRawSha256,sourceAfterRawSha256:r.sourceAfterRawSha256,
   nextHumanTemplateIsFresh:true,automaticClosure:false};
 }
 const out=PRIVATE.privateOutput(config.out);
 const staging=fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(out)),'.seo-cms-cycle-incomplete-'));
 let success=false;
 try{
  for(const [name,data] of Object.entries(created))
   fs.writeFileSync(path.join(staging,name),data,{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(staging,'PRIVATE-SOURCE-MANIFEST.json'),
   JSON.stringify({format:'manufact-seo-crawl-cms-cycle-output-v1',overview,
    originalInputSHA256:Object.fromEntries(Object.entries(pinned)
     .map(([key,v])=>[key,v.sha256])),
    noPublicHostAuthenticated:true,clientApprovalAuthenticated:false,
    releaseAuthorized:false,automaticApplication:false},null,2)+'\n',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(staging,'PRIVATE-README.txt'),
   'Private source-bound SEO crawl/CMS manual evidence only. Not a CMS patch, verified fix, or release. NEVER publish or commit.\n',
   {flag:'wx',mode:0o600});
  for(const v of Object.values(pinned))if(source(v.file).sha256!==v.sha256)
   throw Error('Original private evidence changed while preparing the cycle report');
  if(fs.existsSync(out))throw Error('Output directory appeared during staging; refusing overwrite');
  fs.renameSync(staging,out);success=true;
 }finally{if(!success)fs.rmSync(staging,{force:true,recursive:true});}
 process.stdout.write('PRIVATE SEO CRAWL CMS '+overview.mode+' · site '+overview.siteId+
  ' · no release authorization · '+out+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){
  process.stderr.write('SEO crawl CMS lifecycle CLI: '+e.message+'\n');process.exitCode=1;
 }
}
module.exports=Object.freeze({HELP,flags,source,main});
