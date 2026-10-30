#!/usr/bin/env node
'use strict';
/* Private per-client structured data QA. Reuses existing original public HTTP
 * capture, without any live requests, CMS edits, SEO generation or deployment.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const POLICY=require('../lib/private-output-policy.cjs');
const QA=require('../lib/seo-structured-data-audit.cjs');
const VIEW=require('../lib/seo-structured-data-view.cjs');
const HELP='Usage: node stage3/seo-engine/bin/review-structured-data.cjs --blueprint /ABS/approved-blueprint.json --site /ABS/selected-owner-site.json --public-http /ABS/public-https-evidence.json [--origin https://approved.example/mount/] --out /ABS/NEW-PRIVATE-DIRECTORY';
const FILES={'--blueprint':2200000,'--site':3500000,'--public-http':36000000};
const ROOT=path.resolve(__dirname,'../../..');
function flags(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(!Array.isArray(argv)||![8,10].includes(argv.length)||argv.length%2)throw Error(HELP);
 const v={};
 for(let i=0;i<argv.length;i+=2){
  const k=argv[i],x=argv[i+1];
  if((k!=='--origin'&&k!=='--out'&&!(k in FILES))||v[k]!==undefined||
   typeof x!=='string'||!x)throw Error(HELP);
  v[k]=x;
 }
 for(const k of [...Object.keys(FILES),'--out'])if(!v[k]||!path.isAbsolute(v[k]))throw Error(HELP);
 if(new Set([...Object.keys(FILES).map(x=>v[x]),v['--out']]).size!==4)
  throw Error('Schema source files and private output path must be different');
 if(v['--origin']){
  const u=new URL(v['--origin']);
  if(u.href!==v['--origin']||u.protocol!=='https:'||!u.pathname.endsWith('/')||
   u.username||u.password||u.search||u.hash)throw Error('Canonical exact origin/mount required');
 }
 return v;
}
function source(p,max){
 if(typeof p!=='string'||!path.isAbsolute(p))throw Error('Private source absolute path required');
 const real=fs.realpathSync(p),rel=path.relative(ROOT,real);
 if(rel===''||rel==='.'||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel)))
  throw Error('Never check in private approved client Blueprint/HTML evidence');
 const st=fs.lstatSync(p);
 if(st.isSymbolicLink()||!st.isFile()||st.size<10||st.size>max)
  throw Error('Invalid, symlinked or oversized private JSON-LD source');
 const bytes=fs.readFileSync(p);
 return {value:JSON.parse(bytes.toString('utf8')),
  sha:crypto.createHash('sha256').update(bytes).digest('hex')};
}
function main(argv){
 const args=flags(argv);
 if(!args){process.stdout.write(HELP+'\n');return}
 const values={},pinned=[];
 for(const [name,max] of Object.entries(FILES)){
  const record=source(args[name],max);
  values[name]=record;
  pinned.push({path:args[name],max,sha:record.sha});
 }
 const r=QA.review({blueprint:values['--blueprint'].value,
  blueprintRawSha256:values['--blueprint'].sha,
  site:values['--site'].value,siteRawSha256:values['--site'].sha,
  capture:values['--public-http'].value,captureRawSha256:values['--public-http'].sha,
  expectedBase:args['--origin']||null});
 const v=VIEW.render(r),out=POLICY.privateOutput(args['--out']);
 const staging=fs.mkdtempSync(path.join(fs.realpathSync(path.dirname(out)),'.seo-structured-data-incomplete-'));
 let done=false;
 try{
  const write=(name,body)=>fs.writeFileSync(path.join(staging,name),body,{mode:0o600,flag:'wx'});
  write('structured-data.html',v.html);
  write('structured-data.md',v.markdown);
  write('structured-data.json',JSON.stringify(r,null,2)+'\n');
  write('PRIVATE-SOURCE-MANIFEST.json',JSON.stringify({
   format:'manufact-seo-structured-data-source-ledger-v1',
   siteId:r.siteId,base:r.base,sourceRawSHA256:r.inputSHA256,
   sourceFilesCopied:false,clientFactsAuthenticated:false,
   googleRichResultEligibilityVerified:false,ownerApprovalAuthenticated:false,
   releaseAuthorized:false
  },null,2)+'\n');
  write('PRIVATE-README.txt',
   'Private read-only source-bound JSON-LD audit. Do not upload or commit. No real host, owner fact, rich result, client approval or release authenticated.\n');
  for(const x of pinned)if(source(x.path,x.max).sha!==x.sha)
   throw Error('Original private HTML/Blueprint source bytes changed during schema review');
  if(fs.existsSync(out))throw Error('Private structured data output appeared during staging');
  fs.renameSync(staging,out);done=true;
 }finally{if(!done)fs.rmSync(staging,{recursive:true,force:true})}
 process.stdout.write('PRIVATE STRUCTURED DATA QA: '+r.siteId+
  ' · P0 '+r.summary.P0+' · P1 '+r.summary.P1+
  ' · uninspected '+r.summary.uninspectedPages+
  ' · no automatic fix · '+out+'\n');
 return {siteId:r.siteId,out,summary:r.summary};
}
if(require.main===module){
 try{main(process.argv.slice(2))}
 catch(e){process.stderr.write('Structured data private review refused: '+e.message+'\n');process.exitCode=1}
}
module.exports=Object.freeze({HELP,FILES,flags,source,main});
