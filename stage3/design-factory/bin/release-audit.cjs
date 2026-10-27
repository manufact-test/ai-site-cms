#!/usr/bin/env node
'use strict';
// D7 reproducible local release-gate: bundle parity + nine integrated Node suites,
// deterministic source inventory, no network, no production or repo writes.
// Run on a checked-out repository with Node >=20.
const fs=require('node:fs'),path=require('node:path');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const REPO=path.resolve(ROOT,'../..');
const {resolveOutsideRepository}=require('../lib/output-path.cjs');
const {walk,manifestDigest,sameManifest}=require('../lib/source-manifest.cjs');
const SUITES=['smoke.cjs','compositions-smoke.cjs','kits-smoke.cjs','studio-smoke.cjs','preview-matrix-smoke.cjs','bridge-smoke.cjs','package-smoke.cjs','visual-review-smoke.cjs','release-candidate-contract-smoke.cjs'];

function flags(args){
 const x={out:null,chromium:false};
 for(let i=0;i<args.length;i++){
  if(args[i]==='--out'&&args[i+1]&&!x.out)x.out=args[++i];
  else if(args[i]==='--chromium'&&!x.chromium)x.chromium=true;
  else throw Error('Use --out NEW-report.json [--chromium]');
 }
 return x;
}
function release(args){
 const f=flags(args);
 const reportTarget=f.out?resolveOutsideRepository(f.out,REPO,'Report output'):null;
 const entries=walk(ROOT);
 const manifest=entries;
 const listed=manifest.map(x=>x.path);
 for(const must of ['studio/index.html','studio/studio.js','studio/runtime.generated.js','lib/compiler.cjs','lib/bridge.cjs','catalog/themes.cjs','catalog/compositions.cjs','catalog/kits.cjs'])
  if(!listed.includes(must))throw Error('Missing necessary source: '+must);
 const results=[];
 const bundle=cp.spawnSync(process.execPath,[path.join(ROOT,'bin/build-browser-bundle.cjs'),'--check'],{
  cwd:REPO,encoding:'utf8',timeout:90000,maxBuffer:3*1024*1024,env:process.env});
 results.push({suite:'build-browser-bundle --check',passed:bundle.status===0&&!bundle.error,
  exitCode:bundle.status,signal:bundle.signal||null,
  stdout:(bundle.stdout||'').slice(-3500),stderr:(bundle.stderr||'').slice(-3500),
  error:bundle.error?String(bundle.error):null});
 const suiteNames=f.chromium?[...SUITES,'visual-pipe-smoke.cjs']:SUITES;
 for(const suite of suiteNames){
  const env={...process.env};
  if(!f.chromium)delete env.DF_CHROMIUM_BIN;
  else if(!env.DF_CHROMIUM_BIN)throw Error('--chromium requires DF_CHROMIUM_BIN');
  const p=cp.spawnSync(process.execPath,[path.join(ROOT,'tests',suite)],{
   cwd:REPO,encoding:'utf8',timeout:90000,maxBuffer:3*1024*1024,env});
  results.push({
   suite,passed:p.status===0&&!p.error,
   exitCode:p.status,signal:p.signal||null,
   stdout:(p.stdout||'').slice(-3500),
   stderr:(p.stderr||'').slice(-3500),
   error:p.error?String(p.error):null
  });
 }
 let inventoryStable=false;
 try{
  const finalEntries=walk(ROOT);
  inventoryStable=sameManifest(entries,finalEntries);
  results.push({suite:'source-inventory-stability',passed:inventoryStable,
   fileCountAtStart:entries.length,fileCountAtEnd:finalEntries.length,
   error:inventoryStable?null:'Source inventory or file bytes changed during release audit'});
 }catch(error){
  results.push({suite:'source-inventory-stability',passed:false,error:String(error.message)});
 }
 const nodePassed=results.every(x=>x.passed);
 const browserPassed=f.chromium&&
  results.some(x=>x.suite==='studio-smoke.cjs'&&x.passed&&x.stdout.includes('DESIGN_FACTORY_D5_CHROMIUM PASS'))&&
  results.some(x=>x.suite==='visual-pipe-smoke.cjs'&&x.passed&&x.stdout.includes('DESIGN_FACTORY_D7_VISUAL_PIPE PASS'));
 const report={
  format:'manufact-design-factory-release-check-v2',
  version:2,sourceDirectory:'stage3/design-factory/',fileCount:entries.length,
  sourceManifest:manifest,sourceManifestSha256:manifestDigest(manifest),
  checks:results,
  nodePassed,browserRequested:f.chromium,browserPassed,
  automatedChecksPassed:nodePassed&&browserPassed,
  humanVisualAcceptance:'pending',
  releaseReady:false,
  acceptance:'developer checks only; Stage2 NO-GO, Stage3 unaccepted; owner review and integrator approval required',
  notes:[
   'This report does NOT check PHP pixel parity or replace owner visual acceptance.',
   'No CI or real production server was contacted.',
   'All paths are local source and no files outside stage3/design-factory/ are modified by this tool.'
  ]
 };
 if(f.out){
  fs.writeFileSync(reportTarget,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 }else process.stdout.write(JSON.stringify({
   format:report.format,fileCount:report.fileCount,
   suites:results.map(({suite,passed,exitCode,error})=>({suite,passed,exitCode,error})),
   nodePassed,browserPassed,automatedChecksPassed:report.automatedChecksPassed,
   humanVisualAcceptance:report.humanVisualAcceptance,releaseReady:report.releaseReady
 },null,2)+'\n');
 // Automated checks never substitute for human visual approval of three viewport sizes.
 process.exitCode=report.automatedChecksPassed?0:nodePassed&&!f.chromium?3:2;
}
try{release(process.argv.slice(2));}catch(error){
 process.stderr.write('D7 RELEASE GATE REFUSED: '+error.message+'\n');
 process.exitCode=2;
}
