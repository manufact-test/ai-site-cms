#!/usr/bin/env node
'use strict';
/* No network, browser launch, CMS mutation or publishing. Original evidence is private. */
const fs=require('node:fs'),path=require('node:path');
const SRC=require('./review-structured-data.cjs');
const POLICY=require('../lib/private-output-policy.cjs');
const QA=require('../lib/seo-rendered-content-audit.cjs');
const VIEW=require('../lib/seo-rendered-content-view.cjs');
const HELP='Usage: node stage3/seo-engine/bin/review-rendered-content.cjs --blueprint /ABS/approved-blueprint.json --site /ABS/owner-site.json --public-http /ABS/public-https.json --viewports /ABS/viewport-capture.json --out /ABS/NEW-PRIVATE-DIR [--origin https://approved.example/mount/]';
const FILES={'--blueprint':2200000,'--site':3500000,'--public-http':36000000,'--viewports':65000000};
function flags(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(!Array.isArray(argv)||![10,12].includes(argv.length)||argv.length%2)throw Error(HELP);
 const out={};
 for(let i=0;i<argv.length;i+=2){
  const k=argv[i],v=argv[i+1];
  if(!(k in FILES)&&k!=='--origin'&&k!=='--out'||out[k]!==undefined||!v)throw Error(HELP);
  out[k]=v;
 }
 for(const key of [...Object.keys(FILES),'--out'])
  if(typeof out[key]!=='string'||!path.isAbsolute(out[key]))throw Error(HELP);
 if(new Set([...Object.keys(FILES).map(k=>out[k]),out['--out']]).size!==5)
  throw Error('Sources and private output must be distinct');
 if(out['--origin']){
  const u=new URL(out['--origin']);
  if(u.href!==out['--origin']||u.protocol!=='https:'||!u.pathname.endsWith('/')||
   u.username||u.password||u.search||u.hash)throw Error('Exact public HTTPS origin/mount required');
 }
 return out;
}
function main(argv){
 const args=flags(argv);
 if(!args){process.stdout.write(HELP+'\n');return null}
 const originals={};
 for(const [key,max] of Object.entries(FILES))originals[key]=SRC.source(args[key],max);
 const report=QA.analyze({blueprint:originals['--blueprint'].value,
  blueprintRawSha256:originals['--blueprint'].sha,
  site:originals['--site'].value,siteRawSha256:originals['--site'].sha,
  capture:originals['--public-http'].value,captureRawSha256:originals['--public-http'].sha,
  viewports:originals['--viewports'].value,viewportsRawSha256:originals['--viewports'].sha,
  expectedBase:args['--origin']||null});
 const presentation=VIEW.render(report),destination=POLICY.privateOutput(args['--out']);
 const stage=fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(destination)),
  '.seo-rendered-incomplete-'));
 let finished=false;
 try{
  const write=(name,body)=>fs.writeFileSync(path.join(stage,name),body,{mode:0o600,flag:'wx'});
  write('rendered-content.json',JSON.stringify(report,null,2)+'\n');
  write('rendered-content.md',presentation.markdown);
  write('rendered-content.html',presentation.html);
  write('PRIVATE-SOURCE-MANIFEST.json',JSON.stringify({
   format:'manufact-seo-rendered-content-source-ledger-v1',
   siteId:report.siteId,base:report.base,originalInputSha256:report.inputSHA256,
   originalMarkupCopied:false,publicHostAuthenticated:false,
   browserAuthenticated:false,sameReleaseRevisionProven:false,
   ownerApprovalAuthenticated:false,releaseAuthorized:false
  },null,2)+'\n');
  write('PRIVATE-README.txt',
   'PRIVATE SEO source/DOM diagnostics. Compare original HTTP/DOM evidence from the SAME release manually. No raw customer markup in outputs. No browser or public-host authenticity, Google rendering or release approval.\n');
  for(const [key,max] of Object.entries(FILES))
   if(SRC.source(args[key],max).sha!==originals[key].sha)
    throw Error('Original source changed during rendered SEO analysis');
  if(fs.existsSync(destination))throw Error('Private report destination appeared during staging');
  fs.renameSync(stage,destination);finished=true;
 }finally{if(!finished)fs.rmSync(stage,{recursive:true,force:true})}
 process.stdout.write('PRIVATE RENDERED SEO QA: '+report.siteId+
  ' · compared '+report.summary.fullyComparedPages+'/'+report.summary.plannedPages+
  ' · P0 '+report.summary.P0+' · P1 '+report.summary.P1+
  ' · NO AUTOMATIC GO · '+destination+'\n');
 return {out:destination,summary:report.summary};
}
if(require.main===module){
 try{main(process.argv.slice(2))}
 catch(error){process.stderr.write('Rendered SEO private review refused: '+error.message+'\n');process.exitCode=1}
}
module.exports=Object.freeze({HELP,FILES,flags,main});
