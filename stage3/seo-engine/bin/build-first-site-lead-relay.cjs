#!/usr/bin/env node
'use strict';
/* Verify an existing first-site release candidate and emit a private lead relay. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const RELAY=require('../lib/first-site-lead-relay.cjs');
const PREVIEW=require('../lib/static-host-preview.cjs');
const ZIP=require('../lib/static-upload-zip-verify.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const ROOT=fs.realpathSync(path.resolve(__dirname,'../../..'));
const HELP='Usage: node stage3/seo-engine/bin/build-first-site-lead-relay.cjs --candidate /ABS/private-candidate --out /ABS/NEW-private-relay [--post-deploy /ABS/post-deploy-summary.json] [--blueprint /ABS/approved-blueprint.json --indexing /ABS/indexing-intelligence.json] [--blueprint /ABS/approved-blueprint.json --search-history /ABS/search-history.json]';
const KEYS=new Set(['candidate','out','post-deploy','blueprint','indexing','search-history']);
function parse(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length%2||argv.length<4)throw Error(HELP);
 const o={};
 for(let j=0;j<argv.length;j+=2){
  const key=argv[j]?.startsWith('--')?argv[j].slice(2):null;
  const value=argv[j+1];
  if(!KEYS.has(key)||o[key]||!path.isAbsolute(value||''))throw Error(HELP);
  o[key]=value;
 }
 if(!o.candidate||!o.out||((o.indexing||o['search-history'])&&!o.blueprint))
  throw Error(HELP);
 return o;
}
function outsideRepo(file){
 const real=fs.realpathSync(file),rel=path.relative(ROOT,real);
 if(rel===''||rel==='.'||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel)))
  throw Error('Private customer release evidence must be stored outside Git checkout');
 return real;
}
function readFile(filename,limit,json=true){
 outsideRepo(filename);
 const st=fs.lstatSync(filename);
 if(!st.isFile()||st.isSymbolicLink()||st.size<10||st.size>limit)
  throw Error('Unsafe, missing or oversized private integration input: '+filename);
 const bytes=fs.readFileSync(filename);
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 return {sha256,data:json?JSON.parse(bytes.toString('utf8')):null};
}
function main(argv){
 const o=parse(argv);
 if(!o){process.stdout.write(HELP+'\n');return null;}
 const c=outsideRepo(o.candidate),st=fs.lstatSync(o.candidate);
 if(!st.isDirectory()||st.isSymbolicLink())throw Error('Candidate must be a real private directory');
 const dest=PRIVATE.privateOutput(o.out),parent=fs.realpathSync(path.dirname(dest));
 if(parent===c||parent.startsWith(c+path.sep)||dest===c||dest.startsWith(c+path.sep))
  throw Error('Relay output cannot be stored inside the immutable candidate');
 const source={
  candidate:readFile(path.join(c,'CANDIDATE-STATUS.json'),800000),
  summary:readFile(path.join(c,'seo-report','summary.json'),3600000),
  upload:readFile(path.join(c,'static-upload','upload-inventory.json'),800000),
  post:o['post-deploy']?readFile(o['post-deploy'],2500000):null,
  blueprint:o.blueprint?readFile(o.blueprint,2500000,false):null,
  indexing:o.indexing?readFile(o.indexing,5000000):null,
  searchHistory:o['search-history']?readFile(o['search-history'],5000000):null
 };
 const upload=PREVIEW.load(path.join(c,'static-upload'));
 const zipPath=path.join(c,'public-site.zip');
 outsideRepo(zipPath);
 const archive=ZIP.verify(zipPath,path.join(c,'static-upload'));
 const zipStat=fs.lstatSync(zipPath);
 if(zipStat.isSymbolicLink()||!zipStat.isFile()||zipStat.size<22||
    zipStat.size>190000000)throw Error('Unsafe release ZIP source');
 if(upload.inventory.officialStaticManifestSha256!==archive.officialManifestSha256)
  throw Error('Verified public archive differs from static upload inventory');
 const hashes={candidate:source.candidate.sha256,summary:source.summary.sha256,
  upload:source.upload.sha256,zip:archive.sha256,
  ...(source.post?{post:source.post.sha256}:{}),
  ...(source.blueprint?{blueprint:source.blueprint.sha256}:{}),
  ...(source.indexing?{indexing:source.indexing.sha256}:{}),
  ...(source.searchHistory?{searchHistory:source.searchHistory.sha256}:{})};
 const report=RELAY.build({candidate:source.candidate.data,summary:source.summary.data,
  upload:upload.inventory,zip:archive,post:source.post?.data,
  indexing:source.indexing?.data,history:source.searchHistory?.data,
  inputSha256:hashes});
 // No output folder appears until every input passes and all files are written.
 const temp=fs.mkdtempSync(path.join(parent,'.seo-relay-incomplete-'));
 try{
  const put=(name,body)=>fs.writeFileSync(path.join(temp,name),body,{flag:'wx',mode:0o600});
  put('INTEGRATION-CONTRACT.json',JSON.stringify(report,null,2)+'\n');
  put('LEAD-NEXT-ACTIONS.md',RELAY.markdown(report));
  put('PRIVATE-README.txt','Owner-only offline integration relay. No approval, deployment or live authentication. Never upload or commit.\n');
  if(fs.existsSync(dest))throw Error('Private relay output appeared during staging');
  fs.renameSync(temp,dest);
 }catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e;}
 return Object.freeze({output:dest,siteId:report.siteId,stage:report.stage,
  blockingGates:report.evidence.originalLocalBlockers,publicEvidenceProvided:!!source.post,
  operatorMustApprove:true,hostWrites:0,remoteRequests:0});
}
if(require.main===module)
 try{const x=main(process.argv.slice(2));if(x)process.stdout.write('FIRST-SITE LEAD RELAY: '+JSON.stringify(x)+'\n');}
 catch(e){process.stderr.write('Lead integration relay refused: '+e.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,main});
