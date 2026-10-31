#!/usr/bin/env node
'use strict';
/* Standalone private crawl/CMS post-publication evidence analyzer.
 * Reads ONLY original bounded local sources; never fetches, deploys or changes CMS.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PRIVATE=require('../lib/private-output-policy.cjs');
const REVIEW=require('../lib/crawl-cms-public-followup.cjs');
const VIEW=require('../lib/crawl-cms-public-followup-view.cjs');
const ROOT=path.resolve(__dirname,'../../..');
const HELP='Usage: node stage3/seo-engine/bin/review-crawl-public-fixes.cjs --worklist /ABS/private/crawl-cms-worklist.json --blueprint /ABS/private/approved-blueprint.json --site /ABS/private/owner-site-v1.json --public-http /ABS/private/public-https-evidence.json [--recheck /ABS/private/current-crawl-cms-recheck.json] --out /ABS/NEW-PRIVATE-OUTPUT';
const MAP={'--worklist':3000000,'--blueprint':2000000,'--site':3500000,'--public-http':36000000,'--recheck':4500000};
function parse(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(!Array.isArray(argv)||argv.length%2||![10,12].includes(argv.length))throw Error(HELP);
 const found={};
 for(let i=0;i<argv.length;i+=2){
  const k=argv[i],v=argv[i+1];
  if(!(k in MAP)&&k!=='--out'||typeof v!=='string'||!path.isAbsolute(v)||found[k])
   throw Error(HELP);
  found[k]=v;
 }
 if(Object.keys(MAP).filter(k=>k!=='--recheck').some(k=>!found[k])||!found['--out'])
  throw Error(HELP);
 if(new Set(Object.values(found)).size!==Object.values(found).length)
  throw Error('Original SEO evidence paths and output directory must be distinct');
 return found;
}
function read(file,max){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('Private source must be absolute');
 const resolved=fs.realpathSync(file),rel=path.relative(ROOT,resolved);
 if(rel===''||rel==='.'||!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))
  throw Error('Never store private public HTTPS transcript or CMS review in Git checkout');
 const st=fs.lstatSync(file);
 if(st.isSymbolicLink()||!st.isFile()||st.size<10||st.size>max)
  throw Error('Unsafe or oversized original private SEO source');
 const buf=fs.readFileSync(file);
 return {data:JSON.parse(buf.toString('utf8')),
  sha256:crypto.createHash('sha256').update(buf).digest('hex')};
}
function main(argv){
 const options=parse(argv);
 if(!options){process.stdout.write(HELP+'\n');return;}
 const loaded={},pinned=[];
 for(const [key,max] of Object.entries(MAP)){
  if(!options[key])continue;
  const found=read(options[key],max);
  loaded[key]=found;
  pinned.push({path:options[key],max,sha256:found.sha256});
 }
 const review=REVIEW.review({
  worklist:loaded['--worklist'].data,worklistSha256:loaded['--worklist'].sha256,
  blueprint:loaded['--blueprint'].data,blueprintRawSha256:loaded['--blueprint'].sha256,
  site:loaded['--site'].data,siteRawSha256:loaded['--site'].sha256,
  capture:loaded['--public-http'].data,captureRawSha256:loaded['--public-http'].sha256,
  latestRecheck:loaded['--recheck']?.data||null,
  latestRecheckRawSha256:loaded['--recheck']?.sha256||null
 });
 const view=VIEW.render(review);
 const out=PRIVATE.privateOutput(options['--out']);
 const parent=fs.realpathSync(path.dirname(out));
 const staging=fs.mkdtempSync(path.join(parent,'.seo-public-fixes-incomplete-'));
 let success=false;
 try{
  const put=(name,body)=>fs.writeFileSync(path.join(staging,name),body,{flag:'wx',mode:0o600});
  put('crawl-public-followup.html',view.html);
  put('crawl-public-followup.md',view.markdown);
  put('crawl-public-followup.json',JSON.stringify(review,null,2)+'\n');
  put('PRIVATE-SOURCE-MANIFEST.json',JSON.stringify({
   format:'manufact-seo-crawl-cms-public-followup-sources-v1',siteId:review.siteId,
   inputSHA256:Object.fromEntries(pinned.map(x=>[Object.keys(options)
    .find(k=>options[k]===x.path),x.sha256])),
   capturedAt:review.capturedAt,releaseAuthorized:false,
   publicHostAuthenticated:false,ownerApprovalAuthenticated:false,
   automaticClosure:false,privacy:'Operator original HTTPS response files are NOT copied into this output'
  },null,2)+'\n');
  put('PRIVATE-README.txt','Operator-supplied HTTPS evidence only. No authenticated release, no Google indexing or automatic task closure. Never publish/commit client evidence.\n');
  for(const item of pinned)if(read(item.path,item.max).sha256!==item.sha256)
   throw Error('Original SEO source bytes changed during public follow-up generation');
  if(fs.existsSync(out))throw Error('Private output appeared during staging; refusing overwrite');
  fs.renameSync(staging,out);success=true;
 }finally{if(!success)fs.rmSync(staging,{force:true,recursive:true});}
 process.stdout.write('PRIVATE SEO PUBLIC FIX FOLLOW-UP: '+review.siteId+
  ' · conflicting '+review.summary.conflict+' · unknown '+review.summary.unknown+
  ' · aligned but UNVERIFIED '+review.summary.alignedNotVerified+
  ' · no release authorization · '+out+'\n');
 return {siteId:review.siteId,summary:review.summary,out};
}
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch(e){process.stderr.write('SEO public fixes review refused: '+e.message+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({HELP,MAP,parse,read,main});
