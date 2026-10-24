#!/usr/bin/env node
'use strict';
// D7 reproducible local release-gate: five meaningful integrated smoke suites,
// deterministic source inventory, no network, no production or repo writes.
// Run on a checked-out repository with Node >=20.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const REPO=path.resolve(ROOT,'../..');
const SUITES=['smoke.cjs','compositions-smoke.cjs','kits-smoke.cjs','studio-smoke.cjs','bridge-smoke.cjs'];
function digest(b){return crypto.createHash('sha256').update(b).digest('hex');}
function walk(base,prefix=''){
 const out=[];
 for(const e of fs.readdirSync(base,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
  if(e.name==='node_modules'||e.name==='.git'||e.name==='.DS_Store')throw Error('Unapproved file/directory: '+e.name);
  const rel=prefix?prefix+'/'+e.name:e.name,file=path.join(base,e.name);
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink())throw Error('Symlink not allowed: '+rel);
  if(e.isDirectory())out.push(...walk(file,rel));
  else if(e.isFile()){
   if(!/\.(cjs|js|json|md|html|css)$/.test(e.name))throw Error('Unexpected asset type: '+rel);
   if(stat.size>2*1024*1024)throw Error('Oversized artifact: '+rel);
   out.push({path:rel,bytes:stat.size,sha256:digest(fs.readFileSync(file))});
  }else throw Error('Unsupported file: '+rel);
 }
 return out;
}
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
 const entries=walk(ROOT);
 const manifest=entries.filter(x=>!x.path.startsWith('handoffs/'));
 const listed=manifest.map(x=>x.path);
 for(const must of ['studio/index.html','studio/studio.js','studio/runtime.generated.js','lib/compiler.cjs','lib/bridge.cjs','catalog/themes.cjs','catalog/compositions.cjs','catalog/kits.cjs'])
  if(!listed.includes(must))throw Error('Missing necessary source: '+must);
 const results=[];
 for(const suite of SUITES){
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
 const nodePassed=results.every(x=>x.passed);
 const browserPassed=f.chromium&&results.some(x=>x.suite==='studio-smoke.cjs'&&x.stdout.includes('DESIGN_FACTORY_D5_CHROMIUM PASS'));
 const report={
  format:'manufact-design-factory-release-check-v1',
  version:1,sourceDirectory:'stage3/design-factory/',fileCount:entries.length,
  sourceManifest:manifest,sourceManifestSha256:digest(JSON.stringify(manifest)),
  checks:results,
  nodePassed,browserRequested:f.chromium,browserPassed,
  releaseReady:nodePassed&&browserPassed,
  acceptance:'developer checks only; Stage2 NO-GO, Stage3 unaccepted; owner review and integrator approval required',
  notes:[
   'This report does NOT check PHP pixel parity or replace owner visual acceptance.',
   'No CI or real production server was contacted.',
   'All paths are local source and no files outside stage3/design-factory/ are modified by this tool.'
  ]
 };
 if(f.out){
  const target=path.resolve(f.out);
  if(!fs.existsSync(path.dirname(target)))throw Error('Report parent must exist');
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 }else process.stdout.write(JSON.stringify({
   format:report.format,fileCount:report.fileCount,
   suites:results.map(({suite,passed,exitCode,error})=>({suite,passed,exitCode,error})),
   nodePassed,browserPassed,releaseReady
 },null,2)+'\n');
 process.exitCode=report.releaseReady?0:nodePassed&&!f.chromium?3:2;
}
try{release(process.argv.slice(2));}catch(error){
 process.stderr.write('D7 RELEASE GATE REFUSED: '+error.message+'\n');
 process.exitCode=2;
}
