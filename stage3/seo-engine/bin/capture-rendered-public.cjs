#!/usr/bin/env node
'use strict';
/* Explicitly approved public HTTPS Chromium GET-only DOM source collection.
 * Writes private evidence outside repo, never contacts Google or changes CMS.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const SRC=require('./review-structured-data.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const CAPTURE=require('../lib/seo-rendered-capture.cjs');
const FILES={'--blueprint':2200000,'--site':3500000,'--public-http':36000000};
const HELP='Usage: node stage3/seo-engine/bin/capture-rendered-public.cjs --blueprint /ABS/approved-blueprint.json --site /ABS/selected-site.json --public-http /ABS/original-https.json --origin https://approved.example/mount/ --out /ABS/NEW-PRIVATE-DIR [--chrome /ABS/path/to/chrome] [--page-ids approved-home,approved-contact] [--mode preflight|capture]';
function flags(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(!Array.isArray(argv)||![10,12,14,16].includes(argv.length)||argv.length%2)throw Error(HELP);
 const result={};
 for(let i=0;i<argv.length;i+=2){
  const [k,v]=argv.slice(i,i+2);
  if((!(k in FILES)&&!['--origin','--out','--chrome','--page-ids','--mode'].includes(k))||
   result[k]!==undefined||typeof v!=='string'||!v)throw Error(HELP);
  result[k]=v;
 }
 for(const k of [...Object.keys(FILES),'--out'])
  if(!path.isAbsolute(result[k]||''))throw Error(HELP);
 if(new Set([...Object.keys(FILES).map(k=>result[k]),result['--out']]).size!==4)
  throw Error('All original private sources and destination must be distinct');
 if(result['--chrome']&&!path.isAbsolute(result['--chrome']))throw Error('Absolute Chrome path required');
 if(result['--mode']&&!['capture','preflight'].includes(result['--mode']))
  throw Error('Mode must be capture or offline preflight');
 if(result['--page-ids']){
  const ids=result['--page-ids'].split(',');
  if(ids.length<1||ids.length>8||new Set(ids).size!==ids.length||
   ids.some(id=>!/^[a-z][a-z0-9-]{2,79}$/.test(id)))
   throw Error('Pilot selection accepts 1-8 unique approved Blueprint page IDs');
 }
 const u=new URL(result['--origin']);
 if(u.href!==result['--origin']||u.protocol!=='https:'||!u.pathname.endsWith('/')||
  u.search||u.hash||u.username||u.password)throw Error('Explicit exact public HTTPS mount is required');
 return result;
}
async function main(argv,adapters=null){
 const args=flags(argv);
 if(!args){process.stdout.write(HELP+'\n');return null}
 const originals={};
 for(const [key,max] of Object.entries(FILES))originals[key]=SRC.source(args[key],max);
 const output=PRIVATE.privateOutput(args['--out']);
 const input={blueprint:originals['--blueprint'].value,site:originals['--site'].value,
  http:originals['--public-http'].value,httpRawSha256:originals['--public-http'].sha,
  expectedOrigin:args['--origin']};
 // Reject inappropriate owner source/mount and page selection before browser startup or DNS.
 const verified=CAPTURE.verify(input);
 const pageIds=args['--page-ids']?args['--page-ids'].split(','):null;
 const selectedPages=CAPTURE.selectPages(verified,pageIds);
 const opts=adapters||{launch:CAPTURE.defaultLauncher(args['--chrome'])};
 if(args['--mode']==='preflight'){
  // Validation only; do not open Chromium, resolve DNS, call network or create output.
  process.stdout.write('OFFLINE SEO CHROMIUM PREFLIGHT: source/mount/paths valid · '+
   selectedPages.length+'/'+verified.bp.pages.length+
   ' approved pages · browser binary/loader presence checked · no browser launch, DNS, capture or release approval.\n');
  return {preflight:true,out:output,siteId:verified.bp.siteId,
   pages:selectedPages.length,approvedPages:verified.bp.pages.length};
 }
 const evidence=await CAPTURE.capture(input,{...opts,pageIds});
 for(const [key,max] of Object.entries(FILES))
  if(SRC.source(args[key],max).sha!==originals[key].sha)
   throw Error('Original approved source bytes changed during Chromium collection');
 const parent=fs.realpathSync(path.dirname(output));
 const stage=fs.mkdtempSync(path.join(parent,'.seo-rendered-capture-incomplete-'));
 let done=false;
 try{
  const put=(name,data)=>fs.writeFileSync(path.join(stage,name),data,{mode:0o600,flag:'wx'});
  const data=JSON.stringify(evidence,null,2)+'\n';
  put('rendered-viewport-evidence-v2.json',data);
  put('RENDERED-CAPTURE-RECEIPT.json',JSON.stringify({
   format:'manufact-seo-rendered-capture-receipt-v1',siteId:evidence.siteId,
   origin:evidence.origin,capturedAt:evidence.capturedAt,
   originalPublicHttpSha256:evidence.publicCaptureRawSha256,
   renderedCaptureSha256:crypto.createHash('sha256').update(data).digest('hex'),
   pageCount:evidence.pages.length,approvedPageCount:verified.bp.pages.length,
   partialPilotCapture:evidence.pages.length!==verified.bp.pages.length,
   deviceCount:evidence.pages.length*3,
   allMarkupStable:evidence.pages.every(p=>Object.values(p.captures).every(x=>x.stableMarkup)),
   sourceRevisionAuthenticated:false,publicHostAuthenticated:false,
   googleRenderingVerified:false,ownerApprovalAuthenticated:false,
   releaseAuthorized:false
  },null,2)+'\n');
  put('PRIVATE-README.txt',
   'PRIVATE ORIGINAL CHROMIUM DOM HTML, potentially client-sensitive. Never commit/upload. Read-only GET/HEAD capture; no source revision or Google/browser provenance independently authenticated. Verify real owner deployment, DNS/TLS, browser logs, forms and Google separately.\n');
  for(const [key,max] of Object.entries(FILES))
   if(SRC.source(args[key],max).sha!==originals[key].sha)
    throw Error('Original source changed during output staging');
  if(fs.existsSync(output))throw Error('Output destination appeared during Chromium capture');
  fs.renameSync(stage,output);done=true;
 }finally{if(!done)fs.rmSync(stage,{recursive:true,force:true})}
 process.stdout.write('PRIVATE CHROMIUM RENDERED SEO CAPTURE: '+evidence.siteId+
  ' · '+evidence.pages.length+' pages · '+evidence.pages.length*3+
  ' device captures / '+verified.bp.pages.length+' approved pages · NO release approval · '+output+'\n');
 return {out:output,siteId:evidence.siteId,pages:evidence.pages.length,
  approvedPages:verified.bp.pages.length};
}
if(require.main===module){
 main(process.argv.slice(2)).catch(e=>{process.stderr.write(
  'Rendered public capture refused: '+e.message+'\n');process.exitCode=1});
}
module.exports=Object.freeze({HELP,FILES,flags,main});
