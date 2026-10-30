#!/usr/bin/env node
'use strict';
/* Private local comparison of two canonical SEO Blueprints or checked raw briefs.
 * No network, CMS mutation, real redirects, CI, PR, client signoff or public output.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs');
const DIFF=require('../lib/blueprint-change-review.cjs');
const VIEW=require('../lib/blueprint-change-view.cjs');
const POLICY=require('../lib/private-output-policy.cjs');
const ROOT=fs.realpathSync(path.resolve(__dirname,'../../..'));
const HELP='Usage: node stage3/seo-engine/bin/compare-seo-blueprints.cjs --before /ABS/private/OLD-blueprint-or-brief.json --after /ABS/private/NEW-blueprint-or-brief.json --out /ABS/NEW-private-diff';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function parse(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length!==6)throw Error(HELP);
 const flags={};
 for(let i=0;i<argv.length;i+=2){
  const key=argv[i];
  if(!['--before','--after','--out'].includes(key)||Object.hasOwn(flags,key)||
   !path.isAbsolute(argv[i+1]||''))throw Error(HELP);
  flags[key]=argv[i+1];
 }
 if(Object.keys(flags).length!==3)throw Error(HELP);
 if(flags['--before']===flags['--after'])throw Error('Need two separate original source paths');
 return {before:flags['--before'],after:flags['--after'],out:flags['--out']};
}
function read(file){
 if(typeof file!=='string'||!path.isAbsolute(file)||path.resolve(file)!==file)
  throw Error('Every private source must be a normalized absolute file path');
 const real=fs.realpathSync(file),rel=path.relative(ROOT,real),st=fs.lstatSync(file);
 if(rel===''||rel==='.'||rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel))
  throw Error('Never load customer SEO input from inside Git checkout');
 if(st.isSymbolicLink()||!st.isFile()||st.size<12||st.size>2000000)
  throw Error('Private SEO source must be a regular JSON file up to 2 MB');
 const bytes=fs.readFileSync(file);
 return {bytes,sha256:sha(bytes),real};
}
function normalize(input){
 const object=JSON.parse(input.bytes.toString('utf8'));
 if(object?.format===BP.FORMAT)
  return {format:'brief',blueprint:BP.compileBrief(object)};
 if(object?.format===BP.BLUEPRINT)
  return {format:'compiled-blueprint',blueprint:BP.checkBlueprint(object)};
 throw Error('Only original manufact-seo-brief-v1 or canonical manufact-seo-blueprint-v1 accepted');
}
function buildData(args){
 const a=read(args.before),b=read(args.after);
 if(a.real===b.real)throw Error('Cannot compare a private source to itself');
 const from=normalize(a),to=normalize(b);
 const report=DIFF.compare(from.blueprint,to.blueprint);
 return {sources:{before:a,after:b},kinds:{before:from.format,after:to.format},report};
}
function main(argv){
 const flags=parse(argv);
 if(!flags){process.stdout.write(HELP+'\n');return null;}
 const out=POLICY.privateOutput(flags.out);
 const {sources,kinds,report}=buildData(flags);
 const view=VIEW.render(report);
 const md=DIFF.markdown(report);
 const reportJson=JSON.stringify(report,null,2)+'\n';
 const worksheet={format:'manufact-seo-blueprint-change-decisions-v1',version:1,
  siteId:report.siteId,beforeBlueprintSha256:report.beforeBlueprintSha256,
  afterBlueprintSha256:report.afterBlueprintSha256,
  actions:report.actions.map(a=>({id:a.id,priority:a.priority,decision:'pending',
   reviewer:'',reviewedAt:null,evidenceRef:'',notes:''})),
  releaseAuthorized:false,clientSignoffAuthenticated:false};
 const files={
  'index.html':view.html,
  'BLUEPRINT-CHANGE-IMPACT.json':reportJson,
  'BLUEPRINT-CHANGE-IMPACT.md':md,
  'DECISION-WORKSHEET.json':JSON.stringify(worksheet,null,2)+'\n',
  'PRIVATE-README.md':[
   '# MANUFACT SEO — private Blueprint change desk','',
   'Open index.html locally to inspect P0/P1/P2 impacts and page route/SEO comparisons.',
   'The two supplied original sources are normalized to canonical compiled Blueprint v1.',
   'The decision worksheet is a PRIVATE, UNFILLED lead work ledger, not client approval.',
   'A proposed HTTP 301/200 is ONLY a check to perform AFTER independent CMS implementation.',
   'No actual HTTP requests, content edits, CMS writes, redirects, authenticated approvals, PRs or merges.',
   'Never upload this directory to GitHub, a website or a public static ZIP.','',
   'Before original source SHA256: '+sources.before.sha256,
   'After original source SHA256: '+sources.after.sha256,
   'Original input kinds: '+kinds.before+' → '+kinds.after,
   ''
  ].join('\n'),
  'SOURCE-MANIFEST.json':JSON.stringify({
   format:'manufact-seo-blueprint-change-source-manifest-v1',
   siteId:report.siteId,readOnly:true,
   inputKinds:kinds,inputSha256:{
    before:sources.before.sha256,after:sources.after.sha256},
   canonicalBlueprintSha256:{
    before:report.beforeBlueprintSha256,after:report.afterBlueprintSha256},
   impactReportSha256:sha(reportJson),renderedHtmlSha256:sha(view.html),
   actualNetworkRequests:0,hostWrites:0,redirectsCreated:0,
   releaseAuthorized:false,clientSignoffAuthenticated:false
  },null,2)+'\n'
 };
 const parent=fs.realpathSync(path.dirname(out));
 const scratch=fs.mkdtempSync(path.join(parent,'.seo-blueprint-diff-incomplete-'));
 let committed=false;
 try{
  for(const [name,content] of Object.entries(files))
   fs.writeFileSync(path.join(scratch,name),content,{flag:'wx',mode:0o600});
  // Recheck exact source bytes after all rendering and before exposing the session.
  if(read(flags.before).sha256!==sources.before.sha256||
   read(flags.after).sha256!==sources.after.sha256)
   throw Error('Input Blueprint/brief changed during the review; output refused');
  if(fs.existsSync(out))throw Error('Private output folder appeared while staging');
  fs.renameSync(scratch,out);
  committed=true;
 }finally{if(!committed)fs.rmSync(scratch,{recursive:true,force:true});}
 return {siteId:report.siteId,out,changes:report.changes.length,
  actions:report.actions.length,priorityActions:report.summary.priorityActions,
  html:'index.html',readOnly:true,publicationAuthorized:false};
}
if(require.main===module)try{
 const result=main(process.argv.slice(2));
 if(result)process.stdout.write('PRIVATE BLUEPRINT CHANGE REVIEW: '+JSON.stringify(result)+'\n');
}catch(error){process.stderr.write('Blueprint change review refused: '+error.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,read,normalize,buildData,main});
