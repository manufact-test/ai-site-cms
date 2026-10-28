#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {compileBrief,checkBlueprint}=require('../lib/blueprint.cjs');
const {auditSite,snapshotAudit}=require('../lib/analyze.cjs');
const {explain}=require('../lib/explain.cjs');
const {propose}=require('../lib/handoff.cjs');
const CONTENT=require('../lib/content-intelligence.cjs');
const ARCHITECTURE=require('../lib/architecture.cjs');
const FIELDS=require('../lib/field-proposals.cjs');
const {work:remediation}=require('../lib/remediation.cjs');
const {assess:reviewRelease}=require('../lib/release-review.cjs');
const {write:markdownReport}=require('../lib/reporter.cjs');
const {compare:publicationParity}=require('../lib/parity.cjs');
const HTML=require('../lib/html-evidence.cjs');
const VIEWPORT=require('../lib/viewport-evidence.cjs');
const REGRESSION=require('../lib/regression.cjs');
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
 else if(command==='review-blueprint')out=CONTENT.reviewBlueprint(read('blueprint'));
 else if(command==='review-architecture')out=ARCHITECTURE.report(read('blueprint'));
 else if(command==='propose-content'){
  const site=read('site'),blueprint=read('blueprint'),registry=manifests();
  // The authoritative existing Site v1 validator runs first.
  auditSite(site,registry,blueprint);
  out=FIELDS.propose(site,registry,blueprint);
 }
 else if(command==='analyze-site')out=auditSite(read('site'),manifests(),flags.blueprint?read('blueprint'):null);
 else if(command==='analyze-content'){
  const site=read('site'),blueprint=read('blueprint');
  // Run existing authoritative Site v1 validation before producing an editorial review.
  out=auditSite(site,manifests(),blueprint).contentReview;
 }
 else if(command==='html-parity'){
  const site=read('site'),blueprint=read('blueprint'),snapshot=read('snapshot'),registry=manifests();
  auditSite(site,registry,blueprint);
  out=publicationParity(site,blueprint,snapshot);
 }
 else if(command==='deep-html')out=HTML.review(read('snapshot'),flags.blueprint?read('blueprint'):null);
 else if(command==='viewport-parity')out=VIEWPORT.review(read('viewports'),read('blueprint'));
 else if(command==='compare-site'){
  const before=read('before'),site=read('site'),blueprint=read('blueprint'),registry=manifests();
  out=REGRESSION.compare(before,site,registry,blueprint);
 }
 else if(['remediation-plan','remediation-md','release-review','review-bundle'].includes(command)){
  const site=read('site'),blueprint=read('blueprint'),registry=manifests();
  const options={};
  if(flags.snapshot)options.snapshot=read('snapshot');
  if(flags.viewports)options.viewports=read('viewports');
  if(flags.before)options.baselineSite=read('before');
  if(command==='remediation-plan')out=remediation(site,registry,blueprint,options);
  else if(command==='release-review')out=reviewRelease(site,registry,blueprint,options);
  else if(command==='remediation-md')out=markdownReport(remediation(site,registry,blueprint,options),
   reviewRelease(site,registry,blueprint,options));
  else out={format:'manufact-seo-review-bundle-v1',version:1,siteId:site.siteId,readOnly:true,
   blueprintReview:ARCHITECTURE.report(blueprint),siteAudit:auditSite(site,registry,blueprint),
   htmlEvidence:options.snapshot?HTML.review(options.snapshot,blueprint):null,
   deviceEvidence:options.viewports?VIEWPORT.review(options.viewports,blueprint):null,
   regression:options.baselineSite?REGRESSION.compare(options.baselineSite,site,registry,blueprint):null,
   backlog:remediation(site,registry,blueprint,options),
   release:reviewRelease(site,registry,blueprint,options)};
 }
 else if(command==='analyze-html')out=snapshotAudit(read('snapshot'));
 else if(command==='handoff')out=propose(read('site'),manifests(),read('blueprint'));
 else throw Error('Commands: compile --brief file | explain --blueprint file | review-blueprint --blueprint file | review-architecture --blueprint file | propose-content --site file --blueprint file [--manifests dir] | analyze-site --site file [--manifests dir] [--blueprint file] | analyze-content --site file --blueprint file [--manifests dir] | analyze-html --snapshot file | deep-html --snapshot file [--blueprint file] | viewport-parity --viewports file --blueprint file | compare-site --before file --site file --blueprint file | html-parity --site file --blueprint file --snapshot file | review-bundle --site file --blueprint file [--snapshot file] [--viewports file] [--before file] | remediation-plan --site file --blueprint file [--snapshot file] | remediation-md --site file --blueprint file [--snapshot file] [--viewports file] | release-review --site file --blueprint file [--snapshot file] [--viewports file] | handoff --site file --blueprint file [--manifests dir]');
 process.stdout.write(typeof out==='string'?out+'\n':JSON.stringify(out,null,2)+'\n');
}
try{main(process.argv.slice(2));}catch(e){process.stderr.write('SEO Engine: '+e.message+'\n');process.exitCode=1;}
