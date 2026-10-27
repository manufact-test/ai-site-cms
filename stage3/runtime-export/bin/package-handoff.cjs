#!/usr/bin/env node
'use strict';
/** D4 one-command published D2 handoff -> immutable runtime -> ZIP.
 * No system PHP, network, npm, deployment or production data.
 * Next Static requires actual npm build in the isolated generated folder:
 * use build-handoff, npm run build, prepare-delivery separately.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const fail=m=>{throw Error('D4 handoff packaging: '+m);};
const [handoff,technology,destination,...options]=process.argv.slice(2);
const [html,php,ssr]=['html','php','next-ssr'];
let work=null;
function exec(script,args){
  const child=spawnSync(process.execPath,[path.join(__dirname,script),...args],
    {encoding:'utf8',timeout:150000});
  if(child.status!==0)fail(script+' refused: '+(child.stderr||child.stdout||'unknown').slice(0,700));
  return child.stdout;
}
try{
  if(process.argv.length<5||!path.isAbsolute(handoff??'')||!path.isAbsolute(destination??'')
    ||!['html','php','next-ssr'].includes(technology)
    ||options.length>1||(options.length&&(!options[0].startsWith('--expect-origin='))))
    fail('Usage: package-handoff.cjs /ABS/published-D2.json html|php|next-ssr /ABS/NEW-site.zip [--expect-origin=https://...]');
  if(fs.lstatSync(handoff).isSymbolicLink()||!fs.statSync(handoff).isFile())
    fail('input handoff must be an ordinary file');
  work=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-D4-'));
  const built=path.join(work,'built');
  exec('build-handoff.cjs',[handoff,technology,built]);
  const result=JSON.parse(exec('prepare-delivery.cjs',[built,destination,...options]));
  const verified=JSON.parse(exec('verify-delivery.cjs',[destination]));
  if(verified.sha256!==result.sha256||verified.siteId!==result.siteId
    ||verified.publishedVersion!==result.version)fail('ZIP verification differs from generated release');
  process.stdout.write(JSON.stringify({...result,verified:true,from:'immutable-D2-handoff'},null,2)+'\n');
}catch(e){console.error(e.message);process.exitCode=1;}
finally{if(work)fs.rmSync(work,{recursive:true,force:true});}
