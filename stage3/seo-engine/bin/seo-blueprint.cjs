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
const PACKAGE=require('../lib/package.cjs');
const TRIAGE=require('../lib/triage.cjs');
const TRACE=require('../lib/traceability.cjs');
const PUBLICATION=require('../lib/publication-integrity.cjs');
const DELIVERY=require('../lib/delivery-evidence.cjs');
const EXECUTION=require('../lib/execution-plan.cjs');
const MEDIA=require('../lib/media-delivery.cjs');
const CMS_PACKET=require('../lib/cms-change-packet.cjs');
const CAPTURE=require('../lib/capture-plan.cjs');
const CONSISTENCY=require('../lib/evidence-consistency.cjs');
const ACCEPTANCE=require('../lib/acceptance.cjs');
const PROGRESS=require('../lib/task-progress.cjs');
const IMPACT=require('../lib/change-impact.cjs');
function main(argv){
 const [command,...args]=argv;
 const flags={};
 const permitted=new Set(['brief','blueprint','site','manifests','snapshot','viewports','before','decisions','prior-decisions','delivery','media','origin','acceptance']);
 for(let i=0;i<args.length;i+=2){
  if(!args[i]?.startsWith('--')||!permitted.has(args[i].slice(2))||!args[i+1]||flags[args[i]])throw Error('Use supported --name value options, without duplicates');
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
 else if(command==='acceptance-template'||command==='acceptance-review'){
  const site=read('site'),blueprint=read('blueprint'),registry=manifests();
  auditSite(site,registry,blueprint);
  out=command==='acceptance-template'?ACCEPTANCE.template(site,blueprint):
   ACCEPTANCE.review(site,blueprint,read('acceptance'));
 }
 else if(command==='change-impact'){
  const site=read('site'),blueprint=read('blueprint'),registry=manifests();
  const opt={...(flags.snapshot?{snapshot:read('snapshot')}:{}),
   ...(flags.delivery?{delivery:read('delivery')}:{}),
   ...(flags.viewports?{viewports:read('viewports')}:{}),
   ...(flags.media?{media:read('media')}:{})};
  const backlog=remediation(site,registry,blueprint,opt);
  const decisions=flags.decisions?TRIAGE.reconcile(backlog,read('decisions')):null;
  out=IMPACT.preview(site,registry,blueprint,backlog,decisions);
 }
 else if(command==='task-progress'){
  const site=read('site'),blueprint=read('blueprint'),registry=manifests();
  out=PROGRESS.compare(read('before'),site,registry,blueprint,
   flags['prior-decisions']?read('prior-decisions'):null);
 }
 else if(command==='evidence-consistency'){
  const site=read('site'),blueprint=flags.blueprint?read('blueprint'):null,registry=manifests();
  auditSite(site,registry,blueprint);
  out=CONSISTENCY.review(site,{...(flags.snapshot?{snapshot:read('snapshot')}:{}),
   ...(flags.delivery?{delivery:read('delivery')}:{}),...(flags.media?{media:read('media')}:{})});
 }
 else if(command==='capture-plan'){
  const site=read('site'),blueprint=read('blueprint'),registry=manifests();
  auditSite(site,registry,blueprint);
  out=CAPTURE.build(site,blueprint,flags.origin||null);
 }
 else if(command==='media-review'){
  const site=read('site'),registry=manifests();
  auditSite(site,registry,flags.blueprint?read('blueprint'):null);
  out=MEDIA.review(site,read('media'),flags.snapshot?read('snapshot'):null);
 }
 else if(command==='delivery-review'){
  const site=read('site'),registry=manifests();
  auditSite(site,registry,flags.blueprint?read('blueprint'):null);
  out=DELIVERY.review(site,read('delivery'));
 }
 else if(command==='publication-integrity'){
  const site=read('site'),registry=manifests();
  auditSite(site,registry,flags.blueprint?read('blueprint'):null);
  out=PUBLICATION.review(site,read('snapshot'));
 }
 else if(command==='traceability'||command==='traceability-md'){
  const site=read('site'),blueprint=read('blueprint'),registry=manifests();
  const audit=auditSite(site,registry,blueprint);
  const evidence={...(flags.snapshot?{snapshot:read('snapshot')}:{}),
   ...(flags.viewports?{viewports:read('viewports')}:{})};
  if(flags.delivery)evidence.delivery=read('delivery');
  if(flags.media)evidence.media=read('media');
  // Generate the same stable task IDs as the review bundle; this also validates
  // optional HTML/device evidence before it enters the acceptance map.
  const backlog=remediation(site,registry,blueprint,evidence);
  const trace=TRACE.report(site,blueprint,evidence,audit,backlog);
  out=command==='traceability-md'?TRACE.markdown(trace):trace;
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
 else if(['remediation-plan','remediation-md','release-review','review-bundle','triage','execution-plan','execution-plan-md','cms-change-packet','cms-change-packet-md'].includes(command)){
  const site=read('site'),blueprint=read('blueprint'),registry=manifests();
  const options={};
  if(flags.snapshot)options.snapshot=read('snapshot');
  if(flags.viewports)options.viewports=read('viewports');
  if(flags.before)options.baselineSite=read('before');
  if(flags.delivery)options.delivery=read('delivery');
  if(flags.media)options.media=read('media');
  if(command==='review-bundle'&&flags.decisions)options.decisions=read('decisions');
  if(command==='review-bundle'&&flags['prior-decisions'])options.priorDecisions=read('prior-decisions');
  if(['review-bundle','release-review'].includes(command)&&flags.acceptance)options.acceptance=read('acceptance');
  if(command==='cms-change-packet'||command==='cms-change-packet-md'){
   const backlog=remediation(site,registry,blueprint,options);
   const decisions=flags.decisions?TRIAGE.reconcile(backlog,read('decisions')):null;
   const packet=CMS_PACKET.build(site,registry,blueprint,backlog,decisions);
   out=command==='cms-change-packet-md'?CMS_PACKET.markdown(packet):packet;
  }
  else if(command==='execution-plan'||command==='execution-plan-md'){
   const backlog=remediation(site,registry,blueprint,options);
   const ledger=flags.decisions?TRIAGE.reconcile(backlog,read('decisions')):null;
   const execution=EXECUTION.compile(backlog,ledger);
   out=command==='execution-plan-md'?EXECUTION.markdown(execution):execution;
  }
  else if(command==='remediation-plan')out=remediation(site,registry,blueprint,options);
  else if(command==='triage')out=TRIAGE.reconcile(remediation(site,registry,blueprint,options),read('decisions'));
  else if(command==='release-review')out=reviewRelease(site,registry,blueprint,options);
  
  else if(command==='remediation-md'){
   const backlog=remediation(site,registry,blueprint,options);
   out=markdownReport(backlog,reviewRelease(site,registry,blueprint,options,backlog));
  }
  else out=PACKAGE.build(site,registry,blueprint,options);
 }
 else if(command==='analyze-html')out=snapshotAudit(read('snapshot'));
 else if(command==='handoff')out=propose(read('site'),manifests(),read('blueprint'));
 else throw Error('Commands: change-impact --site file --blueprint file --decisions file [--snapshot file] | acceptance-template --site file --blueprint file | acceptance-review --site file --blueprint file --acceptance file | task-progress --before file --site file --blueprint file [--prior-decisions file] | compile --brief file | explain --blueprint file | review-blueprint --blueprint file | review-architecture --blueprint file | propose-content --site file --blueprint file [--manifests dir] | analyze-site --site file [--manifests dir] [--blueprint file] | analyze-content --site file --blueprint file [--manifests dir] | analyze-html --snapshot file | deep-html --snapshot file [--blueprint file] | viewport-parity --viewports file --blueprint file | traceability --site file --blueprint file [--snapshot file] [--viewports file] | traceability-md --site file --blueprint file [--snapshot file] [--viewports file] | compare-site --before file --site file --blueprint file | html-parity --site file --blueprint file --snapshot file | evidence-consistency --site file [--snapshot file] [--delivery file] [--media file] | capture-plan --site file --blueprint file [--origin https://host/mount/] | media-review --site file --media file [--snapshot file] | delivery-review --site file --delivery file [--blueprint file] | publication-integrity --site file --snapshot file [--blueprint file] | cms-change-packet[/-md] --site file --blueprint file [--decisions file] | execution-plan[/-md] --site file --blueprint file [--decisions file] [--delivery file] | review-bundle --site file --blueprint file [--snapshot file] [--viewports file] [--before file] [--delivery file] [--decisions file] | remediation-plan --site file --blueprint file [--snapshot file] [--viewports file] [--before file] | remediation-md --site file --blueprint file [--snapshot file] [--viewports file] | release-review --site file --blueprint file [--snapshot file] [--viewports file] | triage --site file --blueprint file --decisions file [--snapshot file] | handoff --site file --blueprint file [--manifests dir]');
 process.stdout.write(typeof out==='string'?out+'\n':JSON.stringify(out,null,2)+'\n');
}
try{main(process.argv.slice(2));}catch(e){process.stderr.write('SEO Engine: '+e.message+'\n');process.exitCode=1;}
