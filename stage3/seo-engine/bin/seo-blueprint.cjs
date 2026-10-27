#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {compileBrief,checkBlueprint}=require('../lib/blueprint.cjs');
const {auditSite,snapshotAudit}=require('../lib/analyze.cjs');
const {explain}=require('../lib/explain.cjs');
const {propose}=require('../lib/handoff.cjs');
function main(argv){
 const [command,...args]=argv;
 const flags={};
 for(let i=0;i<args.length;i+=2){
  if(!args[i]?.startsWith('--')||!args[i+1]||flags[args[i]])throw Error('Use --name value options');
  flags[args[i].slice(2)]=args[i+1];
 }
 function read(key){if(!flags[key])throw Error('Missing --'+key);const data=fs.readFileSync(path.resolve(flags[key]),'utf8');if(data.length>2000000)throw Error('Input too large');return JSON.parse(data);}
 function manifests(){
  const dir=path.resolve(flags.manifests||path.join(__dirname,'../../components'));
  return fs.readdirSync(dir).filter(x=>x.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
 }
 let out;
 if(command==='compile')out=compileBrief(read('brief'));
 else if(command==='explain')out=explain(checkBlueprint(read('blueprint')));
 else if(command==='analyze-site')out=auditSite(read('site'),manifests(),flags.blueprint?read('blueprint'):null);
 else if(command==='analyze-html')out=snapshotAudit(read('snapshot'));
 else if(command==='handoff')out=propose(read('site'),manifests(),read('blueprint'));
 else throw Error('Commands: compile --brief file | explain --blueprint file | analyze-site --site file [--manifests dir] [--blueprint file] | analyze-html --snapshot file | handoff --site file --blueprint file [--manifests dir]');
 process.stdout.write(typeof out==='string'?out+'\n':JSON.stringify(out,null,2)+'\n');
}
try{main(process.argv.slice(2));}catch(e){process.stderr.write('SEO Engine: '+e.message+'\n');process.exitCode=1;}
