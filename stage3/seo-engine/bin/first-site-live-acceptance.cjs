#!/usr/bin/env node
'use strict';
/* Build/review private page-by-page post-publication browser and form evidence.
 * This never sends a form POST or accepts/publishes a CMS release.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const FLOW=require('../lib/first-site-live-acceptance.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const PREVIEW=require('../lib/static-host-preview.cjs');
const ZIP=require('../lib/static-upload-zip-verify.cjs');
const ROOT=fs.realpathSync(path.resolve(__dirname,'../../..'));
const HELP='Usage: node stage3/seo-engine/bin/first-site-live-acceptance.cjs template|review --candidate /ABS/private-candidate --contract /ABS/lead-relay/INTEGRATION-CONTRACT.json --post-deploy /ABS/post-deploy-summary.json [--filled /ABS/private-edited-live-acceptance.json] --out /ABS/NEW-private-result';
const SHA=/^[a-f0-9]{64}$/;
function flags(args){
 if(args.length===1&&args[0]==='--help')return null;
 const [action,...rest]=args;
 if(!['template','review'].includes(action)||rest.length%2)throw Error(HELP);
 const o={action};
 for(let i=0;i<rest.length;i+=2){
  const key=rest[i]?.startsWith('--')?rest[i].slice(2):null,value=rest[i+1];
  if(!['candidate','contract','post-deploy','filled','out'].includes(key)||
   !path.isAbsolute(value||'')||o[key])throw Error(HELP);
  o[key]=value;
 }
 if(!o.candidate||!o.contract||!o['post-deploy']||!o.out||
   action==='review'&&!o.filled||action==='template'&&o.filled)throw Error(HELP);
 return o;
}
function outside(file,folder=false){
 const rp=fs.realpathSync(file),rel=path.relative(ROOT,rp),st=fs.lstatSync(file);
 if(rel===''||rel==='.'||rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel))
  throw Error('Private live client acceptance files must be outside Git checkout');
 if(st.isSymbolicLink()||(folder?!st.isDirectory():!st.isFile()))
  throw Error('Human acceptance requires regular private source files/directories');
 return rp;
}
function read(file,max){
 outside(file);
 const st=fs.lstatSync(file);
 if(st.size<10||st.size>max)throw Error('Unsafe or oversized human acceptance evidence input');
 const bytes=fs.readFileSync(file);
 return {json:JSON.parse(bytes.toString('utf8')),
  sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
function main(argv){
 const o=flags(argv);
 if(!o){process.stdout.write(HELP+'\n');return null;}
 const folder=outside(o.candidate,true),output=PRIVATE.privateOutput(o.out);
 if(output===folder||output.startsWith(folder+path.sep)||
  fs.realpathSync(path.dirname(output)).startsWith(folder+path.sep))
  throw Error('Private live acceptance output must not overwrite candidate');
 const candidate=read(path.join(folder,'CANDIDATE-STATUS.json'),800000);
 const summary=read(path.join(folder,'seo-report','summary.json'),3600000);
 const contract=read(o.contract,500000);
 const post=read(o['post-deploy'],2500000);
 const uploadFile=read(path.join(folder,'static-upload','upload-inventory.json'),800000);
 const bundleFile=read(path.join(folder,'seo-report','bundle.json'),45000000);
 const bundle=PREVIEW.load(path.join(folder,'static-upload'));
 const archive=ZIP.verify(path.join(folder,'public-site.zip'),path.join(folder,'static-upload'));
 if(archive.sha256!==contract.json.identity?.publicZipSha256||
  archive.officialManifestSha256!==candidate.json.officialStaticManifestSha256||
  !SHA.test(candidate.json.publicArchiveSha256||'')||
  archive.sha256!==candidate.json.publicArchiveSha256)
  throw Error('Public ZIP or candidate differs from original lead-reviewed release');
 const hashes={contract:contract.sha256,candidate:candidate.sha256,
  summary:summary.sha256,upload:uploadFile.sha256,post:post.sha256,
  bundle:bundleFile.sha256};
 const template=FLOW.template(contract.json,bundle.inventory,post.json,summary.json,
  hashes,bundleFile.json);
 const content={};
 let filledSourceSha256=null;
 if(o.action==='template'){
  content['live-acceptance-template.json']=JSON.stringify(template,null,2)+'\n';
  content['LIVE-FORM-POST-WORKSHEET.md']=FLOW.formWorksheet(template);
  content['LIVE-ACCEPTANCE-INSTRUCTIONS.md']=[
   '# Real-world first-site manual verification','',
   'Only complete tasks actually observed in a REAL browser on the deployed HTTPS site.',
   'For each page and desktop/tablet/mobile, set state passed/failed with operator, date and private evidence reference.',
   'Copy the exact original sectionId from required.formRefsByPage[page] for EVERY actual form on EVERY deployed page.',
   'Use formTests [] only for real authorized POSTs, with formRef equal to source sectionId: {"page":"/contact/","formRef":"contact-lead","state":"passed","observedAt":"YYYY-MM-DD","checkedBy":"operator","evidenceRef":"private://receipt-id","notes":""}.',
   'Do not invent formRef identifiers. If any PHP form is unmapped or duplicated, repair and recapture the original candidate.',
   'Never store HMAC, POST bodies, email recipient addresses or credentials in this input.',
   'Then run this CLI review with --filled. Do not treat its summary as a live site release approval.',''
  ].join('\n');
 }else{
  const filled=read(o.filled,1800000);
  filledSourceSha256=filled.sha256;
  const result=FLOW.review(template,filled.json,post.json);
  content['live-acceptance-review.json']=JSON.stringify({
   ...result,sourceEditedAcceptanceSha256:filled.sha256},null,2)+'\n';
  content['live-acceptance-review.md']=FLOW.markdown(result);
 }
 content['PRIVATE-README.txt']='Private operator attestation only. No browser, POST, TLS, client approval or deploy is executed. Never upload/commit.\n';
 const parent=fs.realpathSync(path.dirname(output));
 const temp=fs.mkdtempSync(path.join(parent,'.seo-live-acceptance-incomplete-'));
 try{
  for(const [name,body] of Object.entries(content))
   fs.writeFileSync(path.join(temp,name),body,{flag:'wx',mode:0o600});
  // Reject concurrent edits to any source-bound JSON evidence while writing.
  for(const [source,expected,max] of [
   [path.join(folder,'CANDIDATE-STATUS.json'),candidate.sha256,800000],
   [path.join(folder,'seo-report','summary.json'),summary.sha256,3600000],
   [path.join(folder,'seo-report','bundle.json'),bundleFile.sha256,45000000],
   [path.join(folder,'static-upload','upload-inventory.json'),uploadFile.sha256,800000],
   [o.contract,contract.sha256,500000],
   [o['post-deploy'],post.sha256,2500000],
   ...(o.action==='review'?[[o.filled,filledSourceSha256,1800000]]:[])
  ])if(read(source,max).sha256!==expected)
   throw Error('Live acceptance source changed during private review; discard and repeat with fresh evidence');
  const archiveAgain=ZIP.verify(path.join(folder,'public-site.zip'),path.join(folder,'static-upload'));
  if(archiveAgain.sha256!==archive.sha256||
     archiveAgain.officialManifestSha256!==archive.officialManifestSha256)
   throw Error('Public ZIP or public upload bytes changed during manual acceptance; rebuild candidate');
  if(fs.existsSync(output))throw Error('Private output appeared while staging');
  fs.renameSync(temp,output);
 }catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e;}
 return Object.freeze({output,action:o.action,siteId:template.siteId,
  realBrowserRequestsPerformed:0,realFormPostsPerformed:0,releaseAuthorized:false});
}
if(require.main===module)
 try{const x=main(process.argv.slice(2));if(x)process.stdout.write('LIVE FIRST-SITE ACCEPTANCE: '+JSON.stringify(x)+'\n');}
 catch(e){process.stderr.write('Live acceptance review refused: '+e.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({flags,main});
