#!/usr/bin/env node
'use strict';
/* One offline owner-only operator workspace from current SEO evidence; no subprocess, no CMS actions. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const WORK=require('../lib/seo-operator-workspace.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const HELP='Usage: node stage3/seo-engine/bin/build-seo-operator-workspace.cjs --config /ABS/private/seo-workspace-config.json --out /ABS/NEW-PRIVATE-DIR';
const CONFIG='manufact-seo-operator-workspace-config-v1';
const ROOT=path.resolve(__dirname,'../../..');
function flags(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length!==4||argv[0]!=='--config'||argv[2]!=='--out'||
   !path.isAbsolute(argv[1]||'')||!path.isAbsolute(argv[3]||''))throw Error(HELP);
 return {config:argv[1],out:argv[3]};
}
function input(file,max){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('Workspace input paths must be absolute');
 const resolved=fs.realpathSync(file),relative=path.relative(ROOT,resolved);
 if(relative===''||relative==='.'||!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))
  throw Error('Customer SEO source evidence must not be stored inside Git checkout');
 const st=fs.lstatSync(file);
 if(st.isSymbolicLink()||!st.isFile()||st.size<10||st.size>max)
  throw Error('Unsafe or oversized private workspace source file');
 const buf=fs.readFileSync(file);
 return {data:JSON.parse(buf.toString('utf8')),
  sha256:crypto.createHash('sha256').update(buf).digest('hex')};
}
function readConfiguration(source){
 if(source?.format!==CONFIG||typeof source!=='object'||Array.isArray(source)||
   Object.keys(source).some(k=>!['format','firstSite','search','indexing','liveAcceptance'].includes(k))||
   !source.firstSite&&!source.search&&!source.indexing)
  throw Error('Private workspace configuration needs firstSite or search inputs');
 const shapes={firstSite:['summary','bundle','postDeploy','operatorReview'],
  search:['history','decisions','releases'],liveAcceptance:['report','contract']};
 if(source.indexing&&(!source.indexing.report||Object.keys(source.indexing).some(k=>k!=='report')||
   typeof source.indexing.report!=='string'||!path.isAbsolute(source.indexing.report)))
  throw Error('Indexing workspace source must be a private absolute report path');
 for(const [kind,names] of Object.entries(shapes)){
  const s=source[kind];
  if(!s)continue;
  if(typeof s!=='object'||Array.isArray(s)||Object.keys(s).some(k=>!names.includes(k))||
   !s[kind==='firstSite'?'summary':kind==='search'?'history':'report']||
   kind==='liveAcceptance'&&!s.contract)
   throw Error('Unsupported or incomplete '+kind+' workspace input fields');
  for(const key of names)if(s[key]!==undefined&&(!path.isAbsolute(s[key]||'')||
    typeof s[key]!=='string'))throw Error('Workspace input must be an absolute private path');
 }
 return source;
}
function main(argv){
 const args=flags(argv);
 if(!args){process.stdout.write(HELP+'\n');return;}
 const config=readConfiguration(input(args.config,150000).data);
 const sources={},digests={};
 const collect=(group,fields)=>{
  if(!config[group])return null;
  const result={};
  digests[group]={};
  for(const [field,max] of Object.entries(fields)){
   if(!config[group][field])continue;
   const v=input(config[group][field],max);
   result[field]=v.data;
   digests[group][field]=v.sha256;
  }
  return result;
 };
 const first=collect('firstSite',{summary:1500000,bundle:45000000,postDeploy:2500000,operatorReview:2000000});
 const search=collect('search',{history:4500000,decisions:2500000,releases:4500000});
 if(first){
  first.summarySha=digests.firstSite.summary;
  first.postDeploySha=digests.firstSite.postDeploy||null;
 }
 if(search)search.historySha=digests.search.history;
 const indexing=collect('indexing',{report:4500000});
 const human=collect('liveAcceptance',{report:2500000,contract:2500000});
 if(human)human.contractSha=digests.liveAcceptance.contract;
 const workspace=WORK.build({firstSite:first,search,indexing:indexing?.report||null,
  liveAcceptance:human});
 const out=PRIVATE.privateOutput(args.out);
 fs.mkdirSync(out,{mode:0o700,recursive:false});
 function write(name,content){
  const fd=fs.openSync(path.join(out,name),'wx',0o600);
  try{fs.writeFileSync(fd,content);}finally{fs.closeSync(fd);}
 }
 write('index.html',workspace.homeHtml);
 if(workspace.launchHtml)write('launch.html',workspace.launchHtml);
 if(workspace.searchHtml)write('search.html',workspace.searchHtml);
 if(workspace.indexingHtml)write('indexing.html',workspace.indexingHtml);
 if(workspace.humanHtml)write('human.html',workspace.humanHtml);
 write('workspace-manifest.json',JSON.stringify({format:workspace.format,siteId:workspace.siteId,
  readOnly:true,overview:workspace.overview,inputSHA256:digests,configSHA256:input(args.config,150000).sha256,
  releaseAuthorized:false,limitations:workspace.limitations},null,2)+'\n');
 write('PRIVATE-README.txt','Private local SEO operator workspace. No actual CMS/Google connection, release approval or deploy. NEVER publish, upload or commit these reports.\n');
 process.stdout.write('MANUFACT PRIVATE WORKSPACE: '+workspace.siteId+
  ' (launch '+workspace.overview.launchIncluded+', search '+workspace.overview.searchIncluded+', indexing '+workspace.overview.indexingIncluded+
  '); open locally '+path.join(out,'index.html')+'\n');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){process.stderr.write('SEO operator workspace: '+e.message+'\n');process.exitCode=1;}}
module.exports=Object.freeze({CONFIG,flags,readConfiguration,main});
