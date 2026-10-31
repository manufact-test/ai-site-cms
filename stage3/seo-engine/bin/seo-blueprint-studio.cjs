#!/usr/bin/env node
'use strict';
/* Operator-only local Blueprint authoring HTML. No CMS, search engine, browser crawl or network. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const STUDIO=require('../lib/blueprint-studio.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const ROOT=fs.realpathSync(path.resolve(__dirname,'../../..'));
const HELP='Usage: node stage3/seo-engine/bin/seo-blueprint-studio.cjs --site-id site-id --out /ABS/NEW-PRIVATE-DIR | --brief /ABS/private/brief.json --out /ABS/NEW-PRIVATE-DIR | --blueprint /ABS/private/blueprint.json --out /ABS/NEW-PRIVATE-DIR';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function parse(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length!==4||!argv[0].startsWith('--')||argv[2]!=='--out'||
  !path.isAbsolute(argv[3])||!['--site-id','--brief','--blueprint'].includes(argv[0]))
  throw Error(HELP);
 const mode=argv[0].slice(2),value=argv[1];
 if(!value||mode!=='site-id'&&!path.isAbsolute(value))throw Error(HELP);
 return {mode,value,out:argv[3]};
}
function input(file){
 const real=fs.realpathSync(file),rel=path.relative(ROOT,real);
 if(rel===''||rel==='.'||rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel))
  throw Error('Private Blueprint source must live outside Git checkout');
 const st=fs.lstatSync(file);
 if(st.isSymbolicLink()||!st.isFile()||st.size<10||st.size>2000000)
  throw Error('Expected a regular private JSON file no greater than 2 MB');
 const bytes=fs.readFileSync(file);
 return {data:JSON.parse(bytes.toString('utf8')),sha256:sha(bytes)};
}
function main(argv){
 const opt=parse(argv);
 if(!opt){process.stdout.write(HELP+'\n');return null;}
 const out=PRIVATE.privateOutput(opt.out);
 const source=opt.mode==='site-id'?null:input(opt.value);
 const brief=opt.mode==='site-id'?STUDIO.starter(opt.value):
  opt.mode==='brief'?BP.checkBrief(source.data):STUDIO.briefFromBlueprint(source.data);
 const editor=STUDIO.render(brief,{allowIncomplete:opt.mode==='site-id'});
 const template=JSON.stringify(brief,null,2)+'\n';
 const instructions=[
  '# MANUFACT SEO — private Blueprint Studio','',
  '1. Open BLUEPRINT-STUDIO.html locally in a modern desktop or mobile browser.',
  '2. Complete owner inputs, individual pages, headlines, facts, links and any Schema.org candidates.',
  '3. Save an editable private draft regularly; import it later using the same site ID.',
  '4. Export the validated local brief JSON into a PRIVATE directory outside GitHub.',
  '5. In the lead-integrated Node checkout run:',
  '   node stage3/seo-engine/bin/seo-blueprint.cjs compile --brief /ABS/private/seo-brief-SITE-ID.json > /ABS/private/compiled-blueprint.json',
  '   node stage3/seo-engine/bin/seo-blueprint.cjs review-blueprint --blueprint /ABS/private/compiled-blueprint.json',
  '   node stage3/seo-engine/bin/seo-blueprint.cjs review-architecture --blueprint /ABS/private/compiled-blueprint.json',
  '6. Obtain actual owner/editor acceptance before implementation by the CMS lead.','',
  'The original Node compiler is the authoritative source validator. This browser only',
  'offers editing and pre-export guidance, never real search data, approval or deployment.',
  'No remote dependencies, browser network POST, CMS write, PR or merge.',
  'Do not store passwords, customer PII, unverified promises or client secrets in any brief.',
  ''
 ].join('\n');
 const parent=fs.realpathSync(path.dirname(out)),temp=fs.mkdtempSync(path.join(parent,'.seo-blueprint-studio-incomplete-'));
 let committed=false;
 try{
  for(const [name,body] of Object.entries({
   'BLUEPRINT-STUDIO.html':editor,
   'SOURCE-BRIEF-DRAFT.json':template,
   'PRIVATE-README.md':instructions,
   'STUDIO-MANIFEST.json':JSON.stringify({format:'manufact-seo-blueprint-studio-v1',
    siteId:brief.siteId,sourceKind:opt.mode,sourceInputSha256:source?.sha256||null,
    initialDraftSha256:sha(template),readOnlyCms:true,networkRequests:0,
    published:false,ownerApproved:false},null,2)+'\n'
  }))fs.writeFileSync(path.join(temp,name),body,{flag:'wx',mode:0o600});
  if(source&&input(opt.value).sha256!==source.sha256)
   throw Error('Blueprint source changed while preparing the studio');
  if(fs.existsSync(out))throw Error('Output directory appeared before atomic completion');
  fs.renameSync(temp,out);
  committed=true;
 }finally{if(!committed)fs.rmSync(temp,{recursive:true,force:true});}
 return {output:out,siteId:brief.siteId,sourceKind:opt.mode,
  html:'BLUEPRINT-STUDIO.html',readOnlyCms:true,publicationAuthorized:false};
}
if(require.main===module)try{
 const result=main(process.argv.slice(2));
 if(result)process.stdout.write('PRIVATE BLUEPRINT STUDIO: '+JSON.stringify(result)+'\n');
}catch(error){process.stderr.write('Blueprint Studio refused: '+error.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,input,main});
